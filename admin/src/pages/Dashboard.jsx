import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDashboardStats, getBatches, getAuthorizationRequests } from '../services';
import { getErrorMessage } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import pageStyles from '../shared/styles/Page.module.css';
import styles from './Dashboard.module.css';
function StatIcon({ type }) {
    const icons = {
        students: (<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" focusable="false"><path d="M10 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm-6 7a6 6 0 0 1 12 0H4Z" fill="currentColor"/></svg>),
        active: (<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" focusable="false"><path d="M10 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm-6 7a6 6 0 0 1 12 0H4Z" fill="currentColor"/><path d="M6 10l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>),
        pending: (<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" focusable="false"><circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5"/><path d="M10 6v4l2.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>),
        batches: (<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" focusable="false"><path d="M3 7l7-4 7 4-7 4-7-4Zm0 0v6l7 4m-7-4 7 4m0 0V7" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>),
    };
    return icons[type] ?? null;
}
function AuthRequestItem({ request }) {
    const { t } = useLanguage();
    return (<li className={styles.authItem}>
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
    </li>);
}
function batchStatusLabel(status) {
    if (status === 'ACTIVE')
        return 'AVAILABLE';
    return status;
}
function batchStatusClass(status) {
    if (status === 'ACTIVE')
        return `${styles.batchBadge} ${styles.batchBadgeAvailable}`;
    if (status === 'FULL')
        return `${styles.batchBadge} ${styles.batchBadgeFull}`;
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
            setBatches(b);
            setAuthRequests(a);
        })
            .catch((error) => setLoadError(getErrorMessage(error)));
    }, []);
    if (loadError) {
        return (<div className={pageStyles.errorBanner}>
        <span>{loadError}</span>
        <button className={pageStyles.errorRetryBtn} onClick={() => window.location.reload()}>Retry</button>
      </div>);
    }
    if (!stats) {
        // skeleton placeholder — replace with <SkeletonCard /> grid when design system provides it
        return <div className={pageStyles.subtext} role="status" aria-live="polite">{t('common.loading')}</div>;
    }
    const availableCapacity = batches
        .filter((b) => b.status === 'ACTIVE')
        .reduce((sum, b) => sum + (b.capacity - b.enrolledCount), 0);
    const activeBatchesCount = batches.filter((b) => b.status === 'ACTIVE').length;
    const pendingAuth = authRequests.filter((r) => r.status === 'PENDING');
    return (<div className={styles.dashboard}>
      <div className={pageStyles.pageHeader}>
        <h1 className={pageStyles.heading}>{t('dashboard.title')}</h1>
      </div>

      <div className={styles.statsGrid}>
        <button type="button" className={`${styles.statCard} ${styles.statCardButton}`} onClick={() => navigate('/students')} aria-label="View all students">
          <div className={styles.statHeader}>
            <div>
              <p className={styles.statLabel}>{t('dashboard.totalStudents')}</p>
              <h3 className={styles.statValue}>{stats.totalStudents.toLocaleString()}</h3>
            </div>
            <div className={`${styles.statIcon} ${styles.statIconPrimary}`} aria-hidden="true">
              <StatIcon type="students"/>
            </div>
          </div>
          <div className={styles.statFooter}>
            <span className={styles.statSubtext}>{t('dashboard.enrolledAll')}</span>
          </div>
        </button>

        <button type="button" className={`${styles.statCard} ${styles.statCardButton}`} onClick={() => navigate('/students?status=ACTIVE')} aria-label="View active students">
          <div className={styles.statHeader}>
            <div>
              <p className={styles.statLabel}>{t('dashboard.activeStudents')}</p>
              <h3 className={styles.statValue}>{stats.activeStudents}</h3>
            </div>
            <div className={`${styles.statIcon} ${styles.statIconSuccess}`} aria-hidden="true">
              <StatIcon type="active"/>
            </div>
          </div>
          <div className={styles.statProgressBar} role="progressbar" aria-valuenow={stats.totalStudents > 0 ? Math.round((stats.activeStudents / stats.totalStudents) * 100) : 0} aria-valuemin={0} aria-valuemax={100} aria-label="Active students progress">
            <div className={`${styles.statProgressFill} ${styles.statProgressSuccess}`} style={{ width: `${stats.totalStudents > 0 ? (stats.activeStudents / stats.totalStudents) * 100 : 0}%` }}/>
          </div>
        </button>

        <button type="button" className={`${styles.statCard} ${styles.statCardButton}`} onClick={() => navigate('/authorization-requests')} aria-label="Review pending authorization requests">
          <div className={styles.statHeader}>
            <div>
              <p className={styles.statLabel}>{t('dashboard.pendingAuth')}</p>
              <h3 className={styles.statValue}>{stats.pendingAuthorizations}</h3>
            </div>
            <div className={`${styles.statIcon} ${styles.statIconWarning}`} aria-hidden="true">
              <StatIcon type="pending"/>
            </div>
          </div>
          <span className={styles.statLink}>
            {t('dashboard.reviewNow')}
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true" focusable="false"><path d="M2 6h8m0 0L7 3m3 3L7 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </span>
        </button>

        <button type="button" className={`${styles.statCard} ${styles.statCardButton}`} onClick={() => navigate('/batches')} aria-label="View batches and available capacity">
          <div className={styles.statHeader}>
            <div>
              <p className={styles.statLabel}>{t('dashboard.availableCapacity')}</p>
              <h3 className={styles.statValue}>{availableCapacity}</h3>
            </div>
            <div className={`${styles.statIcon} ${styles.statIconInfo}`} aria-hidden="true">
              <StatIcon type="batches"/>
            </div>
          </div>
          <div className={styles.statFooter}>
            <span className={styles.statSubtext}>{t('dashboard.openBatches').replace('open batches', `${activeBatchesCount} open batches`)}</span>
          </div>
        </button>
      </div>

      <div className={styles.bentoGrid}>
        <div className={styles.batchPanel}>
          <div className={styles.panelHeader}>
            <h3 className={styles.panelTitle}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true" focusable="false"><path d="M2 6l7-4 7 4-7 4-2-4Zm0 0v5l7 4m-7-4 7 4m0 0V6" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round"/></svg>
              {t('dashboard.batchOverview')}
            </h3>
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
            return (<tr key={b.batchId}>
                      <td className={styles.batchName}>{b.batchName}</td>
                      <td className={styles.textCenter}>{b.capacity}</td>
                      <td className={styles.textCenter}>{b.enrolledCount}</td>
                      <td className={`${styles.textCenter} ${remaining === 0 ? styles.remainingZero : styles.remainingPositive}`}>
                        {remaining}
                      </td>
                      <td><span className={batchStatusClass(b.status)}>{batchStatusLabel(b.status)}</span></td>
                    </tr>);
        })}
              </tbody>
            </table>
          </div>
          <div className={styles.panelFooter}>
            <button className={styles.panelLink} onClick={() => navigate('/batches')} aria-label={t('dashboard.viewAllBatches')}>{t('dashboard.viewAllBatches')}</button>
          </div>
        </div>

        <div className={styles.authPanel}>
          <div className={styles.panelHeader}>
            <h3 className={styles.panelTitle}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true" focusable="false"><path d="M4 2h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.25"/><path d="M6 6h6M6 9h6M6 12h3" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/></svg>
              {t('dashboard.authRequests')}
            </h3>
          </div>
          <div className={styles.authList}>
            {pendingAuth.length === 0 && (<div className={styles.emptyState}>{t('dashboard.noPending')}</div>)}
            {pendingAuth.map((r) => (<AuthRequestItem key={r.id} request={r}/>))}
          </div>
          <div className={styles.panelFooter}>
            <button className={styles.panelLink} onClick={() => navigate('/authorization-requests')} aria-label={`${t('dashboard.viewAllRequests')} (${stats.pendingAuthorizations})`}>
              {t('dashboard.viewAllRequests')} ({stats.pendingAuthorizations})
            </button>
          </div>
        </div>
      </div>
    </div>);
}
