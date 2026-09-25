import { useState, useEffect, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { signInWithGoogle } from '../services/authService';
import { useLanguage } from '../contexts/LanguageContext';
import config from '../config';
import styles from './Login.module.css';

export default function LoginPage() {
    const { status, authError, clearAuthError, signIn } = useAuth();
    const { t } = useLanguage();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [turnstileToken, setTurnstileToken] = useState(null);
    const turnstileContainerRef = useRef(null);
    const turnstileWidgetId = useRef(null);

    // If already authenticated, redirect directly to dashboard
    if (status === 'authenticated') {
        return <Navigate to="/" replace />;
    }

    // Sync auth error from context (e.g. from Google OAuth reject)
    useEffect(() => {
        if (authError) {
            setError(authError);
        }
    }, [authError]);

    // Initialize Cloudflare Turnstile widget
    useEffect(() => {
        const renderTurnstile = () => {
            if (window.turnstile && turnstileContainerRef.current && turnstileWidgetId.current === null) {
                try {
                    turnstileWidgetId.current = window.turnstile.render(turnstileContainerRef.current, {
                        sitekey: config.turnstileSiteKey,
                        theme: 'auto',
                        size: 'normal',
                        callback: (token) => {
                            setTurnstileToken(token);
                        },
                        'expired-callback': () => {
                            setTurnstileToken(null);
                        },
                        'error-callback': () => {
                            // Turnstile had an error; allow fallback or let user retry
                            console.warn('[Turnstile] Widget error or blocked domain.');
                        },
                    });
                } catch (e) {
                    console.error('[Turnstile] Render failed', e);
                }
            }
        };

        const timer = setInterval(() => {
            if (window.turnstile) {
                renderTurnstile();
                clearInterval(timer);
            }
        }, 100);

        return () => {
            clearInterval(timer);
            if (window.turnstile && turnstileWidgetId.current !== null) {
                try {
                    window.turnstile.remove(turnstileWidgetId.current);
                } catch (_) {}
                turnstileWidgetId.current = null;
            }
        };
    }, []);

    // Email/Password login
    async function handleEmailPasswordLogin(e) {
        e.preventDefault();
        if (loading) return;

        if (!email.trim() || !password) {
            setError('Please enter both email and password.');
            return;
        }

        setError('');
        clearAuthError?.();
        setLoading(true);

        try {
            await signIn(email.trim(), password);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Invalid login credentials.');
            // Reset turnstile if needed
            if (window.turnstile && turnstileWidgetId.current !== null) {
                try { window.turnstile.reset(turnstileWidgetId.current); } catch (_) {}
                setTurnstileToken(null);
            }
        } finally {
            setLoading(false);
        }
    }

    // Google Single Sign-on
    async function handleGoogleLogin() {
        if (loading) return;
        setError('');
        clearAuthError?.();
        setLoading(true);
        try {
            await signInWithGoogle();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Google sign-in failed. Please try again.');
            setLoading(false);
        }
    }

    // If still verifying initial session on boot, render an elegant loading state
    if (status === 'checking') {
        return (
          <div className={styles.page}>
            <div className={styles.loadingSpinnerWrap}>
              <svg className={styles.spinner} width="36" height="36" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="var(--color-outline-variant)" strokeWidth="2.5" strokeDasharray="32" strokeLinecap="round" />
                <path d="M12 2a10 10 0 0 1 10 10" stroke="var(--color-primary, #00A8E1)" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>
          </div>
        );
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
            <p className={styles.subtitle}>Secure sign-in for institute administrators</p>
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

          {/* Email / Password Form */}
          <form className={styles.form} onSubmit={handleEmailPasswordLogin}>
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="admin-email">Admin Email</label>
              <div className={styles.inputWrap}>
                <svg className={styles.fieldIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
                <input
                  id="admin-email"
                  type="email"
                  required
                  placeholder="admin@mscit.edu"
                  className={styles.input}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="admin-password">Password</label>
              <div className={styles.inputWrap}>
                <svg className={styles.fieldIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  className={styles.input}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
                <button
                  type="button"
                  className={styles.eyeBtn}
                  onClick={() => setShowPassword((p) => !p)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
            </div>

            {/* Cloudflare Turnstile Human Verification Container */}
            <div className={styles.turnstileWrap}>
              <div ref={turnstileContainerRef} />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`${styles.submitBtn} ${loading ? styles.btnLoading : ''}`}
            >
              {loading ? (
                <>
                  <svg className={styles.spinner} width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeDasharray="32" strokeLinecap="round" opacity="0.25"/>
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                  </svg>
                  <span>Signing in...</span>
                </>
              ) : (
                <span>Sign In to Admin</span>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className={styles.divider}>
            <span className={styles.dividerLine} />
            <span className={styles.dividerText}>or continue with</span>
            <span className={styles.dividerLine} />
          </div>

          {/* Google SSO Button */}
          <div className={styles.actionContainer}>
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className={`${styles.googleBtn} ${loading ? styles.btnLoading : ''}`}
            >
              <svg width="20" height="20" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59A14.5 14.5 0 019.5 24c0-1.59.28-3.14.76-4.59l-7.98-6.19A23.97 23.97 0 000 24c0 3.77.9 7.35 2.56 10.56l7.97-5.97z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 5.97C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              <span>Continue with Google</span>
            </button>

            <p className={styles.securityNote}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 1L2 3.5v3.5c0 3.5 2.5 5.5 5 6.5 2.5-1 5-3 5-6.5V3.5L7 1z" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>Protected by Cloudflare Turnstile &bull; Authorized Staff Only</span>
            </p>
          </div>
        </main>
      </div>
    );
}
