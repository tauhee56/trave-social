// Stub for isApprovedFollower
export async function isApprovedFollower(followerId: string, followingId: string) {
  // Implement actual logic as needed
  return true;
}
import { deleteDoc, doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { addNotification } from './notification';

export async function followUser(followerId: string, followingId: string) {
  try {
    const followerRef = doc(db, 'users', followerId);
    const followingRef = doc(db, 'users', followingId);
    const [followerSnap, followingSnap] = await Promise.all([
      getDoc(followerRef),
      getDoc(followingRef)
    ]);
    if (!followerSnap.exists() || !followingSnap.exists()) {
      throw new Error('User not found');
    }
    const followerData = followerSnap.data();
    const followingData = followingSnap.data();
    await updateDoc(followerRef, {
      following: [...(followerData.following || []), followingId],
      followingCount: (followerData.followingCount || 0) + 1
    });
    await updateDoc(followingRef, {
      followers: [...(followingData.followers || []), followerId],
      followersCount: (followingData.followersCount || 0) + 1
    });
    await addNotification({
      recipientId: followingId,
      senderId: followerId,
      type: 'follow',
      message: 'started following you',
      senderName: followerData.displayName || followerData.name || 'User',
      senderAvatar: followerData.avatar || followerData.photoURL || 'https://firebasestorage.googleapis.com/v0/b/travel-app-3da72.firebasestorage.app/o/default%2Fdefault-pic.jpg?alt=media&token=7177f487-a345-4e45-9a56-732f03dbf65d'
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function unfollowUser(followerId: string, followingId: string) {
  try {
    const followerRef = doc(db, 'users', followerId);
    const followingRef = doc(db, 'users', followingId);
    const [followerSnap, followingSnap] = await Promise.all([
      getDoc(followerRef),
      getDoc(followingRef)
    ]);
    if (!followerSnap.exists() || !followingSnap.exists()) {
      throw new Error('User not found');
    }
    const followerData = followerSnap.data();
    const followingData = followingSnap.data();
    await updateDoc(followerRef, {
      following: (followerData.following || []).filter((id: string) => id !== followingId),
      followingCount: Math.max(0, (followerData.followingCount || 0) - 1)
    });
    await updateDoc(followingRef, {
      followers: (followingData.followers || []).filter((id: string) => id !== followerId),
      followersCount: Math.max(0, (followingData.followersCount || 0) - 1)
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
// Follow request helpers
// (imports above already cover Firestore, notification, and db)

/**
 * Send a follow request to a private account
 */
export async function sendFollowRequest(fromUserId: string, toUserId: string) {
  try {
    const requestRef = doc(db, 'users', toUserId, 'followRequests', fromUserId);
    await setDoc(requestRef, {
      fromUserId,
      toUserId,
      status: 'requested',
      createdAt: serverTimestamp(),
    });
    let senderName = '';
    let senderAvatar = '';
    try {
      const senderDoc = await getDoc(doc(db, 'users', fromUserId));
      if (senderDoc.exists()) {
        const senderData = senderDoc.data();
        senderName = senderData.displayName || senderData.name || 'User';
        senderAvatar = senderData.avatar || senderData.photoURL || 'https://firebasestorage.googleapis.com/v0/b/travel-app-3da72.firebasestorage.app/o/default%2Fdefault-pic.jpg?alt=media&token=7177f487-a345-4e45-9a56-732f03dbf65d';
      }
    } catch {}
    await addNotification({
      recipientId: toUserId,
      senderId: fromUserId,
      senderName,
      senderAvatar,
      type: 'follow-request',
      message: 'Follow Request Received',
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Reject a follow request
 */
export async function rejectFollowRequest(privateUserId: string, requesterId: string) {
  try {
    await deleteDoc(doc(db, 'users', privateUserId, 'followRequests', requesterId));
    await addNotification({
      recipientId: requesterId,
      senderId: privateUserId,
      type: 'follow-rejected',
      message: 'Your follow request was rejected',
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
