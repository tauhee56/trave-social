import apiService from './apiService';

// getCurrentUid removed, use context

export async function getUserProfile(userId: string) {
  return await apiService.get(`/users/${userId}`);
}

export async function getUserPosts(userId: string) {
  return await apiService.get(`/posts`, { userId });
}

export async function getUserHighlights(userId: string) {
  return await apiService.get(`/highlights`, { userId });
}
// Placeholder: implement sections/stories if backend supports
export async function getUserSections(userId: string) {
  return await apiService.get(`/sections`, { userId });
}

export async function getUserStories(userId: string) {
  return await apiService.get(`/stories`, { userId });
}
