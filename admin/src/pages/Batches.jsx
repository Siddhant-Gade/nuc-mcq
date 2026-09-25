import { useEffect, useState, useMemo } from 'react';
import { getBatches, createBatch, deleteBatch, getTeachers } from '../services';
import { assignTeacherToBatch } from '../services/teacherService';
import { getErrorMessage } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import CreateBatchModal from '../components/CreateBatchModal';
import ConfirmModal from '../components/ConfirmModal';
import AssignTeacherModal from '../components/AssignTeacherModal';
import pageStyles from '../shared/styles/Page.module.css';
import styles from './Batches.module.css';
function statusClass(status) {
    if (status === 'ACTIVE')
        return `${styles.badge} ${styles.badgeActive}`;
    if (status === 'FULL')
        return `${styles.badge} ${styles.badgeFull}`;
    return `${styles.badge} ${styles.badgeInactive}`;
}
export default function Batches() {
    const [batches, setBatches] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [assignTarget, setAssignTarget] = useState(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showCreate, setShowCreate] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [loadError, setLoadError] = useState(null);
    const [actionError, setActionError] = useState(null);
    const { t } = useLanguage();
    useEffect(() => {
        Promise.all([getBatches(), getTeachers()])
            .then(([b, ts]) => { setBatches(b); setTeachers(ts); setLoading(false); })
            .catch((error) => { setLoadError(getErrorMessage(error)); setLoading(false); });
    }, []);
    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        return batches.filter((b) => b.batchName.toLowerCase().includes(q) || b.batchId.toLowerCase().includes(q));
    }, [batches, search]);
    async function handleCreate(data) {
        setActionError(null);
        try {
            const newBatch = await createBatch({
                ...data,
                enrolledCount: 0,
                status: 'ACTIVE',
            });
            setBatches((prev) => [...prev, newBatch]);
            setShowCreate(false);
        }
        catch (error) {
            setActionError(getErrorMessage(error));
        }
    }
    async function handleDelete() {
        if (!deleteTarget)
            return;
        setActionError(null);
        try {
            await deleteBatch(deleteTarget.batchId);
            setBatches((prev) => prev.filter((b) => b.batchId !== deleteTarget.batchId));
            setDeleteTarget(null);
        }
        catch (error) {
            setActionError(getErrorMessage(error));
            setDeleteTarget(null);
        }
    }
    async function handleAssign(teacherId) {
        if (!assignTarget) return;
        setActionError(null);
        try {
            const updated = await assignTeacherToBatch(assignTarget.batchId, teacherId);
            setBatches((prev) => prev.map((b) => b.batchId === assignTarget.batchId ? { ...b, ...updated } : b));
            setAssignTarget(null);
        } catch (error) {
            setActionError(getErrorMessage(error));
            setAssignTarget(null);
        }
    }
    if (loading) {
        return <div className={pageStyles.subtext}>{t('common.loading')}</div>;
    }
    if (loadError) {
        return (<div className={pageStyles.errorBanner}>
        <span>{loadError}</span>
        <button className={pageStyles.errorRetryBtn} onClick={() => window.location.reload()}>Retry</button>
      </div>);
    }
    return (<div>
      <div className={pageStyles.breadcrumb}>
        <span className={pageStyles.breadcrumbLink}>Admin</span>
        <span className={pageStyles.breadcrumbSeparator}>/</span>
        <span className={pageStyles.breadcrumbCurrent}>{t('batches.title')}</span>
      </div>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={pageStyles.heading}>{t('batches.title')}</h1>
          <p className={styles.subtext}>{t('batches.subtitle')}</p>
        </div>
        <button className={styles.addBtn} onClick={() => setShowCreate(true)}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          {t('batches.createBatch')}
        </button>
      </div>

      {actionError && (<div className={pageStyles.errorBanner}>
          <span>{actionError}</span>
          <button className={pageStyles.errorRetryBtn} onClick={() => setActionError(null)}>Dismiss</button>
        </div>)}

      <div className={styles.filterBar}>
        <div className={styles.searchWrapper}>
          <svg className={styles.searchIcon} width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.25"/>
            <path d="m11 11 3 3" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
          </svg>
          <input className={styles.searchInput} placeholder={t('batches.searchPlaceholder')} value={search} onChange={(e) => setSearch(e.target.value)}/>
        </div>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{t('batches.batchName')}</th>
              <th>{t('batches.batchId')}</th>
              <th className={styles.textCenter}>{t('batches.capacity')}</th>
              <th className={styles.textCenter}>{t('batches.enrolled')}</th>
              <th className={styles.textCenter}>{t('batches.remaining')}</th>
              <th>{t('batches.status')}</th>
              <th>Timing</th>
              <th>Teacher</th>
              <th className={styles.thActions}>{t('batches.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (<tr><td colSpan={9} className={styles.emptyRow}>{t('batches.noBatches')}</td></tr>)}
            {filtered.map((b) => {
            const remaining = b.capacity - b.enrolledCount;
            return (<tr key={b.batchId}>
                  <td className={styles.nameCell}>{b.batchName}</td>
                  <td className={styles.idCell}>{b.batchId}</td>
                  <td className={styles.textCenter}>{b.capacity}</td>
                  <td className={styles.textCenter}>{b.enrolledCount}</td>
                  <td className={`${styles.textCenter} ${remaining === 0 ? styles.remainingZero : styles.remainingPositive}`}>
                    {remaining}
                  </td>
                  <td><span className={statusClass(b.status)}>{b.status}</span></td>
                  <td>{b.timing || '—'}</td>
                  <td>{b.teacherName || '—'}</td>
                  <td className={styles.actionsCell}>
                    <button className={styles.deleteBtn} title="Assign Teacher" onClick={() => setAssignTarget(b)} style={{ marginRight: '8px' }}>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" fill="currentColor"/><path d="M4 17a6 6 0 0 1 12 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M16 5h2M17 4v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                    </button>
                    <button className={styles.deleteBtn} title={t('batches.delete')} onClick={() => setDeleteTarget(b)}>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 4.5h10M6 4.5V3a1 1 0 011-1h2a1 1 0 011 1v1.5M12.5 4.5l-.5 8.5a1 1 0 01-1 1h-6a1 1 0 01-1-1l-.5-8.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                  </td>
                </tr>);
        })}
          </tbody>
        </table>
      </div>

      {showCreate && (<CreateBatchModal onConfirm={handleCreate} onCancel={() => setShowCreate(false)}/>)}

      {deleteTarget && (<ConfirmModal title={t('batches.deleteTitle')} message={t('batches.deleteMsg')} fields={[{ label: t('batches.batchName'), value: deleteTarget.batchName }]} confirmLabel={t('batches.confirmDelete')} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)}/>)}
      
      {assignTarget && <AssignTeacherModal batch={assignTarget} teachers={teachers} onConfirm={handleAssign} onCancel={() => setAssignTarget(null)}/>}
    </div>);
}
