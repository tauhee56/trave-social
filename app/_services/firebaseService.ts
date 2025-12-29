import { apiService } from './apiService';


export async function getUserProfile(userId: string) {
  // Backend API call for user profile
  return await apiService.get(`/users/${userId}`);
}

export async function getUserPosts(userId: string) {
  // Backend API call for user posts
  return await apiService.get(`/posts`, { userId });
}

export async function getUserSections(userId: string) {
  // TODO: Implement backend API for user sections
  return [];
}

export async function getUserStories(userId: string) {
  // TODO: Implement backend API for user stories
  return [];
}

