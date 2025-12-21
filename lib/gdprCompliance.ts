/**
 * GDPR Compliance - Data Export & Deletion
 * Allows users to export their data or request full deletion
 */

import * as FileSystem from 'expo-file-system';
import {
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    query,
    serverTimestamp,
    updateDoc,
    where,
} from 'firebase/firestore';
import { db } from '../config/firebase';

// Get document directory with fallback to cache directory
// @ts-ignore - directory paths are available at runtime
const documentDir = (FileSystem as any).documentDirectory || (FileSystem as any).cacheDirectory || '';

export interface UserDataExport {
  profile: any;
  posts: any[];
  comments: any[];
  messages: any[];
  followers: string[];
  following: string[];
  savedPosts: any[];
  notifications: any[];
  exportedAt: Date;
}

/**
 * Export user's complete data as JSON
 */
export async function exportUserData(userId: string): Promise<UserDataExport> {
  try {
    console.log('📊 Exporting data for user:', userId);

    // Get user profile
    const profileDoc = await getDoc(doc(db, 'users', userId));
    const profile = profileDoc.exists() ? profileDoc.data() : null;

    // Get user's posts
    const postsQuery = query(
      collection(db, 'posts'),
      where('userId', '==', userId)
    );
    const postsSnapshot = await getDocs(postsQuery);
    const posts = postsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Get user's comments
    const commentsQuery = query(
      collection(db, 'comments'),
      where('userId', '==', userId)
    );
    const commentsSnapshot = await getDocs(commentsQuery);
    const comments = commentsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Get user's messages (DMs)
    const messagesQuery = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', userId)
    );
    const messagesSnapshot = await getDocs(messagesQuery);
    const messages = await Promise.all(
      messagesSnapshot.docs.map(async (convDoc) => {
        const messagesSubquery = await getDocs(
          collection(db, 'conversations', convDoc.id, 'messages')
        );
        return messagesSubquery.docs.map((msg) => ({
          conversationId: convDoc.id,
          ...msg.data(),
        }));
      })
    );

    // Get followers/following
    const followersRef = doc(db, 'users', userId);
    const followersData = await getDoc(followersRef);
    const followers = followersData.data()?.followers || [];
    const following = followersData.data()?.following || [];

    // Get saved posts
    const savedPostsRef = doc(db, 'users', userId);
    const savedData = await getDoc(savedPostsRef);
    const savedPosts = savedData.data()?.savedPosts || [];

    // Get notifications
    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', userId)
    );
    const notificationsSnapshot = await getDocs(notificationsQuery);
    const notifications = notificationsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    const exportData: UserDataExport = {
      profile,
      posts,
      comments: comments.flat(),
      messages: messages.flat(),
      followers,
      following,
      savedPosts,
      notifications,
      exportedAt: new Date(),
    };

    console.log('✅ Data exported successfully');
    return exportData;
  } catch (error) {
    console.error('Export error:', error);
    throw error;
  }
}

/**
 * Save exported data to device file system
 */
export async function saveExportedData(
  userId: string,
  data: UserDataExport
): Promise<string> {
  try {
    const fileName = `trave_data_export_${userId}_${Date.now()}.json`;
    const fileUri = `${documentDir}${fileName}`;

    const jsonData = JSON.stringify(data, null, 2);

    await FileSystem.writeAsStringAsync(fileUri, jsonData);

    console.log('✅ Data saved to:', fileUri);
    return fileUri;
  } catch (error) {
    console.error('Save file error:', error);
    throw error;
  }
}

/**
 * Request account deletion (30-day grace period)
 * User can cancel within 30 days
 */
export async function requestAccountDeletion(userId: string): Promise<boolean> {
  try {
    const userRef = doc(db, 'users', userId);

    // Mark for deletion (30-day grace period)
    await updateDoc(userRef, {
      deletionRequested: true,
      deletionRequestedAt: serverTimestamp(),
      deletionScheduledFor: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      accountStatus: 'pending-deletion',
    });

    console.log('🗑️ Account deletion requested for:', userId);
    return true;
  } catch (error) {
    console.error('Deletion request error:', error);
    return false;
  }
}

/**
 * Cancel deletion request (within 30 days)
 */
