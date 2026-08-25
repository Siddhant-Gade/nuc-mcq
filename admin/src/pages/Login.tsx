import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import styles from './Login.module.css';

export default function LoginPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password.length < 5 || email === 'fail@test.com') {
      setError(t('login.invalidCredentials'));
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      navigate('/');
    }, 1500);
  }

  return (
    <div className={styles.page}>
      <main className={styles.card}>
        <header className={styles.header}>
          <div className={styles.logoMark}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M6 9h2M10 9h2M14 9h2M18 9h0M6 13h2M10 13h2M14 13h2M18 13h0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </div>
          <h1 className={styles.title}>{t('login.title')}</h1>
          <p className={styles.subtitle}>{t('login.subtitle')}</p>
        </header>

        {error && (
          <div className={styles.errorBanner}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="7.5" stroke="currentColor" strokeWidth="1.25"/><path d="M9 6v3.5M9 11.5v.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/></svg>
            <p>{error}</p>
          </div>
        )}

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="admin-email">{t('login.email')}</label>
            <div className={styles.inputWrap}>
              <svg className={styles.inputIcon} width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2" y="3.5" width="14" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.25"/><path d="M2 5.5l7 4.5 7-4.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/></svg>
              <input
                id="admin-email"
                className={styles.input}
                type="text"
                placeholder="admin@newuniquecomputers.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                required
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="admin-password">{t('login.password')}</label>
            <div className={styles.inputWrap}>
              <svg className={styles.inputIcon} width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="4" y="8" width="10" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.25"/><path d="M6 8V5a3 3 0 016 0v3" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/></svg>
              <input
                id="admin-password"
                className={styles.input}
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                required
              />
              <button type="button" className={styles.togglePw} onClick={() => setShowPassword((p) => !p)}>
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M2 9s3.5-6 7-6 7 6 7 6-3.5 6-7 6-7-6-7-6z" stroke="currentColor" strokeWidth="1.25"/><circle cx="9" cy="9" r="2" stroke="currentColor" strokeWidth="1.25"/><path d="M3 15l12-12" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/></svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M2 9s3.5-6 7-6 7 6 7 6-3.5 6-7 6-7-6-7-6z" stroke="currentColor" strokeWidth="1.25"/><circle cx="9" cy="9" r="2" stroke="currentColor" strokeWidth="1.25"/></svg>
                )}
              </button>
            </div>
          </div>

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? (
              <>
                <svg className={styles.spinner} width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.5" strokeDasharray="30 14"/></svg>
                {t('login.signingIn')}
              </>
            ) : (
              <>
                {t('login.signIn')}
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M7 4l4 4.5L7 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </>
            )}
          </button>

          <p className={styles.securityNote}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1L2 3.5v3.5c0 3.5 2.5 5.5 5 6.5 2.5-1 5-3 5-6.5V3.5L7 1z" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/></svg>
            {t('login.secureNote')}
          </p>
        </form>
      </main>
    </div>
  );
}
