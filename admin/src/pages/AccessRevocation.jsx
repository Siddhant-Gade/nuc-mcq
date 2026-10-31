import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStudents, getBatches, updateStudentAccessStatus } from '../services';
import { getErrorMessage } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import ConfirmModal from '../components/ConfirmModal';
import pageStyles from '../shared/styles/Page.module.css';
import styles from './AccessRevocation.module.css';

const AVATAR_COLORS = [
  '#0284c7', // Sky
  '#0d9488', // Teal
  '#4f46e5', // Indigo
  '#7c3aed', // Purple
  '#d97706', // Amber
  '#059669', // Emerald
  '#e11d48', // Rose
];

function getAvatarColor(name = '') {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function formatDate(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

export default function AccessRevocation() {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [students, setStudents] = useState([]);
  const [batches, setBatches] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [savingId, setSavingId] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [imageErrors, setImageErrors] = useState({});

  useEffect(() => {
    Promise.all([getStudents(), getBatches()])
      .then(([s, b]) => {
        setStudents(Array.isArray(s) ? s : []);
        setBatches(Array.isArray(b) ? b : []);
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  const batchMap = useMemo(() => {
    const map = new Map();
    batches.forEach((b) => map.set(b.batchId, b.batchName));
    return map;
  }, [batches]);

  const filteredStudents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return students.filter((student) => {
      const matchesQuery = !normalizedQuery
        || (student.name && student.name.toLowerCase().includes(normalizedQuery))
        || (student.studentId && student.studentId.toLowerCase().includes(normalizedQuery))
        || (student.email && student.email.toLowerCase().includes(normalizedQuery))
        || (student.mobile && student.mobile.toLowerCase().includes(normalizedQuery));

      const matchesStatus = statusFilter === 'ALL' || student.accessStatus === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [query, statusFilter, students]);

  const counts = useMemo(() => {
    return {
      all: students.length,
      active: students.filter((s) => s.accessStatus === 'ACTIVE').length,
      revoked: students.filter((s) => s.accessStatus === 'REVOKED').length,
    };
  }, [students]);

  async function handleConfirmToggle() {
    if (!selectedStudent) return;
    const student = selectedStudent;
    const nextStatus = student.accessStatus === 'REVOKED' ? 'ACTIVE' : 'REVOKED';
    setSavingId(student.id);
    setError(null);
    try {
      await updateStudentAccessStatus(student.id, nextStatus);
      setStudents((current) => current.map((item) => (item.id === student.id
        ? { ...item, accessStatus: nextStatus }
        : item)));
      setSelectedStudent(null);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSavingId(null);
    }
  }

  function handleImageError(id) {
    setImageErrors((prev) => ({ ...prev, [id]: true }));
  }

  return (
    <div className={styles.container}>
      <div className={pageStyles.pageHeader}>
        <div>
          <h1 className={pageStyles.heading}>Access Revocation</h1>
          <p className={pageStyles.subtext}>
            Manage student access permissions, review active enrollments, and revoke or restore student credentials.
          </p>
        </div>
      </div>

      {error && (
        <div className={pageStyles.errorBanner} role="alert">
          <span>{error}</span>
        </div>
      )}

      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <svg className={styles.searchIcon} width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M7 12A5 5 0 1 0 7 2a5 5 0 0 0 0 10zm5-1 3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
          <input
            className={styles.search}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name, PRN, email, or mobile..."
            aria-label="Search students"
          />
          {query && (
            <button
              type="button"
              className={styles.clearSearchBtn}
              onClick={() => setQuery('')}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>

        <div className={styles.filters} aria-label="Filter students by access status">
          <button
            type="button"
            className={`${styles.filterButton} ${statusFilter === 'ALL' ? styles.selectedFilter : ''}`}
            onClick={() => setStatusFilter('ALL')}
          >
            All Students
            <span className={styles.filterCount}>{counts.all}</span>
          </button>
          <button
            type="button"
            className={`${styles.filterButton} ${statusFilter === 'ACTIVE' ? styles.selectedFilter : ''}`}
            onClick={() => setStatusFilter('ACTIVE')}
          >
            <span className={styles.activeDot} />
            Active
            <span className={styles.filterCount}>{counts.active}</span>
          </button>
          <button
            type="button"
            className={`${styles.filterButton} ${statusFilter === 'REVOKED' ? styles.selectedFilter : ''}`}
            onClick={() => setStatusFilter('REVOKED')}
          >
            <span className={styles.revokedDot} />
            Revoked
            <span className={styles.filterCount}>{counts.revoked}</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className={styles.loadingCard}>
          <div className={styles.spinner} />
          <p className={pageStyles.subtext}>{t('common.loading')}</p>
        </div>
      ) : (
        <div className={styles.card}>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Student Details</th>
                  <th>PRN</th>
                  <th>Batch</th>
                  <th>Admission Date</th>
                  <th>Access Status</th>
                  <th className={styles.textRight}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => {
                  const isRevoked = student.accessStatus === 'REVOKED';
                  const isSaving = savingId === student.id;
                  const hasPhoto = Boolean(student.photoPath && !imageErrors[student.id]);
                  const initial = student.name ? student.name.charAt(0).toUpperCase() : '?';
                  const batchName = batchMap.get(student.batchId) || student.batchId || 'Unassigned';

                  return (
                    <tr key={student.id} className={isRevoked ? styles.revokedRow : ''}>
                      <td>
                        <div className={styles.studentCell}>
                          <div className={styles.avatarWrapper}>
                            {hasPhoto ? (
                              <img
                                src={student.photoPath}
                                alt={student.name}
                                className={styles.avatarImg}
                                onError={() => handleImageError(student.id)}
                              />
                            ) : (
                              <div
                                className={styles.avatarFallback}
                                style={{ backgroundColor: getAvatarColor(student.name) }}
                              >
                                {initial}
                              </div>
                            )}
                          </div>
                          <div className={styles.studentInfo}>
                            <button
                              type="button"
                              className={styles.studentNameBtn}
                              onClick={() => navigate(`/students/${student.id}`)}
                              title="View student profile"
                            >
                              {student.name}
                            </button>
                            <span className={styles.studentSubtext}>
                              {student.email || student.mobile || 'No contact specified'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={styles.prnBadge}>{student.studentId}</span>
                      </td>
                      <td>
                        <span className={styles.batchBadge}>{batchName}</span>
                      </td>
                      <td>
                        <span className={styles.dateText}>{formatDate(student.createdAt)}</span>
                      </td>
                      <td>
                        <span className={`${styles.statusPill} ${isRevoked ? styles.statusRevoked : styles.statusActive}`}>
                          <span className={styles.statusDot} />
                          {isRevoked ? 'Revoked' : 'Active'}
                        </span>
                      </td>
                      <td className={styles.textRight}>
                        <div className={styles.actionsGroup}>
                          <button
                            type="button"
                            className={`${styles.toggleBtn} ${isRevoked ? styles.restoreBtn : styles.revokeBtn}`}
                            disabled={isSaving}
                            onClick={() => setSelectedStudent(student)}
                            title={isRevoked ? 'Restore access for this student' : 'Revoke access for this student'}
                          >
                            {isSaving ? (
                              <span className={styles.buttonSpinner} />
                            ) : isRevoked ? (
                              <>
                                <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M10 2v4m0 8v4M2 10h4m8 0h4" strokeLinecap="round"/>
                                  <circle cx="10" cy="10" r="4"/>
                                </svg>
                                Restore Access
                              </>
                            ) : (
                              <>
                                <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                                  <circle cx="10" cy="10" r="8"/>
                                  <line x1="4.93" y1="4.93" x2="15.07" y2="15.07"/>
                                </svg>
                                Revoke Access
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            className={styles.viewBtn}
                            onClick={() => navigate(`/students/${student.id}`)}
                            title="View student details"
                            aria-label={`View ${student.name} details`}
                          >
                            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7">
                              <path d="M1 10s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z"/>
                              <circle cx="10" cy="10" r="3"/>
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredStudents.length === 0 && (
                  <tr>
                    <td colSpan="6" className={styles.empty}>
                      <div className={styles.emptyContainer}>
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                          <circle cx="11" cy="11" r="8"/>
                          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                        </svg>
                        <p className={styles.emptyTitle}>No matching students found</p>
                        <p className={styles.emptySubtitle}>Try adjusting your search query or status filter.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedStudent && (
        <ConfirmModal
          title={selectedStudent.accessStatus === 'REVOKED' ? 'Restore Student Access?' : 'Revoke Student Access?'}
          message={
            selectedStudent.accessStatus === 'REVOKED'
              ? 'This student will immediately regain access to the student portal, enrolled tests, and study materials.'
              : 'This student will be immediately signed out and blocked from taking exams or accessing student portal resources.'
          }
          avatarUrl={!imageErrors[selectedStudent.id] ? selectedStudent.photoPath : null}
          avatarInitial={selectedStudent.name ? selectedStudent.name.charAt(0).toUpperCase() : '?'}
          avatarBg={getAvatarColor(selectedStudent.name)}
          fields={[
            { label: 'Student', value: selectedStudent.name },
            { label: 'PRN', value: selectedStudent.studentId },
            { label: 'Batch', value: batchMap.get(selectedStudent.batchId) || selectedStudent.batchId || 'Unassigned' },
            { label: 'Contact', value: selectedStudent.email || selectedStudent.mobile || '—' },
            {
              label: 'New Status',
              value: selectedStudent.accessStatus === 'REVOKED' ? 'Active' : 'Revoked',
            },
          ]}
          confirmLabel={selectedStudent.accessStatus === 'REVOKED' ? 'Restore Access' : 'Revoke Access'}
          onConfirm={handleConfirmToggle}
          onCancel={() => !savingId && setSelectedStudent(null)}
          disabled={savingId === selectedStudent.id}
        />
      )}
    </div>
  );
}
