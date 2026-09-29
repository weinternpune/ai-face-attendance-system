import axios from 'axios';

const getBaseApiUrl = () => {
  let url = import.meta.env.VITE_API_URL || (
    import.meta.env.PROD 
      ? 'https://ai-face-attendance-system-bxge.onrender.com/api' 
      : '/api'
  );
  if (!url) return '/api';
  url = url.trim().replace(/\/+$/, '');
  if ((url.startsWith('http://') || url.startsWith('https://')) && !url.endsWith('/api')) {
    url = `${url}/api`;
  }
  return url;
};

const API_BASE_URL = getBaseApiUrl();

export const getWsUrl = (path = '/ws/attendance') => {
  const base = getBaseApiUrl();
  if (base.startsWith('http://') || base.startsWith('https://')) {
    const wsProto = base.startsWith('https://') ? 'wss://' : 'ws://';
    const host = base.replace(/^https?:\/\//, '').split('/')[0];
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
