import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Cookie,
  Lock,
  Clock,
  Sliders,
  RotateCcw,
  CheckCircle,
  Check,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const COOKIE_STORAGE_KEY = 'nuc_cookie_consent';

interface ConsentRecord {
  necessary: boolean;
  uiPreferences: boolean;
  analytics: boolean;
  timestamp?: string;
  version?: string;
}

export const SessionsAndCookies: React.FC = () => {
  const { identity } = useAuth();
  const [consent, setConsent] = useState<ConsentRecord | null>(null);
  const [resetMessage, setResetMessage] = useState(false);

  const loadConsent = () => {
    try {
      const stored = localStorage.getItem(COOKIE_STORAGE_KEY);
      if (stored) {
        setConsent(JSON.parse(stored));
      } else {
        setConsent({
          necessary: true,
          uiPreferences: true,
          analytics: true,
        });
      }
    } catch {
      setConsent({
        necessary: true,
        uiPreferences: true,
        analytics: true,
      });
    }
  };

  useEffect(() => {
    loadConsent();

    const handleUpdate = () => loadConsent();
    window.addEventListener('storage', handleUpdate);
    return () => window.removeEventListener('storage', handleUpdate);
  }, []);

  const handleOpenConsent = () => {
    window.dispatchEvent(new CustomEvent('open_cookie_consent'));
  };

  const handleResetConsent = () => {
    try {
      localStorage.removeItem(COOKIE_STORAGE_KEY);
    } catch {
      // Ignore
    }
    setConsent(null);
    setResetMessage(true);
    setTimeout(() => {
      setResetMessage(false);
      handleOpenConsent();
    }, 800);
  };

  return (
    <div className="p-6 rounded-3xl bg-white dark:bg-[#221810] border border-slate-200 dark:border-[#443224] shadow-sm space-y-5 transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-50 dark:bg-[#35271d] text-indigo-600 dark:text-peach-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-[#fde8d7]">
              Sessions & Cookies Security
            </h3>
            <p className="text-xs text-slate-500 dark:text-[#a8876e]">
              Manage portal session lifetime, security tokens, and cookie preferences
            </p>
          </div>
        </div>

        {/* Active Session Status Badge */}
        <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/60 shadow-2xs">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          Active Session
        </span>
      </div>

      {/* Portal Session Details Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#2a1f16] border border-slate-200/80 dark:border-[#38281d] flex flex-col justify-between space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 dark:text-[#a8876e] font-medium flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-indigo-500 dark:text-peach-400" />
              Session Storage
            </span>
            <span className="text-[10px] uppercase font-bold text-indigo-600 dark:text-peach-400 bg-indigo-50 dark:bg-[#35271d] px-2 py-0.5 rounded-md">
              HttpOnly Secure
            </span>
          </div>
          <p className="text-slate-800 dark:text-[#fde8d7] font-semibold text-xs pt-1">
            Server-managed session bound to PRN {identity?.studentId || 'N/A'}. Protected against XSS and exfiltration.
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#2a1f16] border border-slate-200/80 dark:border-[#38281d] flex flex-col justify-between space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 dark:text-[#a8876e] font-medium flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-500 dark:text-peach-400" />
              Inactivity Timeout
            </span>
            <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md">
              30 Min Idle
            </span>
          </div>
          <p className="text-slate-800 dark:text-[#fde8d7] font-semibold text-xs pt-1">
            Inactive sessions expire automatically. Max lifespan is 7 days with active usage.
          </p>
        </div>
      </div>

      {/* Cookies Breakdown List */}
      <div className="space-y-2.5 pt-1">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-[#8c6f59]">
          Configured Cookie Categories
        </span>

        <div className="space-y-2">
          {/* 1. Essential */}
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#2a1f16] border border-slate-200/70 dark:border-[#38281d] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-100/70 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Check className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-[#fde8d7] block">
                  Essential Security & Sessions
                </span>
                <span className="text-[11px] text-slate-500 dark:text-[#a8876e]">
                  Maintains encrypted authentication, PRN binding, and CSRF token security
                </span>
              </div>
            </div>
            <span className="shrink-0 text-[10px] font-extrabold uppercase px-2 py-1 rounded bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300">
              Always Active
            </span>
          </div>

          {/* 2. UI Preferences */}
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#2a1f16] border border-slate-200/70 dark:border-[#38281d] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-indigo-100/70 dark:bg-[#35271d] text-indigo-600 dark:text-peach-400 flex items-center justify-center shrink-0">
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-[#fde8d7] block">
                  Interface & Learning Preferences
                </span>
                <span className="text-[11px] text-slate-500 dark:text-[#a8876e]">
                  Saves theme mode, language selection, and navigation layout
                </span>
              </div>
            </div>
            <span
              className={`shrink-0 text-[10px] font-extrabold uppercase px-2 py-1 rounded ${
                consent?.uiPreferences !== false
                  ? 'bg-indigo-100 dark:bg-[#35271d] text-indigo-700 dark:text-peach-300'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              {consent?.uiPreferences !== false ? 'Enabled' : 'Disabled'}
            </span>
          </div>

          {/* 3. Performance & Offline Cache */}
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#2a1f16] border border-slate-200/70 dark:border-[#38281d] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-indigo-100/70 dark:bg-[#35271d] text-indigo-600 dark:text-peach-400 flex items-center justify-center shrink-0">
                <Cookie className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-[#fde8d7] block">
                  Performance & Offline Cache
                </span>
                <span className="text-[11px] text-slate-500 dark:text-[#a8876e]">
                  Enables local question caching for offline reliability and fast exam loading
                </span>
              </div>
            </div>
            <span
              className={`shrink-0 text-[10px] font-extrabold uppercase px-2 py-1 rounded ${
                consent?.analytics !== false
                  ? 'bg-indigo-100 dark:bg-[#35271d] text-indigo-700 dark:text-peach-300'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              {consent?.analytics !== false ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        </div>
      </div>

      {resetMessage && (
        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2 animate-fade-in">
          <CheckCircle className="w-4 h-4" />
          <span>Cookie preferences reset. Opening preference manager...</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={handleResetConsent}
          className="text-xs text-slate-500 dark:text-[#a8876e] hover:text-red-600 dark:hover:text-red-400 flex items-center gap-1.5 transition-colors cursor-pointer py-1.5"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Cookie Preferences</span>
        </button>

        <button
          type="button"
          onClick={handleOpenConsent}
          className="py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-peach-500 dark:hover:bg-peach-600 text-white dark:text-[#19120c] font-bold text-xs flex items-center gap-2 shadow-xs transition-all cursor-pointer"
        >
          <Sliders className="w-4 h-4" />
          <span>Customize Cookie & Session Settings</span>
        </button>
      </div>
    </div>
  );
};

export default SessionsAndCookies;
