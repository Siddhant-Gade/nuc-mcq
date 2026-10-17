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
  refreshIdentity: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<AuthStatus>('checking');
  const [identity, setIdentity] = useState<StudentIdentity | null>(null);
  const [error, setError] = useState<string | null>(null);

  const verifyCurrentSession = useCallback(async () => {
    try {
      const res = await authService.restoreSession();
      setStatus(res.status);
      setIdentity(res.identity);
      if (res.error) {
        setError(res.error);
      }
      if (res.status === 'authenticated' && res.identity) {
        resultsService.setStudentContext(res.identity.authUserId || res.identity.studentId || '');
        void resultsService.syncFromBackend();
      }
    } catch (e: unknown) {
      console.warn('[AuthContext] Verification failed:', e);
      setStatus('unauthenticated');
      setIdentity(null);
    }
  }, []);

  useEffect(() => {
    verifyCurrentSession();

    const handleBlocked = (e: Event) => {
      const custom = e as CustomEvent<{ code?: string; message?: string }>;
      const code = custom.detail?.code;
      if (
        code === 'STUDENT_ACCESS_SUSPENDED' ||
        code === 'STUDENT_ACCESS_REVOKED' ||
        code === 'STUDENT_ACCESS_EXPIRED'
      ) {
        const statusClean = code.replace('STUDENT_ACCESS_', '');
        setIdentity((prev) => (prev ? { ...prev, accessStatus: statusClean } : null));
        setStatus('unauthorized');
      }
    };
    window.addEventListener('nuc_student_access_blocked', handleBlocked);

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        await verifyCurrentSession();
      } else if (event === 'SIGNED_OUT') {
        setStatus('unauthenticated');
        setIdentity(null);
      }
    });

    return () => {
      window.removeEventListener('nuc_student_access_blocked', handleBlocked);
      authListener.subscription.unsubscribe();
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

  const refreshIdentity = useCallback(async () => {
    await verifyCurrentSession();
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
