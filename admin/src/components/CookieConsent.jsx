import { useState, useEffect } from 'react';
import styles from './CookieConsent.module.css';

const COOKIE_STORAGE_KEY = 'nuc_cookie_consent';

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState({
    necessary: true,
    uiPreferences: true,
    analytics: true,
  });

  useEffect(() => {
    // Check if consent has already been recorded
    try {
      const stored = localStorage.getItem(COOKIE_STORAGE_KEY);
      if (!stored) {
        // Small delay to let page load smoothly before displaying
        const timer = setTimeout(() => setVisible(true), 600);
        return () => clearTimeout(timer);
      }
    } catch (_) {}

    // Allow opening modal on demand (e.g. from footer or settings)
    const handleOpen = () => {
      try {
        const stored = localStorage.getItem(COOKIE_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          setPreferences({
            necessary: true,
            uiPreferences: parsed.uiPreferences ?? true,
            analytics: parsed.analytics ?? true,
          });
        }
      } catch (_) {}
      setShowPreferences(true);
      setVisible(true);
    };

    window.addEventListener('open_cookie_consent', handleOpen);
    return () => window.removeEventListener('open_cookie_consent', handleOpen);
  }, []);

  const saveConsent = (accepted) => {
    const consentData = {
      necessary: true,
      uiPreferences: Boolean(accepted.uiPreferences),
      analytics: Boolean(accepted.analytics),
      timestamp: new Date().toISOString(),
      version: '1.0',
    };
    try {
      localStorage.setItem(COOKIE_STORAGE_KEY, JSON.stringify(consentData));
    } catch (_) {}
    setVisible(false);
  };

  const handleAcceptAll = () => {
    saveConsent({ necessary: true, uiPreferences: true, analytics: true });
  };

  const handleEssentialOnly = () => {
    saveConsent({ necessary: true, uiPreferences: false, analytics: false });
  };

  const handleSavePreferences = () => {
    saveConsent(preferences);
  };

  if (!visible) return null;

  return (
    <aside
      className={styles.overlay}
      role="region"
      aria-label="Cookie and Privacy Consent Banner"
    >
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.iconWrapper} aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5" />
              <path d="M8.5 8.5v.01" />
              <path d="M16 15.5v.01" />
              <path d="M12 12v.01" />
              <path d="M11 17v.01" />
              <path d="M7 14v.01" />
            </svg>
          </div>
          <div className={styles.titleArea}>
            <h3 className={styles.title}>Cookie & Security Settings</h3>
            <p className={styles.description}>
              We use strictly necessary cookies to manage your secure session, prevent CSRF attacks,
              and protect admin access. Optional cookies help us remember your interface preferences.
            </p>
          </div>
        </div>

        {showPreferences && (
          <div className={styles.preferencesPanel}>
            <div className={styles.prefItem}>
              <div className={styles.prefInfo}>
                <div className={styles.prefName}>
                  <span>Essential Security & Sessions</span>
                  <span className={styles.tagRequired}>Always Active</span>
                </div>
                <p className={styles.prefDesc}>
                  Maintains HttpOnly encrypted session cookies, authentication tokens, and CSRF protection.
                </p>
              </div>
              <label className={styles.switch}>
                <input type="checkbox" checked disabled aria-label="Essential security cookies (always active)" />
                <span className={styles.slider} />
              </label>
            </div>

            <div className={styles.prefItem}>
              <div className={styles.prefInfo}>
                <div className={styles.prefName}>Interface & Display Preferences</div>
                <p className={styles.prefDesc}>
                  Remembers your dark/light theme, language selection, and sidebar layout settings.
                </p>
              </div>
              <label className={styles.switch}>
                <input
                  type="checkbox"
                  checked={preferences.uiPreferences}
                  onChange={(e) => setPreferences((p) => ({ ...p, uiPreferences: e.target.checked }))}
                  aria-label="Toggle interface and display preferences cookies"
                />
                <span className={styles.slider} />
              </label>
            </div>

            <div className={styles.prefItem}>
              <div className={styles.prefInfo}>
                <div className={styles.prefName}>Performance Diagnostics</div>
                <p className={styles.prefDesc}>
                  Allows anonymous load-time and batch operational telemetry to keep the admin panel responsive.
                </p>
              </div>
              <label className={styles.switch}>
                <input
                  type="checkbox"
                  checked={preferences.analytics}
                  onChange={(e) => setPreferences((p) => ({ ...p, analytics: e.target.checked }))}
                  aria-label="Toggle performance diagnostics cookies"
                />
                <span className={styles.slider} />
              </label>
            </div>
          </div>
        )}

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.btnLink}
            onClick={() => setShowPreferences((prev) => !prev)}
            aria-expanded={showPreferences}
          >
            {showPreferences ? 'Hide Details' : 'Customize'}
          </button>

          {showPreferences ? (
            <>
              <button type="button" className={styles.btnSecondary} onClick={handleEssentialOnly}>
                Essential Only
              </button>
              <button type="button" className={styles.btnPrimary} onClick={handleSavePreferences}>
                Save Preferences
              </button>
            </>
          ) : (
            <>
              <button type="button" className={styles.btnSecondary} onClick={handleEssentialOnly}>
                Essential Only
              </button>
              <button type="button" className={styles.btnPrimary} onClick={handleAcceptAll}>
                Accept All
              </button>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
