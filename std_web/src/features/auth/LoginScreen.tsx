import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { LogIn, UserPlus, AlertCircle, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { renderGoogleSignInButton } from '../../lib/googleAuth';

export const LoginScreen: React.FC = () => {
  const {
    signInWithPrn,
    signUpWithPrn,
    signInWithGoogle,
    signInWithGoogleCredential,
    error,
    clearError,
  } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [prn, setPrn] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [gisReady, setGisReady] = useState(false);
  const googleBtnContainerRef = useRef<HTMLDivElement>(null);

  // Check URL query parameters for callback error messages
  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam) {
      setLocalError(decodeURIComponent(errorParam));
    }
  }, [searchParams]);

  // Attempt to render the official Google Identity Services button
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let attempts = 0;

    const tryRender = () => {
      attempts++;
      if (googleBtnContainerRef.current) {
        const rendered = renderGoogleSignInButton(
          googleBtnContainerRef.current,
          async (credential) => {
            clearError();
            setLocalError(null);
            setGoogleLoading(true);
            try {
              await signInWithGoogleCredential(credential);
              navigate('/');
            } catch (err: unknown) {
              setLocalError(err instanceof Error ? err.message : 'Google sign-in failed.');
            } finally {
              setGoogleLoading(false);
            }
          }
        );
        if (rendered) {
          setGisReady(true);
          if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
          }
        }
      }
      if (attempts > 20 && intervalId) {
        clearInterval(intervalId);
      }
    };

    tryRender();
    if (typeof window !== 'undefined' && !window.google?.accounts?.id) {
      intervalId = setInterval(tryRender, 300);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [clearError, navigate, signInWithGoogleCredential]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setLocalError(null);

    const trimmedPrn = prn.trim();
    if (!trimmedPrn) {
      setLocalError('Please enter your PRN or Roll Number.');
      return;
    }
    if (!password) {
      setLocalError('Please enter your password.');
      return;
    }

    if (mode === 'signup') {
      if (password.length < 6) {
        setLocalError('Password must be at least 6 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setLocalError('Passwords do not match.');
        return;
      }
    }

    setSubmitting(true);
    try {
      if (mode === 'signin') {
        await signInWithPrn(trimmedPrn, password);
      } else {
        await signUpWithPrn(trimmedPrn, password);
      }
      navigate('/');
    } catch (err: unknown) {
      setLocalError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    clearError();
    setLocalError(null);
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      setLocalError(err instanceof Error ? err.message : 'Google sign-in failed.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const displayedError = localError || error;

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 transition-colors">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-100 dark:border-indigo-900 shadow-sm">
            <img src="/icon/small_Icon.png" alt="NUC Logo" className="w-12 h-12 rounded-xl object-contain" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {t('institute_name')}
          </h2>
          <p className="text-sm text-indigo-600 dark:text-indigo-400 font-medium">
            {t('course_name')}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setMode('signin');
              setLocalError(null);
            }}
            className={`py-2 rounded-lg transition-all ${
              mode === 'signin'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {t('btn_sign_in')}
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setLocalError(null);
            }}
            className={`py-2 rounded-lg transition-all ${
              mode === 'signup'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {t('create_account')}
          </button>
        </div>

        {/* Error Notification */}
        {displayedError && (
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
            <div className="flex-1 leading-relaxed">{displayedError}</div>
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {t('input_prn')}
            </label>
            <div className="relative">
              <input
                type="text"
                value={prn}
                onChange={(e) => setPrn(e.target.value)}
                placeholder="e.g. 20260101 or student@gmail.com"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {t('input_password')}
            </label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
              />
            </div>
          </div>

          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold text-sm shadow-md shadow-indigo-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {submitting ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : mode === 'signin' ? (
              <>
                <LogIn className="w-4 h-4" />
                <span>{t('btn_sign_in')}</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Set Password & Sign In</span>
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200 dark:border-slate-800" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white dark:bg-slate-900 px-3 text-slate-400 font-medium">Or continue with</span>
          </div>
        </div>

        {/* Google Sign-In Container */}
        <div className="space-y-3">
          {/* Official Google Identity Services Button Container */}
          <div
            ref={googleBtnContainerRef}
            className={gisReady ? 'flex justify-center w-full min-h-[40px] [&>div]:w-full' : 'hidden'}
          />

          {/* Fallback Google Button shown ONLY when GIS is unavailable */}
          {!gisReady && (
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              className="w-full py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-sm shadow-sm transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50"
            >
              {googleLoading ? (
                <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>{t('btn_sign_in_google')}</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Footer info & link */}
        <div className="pt-4 text-center">
          <Link
            to="/unauthorized"
            className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 font-medium"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Admission pending? Request Access here</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
