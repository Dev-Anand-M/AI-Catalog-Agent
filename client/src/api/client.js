import axios from 'axios';

// Use environment variable for API URL, fallback to /api for both local and Vercel
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only redirect on 401 for protected routes, not for login/signup
    // URLs look like '/auth?action=login' — check the action param, not a path suffix
    const url = error.config?.url || '';
    const isAuthRoute = url.includes('/auth/login')
      || url.includes('/auth/signup')
      || url.includes('action=login')
      || url.includes('action=signup')
      || url.includes('action=me')
      // A wrong current password answers 401; that must surface in the form instead
      // of reloading the whole app back to the login screen.
      || url.includes('action=change-password')
      // Access requests are submitted anonymously — a 401 there must never bounce
      // a visitor to /login and throw away the form they just filled in.
      || url.includes('/access-requests');
    
    if (error.response?.status === 401 && !isAuthRoute) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    } else if (error.response?.status === 401 && isAuthRoute && url.includes('action=me')) {
      // Stale/expired token during silent profile refresh — clear quietly, no reload
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    return Promise.reject(error);
  }
);

// Auth API - consolidated endpoint
export const authApi = {
  // `identifier` is an email address OR a mobile number — the server decides which.
  login: (data) => api.post('/auth?action=login', data),
  me: () => api.get('/auth?action=me'),
  updateLanguage: (language) => api.put('/auth?action=me', { language }),
  // Linking a mobile number lets a merchant sign in with either credential.
  linkPhone: (phone) => api.put('/auth?action=me', { phone }),
  changePassword: (data) => api.post('/auth?action=change-password', data)
};

// Public onboarding. Self-serve sign-up is intentionally gone: this only records a
// request, and an admin provisions the real account after reviewing it.
export const accessRequestApi = {
  submit: (data) => api.post('/access-requests', data)
};

// Products API
export const productsApi = {
  list: () => api.get('/products'),
  getAll: () => api.get('/products'),
  get: (id) => api.get(`/products/${id}`),
  getById: (id) => api.get(`/products/${id}`),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`)
};

// Demo API
export const demoApi = {
  getProducts: () => api.get('/demo/products')
};

// Public Catalog API (shareable links - no auth required)
export const catalogApi = {
  get: (userId) => api.get(`/catalog/${userId}`)
};

// Payment API
export const paymentApi = {
  get: () => api.get('/payment'),
  save: (data) => api.put('/payment', data)
};

// Audit API
export const auditApi = {
  list: (limit = 100) => api.get(`/audit?limit=${limit}`),
  record: (data) => api.post('/audit', data)
};

// Admin API (requires admin role)
export const adminApi = {
  stats: () => api.get('/admin/stats'),
  sellers: () => api.get('/admin/sellers'),
  products: () => api.get('/admin/products'),
  deleteSeller: (id) => api.delete(`/admin/sellers/${id}`),
  audit: (limit = 200) => api.get(`/admin/audit?limit=${limit}`),
  aiProviders: () => api.get('/admin/ai-providers'),
  updateAiProviders: (data) => api.put('/admin/ai-providers', data),
  addCustomModel: (data) => api.post('/admin/ai-providers/custom-model', data),
  testAi: () => api.post('/admin/ai-test'),
  accessRequests: (status = 'all') => api.get(`/admin/access-requests?status=${status}`),
  approveAccessRequest: (id, data = {}) => api.post(`/admin/access-requests/${id}/approve`, data),
  rejectAccessRequest: (id, reason = '') => api.post(`/admin/access-requests/${id}/reject`, { reason })
};

// AI API - consolidated endpoint
export const aiApi = {
  generateProduct: (data) => api.post('/ai?action=generate-product', data),
  translate: (data) => api.post('/ai?action=translate', data),
  analyzeImage: (data) => api.post('/ai?action=analyze-image', data),
  parseVoiceUpdate: (data) => api.post('/ai?action=parse-voice-update', data),
  readPage: (data) => api.post('/ai?action=read-page', data),
  enhanceDescription: (data) => api.post('/ai?action=enhance-description', data),
  interpretCommand: (data) => api.post('/ai?action=interpret-command', data),
  chat: (data) => api.post('/ai?action=chat', data),
  orchestrate: (data) => api.post('/ai?action=orchestrate', data),
  enhanceImage: (data) => api.post('/ai?action=enhance-image', data),
  calculatePricing: (data) => api.post('/ai?action=calculate-pricing', data)
};

export const shopifyApi = {
  sync: (productIds) => api.post('/shopify/sync', { productIds }),
  getStatus: () => api.get('/shopify/status')
};

export default api;
