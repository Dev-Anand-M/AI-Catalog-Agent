import axios from 'axios';

const API_BASE_URL = '/api';

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
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  signup: (data) => api.post('/auth/signup', data),
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me')
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

// AI API
export const aiApi = {
  generateProduct: (data) => api.post('/ai/generate-product', data),
  translate: (data) => api.post('/ai/translate', data),
  analyzeImage: (data) => api.post('/ai/analyze-image', data),
  parseVoiceUpdate: (data) => api.post('/ai/parse-voice-update', data),
  readPage: (data) => api.post('/ai/read-page', data),
  enhanceDescription: (data) => api.post('/ai/enhance-description', data),
  interpretCommand: (data) => api.post('/ai/interpret-command', data),
  chat: (data) => api.post('/ai/chat', data)
};

export default api;
