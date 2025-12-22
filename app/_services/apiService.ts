import axios from 'axios';

const API_BASE = 'http://localhost:5000/api'; // Update for production


async function apiRequest(method: string, url: string, data?: any, params?: any) {
  return axios({
    method,
    url: `${API_BASE}${url}`,
    data,
    params,
    timeout: 10000,
  }).then((res: { data: any }) => res.data);
}

export const apiService = {
  get: (url: string, params?: any) => apiRequest('get', url, undefined, params),
  post: (url: string, data?: any) => apiRequest('post', url, data),
  put: (url: string, data?: any) => apiRequest('put', url, data),
  delete: (url: string, data?: any) => apiRequest('delete', url, data),

  // Chat helpers
  getMessages: (conversationId: string) => apiRequest('get', `/conversations/${conversationId}/messages`),
  sendMessage: (conversationId: string, sender: string, text: string) => apiRequest('post', `/conversations/${conversationId}/messages`, { sender, text }),
};
