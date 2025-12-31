import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';


// Use environment variable for API base URL; defaults to localhost for local development
const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:5000/api';
console.log('API BASE URL (resolved):', API_BASE);

// Create axios instance with better error handling
const axiosInstance = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  validateStatus: () => true,
});

// Add request interceptor to include Authorization header
axiosInstance.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.warn('[API] Failed to get token from AsyncStorage:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle errors
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    // Handle token expiry
    if (error.response?.status === 401) {
      console.warn('[API] Unauthorized - clearing token');
      try {
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('userId');
      } catch (e) {
        console.error('[API] Failed to clear storage:', e);
      }
    }
    return Promise.reject(error);
  }
);

async function apiRequest(method: string, url: string, data?: any, config?: any) {
  try {
    const requestConfig: any = {
      method,
      url,
      data,
    };
    
    // Handle params from config object
    if (config?.params) {
      requestConfig.params = config.params;
    }
    
    // Handle old-style params as second argument for get
    if (method === 'get' && config && !config.params && typeof config === 'object') {
      requestConfig.params = config;
    }
    
    console.log(`[API Request] ${method.toUpperCase()} ${url}`, requestConfig.params || '');
    
    const response = await axiosInstance(requestConfig);
    
    console.log(`[API Response] ${method.toUpperCase()} ${url}:`, {
      status: response.status,
      success: response.data?.success,
      hasData: !!response.data?.data
    });
    
    return response.data || { success: false, error: 'No response data' };
  } catch (error: any) {
    console.error(`[API Error] ${method.toUpperCase()} ${url}:`, error.message);
    throw error; // Re-throw so caller can handle
  }
}

export const apiService = {
  get: (url: string, config?: any) => apiRequest('get', url, undefined, config),
  post: (url: string, data?: any) => apiRequest('post', url, data),
  put: (url: string, data?: any) => apiRequest('put', url, data),
  delete: (url: string, data?: any) => apiRequest('delete', url, data),

  // Chat helpers
  getMessages: (conversationId: string) => apiRequest('get', `/conversations/${conversationId}/messages`),
  sendMessage: (conversationId: string, sender: string, text: string) => apiRequest('post', `/conversations/${conversationId}/messages`, { sender, text }),
};
