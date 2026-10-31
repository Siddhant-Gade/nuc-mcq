import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDashboardStats, getBatches, getAuthorizationRequests } from '../services';
import { getErrorMessage } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import pageStyles from '../shared/styles/Page.module.css';
import styles from './Dashboard.module.css';

function StatIcon({ type }) {
  const icons = {
    students: (
      <svg width="22" height="22" viewBox="0 0 20 20" fill="none" aria-hidden="true" focusable="false">
        <path d="M10 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm-6 7a6 6 0 0 1 12 0H4Z" fill="currentColor"/>
      </svg>
    ),
    active: (
      <svg width="22" height="22" viewBox="0 0 20 20" fill="none" aria-hidden="true" focusable="false">
        <path d="M10 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm-6 7a6 6 0 0 1 12 0H4Z" fill="currentColor"/>
        <path d="M6 10l3 3 5-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    pending: (
      <svg width="22" height="22" viewBox="0 0 20 20" fill="none" aria-hidden="true" focusable="false">
        <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.6"/>
        <path d="M10 6v4l2.5 2.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      </svg>
    ),
    batches: (
      <svg width="22" height="22" viewBox="0 0 20 20" fill="none" aria-hidden="true" focusable="false">
        <path d="M3 7l7-4 7 4-7 4-7-4Zm0 0v6l7 4m-7-4 7 4m0 0V7" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
      </svg>
    ),
  };
  return icons[type] ?? null;
}

function AuthRequestItem({ request }) {
  const { t } = useLanguage();
  return (
    <li className={styles.authItem}>
      <div className={styles.authItemHeader}>
        <div>
          <p className={styles.authName}>{request.studentName}</p>
          <p className={styles.authPrn}>PRN: {request.prn}</p>
        </div>
        <span className={`${styles.authBadge} ${styles.authBadgePending}`}>{t('dashboard.pending')}</span>
      </div>
      <div className={styles.authItemFooter}>
        <span className={styles.authDate}>{new Date(request.requestedAt).toLocaleDateString()}</span>
      </div>
    </li>
  );
}

function batchStatusLabel(status) {
  if (status === 'ACTIVE') return 'AVAILABLE';
  return status;
}

