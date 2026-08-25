import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import styles from './Sidebar.module.css';

function NavIcon({ icon }: { icon: string }) {
  const icons: Record<string, ReactNode> = {
    dashboard: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 3h5.5v5.5H3V3Zm0 8.5h5.5V17H3v-5.5Zm8.5-8.5H17V8.5h-5.5V3Zm0 8.5H17V17h-5.5v-5.5Z" fill="currentColor"/>
      </svg>
    ),
    students: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M10 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm-6 7a6 6 0 0 1 12 0H4Z" fill="currentColor"/>
      </svg>
    ),
    auth: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M5 3h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm2 4h6M7 10h6M7 13h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    batches: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 7l7-4 7 4-7 4-7-4Zm0 0v6l7 4m-7-4 7 4m0 0V7" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      </svg>
    ),
    settings: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M16.16 12.44a1.34 1.34 0 0 0 .27 1.48l.05.05a1.63 1.63 0 1 1-2.3 2.3l-.05-.05a1.34 1.34 0 0 0-1.48-.27 1.34 1.34 0 0 0-.81 1.22v.14a1.63 1.63 0 0 1-3.26 0v-.07a1.34 1.34 0 0 0-.87-1.22 1.34 1.34 0 0 0-1.48.27l-.05.05a1.63 1.63 0 1 1-2.3-2.3l.05-.05a1.34 1.34 0 0 0 .27-1.48 1.34 1.34 0 0 0-1.22-.81H3.8a1.63 1.63 0 0 1 0-3.26h.07a1.34 1.34 0 0 0 1.22-.87 1.34 1.34 0 0 0-.27-1.48l-.05-.05a1.63 1.63 0 1 1 2.3-2.3l.05.05a1.34 1.34 0 0 0 1.48.27h.06a1.34 1.34 0 0 0 .81-1.22V3.8a1.63 1.63 0 0 1 3.26 0v.07a1.34 1.34 0 0 0 .81 1.22 1.34 1.34 0 0 0 1.48-.27l.05-.05a1.63 1.63 0 1 1 2.3 2.3l-.05.05a1.34 1.34 0 0 0-.27 1.48v.06a1.34 1.34 0 0 0 1.22.81h.14a1.63 1.63 0 0 1 0 3.26h-.07a1.34 1.34 0 0 0-1.22.81Z" stroke="currentColor" strokeWidth="1.5"/>
      </svg>
    ),
    admin: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M10 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-5 8a5 5 0 0 1 10 0H5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M15 7v3M13.5 8.5h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    broadcast: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M15 8a5 5 0 0 0-10 0v3a5 5 0 0 0 10 0V8Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
        <path d="M2.5 11v1.5a5 5 0 0 0 10 0V11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2 2"/>
        <path d="M10 16v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    materials: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 3h8l4 4v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
        <path d="M12 3v4h4M6 10h8M6 13h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    import: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M10 3v10m0 0l-3.5-3.5M10 13l3.5-3.5M4 17h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  };
  return icons[icon] ?? null;
}

export default function Sidebar() {
  const { t } = useLanguage();

  const navItems = [
    { to: '/', label: t('nav.dashboard'), icon: 'dashboard' },
    { to: '/students', label: t('nav.students'), icon: 'students' },
    { to: '/students/import', label: t('nav.import'), icon: 'import' },
    { to: '/authorization-requests', label: t('nav.auth'), icon: 'auth' },
    { to: '/batches', label: t('nav.batches'), icon: 'batches' },
    { to: '/broadcasts', label: t('nav.broadcasts'), icon: 'broadcast' },
    { to: '/study-materials', label: t('nav.materials'), icon: 'materials' },
    { to: '/admin/create', label: t('nav.admin'), icon: 'admin' },
  ];

  const bottomItems = [
    { to: '/settings', label: t('nav.settings'), icon: 'settings' },
  ];

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logoSection}>
        <div className={styles.logoIcon}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3ZM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82Z" fill="currentColor"/>
          </svg>
        </div>
        <div>
          <h1 className={styles.logoTitle}>{t('header.title')}</h1>
          <p className={styles.logoSubtitle}>{t('nav.adminPanel')}</p>
        </div>
      </div>

      <nav className={styles.nav}>
        <ul className={styles.navList}>
          {navItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `${styles.navLink} ${isActive ? styles.active : ''}`
                }
              >
                <NavIcon icon={item.icon} />
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className={styles.bottomSection}>
        <ul className={styles.navList}>
          {bottomItems.map((item) => (
            <li key={item.label}>
              <NavLink to={item.to} className={styles.navLink}>
                <NavIcon icon={item.icon} />
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
