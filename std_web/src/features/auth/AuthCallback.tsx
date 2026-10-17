import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { authService } from '../../services/authService';

export const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const handleCallback = async () => {
      try {
        // Check for error parameters in query or hash
        const urlParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
        const errorDesc =
          urlParams.get('error_description') ||
          hashParams.get('error_description') ||
          urlParams.get('error') ||
          hashParams.get('error');

        if (errorDesc) {
          throw new Error(decodeURIComponent(errorDesc.replace(/\+/g, ' ')));
        }

        // Allow Supabase client a moment to parse hash into session
        let session = (await supabase.auth.getSession()).data.session;
        if (!session) {
          // Poll up to 2 seconds for session parsing
          for (let i = 0; i < 8; i++) {
            await new Promise((r) => setTimeout(r, 250));
            if (cancelled) return;
            session = (await supabase.auth.getSession()).data.session;
            if (session) break;
          }
        }

        if (!session) {
          throw new Error('Authentication session could not be established. Please try signing in again.');
        }

        // Authoritative verification and session exchange via backend /api/v1/auth/session
        const identity = await authService.exchangeTokenForSession(session.access_token);

        // Enforce boundary: Case B (Admin on student website)
        const isAdmin = identity.roles.includes('ADMIN') || identity.roles.includes('SUPER_ADMIN');
        const isStudent = identity.roles.includes('STUDENT');

        if (isAdmin && !isStudent) {
          await authService.signOut();
          if (!cancelled) {
            navigate('/login?error=Admin+accounts+cannot+access+the+Student+Portal.+Please+use+the+Admin+Portal.', {
              replace: true,
            });
          }
          return;
        }

        // Case A (Student on student website)
        const isBlocked =
          identity.accessStatus?.toUpperCase() === 'SUSPENDED' ||
          identity.accessStatus?.toUpperCase() === 'REVOKED' ||
          identity.accessStatus?.toUpperCase() === 'EXPIRED';

        if (!cancelled) {
          if (isStudent && !isBlocked) {
            navigate('/', { replace: true });
          } else {
            navigate('/unauthorized', { replace: true });
          }
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : 'Authentication failed.';
          setErrorMessage(msg);
          setTimeout(() => {
            navigate(`/login?error=${encodeURIComponent(msg)}`, { replace: true });
          }, 2000);
        }
      }
    };

    void handleCallback();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
      <div className="max-w-md w-full text-center space-y-4 bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          {errorMessage ? 'Authentication Problem' : 'Completing Sign-In...'}
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {errorMessage ? errorMessage : 'Verifying your student identity and establishing your session...'}
        </p>
      </div>
    </div>
  );
};