function batchStatusClass(status) {
  if (status === 'ACTIVE') return `${styles.batchBadge} ${styles.batchBadgeAvailable}`;
  if (status === 'FULL') return `${styles.batchBadge} ${styles.batchBadgeFull}`;
  return `${styles.batchBadge} ${styles.batchBadgeInactive}`;
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [batches, setBatches] = useState([]);
  const [authRequests, setAuthRequests] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const navigate = useNavigate();
  const { t } = useLanguage();

  useEffect(() => {
    Promise.all([getDashboardStats(), getBatches(), getAuthorizationRequests()])
      .then(([s, b, a]) => {
        setStats(s);
        setBatches(Array.isArray(b) ? b : []);
        setAuthRequests(Array.isArray(a) ? a : []);
      })
      .catch((error) => setLoadError(getErrorMessage(error)));
  }, []);

  if (loadError) {
    return (
      <div className={pageStyles.errorBanner}>
        <span>{loadError}</span>
        <button className={pageStyles.errorRetryBtn} onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className={styles.loadingSkeleton} role="status" aria-live="polite">
        <div className={styles.skeletonPulse} />
        <span className={pageStyles.subtext}>{t('common.loading')}</span>
      </div>
    );
  }

  const availableCapacity = batches
    .filter((b) => b.status === 'ACTIVE')
    .reduce((sum, b) => sum + (b.capacity - b.enrolledCount), 0);
  const activeBatchesCount = batches.filter((b) => b.status === 'ACTIVE').length;
  const pendingAuth = authRequests.filter((r) => r.status === 'PENDING');
  const activeRatio = stats.totalStudents > 0 ? Math.round((stats.activeStudents / stats.totalStudents) * 100) : 0;

  return (
    <div className={styles.dashboard}>
      {/* Top Banner / Actions Bar */}
      <div className={styles.headerRow}>
        <div>
          <h1 className={pageStyles.heading}>{t('dashboard.title')}</h1>
          <p className={pageStyles.subtext}>
            MS-CIT Authorized Learning Center • Live Training & Exam Management
          </p>
        </div>
        <div className={styles.quickActionPills}>
          <button
            type="button"
            className={styles.quickPillPrimary}
            onClick={() => navigate('/students/admit')}
            title="Admit new student"
          >
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
              <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Admit Student
          </button>
          <button
            type="button"
            className={styles.quickPillSecondary}
            onClick={() => navigate('/students/import')}
            title="Import admissions from Excel"
          >
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
              <path d="M8 2v9m0 0l-3-3m3 3l3-3M2 13h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Import Excel
          </button>
          <button
            type="button"
            className={styles.quickPillSecondary}
            onClick={() => navigate('/broadcasts')}
            title="Send announcements to students"
          >
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
              <path d="M12 5.5a4.5 4.5 0 0 1 0 5M14 3a8 8 0 0 1 0 10M3 6.5h3l4-3v9l-4-3H3a1 1 0 0 1-1-1v-1a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Broadcast
          </button>
        </div>
      </div>

      {/* Top 4 Metrics Cards */}
      <div className={styles.statsGrid}>
        <button
          type="button"
          className={`${styles.statCard} ${styles.statCardButton}`}
          onClick={() => navigate('/students')}
          aria-label="View all students"
        >
          <div className={styles.statHeader}>
            <div>
              <p className={styles.statLabel}>{t('dashboard.totalStudents')}</p>
              <h3 className={styles.statValue}>{stats.totalStudents.toLocaleString()}</h3>
            </div>
            <div className={`${styles.statIcon} ${styles.statIconPrimary}`} aria-hidden="true">
              <StatIcon type="students" />
            </div>
          </div>
          <div className={styles.statFooter}>
            <span className={styles.statSubtext}>{t('dashboard.enrolledAll')}</span>
          </div>
        </button>

        <button
          type="button"
          className={`${styles.statCard} ${styles.statCardButton}`}
          onClick={() => navigate('/students?status=ACTIVE')}
          aria-label="View active students"
        >
          <div className={styles.statHeader}>
            <div>
              <p className={styles.statLabel}>{t('dashboard.activeStudents')}</p>
              <h3 className={styles.statValue}>{stats.activeStudents}</h3>
            </div>
            <div className={`${styles.statIcon} ${styles.statIconSuccess}`} aria-hidden="true">
              <StatIcon type="active" />
            </div>
          </div>
          <div className={styles.statProgressContainer}>
            <div
              className={styles.statProgressBar}
              role="progressbar"
              aria-valuenow={activeRatio}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Active students progress"
            >
              <div
                className={`${styles.statProgressFill} ${styles.statProgressSuccess}`}
                style={{ width: `${activeRatio}%` }}
              />
            </div>
            <span className={styles.progressPercent}>{activeRatio}% active</span>
          </div>
        </button>

        <button
          type="button"
          className={`${styles.statCard} ${styles.statCardButton}`}
          onClick={() => navigate('/authorization-requests')}
          aria-label="Review pending authorization requests"
        >
          <div className={styles.statHeader}>
            <div>
              <p className={styles.statLabel}>{t('dashboard.pendingAuth')}</p>
              <h3 className={styles.statValue}>{stats.pendingAuthorizations}</h3>
            </div>
            <div className={`${styles.statIcon} ${stats.pendingAuthorizations > 0 ? styles.statIconWarning : styles.statIconMuted}`} aria-hidden="true">
              <StatIcon type="pending" />
            </div>
          </div>
          {stats.pendingAuthorizations > 0 ? (
            <span className={styles.statLink}>
              {t('dashboard.reviewNow')}
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true" focusable="false">
                <path d="M2 6h8m0 0L7 3m3 3L7 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
          ) : (
            <div className={styles.allClearRow}>
              <span className={styles.allClearDot} />
              <span className={styles.statSubtext}>No pending reviews</span>
            </div>
          )}
        </button>

        <button
          type="button"
          className={`${styles.statCard} ${styles.statCardButton}`}
          onClick={() => navigate('/batches')}
          aria-label="View batches and available capacity"
        >
          <div className={styles.statHeader}>
            <div>
              <p className={styles.statLabel}>{t('dashboard.availableCapacity')}</p>
              <h3 className={styles.statValue}>{availableCapacity}</h3>
            </div>
            <div className={`${styles.statIcon} ${styles.statIconInfo}`} aria-hidden="true">
              <StatIcon type="batches" />
            </div>
          </div>
          <div className={styles.statFooter}>
            <span className={styles.statSubtext}>
              {t('dashboard.openBatches').replace('open batches', `${activeBatchesCount} open batches`)}
            </span>
          </div>
        </button>
      </div>

      {/* Bento Grid: Batch Overview & Auth Requests */}
      <div className={styles.bentoGrid}>
        <div className={styles.batchPanel}>
          <div className={styles.panelHeader}>
            <h3 className={styles.panelTitle}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true" focusable="false">
                <path d="M2 6l7-4 7 4-7 4-7-4Zm0 0v5l7 4m-7-4 7 4m0 0V6" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
              </svg>
              {t('dashboard.batchOverview')}
            </h3>
            <span className={styles.panelBadge}>{batches.length} Batches</span>
          </div>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{t('dashboard.batchName')}</th>
                  <th className={styles.textCenter}>{t('dashboard.capacity')}</th>
                  <th className={styles.textCenter}>{t('dashboard.enrolled')}</th>
                  <th className={styles.textCenter}>{t('dashboard.remaining')}</th>
                  <th>{t('dashboard.status')}</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((b) => {
                  const remaining = b.capacity - b.enrolledCount;
                  return (
                    <tr key={b.batchId} onClick={() => navigate('/batches')}>
                      <td className={styles.batchName}>
                        <span className={styles.batchDot} />
                        {b.batchName}
                      </td>
                      <td className={styles.textCenter}>{b.capacity}</td>
                      <td className={styles.textCenter}>
                        <span className={styles.enrolledPill}>{b.enrolledCount}</span>
                      </td>
                      <td className={`${styles.textCenter} ${remaining === 0 ? styles.remainingZero : styles.remainingPositive}`}>
                        {remaining}
                      </td>
                      <td>
                        <span className={batchStatusClass(b.status)}>
                          {batchStatusLabel(b.status)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {batches.length === 0 && (
                  <tr>
                    <td colSpan="5" className={styles.emptyTable}>No active batches found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className={styles.panelFooter}>
            <button
              className={styles.panelLink}
              onClick={() => navigate('/batches')}
              aria-label={t('dashboard.viewAllBatches')}
            >
              {t('dashboard.viewAllBatches')}
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>

        <div className={styles.authPanel}>
          <div className={styles.panelHeader}>
            <h3 className={styles.panelTitle}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true" focusable="false">
                <path d="M4 2h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.4"/>
                <path d="M6 6h6M6 9h6M6 12h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              {t('dashboard.authRequests')}
            </h3>
            {pendingAuth.length > 0 && (
              <span className={styles.pendingBadgeAlert}>{pendingAuth.length} Pending</span>
            )}
          </div>
          <div className={styles.authList}>
            {pendingAuth.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIconCircle}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <p className={styles.emptyTitle}>All caught up!</p>
                <p className={styles.emptySubtitle}>{t('dashboard.noPending')}</p>
              </div>
            ) : (
              pendingAuth.map((r) => <AuthRequestItem key={r.id} request={r} />)
            )}
          </div>
          <div className={styles.panelFooter}>
            <button
              className={styles.panelLink}
              onClick={() => navigate('/authorization-requests')}
              aria-label={`${t('dashboard.viewAllRequests')} (${stats.pendingAuthorizations})`}
            >
              {t('dashboard.viewAllRequests')} ({stats.pendingAuthorizations})
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Quick Navigation Shortcuts */}
      <div className={styles.shortcutsSection}>
        <div className={styles.shortcutsHeader}>
          <h4 className={styles.shortcutsTitle}>Quick Navigation</h4>
        </div>
        <div className={styles.shortcutsGrid}>
          <button
            type="button"
            className={styles.shortcutCard}
            onClick={() => navigate('/analytics')}
          >
            <div className={`${styles.shortcutIcon} ${styles.shortcutBlue}`}>
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M3 17V10m7 7V3m7 14v-6" strokeLinecap="round"/>
              </svg>
            </div>
            <div className={styles.shortcutContent}>
              <span className={styles.shortcutName}>Student Analytics</span>
              <span className={styles.shortcutDesc}>Exam scores, tests taken & pass rates</span>
            </div>
          </button>

          <button
            type="button"
            className={styles.shortcutCard}
            onClick={() => navigate('/question-bank')}
          >
            <div className={`${styles.shortcutIcon} ${styles.shortcutPurple}`}>
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="10" cy="10" r="8"/>
                <path d="M7.5 8a2.5 2.5 0 1 1 3.5 2.3c-.6.4-1 .9-1 1.7m0 2.5h.01" strokeLinecap="round"/>
              </svg>
            </div>
            <div className={styles.shortcutContent}>
              <span className={styles.shortcutName}>Question Bank</span>
              <span className={styles.shortcutDesc}>Manage MS-CIT MCQs & import questions</span>
            </div>
          </button>

          <button
            type="button"
            className={styles.shortcutCard}
            onClick={() => navigate('/study-materials')}
          >
            <div className={`${styles.shortcutIcon} ${styles.shortcutTeal}`}>
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H16v16H6.5a2.5 2.5 0 0 0-2.5 2.5z" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M6 6h6m-6 4h4" strokeLinecap="round"/>
              </svg>
            </div>
            <div className={styles.shortcutContent}>
              <span className={styles.shortcutName}>Study Materials</span>
              <span className={styles.shortcutDesc}>Upload PDFs, guides & syllabus notes</span>
            </div>
          </button>

          <button
            type="button"
            className={styles.shortcutCard}
            onClick={() => navigate('/access-revocation')}
          >
            <div className={`${styles.shortcutIcon} ${styles.shortcutRose}`}>
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="10" cy="10" r="8"/>
                <line x1="4.93" y1="4.93" x2="15.07" y2="15.07"/>
              </svg>
            </div>
            <div className={styles.shortcutContent}>
              <span className={styles.shortcutName}>Access Revocation</span>
              <span className={styles.shortcutDesc}>Revoke or restore student credentials</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
