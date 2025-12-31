import axios from 'axios';
import { Platform } from 'react-native';

// Determine API base URL based on platform
const getAPIBaseURL = () => {
  // Try env variable first
  if (process.env.EXPO_PUBLIC_API_BASE_URL) {
    console.log('📡 [src/apiService] Using env:', process.env.EXPO_PUBLIC_API_BASE_URL);
    return process.env.EXPO_PUBLIC_API_BASE_URL;
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
      timeout: 30000,
    });
  }
  return axiosInstance;
}

async function apiRequest(method: string, url: string, data?: any, params?: any) {
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
    console.error(`[src/apiService] ${method.toUpperCase()} ${url} failed:`, error.message);
    throw error;
  }
}

const apiService = {
  get: (url: string, params?: any) => apiRequest('get', url, undefined, params),
  post: (url: string, data?: any) => apiRequest('post', url, data),
  put: (url: string, data?: any) => apiRequest('put', url, data),
  delete: (url: string, data?: any) => apiRequest('delete', url, data),
};

export default apiService;
