

/**
 * Get a post by its ID
 */
export async function getPostById(postId: string) {
  try {
    const res = await fetch(`/api/posts/${postId}`);
    const data = await res.json();
    return data;
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Like a post
 */
export async function likePost(postId: string, userId: string) {
  try {
    const res = await fetch(`/api/posts/${postId}/like`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });
    const data = await res.json();
    return data;
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Unlike a post
 */
export async function unlikePost(postId: string, userId: string) {
  try {
    const res = await fetch(`/api/posts/${postId}/like`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });
    const data = await res.json();
    return data;
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
