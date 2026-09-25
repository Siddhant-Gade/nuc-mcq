import { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import ClockTimePicker from './ClockTimePicker';
import styles from './CreateBatchModal.module.css';
export default function CreateBatchModal({ onConfirm, onCancel }) {
    const { t } = useLanguage();
    const [batchId, setBatchId] = useState('');
    const [batchName, setBatchName] = useState('');
    const [instituteId, setInstituteId] = useState('INST001');
    const [capacity, setCapacity] = useState('');
    const [timing, setTiming] = useState('');
    const [errors, setErrors] = useState({});
    function validate() {
        const e = {};
        if (!batchId.trim())
            e.batchId = t('createBatch.errBatchId');
        if (!batchName.trim())
            e.batchName = t('createBatch.errBatchName');
        if (!capacity || Number(capacity) <= 0)
            e.capacity = t('createBatch.errCapacity');
        return e;
    }
    function handleSubmit(ev) {
        ev.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length > 0) {
            setErrors(errs);
            return;
        }
        onConfirm({
            batchId: batchId.trim(),
            batchName: batchName.trim(),
            instituteId: instituteId.trim(),
            capacity: Number(capacity),
            timing: timing.trim() || undefined,
        });
    }
    return (<div className={styles.overlay} onClick={onCancel}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.title}>{t('createBatch.title')}</h2>
          <button className={styles.closeBtn} onClick={onCancel}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M13.5 4.5 4.5 13.5M4.5 4.5l9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        </div>

        <form className={styles.modalBody} onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="batchId">{t('createBatch.batchId')}</label>
            <input id="batchId" className={`${styles.input} ${errors.batchId ? styles.inputError : ''}`} placeholder={t('createBatch.batchIdPlaceholder')} value={batchId} onChange={(e) => { setBatchId(e.target.value); setErrors((p) => { const n = { ...p }; delete n.batchId; return n; }); }}/>
            {errors.batchId && <span className={styles.errorText}>{errors.batchId}</span>}
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="batchName">{t('createBatch.batchName')}</label>
            <input id="batchName" className={`${styles.input} ${errors.batchName ? styles.inputError : ''}`} placeholder={t('createBatch.batchNamePlaceholder')} value={batchName} onChange={(e) => { setBatchName(e.target.value); setErrors((p) => { const n = { ...p }; delete n.batchName; return n; }); }}/>
            {errors.batchName && <span className={styles.errorText}>{errors.batchName}</span>}
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="instituteId">{t('createBatch.instituteId')}</label>
            <input id="instituteId" className={styles.input} value={instituteId} onChange={(e) => setInstituteId(e.target.value)}/>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="capacity">{t('createBatch.capacity')}</label>
            <input id="capacity" type="number" min="1" className={`${styles.input} ${errors.capacity ? styles.inputError : ''}`} placeholder={t('createBatch.capacityPlaceholder')} value={capacity} onChange={(e) => { setCapacity(e.target.value); setErrors((p) => { const n = { ...p }; delete n.capacity; return n; }); }}/>
            {errors.capacity && <span className={styles.errorText}>{errors.capacity}</span>}
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>
              Class Timing <span style={{ fontWeight: 400, color: 'var(--color-on-surface-variant)' }}>(optional)</span>
            </label>
            <ClockTimePicker value={timing} onChange={setTiming} />
          </div>
        </form>

        <div className={styles.modalFooter}>
          <button className={styles.cancelBtn} onClick={onCancel}>{t('statusUpdate.cancel')}</button>
          <button className={styles.confirmBtn} onClick={handleSubmit}>{t('batches.createBatch')}</button>
        </div>
      </div>
    </div>);
}
