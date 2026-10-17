import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, RefreshCw, Send, CheckCircle2, LogOut } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { authService } from '../../services/authService';

export const UnauthorizedScreen: React.FC = () => {
  const { identity, status, refreshIdentity, signOut } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [prn, setPrn] = useState(identity?.studentId || '');
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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
      await refreshIdentity();
      if (status === 'authenticated') {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
        setTimeout(() => {
          navigate('/');
        }, 1200);
      } else {
        setMessage('Access is still pending approval by the institute admin. Please wait.');
      }
    } catch {
      setMessage('Could not verify status. Please ensure you are logged in.');
    } finally {
      setChecking(false);
    }
  };

  const isSuspended = identity?.accessStatus?.toUpperCase() === 'SUSPENDED';
  const isRevoked = identity?.accessStatus?.toUpperCase() === 'REVOKED';
  const isExpired = identity?.accessStatus?.toUpperCase() === 'EXPIRED';
  const isBlocked = isSuspended || isRevoked || isExpired;

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 text-center transition-colors">
        <div
          className={`inline-flex p-4 rounded-2xl border ${
            isSuspended || isRevoked
              ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400'
              : 'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-900 text-amber-600 dark:text-amber-400'
          }`}
        >
          <ShieldAlert className="w-12 h-12" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {isSuspended
              ? 'Account Suspended'
              : isRevoked
              ? 'Access Revoked'
              : isExpired
              ? 'Access Expired'
              : t('request_access_title')}
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            {isSuspended
              ? 'Your student account has been temporarily suspended by the institute administration. Access to practice tests and exam features is halted. Please contact your administrator.'
              : isRevoked
              ? 'Your student access has been revoked by the institute administrator. Please contact your training center.'
              : isExpired
              ? 'Your admission period or course access has expired. Please contact the administrator to renew your enrollment.'
              : t('request_access_desc')}
          </p>
        </div>

        {/* Identity Details Card */}
        {identity && (
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-left text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Student Name:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {identity.name || 'Student'}
              </span>
            </div>
            {identity.studentId && (
              <div className="flex justify-between">
                <span className="text-slate-500">Student ID / PRN:</span>
                <span className="font-mono text-slate-800 dark:text-slate-200">
                  {identity.studentId}
                </span>
              </div>
            )}
            {identity.email && (
              <div className="flex justify-between">
                <span className="text-slate-500">Email:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[200px]">
                  {identity.email}
                </span>
              </div>
            )}
            <div className="flex justify-between items-center pt-1">
              <span className="text-slate-500">Access Status:</span>
              <span
                className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
                  isSuspended || isRevoked
                    ? 'bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300'
                    : 'bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300'
                }`}
              >
                {identity.accessStatus || 'PENDING'}
              </span>
            </div>
            {identity.suspensionReason && (
              <div className="pt-1.5 border-t border-slate-200 dark:border-slate-700 text-rose-600 dark:text-rose-400">
                <span className="font-semibold">Reason: </span>
                <span>{identity.suspensionReason}</span>
              </div>
            )}
          </div>
        )}

        {message && (
          <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-900 text-indigo-700 dark:text-indigo-300 text-xs">
            {message}
          </div>
        )}

        {/* Request Form (Only if not suspended/revoked/expired) */}
        {!isBlocked && (
          !submitted ? (
            <form onSubmit={handleRequestAccess} className="space-y-3 text-left">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t('input_prn')} (Optional if using Google)
                </label>
                <input
                  type="text"
                  value={prn}
                  onChange={(e) => setPrn(e.target.value)}
                  placeholder="e.g. 20260101"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>{t('btn_request_access')}</span>
              </button>
            </form>
          ) : (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span>Request registered! You will be admitted once the admin approves.</span>
            </div>
          )
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 pt-2">
          <button
            type="button"
            onClick={handleCheckStatus}
            disabled={checking}
            className="w-full py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
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
            className="w-full py-2 px-4 rounded-xl text-slate-500 hover:text-red-600 text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{t('btn_sign_out')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
