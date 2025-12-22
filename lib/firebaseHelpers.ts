// Chat helpers
export async function fetchMessages(conversationId: string) {
  return apiService.getMessages(conversationId);
}

export async function sendMessage(conversationId: string, sender: string, text: string) {
  return apiService.sendMessage(conversationId, sender, text);
}
import { apiService } from '../app/_services/apiService';
import {
    sendLiveComment as socketSendLiveComment,
    subscribeToLiveStream as socketSubscribeToLiveStream,
    subscribeToMessages as socketSubscribeToMessages
} from '../app/_services/socketService';

function getCurrentUid() {
  const user = auth().currentUser;
  if (!user) { throw new Error('No current user'); }
  return user.uid;
}

// ============= FOLLOW REQUESTS & NOTIFICATIONS =============
export async function sendFollowRequest(fromUserId: string, toUserId: string) {
  return apiService.post(`/users/${toUserId}/follow-request`, { from: fromUserId });
}

export async function rejectFollowRequest(privateUserId: string, requesterId: string) {
  return apiService.post(`/users/${privateUserId}/follow-request/reject`, { from: requesterId });
}

export async function addNotification(payload: any) {
  return apiService.post('/notifications', payload);
}

// ============= USER PROFILE =============
export async function updateUserProfile(uid: string, data: any) {
  return apiService.put(`/users/${uid}`, data);
}

// ============= MEDIA =============
export async function uploadImage(uri: string, path?: string): Promise<{ success: boolean; url?: string; error?: string }> {
  const res = await apiService.post('/media/upload', { image: uri, path });
  return { success: true, url: res?.url || res?.secureUrl || res?.location };
}

export async function deleteImage(path: string) {
  await apiService.delete('/media', { path });
  return { success: true };
}

