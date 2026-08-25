import { useEffect, useState, useMemo, useCallback } from 'react';
import type { StudyMaterial } from '../types';
import { getStudyMaterials, createStudyMaterial, updateStudyMaterial, publishStudyMaterial, deleteStudyMaterial } from '../services';
import { useLanguage } from '../contexts/LanguageContext';
import ConfirmModal from '../components/ConfirmModal';
import StudyMaterialFormModal from '../components/StudyMaterialFormModal';
import pageStyles from '../shared/styles/Page.module.css';
import styles from './StudyMaterials.module.css';

function statusClass(status: string) {
  if (status === 'PUBLISHED') return `${styles.badge} ${styles.badgePublished}`;
  return `${styles.badge} ${styles.badgeDraft}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function fileTypeName(mime: string): string {
  if (mime.includes('pdf')) return 'PDF';
  if (mime.includes('wordprocessingml') || mime.includes('msword')) return 'DOC';
  if (mime.includes('presentationml') || mime.includes('powerpoint')) return 'PPT';
  return 'FILE';
}

export default function StudyMaterials() {
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<StudyMaterial | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StudyMaterial | null>(null);
  const { t } = useLanguage();

  const loadMaterials = useCallback(() => {
    setLoading(true);
    setError(null);
    getStudyMaterials()
      .then((m) => { setMaterials(m); setLoading(false); })
      .catch(() => { setError(t('common.loadError')); setLoading(false); });
  }, [t]);

  useEffect(() => {
    loadMaterials();
  }, [loadMaterials]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return materials.filter((m) => m.title.toLowerCase().includes(q) || m.fileName.toLowerCase().includes(q));
  }, [materials, search]);

  function handleUpload() {
    setEditingMaterial(null);
    setShowForm(true);
  }

  function handleEdit(m: StudyMaterial) {
    setEditingMaterial(m);
    setShowForm(true);
  }

  async function handleFormConfirm(data: { title: string; description: string; file: File | null }, action: 'draft' | 'publish') {
    try {
      if (editingMaterial) {
        const updateData: Partial<Pick<StudyMaterial, 'title' | 'description' | 'status'>> = {
          title: data.title,
          description: data.description,
        };
        if (action === 'publish') updateData.status = 'PUBLISHED';
        const updated = await updateStudyMaterial(editingMaterial.id, updateData);
        setMaterials((prev) => prev.map((m) => m.id === updated.id ? updated : m));
      } else if (data.file) {
        const created = await createStudyMaterial({
          title: data.title,
          description: data.description,
          fileName: data.file.name,
          fileType: data.file.type,
          fileSize: data.file.size,
          status: action === 'publish' ? 'PUBLISHED' : 'DRAFT',
        });
        if (action === 'publish') {
          const published = await publishStudyMaterial(created.id);
          setMaterials((prev) => [...prev, published]);
        } else {
          setMaterials((prev) => [...prev, created]);
        }
      }
      setShowForm(false);
      setEditingMaterial(null);
    } catch {
      setError(t('common.actionError'));
    }
  }

  async function handlePublish(m: StudyMaterial) {
    try {
      const published = await publishStudyMaterial(m.id);
      setMaterials((prev) => prev.map((x) => x.id === published.id ? published : x));
    } catch {
      setError(t('common.actionError'));
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteStudyMaterial(deleteTarget.id);
      setMaterials((prev) => prev.filter((m) => m.id !== deleteTarget.id));
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
        <span className={pageStyles.breadcrumbCurrent}>{t('material.title')}</span>
      </div>

      <div className={styles.pageHeader}>
        <div>
          <h1 className={pageStyles.heading}>{t('material.title')}</h1>
          <p className={styles.subtext}>{t('material.subtitle')}</p>
        </div>
        <button className={styles.addBtn} onClick={handleUpload}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          {t('material.upload')}
        </button>
      </div>

      {error && (
        <div className={pageStyles.errorBanner}>
          <span>{error}</span>
          <button className={pageStyles.errorRetryBtn} onClick={loadMaterials}>{t('common.retry')}</button>
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
            placeholder={t('material.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{t('material.titleHeader')}</th>
              <th>{t('material.fileName')}</th>
              <th>{t('material.fileType')}</th>
              <th>{t('material.fileSize')}</th>
              <th>{t('material.status')}</th>
              <th>{t('material.created')}</th>
              <th className={styles.thActions}>{t('material.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={7} className={styles.emptyRow}>{t('material.noMaterials')}</td></tr>
            )}
            {filtered.map((m) => (
              <tr key={m.id}>
                <td className={styles.nameCell}>{m.title}</td>
                <td className={styles.fileCell}>{m.fileName}</td>
                <td><span className={styles.typeBadge}>{fileTypeName(m.fileType)}</span></td>
                <td className={styles.sizeCell}>{formatFileSize(m.fileSize)}</td>
                <td><span className={statusClass(m.status)}>{m.status === 'PUBLISHED' ? t('material.publishedStatus') : t('material.draft')}</span></td>
                <td className={styles.dateCell}>{formatDate(m.createdAt)}</td>
                <td className={styles.actionsCell}>
                  {m.status === 'DRAFT' && (
                    <button className={styles.publishBtn} title={t('material.publish')} onClick={() => handlePublish(m)}>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 8l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                  )}
                  <button className={styles.editBtn} title={t('material.edit')} onClick={() => handleEdit(m)}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M11.5 2.5l2 2M9 4.5l2 2M13 10l-1.5 1.5a1.41 1.41 0 0 1-2 0L7 9a1.41 1.41 0 0 1 0-2l5.5-5.5a1.41 1.41 0 0 1 2 0l1.5 1.5a1.41 1.41 0 0 1 0 2L11 8.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                  <button className={styles.deleteBtn} title={t('material.delete')} onClick={() => setDeleteTarget(m)}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 4.5h10M6 4.5V3a1 1 0 011-1h2a1 1 0 011 1v1.5M12.5 4.5l-.5 8.5a1 1 0 01-1 1h-6a1 1 0 01-1-1l-.5-8.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <StudyMaterialFormModal
          material={editingMaterial}
          onConfirm={handleFormConfirm}
          onCancel={() => { setShowForm(false); setEditingMaterial(null); }}
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          title={t('material.deleteTitle')}
          message={t('material.deleteMsg')}
          fields={[{ label: t('material.titleLabel'), value: deleteTarget.title }]}
          confirmLabel={t('material.confirmDelete')}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
