import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  CheckCircle2,
  BookOpen,
  FileText,
  User,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export const MobileBottomNav: React.FC = () => {
  const { t } = useLanguage();
  const location = useLocation();

  // Hide persistent bottom nav when taking active test to give maximum screen space
  if (location.pathname.startsWith('/test/')) {
    return null;
  }

  const navItems = [
    {
      to: '/',
      label: t('tab_home') || 'Home',
      icon: LayoutDashboard,
      isActive: location.pathname === '/',
    },
    {
      to: '/tests',
      label: t('tab_tests') || 'Exams',
      icon: CheckCircle2,
      isActive: location.pathname.startsWith('/tests'),
    },
    {
      to: '/question-bank',
      label: t('tab_question_bank') || 'Practice',
      icon: BookOpen,
      isActive: location.pathname.startsWith('/question-bank'),
    },
    {
      to: '/notes',
      label: t('tab_notes') || 'Notes',
      icon: FileText,
      isActive: location.pathname.startsWith('/notes'),
    },
    {
      to: '/settings',
      label: t('tab_settings') || 'Profile',
      icon: User,
      isActive: location.pathname.startsWith('/settings'),
    },
  ];

  return (
    <nav
      aria-label="Mobile Navigation"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#1a120b]/95 backdrop-blur-md border-t border-slate-200/80 dark:border-[#3d271d] shadow-[0_-4px_24px_rgba(0,0,0,0.08)] dark:shadow-[0_-4px_24px_rgba(0,0,0,0.5)] transition-colors safe-area-bottom"
    >
      <div className="grid grid-cols-5 h-16 max-w-md mx-auto px-1 items-center">
        {navItems.map((item) => {
          const IconComponent = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center justify-center gap-1 transition-all select-none py-1 min-h-[48px] touch-manipulation active:scale-95 ${
                item.isActive
                  ? 'text-peach-600 dark:text-peach-300 font-bold'
                  : 'text-slate-500 dark:text-[#a8876e] hover:text-slate-800 dark:hover:text-[#fde8d7] font-medium'
              }`}
            >
              <div
                className={`p-1.5 rounded-xl transition-all ${
                  item.isActive
                    ? 'bg-peach-100/80 dark:bg-peach-900/50 shadow-xs'
                    : 'bg-transparent'
                }`}
              >
                <IconComponent className="w-5 h-5 shrink-0" />
              </div>
              <span className="text-[10px] leading-tight tracking-tight truncate max-w-full px-0.5">
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
