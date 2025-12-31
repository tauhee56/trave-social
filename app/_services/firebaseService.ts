import { apiService } from './apiService';


export async function getUserProfile(userId: string) {
  // Backend API call for user profile
  try {
    const res = await apiService.get(`/users/${userId}`);
    return res?.data || res;
  } catch (err: any) {
    console.error('[getUserProfile] Error:', err.message);
    return null;
  }
}

export async function getUserPosts(userId: string) {
  // Backend API call for user posts - correct endpoint
  try {
    const res = await apiService.get(`/users/${userId}/posts`);
    return res?.data || res || [];
  } catch (err: any) {
    console.error('[getUserPosts] Error:', err.message);
    return [];
  }
}

export async function getUserSections(userId: string) {
  // Backend API call for user sections
  try {
    const res = await apiService.get(`/users/${userId}/sections`);
    return res?.data || res?.sections || [];
  } catch (err: any) {
    console.error('[getUserSections] Error:', err.message);
    return [];
  }
}

export async function getUserStories(userId: string) {
  // Backend API call for user stories
  try {
    const res = await apiService.get(`/users/${userId}/stories`);
    return res?.data || res?.stories || [];
  } catch (err: any) {
    console.error('[getUserStories] Error:', err.message);
    return [];
  }
}

export async function getUserHighlights(userId: string) {
  // Backend API call for user highlights
  try {
    const res = await apiService.get(`/users/${userId}/highlights`);
    return res?.data || res?.highlights || [];
  } catch (err: any) {
    console.error('[getUserHighlights] Error:', err.message);
    return [];
  }
}

