import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getStudentById, getStudentAccess, getStudentPerformance, updateStudentAccessStatus, deleteStudent } from '../services';
import { getErrorMessage } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import StatusUpdateModal from '../components/StatusUpdateModal';
import pageStyles from '../shared/styles/Page.module.css';
import styles from './StudentDetails.module.css';

function statusBadgeClass(status) {
    if (status === 'ACTIVE')
        return `${styles.badge} ${styles.badgeActive}`;
    if (status === 'PENDING')
        return `${styles.badge} ${styles.badgePending}`;
    if (status === 'EXPIRED')
        return `${styles.badge} ${styles.badgeExpired}`;
    return `${styles.badge} ${styles.badgeRevoked}`;
}

function formatDate(iso, lang) {
    const locale = lang === 'en' ? 'en-US' : lang === 'mr' ? 'mr-IN' : 'hi-IN';
    return new Date(iso).toLocaleDateString(locale, { month: 'numeric', day: 'numeric', year: 'numeric' });
}

export default function StudentDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [student, setStudent] = useState(null);
    const [accessStatus, setAccessStatus] = useState('PENDING');
    const [performance, setPerformance] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [actionError, setActionError] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const { t, language } = useLanguage();

    useEffect(() => {
        if (!id)
            return;
        Promise.all([
            getStudentById(id),
            getStudentAccess(id),
            getStudentPerformance(id).catch(() => null)
        ])
            .then(([s, a, p]) => {
                setStudent(s ?? null);
                setAccessStatus(a?.status ?? 'PENDING');
                setPerformance(p ?? null);
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
            setShowModal(false);
        }
        catch (error) {
            setActionError(getErrorMessage(error));
            setShowModal(false);
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
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
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
                <span className={statusBadgeClass(accessStatus)}>{t(statusKey)}</span>
              </div>
              <div className={styles.statusActions}>
                <button className={styles.updateBtn} onClick={() => setShowModal(true)}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M11.5 2.5l2 2-8 8H3.5v-2l8-8z" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  {t('studentDetail.updateStatus')}
                </button>
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

                  {performance.recentTests && performance.recentTests.length > 0 && (
                    <div className={styles.recentTestsList}>
                      <span className={styles.recentTestsTitle}>Recent Test Attempts</span>
                      {performance.recentTests.map((rt) => (
                        <div key={rt.id} className={styles.recentTestItem}>
                          <div className={styles.recentTestLeft}>
                            <span className={`${styles.testModeBadge} ${rt.mode === 'EXAM' ? styles.modeExam : styles.modePractice}`}>
                              {rt.mode}
                            </span>
                            <span className={styles.testScoreText}>
                              {rt.score}/{rt.totalQuestions} ({rt.percentage}%)
                            </span>
                          </div>
                          <span className={`${styles.testPassBadge} ${rt.passed ? styles.passed : styles.failed}`}>
                            {rt.passed ? 'PASSED' : 'FAILED'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className={styles.perfFooter}>
                    <button className={styles.analyticsLinkBtn} onClick={() => navigate('/analytics')}>
                      View Institute Analytics →
                    </button>
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
    </div>);
}
