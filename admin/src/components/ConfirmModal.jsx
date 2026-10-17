import { useLanguage } from '../contexts/LanguageContext';
import styles from './ConfirmModal.module.css';
export default function ConfirmModal({ title, message, fields, confirmLabel, onConfirm, onCancel, disabled = false }) {
    const { t } = useLanguage();
    const resolvedConfirmLabel = confirmLabel ?? t('common.confirm');
    return (<div className={styles.overlay} onClick={() => !disabled && onCancel()}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.title}>{title}</h2>
          <button className={styles.closeBtn} onClick={onCancel} disabled={disabled}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M13.5 4.5 4.5 13.5M4.5 4.5l9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.iconCircle}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 12c2.5 0 4.5-2 4.5-4.5S14.5 3 12 3 7.5 5 7.5 7.5 9.5 12 12 12zm0 2c-3 0-9 1.5-9 4.5V21h18v-2.5c0-3-6-4.5-9-4.5z" fill="currentColor"/></svg>
          </div>
          <p className={styles.message}>{message}</p>
          <div className={styles.summaryBox}>
            {fields.map((f) => (<div key={f.label} className={styles.summaryRow}>
                <span className={styles.summaryLabel}>{f.label}</span>
                <span className={styles.summaryValue}>{f.value}</span>
              </div>))}
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.cancelBtn} onClick={onCancel} disabled={disabled}>{t('common.cancel')}</button>
          <button className={styles.confirmBtn} onClick={onConfirm} disabled={disabled}>{resolvedConfirmLabel}</button>
        </div>
      </div>
    </div>);
}
