import { useEffect, useState, useMemo, useCallback } from 'react';
import type { Broadcast } from '../types';
import { getBroadcasts, createBroadcast, updateBroadcast, publishBroadcast, deleteBroadcast } from '../services';
import { useLanguage } from '../contexts/LanguageContext';
import ConfirmModal from '../components/ConfirmModal';
import BroadcastFormModal from '../components/BroadcastFormModal';
import pageStyles from '../shared/styles/Page.module.css';
import styles from './Broadcasts.module.css';

function statusClass(status: string) {
  if (status === 'PUBLISHED') return `${styles.badge} ${styles.badgePublished}`;
  return `${styles.badge} ${styles.badgeDraft}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function Broadcasts() {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingBroadcast, setEditingBroadcast] = useState<Broadcast | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Broadcast | null>(null);
  const { t } = useLanguage();

  const loadBroadcasts = useCallback(() => {
    setLoading(true);
    setError(null);
    getBroadcasts()
      .then((b) => { setBroadcasts(b); setLoading(false); })
      .catch(() => { setError(t('common.loadError')); setLoading(false); });
  }, [t]);

  useEffect(() => {
    loadBroadcasts();
  }, [loadBroadcasts]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return broadcasts.filter((b) => b.title.toLowerCase().includes(q) || b.message.toLowerCase().includes(q));
  }, [broadcasts, search]);

  function handleCreate() {
    setEditingBroadcast(null);
    setShowForm(true);
  }

  function handleEdit(b: Broadcast) {
    setEditingBroadcast(b);
    setShowForm(true);
  }

  async function handleFormConfirm(data: { title: string; message: string }, action: 'draft' | 'publish') {
    try {
      if (editingBroadcast) {
        if (action === 'publish') {
          const updated = await updateBroadcast(editingBroadcast.id, { title: data.title, message: data.message, status: 'PUBLISHED' });
          setBroadcasts((prev) => prev.map((b) => b.id === updated.id ? updated : b));
        } else {
          const updated = await updateBroadcast(editingBroadcast.id, { title: data.title, message: data.message });
          setBroadcasts((prev) => prev.map((b) => b.id === updated.id ? updated : b));
        }
      } else {
        if (action === 'publish') {
          const created = await createBroadcast({ title: data.title, message: data.message, status: 'PUBLISHED' });
          const published = await publishBroadcast(created.id);
          setBroadcasts((prev) => [...prev, published]);
        } else {
          const created = await createBroadcast({ title: data.title, message: data.message, status: 'DRAFT' });
          setBroadcasts((prev) => [...prev, created]);
        }
      }
      setShowForm(false);
      setEditingBroadcast(null);
    } catch {
      setError(t('common.actionError'));
    }
  }

  async function handlePublish(b: Broadcast) {
    try {
      const published = await publishBroadcast(b.id);
      setBroadcasts((prev) => prev.map((x) => x.id === published.id ? published : x));
    } catch {
      setError(t('common.actionError'));
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteBroadcast(deleteTarget.id);
      setBroadcasts((prev) => prev.filter((b) => b.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch {
      setError(t('common.actionError'));
      setDeleteTarget(null);
    }
  }

  if (loading) {
    return <div className={pageStyles.subtext}>{t('common.loading')}</div>;
  }

  return (
    <div>
      <div className={pageStyles.breadcrumb}>
        <span className={pageStyles.breadcrumbLink}>Admin</span>
        <span className={pageStyles.breadcrumbSeparator}>/</span>
        <span className={pageStyles.breadcrumbCurrent}>{t('broadcast.title')}</span>
      </div>

      <div className={styles.pageHeader}>
        <div>
          <h1 className={pageStyles.heading}>{t('broadcast.title')}</h1>
          <p className={styles.subtext}>{t('broadcast.subtitle')}</p>
        </div>
        <button className={styles.addBtn} onClick={handleCreate}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          {t('broadcast.create')}
        </button>
      </div>

      {error && (
        <div className={pageStyles.errorBanner}>
          <span>{error}</span>
          <button className={pageStyles.errorRetryBtn} onClick={loadBroadcasts}>{t('common.retry')}</button>
        </div>
      )}

      <div className={styles.filterBar}>
        <div className={styles.searchWrapper}>
          <svg className={styles.searchIcon} width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.25"/>
            <path d="m11 11 3 3" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
          </svg>
          <input
            className={styles.searchInput}
            placeholder={t('broadcast.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{t('broadcast.titleHeader')}</th>
              <th>{t('broadcast.message')}</th>
              <th>{t('broadcast.status')}</th>
              <th>{t('broadcast.created')}</th>
              <th>{t('broadcast.published')}</th>
              <th className={styles.thActions}>{t('broadcast.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={6} className={styles.emptyRow}>{t('broadcast.noBroadcasts')}</td></tr>
            )}
            {filtered.map((b) => (
              <tr key={b.id}>
                <td className={styles.nameCell}>{b.title}</td>
                <td className={styles.messageCell}>{b.message}</td>
                <td><span className={statusClass(b.status)}>{b.status === 'PUBLISHED' ? t('broadcast.publishedStatus') : t('broadcast.draft')}</span></td>
                <td className={styles.dateCell}>{formatDate(b.createdAt)}</td>
                <td className={styles.dateCell}>{formatDate(b.publishedAt)}</td>
                <td className={styles.actionsCell}>
                  {b.status === 'DRAFT' && (
                    <button className={styles.publishBtn} title={t('broadcast.publish')} onClick={() => handlePublish(b)}>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 8l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                  )}
                  <button className={styles.editBtn} title={t('broadcast.edit')} onClick={() => handleEdit(b)}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M11.5 2.5l2 2M9 4.5l2 2M13 10l-1.5 1.5a1.41 1.41 0 0 1-2 0L7 9a1.41 1.41 0 0 1 0-2l5.5-5.5a1.41 1.41 0 0 1 2 0l1.5 1.5a1.41 1.41 0 0 1 0 2L11 8.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                  <button className={styles.deleteBtn} title={t('broadcast.delete')} onClick={() => setDeleteTarget(b)}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 4.5h10M6 4.5V3a1 1 0 011-1h2a1 1 0 011 1v1.5M12.5 4.5l-.5 8.5a1 1 0 01-1 1h-6a1 1 0 01-1-1l-.5-8.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <BroadcastFormModal
          broadcast={editingBroadcast}
          onConfirm={handleFormConfirm}
          onCancel={() => { setShowForm(false); setEditingBroadcast(null); }}
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          title={t('broadcast.deleteTitle')}
          message={t('broadcast.deleteMsg')}
          fields={[{ label: t('broadcast.titleLabel'), value: deleteTarget.title }]}
          confirmLabel={t('broadcast.confirmDelete')}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
