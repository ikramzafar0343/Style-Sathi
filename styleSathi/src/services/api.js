import { http, resolveAssetUrl, apiOrigin } from './http';

const pending = new Map();
let cache = new Map();
const cacheTTLms = 5000;
const now = () => Date.now();
const getCache = (key) => {
  const v = cache.get(key);
  if (!v) return null;
  if (now() - v.time > cacheTTLms) return null;
  return v.data;
};
const setCache = (key, data) => {
  cache.set(key, { data, time: now() });
};
const json = async (url, options = {}) => {
  const method = options.method || 'GET';
  const cfg = {
    method,
    url,
    headers: { ...(options.headers || {}) },
    data: options.body,
  };
  if (options.token) cfg.headers.Authorization = `Bearer ${options.token}`;
  const key = method === 'GET' ? url : '';
  if (method === 'GET') {
    const cached = getCache(key);
    if (cached) return cached;
    const p = pending.get(key);
    if (p) return p;
    const req = http(cfg).then((resp) => {
      const data = resp.data;
      setCache(key, data);
      pending.delete(key);
      return data;
    }).catch((e) => {
      pending.delete(key);
      throw e;
    });
    pending.set(key, req);
    return req;
  } else {
    const resp = await http(cfg);
    return resp.data;
  }
};

export const authApi = {
  login: ({ email, password, expected_role }) =>
    json(`/auth/login`, { method: 'POST', body: { email, password, expected_role } }),
  adminLogin: ({ email, password }) =>
    json(`/auth/admin/login`, { method: 'POST', body: { email, password, expected_role: 'admin' } }),
  refresh: ({ refresh }) => json(`/auth/refresh`, { method: 'POST', body: { refresh } }),
  signup: (data) => json(`/auth/signup`, { method: 'POST', body: data }),
  sellerSignup: (data) => json(`/auth/seller-signup`, { method: 'POST', body: data }),
  requestPasswordReset: ({ email }) => json(`/auth/password/forgot`, { method: 'POST', body: { email } }),
  resetPassword: ({ email, token, new_password }) => json(`/auth/password/reset`, { method: 'POST', body: { email, token, new_password } }),
};

export const catalogApi = {
  getCategories: async () => [
    { id: 1, name: 'Glasses' },
    { id: 2, name: 'Makeup' },
    { id: 3, name: 'Hair' },
    { id: 4, name: 'Jewelry' },
    { id: 5, name: 'Hat/Cap' },
    { id: 6, name: 'Rings' },
    { id: 7, name: 'Watches' },
    { id: 8, name: 'Shoes' },
  ],
  getProducts: ({ category, search } = {}) => {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (search) params.set('search', search);
    return json(`/products/?${params.toString()}`).then((resp) => {
      if (Array.isArray(resp)) return resp;
      if (resp && Array.isArray(resp.results)) return resp.results;
      if (resp && Array.isArray(resp.products)) return resp.products;
      return [];
    });
  },
  getProductsByCategory: (name) => json(`/products/?category=${encodeURIComponent(String(name||''))}`).then((resp) => {
    if (Array.isArray(resp)) return resp;
    if (resp && Array.isArray(resp.results)) return resp.results;
    if (resp && Array.isArray(resp.products)) return resp.products;
    return [];
  }),
  getProduct: (id) => json(`/products/${id}`),
  getMyProducts: (token) => json(`/products/mine`, { token }),
  createProduct: (token, data) => json(`/products/create`, { method: 'POST', token, body: data }),
  createProductMultipart: async (token, formData) => {
    const resp = await http.post(`/products/create`, formData, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    });
    return resp.data;
  },
  updateProductMultipart: async (token, id, formData) => {
    const resp = await http.patch(`/products/${id}/manage`, formData, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    });
    return resp.data;
  },
  updateProduct: (token, id, data) => json(`/products/${id}/manage`, { method: 'PATCH', token, body: data }),
  deleteProduct: (token, id, reason) => json(`/products/${id}/manage`, { method: 'DELETE', token, body: reason ? { reason } : undefined }),
};

