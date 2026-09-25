import { useEffect, useState } from 'react';
import { getBatches } from '../services';
import { useLanguage } from '../contexts/LanguageContext';
import styles from './BroadcastFormModal.module.css';
export default function BroadcastFormModal({ broadcast, onConfirm, onCancel }) {
    const { t } = useLanguage();
    const [title, setTitle] = useState(broadcast?.title ?? '');
    const [message, setMessage] = useState(broadcast?.message ?? '');
    const [audienceType, setAudienceType] = useState(broadcast?.audienceType ?? 'ALL');
    const [targetBatchIds, setTargetBatchIds] = useState(broadcast?.targetBatchIds ?? []);
    const [batches, setBatches] = useState([]);
    const [errors, setErrors] = useState({});
    useEffect(() => {
        getBatches().then(setBatches).catch(() => setBatches([]));
    }, []);
    function validate() {
        const e = {};
        if (!title.trim())
            e.title = t('broadcast.errTitle');
        if (!message.trim())
            e.message = t('broadcast.errMessage');
        if (audienceType === 'BATCH' && targetBatchIds.length === 0)
            e.targetBatchIds = 'Select at least one batch.';
        return e;
    }
    function handleAction(action, e) {
        e.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length > 0) {
            setErrors(errs);
            return;
        }
        onConfirm({
            title: title.trim(),
            message: message.trim(),
            audienceType,
            targetBatchIds: audienceType === 'BATCH' ? targetBatchIds : [],
        }, action);
    }
    function clearError(field) {
        setErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
    }
    function toggleBatch(batchId) {
        setTargetBatchIds((prev) => prev.includes(batchId) ? prev.filter((id) => id !== batchId) : [...prev, batchId]);
        clearError('targetBatchIds');
    }
    return (<div className={styles.overlay} onClick={onCancel}>
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
            <input id="btitle" className={`${styles.input} ${errors.title ? styles.inputError : ''}`} placeholder={t('broadcast.titlePlaceholder')} value={title} onChange={(e) => { setTitle(e.target.value); clearError('title'); }}/>
            {errors.title && <span className={styles.errorText}>{errors.title}</span>}
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Audience</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="radio" name="audience" checked={audienceType === 'ALL'} onChange={() => { setAudienceType('ALL'); clearError('targetBatchIds'); }}/>
              All students
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="radio" name="audience" checked={audienceType === 'BATCH'} onChange={() => setAudienceType('BATCH')}/>
              Specific batches
            </label>
          </div>
          {audienceType === 'BATCH' && (<div className={styles.formGroup}>
              <label className={styles.label}>Target batches</label>
              {batches.length === 0 ? (<span className={styles.errorText}>No batches available.</span>) : (<div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {batches.map((batch) => (<label key={batch.batchId} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input type="checkbox" checked={targetBatchIds.includes(batch.batchId)} onChange={() => toggleBatch(batch.batchId)}/>
                      {batch.batchName} ({batch.batchId})
                    </label>))}
                </div>)}
              {errors.targetBatchIds && <span className={styles.errorText}>{errors.targetBatchIds}</span>}
            </div>)}
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="bmessage">{t('broadcast.messageLabel')}</label>
            <textarea id="bmessage" className={`${styles.textarea} ${errors.message ? styles.inputError : ''}`} placeholder={t('broadcast.messagePlaceholder')} rows={5} value={message} onChange={(e) => { setMessage(e.target.value); clearError('message'); }}/>
            {errors.message && <span className={styles.errorText}>{errors.message}</span>}
          </div>
        </form>

        <div className={styles.modalFooter}>
          <button className={styles.cancelBtn} onClick={onCancel}>{t('broadcast.cancel')}</button>
          <button className={styles.draftBtn} onClick={(e) => handleAction('draft', e)}>{t('broadcast.saveDraft')}</button>
          <button className={styles.confirmBtn} onClick={(e) => handleAction('publish', e)}>{t('broadcast.publishBtn')}</button>
        </div>
      </div>
    </div>);
}
