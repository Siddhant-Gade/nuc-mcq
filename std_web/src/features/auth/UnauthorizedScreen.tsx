import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, RefreshCw, Send, CheckCircle2, LogOut, Sparkles, Clock3, Loader2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { authService } from '../../services/authService';

export const UnauthorizedScreen: React.FC = () => {
  const { identity, status, refreshIdentity, signOut } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const isRevoked = identity?.accessStatus?.toUpperCase() === 'REVOKED';

  const [prn, setPrn] = useState(identity?.studentId || '');
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [autoInvoked, setAutoInvoked] = useState(false);

  // 1. Immediate Invoke: Automatically request access on mount if student is logged in
  useEffect(() => {
    let isMounted = true;

    const immediateInvokeAccess = async () => {
      // Check if user has an authenticated identity but lacks active status
      if (!isRevoked && identity?.authUserId && !autoInvoked) {
        setAutoInvoked(true);
        try {
          // Trigger immediate access request in background
          await authService.requestAccess(prn || undefined);
          if (isMounted) {
            setSubmitted(true);
            setMessage('Your access request was automatically submitted to the institute administration.');
          }
        } catch {
          // If request was already submitted or pending, proceed smoothly
          if (isMounted) {
            setSubmitted(true);
          }
        }
      }
    };

    immediateInvokeAccess();

    return () => {
      isMounted = false;
    };
  }, [identity?.authUserId, prn, autoInvoked, isRevoked]);

  // 2. Reactive Auto-Poll: Check every 5 seconds if admin has approved access
  useEffect(() => {
    if (status === 'authenticated') {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
      const timer = setTimeout(() => {
        navigate('/');
      }, 2500);
      return () => clearTimeout(timer);
    }

    const interval = setInterval(async () => {
      try {
        await refreshIdentity();
      } catch {
        // Silent poll error catch
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [status, refreshIdentity, navigate]);

  const handleRequestAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      if (identity?.authUserId) {
        await authService.requestAccess(prn);
      } else {
        await authService.submitPublicAccessRequest({
          prn: prn.trim(),
          email: identity?.email || undefined,
          name: identity?.name || undefined,
        });
      }
      setSubmitted(true);
      setMessage(t('request_submitted'));
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : 'Failed to submit request.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckStatus = async () => {
    setChecking(true);
    setMessage(null);
    try {
      const refreshedStatus = await refreshIdentity();
      if (refreshedStatus === 'authenticated') {
        setMessage('Access approved. Preparing your dashboard…');
      } else {
        setMessage('Access is still pending approval by the institute admin. Please wait.');
      }
    } catch {
      setMessage('Could not verify status. Please ensure you are logged in.');
    } finally {
      setChecking(false);
    }
  };

  if (status === 'authenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-slate-50 dark:bg-[#19120c]">
        <div className="max-w-md w-full p-8 rounded-3xl bg-white dark:bg-[#221810] border border-emerald-200 dark:border-emerald-900/60 text-center shadow-xl space-y-5">
          <div className="relative mx-auto w-16 h-16">
            <div className="absolute inset-0 rounded-full bg-emerald-100 dark:bg-emerald-950/50 animate-pulse" />
            <CheckCircle2 className="relative w-16 h-16 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-600 dark:text-emerald-400">
              Access approved
            </p>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Welcome to the Student Portal
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Your access has been approved. Preparing your dashboard…
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin text-emerald-600 dark:text-emerald-400" />
            Loading your account
          </div>
        </div>
      </div>
    );
  }

  if (isRevoked) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full p-8 rounded-3xl bg-white dark:bg-[#221810] border border-rose-200 dark:border-rose-900 text-center shadow-xl space-y-5">
          <ShieldAlert className="w-14 h-14 mx-auto text-rose-600" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Account deactivated</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Your account has been deactivated. Please contact the administrator.
          </p>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            Contact: {identity?.supportEmail || 'the administrator'}
          </p>
          <button
            type="button"
            onClick={() => void signOut()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-5 sm:space-y-6 bg-white dark:bg-[#221810] p-6 sm:p-8 rounded-2xl sm:rounded-3xl shadow-xl border border-slate-200 dark:border-[#443224] text-center transition-colors">
        <div className="inline-flex p-3.5 sm:p-4 rounded-2xl bg-peach-50 dark:bg-[#332014] border border-peach-200 dark:border-[#523321] text-peach-600 dark:text-peach-400">
          <ShieldAlert className="w-10 h-10 sm:w-12 sm:h-12" />
        </div>

        <div className="space-y-1.5 sm:space-y-2">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-[#fde8d7]">
            {t('request_access_title')}
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-[#d9b89f] leading-relaxed">
            {t('request_access_desc')}
          </p>
        </div>

        {/* Live Auto-Invoke Status Pill */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-peach-100/70 dark:bg-[#382315] text-peach-800 dark:text-peach-200 text-[11px] font-semibold border border-peach-200 dark:border-[#523321]">
          <Sparkles className="w-3.5 h-3.5 text-peach-600 dark:text-peach-400 animate-spin" />
          <span>Real-time access sync active • Auto checking</span>
        </div>

        {/* Identity Details Card */}
        {identity && (
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#2a1e15] border border-slate-200 dark:border-[#443224] text-left text-xs space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 dark:text-[#a8876e]">Student Name:</span>
              <span className="font-semibold text-slate-800 dark:text-[#fde8d7]">
                {identity.name || 'Student'}
              </span>
            </div>
            {identity.email && (
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-[#a8876e]">Email:</span>
                <span className="font-medium text-slate-800 dark:text-[#d9b89f] truncate max-w-[200px]">
                  {identity.email}
                </span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-slate-500 dark:text-[#a8876e]">Access Status:</span>
              <span className="px-2 py-0.5 rounded font-bold uppercase text-[10px] bg-amber-100 dark:bg-[#3d2917] text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50">
                {identity.accessStatus || 'PENDING'}
              </span>
            </div>
          </div>
        )}

        {message && !submitted && (
          <div className="p-3 rounded-xl bg-peach-50 dark:bg-[#2c1d13] border border-peach-200 dark:border-[#523321] text-peach-800 dark:text-peach-200 text-xs">
            {message}
          </div>
        )}

        {/* Request Form */}
        {!submitted ? (
          <form onSubmit={handleRequestAccess} className="space-y-3 text-left">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-[#d9b89f] mb-1">
                {t('input_prn')} (Optional if using Google)
              </label>
              <input
                type="text"
                value={prn}
                onChange={(e) => setPrn(e.target.value)}
                placeholder="e.g. 20260101"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-[#443224] bg-white dark:bg-[#19120c] text-slate-900 dark:text-[#fde8d7] text-sm focus:outline-none focus:ring-2 focus:ring-peach-500"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 rounded-xl bg-peach-600 hover:bg-peach-700 disabled:bg-peach-400 text-white font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              <Send className="w-4 h-4" />
              <span>{t('btn_request_access')}</span>
            </button>
          </form>
        ) : (
          <div className="p-5 rounded-2xl bg-amber-50 dark:bg-[#2f2415] border border-amber-200 dark:border-amber-900/60 text-left space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950/60">
                <Clock3 className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <span className="absolute inset-0 rounded-full border-2 border-amber-400/40 border-t-amber-600 animate-spin" />
              </div>
              <div>
                <p className="text-sm font-bold text-amber-900 dark:text-amber-200">Request submitted</p>
                <p className="text-xs text-amber-800/80 dark:text-amber-300/80">Waiting for institute approval</p>
              </div>
            </div>
            <p className="text-xs leading-relaxed text-amber-800 dark:text-amber-200">
              Keep this page open. We will automatically continue to your dashboard as soon as your access is approved.
            </p>
            <div className="h-1.5 overflow-hidden rounded-full bg-amber-200/70 dark:bg-amber-950/70">
              <div className="h-full w-1/3 rounded-full bg-amber-500 animate-[access-progress_2s_ease-in-out_infinite]" />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 pt-2">
          <button
            type="button"
            onClick={handleCheckStatus}
            disabled={checking}
            className="w-full py-2.5 px-4 rounded-xl border border-slate-300 dark:border-[#443224] hover:bg-slate-50 dark:hover:bg-[#2a1e15] text-slate-700 dark:text-[#d9b89f] font-semibold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
          >
            <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
            <span>{t('check_status')}</span>
          </button>

          <button
            type="button"
            onClick={async () => {
              await signOut();
              navigate('/login');
            }}
            className="w-full py-2 px-4 rounded-xl text-slate-500 dark:text-[#a8876e] hover:text-red-500 text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{t('btn_sign_out')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
