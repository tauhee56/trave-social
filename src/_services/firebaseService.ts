import apiService from './apiService';

// getCurrentUid removed, use context

export async function getUserProfile(userId: string) {
  try {
    const response = await apiService.get(`/users/${userId}`);
    console.log('[API] getUserProfile response:', response);
    
    // Return the response as-is if it has success property
    if (response && typeof response === 'object' && 'success' in response) {
      return response;
    }
    
    // Fallback: wrap in success object
    return { success: true, data: response };
  } catch (error: any) {
    console.error('[API] getUserProfile error:', error.message);
    return { success: false, error: error.message, data: null };
  }
}

export async function getUserPosts(userId: string) {
  try {
    const response = await apiService.get(`/users/${userId}/posts`);
    console.log('[API] getUserPosts response:', response);
    
    if (response?.success) {
      const posts = response.data || response.posts || [];
      return { success: true, data: Array.isArray(posts) ? posts : [] };
    }
    if (Array.isArray(response)) {
      return { success: true, data: response };
    }
    return { success: false, error: response?.error || 'Failed to fetch posts', data: [] };
  } catch (error: any) {
    console.error('[API] getUserPosts error:', error.message);
    return { success: false, error: error.message, data: [] };
  }
}

export async function getUserHighlights(userId: string) {
  try {
    const response = await apiService.get(`/users/${userId}/highlights`);
    console.log('[API] getUserHighlights response:', response);
    
    if (response?.success) {
      const highlights = response.data || response.highlights || [];
      return { success: true, data: Array.isArray(highlights) ? highlights : [] };
    }
    if (Array.isArray(response)) {
      return { success: true, data: response };
    }
    return { success: false, error: response?.error || 'Failed to fetch highlights', data: [] };
  } catch (error: any) {
    console.error('[API] getUserHighlights error:', error.message);
    return { success: false, error: error.message, data: [] };
  }
}

export async function getUserSections(userId: string) {
  try {
    const response = await apiService.get(`/users/${userId}/sections`);
    console.log('[API] getUserSections response:', response);
    
    if (response?.success) {
      const sections = response.data || response.sections || [];
      return { success: true, data: Array.isArray(sections) ? sections : [] };
    }
    if (Array.isArray(response)) {
      return { success: true, data: response };
    }
    return { success: false, error: response?.error || 'Failed to fetch sections', data: [] };
  } catch (error: any) {
    console.error('[API] getUserSections error:', error.message);
    return { success: false, error: error.message, data: [] };
  }
}

export async function getUserStories(userId: string) {
  try {
    const response = await apiService.get(`/users/${userId}/stories`);
    console.log('[API] getUserStories response:', response);
    
    if (response?.success) {
      const stories = response.data || response.stories || [];
      return { success: true, data: Array.isArray(stories) ? stories : [] };
    }
    if (Array.isArray(response)) {
      return { success: true, data: response };
    }
    return { success: false, error: response?.error || 'Failed to fetch stories', data: [] };
  } catch (error: any) {
    console.error('[API] getUserStories error:', error.message);
    return { success: false, error: error.message, data: [] };
  }
}
