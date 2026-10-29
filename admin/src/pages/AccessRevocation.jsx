import { useEffect, useMemo, useState } from 'react';
import { getStudents, updateStudentAccessStatus } from '../services';
import { getErrorMessage } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import pageStyles from '../shared/styles/Page.module.css';
import styles from './AccessRevocation.module.css';

export default function AccessRevocation() {
  const { t } = useLanguage();
  const [students, setStudents] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [savingId, setSavingId] = useState(null);

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
      || student.studentId.toLowerCase().includes(normalizedQuery));
  }, [query, students]);

  async function handleToggle(student) {
    const nextStatus = student.accessStatus === 'REVOKED' ? 'ACTIVE' : 'REVOKED';
    const message = nextStatus === 'REVOKED'
      ? `Revoke access for ${student.name}?`
      : `Restore access for ${student.name}?`;
    if (!window.confirm(message)) return;
    setSavingId(student.id);
    setError(null);
    try {
      await updateStudentAccessStatus(student.id, nextStatus);
      setStudents((current) => current.map((item) => item.id === student.id
        ? { ...item, accessStatus: nextStatus }
        : item));
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
                      <button className={`${styles.action} ${student.accessStatus === 'REVOKED' ? styles.restore : ''}`} disabled={savingId === student.id} onClick={() => handleToggle(student)}>
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
    </div>
  );
}
