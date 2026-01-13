import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

function normalizeApiBase(url: string): string {
  const trimmed = url.replace(/\/+$/, '');
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
}

// ✅ SIMPLIFIED API URL RESOLUTION - Clean & Efficient
const getAPIBaseURL = () => {
  // Priority 1: Environment variable (for all platforms)
  const envUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (envUrl) {
    if (__DEV__) console.log('📡 [apiService] Using environment URL:', envUrl);

    // On real devices, localhost points to the device itself.
    // If envUrl is localhost in dev, derive the host from the Expo dev server (Metro).
    if (__DEV__ && Platform.OS !== 'web') {
      const isLocalhost = envUrl.includes('localhost') || envUrl.includes('127.0.0.1');
      if (isLocalhost) {
        const debuggerHost =
          (Constants as any)?.expoConfig?.hostUri ||
          (Constants as any)?.manifest2?.extra?.expoClient?.hostUri ||
          (Constants as any)?.manifest?.debuggerHost;

        const host = typeof debuggerHost === 'string' ? debuggerHost.split(':')[0] : null;
        if (host) {
          const derivedUrl = `http://${host}:5000/api`;
          if (__DEV__) console.log('📡 [apiService] Dev host derived from debuggerHost:', derivedUrl);
          return derivedUrl;
        }
      }
    }

    return normalizeApiBase(envUrl);
  }

  // Priority 2: Development localhost
  if (__DEV__) {
    const debuggerHost =
      (Constants as any)?.expoConfig?.hostUri ||
      (Constants as any)?.manifest2?.extra?.expoClient?.hostUri ||
      (Constants as any)?.manifest?.debuggerHost;

    const host = typeof debuggerHost === 'string' ? debuggerHost.split(':')[0] : null;
    if (host) {
      const derivedUrl = `http://${host}:5000/api`;
      if (__DEV__) console.log('📡 [apiService] Dev host derived from debuggerHost:', derivedUrl);
      return derivedUrl;
    }

    const localUrl = 'http://localhost:5000/api';
    if (__DEV__) console.log('📱 [apiService] Dev mode: Using localhost:', localUrl);
    return localUrl;
  }

  // Priority 3: Production fallback
  const productionUrl = 'https://trave-social-backend.onrender.com/api';
  if (__DEV__) console.log('🌐 [apiService] Production fallback:', productionUrl);
  return productionUrl;
};

// Lazy initialization - create axios instance on first use, not at module load
let axiosInstance: any = null;

function getAxiosInstance() {
  if (!axiosInstance) {
    const API_BASE = getAPIBaseURL();
    
    axiosInstance = axios.create({
      baseURL: API_BASE,
      timeout: 60000,  // 60s for cold starts
      validateStatus: () => true,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    // ✅ Request Interceptor - Add auth token
    axiosInstance.interceptors.request.use(async (config: any) => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch (error) {
        if (__DEV__) console.warn('[API] Token fetch failed:', error);
      }
      return config;
    });

    // ✅ Response Interceptor - Handle auth & errors
    axiosInstance.interceptors.response.use(
      (response: any) => {
        if (__DEV__ && response.config.url !== '/api/posts') {
          console.log(`✅ [API] ${response.config.method?.toUpperCase()} ${response.config.url}:`, {
            status: response.status,
            success: response.data?.success,
          });
        }
        return response;
      },
      async (error: any) => {
        // Handle 401 Unauthorized - Clear auth
        if (error.response?.status === 401) {
          try {
            await AsyncStorage.multiRemove(['token', 'userId']);
            if (__DEV__) console.log('[API] Auth cleared - 401 response');
          } catch (e) {
            if (__DEV__) console.error('[API] Failed to clear storage:', e);
          }
        }
        return Promise.reject(error);
      }
    );
  }
  return axiosInstance;
}

// Add request interceptor to include Authorization header - moved inside getAxiosInstance()

// Add response interceptor to handle errors - moved inside getAxiosInstance()

// ✅ SIMPLIFIED & ROBUST API REQUEST HANDLER
async function apiRequestWithRetry(method: string, url: string, data?: any, config?: any, retries: number = 3): Promise<any> {
  const axiosInstance = getAxiosInstance();
  let lastError: any;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const requestConfig: any = { method, url };

      const canTreatConfigAsParams = (obj: any) => {
        if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
        if ('params' in obj) return false;
        // Avoid treating axios config as params
        if ('headers' in obj) return false;
        if ('timeout' in obj) return false;
        if ('baseURL' in obj) return false;
        if ('signal' in obj) return false;
        return Object.keys(obj).length > 0;
      };

      // ✅ Clean data handling
      if (data) {
        if (method === 'get') {
          requestConfig.params = config?.params || data;
        } else {
          requestConfig.data = data;
        }
      }

      // Back-compat: allow passing query params directly as the config object
      if (method === 'get' && !requestConfig.params && canTreatConfigAsParams(config)) {
        requestConfig.params = config;
      }

      // ✅ Add additional params from config
      if (config?.params) {
        requestConfig.params = { ...requestConfig.params, ...config.params };
      }

      // Make the request
      const response = await axiosInstance(requestConfig);
      
      // ✅ Standardized response handling
      if (response.data) {
        return response.data;
      }
      
      return { success: true, data: response.data };
      
    } catch (error: any) {
      lastError = error;
      const isRetryable = 
        error.code === 'ERR_NETWORK' || 
        error.code === 'ECONNABORTED' || 
        error.message === 'Network Error' ||
        (error.response?.status >= 500 && error.response?.status < 600);

      // Retry logic for network/server errors
      if (isRetryable && attempt < retries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        if (__DEV__) {
          console.log(`🔄 [API] Retry ${attempt}/${retries} for ${method.toUpperCase()} ${url} in ${delay}ms`);
        }
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // ✅ Clean error logging
      if (__DEV__) {
        console.error(`❌ [API] ${method.toUpperCase()} ${url} failed:`, {
          status: error.response?.status,
          message: error.message,
          code: error.code,
        });
      }
      
      throw error;
    }
  }
  
  throw lastError;
}

