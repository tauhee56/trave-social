import axios from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

function normalizeApiBase(url: string): string {
  const trimmed = url.replace(/\/+$/, '');
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
}

// Determine API base URL based on platform
const getAPIBaseURL = () => {
  // Try env variable first
  if (process.env.EXPO_PUBLIC_API_BASE_URL) {
    const envUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
    console.log('📡 [src/apiService] Using env:', envUrl);

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
          console.log('📡 [src/apiService] Dev host derived from debuggerHost:', derivedUrl);
          return derivedUrl;
        }
      }
    }

    return normalizeApiBase(envUrl);
  }

  // Dev fallback for native
  if (__DEV__ && Platform.OS !== 'web') {
    const debuggerHost =
      (Constants as any)?.expoConfig?.hostUri ||
      (Constants as any)?.manifest2?.extra?.expoClient?.hostUri ||
      (Constants as any)?.manifest?.debuggerHost;

    const host = typeof debuggerHost === 'string' ? debuggerHost.split(':')[0] : null;
    if (host) {
      const derivedUrl = `http://${host}:5000/api`;
      console.log('📡 [src/apiService] Dev host derived from debuggerHost:', derivedUrl);
      return derivedUrl;
    }
  }
  
  // Use Render URL (production)
  const renderUrl = 'https://trave-social-backend.onrender.com/api';
  console.log('📡 [src/apiService] Using Render:', renderUrl);
  return renderUrl;
};

// Lazy init axios instance
let axiosInstance: any = null;

function getAxiosInstance() {
  if (!axiosInstance) {
    const API_BASE = getAPIBaseURL();
    console.log('✅ [src/apiService] API BASE URL:', API_BASE);
    
    axiosInstance = axios.create({
      baseURL: API_BASE,
      timeout: 60000, // Increased timeout for Render cold start (60s)
    });
  }
  return axiosInstance;
}

// Retry logic for handling Render cold starts
async function apiRequestWithRetry(method: string, url: string, data?: any, params?: any, retries: number = 3): Promise<any> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const instance = getAxiosInstance();
      const response = await instance({
        method,
        url,
        data,
        params,
      });
      return response.data;
    } catch (error: any) {
      lastError = error;
      const isNetworkError = error.code === 'ERR_NETWORK' || error.message === 'Network Error';
      const isTimeout = error.code === 'ECONNABORTED';
      
      // Only retry on network errors or timeouts (likely cold start)
      if ((isNetworkError || isTimeout) && attempt < retries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // Exponential backoff: 1s, 2s, 4s (max 10s)
        console.log(`[src/apiService] ${method.toUpperCase()} ${url} failed (attempt ${attempt}/${retries}), retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      console.error(`[src/apiService] ${method.toUpperCase()} ${url} failed:`, error.message);
      throw error;
    }
  }
  
  throw lastError;
}

async function apiRequest(method: string, url: string, data?: any, params?: any) {
  return apiRequestWithRetry(method, url, data, params);
}

const apiService = {
  get: (url: string, params?: any) => apiRequest('get', url, undefined, params),
  post: (url: string, data?: any) => apiRequest('post', url, data),
  put: (url: string, data?: any) => apiRequest('put', url, data),
  patch: (url: string, data?: any) => apiRequest('patch', url, data),
  delete: (url: string, data?: any) => apiRequest('delete', url, data),
};

export default apiService;
