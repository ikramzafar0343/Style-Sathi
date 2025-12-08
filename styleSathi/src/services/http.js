import axios from 'axios';
import Swal from 'sweetalert2';

const baseOverrideRaw = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL) || '';
const host = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_HOST)
  || (typeof window !== 'undefined' && window.location && window.location.hostname)
  || 'localhost';
const normalizedHost = (!host || host === '0.0.0.0' || host === '::' || host === '127.0.0.1') ? 'localhost' : host;
const port = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_PORT) || '8000';
const protocol = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_PROTOCOL) || 'http';
const IS_DEV = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV) || false;
let baseOverride = baseOverrideRaw;
if (!IS_DEV && typeof baseOverrideRaw === 'string' && baseOverrideRaw.includes('onrender.com')) {
  baseOverride = '';
}
let BASE_URL = baseOverride || (IS_DEV ? `${protocol}://${normalizedHost}:${port}/api` : 'https://stylesathi-backend-production.up.railway.app/api');

export const http = axios.create({
  baseURL: BASE_URL,
});

http.interceptors.request.use((config) => {
  const token = (typeof window !== 'undefined' && localStorage.getItem('authTokens'))
    ? JSON.parse(localStorage.getItem('authTokens') || '{}').access
    : null;
  const method = String(config.method || 'get').toLowerCase();
  const url = String(config.url || '');
  const isPublicGet = (
    method === 'get' && (
      /^\/products\/?(\?.*)?$/.test(url) ||
      /^\/products\/categories$/.test(url) ||
      /^\/products\/\d+$/.test(url) ||
      /^\/orders\/public\//.test(url)
    )
  );
  const isAuthEndpoint = /^\/auth\//.test(url);
  if (token && !isPublicGet && !isAuthEndpoint) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

http.interceptors.response.use(
  (resp) => resp,
  async (error) => {
    const resp = error.response;
    const status = resp?.status;
    const message = resp?.data?.detail || resp?.data?.error || (Array.isArray(resp?.data?.errors) ? resp.data.errors.join(', ') : resp?.statusText || error.message);
    if (typeof window !== 'undefined' && (status === 401 || status === 403)) {
      const msg = String(message || '').toLowerCase();
      if (msg.includes('invalid token') || msg.includes('authentication credentials were not provided')) {
        try { await Swal.fire({ icon: 'warning', title: 'Authentication Required', text: message || 'Please log in to continue' }); } catch { void 0; }
      }
    }
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
