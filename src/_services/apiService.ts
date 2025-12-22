import axios from 'axios';

// Use 10.0.2.2 for Android emulator (maps to host's localhost)
// Use 192.168.100.209 for physical device on same WiFi
const API_BASE = __DEV__ 
  ? 'http://10.0.2.2:5000/api'  // Android emulator
  : 'http://192.168.100.209:5000/api'; // Production/Physical device

async function apiRequest(method: string, url: string, data?: any, params?: any) {
  return axios({
    method,
    url: `${API_BASE}${url}`,
    data,
    params,
    timeout: 10000,
  }).then((res: { data: any }) => res.data);
}

const apiService = {
  get: (url: string, params?: any) => apiRequest('get', url, undefined, params),
  post: (url: string, data?: any) => apiRequest('post', url, data),
  put: (url: string, data?: any) => apiRequest('put', url, data),
  delete: (url: string, data?: any) => apiRequest('delete', url, data),
};

export default apiService;
