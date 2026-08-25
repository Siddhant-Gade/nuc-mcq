import { useState } from 'react';
import type { Broadcast } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import styles from './BroadcastFormModal.module.css';

interface BroadcastFormModalProps {
  broadcast: Broadcast | null;
  onConfirm: (data: { title: string; message: string }, action: 'draft' | 'publish') => void;
  onCancel: () => void;
}

export default function BroadcastFormModal({ broadcast, onConfirm, onCancel }: BroadcastFormModalProps) {
  const { t } = useLanguage();
  const [title, setTitle] = useState(broadcast?.title ?? '');
  const [message, setMessage] = useState(broadcast?.message ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): Record<string, string> {
    const e: Record<string, string> = {};
    if (!title.trim()) e.title = t('broadcast.errTitle');
    if (!message.trim()) e.message = t('broadcast.errMessage');
    return e;
  }

  function handleAction(action: 'draft' | 'publish', e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    onConfirm({ title: title.trim(), message: message.trim() }, action);
  }

  function clearError(field: string) {
    setErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
  }

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.title}>{broadcast ? t('broadcast.editTitle') : t('broadcast.formTitle')}</h2>
          <button className={styles.closeBtn} onClick={onCancel}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M13.5 4.5 4.5 13.5M4.5 4.5l9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        </div>

        <form className={styles.modalBody}>
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="btitle">{t('broadcast.titleLabel')}</label>
            <input
              id="btitle"
              className={`${styles.input} ${errors.title ? styles.inputError : ''}`}
              placeholder={t('broadcast.titlePlaceholder')}
              value={title}
              onChange={(e) => { setTitle(e.target.value); clearError('title'); }}
            />
            {errors.title && <span className={styles.errorText}>{errors.title}</span>}
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="bmessage">{t('broadcast.messageLabel')}</label>
            <textarea
              id="bmessage"
              className={`${styles.textarea} ${errors.message ? styles.inputError : ''}`}
              placeholder={t('broadcast.messagePlaceholder')}
              rows={5}
              value={message}
              onChange={(e) => { setMessage(e.target.value); clearError('message'); }}
            />
            {errors.message && <span className={styles.errorText}>{errors.message}</span>}
          </div>
        </form>

        <div className={styles.modalFooter}>
          <button className={styles.cancelBtn} onClick={onCancel}>{t('broadcast.cancel')}</button>
          <button className={styles.draftBtn} onClick={(e) => handleAction('draft', e)}>{t('broadcast.saveDraft')}</button>
          <button className={styles.confirmBtn} onClick={(e) => handleAction('publish', e)}>{t('broadcast.publishBtn')}</button>
        </div>
      </div>
    </div>
  );
}
