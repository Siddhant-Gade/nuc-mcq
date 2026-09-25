import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useSidebar } from '../contexts/SidebarContext';
import { getStudents, getBatches } from '../services';
import HelpModal from './HelpModal';
import styles from './Header.module.css';
const pageResults = [
    { id: 'page-dashboard', label: 'nav.qDashboard', subtitle: 'nav.dashboardSub', path: '/', icon: 'page' },
    { id: 'page-analytics', label: 'nav.analytics', subtitle: 'nav.analyticsSub', path: '/analytics', icon: 'page' },
    { id: 'page-students', label: 'nav.studentList', subtitle: 'nav.studentListSub', path: '/students', icon: 'page' },
    { id: 'page-admit', label: 'nav.studentAdmission', subtitle: 'nav.studentAdmissionSub', path: '/students/admit', icon: 'page' },
    { id: 'page-auth', label: 'nav.authRequests', subtitle: 'nav.authRequestsSub', path: '/authorization-requests', icon: 'page' },
    { id: 'page-batches', label: 'nav.qBatches', subtitle: 'nav.batchesSub', path: '/batches', icon: 'page' },
    { id: 'page-broadcasts', label: 'nav.broadcasts', subtitle: 'nav.broadcastsSub', path: '/broadcasts', icon: 'page' },
    { id: 'page-materials', label: 'nav.materials', subtitle: 'nav.materialsSub', path: '/study-materials', icon: 'page' },
    { id: 'page-questions', label: 'nav.questions', subtitle: 'nav.questionsSub', path: '/question-bank', icon: 'page' },
    { id: 'page-admin', label: 'nav.adminMgmt', subtitle: 'nav.adminMgmtSub', path: '/admin/create', icon: 'page' },
    { id: 'page-import', label: 'nav.qImport', subtitle: 'nav.importSub', path: '/students/import', icon: 'page' },
];
function ResultIcon({ icon }) {
    if (icon === 'student') {
        return (<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.25"/>
        <path d="M2 15c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
      </svg>);
    }
    if (icon === 'batch') {
        return (<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M2 6l6-3.5L14 6l-6 3.5L2 6Zm0 0v4.5l6 3.5m-6-3.5 6 3.5V6" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round"/>
      </svg>);
    }
    return (<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.25"/>
      <path d="M5 5h6M5 8h4M5 11h5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
    </svg>);
}
const THEME_OPTIONS = [
    {
        value: 'light',
        labelKey: 'theme.light',
        icon: (<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.25"/><path d="M8 2v1.5m0 9V14m5-5h-1.5M3.5 8H2m10.05-3.55-1.06 1.06M4.01 11.99l-1.06 1.06m0-9.1 1.06 1.06m7.88 7.88 1.06 1.06" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/></svg>),
    },
    {
        value: 'dark',
        labelKey: 'theme.dark',
        icon: (<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M13.5 8.5a5.5 5.5 0 0 1-7-7 5.5 5.5 0 1 0 7 7Z" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/></svg>),
    },
    {
        value: 'system',
        labelKey: 'theme.system',
        icon: (<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="3" width="12" height="8" rx="1" stroke="currentColor" strokeWidth="1.25"/><path d="M5 14h6" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/></svg>),
    },
];
export default function Header() {
    const [open, setOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const [themeOpen, setThemeOpen] = useState(false);
    const [helpOpen, setHelpOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [activeIndex, setActiveIndex] = useState(-1);
    const [students, setStudents] = useState([]);
    const [batches, setBatches] = useState([]);
    const searchRef = useRef(null);
    const profileRef = useRef(null);
    const themeRef = useRef(null);
    const inputRef = useRef(null);
    const navigate = useNavigate();
    const { theme, resolved, setTheme } = useTheme();
    const { t } = useLanguage();
    const auth = useAuth();
    const { toggleMobile } = useSidebar();
    useEffect(() => {
        Promise.all([getStudents(), getBatches()]).then(([s, b]) => {
            setStudents(s);
            setBatches(b);
        });
    }, []);
    const batchNameMap = useMemo(() => new Map(batches.map((b) => [b.batchId, b.batchName])), [batches]);
    const studentResults = useMemo(() => students.map((s) => ({
        id: s.id,
        label: s.name,
        subtitle: `${s.studentId} · ${batchNameMap.get(s.batchId) ?? s.batchId}`,
        path: `/students/${s.id}`,
        icon: 'student',
    })), [students, batchNameMap]);
    const batchResults = useMemo(() => batches.map((b) => ({
        id: b.batchId,
        label: b.batchName,
        subtitle: `${b.status} · ${b.enrolledCount}/${b.capacity}`,
        path: '/batches',
        icon: 'batch',
    })), [batches]);
    const allResults = useMemo(() => [...pageResults, ...studentResults, ...batchResults], [studentResults, batchResults]);
    const results = useMemo(() => {
        if (!query.trim())
            return pageResults;
        const q = query.toLowerCase();
        return allResults.filter((r) => {
            const label = r.icon === 'page' ? t(r.label) : r.label;
            const sub = r.icon === 'page' ? t(r.subtitle) : r.subtitle;
            return label.toLowerCase().includes(q) || sub.toLowerCase().includes(q);
        });
    }, [query, t, allResults]);
    useEffect(() => {
        function handleClickOutside(e) {
            if (searchRef.current && !searchRef.current.contains(e.target)) {
                setOpen(false);
            }
            if (profileRef.current && !profileRef.current.contains(e.target)) {
                setProfileOpen(false);
            }
            if (themeRef.current && !themeRef.current.contains(e.target)) {
                setThemeOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    function handleKeyDown(e) {
        if (!open)
            return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex((i) => (i < results.length - 1 ? i + 1 : 0));
        }
        else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex((i) => (i > 0 ? i - 1 : results.length - 1));
        }
        else if (e.key === 'Enter' && activeIndex >= 0) {
            e.preventDefault();
            navigate(results[activeIndex].path);
            setOpen(false);
            setQuery('');
            inputRef.current?.blur();
        }
        else if (e.key === 'Escape') {
            setOpen(false);
            inputRef.current?.blur();
        }
    }
    function selectResult(result) {
        navigate(result.path);
        setOpen(false);
        setQuery('');
    }
    return (<>
    <header className={styles.header}>
      <div className={styles.left}>
        <button
          type="button"
          className={styles.mobileMenuBtn}
          onClick={toggleMobile}
          aria-label="Open navigation menu"
          title="Open menu"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
        <div className={styles.brandBadge}>
          <span className={styles.statusPulse}/>
          <span className={styles.brandBadgeText}>SYSTEM ONLINE</span>
        </div>
      </div>
      <div className={styles.right}>
        <div className={styles.searchWrapper} ref={searchRef}>
          <svg className={styles.searchIcon} width="16" height="16" viewBox="0 0 18 18" fill="none">
            <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="m12.5 12.5 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <input ref={inputRef} className={styles.searchInput} placeholder={t('header.search')} type="text" value={query} onChange={(e) => { setQuery(e.target.value); setActiveIndex(-1); setOpen(true); }} onFocus={() => setOpen(true)} onKeyDown={handleKeyDown}/>
          {open && (<div className={styles.searchDropdown}>
              <div className={styles.searchDropdownHeader}>
                {query.trim() ? `${results.length} result${results.length !== 1 ? 's' : ''}` : t('header.quickNav')}
              </div>
              {results.length === 0 ? (<div className={styles.searchEmpty}>{t('header.noResults')}</div>) : (<ul className={styles.searchList}>
                  {results.map((result, i) => (<li key={result.id}>
                      <button className={`${styles.searchItem} ${i === activeIndex ? styles.searchItemActive : ''}`} onMouseEnter={() => setActiveIndex(i)} onClick={() => selectResult(result)}>
                        <span className={styles.searchItemIcon}>
                          <ResultIcon icon={result.icon}/>
                        </span>
                        <span className={styles.searchItemText}>
                          <span className={styles.searchItemLabel}>{result.icon === 'page' ? t(result.label) : result.label}</span>
                          <span className={styles.searchItemSub}>{result.icon === 'page' ? t(result.subtitle) : result.subtitle}</span>
                        </span>
                        <svg className={styles.searchItemArrow} width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </button>
                    </li>))}
                </ul>)}
              <div className={styles.searchFooter}>
                <span><kbd>↑↓</kbd> {t('header.navigate')}</span>
                <span><kbd>↵</kbd> {t('header.select')}</span>
                <span><kbd>esc</kbd> {t('header.close')}</span>
              </div>
            </div>)}
        </div>
        <div className={styles.themeWrap} ref={themeRef}>
          <button className={styles.iconButton} title="Toggle Theme" onClick={() => setThemeOpen((p) => !p)}>
            {resolved === 'dark' ? (<svg width="17" height="17" viewBox="0 0 18 18" fill="none"><path d="M15.25 9.5A6.25 6.25 0 0 1 7.75 2a6.25 6.25 0 1 0 7.5 7.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>) : (<svg width="17" height="17" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="3" stroke="currentColor" strokeWidth="1.4"/><path d="M9 2.5v1.5m0 10V15.5m6.5-6.5H14M4 9H2.5m11.3-4.8-1.06 1.06M4.76 12.24l-1.06 1.06m0-10.6 1.06 1.06m7.88 7.88 1.06 1.06" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>)}
          </button>
          {themeOpen && (<div className={styles.themeDropdown}>
              {THEME_OPTIONS.map((opt) => (<button key={opt.value} className={`${styles.themeItem} ${theme === opt.value ? styles.themeItemActive : ''}`} onClick={() => { setTheme(opt.value); setThemeOpen(false); }}>
                  {opt.icon}
                  <span>{t(opt.labelKey)}</span>
                  {theme === opt.value && (<svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ marginLeft: 'auto' }}><path d="M3 7.5l3 3 5-5.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/></svg>)}
                </button>))}
            </div>)}
        </div>
        <button className={styles.iconButton} title={t('header.help')} onClick={() => setHelpOpen(true)}>
          <svg width="17" height="17" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.4"/>
            <path d="M7.5 7.5a2.5 2.5 0 0 1 5 0c0 1.5-2.5 2-2.5 3.5M10 14.5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
        </button>
        <div className={styles.divider}/>
        <div className={styles.profileWrap} ref={profileRef}>
          <button className={styles.userButton} onClick={() => setProfileOpen((p) => !p)}>
            <div className={styles.avatar}>
              <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                <path d="M10 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-6 7a6 6 0 0 1 12 0H4Z" fill="currentColor"/>
              </svg>
            </div>
            <div className={styles.userMeta}>
              <span className={styles.userName}>Administrator</span>
              <span className={styles.userRole}>Master Access</span>
            </div>
            <svg className={`${styles.chevron} ${profileOpen ? styles.chevronOpen : ''}`} width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          {profileOpen && (<div className={styles.dropdown}>
              <div className={styles.dropdownHeader}>
                <div className={styles.dropdownAvatar}>A</div>
                <div>
                  <p className={styles.dropdownName}>Institute Administrator</p>
                  <p className={styles.dropdownEmail}>{auth.identity?.email ?? 'admin@gmail.com'}</p>
                </div>
              </div>
              <div className={styles.dropdownDivider}/>
              <button className={styles.dropdownItem} onClick={() => { setProfileOpen(false); navigate('/admin/create'); }}>
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.25"/><path d="M2 15c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/></svg>
                {t('header.myProfile')}
              </button>
              <button className={styles.dropdownItem} onClick={() => { setProfileOpen(false); navigate('/settings'); }}>
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.25"/><path d="M8 5v3l2 1.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/></svg>
                {t('header.settings')}
              </button>
              <div className={styles.dropdownDivider}/>
              <button className={`${styles.dropdownItem} ${styles.logoutItem}`} onClick={() => {
                setProfileOpen(false);
                void auth.signOut();
            }}>
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M6 2H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h2m4-5 4-4m0 0 4 4m-4-4v10" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/></svg>
                {t('header.logout')}
              </button>
            </div>)}
        </div>
      </div>
    </header>
    {helpOpen && <HelpModal onClose={() => setHelpOpen(false)}/>}
    </>);
}
