import { useState } from 'react';
import styles from './AssignTeacherModal.module.css';
export default function AssignTeacherModal({ batch, teachers, onConfirm, onCancel }) {
    const [selectedId, setSelectedId] = useState(batch.teacherId ?? '');
    return (
        <div className={styles.overlay} onClick={onCancel}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.title}>Assign Teacher to {batch.batchName}</h2>
              <button className={styles.closeBtn} onClick={onCancel}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M13.5 4.5 4.5 13.5M4.5 4.5l9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="teacher-select">Select Teacher</label>
                <select id="teacher-select" className={styles.select} value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
                  <option value="">— Unassign —</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>{t.name} {t.subject ? `(${t.subject})` : ''}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.cancelBtn} onClick={onCancel}>Cancel</button>
              <button className={styles.confirmBtn} onClick={() => onConfirm(selectedId || null)}>Assign</button>
            </div>
          </div>
        </div>
    );
}
