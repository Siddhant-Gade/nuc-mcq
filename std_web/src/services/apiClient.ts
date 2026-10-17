import axios, { AxiosError } from 'axios';

const PRIMARY_BASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_BACKEND_BASE_URL) ||
  'https://nuc-mcq-server.onrender.com';

const FALLBACK_URLS = [
  'http://localhost:3000',
  'https://nuc-mcq-server.onrender.com',
  'http://192.168.29.37:3000',
  'http://192.168.29.253:3000',
];

export const apiClient = axios.create({
  baseURL: PRIMARY_BASE_URL,
  timeout: 45000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Request interceptor: Rely on HttpOnly nuc_session cookie by default.
// Explicitly provided Authorization header (e.g. for session exchange) is preserved.
apiClient.interceptors.request.use((config) => {
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
      if (code === 'STUDENT_ACCESS_SUSPENDED' || code === 'STUDENT_ACCESS_REVOKED' || code === 'STUDENT_ACCESS_EXPIRED') {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('nuc_student_access_blocked', {
              detail: { code, message: errData?.error?.message }
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
          const probe = await axios.get(`${candidate}/health`, { timeout: 2000, withCredentials: true });
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
    if (error.code === 'ERR_NETWORK') {
      return 'Could not connect to the server. Please check your internet connection.';
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred. Please try again.';
}
