import apiService from './apiService';

// getCurrentUid removed, use context

export async function getUserProfile(userId: string, requesterUserId?: string) {
  try {
    const params = requesterUserId ? { requesterUserId } : {};
    const response = await apiService.get(`/users/${userId}`, params);
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

export async function getUserPosts(userId: string, requesterUserId?: string) {
  try {
    const params: any = {};
    if (requesterUserId) {
      params.requesterUserId = requesterUserId;
    }
    
    const response = await apiService.get(`/users/${userId}/posts`, params);
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

export async function getUserHighlights(userId: string, requesterUserId?: string) {
  try {
    const params: any = {};
    if (requesterUserId) {
      params.requesterUserId = requesterUserId;
    }
    
    const response = await apiService.get(`/users/${userId}/highlights`, params);
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

export async function getUserSections(userId: string, requesterUserId?: string) {
  try {
    const params: any = {};
    if (requesterUserId) {
      params.requesterUserId = requesterUserId;
    }
    
    const response = await apiService.get(`/users/${userId}/sections`, params);
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

export async function getUserStories(userId: string, requesterUserId?: string) {
  try {
    const params: any = {};
    if (requesterUserId) {
      params.requesterUserId = requesterUserId;
    }
    
    const response = await apiService.get(`/users/${userId}/stories`, params);
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

// Fetch posts where the user is tagged
export async function getTaggedPosts(taggedUserId: string, requesterUserId?: string) {
  try {
    const params: any = { taggedUserId };
    if (requesterUserId) {
      params.requesterUserId = requesterUserId;
    }

    const response = await apiService.get('/posts', params);
    console.log('[API] getTaggedPosts response:', response);

    if (response?.success) {
      const posts = response.data || response.posts || [];
      return { success: true, data: Array.isArray(posts) ? posts : [] };
    }
    if (Array.isArray(response)) {
      return { success: true, data: response };
    }
    return { success: false, error: response?.error || 'Failed to fetch tagged posts', data: [] };
  } catch (error: any) {
    console.error('[API] getTaggedPosts error:', error.message);
    return { success: false, error: error.message, data: [] };
  }
}
