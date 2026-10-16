import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Menu,
  Moon,
  Sun,
  Settings,
  LogOut,
  Sparkles,
  ChevronDown,
  User,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { useLayout } from '../../context/LayoutContext';
import { Language } from '../../types';

export const Navbar: React.FC = () => {
  const { identity, signOut } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { toggleSidebarCollapsed, openMobileSidebar } = useLayout();
  const navigate = useNavigate();
  const location = useLocation();

  const [profileOpen, setProfileOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Close profile dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(e.target as Node)
      ) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleHamburgerClick = () => {
    if (window.innerWidth < 1024) {
      openMobileSidebar();
    } else {
      toggleSidebarCollapsed();
    }
  };

  const handleSignOut = async () => {
    setProfileOpen(false);
    await signOut();
    navigate('/login');
  };

  const centerPillItems = [
    { to: '/', label: 'Dashboard' },
    { to: '/tests', label: 'Exams' },
    { to: '/question-bank', label: 'Practice' },
    { to: '/bookmarks', label: 'Bookmarks' },
    { to: '/notes', label: 'Notes' },
  ];

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 shadow-xs transition-colors">
      <div className="w-full px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2">
          {/* Left: Mobile-only Hamburger & Brand */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleHamburgerClick}
              aria-label="Toggle navigation menu"
              className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Brand visible on mobile & small desktop */}
            <NavLink to="/" className="flex items-center gap-2.5 lg:hidden group">
              <img
                src="/icon/small_Icon.png"
                alt="NUC Logo"
                className="w-8 h-8 object-contain rounded-lg shadow-xs border border-slate-200 dark:border-slate-700 bg-white"
              />
              <span className="font-bold text-sm text-slate-900 dark:text-white leading-tight">
                NUC MS-CIT
              </span>
            </NavLink>
          </div>

          {/* Center: Reference Screenshot Style Pill Navigation (Visible md+) */}
          <nav className="hidden md:flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-full border border-slate-200/60 dark:border-slate-700/60 shadow-xs">
            {centerPillItems.map((item) => {
              const isActive =
                item.to === '/'
                  ? location.pathname === '/'
                  : location.pathname.startsWith(item.to);
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={`px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {item.label}
                </NavLink>
              );
            })}
          </nav>

          {/* Right Action Utilities */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* AI Assistant / Practice Button */}
            <button
              onClick={() => navigate('/tests')}
              className="hidden xl:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border border-blue-200 dark:border-blue-800/60 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-500" />
              <span>Practice Portal</span>
            </button>

            {/* Language Selector Dropdown */}
            <div className="relative">
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as Language)}
                aria-label="Select language"
                className="text-xs font-semibold py-1.5 px-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors cursor-pointer"
              >
                <option value="en">EN</option>
                <option value="mr">MR (मराठी)</option>
                <option value="hi">HI (हिंदी)</option>
              </select>
            </div>

            {/* Dark / Light Toggle */}
            <button
              onClick={toggleTheme}
              aria-label="Toggle Theme"
              className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-600" />
              )}
            </button>


            {/* Settings Gear */}
            <NavLink
              to="/settings"
              title={t('tab_settings')}
              className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Settings className="w-4 h-4" />
            </NavLink>

            {/* User Profile Avatar & Dropdown */}
            <div className="relative ml-1" ref={profileMenuRef}>
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-1.5 p-1 rounded-full hover:ring-2 hover:ring-blue-500/30 transition-all focus:outline-none"
                aria-expanded={profileOpen}
                aria-label="User menu"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  {(identity?.name || 'S').charAt(0).toUpperCase()}
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
              </button>

              {/* Profile Dropdown Menu */}
              {profileOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-slate-900 shadow-xl border border-slate-200/80 dark:border-slate-800 py-2 z-50 animate-scale-in">
                  <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {identity?.name || 'Student'}
                    </p>
                    <p className="text-[11px] text-blue-600 dark:text-blue-400 font-mono font-medium truncate mt-0.5">
                      PRN: {identity?.studentId || identity?.email || 'NUC'}
                    </p>
                    {identity?.batchName && (
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                        Batch: {identity.batchName}
                      </p>
                    )}
                  </div>

                  <div className="py-1">
                    <NavLink
                      to="/settings"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      <User className="w-4 h-4 text-slate-400" />
                      <span>{t('tab_settings')}</span>
                    </NavLink>
                  </div>

                  <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>{t('btn_sign_out')}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
