import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

export const Footer: React.FC = () => {
  const { t } = useLanguage();

  const handleOpenCookiePreferences = () => {
    window.dispatchEvent(new CustomEvent('open_cookie_consent'));
  };

  return (
    <footer className="mt-auto border-t border-slate-200 dark:border-[#332216] bg-white dark:bg-[#1a120b] py-6 text-slate-500 dark:text-[#a8876e] text-xs transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
        <div className="flex items-center justify-center gap-2">
          <img src="/icon/small_Icon.png" alt="NUC" className="w-5 h-5 rounded" />
          <span className="font-semibold text-slate-700 dark:text-[#fde8d7]">
            {t('institute_name')}
          </span>
          <span>•</span>
          <span>{t('course_name')}</span>
        </div>
        <div className="flex flex-wrap items-center justify-center sm:justify-end gap-x-4 gap-y-1">
          <button
            type="button"
            onClick={handleOpenCookiePreferences}
            className="hover:text-indigo-600 dark:hover:text-peach-400 underline underline-offset-2 transition-colors cursor-pointer"
          >
            Cookie & Session Preferences
          </button>
          <span>•</span>
          <p>
            © {new Date().getFullYear()} New Unique Computers. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};
