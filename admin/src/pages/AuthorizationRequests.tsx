import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AuthorizationRequest, StudentProfile } from '../types';
import { getAuthorizationRequests, getStudentById } from '../services';
import { useLanguage } from '../contexts/LanguageContext';
import pageStyles from '../shared/styles/Page.module.css';
import styles from './AuthorizationRequests.module.css';

type TabFilter = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED';

function formatRelativeTime(iso: string, lang: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  const timeStr = d.toLocaleTimeString(lang === 'en' ? 'en-US' : lang === 'mr' ? 'mr-IN' : 'hi-IN', { hour: 'numeric', minute: '2-digit', hour12: true });

  if (diffDays === 0) return `${lang === 'en' ? 'Today' : lang === 'mr' ? 'आज' : 'आज'}, ${timeStr}`;
  if (diffDays === 1) return `${lang === 'en' ? 'Yesterday' : lang === 'mr' ? 'काल' : 'कल'}, ${timeStr}`;
  return d.toLocaleDateString(lang === 'en' ? 'en-US' : lang === 'mr' ? 'mr-IN' : 'hi-IN', { day: '2-digit', month: 'short', year: 'numeric' }) + ', ' + timeStr;
}

function statusDot(status: string) {
  if (status === 'PENDING') return `${styles.statusBadge} ${styles.statusPending}`;
  if (status === 'APPROVED') return `${styles.statusBadge} ${styles.statusApproved}`;
  return `${styles.statusBadge} ${styles.statusRejected}`;
}

function getInitial(name: string) {
  return name.charAt(0).toUpperCase();
}

const AVATAR_COLORS = ['#1e3a8a', '#505f76', '#7c3aed', '#047857', '#b45309'];

function avatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

const TAB_LABELS: Record<string, string> = {
  ALL: 'auth.all',
  PENDING: 'auth.pending',
  APPROVED: 'auth.approved',
  REJECTED: 'auth.rejected',
};

export default function AuthorizationRequests() {
  const [requests, setRequests] = useState<AuthorizationRequest[]>([]);
  const [students, setStudents] = useState<Map<string, StudentProfile>>(new Map());
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabFilter>('ALL');
  const navigate = useNavigate();
  const { t, language } = useLanguage();

  useEffect(() => {
    getAuthorizationRequests().then((reqs) => {
      setRequests(reqs);
      const ids = [...new Set(reqs.map((r) => r.studentProfileId))];
      Promise.all(ids.map((id) => getStudentById(id))).then((profiles) => {
        const map = new Map<string, StudentProfile>();
        profiles.forEach((p) => { if (p) map.set(p.id, p); });
        setStudents(map);
        setLoading(false);
      });
    });
  }, []);

  const counts = useMemo(() => ({
    ALL: requests.length,
    PENDING: requests.filter((r) => r.status === 'PENDING').length,
    APPROVED: requests.filter((r) => r.status === 'APPROVED').length,
    REJECTED: requests.filter((r) => r.status === 'REJECTED').length,
  }), [requests]);

  const filtered = useMemo(() => {
    if (activeTab === 'ALL') return requests;
    return requests.filter((r) => r.status === activeTab);
  }, [requests, activeTab]);

  if (loading) {
    return <div className={pageStyles.subtext}>{t('common.loading')}</div>;
  }

  return (
    <div>
      <div className={pageStyles.breadcrumb}>
        <span className={pageStyles.breadcrumbLink}>Admin</span>
        <span className={pageStyles.breadcrumbSeparator}>/</span>
        <span className={pageStyles.breadcrumbCurrent}>{t('auth.title')}</span>
      </div>
      <div className={pageStyles.pageHeader}>
        <h1 className={pageStyles.heading}>{t('auth.title')}</h1>
      </div>

      <div className={styles.bentoGrid}>
        <div className={styles.listPanel}>
          <div className={styles.toolbar}>
            <div className={styles.tabs}>
              {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as TabFilter[]).map((tab) => (
                <button
                  key={tab}
                  className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ''}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {t(TAB_LABELS[tab])}
                  <span className={styles.tabCount}>{counts[tab]}</span>
                </button>
              ))}
            </div>
          </div>

          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{t('auth.student')}</th>
                  <th>{t('auth.id')}</th>
                  <th>{t('auth.requestedTime')}</th>
                  <th>{t('dashboard.status')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={4} className={styles.emptyRow}>{t('auth.noRequests')}</td></tr>
                )}
                {filtered.map((r) => {
                  const s = students.get(r.studentProfileId);
                  return (
                    <tr
                      key={r.id}
                      className={styles.tableRow}
                      onClick={() => navigate(`/authorization-requests/${r.id}`)}
                    >
                      <td>
                        <div className={styles.studentCell}>
                          {s?.photoPath ? (
                            <img src={s.photoPath} alt={r.studentName} className={styles.avatarImg} />
                          ) : (
                            <div className={styles.avatarInitial} style={{ background: avatarColor(r.studentName) }}>
                              {getInitial(r.studentName)}
                            </div>
                          )}
                          <span className={styles.studentName}>{r.studentName}</span>
                        </div>
                      </td>
                      <td className={styles.idCell}>{r.studentId}</td>
                      <td className={styles.timeCell}>{formatRelativeTime(r.requestedAt, language)}</td>
                      <td>
                        <span className={statusDot(r.status)}>
                          <span className={styles.dot} />
                          {t(`auth.${r.status.toLowerCase()}`)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
