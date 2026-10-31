import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Globe,
  Moon,
  Sun,
  Trash2,
  LogOut,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { Language } from '../../types';
import { resultsService } from '../../services/resultsService';
import { bookmarksService } from '../../services/bookmarksService';
import { SessionsAndCookies } from '../../components/common/SessionsAndCookies';

export const SettingsScreen: React.FC = () => {
  const { identity, signOut } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  const [cacheCleared, setCacheCleared] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  const handleClearCache = () => {
    localStorage.removeItem('cached_offline_question_bank_v2');
    resultsService.clear();
    bookmarksService.clearAll();
    setCacheCleared(true);
    setTimeout(() => setCacheCleared(false), 3000);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto animate-fade-in pb-16">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white">
          {t('settings_title')}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Manage your profile information, language, and display preferences.
        </p>
      </div>

      {/* Student Profile Card */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-xl shadow-md">
            {(identity?.name || 'S').charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {identity?.name || 'Student'}
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-xs text-slate-500 font-mono">
                PRN: {identity?.studentId || 'N/A'}
              </p>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-900/60">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                </span>
                Active session
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <span className="text-slate-500 block mb-1">Batch / Class</span>
            <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
              {identity?.batchName || 'General Batch'}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <span className="text-slate-500 block mb-1">Registered Email</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm truncate block">
              {identity?.email || 'N/A'}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <span className="text-slate-500 block mb-1">Institute</span>
            <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
              New Unique Computers
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <span className="text-slate-500 block mb-1">Access Status</span>
            <span className="px-2 py-0.5 rounded font-extrabold text-[10px] uppercase bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-400">
              {identity?.accessStatus || 'ACTIVE'}
            </span>
          </div>
        </div>
      </div>

      {/* Language Preference */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              {t('app_language')}
            </h3>
            <p className="text-xs text-slate-500">
              Select your preferred language for questions and app interface
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { code: 'en' as Language, title: 'English', sub: 'Default' },
            { code: 'mr' as Language, title: 'मराठी', sub: 'Marathi' },
            { code: 'hi' as Language, title: 'हिंदी', sub: 'Hindi' },
          ].map((lang) => (
            <button
              key={lang.code}
              onClick={() => setLanguage(lang.code)}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                language === lang.code
                  ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/50 text-indigo-950 dark:text-indigo-200 font-bold shadow-sm ring-2 ring-indigo-500/20'
                  : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
              }`}
            >
              <div className="text-sm font-bold">{lang.title}</div>
              <div className="text-[11px] text-slate-400">{lang.sub}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Appearance / Theme */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600">
            <Moon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              {t('theme_mode')}
            </h3>
            <p className="text-xs text-slate-500">
              Choose between light and dark themes
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setTheme('light')}
            className={`p-4 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
              theme === 'light'
                ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/50 text-indigo-950 dark:text-indigo-200 font-bold shadow-sm ring-2 ring-indigo-500/20'
                : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
            }`}
          >
            <Sun className="w-5 h-5 text-amber-500" />
            <div>
              <div className="text-sm font-bold">{t('theme_light')}</div>
              <div className="text-[10px] text-slate-400">Bright and clear</div>
            </div>
          </button>

          <button
            onClick={() => setTheme('dark')}
            className={`p-4 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
              theme === 'dark'
                ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/50 text-indigo-950 dark:text-indigo-200 font-bold shadow-sm ring-2 ring-indigo-500/20'
                : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
            }`}
          >
            <Moon className="w-5 h-5 text-indigo-400" />
            <div>
              <div className="text-sm font-bold">{t('theme_dark')}</div>
              <div className="text-[10px] text-slate-400">Reduced eye strain</div>
            </div>
          </button>
        </div>
      </div>

      {/* Sessions & Cookies Component */}
      <SessionsAndCookies />

      {/* Storage & Clear Cache */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div>
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">
            Data & Storage
          </h3>
          <p className="text-xs text-slate-500">
            Manage local offline cache and test records
          </p>
        </div>

        {cacheCleared && (
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{t('cache_cleared')}</span>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
          <div className="text-xs text-slate-500 max-w-sm">
            Clears locally cached offline question banks and test attempts. Cloud-synced tests will be refreshed automatically.
          </div>
          <button
            onClick={handleClearCache}
            className="py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4 text-red-500" />
            <span>{t('clear_cache')}</span>
          </button>
        </div>
      </div>

      {/* Sign Out Action */}
      <div className="pt-2">
        <button
          onClick={() => setShowSignOutConfirm(true)}
          className="w-full py-3 px-4 rounded-2xl bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-950/70 text-red-600 dark:text-red-400 font-bold text-sm border border-red-200 dark:border-red-900/60 flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>{t('btn_sign_out')}</span>
        </button>
      </div>

      {/* Sign Out Confirmation Dialog */}
      {showSignOutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/80 text-red-600 mx-auto flex items-center justify-center">
              <LogOut className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                {t('btn_sign_out')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('confirm_sign_out')}
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowSignOutConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 cursor-pointer"
              >
                {t('btn_cancel')}
              </button>
              <button
                type="button"
                onClick={handleSignOut}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all cursor-pointer"
              >
                {t('btn_sign_out')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
