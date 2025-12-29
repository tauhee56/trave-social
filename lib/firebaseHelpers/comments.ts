

// ============= COMMENTS CRUD =============

/**
 * Add a comment to a post
 */
export async function addComment(postId: string, userId: string, userName: string, userAvatar: string, text: string) {
  try {
    const res = await fetch(`/api/posts/${postId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, userName, userAvatar, text })
    });
    const data = await res.json();
    return data;
  } catch (error: any) {
    console.error('❌ addComment error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Edit a comment
 */
export async function editComment(postId: string, commentId: string, userId: string, newText: string) {
  try {
    const res = await fetch(`/api/posts/${postId}/comments/${commentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, text: newText })
    });
    const data = await res.json();
    return data;
  } catch (error: any) {
    console.error('❌ editComment error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete a comment
 */
export async function deleteComment(postId: string, commentId: string, userId: string, postOwnerId: string) {
  try {
    const res = await fetch(`/api/posts/${postId}/comments/${commentId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });
    const data = await res.json();
    return data;
  } catch (error: any) {
    console.error('❌ deleteComment error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Add a reply to a comment
 */
export async function addCommentReply(postId: string, parentCommentId: string, reply: any) {
  try {
    const res = await fetch(`/api/posts/${postId}/comments/${parentCommentId}/replies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reply)
    });
    const data = await res.json();
    return data;
  } catch (error: any) {
    console.error('❌ addCommentReply error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Edit a reply
 */
export async function editCommentReply(postId: string, commentId: string, replyId: string, userId: string, newText: string) {
  try {
    const res = await fetch(`/api/posts/${postId}/comments/${commentId}/replies/${replyId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, text: newText })
    });
    const data = await res.json();
    return data;
  } catch (error: any) {
    console.error('❌ editCommentReply error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete a reply
 */
export async function deleteCommentReply(postId: string, commentId: string, replyId: string, userId: string, postOwnerId: string) {
  try {
    const res = await fetch(`/api/posts/${postId}/comments/${commentId}/replies/${replyId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });
    const data = await res.json();
    return data;
  } catch (error: any) {
    console.error('❌ deleteCommentReply error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Add reaction to comment (like, love, laugh, etc.)
 */
export async function addCommentReaction(postId: string, commentId: string, userId: string, reactionType: string) {
  try {
    const res = await fetch(`/api/posts/${postId}/comments/${commentId}/reactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, reactionType })
    });
    const data = await res.json();
    return data;
  } catch (error: any) {
    console.error('❌ addCommentReaction error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all comments for a post
 */
/**
 * Get all comments for a post
 */
export async function getPostComments(postId: string) {
  try {
    const res = await fetch(`/api/posts/${postId}/comments`);
    const data = await res.json();
    return data;
  } catch (error: any) {
    console.error('❌ getPostComments error:', error);
    return { success: false, error: error.message, data: [] };
  }
}

