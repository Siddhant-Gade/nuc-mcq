import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { StudentWithAccess, Batch } from '../types';
import { getStudents, getBatches } from '../services';
import { useLanguage } from '../contexts/LanguageContext';
import styles from './StudentList.module.css';

const PAGE_SIZE = 4;

function statusClass(status: string) {
  if (status === 'ACTIVE') return `${styles.badge} ${styles.badgeActive}`;
  if (status === 'PENDING') return `${styles.badge} ${styles.badgePending}`;
  if (status === 'EXPIRED') return `${styles.badge} ${styles.badgeExpired}`;
  return `${styles.badge} ${styles.badgeRevoked}`;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getInitial(name: string) {
  return name.charAt(0).toUpperCase();
}

const COLORS = ['#1e3a8a', '#505f76', '#7c3aed', '#047857', '#b45309'];

function avatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length];
}

export default function StudentList() {
  const [students, setStudents] = useState<StudentWithAccess[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [search, setSearch] = useState('');
  const [batchFilter, setBatchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const navigate = useNavigate();
  const { t } = useLanguage();

  useEffect(() => {
    getStudents().then(setStudents);
    getBatches().then(setBatches);
  }, []);

  const batchMap = useMemo(() => {
    const m = new Map<string, string>();
    batches.forEach((b) => m.set(b.batchId, b.batchName));
    return m;
  }, [batches]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return students.filter((s) => {
      const matchSearch = s.name.toLowerCase().includes(q) || s.studentId.toLowerCase().includes(q);
      const matchBatch = !batchFilter || s.batchId === batchFilter;
      const matchStatus = !statusFilter || s.accessStatus === statusFilter;
      return matchSearch && matchBatch && matchStatus;
    });
  }, [students, search, batchFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.heading}>{t('students.title')}</h1>
          <p className={styles.subtext}>{t('students.subtitle')}</p>
        </div>
        <button className={styles.addBtn} onClick={() => navigate('/students/admit')}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          {t('students.addStudent')}
        </button>
      </div>

      <div className={styles.filterBar}>
        <div className={styles.searchWrapper}>
          <svg className={styles.searchIcon} width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.25"/>
            <path d="m11 11 3 3" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
          </svg>
          <input
            className={styles.searchInput}
            placeholder={t('students.searchPlaceholder')}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <div className={styles.selectWrapper}>
          <select
            className={styles.select}
            value={batchFilter}
            onChange={(e) => { setBatchFilter(e.target.value); setPage(1); }}
          >
            <option value="">{t('students.allBatches')}</option>
            {batches.map((b) => (
              <option key={b.batchId} value={b.batchId}>{b.batchName}</option>
            ))}
          </select>
          <svg className={styles.selectChevron} width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        <div className={styles.selectWrapper}>
          <select
            className={styles.select}
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          >
            <option value="">{t('students.allStatuses')}</option>
            <option value="ACTIVE">Active</option>
            <option value="PENDING">Pending</option>
            <option value="EXPIRED">Expired</option>
            <option value="REVOKED">Revoked</option>
          </select>
          <svg className={styles.selectChevron} width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.thAvatar}></th>
              <th>{t('students.name')}</th>
              <th>{t('students.prn')}</th>
              <th>{t('students.batch')}</th>
              <th>{t('dashboard.status')}</th>
              <th>{t('students.admissionDate')}</th>
              <th className={styles.thActions}>{t('students.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 && (
              <tr><td colSpan={7} className={styles.emptyRow}>{t('students.noStudents')}</td></tr>
            )}
            {paged.map((s) => (
              <tr key={s.id}>
                <td>
                  {s.photoPath ? (
                    <img src={s.photoPath} alt={s.name} className={styles.avatarImg} />
                  ) : (
                    <div className={styles.avatarInitial} style={{ background: avatarColor(s.name) }}>
                      {getInitial(s.name)}
                    </div>
                  )}
                </td>
                <td className={styles.nameCell}>{s.name}</td>
                <td className={styles.idCell}>{s.studentId}</td>
                <td>{batchMap.get(s.batchId) ?? s.batchId}</td>
                <td><span className={statusClass(s.accessStatus)}>{s.accessStatus}</span></td>
                <td>{formatDate(s.createdAt)}</td>
                <td className={styles.actionsCell}>
                  <button className={styles.iconBtn} title="Edit">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M11.5 3.5l5 5L6 19H1v-5L11.5 3.5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                  <button className={styles.iconBtn} title="View Details" onClick={() => navigate(`/students/${s.id}`)}>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M1 10s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z" stroke="currentColor" strokeWidth="1.5"/><circle cx="10" cy="10" r="3" stroke="currentColor" strokeWidth="1.5"/></svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={styles.pagination}>
        <span className={styles.paginationInfo}>
          Showing {filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1} to{' '}
          {Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length} entries
        </span>
        <div className={styles.paginationButtons}>
          <button
            className={styles.pageBtn}
            disabled={currentPage <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 4l-4 4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              className={`${styles.pageBtn} ${n === currentPage ? styles.pageBtnActive : ''}`}
              onClick={() => setPage(n)}
            >
              {n}
            </button>
          ))}
          {totalPages > 3 && currentPage < totalPages - 1 && (
            <span className={styles.pageEllipsis}>...</span>
          )}
          <button
            className={styles.pageBtn}
            disabled={currentPage >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>
      </div>
    </div>
  );
}