export const cartApi = {
  getCart: (token) => json(`/cart/`, { token }),
  addItem: (token, { product_id, quantity }) => json(`/cart/items`, { method: 'POST', token, body: { product_id, quantity } }),
  updateItem: (token, id, { quantity }) => json(`/cart/items/${id}`, { method: 'PATCH', token, body: { quantity } }),
  removeItem: (token, id) => json(`/cart/items/${id}`, { method: 'DELETE', token }),
};

export const ordersApi = {
  createOrder: (token, data) => json(`/orders/`, { method: 'POST', token, body: data }),
  getOrder: (token, id) => json(`/orders/${id}`, { token }),
  getSellerOrders: (token) => json(`/orders/seller`, { token }),
  getSellerOrder: (token, id) => json(`/orders/seller/${id}`, { token }),
  updateSellerOrderStatus: (token, id, status) => json(`/orders/${id}/status`, { method: 'PATCH', token, body: { status } }),
  getAdminOrders: (token) => json(`/orders/admin`, { token }),
};

export const profileApi = {
  get: (token) => json(`/profile/`, { token }),
  update: (token, data) => json(`/profile/`, { method: 'PATCH', token, body: data }),
  delete: (token) => json(`/profile/`, { method: 'DELETE', token }),
  requestPhoneVerification: (token, phone) => json(`/profile/phone/request`, { method: 'POST', token, body: { phone } }),
  verifyPhone: (token, code) => json(`/profile/phone/verify`, { method: 'POST', token, body: { code } }),
};

export const adminApi = {
  getUsers: (token) => json(`/auth/admin/users`, { token }),
  getReports: (token) => json(`/auth/admin/reports`, { token }),
  updateReport: (token, { id, action, reason }) => json(`/auth/admin/reports`, { method: 'PATCH', token, body: { id, action, reason } }),
  createReport: (token, data) => json(`/auth/admin/reports`, { method: 'POST', token, body: data }),
  getDashboard: (token) => json(`/auth/admin/dashboard`, { token }),
  getAnalytics: (token) => json(`/auth/admin/analytics`, { token }),
  deleteUser: (token, { id, reason, email }) =>
    json(`/auth/admin/users`, { method: 'DELETE', token, body: { id, reason, email } }),
};

export const tryonApi = {
  analyzeSkin: async (formData) => {
    const resp = await http.post(`/skin/analyze`, formData);
    return resp.data;
  },
};

export const notificationsApi = {
  list: (token) => json(`/notifications`, { token }).then((resp) => {
    if (Array.isArray(resp)) return resp;
    if (resp && Array.isArray(resp.results)) return resp.results;
    if (resp && Array.isArray(resp.notifications)) return resp.notifications;
    return [];
  }),
  markRead: (token, id) => json(`/notifications/read`, { method: 'POST', token, body: { id } }),
  markAllRead: (token) => json(`/notifications/read_all`, { method: 'POST', token }),
  clear: (token) => json(`/notifications/clear`, { method: 'POST', token }),
};

export const getProductImageUrl = (p) => {
  const u = (p && (p.image_url || (Array.isArray(p.images) ? p.images[0] : '') || p.image || p.imageUrl)) || '';
  const r = resolveAssetUrl(u);
  if (r) {
    try {
      const s = String(r);
      if (/^https?:\/\/res\.cloudinary\.com\//.test(s)) {
        const idx = s.indexOf('/upload/');
        if (idx !== -1) {
          const head = s.slice(0, idx + 8);
          const tail = s.slice(idx + 8);
          if (!/^f_auto|q_auto|w_\d+/.test(tail)) {
            return head + 'f_auto,q_auto,w_600/' + tail;
          }
        }
      }
    } catch { /* noop */ }
    return r;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600">
    <rect width="100%" height="100%" fill="#eeeeee"/>
    <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#666666" font-size="28" font-family="Arial, Helvetica, sans-serif">Product Image</text>
  </svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
};

export { resolveAssetUrl, apiOrigin };
