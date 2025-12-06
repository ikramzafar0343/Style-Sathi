import { http, resolveAssetUrl, apiOrigin } from './http';

const json = async (url, options = {}) => {
  const method = options.method || 'GET';
  const cfg = {
    method,
    url,
    headers: { ...(options.headers || {}) },
    data: options.body,
  };
  if (options.token) cfg.headers.Authorization = `Bearer ${options.token}`;
  const resp = await http(cfg);
  return resp.data;
};

export const authApi = {
  login: ({ email, password, expected_role }) =>
    json(`/auth/login`, { method: 'POST', body: { email, password, expected_role } }),
  adminLogin: ({ email, password }) =>
    json(`/auth/admin/login`, { method: 'POST', body: { email, password, expected_role: 'admin' } }),
  signup: (data) => json(`/auth/signup`, { method: 'POST', body: data }),
  sellerSignup: (data) => json(`/auth/seller-signup`, { method: 'POST', body: data }),
  requestPasswordReset: ({ email }) => json(`/auth/password/forgot`, { method: 'POST', body: { email } }),
  resetPassword: ({ email, token, new_password }) => json(`/auth/password/reset`, { method: 'POST', body: { email, token, new_password } }),
};

export const catalogApi = {
  getCategories: () => json(`/products/categories`),
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
  getProduct: (id) => json(`/products/${id}`),
  getMyProducts: (token) => json(`/products/mine`, { token }),
  createProduct: (token, data) => json(`/products/create`, { method: 'POST', token, body: data }),
  createProductMultipart: async (token, formData) => {
    const resp = await http.post(`/products/create`, formData, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        'Content-Type': 'multipart/form-data'
      }
    });
    return resp.data;
  },
  updateProductMultipart: async (token, id, formData) => {
    const resp = await http.patch(`/products/${id}/manage`, formData, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        'Content-Type': 'multipart/form-data'
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
  getDashboard: (token) => json(`/auth/admin/dashboard`, { token }),
  getAnalytics: (token) => json(`/auth/admin/analytics`, { token }),
  deleteUser: (token, { id, reason, email }) =>
    json(`/auth/admin/users`, { method: 'DELETE', token, body: { id, reason, email } }),
};
