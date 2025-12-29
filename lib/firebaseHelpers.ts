import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from '../app/_services/apiService';
import {
    sendLiveComment as socketSendLiveComment,
    subscribeToLiveStream as socketSubscribeToLiveStream,
    subscribeToMessages as socketSubscribeToMessages
} from '../app/_services/socketService';

import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, User, updateProfile } from 'firebase/auth';
import { FIREBASE_CONFIG } from '../config/environment';

// Initialize Firebase app and auth
const firebaseApp = initializeApp(FIREBASE_CONFIG);
const auth = getAuth(firebaseApp);

// Firebase auth + MongoDB storage
export async function signInWithEmailPassword(email: string, password: string): Promise<{ success: boolean; user?: any; error?: string }> {
  try {
    console.log('[signInWithEmailPassword] Firebase login:', email);
    
    // Step 1: Firebase authentication
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;
    
    // Step 2: Sync with backend (save to MongoDB)
    const response = await apiService.post('/auth/login-firebase', {
      firebaseUid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName || email.split('@')[0],
      avatar: firebaseUser.photoURL
    });
    
    if (response.success) {
      // Step 3: Store token
      await AsyncStorage.setItem('token', response.token);
      await AsyncStorage.setItem('userId', firebaseUser.uid);
      await AsyncStorage.setItem('userEmail', firebaseUser.email || '');
      
      console.log('[signInWithEmailPassword] ✅ Firebase + MongoDB sync successful');
      return { success: true, user: firebaseUser };
    } else {
      console.error('[signInWithEmailPassword] ❌ MongoDB sync failed:', response.error);
      // Still return success since Firebase auth worked
      await AsyncStorage.setItem('userId', firebaseUser.uid);
      await AsyncStorage.setItem('userEmail', firebaseUser.email || '');
      return { success: true, user: firebaseUser };
    }
  } catch (error: any) {
    console.error('[signInWithEmailPassword] Firebase login error:', error.message);
    return { success: false, error: error.message };
  }
}

export async function registerWithEmailPassword(email: string, password: string, displayName?: string): Promise<{ success: boolean; user?: any; error?: string }> {
  try {
    console.log('[registerWithEmailPassword] Firebase register:', email);
    
    // Step 1: Firebase registration
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;
    
    // Update profile
    if (displayName) {
      await updateProfile(firebaseUser, { displayName });
    }
    
    // Step 2: Sync with backend (save to MongoDB)
    const response = await apiService.post('/auth/register-firebase', {
      firebaseUid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: displayName || email.split('@')[0],
      avatar: firebaseUser.photoURL
    });
    
    if (response.success) {
      // Step 3: Store token
      await AsyncStorage.setItem('token', response.token);
      await AsyncStorage.setItem('userId', firebaseUser.uid);
      await AsyncStorage.setItem('userEmail', firebaseUser.email || '');
      
      console.log('[registerWithEmailPassword] ✅ Firebase + MongoDB sync successful');
      return { success: true, user: firebaseUser };
    } else {
      console.error('[registerWithEmailPassword] ❌ MongoDB sync failed:', response.error);
      // Still return success since Firebase auth worked
      await AsyncStorage.setItem('userId', firebaseUser.uid);
      await AsyncStorage.setItem('userEmail', firebaseUser.email || '');
      return { success: true, user: firebaseUser };
    }
  } catch (error: any) {
    console.error('[registerWithEmailPassword] Firebase register error:', error.message);
    return { success: false, error: error.message };
  }
}

export async function verifyToken(): Promise<{ success: boolean; user?: any; error?: string }> {
  try {
    const token = await AsyncStorage.getItem('token');
    if (!token) return { success: false, error: 'No token found' };
    
    // Verify token with backend
    const response = await apiService.post('/auth/verify', {});
    
    if (response.success) {
      return { success: true };
    } else {
      // Token expired, clear it
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('userId');
      await AsyncStorage.removeItem('userEmail');
      return { success: false, error: 'Token expired' };
    }
  } catch (error: any) {
    console.error('[verifyToken] Error:', error.message);
    return { success: false, error: error.message };
  }
}

export async function signOutUser(): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('[signOutUser] Logging out');
    
    // Sign out from Firebase
    try {
      await signOut(auth);
    } catch (e) {
      console.warn('[signOutUser] Firebase signOut warning:', e);
    }
    
    // Notify backend about logout
    try {
      await apiService.post('/auth/logout', {});
    } catch (e) {
      console.warn('[signOutUser] Backend logout warning:', e);
    }
    
    // Clear AsyncStorage
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('userId');
    await AsyncStorage.removeItem('userEmail');
    
    console.log('[signOutUser] ✅ Logout successful');
    return { success: true };
  } catch (error: any) {
    console.error('[signOutUser] Error:', error.message);
    // Still clear local storage even if backend call fails
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('userId');
    await AsyncStorage.removeItem('userEmail');
    return { success: true };
  }
}

// ============= AUTHENTICATION =============

/**
 * Sign in user with Firebase then verify with backend
 */
