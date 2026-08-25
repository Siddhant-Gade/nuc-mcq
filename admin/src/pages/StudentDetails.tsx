import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { StudentProfile, StudentAccess } from '../types';
import { getStudentById, getStudentAccess, updateStudentAccessStatus } from '../services';
import { useLanguage } from '../contexts/LanguageContext';
import StatusUpdateModal from '../components/StatusUpdateModal';
import pageStyles from '../shared/styles/Page.module.css';
import styles from './StudentDetails.module.css';

type StatusValue = StudentAccess['status'];

function statusBadgeClass(status: string) {
  if (status === 'ACTIVE') return `${styles.badge} ${styles.badgeActive}`;
  if (status === 'PENDING') return `${styles.badge} ${styles.badgePending}`;
  if (status === 'EXPIRED') return `${styles.badge} ${styles.badgeExpired}`;
  return `${styles.badge} ${styles.badgeRevoked}`;
}

function formatDate(iso: string, lang: string) {
  const locale = lang === 'en' ? 'en-US' : lang === 'mr' ? 'mr-IN' : 'hi-IN';
  return new Date(iso).toLocaleDateString(locale, { month: 'numeric', day: 'numeric', year: 'numeric' });
}

export default function StudentDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [accessStatus, setAccessStatus] = useState<StatusValue>('PENDING');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const { t, language } = useLanguage();

  useEffect(() => {
    if (!id) return;
    Promise.all([getStudentById(id), getStudentAccess(id)]).then(([s, a]) => {
      setStudent(s ?? null);
      setAccessStatus(a?.status ?? 'PENDING');
      setLoading(false);
    });
  }, [id]);

  async function handleStatusConfirm(newStatus: StatusValue) {
    if (!id) return;
    await updateStudentAccessStatus(id, newStatus);
    setAccessStatus(newStatus);
    setShowModal(false);
  }

  if (loading) {
    return <div className={pageStyles.subtext}>{t('common.loading')}</div>;
  }

  if (!student) {
    return (
      <div>
        <p>{t('studentDetail.notFound')}</p>
        <button className={styles.backBtn} onClick={() => navigate('/students')}>{t('studentDetail.backToList')}</button>
      </div>
    );
  }

  const statusKey = `access.${accessStatus.toLowerCase()}`;

  return (
    <div>
      <div className={styles.breadcrumbRow}>
        <div>
          <nav className={pageStyles.breadcrumb}>
            <a className={pageStyles.breadcrumbLink} onClick={() => navigate('/students')}>{t('admission.breadcrumbStudents')}</a>
            <span className={pageStyles.breadcrumbSeparator}>/</span>
            <span className={pageStyles.breadcrumbCurrent}>{student.name}</span>
          </nav>
          <h1 className={pageStyles.heading}>{student.name}</h1>
        </div>
        <button className={styles.backBtn} onClick={() => navigate('/students')}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 4l-4 4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          {t('studentDetail.backToList')}
        </button>
      </div>

      <div className={styles.bentoGrid}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>{t('studentDetail.admissionDetails')}</h3>
          </div>
          <div className={styles.cardBody}>
            {student.photoPath ? (
              <div className={styles.photoWrap}>
                <img src={student.photoPath} alt={student.name} className={styles.photo} />
              </div>
            ) : (
              <div className={styles.photoWrap}>
                <div className={styles.photoPlaceholder}>{student.name.charAt(0)}</div>
              </div>
            )}
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

          <div className={styles.placeholderCard}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <span>{t('studentDetail.performanceWidget')}</span>
          </div>
        </div>
      </div>

      {showModal && (
        <StatusUpdateModal
          studentName={student.name}
          currentStatus={accessStatus}
          onConfirm={handleStatusConfirm}
          onCancel={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
