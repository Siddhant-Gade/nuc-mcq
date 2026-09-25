import { useState } from 'react';
import styles from './CreateTeacherModal.module.css';

export default function CreateTeacherModal({ onConfirm, onCancel }) {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [mobile, setMobile] = useState('');
    const [subject, setSubject] = useState('');
    const [errors, setErrors] = useState({});

    function validate() {
        const e = {};
        if (!name.trim()) e.name = 'Name is required';
        if (!email.trim()) e.email = 'Email is required';
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
            name: name.trim(),
            email: email.trim(),
            mobile: mobile.trim() || undefined,
            subject: subject.trim() || undefined,
            instituteId: 'INST001',
        });
    }

    return (
        <div className={styles.overlay} onClick={onCancel}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <h2 className={styles.title}>Add Teacher</h2>
                    <button className={styles.closeBtn} onClick={onCancel}>
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M13.5 4.5 4.5 13.5M4.5 4.5l9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                    </button>
                </div>

                <form className={styles.modalBody} onSubmit={handleSubmit}>
                    <div className={styles.formGroup}>
                        <label className={styles.label} htmlFor="name">Name</label>
                        <input id="name" className={`${styles.input} ${errors.name ? styles.inputError : ''}`} placeholder="e.g. John Doe" value={name} onChange={(e) => { setName(e.target.value); setErrors((p) => { const n = { ...p }; delete n.name; return n; }); }}/>
                        {errors.name && <span className={styles.errorText}>{errors.name}</span>}
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label} htmlFor="email">Email</label>
                        <input id="email" type="email" className={`${styles.input} ${errors.email ? styles.inputError : ''}`} placeholder="e.g. john@example.com" value={email} onChange={(e) => { setEmail(e.target.value); setErrors((p) => { const n = { ...p }; delete n.email; return n; }); }}/>
                        {errors.email && <span className={styles.errorText}>{errors.email}</span>}
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label} htmlFor="mobile">Mobile <span style={{fontWeight:400,color:'var(--text-secondary)'}}>(optional)</span></label>
                        <input id="mobile" className={styles.input} placeholder="e.g. 9876543210" value={mobile} onChange={(e) => setMobile(e.target.value)}/>
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label} htmlFor="subject">Subject <span style={{fontWeight:400,color:'var(--text-secondary)'}}>(optional)</span></label>
                        <input id="subject" className={styles.input} placeholder="e.g. MS-CIT Theory & Practical" value={subject} onChange={(e) => setSubject(e.target.value)}/>
                    </div>
                </form>

                <div className={styles.modalFooter}>
                    <button className={styles.cancelBtn} onClick={onCancel}>Cancel</button>
                    <button className={styles.confirmBtn} onClick={handleSubmit}>Add Teacher</button>
                </div>
            </div>
        </div>
    );
}
