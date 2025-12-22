
import { apiService } from './apiService';


export async function getUserProfile(userId: string) {
  return await apiService.get(`/users/${userId}`);
}

export async function getUserPosts(userId: string) {
  return await apiService.get(`/posts`, { userId });
}

// Placeholder: implement sections/stories if backend supports
export async function getUserSections(userId: string) {
  return [];
}
export async function getUserStories(userId: string) {
  return [];
}

