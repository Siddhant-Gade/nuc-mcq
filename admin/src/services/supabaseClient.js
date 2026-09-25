import { createClient } from '@supabase/supabase-js';
import config, { missingConfigKeys } from '../config';
/**
 * Shared Supabase client for admin authentication. Session persistence is
 * handled by supabase-js (localStorage). The backend — not this client — is
 * the trust boundary: a session only unlocks the app after `/auth/me`
 * confirms the ADMIN role.
 */
export const supabase = missingConfigKeys().length > 0 ? null : createClient(config.supabaseUrl, config.supabasePublicKey);
