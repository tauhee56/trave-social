import { apiService } from '../../app/_services/apiService';

// ============= COMMENTS CRUD =============

/**
 * Add a comment to a post
 */
export async function addComment(postId: string, userId: string, userName: string, userAvatar: string, text: string) {
  try {
    const data = await apiService.post(`/posts/${postId}/comments`, { userId, userName, userAvatar, text });
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
    const data = await apiService.patch(`/posts/${postId}/comments/${commentId}`, { userId, text: newText });
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
    const data = await apiService.delete(`/posts/${postId}/comments/${commentId}`, { userId });
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
    const data = await apiService.post(`/posts/${postId}/comments/${parentCommentId}/replies`, reply);
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
    const data = await apiService.patch(`/posts/${postId}/comments/${commentId}/replies/${replyId}`, { userId, text: newText });
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
    const data = await apiService.delete(`/posts/${postId}/comments/${commentId}/replies/${replyId}`, { userId });
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
    const data = await apiService.post(`/posts/${postId}/comments/${commentId}/reactions`, { userId, reactionType });
    return data;
  } catch (error: any) {
    console.error('❌ addCommentReaction error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all comments for a post
 */
export async function getPostComments(postId: string) {
  try {
    const data = await apiService.get(`/posts/${postId}/comments`);
    return data;
  } catch (error: any) {
    console.error('❌ getPostComments error:', error);
    return { success: false, error: error.message, data: [] };
  }
}

