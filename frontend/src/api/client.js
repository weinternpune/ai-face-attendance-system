import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || (
  import.meta.env.PROD 
    ? 'https://ai-face-attendance-system-bxge.onrender.com/api' 
    : '/api'
);

export const getWsUrl = (path = '/ws/attendance') => {
  const url = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://ai-face-attendance-system-bxge.onrender.com/api' : '/api');
  if (url.startsWith('http://') || url.startsWith('https://')) {
    const wsProto = url.startsWith('https://') ? 'wss://' : 'ws://';
    const host = url.replace(/^https?:\/\//, '').split('/')[0];
    return `${wsProto}${host}${path}`;
  }
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${wsProtocol}//${window.location.host}${path}`;
};

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token to requests if available
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('weintern_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Auto-redirect to login on 401 Unauthorized
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token if expired
      if (window.location.pathname !== '/login' && window.location.pathname !== '/kiosk' && window.location.pathname !== '/mobile-checkin') {
        localStorage.removeItem('weintern_token');
        localStorage.removeItem('weintern_user');
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
