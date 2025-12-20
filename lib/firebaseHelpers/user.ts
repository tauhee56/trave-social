/**
 * Update a user section (for EditSectionsModal)
 */
export async function updateUserSection(userId: string, section: { name: string, postIds: string[], coverImage?: string }) {
  try {
    const { setDoc, doc } = await import('firebase/firestore');
    const { db } = await import('../../config/firebase');
    await setDoc(doc(db, 'users', userId, 'sections', section.name), {
      postIds: section.postIds || [],
      coverImage: section.coverImage || ''
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
/**
 * Get highlights for a user
 */
export async function getUserHighlights(userId: string) {
  try {
    const q = query(
      collection(db, 'highlights'),
      where('userId', '==', userId),
      // Optionally add orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    const highlights = querySnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    }));
    return { success: true, highlights };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get all stories for feed (grouped by user)
 */
export async function getAllStoriesForFeed() {
  try {
    const { getCurrentUser } = await import('../firebaseHelpers');
    const currentUser = getCurrentUser();
    if (!currentUser) {
      return { success: true, data: [] };
    }

    // Get current user's following list
    const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
    const userData = userDoc.exists() ? userDoc.data() : null;
    const following = userData?.following || [];
    
    // Add current user to the list (to see own stories)
    const allowedUserIds = [currentUser.uid, ...following];

    const now = Date.now();
    const q = query(
      collection(db, 'stories'),
      where('expiresAt', '>', now),
      // Optionally add limit(100)
    );
    const querySnapshot = await getDocs(q);
    const stories = querySnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Filter stories: only from users I follow + my own stories
    const filteredStories = stories.filter((story: any) => allowedUserIds.includes(story.userId));
    
    // Group by userId
    const groupedByUser: { [key: string]: any[] } = {};
    filteredStories.forEach((story: any) => {
      if (!groupedByUser[story.userId]) {
        groupedByUser[story.userId] = [];
      }
      groupedByUser[story.userId].push(story);
    });
    return { success: true, data: Object.values(groupedByUser) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get stories for a highlight
 */
export async function getHighlightStories(highlightId: string) {
  try {
    const docRef = doc(db, 'highlights', highlightId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) throw new Error('Highlight not found');
    const highlightData = docSnap.data();
    const storyIds = highlightData.storyIds || [];
    // Fetch all stories in this highlight
    const stories = await Promise.all(
      storyIds.map(async (storyId: string) => {
        const storyDoc = await getDoc(doc(db, 'stories', storyId));
        if (storyDoc.exists()) {
          return { id: storyDoc.id, ...storyDoc.data() };
        }
        return null;
      })
    );
    return { success: true, stories: stories.filter((s: any) => s !== null) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
// REMOVED - Use getCurrentUser from lib/firebaseHelpers.ts instead
// This was a stub that always returned null
// User-related Firestore helpers
import { getAuth, updateProfile } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, limit, query, updateDoc, where } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { userProfileCache } from '../userProfileCache';

/**
 * Get user profile by UID
 * OPTIMIZATION: Uses in-memory cache to reduce Firebase reads by 90%
 */
export async function getUserProfile(uid: string) {
  try {
    // Check cache first
    const cached = userProfileCache.get(uid);
    if (cached) {
      return { success: true, data: cached };
    }

    // Fetch from Firestore if not in cache
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const userData = docSnap.data();
      const defaultAvatar = 'https://firebasestorage.googleapis.com/v0/b/travel-app-3da72.firebasestorage.app/o/default%2Fdefault-pic.jpg?alt=media&token=7177f487-a345-4e45-9a56-732f03dbf65d';
      const userAvatar = userData.avatar || userData.photoURL || defaultAvatar;

      const profile = {
        id: docSnap.id,
        uid: userData.uid || docSnap.id,
        name: userData.displayName || userData.name || 'User',
        email: userData.email || '',
        avatar: userAvatar,
        photoURL: userAvatar,
        bio: userData.bio || '',
        website: userData.website || '',
        followers: userData.followers || [],
        following: userData.following || [],
        followersCount: userData.followersCount || 0,
        followingCount: userData.followingCount || 0,
        postsCount: userData.postsCount || 0,
        isPrivate: userData.isPrivate || false,
        approvedFollowers: userData.followers || [],
        createdAt: userData.createdAt
      };

      // Store in cache
      userProfileCache.set(uid, profile);

      return { success: true, data: profile };
    } else {
      return { success: false, error: 'User not found' };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Update user profile
 */
export async function updateUserProfile(uid: string, data: any) {
  try {
    // 1. Update Firestore document
    const docRef = doc(db, 'users', uid);
    let avatarValue = data?.avatar;
    // Safely check if avatar is a string before calling trim()
    if (!avatarValue || (typeof avatarValue === 'string' && avatarValue.trim() === '')) {
      avatarValue = 'https://firebasestorage.googleapis.com/v0/b/travel-app-3da72.firebasestorage.app/o/default%2Fdefault-pic.jpg?alt=media&token=7177f487-a345-4e45-9a56-732f03dbf65d';
    }
    const safeData = {
      ...data,
      avatar: avatarValue,
      photoURL: avatarValue,
      isPrivate: data.isPrivate !== undefined ? data.isPrivate : false,
    };
    await updateDoc(docRef, safeData);
    
    // 2. Update Firebase Auth profile (displayName, photoURL)
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      if (currentUser && currentUser.uid === uid) {
        const authUpdates: any = {};
        if (data.displayName !== undefined) authUpdates.displayName = data.displayName;
        if (data.name !== undefined) authUpdates.displayName = data.name;
        if (avatarValue) authUpdates.photoURL = avatarValue;
        
        if (Object.keys(authUpdates).length > 0) {
          await updateProfile(currentUser, authUpdates);
          console.log('✅ Firebase Auth profile updated:', authUpdates);
        }
      }
    } catch (authError) {
      console.warn('Failed to update Firebase Auth profile:', authError);
      // Don't fail the whole operation if auth update fails
    }
    
    // Clear cache so next getUserProfile fetches fresh data
    userProfileCache.remove(uid);
    
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Search users by query text
 */
export async function searchUsers(queryText: string, resultLimit: number = 20) {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, limit(50));
    const snapshot = await getDocs(q);
    let results = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    if (queryText.trim().length > 0) {
      const searchLower = queryText.toLowerCase();
      results = results.filter((user: any) => 
        (user.displayName || '').toLowerCase().includes(searchLower) ||
        (user.email || '').toLowerCase().includes(searchLower)
      ).slice(0, resultLimit);
    }
    return { success: true, data: results };
  } catch (error: any) {
    return { success: false, error: error.message, data: [] };
  }
}
/**
 * Get posts for a user
 */
export async function getUserPosts(userId: string) {
  try {
    const q = query(
      collection(db, 'posts'),
      where('userId', '==', userId)
    );
    const querySnapshot = await getDocs(q);
    const posts = querySnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    }));
    return { success: true, data: posts };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get sections for a user
 */
export async function getUserSections(userId: string) {
  try {
    const q = query(collection(db, 'users', userId, 'sections'));
    const querySnapshot = await getDocs(q);
    const sections = querySnapshot.docs.map((doc: any) => ({
      name: doc.id,
      ...doc.data()
    }));
    return { success: true, data: sections };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get active stories for a user
 */
export async function getUserStories(userId: string) {
  try {
    const now = Date.now();
    const q = query(
      collection(db, 'stories'),
      where('userId', '==', userId),
      where('expiresAt', '>', now)
    );
    const querySnapshot = await getDocs(q);
    const stories = querySnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    }));
    stories.sort((a: any, b: any) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
    return { success: true, stories };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