// Use the retry version for all API calls
async function apiRequest(method: string, url: string, data?: any, config?: any) {
  return apiRequestWithRetry(method, url, data, config);
}

// ✅ COMPLETE API SERVICE - All endpoints available
export const apiService = {
  // Standard HTTP methods
  get: (url: string, config?: any) => apiRequest('get', url, undefined, config),
  post: (url: string, data?: any) => apiRequest('post', url, data),
  put: (url: string, data?: any) => apiRequest('put', url, data),
  patch: (url: string, data?: any) => apiRequest('patch', url, data),
  delete: (url: string, data?: any) => apiRequest('delete', url, data),

  // ✅ Social Media Features
  getPosts: (params?: any) => apiRequest('get', '/posts', undefined, params),
  createPost: (data: any) => apiRequest('post', '/posts', data),
  likePost: (postId: string, userId: string) => apiRequest('post', `/posts/${postId}/like`, { userId }),
  unlikePost: (postId: string, userId: string) => apiRequest('delete', `/posts/${postId}/like`, { userId }),
  
  // ✅ User Management
  getUser: (userId: string) => apiRequest('get', `/users/${userId}`),
  updateUser: (userId: string, data: any) => apiRequest('patch', `/users/${userId}`, data),
  getUserPosts: (userId: string, params?: any) => apiRequest('get', `/users/${userId}/posts`, undefined, params),
  
  // ✅ Auth
  loginFirebase: (data: any) => apiRequest('post', '/auth/login-firebase', data),
  registerFirebase: (data: any) => apiRequest('post', '/auth/register-firebase', data),
  
  // ✅ Media Upload
  uploadMedia: (data: any) => apiRequest('post', '/media/upload', data),
  
  // ✅ Live Streaming
  getLiveStreams: () => apiRequest('get', '/live-streams'),
  createLiveStream: (data: any) => apiRequest('post', '/live-streams', data),
  
  // ✅ Chat/Messaging
  getConversations: (params?: any) => apiRequest('get', '/conversations', undefined, params),
  getMessages: (conversationId: string, params?: any) => apiRequest('get', `/conversations/${conversationId}/messages`, undefined, params),
  sendMessage: (conversationId: string, data: any) => apiRequest('post', `/conversations/${conversationId}/messages`, data),
  
  // ✅ Categories & Locations
  getCategories: () => apiRequest('get', '/categories'),
  getLocationCount: () => apiRequest('get', '/posts/location-count'),
  
  // ✅ Status Check
  checkStatus: () => apiRequest('get', '/status'),
  checkHealth: () => apiRequest('get', '/health'),
};

export default apiService;
