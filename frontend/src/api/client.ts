import axios, { AxiosError } from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

export const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 180_000,
});

const TOKEN_KEY = 'helixcareai_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

let onUnauthorized: (() => void) | null = null;
export function setOnUnauthorized(cb: () => void): void {
  onUnauthorized = cb;
}

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  // Let the browser set multipart boundary — a manual Content-Type breaks file uploads.
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err: AxiosError) => {
    const path = err.config?.url ?? '';
    if (
      err.response?.status === 401 &&
      !path.includes('/api/auth/login') &&
      !path.includes('/api/auth/register')
    ) {
      onUnauthorized?.();
    }
    return Promise.reject(err);
  }
);

export function errorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as
      | { error?: string; errors?: Array<{ msg?: string; path?: string }> }
      | undefined;
    if (data?.error) return data.error;
    if (data?.errors?.length) {
      return data.errors
        .map((e) => (e.path ? `${e.path}: ${e.msg ?? 'invalid'}` : e.msg ?? 'Invalid value'))
        .join('\n');
    }
    if (err.response?.status === 413) {
      return data?.error ?? 'File is too large. Maximum upload size is 4 MB.';
    }
    if (err.response?.status === 404) {
      const body = err.response.data;
      const isHtml = typeof body === 'string' && body.toLowerCase().includes('<!doctype');
      if (isHtml) {
        return 'Upload API not found. Hard-refresh the page (Cmd+Shift+R) and try again.';
      }
      return data?.error ?? `Not found (${err.config?.url ?? 'unknown path'})`;
    }
    if (err.code === 'ERR_NETWORK') {
      return 'Cannot reach the API. Is the backend running?';
    }
    return err.message;
  }
  return err instanceof Error ? err.message : 'Request failed';
}

export { baseURL };
