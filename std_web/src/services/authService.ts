import { supabase } from '../lib/supabase';
import { apiClient } from './apiClient';
import { StudentIdentity } from '../types';
import { parseJwtPayload, promptGoogleOneTap } from '../lib/googleAuth';

export function prnToAuthEmail(identifier: string): string {
  const trimmed = identifier.trim();
  if (trimmed.includes('@')) {
    return trimmed.toLowerCase();
  }
  const clean = trimmed.toLowerCase().replace(/[^a-z0-9_.-]/g, '');
  return `${clean}@student.unique`;
}

export const authService = {
  async signInWithPrn(prn: string, password: string): Promise<void> {
    const trimmed = prn.trim();
    const authEmail = prnToAuthEmail(trimmed);

    // Attempt 1: Direct sign in with PRN email alias
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password,
      });
      if (!error) return;
    } catch {
      // Continue to next attempt
    }

    // Attempt 2: Resolve identifier via backend in case admitted with personal email
    try {
      const resolveRes = await apiClient.post('/api/v1/auth/resolve-identifier', {
        identifier: trimmed,
      });
      const resolved = resolveRes.data?.data;
      if (resolved?.email && resolved.email.toLowerCase() !== authEmail) {
        const { error } = await supabase.auth.signInWithPassword({
          email: resolved.email.toLowerCase(),
          password,
        });
        if (!error) return;
      }
    } catch {
      // Continue to attempt 3
    }

    // Attempt 3: Multi-device / custom password sync via backend register
    try {
      const regRes = await apiClient.post('/api/v1/auth/student-register', {
        prn: trimmed,
        password,
      });
      const data = regRes.data?.data;
      if (data) {
        const { error: err1 } = await supabase.auth.signInWithPassword({
          email: authEmail,
          password,
        });
        if (!err1) return;

        if (data.email) {
          const { error: err2 } = await supabase.auth.signInWithPassword({
            email: data.email,
            password,
          });
          if (!err2) return;
        }
      }
    } catch (e: unknown) {
      const errObj = (e as { response?: { data?: { error?: { code?: string } } } })?.response?.data?.error;
      if (errObj?.code === 'STUDENT_NOT_FOUND') {
        throw new Error(
          `Student with PRN "${trimmed}" was not found. Please ensure you are admitted by the institute admin.`
        );
      }
    }

    throw new Error('Invalid credentials. Please verify your PRN and password, or set a new password.');
  },

  async signUpWithPrn(prn: string, password: string): Promise<void> {
    const trimmed = prn.trim();
    const authEmail = prnToAuthEmail(trimmed);

    // Step 1: Register password via backend (bypasses Supabase email rate limits)
    let registerData: { email?: string } | null = null;
    const response = await apiClient.post('/api/v1/auth/student-register', {
      prn: trimmed,
      password,
    });
    registerData = response.data?.data ?? null;

    // Step 2: Instantly sign in
    const { error: err1 } = await supabase.auth.signInWithPassword({
      email: authEmail,
      password,
    });
    if (!err1) return;

    if (registerData?.email && registerData.email !== authEmail) {
      const { error: err2 } = await supabase.auth.signInWithPassword({
        email: registerData.email,
        password,
      });
      if (!err2) return;
    }

    throw new Error('Registration succeeded, but auto-login failed. Please sign in with your credentials.');
  },

  /**
   * Primary + Bridge Google Sign-In matching the Flutter reference implementation:
   * 1. Uses the Google ID token directly with Supabase via signInWithIdToken
   * 2. If ID token sign-in fails, falls back to the backend bridge (/api/v1/auth/google-student-auth)
   * 3. Authoritatively verifies student identity via /api/v1/auth/me
   * 4. Enforces role boundary (rejects admins from the student portal)
   */
  async signInWithGoogleCredential(idToken: string): Promise<StudentIdentity> {
    const claims = parseJwtPayload(idToken);
    const email = claims?.email?.trim().toLowerCase();
    const name = claims?.name || '';
    const googleId = claims?.sub || '';

    // Flow 1 (Primary): Supabase Native Google ID Token authentication
    try {
      const { data: idTokenData, error: idTokenErr } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      });

      if (!idTokenErr && idTokenData?.session) {
        const identity = await this.verifyIdentity(idTokenData.session.access_token);
        const isAdmin = identity.roles.includes('ADMIN') || identity.roles.includes('SUPER_ADMIN');
        const isStudent = identity.roles.includes('STUDENT');

        if (isAdmin && !isStudent) {
          await supabase.auth.signOut();
          throw new Error('Admin accounts cannot access the Student Portal. Please use the Admin Portal.');
        }

        return identity;
      }

      if (idTokenErr) {
        console.warn(
          '[authService] Supabase signInWithIdToken failed. Falling back to backend bridge:',
          idTokenErr.message
        );
      }
    } catch (primaryErr: unknown) {
      const msg = primaryErr instanceof Error ? primaryErr.message : '';
      if (msg.includes('Admin accounts cannot access')) {
        throw primaryErr;
      }
      const axiosErr = primaryErr as {
        response?: { status?: number; data?: { error?: { code?: string; message?: string } } };
      };
      if (axiosErr?.response?.data?.error?.code === 'STUDENT_NOT_ENROLLED') {
        throw new Error(
          `No admitted student record found with Google email: ${email}. Please contact the institute administrator to enroll.`
        );
      }
      console.warn('[authService] Primary signInWithIdToken threw exception, falling back to bridge:', primaryErr);
    }

    // Flow 2 (Bridge Fallback): Backend student verification bridge
    if (!email) {
      throw new Error('Unable to extract email from Google credential.');
    }

    try {
      const bridgeRes = await apiClient.post('/api/v1/auth/google-student-auth', {
        email,
        name,
        googleId,
      });

      const bridgeData = bridgeRes.data?.data;
      if (!bridgeData?.authToken) {
        throw new Error('Failed to authenticate student with backend.');
      }

      const targetEmail = bridgeData.email || email;
      const { data: passData, error: passErr } = await supabase.auth.signInWithPassword({
        email: targetEmail,
        password: bridgeData.authToken,
      });

      if (passErr) {
        throw new Error(passErr.message);
      }

      const identity = await this.verifyIdentity(passData?.session?.access_token);
      const isAdmin = identity.roles.includes('ADMIN') || identity.roles.includes('SUPER_ADMIN');
      const isStudent = identity.roles.includes('STUDENT');

      if (isAdmin && !isStudent) {
        await supabase.auth.signOut();
        throw new Error('Admin accounts cannot access the Student Portal. Please use the Admin Portal.');
      }

      return identity;
    } catch (bridgeErr: unknown) {
      const axiosErr = bridgeErr as {
        code?: string;
        response?: { status?: number; data?: { error?: { code?: string; message?: string } } };
      };
      if (axiosErr?.response?.status === 404 || axiosErr?.response?.data?.error?.code === 'STUDENT_NOT_ENROLLED') {
        throw new Error(
          `No admitted student record found with Google email: ${email}. Please contact the institute administrator to enroll.`
        );
      }
      if (axiosErr?.code === 'ERR_NETWORK') {
        throw new Error(
          'Could not connect to backend server. If developing locally, ensure the local backend is running (npm run dev) or that CORS_ORIGINS includes http://localhost:5174.'
        );
      }
      if (bridgeErr instanceof Error) {
        throw bridgeErr;
      }
      throw new Error('Google authentication failed. Please try again or use your PRN and password.');
    }
  },

  /**
   * OAuth redirect fallback for browsers where Google Identity Services popups are blocked.
   * Redirects strictly to the dedicated student callback route.
   */
  async signInWithGoogleOAuth(): Promise<void> {
    const callbackUrl = `${window.location.origin}/auth/callback`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: callbackUrl,
      },
    });
    if (error) {
      throw new Error(error.message);
    }
  },

  async signInWithGoogle(): Promise<void> {
    if (typeof window !== 'undefined' && window.google?.accounts?.id) {
      promptGoogleOneTap();
      return;
    }
    await this.signInWithGoogleOAuth();
  },

  async verifyIdentity(explicitToken?: string): Promise<StudentIdentity> {
    const headers = explicitToken ? { Authorization: `Bearer ${explicitToken}` } : undefined;
    const response = await apiClient.get('/api/v1/auth/me', { headers });
    const identity = response.data?.data?.identity;
    if (!identity) {
      throw new Error('Invalid identity returned from server.');
    }
    return identity as StudentIdentity;
  },

  async requestAccess(prn?: string): Promise<boolean> {
    try {
      const payload = prn?.trim() ? { prn: prn.trim() } : {};
      await apiClient.post('/api/v1/authorization-requests/mine', payload);
      return true;
    } catch (e: unknown) {
      const err = (e as { response?: { status?: number } })?.response;
      if (err?.status === 409) return true; // Already pending
      return false;
    }
  },

  async submitPublicAccessRequest(data: { prn?: string; email?: string; name?: string }): Promise<void> {
    await apiClient.post('/api/v1/authorization-requests/request', data);
  },

  async signOut(): Promise<void> {
    await supabase.auth.signOut();
  },
};
