import axios, { AxiosError } from 'axios';
import { supabase } from '../lib/supabase';

const RENDER_PROD_URL = 'https://nuc-mcq-server.onrender.com';

const isBrowser = typeof window !== 'undefined';
const isLocalhost =
  isBrowser &&
  (window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname === '[::1]');

/**
 * Resolves the primary API base URL.
 * In production deployments (e.g. Vercel), when no explicit external base URL is provided,
 * using a relative path ("") routes API requests through Vercel's server-side /api/* rewrite proxy
 * to Render. This guarantees same-origin communication in the browser, eliminating CORS preflight errors.
 */
function resolvePrimaryBaseUrl(): string {
  const envUrl =
    typeof import.meta !== 'undefined' ? import.meta.env?.VITE_BACKEND_BASE_URL : undefined;

  if (envUrl && typeof envUrl === 'string' && envUrl.trim().length > 0) {
    return envUrl.trim().replace(/\/+$/, '');
  }

  // On production hosting (Vercel, custom domain):
  // Default to relative base URL ("") so requests go to same origin and get proxied to Render.
  if (isBrowser && !isLocalhost) {
    return '';
  }

  // Local development default (points to Render backend if no local server configured)
  return RENDER_PROD_URL;
}

const PRIMARY_BASE_URL = resolvePrimaryBaseUrl();

/**
 * Fallback endpoints on connection failure.
 * In production: ONLY switch between the Vercel proxy ("") and direct Render backend.
 * Localhost and internal LAN IPs are strictly disabled in production.
 */
const FALLBACK_URLS: string[] =
  isBrowser && !isLocalhost
    ? ['', RENDER_PROD_URL]
    : ['http://localhost:3000', RENDER_PROD_URL];

export const apiClient = axios.create({
  baseURL: PRIMARY_BASE_URL,
  timeout: 30000, // 30s timeout to accommodate Render free-tier cold starts
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Bearer token interceptor: inject Supabase access token for authenticated API calls
apiClient.interceptors.request.use(async (config) => {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch {
    // Continue without token if session retrieval fails
  }
  return config;
});

// Response & auto-fallback interceptor
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as (typeof error.config & { _fallbackTried?: boolean });

    // Detect student suspension or access blocking
    if (error.response?.status === 403) {
      const errData = error.response.data as { error?: { code?: string; message?: string } } | undefined;
      const code = errData?.error?.code;
      if (
        code === 'STUDENT_ACCESS_SUSPENDED' ||
        code === 'STUDENT_ACCESS_REVOKED' ||
        code === 'STUDENT_ACCESS_EXPIRED'
      ) {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('nuc_student_access_blocked', {
              detail: { code, message: errData?.error?.message },
            })
          );
        }
      }
    }

    // Try fallback on network/connection failure if not already retried
    if (
      originalRequest &&
      !originalRequest._fallbackTried &&
      (error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED')
    ) {
      originalRequest._fallbackTried = true;

      for (const candidate of FALLBACK_URLS) {
        if (candidate === apiClient.defaults.baseURL) continue;
        try {
          const probeUrl = candidate ? `${candidate.replace(/\/+$/, '')}/health` : '/health';
          const probe = await axios.get(probeUrl, { timeout: 6000 });
          if (probe.status === 200) {
            apiClient.defaults.baseURL = candidate;
            originalRequest.baseURL = candidate;
            return apiClient(originalRequest);
          }
        } catch {
          // Continue to next candidate
        }
      }
    }

    return Promise.reject(error);
  }
);

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (data && typeof data === 'object') {
      if ('error' in data && data.error && typeof data.error === 'object' && 'message' in data.error) {
        return String(data.error.message);
      }
      if ('message' in data) {
        return String(data.message);
      }
    }
    if (error.response?.status === 401) {
      return 'Session expired. Please sign in again.';
    }
    if (error.response?.status === 403) {
      const errData = error.response?.data as { error?: { code?: string; message?: string } } | undefined;
      if (errData?.error?.code === 'STUDENT_ACCESS_SUSPENDED') {
        return 'Your student account has been suspended by administration.';
      }
      if (errData?.error?.code === 'STUDENT_ACCESS_REVOKED') {
        return 'Your student access has been revoked.';
      }
      if (errData?.error?.code === 'STUDENT_ACCESS_EXPIRED') {
        return 'Your student access has expired.';
      }
      return 'Access not authorized for this account.';
    }
    if (error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED') {
      if (isLocalhost) {
        return 'Could not connect to backend server. If developing locally, ensure the local backend is running (npm run dev) or that CORS_ORIGINS includes http://localhost:5174.';
      }
      return 'Could not connect to the backend server (https://nuc-mcq-server.onrender.com). The server may be waking up from cold start. Please check your internet connection and try again.';
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred. Please try again.';
}
