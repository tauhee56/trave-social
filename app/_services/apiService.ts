import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Determine API base URL based on platform
// On Android emulator: use 10.0.2.2 to reach host machine
// On physical device or iOS: use localhost or actual server IP
const getAPIBaseURL = () => {
  // Try to get from environment variable (for Expo)
  const envUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  console.log('📡 [apiService] Checking env variable EXPO_PUBLIC_API_BASE_URL:', envUrl);
  
  if (envUrl) {
    console.log('✅ [apiService] Using env API_BASE:', envUrl);
    return envUrl;
  }
  
  // Fallback: Use Render URL directly (hardcoded as backup)
  const renderUrl = 'https://trave-social-backend.onrender.com/api';
  console.log('📡 [apiService] Env not found, trying Render URL:', renderUrl);
  
  // On Android emulator, localhost is the emulator itself, use 10.0.2.2 for host
  if (Platform.OS === 'android') {
    console.log('📱 [apiService] Android detected - trying Render first');
    return renderUrl;
  }
  
  // On iOS simulator, localhost works fine
  if (Platform.OS === 'ios') {
    console.log('📱 [apiService] iOS detected - using Render URL');
    return renderUrl;
  }
  
  // Web/default fallback
  console.log('📱 [apiService] Web/default - using Render URL');
  return renderUrl;
};

// Lazy initialization - create axios instance on first use, not at module load
let axiosInstance: any = null;

function getAxiosInstance() {
  if (!axiosInstance) {
    const API_BASE = getAPIBaseURL();
    console.log('✅ [apiService] API BASE URL (final):', API_BASE);
    
    axiosInstance = axios.create({
      baseURL: API_BASE,
      timeout: 15000,
      validateStatus: () => true,
    });
    
    // Add interceptors
    axiosInstance.interceptors.request.use(async (config: any) => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch (error) {
        console.error('[API] Failed to get token:', error);
      }
      return config;
    });

    axiosInstance.interceptors.response.use(
      (response: any) => response,
      async (error: any) => {
        if (error.response?.status === 401) {
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
  }
  return axiosInstance;
}

// Add request interceptor to include Authorization header - moved inside getAxiosInstance()

// Add response interceptor to handle errors - moved inside getAxiosInstance()

async function apiRequest(method: string, url: string, data?: any, config?: any) {
  try {
    const axiosInstance = getAxiosInstance();
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
    console.error('[API Error Details]', {
      code: error.code,
      errno: error.errno,
      syscall: error.syscall,
      address: error.address,
      port: error.port,
      response: error.response?.status,
      isAxios: error.isAxios,
      config: error.config?.baseURL
    });
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
