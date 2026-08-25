import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createAdmin } from '../services';
import { useLanguage } from '../contexts/LanguageContext';
import ConfirmModal from '../components/ConfirmModal';
import pageStyles from '../shared/styles/Page.module.css';
import styles from './CreateAdmin.module.css';

interface FormErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

function getPasswordStrength(pw: string) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw) || /[^a-zA-Z0-9]/.test(pw)) score++;
  if (pw.length >= 12) score++;
  return score;
}

function strengthColor(score: number) {
  if (score <= 1) return '#ef4444';
  if (score === 2) return '#f59e0b';
  if (score === 3) return '#3b82f6';
  return '#10b981';
}

export default function CreateAdmin() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [showConfirm, setShowConfirm] = useState(false);

  const strength = getPasswordStrength(password);

  const strengthKey = strength <= 1 ? 'createAdmin.weak' : strength === 2 ? 'createAdmin.fair' : strength === 3 ? 'createAdmin.good' : 'createAdmin.strong';

  function validate(): FormErrors {
    const e: FormErrors = {};
    if (!name.trim()) e.name = t('createAdmin.errNameRequired');
    if (!email.trim()) e.email = t('createAdmin.errEmailRequired');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = t('createAdmin.errEmailInvalid');
    if (!password) e.password = t('createAdmin.errPasswordRequired');
    else if (password.length < 8) e.password = t('createAdmin.errPasswordLength');
    if (password !== confirmPassword) e.confirmPassword = t('createAdmin.errPasswordMatch');
    return e;
  }

  function handleCreateClick() {
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setShowConfirm(true);
  }

  async function handleConfirm() {
    await createAdmin({ name: name.trim(), email: email.trim(), password });
    setShowConfirm(false);
    navigate('/students');
  }

  return (
    <div>
      <div className={pageStyles.pageHeader}>
        <div>
          <h1 className={pageStyles.heading}>{t('createAdmin.title')}</h1>
          <p className={styles.subtext}>{t('createAdmin.subtitle')}</p>
        </div>
      </div>

      <div className={styles.formCard}>
        <form className={styles.form} onSubmit={(e) => { e.preventDefault(); handleCreateClick(); }}>
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="6" r="3" stroke="currentColor" strokeWidth="1.25"/><path d="M3 16c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/></svg>
              {t('createAdmin.adminInfo')}
            </h3>
            <div className={styles.fieldGrid}>
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="fullName">{t('createAdmin.fullName')}</label>
                <input id="fullName" className={`${styles.input} ${errors.name ? styles.inputError : ''}`} placeholder={t('createAdmin.fullNamePlaceholder')} value={name} onChange={(e) => { setName(e.target.value); setErrors((p) => { const n = { ...p }; delete n.name; return n; }); }} />
                {errors.name && <span className={styles.errorText}>{errors.name}</span>}
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="email">{t('createAdmin.emailAddress')}</label>
                <input id="email" type="email" className={`${styles.input} ${errors.email ? styles.inputError : ''}`} placeholder={t('createAdmin.emailPlaceholder')} value={email} onChange={(e) => { setEmail(e.target.value); setErrors((p) => { const n = { ...p }; delete n.email; return n; }); }} />
                {errors.email && <span className={styles.errorText}>{errors.email}</span>}
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="4" y="8" width="10" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.25"/><path d="M6 8V5a3 3 0 016 0v3" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/></svg>
              {t('createAdmin.accountSecurity')}
            </h3>
            <div className={styles.fieldGrid}>
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="password">{t('createAdmin.password')}</label>
                <div className={styles.passwordWrap}>
                  <input id="password" type={showPassword ? 'text' : 'password'} className={`${styles.input} ${errors.password ? styles.inputError : ''}`} placeholder="••••••••" value={password} onChange={(e) => { setPassword(e.target.value); setErrors((p) => { const n = { ...p }; delete n.password; return n; }); }} />
                  <button type="button" className={styles.togglePw} onClick={() => setShowPassword((p) => !p)}>
                    {showPassword ? (
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M2 9s3.5-6 7-6 7 6 7 6-3.5 6-7 6-7-6-7-6z" stroke="currentColor" strokeWidth="1.25"/><circle cx="9" cy="9" r="2" stroke="currentColor" strokeWidth="1.25"/></svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M2 9s3.5-6 7-6 7 6 7 6-3.5 6-7 6-7-6-7-6z" stroke="currentColor" strokeWidth="1.25"/><circle cx="9" cy="9" r="2" stroke="currentColor" strokeWidth="1.25"/><path d="M3 15l12-12" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/></svg>
                    )}
                  </button>
                </div>
                {errors.password && <span className={styles.errorText}>{errors.password}</span>}
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="confirmPassword">{t('createAdmin.confirmPassword')}</label>
                <input id="confirmPassword" type="password" className={`${styles.input} ${errors.confirmPassword ? styles.inputError : ''}`} placeholder="••••••••" value={confirmPassword} onChange={(e) => { setConfirmPassword(e.target.value); setErrors((p) => { const n = { ...p }; delete n.confirmPassword; return n; }); }} />
                {errors.confirmPassword && <span className={styles.errorText}>{errors.confirmPassword}</span>}
              </div>
            </div>

            {password && (
              <div className={styles.strengthBox}>
                <div className={styles.strengthRow}>
                  <span className={styles.strengthLabel}>{t('createAdmin.strength')}</span>
                  <div className={styles.strengthBar}>
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className={styles.strengthSegment} style={{ background: i <= strength ? strengthColor(strength) : '#e2e8f0' }} />
                    ))}
                  </div>
                  <span className={styles.strengthText} style={{ color: strengthColor(strength) }}>{t(strengthKey)}</span>
                </div>
                <ul className={styles.requirements}>
                  <li className={password.length >= 8 ? styles.reqMet : ''}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">{password.length >= 8 ? <path d="M3 7.5l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/> : <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1"/>}</svg>
                    {t('createAdmin.atLeast8')}
                  </li>
                  <li className={/[a-z]/.test(password) && /[A-Z]/.test(password) ? styles.reqMet : ''}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">{/[a-z]/.test(password) && /[A-Z]/.test(password) ? <path d="M3 7.5l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/> : <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1"/>}</svg>
                    {t('createAdmin.mixCase')}
                  </li>
                  <li className={/[0-9]/.test(password) || /[^a-zA-Z0-9]/.test(password) ? styles.reqMet : ''}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">{/[0-9]/.test(password) || /[^a-zA-Z0-9]/.test(password) ? <path d="M3 7.5l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/> : <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1"/>}</svg>
                    {t('createAdmin.numberOrSymbol')}
                  </li>
                </ul>
              </div>
            )}
          </div>

          <div className={styles.notice}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="7.5" stroke="currentColor" strokeWidth="1.25"/><path d="M9 8v4M9 6v.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/></svg>
            <p>{t('createAdmin.noticeText')}</p>
          </div>

          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={() => navigate(-1)}>{t('admission.cancel')}</button>
            <button type="submit" className={styles.submitBtn}>{t('createAdmin.createBtn')}</button>
          </div>
        </form>
      </div>

      {showConfirm && (
        <ConfirmModal
          title={t('createAdmin.confirmTitle')}
          message={t('createAdmin.confirmMsg')}
          fields={[
            { label: 'Name', value: name },
            { label: 'Email', value: email },
          ]}
          confirmLabel={t('createAdmin.createBtn')}
          onConfirm={handleConfirm}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </div>
  );
}
