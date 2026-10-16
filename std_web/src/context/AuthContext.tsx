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
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        setStatus('unauthenticated');
        setIdentity(null);
        return;
      }

      const verified = await authService.verifyIdentity(data.session.access_token);

      // Case B: Admin account signed in on the student website
      const isAdmin = verified.roles?.includes('ADMIN') || verified.roles?.includes('SUPER_ADMIN');
      const isStudent = verified.roles?.includes('STUDENT');

      if (isAdmin && !isStudent) {
        // Clear unauthorized admin session from student portal storage
        await supabase.auth.signOut();
        setStatus('unauthenticated');
        setIdentity(null);
        setError('Admin accounts cannot access the Student Portal. Please use the Admin Portal.');
        return;
      }

      setIdentity(verified);

      // Check if student role is confirmed and access status is not REVOKED/PENDING
      const isBlocked =
        verified.accessStatus?.toUpperCase() === 'REVOKED' ||
        verified.accessStatus?.toUpperCase() === 'EXPIRED';

      if (isStudent && !isBlocked) {
        setStatus('authenticated');
        resultsService.setStudentContext(verified.authUserId || verified.studentId);
        void resultsService.syncFromBackend();
      } else {
        setStatus('unauthorized');
      }
    } catch (e: unknown) {
      console.warn('[AuthContext] Verification failed:', e);
      const httpStatus = (e as { response?: { status?: number } })?.response?.status;
      const isAuthRejection = httpStatus === 401;

      if (isAuthRejection) {
        // Explicitly rejected session/token
        await supabase.auth.signOut().catch(() => {});
        setStatus('unauthenticated');
        setIdentity(null);
      } else {
        // Preserve Supabase session on network error or server startup
        setStatus(httpStatus === 403 ? 'unauthorized' : 'unauthenticated');
      }
    }
  }, []);

  useEffect(() => {
    verifyCurrentSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        await verifyCurrentSession();
      } else if (event === 'SIGNED_OUT') {
        setStatus('unauthenticated');
        setIdentity(null);
      }
    });

    return () => {
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
