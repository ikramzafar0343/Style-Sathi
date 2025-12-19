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
if (typeof baseOverrideRaw === 'string' && /(^|\\.)railway\\.app/i.test(baseOverrideRaw)) {
  baseOverride = '';
}
let BASE_URL = (() => {
  if (IS_DEV) return `${protocol}://${normalizedHost}:${port}/api`;
  if (typeof baseOverride === 'string' && baseOverride.trim()) return baseOverride.trim();
  if (typeof window !== 'undefined' && window.location && window.location.origin) return `${window.location.origin}/api`;
  return `${protocol}://${normalizedHost}:${port}/api`;
})();

export const http = axios.create({
  baseURL: BASE_URL,
});

const refreshHttp = axios.create({
  baseURL: BASE_URL,
});

let isRefreshing = false;
let refreshPromise = null;
const getTokens = () => {
  try {
    const t = localStorage.getItem('authTokens');
    return t ? JSON.parse(t) : null;
  } catch { return null; }
};
const setTokens = (tokens) => {
  try {
    if (tokens) localStorage.setItem('authTokens', JSON.stringify(tokens));
    else localStorage.removeItem('authTokens');
  } catch { void 0; }
};

http.interceptors.request.use((config) => {
  const token = (typeof window !== 'undefined') ? (getTokens()?.access || null) : null;
  const method = String(config.method || 'get').toLowerCase();
  const url = String(config.url || '');
  const isPublicGet = (
    method === 'get' && (
      /^\/products\/?(\?.*)?$/.test(url) ||
      /^\/products\/categories$/.test(url) ||
      /^\/products\/\d+$/.test(url)
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
    const msg = String(message || '').toLowerCase();
    const original = error.config || {};
    const isAuthEndpoint = /^\/auth\//.test(String(original.url || ''));
    if ((status === 401 || status === 403) && !isAuthEndpoint) {
      const tokens = getTokens();
      const refresh = tokens?.refresh;
      const tokenInvalid = msg.includes('token_not_valid') || msg.includes('given token not valid') || msg.includes('invalid token');
      if (refresh && tokenInvalid && !original._retry) {
        try {
          if (!isRefreshing) {
            isRefreshing = true;
            refreshPromise = refreshHttp.post(`/auth/refresh`, { refresh });
          }
          const res = await refreshPromise;
          const newTokens = res?.data?.tokens || null;
          if (newTokens?.access) {
            setTokens(newTokens);
            original.headers = { ...(original.headers || {}), Authorization: `Bearer ${newTokens.access}` };
            original._retry = true;
            return http(original);
          }
        } catch {
          try { await Swal.fire({ icon: 'warning', title: 'Session expired', text: 'Please log in again.' }); } catch { void 0; }
          setTokens(null);
        } finally {
          isRefreshing = false;
          refreshPromise = null;
        }
      }
      if (typeof window !== 'undefined') {
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
  if (s.startsWith('data:') || s.startsWith('blob:')) return s;
  if (s.startsWith('http://') || s.startsWith('https://')) return s;
  const needsMap = s.startsWith('/static/uploads/');
  const mapped = needsMap ? s.replace('/static/uploads/', '/media/uploads/') : s;
  return `${apiOrigin}${mapped.startsWith('/') ? '' : '/'}${mapped}`;
};
