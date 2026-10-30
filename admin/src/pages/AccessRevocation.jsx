import { useEffect, useMemo, useState } from 'react';
import { getStudents, updateStudentAccessStatus } from '../services';
import { getErrorMessage } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import ConfirmModal from '../components/ConfirmModal';
import pageStyles from '../shared/styles/Page.module.css';
import styles from './AccessRevocation.module.css';

export default function AccessRevocation() {
  const { t } = useLanguage();
  const [students, setStudents] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [savingId, setSavingId] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    getStudents()
      .then(setStudents)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  const filteredStudents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return students.filter((student) => !normalizedQuery
      || student.name.toLowerCase().includes(normalizedQuery)
      || student.studentId.toLowerCase().includes(normalizedQuery)).filter((student) =>
        statusFilter === 'ALL' || student.accessStatus === statusFilter);
  }, [query, statusFilter, students]);

  async function handleConfirmToggle() {
    if (!selectedStudent) return;
    const student = selectedStudent;
    const nextStatus = student.accessStatus === 'REVOKED' ? 'ACTIVE' : 'REVOKED';
    setSavingId(student.id);
    setError(null);
    try {
      await updateStudentAccessStatus(student.id, nextStatus);
      setStudents((current) => current.map((item) => item.id === student.id
        ? { ...item, accessStatus: nextStatus }
        : item));
      setSelectedStudent(null);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div>
      <div className={pageStyles.pageHeader}>
        <div>
          <h1 className={pageStyles.heading}>Access Revocation</h1>
          <p className={pageStyles.subtext}>Revoke or restore student access from one place.</p>
        </div>
      </div>
      {error && <div className={pageStyles.errorBanner} role="alert"><span>{error}</span></div>}
      <div className={styles.toolbar}>
        <input
          className={styles.search}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name or PRN"
          aria-label="Search students"
        />
        <div className={styles.filters} aria-label="Filter students by access status">
          {['ALL', 'ACTIVE', 'REVOKED'].map((filter) => (
            <button
              key={filter}
              type="button"
              className={`${styles.filterButton} ${statusFilter === filter ? styles.selectedFilter : ''}`}
              onClick={() => setStatusFilter(filter)}
            >
              {filter === 'ALL' ? 'All students' : filter === 'ACTIVE' ? 'Active' : 'Revoked'}
              <span>{filter === 'ALL' ? students.length : students.filter((student) => student.accessStatus === filter).length}</span>
            </button>
          ))}
        </div>
      </div>
      {loading ? <p className={pageStyles.subtext}>{t('common.loading')}</p> : (
        <div className={styles.card}>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr><th>Student</th><th>PRN</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>
                {filteredStudents.map((student) => (
                  <tr key={student.id}>
                    <td>{student.name}</td>
                    <td>{student.studentId}</td>
                    <td><span className={`${styles.status} ${student.accessStatus === 'REVOKED' ? styles.revoked : styles.active}`}>{student.accessStatus}</span></td>
                    <td>
                      <button type="button" className={`${styles.action} ${student.accessStatus === 'REVOKED' ? styles.restore : ''}`} disabled={savingId === student.id} onClick={() => setSelectedStudent(student)}>
                        {savingId === student.id ? 'Saving...' : student.accessStatus === 'REVOKED' ? 'Restore Access' : 'Revoke Access'}
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredStudents.length === 0 && <tr><td colSpan="4" className={styles.empty}>No students found.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {selectedStudent && (
        <ConfirmModal
          title={selectedStudent.accessStatus === 'REVOKED' ? 'Restore student access?' : 'Revoke student access?'}
          message={selectedStudent.accessStatus === 'REVOKED'
            ? 'This student will be able to access the student website again.'
            : 'This student will no longer be able to access the student website.'}
          fields={[
            { label: 'Student', value: selectedStudent.name },
            { label: 'PRN', value: selectedStudent.studentId },
            { label: 'New status', value: selectedStudent.accessStatus === 'REVOKED' ? 'Active' : 'Revoked' },
          ]}
          confirmLabel={selectedStudent.accessStatus === 'REVOKED' ? 'Restore access' : 'Revoke access'}
          onConfirm={handleConfirmToggle}
          onCancel={() => !savingId && setSelectedStudent(null)}
          disabled={savingId === selectedStudent.id}
        />
      )}
    </div>
  );
}
