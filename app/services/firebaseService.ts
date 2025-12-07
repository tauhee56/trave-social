import { followUser as followUserRaw, getCurrentUser, getUserPosts as getUserPostsRaw, getUserProfile as getUserProfileRaw, getUserSections as getUserSectionsRaw, getUserStories as getUserStoriesRaw, sendFollowRequest as sendFollowRequestRaw, unfollowUser as unfollowUserRaw } from '../../lib/firebaseHelpers/index';

export async function getUserProfile(userId: string) {
  return await getUserProfileRaw(userId);
}
export async function getUserPosts(userId: string) {
  return await getUserPostsRaw(userId);
}
export async function getUserSections(userId: string) {
  return await getUserSectionsRaw(userId);
}
export async function getUserStories(userId: string) {
  return await getUserStoriesRaw(userId);
}
export async function sendFollowRequest(userId: string) {
  const currentUser = getCurrentUser() as { uid?: string } | null;
  if (!currentUser || !currentUser.uid) throw new Error('No current user');
  return await sendFollowRequestRaw(currentUser.uid, userId);
}
export async function unfollowUser(userId: string) {
  const currentUser = getCurrentUser() as { uid?: string } | null;
  if (!currentUser || !currentUser.uid) throw new Error('No current user');
  return await unfollowUserRaw(currentUser.uid, userId);
}
export async function followUser(userId: string) {
  const currentUser = getCurrentUser() as { uid?: string } | null;
  if (!currentUser || !currentUser.uid) throw new Error('No current user');
  return await followUserRaw(currentUser.uid, userId);
}
