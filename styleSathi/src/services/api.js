const baseOverride = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL) || '';
const host = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_HOST) 
  || (typeof window !== 'undefined' && window.location && window.location.hostname) 
  || 'localhost';
const normalizedHost = (!host || host === '0.0.0.0' || host === '::' || host === '127.0.0.1') ? 'localhost' : host;
const port = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_PORT) || '8000';
const protocol = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_PROTOCOL) || 'http';
const BASE_URL = baseOverride || `${protocol}://${normalizedHost}:${port}/api`;
const API_ORIGIN = (() => {
  try { return new URL(BASE_URL).origin; } catch { return `${protocol}://${normalizedHost}:${port}`; }
})();
const IS_DEV = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV) || false;

export const resolveAssetUrl = (u) => {
  const s = typeof u === 'string' ? u.trim() : String(u || '').trim();
  if (!s) return null;
  if (s.startsWith('http://') || s.startsWith('https://')) return s;
  if (IS_DEV && (s.startsWith('/static') || s.startsWith('/media'))) return s; 
  return `${API_ORIGIN}${s.startsWith('/') ? '' : '/'}${s}`;
};

const json = async (url, options = {}) => {
  const resp = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...(options.headers || {})
    },
    method: options.method || 'GET',
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const contentType = resp.headers.get('content-type') || '';
  if (!resp.ok) {
    try {
      if (contentType.includes('application/json')) {
        const errData = await resp.json();
        const message = errData?.detail || errData?.error || (Array.isArray(errData?.errors) ? errData.errors.join(', ') : JSON.stringify(errData));
        throw new Error(message || resp.statusText);
      } else {
        const text = await resp.text();
        throw new Error(text || resp.statusText);
      }
    } catch (e) {
      throw new Error(e.message || resp.statusText);
    }
  }
  return contentType.includes('application/json') ? resp.json() : resp.text();
};

export const authApi = {
  login: ({ email, password, expected_role }) =>
    json(`${BASE_URL}/auth/login`, { method: 'POST', body: { email, password, expected_role } }),
  adminLogin: ({ email, password }) =>
    json(`${BASE_URL}/auth/admin/login`, { method: 'POST', body: { email, password, expected_role: 'admin' } }),
  signup: (data) => json(`${BASE_URL}/auth/signup`, { method: 'POST', body: data }),
  sellerSignup: (data) => json(`${BASE_URL}/auth/seller-signup`, { method: 'POST', body: data }),
  requestPasswordReset: ({ email }) => json(`${BASE_URL}/auth/password/forgot`, { method: 'POST', body: { email } }),
  resetPassword: ({ email, token, new_password }) => json(`${BASE_URL}/auth/password/reset`, { method: 'POST', body: { email, token, new_password } }),
};

export const catalogApi = {
  getCategories: () => json(`${BASE_URL}/products/categories`),
  getProducts: ({ category, search } = {}) => {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (search) params.set('search', search);
    return json(`${BASE_URL}/products/?${params.toString()}`);
  },
  getProduct: (id) => json(`${BASE_URL}/products/${id}`),
  getMyProducts: (token) => json(`${BASE_URL}/products/mine`, { token }),
  createProduct: (token, data) => json(`${BASE_URL}/products/create`, { method: 'POST', token, body: data }),
  createProductMultipart: async (token, formData) => {
    const resp = await fetch(`${BASE_URL}/products/create`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {})
        // DO NOT set Content-Type here; browser will set multipart boundary
      },
      body: formData
    });
    const contentType = resp.headers.get('content-type') || '';
    if (!resp.ok) {
      if (contentType.includes('application/json')) {
        const err = await resp.json();
        throw new Error(err?.detail || err?.error || JSON.stringify(err));
      }
      throw new Error(await resp.text());
    }
    return contentType.includes('application/json') ? resp.json() : resp.text();
  },
  updateProductMultipart: async (token, id, formData) => {
    const resp = await fetch(`${BASE_URL}/products/${id}/manage`, {
      method: 'PATCH',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: formData
    });
    const contentType = resp.headers.get('content-type') || '';
    if (!resp.ok) {
      if (contentType.includes('application/json')) {
        const err = await resp.json();
        throw new Error(err?.detail || err?.error || JSON.stringify(err));
      }
      throw new Error(await resp.text());
    }
    return contentType.includes('application/json') ? resp.json() : resp.text();
  },
  updateProduct: (token, id, data) => json(`${BASE_URL}/products/${id}/manage`, { method: 'PATCH', token, body: data }),
  deleteProduct: (token, id, reason) => json(`${BASE_URL}/products/${id}/manage`, { method: 'DELETE', token, body: reason ? { reason } : undefined }),
};

export const cartApi = {
  getCart: (token) => json(`${BASE_URL}/cart/`, { token }),
  addItem: (token, { product_id, quantity }) => json(`${BASE_URL}/cart/items`, { method: 'POST', token, body: { product_id, quantity } }),
  updateItem: (token, id, { quantity }) => json(`${BASE_URL}/cart/items/${id}`, { method: 'PATCH', token, body: { quantity } }),
  removeItem: (token, id) => json(`${BASE_URL}/cart/items/${id}`, { method: 'DELETE', token }),
};

export const ordersApi = {
  createOrder: (token, data) => json(`${BASE_URL}/orders/`, { method: 'POST', token, body: data }),
  getOrder: (token, id) => json(`${BASE_URL}/orders/${id}`, { token }),
  getSellerOrders: (token) => json(`${BASE_URL}/orders/seller`, { token }),
  getSellerOrder: (token, id) => json(`${BASE_URL}/orders/seller/${id}`, { token }),
  updateSellerOrderStatus: (token, id, status) => json(`${BASE_URL}/orders/${id}/status`, { method: 'PATCH', token, body: { status } }),
  getAdminOrders: (token) => json(`${BASE_URL}/orders/admin`, { token }),
};

export const profileApi = {
  get: (token) => json(`${BASE_URL}/profile/`, { token }),
  update: (token, data) => json(`${BASE_URL}/profile/`, { method: 'PATCH', token, body: data }),
  delete: (token) => json(`${BASE_URL}/profile/`, { method: 'DELETE', token }),
  requestPhoneVerification: (token, phone) => json(`${BASE_URL}/profile/phone/request`, { method: 'POST', token, body: { phone } }),
  verifyPhone: (token, code) => json(`${BASE_URL}/profile/phone/verify`, { method: 'POST', token, body: { code } }),
};

export const adminApi = {
  getUsers: (token) => json(`${BASE_URL}/auth/admin/users`, { token }),
  getReports: (token) => json(`${BASE_URL}/auth/admin/reports`, { token }),
  updateReport: (token, { id, action, reason }) => json(`${BASE_URL}/auth/admin/reports`, { method: 'PATCH', token, body: { id, action, reason } }),
  getDashboard: (token) => json(`${BASE_URL}/auth/admin/dashboard`, { token }),
  getAnalytics: (token) => json(`${BASE_URL}/auth/admin/analytics`, { token }),
  deleteUser: (token, { id, reason, email }) =>
    json(`${BASE_URL}/auth/admin/users`, { method: 'DELETE', token, body: { id, reason, email } }),
};
