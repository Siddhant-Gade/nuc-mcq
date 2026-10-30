import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { authService } from '../services/authService';
import { resultsService } from '../services/resultsService';
import { StudentIdentity } from '../types';

export type AuthStatus = 'checking' | 'authenticated' | 'unauthorized' | 'unauthenticated';

interface AuthContextType {
  status: AuthStatus;
  identity: StudentIdentity | null;
  error: string | null;
  signInWithPrn: (prn: string, pass: string) => Promise<void>;
  signUpWithPrn: (prn: string, pass: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithGoogleCredential: (credential: string) => Promise<void>;
  signOut: () => Promise<void>;
  requestAccess: (prn?: string) => Promise<boolean>;
  refreshIdentity: () => Promise<AuthStatus>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<AuthStatus>('checking');
  const [identity, setIdentity] = useState<StudentIdentity | null>(null);
  const [error, setError] = useState<string | null>(null);

  const statusRef = React.useRef(status);
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const verifyCurrentSession = useCallback(async (): Promise<AuthStatus> => {
    try {
      // Authoritatively verify the active HttpOnly cookie session from the server
      const verified = await authService.getSessionIdentity();
      if (!verified) {
        setStatus('unauthenticated');
        setIdentity(null);
        return 'unauthenticated';
      }

      // Case B: Admin account signed in on the student website
      const isAdmin = verified.roles?.includes('ADMIN') || verified.roles?.includes('SUPER_ADMIN');
      const isStudent = verified.roles?.includes('STUDENT');

      if (isAdmin && !isStudent) {
        // Clear unauthorized admin session from student portal storage
        await authService.signOut();
        setStatus('unauthenticated');
        setIdentity(null);
        setError('Admin accounts cannot access the Student Portal. Please use the Admin Portal.');
        return 'unauthenticated';
      }

      setIdentity(verified);

      // Check if student access is revoked or expired
      if (verified.accessStatus?.toUpperCase() === 'REVOKED') {
        setStatus('unauthorized');
        setError('Access revoked, contact administrator.');
        return 'unauthorized';
      }

      if (verified.accessStatus?.toUpperCase() === 'EXPIRED') {
        setStatus('unauthorized');
        setError('Access expired. Please contact the administrator.');
        return 'unauthorized';
      }

      if (isStudent && verified.accessStatus?.toUpperCase() === 'ACTIVE') {
        setStatus('authenticated');
        resultsService.setStudentContext(verified.authUserId || verified.studentId);
        void resultsService.syncFromBackend();
        return 'authenticated';
      } else {
        setStatus('unauthorized');
        return 'unauthorized';
      }
    } catch (e: unknown) {
      console.warn('[AuthContext] Verification failed:', e);
      const httpStatus = (e as { response?: { status?: number } })?.response?.status;
      const errData = (e as { response?: { data?: { error?: { code?: string; message?: string } } } })?.response?.data;

      if (errData?.error?.message?.includes('Access revoked') || errData?.error?.code === 'STUDENT_ACCESS_REVOKED') {
        setError('Access revoked, contact administrator.');
        setStatus('unauthorized');
        return 'unauthorized';
      }

      const isAuthRejection = httpStatus === 401;

      if (isAuthRejection) {
        // Explicitly rejected session/token
        await authService.signOut().catch(() => {});
        setStatus('unauthenticated');
        setIdentity(null);
        return 'unauthenticated';
      } else {
        // Preserve state on network error or server startup
        const nextStatus = httpStatus === 403 ? 'unauthorized' : 'unauthenticated';
        setStatus(nextStatus);
        return nextStatus;
      }
    }
  }, []);

  useEffect(() => {
    verifyCurrentSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_IN') {
        await verifyCurrentSession();
      } else if (event === 'SIGNED_OUT') {
        setStatus('unauthenticated');
        setIdentity(null);
      }
    });

    const onAccessBlocked = (event: Event) => {
      const detail = (event as CustomEvent<{ code?: string; message?: string }>).detail;
      if (detail?.code === 'STUDENT_ACCESS_REVOKED' || detail?.message?.includes('Access revoked')) {
        setError('Access revoked, contact administrator.');
      } else if (detail?.message) {
        setError(detail.message);
      }
      setStatus('unauthorized');
    };

    const onSessionExpired = (event: Event) => {
      const detail = (event as CustomEvent<{ message?: string }>).detail;
      setError(detail?.message || 'Session expired due to inactivity. Please sign in again.');
      setStatus('unauthenticated');
      setIdentity(null);
      void authService.signOut().catch(() => {});
    };

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && statusRef.current === 'authenticated') {
        await verifyCurrentSession();
      }
    };

    window.addEventListener('nuc_student_access_blocked', onAccessBlocked);
    window.addEventListener('nuc_session_expired', onSessionExpired);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      authListener.subscription.unsubscribe();
      window.removeEventListener('nuc_student_access_blocked', onAccessBlocked);
      window.removeEventListener('nuc_session_expired', onSessionExpired);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [verifyCurrentSession]);

  const signInWithPrn = useCallback(async (prn: string, pass: string) => {
    setError(null);
    setStatus('checking');
    try {
      await authService.signInWithPrn(prn, pass);
      await verifyCurrentSession();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign in failed.';
      setError(msg);
      setStatus('unauthenticated');
      throw err;
    }
  }, [verifyCurrentSession]);

  const signUpWithPrn = useCallback(async (prn: string, pass: string) => {
    setError(null);
    setStatus('checking');
    try {
      await authService.signUpWithPrn(prn, pass);
      await verifyCurrentSession();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed.';
      setError(msg);
      setStatus('unauthenticated');
      throw err;
    }
  }, [verifyCurrentSession]);

  const signInWithGoogle = useCallback(async () => {
    setError(null);
    try {
      await authService.signInWithGoogle();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google sign-in failed.';
      setError(msg);
      throw err;
    }
  }, []);

  const signInWithGoogleCredential = useCallback(async (credential: string) => {
    setError(null);
    setStatus('checking');
    try {
      await authService.signInWithGoogleCredential(credential);
      await verifyCurrentSession();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google sign-in failed.';
      setError(msg);
      setStatus('unauthenticated');
      throw err;
    }
  }, [verifyCurrentSession]);

  const signOut = useCallback(async () => {
    resultsService.clear();
    await authService.signOut();
    setStatus('unauthenticated');
    setIdentity(null);
    setError(null);
  }, []);

  const requestAccess = useCallback(async (prn?: string): Promise<boolean> => {
    return await authService.requestAccess(prn);
  }, []);

  const refreshIdentity = useCallback(async (): Promise<AuthStatus> => {
    return verifyCurrentSession();
  }, [verifyCurrentSession]);

  const clearError = useCallback(() => setError(null), []);

  return (
    <AuthContext.Provider
      value={{
        status,
        identity,
        error,
        signInWithPrn,
        signUpWithPrn,
        signInWithGoogle,
        signInWithGoogleCredential,
        signOut,
        requestAccess,
        refreshIdentity,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
