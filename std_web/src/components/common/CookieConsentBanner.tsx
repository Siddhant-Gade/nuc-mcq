import React, { useState, useEffect } from 'react';
import { Cookie } from 'lucide-react';

const COOKIE_CONSENT_KEY = 'nuc_cookie_consent';

export const CookieConsentBanner: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
      if (!consent) {
        setVisible(true);
      }
    } catch {
      // Ignore storage access errors
    }
  }, []);

  const handleChoice = (accepted: boolean) => {
    try {
      localStorage.setItem(COOKIE_CONSENT_KEY, accepted ? 'accepted' : 'rejected');
    } catch {
      // Ignore
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="Cookie consent banner"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-lg z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xl animate-fade-in transition-all"
    >
      <div className="flex items-start gap-3.5">
        <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-900 text-indigo-600 dark:text-indigo-400 shrink-0">
          <Cookie className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
            Cookie & Session Preferences
          </h4>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            We use essential cookies to maintain your authenticated student session and keep test progress secure. You can choose whether to enable optional cookies.
          </p>
        </div>
      </div>

      <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80">
        <button
          type="button"
          onClick={() => handleChoice(false)}
          className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors cursor-pointer text-center"
        >
          Reject optional cookies
        </button>
        <button
          type="button"
          onClick={() => handleChoice(true)}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer text-center"
        >
          Accept optional cookies
        </button>
      </div>
    </div>
  );
};
