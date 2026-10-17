import { useState, useEffect } from 'react';
import styles from './CookieConsentBanner.module.css';

const COOKIE_CONSENT_KEY = 'nuc_cookie_consent';

export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
      if (!consent) {
        setVisible(true);
      }
    } catch {
      // Ignore localStorage security/access errors
    }
  }, []);

  const handleChoice = (accepted) => {
    try {
      localStorage.setItem(COOKIE_CONSENT_KEY, accepted ? 'accepted' : 'rejected');
    } catch {
      // Ignore
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className={styles.cookieBanner} role="region" aria-label="Cookie consent banner">
      <div className={styles.cookieContent}>
        <svg
          className={styles.cookieIcon}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5" />
          <path d="M8.5 8.5v.01" />
          <path d="M7 13v.01" />
          <path d="M12 16v.01" />
          <path d="M16 11v.01" />
        </svg>
        <div>
          <h4 className={styles.cookieTitle}>Cookie & Privacy Preferences</h4>
          <p className={styles.cookieText}>
            We use essential cookies to maintain your authenticated session and secure platform operation.
            You can choose whether to enable optional cookies.
          </p>
        </div>
      </div>
      <div className={styles.cookieActions}>
        <button
          type="button"
          className={styles.rejectBtn}
          onClick={() => handleChoice(false)}
        >
          Reject optional cookies
        </button>
        <button
          type="button"
          className={styles.acceptBtn}
          onClick={() => handleChoice(true)}
        >
          Accept optional cookies
        </button>
      </div>
    </div>
  );
}
