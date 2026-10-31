import { supabase } from './supabaseClient';
import { configureApiClient, request, ApiError } from './api';
function requireSupabase() {
    if (!supabase) {
        throw new ApiError('CONFIG_MISSING', 'Supabase configuration is missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLIC_KEY.', 0);
    }
    return supabase;
}
// Wire the shared API client to the Supabase session. supabase-js keeps the
// token fresh; we mirror it synchronously for the request interceptor.
let currentAccessToken;
if (supabase) {
    supabase.auth.onAuthStateChange((_event, session) => {
        currentAccessToken = session?.access_token;
    });
}
configureApiClient({
    readAccessToken: () => currentAccessToken,
    onUnauthorized: () => {
        // Expired/invalid token anywhere → drop the session; AuthContext reacts
        // to the sign-out event and returns the user to the login screen.
        void supabase?.auth.signOut();
    },
});
async function verifyAdminIdentity() {
    const data = await request('get', '/auth/me');
    const identity = data.identity;
    if (!identity.roles.includes('ADMIN')) {
        throw new ApiError('NOT_ADMIN', 'This account does not have admin access to this panel.', 403);
    }
    return identity;
}
/** Email/password sign-in followed by backend-side ADMIN verification. */
export async function signIn(email, password) {
    const client = requireSupabase();
    const { error } = await client.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
        throw new ApiError('INVALID_CREDENTIALS', error.message, 401);
    }
    return verifyAdminIdentity();
}
export async function signOut() {
    await requireSupabase().auth.signOut();
}
/** Sends a password reset email to the given address. */
export async function requestPasswordReset(email) {
    const client = requireSupabase();
    const { error } = await client.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/login`,
    });
    if (error) {
        throw new ApiError('RESET_PASSWORD_FAILED', error.message, 400);
    }
}
/** Google OAuth sign-in (popup redirect) followed by ADMIN verification. */
export async function signInWithGoogle() {
    const client = requireSupabase();
    const { error } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: window.location.origin,
        },
    });
    if (error) {
        throw new ApiError('GOOGLE_AUTH_FAILED', error.message, 401);
    }
    // After redirect, restoreSession() picks up the session and verifies ADMIN role.
}
/** Restores a persisted session and verifies it against the backend. */
export async function restoreSession() {
    const client = requireSupabase();
    const { data } = await client.auth.getSession();
    const session = data.session;
    if (!session) {
        return { status: 'unauthenticated', identity: null };
    }
    try {
        const identity = await verifyAdminIdentity();
        return { status: 'authenticated', identity };
    }
    catch (err) {
        // Expired token or non-admin account — start clean.
        await client.auth.signOut();
        const message = err?.message || 'Access denied: You are not authorized as an administrator.';
        throw new Error(message);
    }
}
