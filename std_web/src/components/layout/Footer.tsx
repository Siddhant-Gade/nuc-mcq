import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

export const Footer: React.FC = () => {
  const { t } = useLanguage();

  return (
    <footer className="mt-auto border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-6 text-slate-500 dark:text-slate-400 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <img src="/icon/small_Icon.png" alt="NUC" className="w-5 h-5 rounded" />
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            {t('institute_name')}
          </span>
          <span>•</span>
          <span>{t('course_name')}</span>
        </div>
        <p className="text-center sm:text-right">
          © {new Date().getFullYear()} New Unique Computers. All rights reserved.
        </p>
      </div>
    </footer>
  );
};
