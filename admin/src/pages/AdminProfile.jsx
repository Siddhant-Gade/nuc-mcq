import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import pageStyles from '../shared/styles/Page.module.css';
import styles from './AdminProfile.module.css';

export default function AdminProfile() {
  const auth = useAuth();
  const { t } = useLanguage();
  const { resolved } = useTheme();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const email = auth.identity?.email ?? 'admin@gmail.com';
  const name = auth.identity?.name ?? 'Institute Administrator';
  const roles = auth.identity?.roles ?? ['ADMIN'];
  const roleLabel = roles.includes('SUPER_ADMIN') ? 'Super Administrator' : 'Administrator';
  const initials = name.split(/\s+/).slice(0, 2).map((part) => part.charAt(0)).join('').toUpperCase();

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={pageStyles.pageHeader}>
        <div>
          <h1 className={pageStyles.heading}>{t('header.myProfile')}</h1>
          <p className={pageStyles.subtext}>Your administrator identity and account access.</p>
        </div>
      </div>

      <section className={styles.heroCard} aria-labelledby="profile-title">
        <div className={styles.heroIdentity}>
          <div className={styles.avatar} aria-hidden="true">{initials || 'A'}</div>
          <div className={styles.details}>
            <div className={styles.eyebrow}>Administrator account</div>
            <h2 id="profile-title">{name}</h2>
            <p>{email}</p>
            <div className={styles.badges}>
              <span className={styles.role}>{roleLabel}</span>
              <span className={styles.activeBadge}><span className={styles.statusDot} />Active session</span>
            </div>
          </div>
        </div>
        <div className={styles.heroActions}>
          <button type="button" className={styles.secondaryButton} onClick={() => navigate('/settings')}>
            Account settings
          </button>
          <button type="button" className={styles.primaryButton} onClick={() => void auth.signOut()}>
            Sign out
          </button>
        </div>
      </section>

      <div className={styles.infoGrid}>
        <section className={styles.infoCard} aria-labelledby="account-details-title">
          <div className={styles.cardHeader}>
            <div className={styles.cardIcon}><span aria-hidden="true">◎</span></div>
            <div>
              <h3 id="account-details-title">Account details</h3>
              <p>Verified identity information</p>
            </div>
          </div>
          <dl className={styles.detailList}>
            <div className={styles.detailRow}>
              <dt>Full name</dt>
              <dd>{name}</dd>
            </div>
            <div className={styles.detailRow}>
              <dt>Email address</dt>
              <dd className={styles.emailRow}>
                <span title={email}>{email}</span>
                <button type="button" className={styles.copyButton} onClick={copyEmail} aria-label="Copy email address">
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </dd>
            </div>
            <div className={styles.detailRow}>
              <dt>Access level</dt>
              <dd>{roleLabel}</dd>
            </div>
          </dl>
        </section>

        <section className={styles.infoCard} aria-labelledby="security-title">
          <div className={styles.cardHeader}>
            <div className={`${styles.cardIcon} ${styles.cardIconSuccess}`}><span aria-hidden="true">✓</span></div>
            <div>
              <h3 id="security-title">Security status</h3>
              <p>Your current portal session</p>
            </div>
          </div>
          <div className={styles.securityState}>
            <div>
              <strong>Protected access</strong>
              <span>Administrator permissions are active.</span>
            </div>
            <span className={styles.securePill}>Secure</span>
          </div>
          <button type="button" className={styles.textButton} onClick={() => navigate('/settings')}>
            Review security settings <span aria-hidden="true">→</span>
          </button>
        </section>
      </div>

      <div className={styles.sessionNote}>
        <span className={styles.noteIcon} aria-hidden="true">i</span>
        <span>Theme: <strong>{resolved === 'dark' ? 'Dark' : 'Light'}</strong>. You can update appearance and language from Account settings.</span>
      </div>
    </div>
  );
}
