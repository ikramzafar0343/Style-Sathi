import axios from 'axios';

const baseOverride = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL) || '';
const host = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_HOST)
  || (typeof window !== 'undefined' && window.location && window.location.hostname)
  || 'localhost';
const normalizedHost = (!host || host === '0.0.0.0' || host === '::' || host === '127.0.0.1') ? 'localhost' : host;
const port = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_PORT) || '8000';
const protocol = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_PROTOCOL) || 'http';
let BASE_URL = baseOverride || `${protocol}://${normalizedHost}:${port}/api`;
// Render fallback: if running on Render and no explicit override, point to backend service
try {
  const isRender = typeof window !== 'undefined' && /onrender\.com$/i.test(window.location.hostname || '');
  if (!baseOverride && isRender) {
    BASE_URL = 'https://stylesathi-backend.onrender.com/api';
  }
} catch {}

export const http = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

http.interceptors.request.use((config) => {
  const token = (typeof window !== 'undefined' && localStorage.getItem('authTokens'))
    ? JSON.parse(localStorage.getItem('authTokens') || '{}').access
    : null;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

http.interceptors.response.use(
  (resp) => resp,
  async (error) => {
    const resp = error.response;
    const message = resp?.data?.detail || resp?.data?.error || (Array.isArray(resp?.data?.errors) ? resp.data.errors.join(', ') : resp?.statusText || error.message);
    return Promise.reject(new Error(message || 'Request failed'));
  }
);

export const apiOrigin = (() => {
  try { return new URL(BASE_URL).origin; } catch { return `${protocol}://${normalizedHost}:${port}`; }
})();

export const resolveAssetUrl = (u) => {
  const s = typeof u === 'string' ? u.trim() : String(u || '').trim();
  if (!s) return null;
  if (s.startsWith('http://') || s.startsWith('https://')) return s;
  const IS_DEV = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV) || false;
  if (IS_DEV && (s.startsWith('/static') || s.startsWith('/media'))) return s;
  return `${apiOrigin}${s.startsWith('/') ? '' : '/'}${s}`;
};
