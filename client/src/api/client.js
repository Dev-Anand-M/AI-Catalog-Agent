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
    const isAuthRoute = error.config?.url?.includes('/auth/login') || 
                        error.config?.url?.includes('/auth/signup');
    
    if (error.response?.status === 401 && !isAuthRoute) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API - consolidated endpoint
export const authApi = {
  signup: (data) => api.post('/auth?action=signup', data),
  login: (data) => api.post('/auth?action=login', data),
  me: () => api.get('/auth?action=me')
};

// Products API
export const productsApi = {
  list: () => api.get('/products'),
  get: (id) => api.get(`/products/${id}`),
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

// AI API - consolidated endpoint
export const aiApi = {
  generateProduct: (data) => api.post('/ai?action=generate-product', data),
  translate: (data) => api.post('/ai?action=translate', data),
  analyzeImage: (data) => api.post('/ai?action=analyze-image', data),
  parseVoiceUpdate: (data) => api.post('/ai?action=parse-voice-update', data),
  readPage: (data) => api.post('/ai?action=read-page', data),
  enhanceDescription: (data) => api.post('/ai?action=enhance-description', data),
  interpretCommand: (data) => api.post('/ai?action=interpret-command', data),
  chat: (data) => api.post('/ai?action=chat', data)
};

export default api;
