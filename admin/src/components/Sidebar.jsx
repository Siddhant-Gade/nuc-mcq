import { NavLink } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useSidebar } from '../contexts/SidebarContext';
import { getPendingAuthorizationRequests } from '../services';
import { loadAdminInviteEnabled } from '../services/settingsStorage';
import styles from './Sidebar.module.css';

function NavIcon({ icon }) {
    const icons = {
        dashboard: (<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 3h5.5v5.5H3V3Zm0 8.5h5.5V17H3v-5.5Zm8.5-8.5H17V8.5h-5.5V3Zm0 8.5H17V17h-5.5v-5.5Z" fill="currentColor"/>
      </svg>),
        analytics: (<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 16.5h14M4 13.5l3.5-5 3.5 3 5-6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M12.5 5H16v3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>),
        students: (<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M10 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm-6 7a6 6 0 0 1 12 0H4Z" fill="currentColor"/>
      </svg>),
        auth: (<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M5 3h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm2 4h6M7 10h6M7 13h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>),
        batches: (<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 7l7-4 7 4-7 4-7-4Zm0 0v6l7 4m-7-4 7 4m0 0V7" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      </svg>),
        settings: (<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M16.16 12.44a1.34 1.34 0 0 0 .27 1.48l.05.05a1.63 1.63 0 1 1-2.3 2.3l-.05-.05a1.34 1.34 0 0 0-1.48-.27 1.34 1.34 0 0 0-.81 1.22v.14a1.63 1.63 0 0 1-3.26 0v-.07a1.34 1.34 0 0 0-.87-1.22 1.34 1.34 0 0 0-1.48.27l-.05.05a1.63 1.63 0 1 1-2.3-2.3l.05-.05a1.34 1.34 0 0 0 .27-1.48 1.34 1.34 0 0 0-1.22-.81H3.8a1.63 1.63 0 0 1 0-3.26h.07a1.34 1.34 0 0 0 1.22-.87 1.34 1.34 0 0 0-.27-1.48l-.05-.05a1.63 1.63 0 1 1 2.3-2.3l.05.05a1.34 1.34 0 0 0 1.48.27h.06a1.34 1.34 0 0 0 .81-1.22V3.8a1.63 1.63 0 0 1 3.26 0v.07a1.34 1.34 0 0 0 .81 1.22 1.34 1.34 0 0 0 1.48-.27l.05-.05a1.63 1.63 0 1 1 2.3 2.3l-.05.05a1.34 1.34 0 0 0-.27 1.48v.06a1.34 1.34 0 0 0 1.22.81h.14a1.63 1.63 0 0 1 0 3.26h-.07a1.34 1.34 0 0 0-1.22.81Z" stroke="currentColor" strokeWidth="1.5"/>
      </svg>),
        admin: (<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M10 10a3.5 3.5 0 1 0 0-6 3 3 0 0 0 0 6Zm-5 8a5 5 0 0 1 10 0H5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M15 7v3M13.5 8.5h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>),
        broadcast: (<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M15 8a5 5 0 0 0-10 0v3a5 5 0 0 0 10 0V8Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
        <path d="M2.5 11v1.5a5 5 0 0 0 10 0V11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2 2"/>
        <path d="M10 16v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>),
        materials: (<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 3h8l4 4v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
        <path d="M12 3v4h4M6 10h8M6 13h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>),
        import: (<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M10 3v10m0 0l-3.5-3.5M10 13l3.5-3.5M4 17h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>),
        questions: (<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm0-4.5h.01M10 11a1.5 1.5 0 0 1 1.5-1.5c1 0 1.5-1 1.5-1.5a2 2 0 1 0-3.5-1.3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>),
    };
    return icons[icon] ?? null;
}

export default function Sidebar() {
    const { t } = useLanguage();
    const { collapsed, toggle, mobileOpen, closeMobile } = useSidebar();
    const [pendingCount, setPendingCount] = useState(0);
    const intervalRef = useRef(null);

    // Fetch pending authorization request count; refreshes every 30 s
    useEffect(() => {
        const fetchPending = () => {
            getPendingAuthorizationRequests()
                .then((list) => setPendingCount(Array.isArray(list) ? list.length : 0))
                .catch(() => { /* silently ignore network errors */ });
        };
        fetchPending();
        intervalRef.current = setInterval(fetchPending, 30_000);
        return () => clearInterval(intervalRef.current);
    }, []);

    const navItems = [
        { to: '/', label: t('nav.dashboard'), icon: 'dashboard' },
        { to: '/analytics', label: t('nav.analytics') || 'Student Analytics', icon: 'analytics' },
        { to: '/students', label: t('nav.students'), icon: 'students' },
        { to: '/students/import', label: t('nav.import'), icon: 'import' },
        { to: '/authorization-requests', label: t('nav.auth'), icon: 'auth', badge: pendingCount },
        { to: '/batches', label: t('nav.batches'), icon: 'batches' },
        { to: '/broadcasts', label: t('nav.broadcasts'), icon: 'broadcast' },
        { to: '/study-materials', label: t('nav.materials'), icon: 'materials' },
        { to: '/question-bank', label: t('nav.questions') || 'Question Bank', icon: 'questions' },
        ...(loadAdminInviteEnabled() ? [{ to: '/admin/create', label: t('nav.admin'), icon: 'admin' }] : []),
    ];
    const bottomItems = [
        { to: '/settings', label: t('nav.settings'), icon: 'settings' },
    ];

    return (
      <>
        {/* Mobile backdrop shadow overlay */}
        {mobileOpen && (
          <div
            className={styles.mobileBackdrop}
            onClick={closeMobile}
            aria-label="Close navigation"
          />
        )}

        <aside
          className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''} ${mobileOpen ? styles.mobileOpen : ''}`}
        >
          <div className={styles.logoSection}>
            <div
              className={styles.logoBrand}
              onClick={collapsed ? toggle : undefined}
              style={{ cursor: collapsed ? 'pointer' : 'default' }}
            >
              <div className={styles.logoIcon} style={{ overflow: 'hidden', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src="/logo.png" alt="New Unique Computers" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} />
              </div>
              {(!collapsed || mobileOpen) && (
                <div className={styles.logoText}>
                  <h1 className={styles.logoTitle}>{t('header.title')}</h1>
                  <p className={styles.logoSubtitle}>{t('nav.adminPanel')}</p>
                </div>
              )}
            </div>

            {/* Desktop collapse toggle */}
            {!collapsed && (
              <button className={styles.collapseToggleBtn} onClick={toggle} title="Collapse sidebar" aria-label="Collapse sidebar">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            )}

            {/* Mobile close button */}
            <button className={styles.mobileCloseBtn} onClick={closeMobile} aria-label="Close menu">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <nav className={styles.nav}>
            <ul className={styles.navList}>
              {navItems.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.to === '/'}
                    title={collapsed && !mobileOpen ? item.label : undefined}
                    onClick={closeMobile}
                    className={({ isActive }) => `${styles.navLink} ${isActive ? styles.active : ''}`}
                  >
                    <span className={styles.iconWrap}>
                      <NavIcon icon={item.icon}/>
                      {item.badge > 0 && collapsed && !mobileOpen && (
                        <span className={styles.badgeDot}>{item.badge > 9 ? '9+' : item.badge}</span>
                      )}
                    </span>
                    {(!collapsed || mobileOpen) && <span className={styles.linkLabel}>{item.label}</span>}
                    {(!collapsed || mobileOpen) && item.badge > 0 && (
                      <span className={styles.badgePill}>{item.badge > 9 ? '9+' : item.badge}</span>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className={styles.bottomSection}>
            <ul className={styles.navList}>
              {bottomItems.map((item) => (
                <li key={item.label}>
                  <NavLink
                    to={item.to}
                    title={collapsed && !mobileOpen ? item.label : undefined}
                    onClick={closeMobile}
                    className={styles.navLink}
                  >
                    <NavIcon icon={item.icon}/>
                    {(!collapsed || mobileOpen) && <span className={styles.linkLabel}>{item.label}</span>}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </>
    );
}
