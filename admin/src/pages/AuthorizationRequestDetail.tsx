import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { AuthorizationRequest, StudentProfile } from '../types';
import { getAuthorizationRequestById, getStudentById, approveAuthorizationRequest, rejectAuthorizationRequest } from '../services';
import { useLanguage } from '../contexts/LanguageContext';
import pageStyles from '../shared/styles/Page.module.css';
import styles from './AuthorizationRequestDetail.module.css';

function formatDate(iso: string, lang: string) {
  const d = new Date(iso);
  const locale = lang === 'en' ? 'en-IN' : lang === 'mr' ? 'mr-IN' : 'hi-IN';
  return d.toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' }) + ' - ' +
    d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) + ' IST';
}

function statusBadge(status: string) {
  if (status === 'PENDING') return `${styles.statusBadge} ${styles.statusPending}`;
  if (status === 'APPROVED') return `${styles.statusBadge} ${styles.statusApproved}`;
  return `${styles.statusBadge} ${styles.statusRejected}`;
}

export default function AuthorizationRequestDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const [request, setRequest] = useState<AuthorizationRequest | null>(null);
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    getAuthorizationRequestById(id).then((r) => {
      if (!r) { setLoading(false); return; }
      setRequest(r);
      getStudentById(r.studentProfileId).then((s) => {
        if (s) setStudent(s);
        setLoading(false);
      });
    });
  }, [id]);

  async function handleApprove() {
    if (!request) return;
    await approveAuthorizationRequest(request.id);
    setRequest((prev) => prev ? { ...prev, status: 'APPROVED' as const, reviewedAt: new Date().toISOString() } : prev);
  }

  async function handleReject() {
    if (!request) return;
    await rejectAuthorizationRequest(request.id);
    setRequest((prev) => prev ? { ...prev, status: 'REJECTED' as const, reviewedAt: new Date().toISOString() } : prev);
  }

  if (loading) {
    return <div className={pageStyles.subtext}>{t('common.loading')}</div>;
  }

  if (!request) {
    return <div className={pageStyles.subtext}>{t('auth.noRequests')}</div>;
  }

  const statusKey = request.status === 'PENDING' ? 'auth.pending' : request.status === 'APPROVED' ? 'auth.approved' : 'auth.rejected';

  return (
    <div>
      <nav className={styles.backLink}>
        <a onClick={() => navigate('/authorization-requests')}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 4l-4 4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          {t('authDetail.backToRequests')}
        </a>
      </nav>

      <div className={styles.pageHeader}>
        <div>
          <h1 className={pageStyles.heading}>{t('authDetail.title')}</h1>
          <p className={styles.subtitle}>{t('authDetail.subtitle')}</p>
        </div>
        <div className={statusBadge(request.status)}>
          <span className={styles.statusDot} />
          {t(statusKey)}
        </div>
      </div>

      <div className={styles.bentoGrid}>
        <div className={styles.profileCard}>
          <div className={styles.profilePhotoWrap}>
            <div className={styles.profilePhoto}>
              {student?.photoPath ? (
                <img src={student.photoPath} alt={request.studentName} />
              ) : (
                <div className={styles.profileInitial}>{request.studentName.charAt(0)}</div>
              )}
            </div>
          </div>
          <h2 className={styles.profileName}>{request.studentName}</h2>
          <p className={styles.profileId}>ID: {request.studentId}</p>
          <div className={styles.profileBatch}>
            <span className={styles.profileBatchLabel}>{t('authDetail.batch')}</span>
            <span className={styles.profileBatchValue}>{student?.batchId ?? 'N/A'}</span>
          </div>
        </div>

        <div className={styles.detailsColumn}>
          <div className={styles.infoCard}>
            <h3 className={styles.cardTitle}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5"/><path d="M10 9v4M10 7v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              {t('authDetail.requestInfo')}
            </h3>
            <div className={styles.infoGrid}>
              <div>
                <p className={styles.infoLabel}>{t('authDetail.requestType')}</p>
                <p className={styles.infoValue}>{t('authDetail.deviceReauth')}</p>
              </div>
              <div>
                <p className={styles.infoLabel}>{t('authDetail.timestamp')}</p>
                <p className={styles.infoValue}>{formatDate(request.requestedAt, language)}</p>
              </div>
              <div>
                <p className={styles.infoLabel}>{t('authDetail.prevDevice')}</p>
                <p className={`${styles.infoValue} ${styles.mono}`}>DEV-9A8B-7C6D</p>
              </div>
              <div>
                <p className={styles.infoLabel}>{t('authDetail.newDevice')}</p>
                <p className={`${styles.infoValue} ${styles.mono} ${styles.newDevice}`}>DEV-3F2E-1D0C</p>
              </div>
            </div>
          </div>

          <div className={styles.actionCard}>
            <div>
              <p className={styles.actionTitle}>{t('authDetail.actionRequired')}</p>
              <p className={styles.actionSubtitle}>{t('authDetail.actionDesc')}</p>
            </div>
            <div className={styles.actionButtons}>
              {request.status === 'PENDING' ? (
                <>
                  <button className={styles.rejectBtn} onClick={handleReject}>
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M13.5 4.5 4.5 13.5M4.5 4.5l9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                    {t('authDetail.reject')}
                  </button>
                  <button className={styles.approveBtn} onClick={handleApprove}>
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M4 9.5l3.5 3.5 6.5-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    {t('authDetail.approve')}
                  </button>
                </>
              ) : (
                <span className={styles.reviewedBadge}>{t('authDetail.reviewed')}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
