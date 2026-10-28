import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  CheckCircle2,
  BookOpen,
  Bookmark,
  FileText,
  BarChart2,
  Bell,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useLayout } from '../../context/LayoutContext';
import { broadcastsService } from '../../services/broadcastsService';
import { notificationsService } from '../../services/notificationsService';

export const Sidebar: React.FC = () => {
  const { identity, signOut } = useAuth();
  const { t } = useLanguage();
  const {
    isSidebarCollapsed,
    toggleSidebarCollapsed,
    isMobileSidebarOpen,
    closeMobileSidebar,
  } = useLayout();
  const navigate = useNavigate();
  const location = useLocation();

  const [unreadCount, setUnreadCount] = useState(0);

  // Close mobile sidebar on route change
  useEffect(() => {
    closeMobileSidebar();
  }, [location.pathname]);

  // Close mobile sidebar on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileSidebarOpen) {
        closeMobileSidebar();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileSidebarOpen, closeMobileSidebar]);

  // Sync unread announcements count
  useEffect(() => {
    let isMounted = true;
    const checkUnread = async () => {
      try {
        const [broadcastCount, notificationCount] = await Promise.all([
          broadcastsService.fetchUnreadCount(),
          notificationsService.fetchUnreadCount(),
        ]);
        if (isMounted) setUnreadCount(broadcastCount + notificationCount);
      } catch {
        // Ignore
      }
    };
    checkUnread();
    const interval = setInterval(checkUnread, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const navItems = [
    { to: '/', label: t('tab_home'), icon: LayoutDashboard },
    { to: '/tests', label: t('tab_tests'), icon: CheckCircle2 },
    { to: '/question-bank', label: t('tab_question_bank'), icon: BookOpen },
    { to: '/bookmarks', label: t('tab_bookmarks'), icon: Bookmark },
    { to: '/notes', label: t('tab_notes'), icon: FileText },
    { to: '/results', label: t('tab_results'), icon: BarChart2 },
    {
      to: '/notices',
      label: t('tab_notices'),
      icon: Bell,
      badge: unreadCount > 0 ? unreadCount : undefined,
    },
    { to: '/settings', label: t('tab_settings'), icon: Settings },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <>
      {/* ========================================================= */}
      {/* 1. DESKTOP SIDEBAR (Fixed left, width 240px <-> 68px)     */}
      {/* ========================================================= */}
      <aside
        className={`hidden lg:flex flex-col fixed top-0 left-0 bottom-0 z-40 bg-white dark:bg-[#221810] border-r border-slate-200/80 dark:border-[#38261a] transition-[width] duration-300 ease-in-out shadow-xs ${
          isSidebarCollapsed ? 'w-[68px]' : 'w-60'
        }`}
      >
        {/* Brand Header */}
        <div
          className={`h-16 flex items-center border-b border-slate-100 dark:border-[#332216] px-3.5 ${
            isSidebarCollapsed ? 'justify-center' : 'justify-between gap-2'
          }`}
        >
          <div
            onClick={isSidebarCollapsed ? toggleSidebarCollapsed : undefined}
            title={isSidebarCollapsed ? 'Expand sidebar' : undefined}
            className={`flex items-center gap-2.5 overflow-hidden min-w-0 ${
              isSidebarCollapsed ? 'cursor-pointer justify-center' : 'flex-1'
            }`}
          >
            <NavLink to="/" className="shrink-0 flex items-center group">
              <img
                src="/icon/small_Icon.png"
                alt="NUC Logo"
                className="w-9 h-9 object-contain rounded-xl shadow-xs border border-slate-200 dark:border-[#4a3424] p-0.5 bg-white shrink-0 group-hover:scale-105 transition-transform"
              />
            </NavLink>
            {!isSidebarCollapsed && (
              <div className="flex flex-col min-w-0 overflow-hidden">
                <span className="font-bold text-sm text-slate-900 dark:text-[#fde8d7] leading-tight truncate">
                  New Unique Computers
                </span>
                <span className="text-[10px] text-peach-500 dark:text-peach-300 font-semibold tracking-wide uppercase truncate">
                  MS-CIT Student
                </span>
              </div>
            )}
          </div>

          {!isSidebarCollapsed && (
            <button
              onClick={toggleSidebarCollapsed}
              aria-label="Collapse sidebar"
              title="Collapse sidebar"
              className="w-7 h-7 rounded-lg border border-slate-200 dark:border-[#4a3424] bg-slate-50 dark:bg-[#2a1f16] text-slate-500 dark:text-[#d9b89f] hover:text-slate-900 dark:hover:text-[#fde8d7] hover:bg-slate-100 dark:hover:bg-[#38291d] flex items-center justify-center shrink-0 transition-colors cursor-pointer shadow-xs"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group relative ${
                    isActive
                      ? 'bg-peach-50 dark:bg-peach-900/40 text-peach-600 dark:text-peach-200 shadow-xs border border-peach-200/60 dark:border-peach-800/60'
                      : 'text-slate-600 dark:text-[#d9b89f] hover:text-slate-900 dark:hover:text-[#fde8d7] hover:bg-slate-100 dark:hover:bg-[#2e2015]'
                  } ${isSidebarCollapsed ? 'justify-center px-2' : ''}`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        isActive
                          ? 'text-peach-600 dark:text-peach-300'
                          : 'text-slate-500 dark:text-[#bfa189] group-hover:text-slate-900 dark:group-hover:text-[#fde8d7]'
                      }`}
                    />
                    {!isSidebarCollapsed && (
                      <span className="truncate flex-1">{item.label}</span>
                    )}

                    {/* Unread badge */}
                    {item.badge !== undefined && !isSidebarCollapsed && (
                      <span className="ml-auto px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-red-500 text-white leading-none">
                        {item.badge}
                      </span>
                    )}

                    {/* Collapsed Hover Tooltip */}
                    {isSidebarCollapsed && (
                      <div className="pointer-events-none fixed left-[74px] hidden group-hover:flex items-center z-50">
                        <div className="bg-[#241a12] text-[#fde8d7] border border-[#443224] text-xs font-semibold px-2.5 py-1.5 rounded-lg shadow-lg whitespace-nowrap">
                          {item.label}
                          {item.badge !== undefined && ` (${item.badge})`}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* Bottom Expand / Collapse Toggle */}
        <div className="p-2 border-t border-slate-100 dark:border-[#332216]">
          <button
            onClick={toggleSidebarCollapsed}
            aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={`w-full flex items-center rounded-xl p-2.5 text-xs font-medium text-slate-500 dark:text-[#d9b89f] hover:text-slate-900 dark:hover:text-[#fde8d7] hover:bg-slate-100 dark:hover:bg-[#2e2015] transition-colors ${
              isSidebarCollapsed ? 'justify-center' : 'justify-between'
            }`}
          >
            {!isSidebarCollapsed && <span>Collapse Sidebar</span>}
            {isSidebarCollapsed ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <ChevronLeft className="w-5 h-5" />
            )}
          </button>
        </div>
      </aside>

      {/* ========================================================= */}
      {/* 2. MOBILE SIDEBAR DRAWER (Overlay + Slide-out Panel)      */}
      {/* ========================================================= */}
      {/* Backdrop */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 lg:hidden transition-opacity duration-300"
          onClick={closeMobileSidebar}
          aria-hidden="true"
        />
      )}

      {/* Slide-out Drawer */}
      <div
        className={`fixed top-0 bottom-0 left-0 w-72 bg-white dark:bg-[#221810] z-50 lg:hidden flex flex-col shadow-2xl transition-transform duration-300 ease-in-out transform border-r border-slate-200/80 dark:border-[#38261a] ${
          isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Drawer Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-100 dark:border-[#332216]">
          <NavLink
            to="/"
            onClick={closeMobileSidebar}
            className="flex items-center gap-3 overflow-hidden"
          >
            <img
              src="/icon/small_Icon.png"
              alt="NUC Logo"
              className="w-9 h-9 object-contain rounded-xl shadow-xs border border-slate-200 dark:border-[#4a3424] p-0.5 bg-white shrink-0"
            />
            <div className="flex flex-col">
              <span className="font-bold text-sm text-slate-900 dark:text-[#fde8d7] leading-tight">
                New Unique
              </span>
              <span className="text-[11px] text-peach-500 dark:text-peach-300 font-semibold">
                MS-CIT Student Portal
              </span>
            </div>
          </NavLink>

          <button
            onClick={closeMobileSidebar}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-[#d9b89f] dark:hover:text-[#fde8d7] hover:bg-slate-100 dark:hover:bg-[#2e2015] transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Student Profile Card (Mobile) */}
        {identity && (
          <div className="p-3.5 mx-3 my-3 rounded-2xl bg-peach-50/70 dark:bg-[#2c2016] border border-peach-200/60 dark:border-[#4a3424] flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-peach-500 dark:bg-peach-600 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
              {(identity.name || 'S').charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-xs text-slate-900 dark:text-[#fde8d7] truncate">
                {identity.name || 'Student'}
              </span>
              <span className="text-[11px] text-peach-600 dark:text-peach-300 font-mono font-medium truncate">
                PRN: {identity.studentId || identity.email || 'NUC'}
              </span>
            </div>
          </div>
        )}

        {/* Nav Links */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={closeMobileSidebar}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-peach-100 dark:bg-peach-900/50 text-peach-600 dark:text-peach-200 font-semibold shadow-xs'
                      : 'text-slate-700 dark:text-[#d9b89f] hover:bg-slate-100 dark:hover:bg-[#2e2015]'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-5 h-5 text-peach-500 dark:text-peach-300" />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-red-500 text-white">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* Bottom Sign Out */}
        <div className="p-4 border-t border-slate-100 dark:border-[#332216]">
          <button
            onClick={() => {
              closeMobileSidebar();
              handleSignOut();
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>{t('btn_sign_out')}</span>
          </button>
        </div>
      </div>
    </>
  );
};