export async function signInUser(email: string, password: string) {
  try {
    console.log('[signInUser] Attempting to sign in:', email);
    
    // Use Firebase auth service (which calls backend)
    const result = await signInWithEmailPassword(email, password);
    
    if (result.success) {
      console.log('[signInUser] ✅ Sign in successful');
      return { success: true, user: result.user };
    } else {
      console.error('[signInUser] ❌ Sign in failed:', result.error);
      return { success: false, error: result.error };
    }
  } catch (error: any) {
    console.error('[signInUser] Error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Sign up new user with Firebase then create in backend
 */
export async function signUpUser(email: string, password: string, displayName?: string) {
  try {
    console.log('[signUpUser] Attempting to register:', email);
    
    // Use Firebase auth service (which calls backend)
    const result = await registerWithEmailPassword(email, password, displayName);
    
    if (result.success) {
      console.log('[signUpUser] ✅ Registration successful');
      return { success: true, user: result.user };
    } else {
      console.error('[signUpUser] ❌ Registration failed:', result.error);
      return { success: false, error: result.error };
    }
  } catch (error: any) {
    console.error('[signUpUser] Error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get current authenticated user
 */
export async function getCurrentUser() {
  try {
    const userId = await AsyncStorage.getItem('userId');
    const token = await AsyncStorage.getItem('token');
    
    if (!userId || !token) {
      console.log('[getCurrentUser] No user found');
      return { success: false, error: 'No current user' };
    }
    
    // Verify token with backend
    const verifyResult = await verifyToken();
    
    if (verifyResult.success) {
      console.log('[getCurrentUser] ✅ User verified');
      return { success: true, user: verifyResult.user };
    } else {
      // Token invalid, clear storage
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('userId');
      console.log('[getCurrentUser] ⚠️ Token invalid, cleared storage');
      return { success: false, error: 'Token expired' };
    }
  } catch (error: any) {
    console.error('[getCurrentUser] Error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Sign out current user
 */
export async function logoutUser() {
  try {
    console.log('[logoutUser] Signing out');
    
    const result = await signOutUser();
    
    if (result.success) {
      console.log('[logoutUser] ✅ Sign out successful');
      return { success: true };
    } else {
      console.error('[logoutUser] ❌ Sign out failed:', result.error);
      return { success: false, error: result.error };
    }
  } catch (error: any) {
    console.error('[logoutUser] Error:', error);
    return { success: false, error: error.message };
  }
}

// Helper to get current user synchronously for component use
export function getCurrentUserSync() {
  // Note: This is async in nature but returns what we can
  // For truly sync access, you might need to refactor components
  return null; // Will be fetched properly via getCurrentUser
}

// Helper to check if user is approved follower
export async function isApprovedFollower(userId: string, checkUserId: string) {
  try {
    const res = await apiService.get(`/users/${userId}/followers/${checkUserId}`);
    return res?.isApproved || false;
  } catch (error) {
    return false;
  }
}

// Helper to get user highlights
export async function getUserHighlights(userId: string) {
  try {
    const res = await apiService.get(`/users/${userId}/highlights`);
    return { success: res?.success !== false, highlights: res?.data || [] };
  } catch (error: any) {
    return { success: false, highlights: [] };
  }
}

// Helper to get user stories
export async function getUserStories(userId: string) {
  try {
    const res = await apiService.get(`/users/${userId}/stories`);
    return { success: res?.success !== false, stories: res?.data || [] };
  } catch (error: any) {
    return { success: false, stories: [] };
  }
}

// Helper to get user sections sorted
export async function getUserSectionsSorted(userId: string) {
  try {
    const res = await apiService.get(`/users/${userId}/sections`);
    return res?.data || [];
  } catch (error) {
    return [];
  }
}

// Helper to get passport tickets
export async function getPassportTickets(userId: string) {
  try {
    const res = await apiService.get(`/users/${userId}/passport-tickets`);
    return res?.data || {};
  } catch (error) {
    return {};
  }
}

// Chat helpers
export async function fetchMessages(conversationId: string) {
  return apiService.getMessages(conversationId);
}

export async function sendMessage(conversationId: string, sender: string, text: string) {
  return apiService.sendMessage(conversationId, sender, text);
}

function getCurrentUid() {
  // Get from AsyncStorage - but this needs async handling
  // For now, we'll throw an error
  throw new Error('Use getCurrentUser() instead for async user ID retrieval');
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
  try {
    const posts = await apiService.get('/posts', { limit: limitCount });
    const data = posts?.data || posts || [];
    return { success: true, posts: data, data };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to load posts', posts: [], data: [] };
  }
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
  try {
    await apiService.delete(`/posts/${postId}`, { currentUserId });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to delete post' };
  }
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
    const res = await apiService.get('/live-streams');
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
  signInUser,
  signUpUser,
  getCurrentUser,
  getCurrentUserSync,
  getCurrentUid,
  isApprovedFollower,
  getUserHighlights,
  getUserStories,
  getUserSectionsSorted,
  getPassportTickets,
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
  getRegions,
  searchUsers,
  fetchMessages,
  sendMessage,
};

// ============= SEARCH & REGIONS =============
export async function getRegions() {
  try {
    // Return static regions for now - you can fetch from backend later
    const regions = [
      { id: '1', name: 'North America', image: 'https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v1/regions/northamerica.png' },
      { id: '2', name: 'Europe', image: 'https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v1/regions/europe.png' },
      { id: '3', name: 'Asia', image: 'https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v1/regions/asia.png' },
      { id: '4', name: 'South America', image: 'https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v1/regions/southamerica.png' },
      { id: '5', name: 'Africa', image: 'https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v1/regions/africa.png' },
      { id: '6', name: 'Australia', image: 'https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v1/regions/australia.png' },
    ];
    return { success: true, data: regions };
  } catch (error) {
    console.error('Error fetching regions:', error);
    return { success: false, data: [] };
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
