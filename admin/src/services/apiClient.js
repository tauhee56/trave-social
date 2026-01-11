import axios from 'axios';
import { useAuthStore } from '../stores/authStore';

const API_BASE = 'http://192.168.100.10:5000/api';

const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 10000
});

// Add token to headers
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle errors
apiClient.interceptors.response.use(
  (res) => res.data,
  (err) => {
    if (err.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    throw err;
  }
);

export default apiClient;
