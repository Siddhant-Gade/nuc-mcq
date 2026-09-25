import { useState } from 'react';
import { signInWithGoogle } from '../services/authService';
import { useLanguage } from '../contexts/LanguageContext';
import styles from './Login.module.css';

export default function LoginPage() {
    const { t } = useLanguage();
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleGoogleLogin() {
        if (loading) return;
        setError('');
        setLoading(true);
        try {
            await signInWithGoogle();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Google sign-in failed. Please try again.');
            setLoading(false);
        }
    }

    return (
      <div className={styles.page}>
        {/* Ambient floating aura lighting */}
        <div className={styles.ambientBackground} aria-hidden="true">
          <div className={styles.glowOrb1} />
          <div className={styles.glowOrb2} />
        </div>

        <main className={styles.card}>
          <header className={styles.header}>
            <div className={styles.logoMark}>
              <img
                src="/logo.png"
                alt="New Unique Computers"
                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }}
              />
            </div>
            <h1 className={styles.title}>{t('login.title') || 'Admin Portal'}</h1>
            <p className={styles.subtitle}>Sign in with your authorized institute Gmail account</p>
          </header>

          {error && (
            <div className={styles.errorBanner} role="alert">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <circle cx="9" cy="9" r="7.5" stroke="currentColor" strokeWidth="1.25"/>
                <path d="M9 6v3.5M9 11.5v.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
              </svg>
              <p>{error}</p>
            </div>
          )}

          <div className={styles.actionContainer}>
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className={`${styles.googleBtn} ${loading ? styles.btnLoading : ''}`}
            >
              {loading ? (
                <>
                  <svg className={styles.spinner} width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeDasharray="32" strokeLinecap="round" opacity="0.25"/>
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                  </svg>
                  <span>Connecting to Google...</span>
                </>
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                    <path fill="#FBBC05" d="M10.53 28.59A14.5 14.5 0 019.5 24c0-1.59.28-3.14.76-4.59l-7.98-6.19A23.97 23.97 0 000 24c0 3.77.9 7.35 2.56 10.56l7.97-5.97z"/>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 5.97C6.51 42.62 14.62 48 24 48z"/>
                  </svg>
                  <span>Continue with Google</span>
                </>
              )}
            </button>

            <p className={styles.securityNote}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 1L2 3.5v3.5c0 3.5 2.5 5.5 5 6.5 2.5-1 5-3 5-6.5V3.5L7 1z" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>Protected portal &bull; Authorized institute accounts only</span>
            </p>
          </div>
        </main>
      </div>
    );
}
