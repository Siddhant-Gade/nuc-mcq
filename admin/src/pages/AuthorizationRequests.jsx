import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuthorizationRequests, getStudentById } from '../services';
import { useLanguage } from '../contexts/LanguageContext';
import pageStyles from '../shared/styles/Page.module.css';
import styles from './AuthorizationRequests.module.css';
function formatRelativeTime(iso, lang) {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const timeStr = d.toLocaleTimeString(lang === 'en' ? 'en-US' : lang === 'mr' ? 'mr-IN' : 'hi-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
    if (diffDays === 0)
        return `${lang === 'en' ? 'Today' : lang === 'mr' ? 'आज' : 'आज'}, ${timeStr}`;
    if (diffDays === 1)
        return `${lang === 'en' ? 'Yesterday' : lang === 'mr' ? 'काल' : 'कल'}, ${timeStr}`;
    return d.toLocaleDateString(lang === 'en' ? 'en-US' : lang === 'mr' ? 'mr-IN' : 'hi-IN', { day: '2-digit', month: 'short', year: 'numeric' }) + ', ' + timeStr;
}
function isNew(iso) {
    return Date.now() - new Date(iso).getTime() < 5 * 60 * 1000; // within 5 minutes
}
function statusDot(status) {
    if (status === 'PENDING')
        return `${styles.statusBadge} ${styles.statusPending}`;
    if (status === 'APPROVED')
        return `${styles.statusBadge} ${styles.statusApproved}`;
    return `${styles.statusBadge} ${styles.statusRejected}`;
}
function getInitial(name) {
    return name.charAt(0).toUpperCase();
}
const AVATAR_COLORS = ['#1e3a8a', '#505f76', '#7c3aed', '#047857', '#b45309'];
function avatarColor(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++)
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}
const TAB_LABELS = {
    ALL: 'auth.all',
    PENDING: 'auth.pending',
    APPROVED: 'auth.approved',
    REJECTED: 'auth.rejected',
};
export default function AuthorizationRequests() {
    const [requests, setRequests] = useState([]);
    const [students, setStudents] = useState(new Map());
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('ALL');
    const navigate = useNavigate();
    const { t, language } = useLanguage();
    const intervalRef = useRef(null);

    const load = useCallback(async (silent = false) => {
        if (!silent) setRefreshing(true);
        try {
            const reqs = await getAuthorizationRequests();
            setRequests(reqs);
            setError(null);
            const ids = [...new Set(reqs.map((r) => r.studentProfileId))];
            const profiles = await Promise.all(
                ids.map((id) => getStudentById(id).catch(() => null))
            );
            const map = new Map();
            profiles.forEach((p) => { if (p) map.set(p.id, p); });
            setStudents(map);
        } catch (err) {
            if (!silent) setError(err?.message || 'Failed to load authorization requests.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        load();
        // Auto-refresh every 15 s so admin sees new requests without reloading
        intervalRef.current = setInterval(() => load(true), 15_000);
        return () => clearInterval(intervalRef.current);
    }, [load]);

    const counts = useMemo(() => ({
        ALL: requests.length,
        PENDING: requests.filter((r) => r.status === 'PENDING').length,
        APPROVED: requests.filter((r) => r.status === 'APPROVED').length,
        REJECTED: requests.filter((r) => r.status === 'REJECTED').length,
    }), [requests]);
    const filtered = useMemo(() => {
        if (activeTab === 'ALL')
            return requests;
        return requests.filter((r) => r.status === activeTab);
    }, [requests, activeTab]);
    if (loading) {
        return <div className={pageStyles.subtext}>{t('common.loading')}</div>;
    }
    if (error) {
        return (
          <div style={{ padding: '40px 24px', textAlign: 'center' }}>
            <p style={{ color: '#C5221F', marginBottom: 12, fontWeight: 500 }}>{error}</p>
            <button className={styles.refreshBtn} onClick={() => load()}>Retry</button>
          </div>
        );
    }
    return (<div>
      <div className={pageStyles.breadcrumb}>
        <span className={pageStyles.breadcrumbLink}>Admin</span>
        <span className={pageStyles.breadcrumbSeparator}>/</span>
        <span className={pageStyles.breadcrumbCurrent}>{t('auth.title')}</span>
      </div>
      <div className={pageStyles.pageHeader}>
        <h1 className={pageStyles.heading}>{t('auth.title')}</h1>
        <button
          className={styles.refreshBtn}
          onClick={() => load()}
          disabled={refreshing}
          title="Refresh"
        >
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" style={{ transform: refreshing ? 'rotate(360deg)' : 'none', transition: refreshing ? 'transform 0.6s linear' : 'none' }}>
            <path d="M4 10a6 6 0 0 1 10.47-4H12v1.5h4V3.5H14.5V5.7A7.5 7.5 0 1 0 17.5 10H16a6 6 0 0 1-12 0Z" fill="currentColor"/>
          </svg>
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      <div className={styles.bentoGrid}>
        <div className={styles.listPanel}>
          <div className={styles.toolbar}>
            <div className={styles.tabs}>
              {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map((tab) => (<button key={tab} className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ''}`} onClick={() => setActiveTab(tab)}>
                  {t(TAB_LABELS[tab])}
                  <span className={styles.tabCount}>{counts[tab]}</span>
                </button>))}
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
                {filtered.length === 0 && (<tr><td colSpan={4} className={styles.emptyRow}>{t('auth.noRequests')}</td></tr>)}
                {filtered.map((r) => {
            const s = students.get(r.studentProfileId);
            const newRequest = r.status === 'PENDING' && isNew(r.requestedAt);
            return (<tr key={r.id} className={`${styles.tableRow} ${newRequest ? styles.newRow : ''}`} onClick={() => navigate(`/authorization-requests/${r.id}`)}>
                      <td>
                        <div className={styles.studentCell}>
                          {s?.photoPath ? (<img src={s.photoPath} alt={r.studentName} className={styles.avatarImg}/>) : (<div className={styles.avatarInitial} style={{ background: avatarColor(r.studentName) }}>
                              {getInitial(r.studentName)}
                            </div>)}
                          <span className={styles.studentName}>{r.studentName}</span>
                          {newRequest && <span className={styles.newBadge}>NEW</span>}
                        </div>
                      </td>
                      <td className={styles.idCell}>{r.studentId}</td>
                      <td className={styles.timeCell}>{formatRelativeTime(r.requestedAt, language)}</td>
                      <td>
                        <span className={statusDot(r.status)}>
                          <span className={styles.dot}/>
                          {t(`auth.${r.status.toLowerCase()}`)}
                        </span>
                      </td>
                    </tr>);
        })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>);
}
