import axios, { AxiosError } from 'axios';
import { supabase } from '../lib/supabase';

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
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Bearer token interceptor
apiClient.interceptors.request.use(async (config) => {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
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
          const probe = await axios.get(`${candidate}/health`, { timeout: 2000 });
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
