import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    getStudentById,
    getStudentAccess,
    getStudentPerformance,
    updateStudentAccessStatus,
    suspendStudent,
    restoreStudent,
    deleteStudent,
    getBatches,
} from '../services';
import { getErrorMessage } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import StatusUpdateModal from '../components/StatusUpdateModal';
import EditStudentModal from '../components/EditStudentModal';
import pageStyles from '../shared/styles/Page.module.css';
import styles from './StudentDetails.module.css';

function statusBadgeClass(status) {
    if (status === 'ACTIVE')
        return `${styles.badge} ${styles.badgeActive}`;
    if (status === 'PENDING')
        return `${styles.badge} ${styles.badgePending}`;
    if (status === 'EXPIRED')
        return `${styles.badge} ${styles.badgeExpired}`;
    if (status === 'SUSPENDED')
        return `${styles.badge} ${styles.badgeRevoked}`;
    return `${styles.badge} ${styles.badgeRevoked}`;
}

function formatDate(iso, lang) {
    if (!iso) return '—';
    const locale = lang === 'en' ? 'en-US' : lang === 'mr' ? 'mr-IN' : 'hi-IN';
    return new Date(iso).toLocaleDateString(locale, { month: 'numeric', day: 'numeric', year: 'numeric' });
}

export default function StudentDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [student, setStudent] = useState(null);
    const [accessData, setAccessData] = useState(null);
    const [accessStatus, setAccessStatus] = useState('PENDING');
    const [performance, setPerformance] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showSuspendModal, setShowSuspendModal] = useState(false);
    const [suspensionReason, setSuspensionReason] = useState('');
    const [isSuspending, setIsSuspending] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);
    const [batches, setBatches] = useState([]);
    const [actionError, setActionError] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const { t, language } = useLanguage();

    useEffect(() => {
        if (!id)
            return;
        Promise.all([
            getStudentById(id),
            getStudentAccess(id),
            getStudentPerformance(id).catch(() => null),
            getBatches().catch(() => [])
        ])
            .then(([s, a, p, b]) => {
                setStudent(s ?? null);
                setAccessData(a ?? null);
                setAccessStatus(a?.status ?? 'PENDING');
                setPerformance(p ?? null);
                setBatches(b ?? []);
            })
            .catch((error) => setActionError(getErrorMessage(error)))
            .finally(() => setLoading(false));
    }, [id]);

    async function handleDelete() {
        if (!id || !student)
            return;
        const confirmed = window.confirm(`Are you sure you want to permanently delete student "${student.name}" (${student.studentId})? This action cannot be undone.`);
        if (!confirmed)
            return;
        setIsDeleting(true);
        setActionError(null);
        try {
            await deleteStudent(id);
            navigate('/students');
        }
        catch (err) {
            setActionError(getErrorMessage(err));
            setIsDeleting(false);
        }
    }

    async function handleStatusConfirm(newStatus) {
        if (!id)
            return;
        setActionError(null);
        try {
            await updateStudentAccessStatus(id, newStatus);
            setAccessStatus(newStatus);
            setAccessData((prev) => ({ ...prev, status: newStatus }));
            setShowModal(false);
        }
        catch (error) {
            setActionError(getErrorMessage(error));
            setShowModal(false);
        }
    }

    async function handleSuspend() {
        if (!id) return;
        setIsSuspending(true);
        setActionError(null);
        try {
            const res = await suspendStudent(id, suspensionReason.trim() || undefined);
            setAccessStatus('SUSPENDED');
            setAccessData((prev) => ({
                ...prev,
                status: 'SUSPENDED',
                suspendedAt: res?.suspendedAt || new Date().toISOString(),
                suspensionReason: res?.suspensionReason || suspensionReason.trim(),
            }));
            setShowSuspendModal(false);
            setSuspensionReason('');
        } catch (error) {
            setActionError(getErrorMessage(error));
        } finally {
            setIsSuspending(false);
        }
    }

    async function handleRestore() {
        if (!id) return;
        setIsRestoring(true);
        setActionError(null);
        try {
            await restoreStudent(id);
            setAccessStatus('ACTIVE');
            setAccessData((prev) => ({
                ...prev,
                status: 'ACTIVE',
                suspendedAt: null,
                suspensionReason: null,
            }));
        } catch (error) {
            setActionError(getErrorMessage(error));
        } finally {
            setIsRestoring(false);
        }
    }

    if (loading) {
        return <div className={pageStyles.subtext}>{t('common.loading')}</div>;
    }
    if (!student) {
        return (<div>
        <p>{t('studentDetail.notFound')}</p>
        <button className={styles.backBtn} onClick={() => navigate('/students')}>{t('studentDetail.backToList')}</button>
      </div>);
    }
    const statusKey = `access.${accessStatus.toLowerCase()}`;

    return (<div>
      {actionError && (<div className={pageStyles.errorBanner}>
          <span>{actionError}</span>
          <button className={pageStyles.errorRetryBtn} onClick={() => setActionError(null)}>Dismiss</button>
        </div>)}
      <div className={styles.breadcrumbRow}>
        <div>
          <nav className={pageStyles.breadcrumb}>
            <a className={pageStyles.breadcrumbLink} onClick={() => navigate('/students')}>{t('admission.breadcrumbStudents')}</a>
            <span className={pageStyles.breadcrumbSeparator}>/</span>
            <span className={pageStyles.breadcrumbCurrent}>{student.name}</span>
          </nav>
          <h1 className={pageStyles.heading}>{student.name}</h1>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button className={styles.backBtn} style={{ color: 'var(--color-primary)', borderColor: 'var(--color-primary)' }} onClick={() => setShowEditModal(true)}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Edit Details
          </button>

          {accessStatus === 'SUSPENDED' ? (
            <button
              className={styles.backBtn}
              style={{ color: '#10b981', borderColor: '#10b981' }}
              disabled={isRestoring}
              onClick={handleRestore}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                <path d="M21 3v5h-5" />
                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                <path d="M8 16H3v5" />
              </svg>
              {isRestoring ? 'Restoring...' : 'Restore Access'}
            </button>
          ) : (
            <button
              className={styles.backBtn}
              style={{ color: '#ef4444', borderColor: '#ef4444' }}
              onClick={() => setShowSuspendModal(true)}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
              </svg>
              Suspend Student
            </button>
          )}

          <button className={styles.backBtn} style={{ color: 'var(--color-error)', borderColor: 'var(--color-error)' }} disabled={isDeleting} onClick={handleDelete}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {isDeleting ? 'Deleting...' : 'Delete Student'}
          </button>
          <button className={styles.backBtn} onClick={() => navigate('/students')}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 4l-4 4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            {t('studentDetail.backToList')}
          </button>
        </div>
      </div>

      <div className={styles.bentoGrid}>
        {/* Left Column: Admission Details */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>{t('studentDetail.admissionDetails')}</h3>
          </div>
          <div className={styles.cardBody}>
            {student.photoPath ? (<div className={styles.photoWrap}>
                <img src={student.photoPath} alt={student.name} className={styles.photo}/>
              </div>) : (<div className={styles.photoWrap}>
                <div className={styles.photoPlaceholder}>{student.name.charAt(0)}</div>
              </div>)}
            <dl className={styles.dl}>
              <div className={styles.dlRow}>
                <dt>{t('studentDetail.studentIdPrn')}</dt>
                <dd>{student.studentId}</dd>
              </div>
              <div className={styles.dlRow}>
                <dt>{t('studentDetail.fullName')}</dt>
                <dd>{student.name}</dd>
              </div>
              <div className={styles.dlRow}>
                <dt>{t('studentDetail.email')}</dt>
                <dd className={styles.emailValue}>{student.email || '—'}</dd>
              </div>
              <div className={styles.dlRow}>
                <dt>{t('studentDetail.mobile')}</dt>
                <dd>{student.mobile || '—'}</dd>
              </div>
              <div className={styles.dlRow}>
                <dt>{t('studentDetail.batch')}</dt>
                <dd>{student.batchId}</dd>
              </div>
              <div className={styles.dlRow}>
                <dt>{t('studentDetail.course')}</dt>
                <dd>{student.courseInfo}</dd>
              </div>
              <div className={styles.dlRow}>
                <dt>{t('studentDetail.institute')}</dt>
                <dd>{student.instituteId}</dd>
              </div>
              <div className={`${styles.dlRow} ${styles.dlRowLast}`}>
                <dt>{t('studentDetail.created')}</dt>
                <dd>{formatDate(student.createdAt, language)}</dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Right Column: Access Status + Test & Exam Performance */}
        <div className={styles.rightColumn}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>{t('studentDetail.accessStatus')}</h3>
            </div>
            <div className={styles.cardBody}>
              <div className={styles.statusRow}>
                <span className={styles.statusLabel}>{t('studentDetail.currentStatus')}</span>
                <span className={statusBadgeClass(accessStatus)}>
                  {accessStatus === 'SUSPENDED' ? 'SUSPENDED' : t(statusKey)}
                </span>
              </div>

              {accessStatus === 'SUSPENDED' && (
                <div style={{ marginTop: '0.875rem', padding: '0.875rem', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ef4444', fontWeight: 600, fontSize: '0.875rem' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <span>Student Access Suspended</span>
                  </div>
                  <p style={{ margin: '0.375rem 0 0', fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.4 }}>
                    Web and mobile access is immediately halted. Active assessments are terminated.
                  </p>
                  {accessData?.suspendedAt && (
                    <p style={{ margin: '0.375rem 0 0', fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>
                      <strong>Suspended On:</strong> {formatDate(accessData.suspendedAt, language)}
                    </p>
                  )}
                  {accessData?.suspensionReason && (
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>
                      <strong>Reason:</strong> {accessData.suspensionReason}
                    </p>
                  )}
                </div>
              )}

              <div className={styles.statusActions} style={{ display: 'flex', gap: '0.625rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                <button className={styles.updateBtn} onClick={() => setShowModal(true)}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M11.5 2.5l2 2-8 8H3.5v-2l8-8z" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  {t('studentDetail.updateStatus')}
                </button>
                {accessStatus === 'SUSPENDED' ? (
                  <button
                    className={styles.updateBtn}
                    style={{ background: '#10b981', color: '#fff', borderColor: '#10b981' }}
                    disabled={isRestoring}
                    onClick={handleRestore}
                  >
                    {isRestoring ? 'Restoring...' : 'Restore Access'}
                  </button>
                ) : (
                  <button
                    className={styles.updateBtn}
                    style={{ background: '#ef4444', color: '#fff', borderColor: '#ef4444' }}
                    onClick={() => setShowSuspendModal(true)}
                  >
                    Suspend Student
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardTitleRow}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-primary)' }}>
                  <path d="M18 20V10M12 20V4M6 20v-6" />
                </svg>
                <h3 className={styles.cardTitle}>Test & Exam Performance</h3>
              </div>
            </div>
            <div className={styles.cardBody}>
              {performance && performance.totalTests > 0 ? (
                <div className={styles.perfContent}>
                  <div className={styles.perfStatsGrid}>
                    <div className={styles.perfStatBox}>
                      <span className={styles.perfStatValue}>{performance.totalTests}</span>
                      <span className={styles.perfStatLabel}>Tests Taken</span>
                    </div>
                    <div className={styles.perfStatBox}>
                      <span className={`${styles.perfStatValue} ${performance.avgPercentage >= 40 ? styles.textSuccess : styles.textError}`}>
                        {performance.avgPercentage}%
                      </span>
                      <span className={styles.perfStatLabel}>Average Score</span>
                    </div>
                    <div className={styles.perfStatBox}>
                      <span className={styles.perfStatValue}>{performance.passedCount} / {performance.totalTests}</span>
                      <span className={styles.perfStatLabel}>Tests Passed</span>
                    </div>
                  </div>

                  <div className={styles.perfSubRow}>
                    <span className={styles.perfTypeBadge}>
                      📝 {performance.practiceCount} Practice • 🎓 {performance.examCount} Exam
                    </span>
                  </div>
                </div>
              ) : (
                <div className={styles.perfEmptyState}>
                  <div className={styles.emptyIconWrap}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                      <polyline points="10 9 9 9 8 9" />
                    </svg>
                  </div>
                  <p className={styles.emptyTitle}>No test attempts yet</p>
                  <p className={styles.emptySubtext}>
                    Practice and mock exam scores submitted from the student mobile app will appear here.
                  </p>
                  <button className={styles.analyticsLinkBtn} onClick={() => navigate('/analytics')}>
                    View Institute Analytics →
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showModal && (<StatusUpdateModal studentName={student.name} currentStatus={accessStatus} onConfirm={handleStatusConfirm} onCancel={() => setShowModal(false)}/>)}
      
      {showEditModal && (
        <EditStudentModal
          student={student}
          batches={batches}
          onSave={(updated) => setStudent((prev) => ({ ...prev, ...updated }))}
          onClose={() => setShowEditModal(false)}
        />
      )}

      {showSuspendModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ background: 'var(--color-surface-card)', borderRadius: '12px', maxWidth: '480px', width: '100%', padding: '1.5rem', border: '1px solid var(--color-outline-variant)', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', flexShrink: 0 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600, color: 'var(--color-on-surface)' }}>Suspend Student Access</h3>
                <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)' }}>{student.name} ({student.studentId})</p>
              </div>
            </div>
            
            <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface)', lineHeight: 1.5, marginBottom: '1rem' }}>
              Suspending this student will immediately block access to the Student React website and Flutter application. Any active assessment will be stopped. Continue?
            </p>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--color-on-surface)', marginBottom: '0.375rem' }}>
                Suspension Reason (optional)
              </label>
              <textarea
                style={{ width: '100%', minHeight: '80px', padding: '0.625rem', borderRadius: '6px', border: '1px solid var(--color-outline-variant)', background: 'var(--color-surface-container)', color: 'var(--color-on-surface)', fontSize: '0.875rem', resize: 'vertical', outline: 'none' }}
                placeholder="e.g. Temporary academic suspension, pending fee verification..."
                value={suspensionReason}
                onChange={(e) => setSuspensionReason(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid var(--color-outline-variant)', background: 'transparent', color: 'var(--color-on-surface)', cursor: 'pointer', fontSize: '0.875rem' }}
                disabled={isSuspending}
                onClick={() => { setShowSuspendModal(false); setSuspensionReason(''); }}
              >
                Cancel
              </button>
              <button
                type="button"
                style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: 'none', background: '#ef4444', color: '#fff', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                disabled={isSuspending}
                onClick={handleSuspend}
              >
                {isSuspending ? 'Suspending...' : 'Confirm Suspension'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>);
}
