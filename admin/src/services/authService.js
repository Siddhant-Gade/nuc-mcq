import { supabase } from './supabaseClient';
import { configureApiClient, request, ApiError } from './api';

function requireSupabase() {
    if (!supabase) {
        throw new ApiError('CONFIG_MISSING', 'Supabase configuration is missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLIC_KEY.', 0);
    }
    return supabase;
}

configureApiClient({
    onUnauthorized: () => {
        void supabase?.auth.signOut().catch(() => {});
    },
});

async function exchangeTokenForSession(accessToken) {
    const data = await request('post', '/auth/session', { clientType: 'ADMIN_WEB' }, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });
    return data?.identity;
}

async function verifyAdminIdentity() {
    const data = await request('get', '/auth/session');
    const identity = data?.identity;
    if (!identity || (!identity.roles?.includes('ADMIN') && !identity.roles?.includes('SUPER_ADMIN'))) {
        throw new ApiError('NOT_ADMIN', 'This account does not have admin access to this panel.', 403);
    }
    return identity;
}

/** Email/password sign-in followed by server-side session exchange and ADMIN verification. */
export async function signIn(email, password) {
    const client = requireSupabase();
    const { data: authData, error } = await client.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
        throw new ApiError('INVALID_CREDENTIALS', error.message, 401);
    }
    const token = authData.session?.access_token;
    if (!token) {
        throw new ApiError('AUTHENTICATION_ERROR', 'No access token received from authentication provider.', 401);
    }
    await exchangeTokenForSession(token);
    return verifyAdminIdentity();
}

export async function signOut() {
    try {
        await request('post', '/auth/logout');
    } catch (_) {}
    try {
        await requireSupabase().auth.signOut();
    } catch (_) {}
}

/** Google OAuth sign-in followed by ADMIN verification. */
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
}

/** Restores a persisted session from cookie and verifies it against the backend. */
export async function restoreSession() {
    // Attempt 1: Try restoring directly from HttpOnly nuc_session cookie
    try {
        const identity = await verifyAdminIdentity();
        return { status: 'authenticated', identity };
    } catch (err) {
        // If 401 on cookie, check if there is an active Supabase session (e.g. fresh OAuth redirect)
        const client = supabase;
        if (client) {
            try {
                const { data } = await client.auth.getSession();
                if (data?.session?.access_token) {
                    await exchangeTokenForSession(data.session.access_token);
                    const identity = await verifyAdminIdentity();
                    return { status: 'authenticated', identity };
                }
            } catch (_) {}
            await client.auth.signOut().catch(() => {});
        }
        return { status: 'unauthenticated', identity: null };
    }
}
