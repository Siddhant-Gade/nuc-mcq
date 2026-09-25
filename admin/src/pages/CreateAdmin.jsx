import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createAdmin } from '../services';
import { useLanguage } from '../contexts/LanguageContext';
import ConfirmModal from '../components/ConfirmModal';
import pageStyles from '../shared/styles/Page.module.css';
import styles from './CreateAdmin.module.css';

export default function CreateAdmin() {
    const navigate = useNavigate();
    const { t } = useLanguage();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [errors, setErrors] = useState({});
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    function validate() {
        const e = {};
        if (!name.trim()) e.name = 'Full name is required.';
        if (!email.trim()) e.email = 'Gmail address is required.';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Enter a valid email address.';
        else if (!email.trim().endsWith('@gmail.com') && !email.trim().includes('@')) {
            e.email = 'Use a valid Gmail or Google Workspace email.';
        }
        return e;
    }

    function handleCreateClick() {
        const errs = validate();
        if (Object.keys(errs).length > 0) { setErrors(errs); return; }
        setShowConfirm(true);
    }

    async function handleConfirm() {
        setLoading(true);
        try {
            await createAdmin({ name: name.trim(), email: email.trim() });
            setShowConfirm(false);
            setSuccess(true);
        } finally {
            setLoading(false);
        }
    }

    if (success) {
        return (
          <div>
            <div className={pageStyles.pageHeader}>
              <h1 className={pageStyles.heading}>{t('createAdmin.title')}</h1>
            </div>
            <div className={styles.formCard} style={{ textAlign: 'center', padding: '2.5rem 2rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>Admin Added</h2>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
                <strong>{email}</strong> has been granted admin access.<br/>
                They can now sign in using <strong>Continue with Google</strong> on the login page.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                <button className={styles.cancelBtn} onClick={() => { setSuccess(false); setName(''); setEmail(''); }}>
                  Add Another
                </button>
                <button className={styles.submitBtn} onClick={() => navigate('/students')}>
                  Done
                </button>
              </div>
            </div>
          </div>
        );
    }

    return (
      <div>
        <div className={pageStyles.pageHeader}>
          <div>
            <h1 className={pageStyles.heading}>{t('createAdmin.title')}</h1>
            <p className={styles.subtext}>Enter the name and Gmail of the person you want to give admin access to.</p>
          </div>
        </div>

        <div className={styles.formCard}>
          <form className={styles.form} onSubmit={(e) => { e.preventDefault(); handleCreateClick(); }}>
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="6" r="3" stroke="currentColor" strokeWidth="1.25"/><path d="M3 16c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/></svg>
                Admin Details
              </h3>
              <div className={styles.fieldGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="fullName">Full Name</label>
                  <input
                    id="fullName"
                    className={`${styles.input} ${errors.name ? styles.inputError : ''}`}
                    placeholder="e.g. Rajesh Sharma"
                    value={name}
                    onChange={(e) => { setName(e.target.value); setErrors((p) => { const n = { ...p }; delete n.name; return n; }); }}
                  />
                  {errors.name && <span className={styles.errorText}>{errors.name}</span>}
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="email">Gmail Address</label>
                  <input
                    id="email"
                    type="email"
                    className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
                    placeholder="e.g. rajesh@gmail.com"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setErrors((p) => { const n = { ...p }; delete n.email; return n; }); }}
                  />
                  {errors.email && <span className={styles.errorText}>{errors.email}</span>}
                </div>
              </div>
            </div>

            <div className={styles.notice}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="7.5" stroke="currentColor" strokeWidth="1.25"/><path d="M9 8v4M9 6v.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/></svg>
              <p>
                No password needed. The new admin will log in using <strong>Continue with Google</strong> with this Gmail account.
                Make sure the email is correct before proceeding.
              </p>
            </div>

            <div className={styles.actions}>
              <button type="button" className={styles.cancelBtn} onClick={() => navigate(-1)}>Cancel</button>
              <button type="submit" className={styles.submitBtn} disabled={loading}>
                {loading ? 'Adding...' : 'Grant Admin Access'}
              </button>
            </div>
          </form>
        </div>

        {showConfirm && (
          <ConfirmModal
            title="Grant Admin Access?"
            message="This person will have full access to the admin panel."
            fields={[
              { label: 'Name', value: name },
              { label: 'Gmail', value: email },
            ]}
            confirmLabel="Yes, Grant Access"
            onConfirm={handleConfirm}
            onCancel={() => setShowConfirm(false)}
          />
        )}
      </div>
    );
}