// ============= CATEGORIES & SECTIONS =============
export const DEFAULT_CATEGORIES = [
  { name: 'Winter holidays', image: 'https://images.unsplash.com/photo-1519125323398-675f0ddb6308?w=400&h=400&fit=crop' },
  { name: 'Beach', image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&h=400&fit=crop' },
  { name: 'City life', image: 'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=400&h=400&fit=crop' },
  { name: 'London', image: 'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?w=400&h=400&fit=crop' },
  { name: 'Christmas', image: 'https://images.unsplash.com/photo-1519125323398-675f0ddb6308?w=400&h=400&fit=crop' },
];

export async function getCategories() {
  try {
    const res = await apiService.get('/categories');
    const categories = Array.isArray(res) ? res : res?.categories;
    return categories?.length ? categories : DEFAULT_CATEGORIES;
  } catch {
    return DEFAULT_CATEGORIES;
  }
}

export async function getUserSections(userId: string) {
  const data = await apiService.get(`/users/${userId}/sections`);
  return { success: true, data: data?.sections || data || [] };
}

export async function addUserSection(userId: string, section: { name: string; postIds: string[]; coverImage?: string }) {
  await apiService.post(`/users/${userId}/sections`, section);
  return { success: true };
}

export async function updateUserSection(userId: string, section: { name: string; postIds: string[]; coverImage?: string }) {
  await apiService.put(`/users/${userId}/sections/${encodeURIComponent(section.name)}`, section);
  return { success: true };
}

export async function deleteUserSection(userId: string, sectionName: string) {
  await apiService.delete(`/users/${userId}/sections/${encodeURIComponent(sectionName)}`);
  return { success: true };
}

// ============= POSTS =============
export async function getLocationVisitCount(location: string): Promise<number> {
  if (!location) return 0;
  const res = await apiService.get('/posts/location-count', { location });
  return res?.count ?? 0;
}

export async function getAllPosts(limitCount: number = 50) {
  const posts = await apiService.get('/posts', { limit: limitCount });
  const data = posts?.data || posts || [];
  return { success: true, posts: data, data };
}

export async function createPost(
  userId: string,
  mediaUris: string[],
  caption: string,
  location?: string,
  mediaType: 'image' | 'video' = 'image',
  locationData?: { name: string; address: string; lat?: number; lon?: number; verified?: boolean },
  taggedUserIds?: string[],
  category?: string,
  hashtags?: string[],
  mentions?: string[]
) {
  const mediaUrls = [];
  for (const uri of mediaUris || []) {
    const upload = await uploadImage(uri);
    if (!upload?.url) throw new Error(upload?.error || 'Upload failed');
    mediaUrls.push(upload.url);
  }
  const payload = { userId, caption, location, locationData, mediaType, mediaUrls, category, hashtags, mentions, taggedUserIds };
  const res = await apiService.post('/posts', payload);
  return { success: true, postId: res?.id || res?._id || res?.postId };
}

export async function getUserPosts(userId: string) {
  const posts = await apiService.get(`/users/${userId}/posts`);
  return { success: true, data: posts?.data || posts || [] };
}

export async function getFeedPosts(limitCount: number = 20) {
  const posts = await apiService.get('/feed', { limit: limitCount });
  const data = posts?.posts || posts?.data || posts || [];
  return { success: true, posts: data, data };
}

export async function likePost(postId: string, userId: string) {
  await apiService.post(`/posts/${postId}/like`, { userId });
  return { success: true };
}

export async function unlikePost(postId: string, userId: string) {
  await apiService.delete(`/posts/${postId}/like`, { userId });
  return { success: true };
}

export async function deletePost(postId: string, currentUserId?: string) {
  await apiService.delete(`/posts/${postId}`, { currentUserId });
  return { success: true };
}

// ============= COMMENTS =============
export async function addComment(postId: string, userId: string, userName: string, userAvatar: string, text: string) {
  const res = await apiService.post(`/posts/${postId}/comments`, { userId, userName, userAvatar, text });
  return { success: true, id: res?.id || res?._id || res?.commentId };
}

export async function likeComment(postId: string, commentId: string, userId: string) {
  await apiService.post(`/posts/${postId}/comments/${commentId}/like`, { userId });
  return { success: true };
}

export async function unlikeComment(postId: string, commentId: string, userId: string) {
  await apiService.delete(`/posts/${postId}/comments/${commentId}/like`, { userId });
  return { success: true };
}

export async function getPostComments(postId: string) {
  const res = await apiService.get(`/posts/${postId}/comments`);
  const comments = res?.comments || res?.data || res || [];
  return { success: true, data: comments };
}

export async function deleteComment(postId: string, commentId: string) {
  await apiService.delete(`/posts/${postId}/comments/${commentId}`);
  return { success: true };
}

export async function editComment(postId: string, commentId: string, newText: string) {
  await apiService.put(`/posts/${postId}/comments/${commentId}`, { text: newText });
  return { success: true };
}

export async function addCommentReply(postId: string, parentCommentId: string, reply: any) {
  await apiService.post(`/posts/${postId}/comments/${parentCommentId}/replies`, reply);
  return { success: true };
}

// ============= STORIES =============
export async function createStory(
  userId: string,
  mediaUri: string,
  mediaType: 'image' | 'video' = 'image',
  locationData?: { name?: string; address?: string; placeId?: string }
) {
  const upload = await uploadImage(mediaUri);
  if (!upload?.url) throw new Error(upload?.error || 'Upload failed');
  const res = await apiService.post('/stories', { userId, mediaUrl: upload.url, mediaType, locationData });
  return { success: true, storyId: res?.id || res?._id || res?.storyId };
}

export async function getActiveStories() {
  const res = await apiService.get('/stories/active');
  const stories = res?.stories || res?.data || res || [];
  return { success: true, stories };
}

// ============= LIVE STREAMING (REST stubs) =============
export async function getActiveLiveStreams() {
  try {
    const res = await apiService.get('/live-streams/active');
    return res?.streams || res?.data || res || [];
  } catch {
    return [];
  }
}

export async function joinLiveStream(streamId: string, userId: string) {
  await apiService.post(`/live-streams/${streamId}/join`, { userId });
  return { success: true };
}

export async function leaveLiveStream(streamId: string, userId: string) {
  await apiService.post(`/live-streams/${streamId}/leave`, { userId });
  return { success: true };
}

// Real-time listeners to be replaced by WebSockets later
export function subscribeToMessages(onMessage: (msg: any) => void) {
  return socketSubscribeToMessages(onMessage);
}

export function subscribeToLiveStream(streamId: string, onUserJoined: (data: any) => void, onUserLeft: (data: any) => void, onLiveComment: (comment: any) => void) {
  return socketSubscribeToLiveStream(streamId, onUserJoined, onUserLeft, onLiveComment);
}

export function sendLiveComment(streamId: string, comment: any) {
  return socketSendLiveComment(streamId, comment);
}

export async function addLikedStatusToPosts(posts: any[], userId: string) {
  try {
    return (posts || []).map(post => ({
      ...post,
      liked: Array.isArray(post?.likes) ? post.likes.includes(userId) : false,
      likesCount: post?.likesCount || 0,
      commentsCount: post?.commentsCount || 0,
    }));
  } catch {
    return posts;
  }
}

export default {
  getCurrentUid,
  sendFollowRequest,
  rejectFollowRequest,
  addNotification,
  updateUserProfile,
  uploadImage,
  deleteImage,
  getCategories,
  getUserSections,
  addUserSection,
  updateUserSection,
  deleteUserSection,
  getLocationVisitCount,
  getAllPosts,
  createPost,
  getUserPosts,
  getFeedPosts,
  likePost,
  unlikePost,
  deletePost,
  addComment,
  likeComment,
  unlikeComment,
  getPostComments,
  deleteComment,
  editComment,
  addCommentReply,
  createStory,
  getActiveStories,
  getActiveLiveStreams,
  joinLiveStream,
  leaveLiveStream,
  subscribeToMessages,
  subscribeToLiveStream,
  addLikedStatusToPosts,
};

// ============= SEARCH & REGIONS =============
export async function getRegions() {
  try {
    // Return static regions for now - you can fetch from backend later
    return [
      { id: '1', name: 'North America' },
      { id: '2', name: 'Europe' },
      { id: '3', name: 'Asia' },
      { id: '4', name: 'South America' },
      { id: '5', name: 'Africa' },
      { id: '6', name: 'Australia' },
    ];
  } catch (error) {
    console.error('Error fetching regions:', error);
    return [];
  }
}

export async function searchUsers(query: string) {
  try {
    const users = await apiService.get('/users/search', { q: query });
    return users || [];
  } catch (error) {
    console.error('Error searching users:', error);
    return [];
  }
}
