import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
  'https://hwgnzhromdavlnttozai.supabase.co';
const supabaseAnonKey =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh3Z256aHJvbWRhdmxudHRvemFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc1ODgwNzEsImV4cCI6MjEwMzE2NDA3MX0.XKlEU0AVMtDq5ZLOfiilp_oyKK0tiRoy7A2jDYdFdRA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storageKey: 'sb-student-auth-token',
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: typeof window !== 'undefined',
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
});
