const defaultApiBaseUrl = typeof window !== 'undefined' && window.location.hostname
    ? `http://${window.location.hostname}:3000/api/v1`
    : 'http://localhost:3000/api/v1';
const config = {
    apiBaseUrl: import.meta.env.VITE_API_BASE_URL || defaultApiBaseUrl,
    supabaseUrl: import.meta.env.VITE_SUPABASE_URL || '',
    // Publishable key (or legacy anon key) — public-safe, never the service-role key.
    supabasePublicKey: import.meta.env.VITE_SUPABASE_PUBLIC_KEY || '',
    turnstileSiteKey: import.meta.env.VITE_TURNSTILE_SITE_KEY || '0x4AAAAAAFDXtqSW6bl_n8Uh',
    appName: 'New Unique Computers',
};
export function missingConfigKeys() {
    const missing = [];
    if (!config.supabaseUrl)
        missing.push('VITE_SUPABASE_URL');
    if (!config.supabasePublicKey)
        missing.push('VITE_SUPABASE_PUBLIC_KEY');
    return missing;
}
export default config;
