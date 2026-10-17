import { useEffect, useState, useMemo } from 'react';
import { getBatches, createBatch, deleteBatch } from '../services';
import { getErrorMessage } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import CreateBatchModal from '../components/CreateBatchModal';
import ConfirmModal from '../components/ConfirmModal';
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
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showCreate, setShowCreate] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [loadError, setLoadError] = useState(null);
    const [actionError, setActionError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);
    const { t } = useLanguage();
    useEffect(() => {
        getBatches()
            .then((b) => { setBatches(b); setLoading(false); })
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
        if (!deleteTarget || isDeleting)
            return;
        setActionError(null);
        setSuccessMessage(null);
        setIsDeleting(true);
        try {
            await deleteBatch(deleteTarget.batchId);
            const count = deleteTarget.enrolledCount || 0;
            setBatches((prev) => prev.filter((b) => b.batchId !== deleteTarget.batchId));
            setSuccessMessage(
                count > 0
                    ? `Batch "${deleteTarget.batchName}" deleted successfully. ${count} student(s) have been reassigned to Unassigned.`
                    : `Batch "${deleteTarget.batchName}" deleted successfully.`
            );
            setDeleteTarget(null);
        }
        catch (error) {
            setActionError(getErrorMessage(error));
            setDeleteTarget(null);
        }
        finally {
            setIsDeleting(false);
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

      {successMessage && (
        <div className={styles.successBanner}>
          <div className={styles.successContent}>
            <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>{successMessage}</span>
          </div>
          <button className={pageStyles.errorRetryBtn} onClick={() => setSuccessMessage(null)}>Dismiss</button>
        </div>
      )}

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
              <th className={styles.thActions}>{t('batches.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (<tr><td colSpan={8} className={styles.emptyRow}>{t('batches.noBatches')}</td></tr>)}
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
                  <td className={styles.actionsCell}>
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

      {deleteTarget && (
        <ConfirmModal
          title={t('batches.deleteTitle')}
          message={
            deleteTarget.enrolledCount > 0
              ? `Are you sure you want to delete this batch? All ${deleteTarget.enrolledCount} student(s) currently assigned to this batch will become Unassigned. Existing student accounts, attempts, and historical exam records will remain intact.`
              : t('batches.deleteMsg')
          }
          fields={[
            { label: t('batches.batchName'), value: deleteTarget.batchName },
            { label: t('batches.batchId'), value: deleteTarget.batchId },
            {
              label: t('batches.enrolled'),
              value:
                deleteTarget.enrolledCount > 0
                  ? `${deleteTarget.enrolledCount} student(s) (will become Unassigned)`
                  : '0 students',
            },
          ]}
          confirmLabel={isDeleting ? 'Deleting...' : t('batches.confirmDelete')}
          disabled={isDeleting}
          onConfirm={handleDelete}
          onCancel={() => !isDeleting && setDeleteTarget(null)}
        />
      )}
    </div>);
}
