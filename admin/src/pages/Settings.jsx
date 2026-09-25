import { useState, useCallback } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import {
    loadNotifications,
    saveNotifications,
    loadAdminInviteEnabled,
    saveAdminInviteEnabled,
} from '../services/settingsStorage';
import styles from './Settings.module.css';

const LANGUAGES = [
    { value: 'en', label: 'English', native: 'English' },
    { value: 'mr', label: 'Marathi', native: '\u092E\u0930\u093E\u0920\u0940' },
    { value: 'hi', label: 'Hindi', native: '\u0939\u093F\u0928\u094D\u0926\u0940' },
];

const THEME_OPTIONS = [
    { value: 'light', labelKey: 'theme.light' },
    { value: 'dark', labelKey: 'theme.dark' },
    { value: 'system', labelKey: 'theme.system' },
];

export default function Settings() {
    const { identity } = useAuth();
    const { theme, setTheme } = useTheme();
    const { language, setLanguage, t } = useLanguage();
    const [notifications, setNotifications] = useState(loadNotifications);
    const [adminInviteEnabled, setAdminInviteEnabled] = useState(loadAdminInviteEnabled);
    const [saved, setSaved] = useState(false);

    const handleNotificationChange = useCallback((key) => {
        setNotifications((prev) => {
            const next = { ...prev, [key]: !prev[key] };
            saveNotifications(next);
            return next;
        });
    }, []);

    const handleAdminInviteToggle = useCallback(() => {
        setAdminInviteEnabled((prev) => {
            const next = !prev;
            saveAdminInviteEnabled(next);
            return next;
        });
    }, []);

    function handleSave() {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    }

    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <h1 className={styles.title}>{t('settings.title')}</h1>
          <p className={styles.subtitle}>{t('settings.subtitle')}</p>
        </div>

        {saved && (
          <div className={styles.toast}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8.5l3.5 3.5L13 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {t('settings.saved')}
          </div>
        )}

        {/* Section 1: Appearance */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>{t('settings.appearance')}</h2>
          </div>
          <p className={styles.sectionDesc}>{t('settings.appearanceDesc')}</p>
          <div className={styles.themeGrid}>
            {THEME_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                className={`${styles.themeCard} ${theme === opt.value ? styles.themeCardActive : ''}`}
                onClick={() => setTheme(opt.value)}
              >
                <span className={styles.themeIcon}>
                  {opt.value === 'light' && (
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <circle cx="10" cy="10" r="4" stroke="currentColor" strokeWidth="1.5"/>
                      <path d="M10 3v1.5m0 11V17m6.5-6.5H17M3 10h1.5m11.3-5.3-1.06 1.06M4.76 14.24l-1.06 1.06m0-10.6 1.06 1.06m7.88 7.88 1.06 1.06" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  )}
                  {opt.value === 'dark' && (
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M17 11.5A7 7 0 0 1 8.5 3a7 7 0 1 0 8.5 8.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                  {opt.value === 'system' && (
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <rect x="3" y="4" width="14" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
                      <path d="M7 17h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  )}
                </span>
                <span className={styles.themeLabel}>{t(opt.labelKey)}</span>
                {theme === opt.value && (
                  <span className={styles.themeCheck}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M3 7.5l3 3 5-5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Section 2: Language */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>{t('settings.language')}</h2>
          </div>
          <p className={styles.sectionDesc}>{t('settings.languageDesc')}</p>
          <div className={styles.langGrid}>
            {LANGUAGES.map((lang) => (
              <button
                key={lang.value}
                className={`${styles.langCard} ${language === lang.value ? styles.langCardActive : ''}`}
                onClick={() => setLanguage(lang.value)}
              >
                <span className={styles.langLabel}>{lang.label}</span>
                <span className={styles.langNative}>{lang.native}</span>
                {language === lang.value && (
                  <span className={styles.langCheck}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M3 7.5l3 3 5-5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Section 3: Profile / Account */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>{t('settings.account')}</h2>
          </div>
          <p className={styles.sectionDesc}>{t('settings.accountDesc')}</p>
          <div className={styles.accountInfo}>
            <div className={styles.accountRow}>
              <span className={styles.accountLabel}>Name</span>
              <span className={styles.accountValue}>{identity?.name || 'Administrator'}</span>
            </div>
            <div className={styles.accountRow}>
              <span className={styles.accountLabel}>Email</span>
              <span className={styles.accountValue}>{identity?.email || 'newuniquesupabase@gmail.com'}</span>
            </div>
            <div className={styles.accountRow}>
              <span className={styles.accountLabel}>Role</span>
              <span className={styles.accountValue}>{identity?.roles?.includes('SUPER_ADMIN') ? 'Super Admin' : 'Institute Admin'}</span>
            </div>
            <div className={styles.accountRow}>
              <span className={styles.accountLabel}>Last Login</span>
              <span className={styles.accountValue}>Today, 10:30 AM</span>
            </div>
          </div>
          <button className={styles.linkBtn}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="3" y="7" width="10" height="7" rx="1" stroke="currentColor" strokeWidth="1.25"/>
              <path d="M5 7V5a3 3 0 1 1 6 0v2" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
            </svg>
            {t('settings.changePassword')}
          </button>
        </div>

        {/* Section 4: Notifications */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>{t('settings.notifications')}</h2>
          </div>
          <p className={styles.sectionDesc}>{t('settings.notificationsDesc')}</p>
          <div className={styles.settingRow}>
            <div className={styles.settingInfo}>
              <span className={styles.settingLabel}>{t('notify.authRequests')}</span>
              <span className={styles.settingDesc}>{t('notify.authRequestsDesc')}</span>
            </div>
            <button
              className={`${styles.toggle} ${notifications.authorizationRequests ? styles.toggleOn : ''}`}
              onClick={() => handleNotificationChange('authorizationRequests')}
            >
              <span className={styles.toggleKnob}/>
            </button>
          </div>
          <div className={styles.settingRow}>
            <div className={styles.settingInfo}>
              <span className={styles.settingLabel}>{t('notify.studentAdmissions')}</span>
              <span className={styles.settingDesc}>{t('notify.studentAdmissionsDesc')}</span>
            </div>
            <button
              className={`${styles.toggle} ${notifications.studentAdmissions ? styles.toggleOn : ''}`}
              onClick={() => handleNotificationChange('studentAdmissions')}
            >
              <span className={styles.toggleKnob}/>
            </button>
          </div>
          <div className={styles.settingRow}>
            <div className={styles.settingInfo}>
              <span className={styles.settingLabel}>{t('notify.systemAlerts')}</span>
              <span className={styles.settingDesc}>{t('notify.systemAlertsDesc')}</span>
            </div>
            <button
              className={`${styles.toggle} ${notifications.systemAlerts ? styles.toggleOn : ''}`}
              onClick={() => handleNotificationChange('systemAlerts')}>
              <span className={styles.toggleKnob}/>
            </button>
          </div>
        </div>

        {/* Section 4.5: Super Admin Access Controls */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Institute Staff Permissions</h2>
          </div>
          <p className={styles.sectionDesc}>Control whether institute administrators can invite and add new admin staff members.</p>
          <div className={styles.settingRow}>
            <div className={styles.settingInfo}>
              <span className={styles.settingLabel}>Allow Staff to Add Admins</span>
              <span className={styles.settingDesc}>When enabled, administrators can access the "Admin Management" page to grant access to staff Gmail accounts.</span>
            </div>
            <button
              className={`${styles.toggle} ${adminInviteEnabled ? styles.toggleOn : ''}`}
              onClick={handleAdminInviteToggle}
            >
              <span className={styles.toggleKnob}/>
            </button>
          </div>
        </div>

        {/* Section 5: Application Information */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>{t('settings.appInfo')}</h2>
          </div>
          <div className={styles.appInfo}>
            <div className={styles.appRow}>
              <span className={styles.appLabel}>{t('settings.appInfo')}</span>
              <span className={styles.appValue}>New Unique Computers</span>
            </div>
            <div className={styles.appRow}>
              <span className={styles.appLabel}>{t('settings.version')}</span>
              <span className={styles.appValue}>1.0.0</span>
            </div>
            <div className={styles.appRow}>
              <span className={styles.appLabel}>{t('settings.environment')}</span>
              <span className={styles.appValue}>{t('settings.production')}</span>
            </div>
          </div>
        </div>

        <div className={styles.actions}>
          <button className={styles.saveBtn} onClick={handleSave}>
            {saved ? (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8.5l3.5 3.5L13 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M12 5H4v8h8V5Z" stroke="currentColor" strokeWidth="1.25"/>
                <path d="M6 5V3h4v2" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
              </svg>
            )}
            {saved ? t('settings.savedBtn') : t('settings.saveChanges')}
          </button>
        </div>
      </div>
    );
}
