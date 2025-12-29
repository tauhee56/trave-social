import axios from 'axios';

// Use local network IP for physical device
const API_BASE = 'http://192.168.100.209:5000/api';

async function apiRequest(method: string, url: string, data?: any, params?: any) {
  return axios({
    method,
    url: `${API_BASE}${url}`,
    data,
    params,
    timeout: 15000,
  }).then((res: { data: any }) => res.data);
}

const apiService = {
  get: (url: string, params?: any) => apiRequest('get', url, undefined, params),
  post: (url: string, data?: any) => apiRequest('post', url, data),
  put: (url: string, data?: any) => apiRequest('put', url, data),
  delete: (url: string, data?: any) => apiRequest('delete', url, data),
};

export default apiService;
