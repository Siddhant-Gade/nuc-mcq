import { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import styles from './StatusUpdateModal.module.css';
const STATUS_OPTIONS = ['PENDING', 'ACTIVE', 'EXPIRED', 'REVOKED'];
function statusBadgeClass(status) {
    if (status === 'ACTIVE')
        return `${styles.badge} ${styles.badgeActive}`;
    if (status === 'PENDING')
        return `${styles.badge} ${styles.badgePending}`;
    if (status === 'EXPIRED')
        return `${styles.badge} ${styles.badgeExpired}`;
    return `${styles.badge} ${styles.badgeRevoked}`;
}
export default function StatusUpdateModal({ studentName, currentStatus, onConfirm, onCancel }) {
    const [selected, setSelected] = useState(currentStatus);
    const isSame = selected === currentStatus;
    const isRevoking = selected === 'REVOKED' && currentStatus !== 'REVOKED';
    const { t } = useLanguage();
    return (<div className={styles.overlay} onClick={onCancel}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.title}>{t('statusUpdate.title')}</h2>
          <button className={styles.closeBtn} onClick={onCancel}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M13.5 4.5 4.5 13.5M4.5 4.5l9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.fieldRow}>
            <span className={styles.fieldLabel}>{t('statusUpdate.student')}</span>
            <span className={styles.fieldValue}>{studentName}</span>
          </div>

          <div className={styles.fieldRow}>
            <span className={styles.fieldLabel}>{t('statusUpdate.currentStatus')}</span>
            <span className={statusBadgeClass(currentStatus)}>{t(`access.${currentStatus.toLowerCase()}`)}</span>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.fieldLabel} htmlFor="status-select">{t('statusUpdate.newStatus')}</label>
            <select id="status-select" className={styles.select} value={selected} onChange={(e) => setSelected(e.target.value)}>
              {STATUS_OPTIONS.map((s) => (<option key={s} value={s}>{t(`access.${s.toLowerCase()}`)}</option>))}
            </select>
          </div>

          {isSame && (<p className={styles.noChange}>{t('statusUpdate.noChange')}</p>)}
          {isRevoking && (<p className={styles.noChange}>This will immediately deactivate the student's access on mobile and web.</p>)}
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.cancelBtn} onClick={onCancel}>{t('statusUpdate.cancel')}</button>
          <button className={styles.confirmBtn} disabled={isSame} onClick={() => {
            if (isRevoking && !window.confirm(`Are you sure you want to revoke ${studentName}'s access? The student will immediately lose access.`)) {
              return;
            }
            onConfirm(selected);
          }}>
            {t('statusUpdate.confirm')}
          </button>
        </div>
      </div>
    </div>);
}