export async function cancelAccountDeletion(userId: string): Promise<boolean> {
  try {
    const userRef = doc(db, 'users', userId);

    await updateDoc(userRef, {
      deletionRequested: false,
      deletionRequestedAt: null,
      deletionScheduledFor: null,
      accountStatus: 'active',
    });

    console.log('✅ Account deletion cancelled for:', userId);
    return true;
  } catch (error) {
    console.error('Cancel deletion error:', error);
    return false;
  }
}

/**
 * Permanently delete user account and all data
 * Called after 30-day grace period OR immediately if user chooses
 */
export async function permanentlyDeleteAccount(userId: string): Promise<boolean> {
  try {
    console.log('🗑️ Permanently deleting account:', userId);

    // Delete user document
    await deleteDoc(doc(db, 'users', userId));

    // Delete all user posts
    const postsQuery = query(
      collection(db, 'posts'),
      where('userId', '==', userId)
    );
    const postsSnapshot = await getDocs(postsQuery);
    for (const postDoc of postsSnapshot.docs) {
      await deleteDoc(postDoc.ref);
    }

    // Delete all user comments
    const commentsQuery = query(
      collection(db, 'comments'),
      where('userId', '==', userId)
    );
    const commentsSnapshot = await getDocs(commentsQuery);
    for (const commentDoc of commentsSnapshot.docs) {
      await deleteDoc(commentDoc.ref);
    }

    // Mark conversations as deleted instead of removing
    const conversationsQuery = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', userId)
    );
    const conversationsSnapshot = await getDocs(conversationsQuery);
    for (const convDoc of conversationsSnapshot.docs) {
      await updateDoc(convDoc.ref, {
        active: false,
        deletedBy: userId,
        deletedAt: serverTimestamp(),
      });
    }

    // Delete notifications
    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', userId)
    );
    const notificationsSnapshot = await getDocs(notificationsQuery);
    for (const notifDoc of notificationsSnapshot.docs) {
      await deleteDoc(notifDoc.ref);
    }

    // Delete 2FA config
    try {
      await deleteDoc(doc(db, 'twoFactor', userId));
    } catch {}

    // Delete presence data
    try {
      await deleteDoc(doc(db, 'presence', userId));
    } catch {}

    console.log('✅ Account permanently deleted');
    return true;
  } catch (error) {
    console.error('Permanent deletion error:', error);
    return false;
  }
}

/**
 * Get deletion status
 */
export async function getDeletionStatus(
  userId: string
): Promise<{
  requested: boolean;
  scheduledFor?: Date;
  daysRemaining?: number;
} | null> {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));

    if (!userDoc.exists()) {
      return null;
    }

    const data = userDoc.data();

    if (!data.deletionRequested) {
      return { requested: false };
    }

    const scheduledFor = data.deletionScheduledFor?.toDate?.() || new Date();
    const daysRemaining = Math.ceil(
      (scheduledFor.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
    );

    return {
      requested: true,
      scheduledFor,
      daysRemaining: Math.max(0, daysRemaining),
    };
  } catch (error) {
    console.error('Get deletion status error:', error);
    return null;
  }
}

/**
 * Download all user files (posts, messages, etc.)
 */
export async function downloadUserFiles(
  userId: string,
  data: UserDataExport
): Promise<string[]> {
  try {
    const downloadedFiles: string[] = [];

    // Download post images
    for (const post of data.posts) {
      if (post.images && Array.isArray(post.images)) {
        for (const image of post.images) {
          if (image.url) {
            const fileName = `post_${post.id}_${Date.now()}.jpg`;
            const fileUri = `${documentDir}${fileName}`;

            try {
              const fileInfo = await FileSystem.downloadAsync(
                image.url,
                fileUri
              );
              downloadedFiles.push(fileInfo.uri);
            } catch (err) {
              console.warn('Could not download image:', err);
            }
          }
        }
      }
    }

    console.log('✅ Downloaded', downloadedFiles.length, 'files');
    return downloadedFiles;
  } catch (error) {
    console.error('Download files error:', error);
    return [];
  }
}

export default {
  exportUserData,
  saveExportedData,
  requestAccountDeletion,
  cancelAccountDeletion,
  permanentlyDeleteAccount,
  getDeletionStatus,
  downloadUserFiles,
};
