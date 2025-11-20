// ============= REAL-TIME CONVERSATIONS =============
export function subscribeToConversations(userId: string, callback: (conversations: any[]) => void) {
  const q = query(
    collection(db, 'conversations'),
    where('participants', 'array-contains', userId),
    orderBy('lastMessageAt', 'desc')
  );
  return onSnapshot(q, async (snapshot) => {
    const docs = snapshot.docs;
    const conversations = await Promise.all(
      docs.map(async (docSnap) => {
        const data = docSnap.data();
        const otherUserId = data.participants.find((id: string) => id !== userId);
        const otherUserRef = doc(db, 'users', otherUserId);
        const otherUserSnap = await getDoc(otherUserRef);
        const otherUser = otherUserSnap.exists() ? otherUserSnap.data() : null;
        return {
          id: docSnap.id,
          ...data,
          otherUser: {
            id: otherUserId,
            name: otherUser?.displayName || 'User',
            avatar: otherUser?.photoURL || '',
          },
          unread: data.unreadCount?.[userId] || 0
        };
      })
    );
    callback(conversations);
  });
}
import { auth, db, storage } from '../config/firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  updateProfile
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  getDocs,
  addDoc,
  serverTimestamp,
  onSnapshot,
  deleteDoc,
  Timestamp,
  increment
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL,
  deleteObject 
} from 'firebase/storage';

// ============= AUTHENTICATION =============

export async function signUpUser(email: string, password: string, name: string) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Update profile with display name
    await updateProfile(user, { displayName: name });
    
    // Create user document in Firestore
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      email: user.email,
      displayName: name,
      bio: '',
      website: '',
      photoURL: '',
      createdAt: serverTimestamp(),
      followers: [],
      following: [],
      postsCount: 0,
      followersCount: 0,
      followingCount: 0
    });
    
    return { success: true, user };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function signInUser(email: string, password: string) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, user: userCredential.user };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function signOutUser() {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export function getCurrentUser() {
  return auth.currentUser;
}

// ============= USER PROFILE =============

export async function getUserProfile(uid: string) {
  try {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const userData = docSnap.data();
      
      // Use the correct default avatar from Firebase Storage
      const defaultAvatar = 'https://firebasestorage.googleapis.com/v0/b/travel-app-3da72.firebasestorage.app/o/default%2Fdefault-pic.jpg?alt=media&token=7177f487-a345-4e45-9a56-732f03dbf65d';
      const userAvatar = userData.avatar || userData.photoURL || defaultAvatar;
      
      const result = { 
        success: true, 
        data: {
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
          createdAt: userData.createdAt
        }
      };
      return result;
    } else {
      console.log('getUserProfile: User not found');
      return { success: false, error: 'User not found' };
    }
  } catch (error: any) {
    console.error('getUserProfile error:', error);
    return { success: false, error: error.message };
  }
}

export async function updateUserProfile(uid: string, data: any) {
  try {
      const docRef = doc(db, 'users', uid);
      // Ensure avatar is never undefined and save to both fields
      const avatarValue = data.avatar !== undefined && data.avatar !== null ? data.avatar : '';
      const safeData = {
        ...data,
        avatar: avatarValue,
        photoURL: avatarValue,
        updatedAt: serverTimestamp()
      };
      await updateDoc(docRef, safeData);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function searchUsers(queryText: string = '', resultLimit: number = 20) {
  try {
    const usersRef = collection(db, 'users');
    let q;

    if (queryText.trim().length === 0) {
      // Return random/recent users for recommendations
      q = query(usersRef, orderBy('createdAt', 'desc'), limit(resultLimit));
    } else {
      // Search by displayName (case-insensitive partial match)
      // Note: Firestore doesn't support full-text search, so we get all users and filter
      q = query(usersRef, limit(100)); // Get more users for client-side filtering
    }

    const snapshot = await getDocs(q);
    let results = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Client-side filtering for search
    if (queryText.trim().length > 0) {
      const searchLower = queryText.toLowerCase();
      results = results.filter((user: any) => 
        (user.displayName || '').toLowerCase().includes(searchLower) ||
        (user.email || '').toLowerCase().includes(searchLower)
      ).slice(0, resultLimit);
    }

    return { success: true, data: results };
  } catch (error: any) {
    console.error('Search users error:', error);
    return { success: false, error: error.message, data: [] };
  }
}

// ============= IMAGE UPLOAD =============

export async function uploadImage(uri: string, path: string): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, blob);
    
    const downloadURL = await getDownloadURL(storageRef);
    return { success: true, url: downloadURL };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteImage(path: string) {
  try {
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ============= POSTS =============
// ============= SECTIONS =============
// Sections are stored in 'users/{userId}/sections' subcollection
export async function getUserSections(userId: string) {
  try {
    const q = query(collection(db, 'users', userId, 'sections'));
    const querySnapshot = await getDocs(q);
    const sections = querySnapshot.docs.map(doc => ({
      name: doc.id,
      ...doc.data()
    }));
    return { success: true, data: sections };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function addUserSection(userId: string, section: { name: string, postIds: string[], coverImage?: string }) {
  try {
    await setDoc(doc(db, 'users', userId, 'sections', section.name), {
      postIds: section.postIds || [],
      coverImage: section.coverImage || ''
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteUserSection(userId: string, sectionName: string) {
  try {
    await deleteDoc(doc(db, 'users', userId, 'sections', sectionName));
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateUserSection(userId: string, section: { name: string, postIds: string[], coverImage?: string }) {
  try {
    await setDoc(doc(db, 'users', userId, 'sections', section.name), {
      postIds: section.postIds || [],
      coverImage: section.coverImage || ''
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ============= GLOBAL POSTS =============
export async function getAllPosts() {
  try {
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    const posts = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    return { success: true, posts };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createPost(
  userId: string, 
  mediaUri: string, 
  caption: string, 
  location?: string, 
  mediaType: 'image' | 'video' = 'image',
  locationData?: { name: string; address: string; lat: number; lon: number; verified?: boolean } | null,
  taggedUserIds?: string[]
) {
  try {
    const userResult = await getUserProfile(userId);
    if (!userResult.success) throw new Error('User not found');
    
    // Upload media (image or video)
    const fileExtension = mediaType === 'video' ? 'mp4' : 'jpg';
    const mediaPath = `posts/${userId}/${Date.now()}.${fileExtension}`;
    const uploadResult = await uploadImage(mediaUri, mediaPath);
    if (!uploadResult.success) throw new Error(uploadResult.error);
    
    console.log('Post media upload successful:', uploadResult.url);
    
    // Get current auth user's photo URL for consistency
    const currentUser = auth.currentUser;
    const userData = (userResult as any).data;
    const currentAvatar = currentUser?.photoURL || userData.photoURL || '';
    
    // Create post document
    const postData: any = {
      userId,
      userName: userData.name !== undefined ? userData.name : '',
      userAvatar: currentAvatar,
      imageUrl: uploadResult.url,
      videoUrl: mediaType === 'video' ? uploadResult.url : null,
      imagePath: mediaPath,
      mediaType: mediaType,
      caption,
      location: location || '',
      likes: [],
      likesCount: 0,
      commentsCount: 0,
      createdAt: serverTimestamp()
    };
    
    // Add location data if provided
    if (locationData) {
      postData.locationData = {
        name: locationData.name,
        address: locationData.address,
        lat: locationData.lat,
        lon: locationData.lon,
        verified: locationData.verified || false
      };
      postData.lat = locationData.lat;
      postData.lon = locationData.lon;
    }
    
    // Add tagged users if provided
    if (taggedUserIds && taggedUserIds.length > 0) {
      postData.taggedUsers = taggedUserIds;
    }
    
    const docRef = await addDoc(collection(db, 'posts'), postData);
    console.log('Post document created:', docRef.id);
    
    // Update user's post count
    await updateDoc(doc(db, 'users', userId), {
      postsCount: (userData.postsCount || 0) + 1
    });
    
    return { success: true, postId: docRef.id };
  } catch (error: any) {
    console.error('createPost error:', error);
    return { success: false, error: error.message };
  }
}

export async function getUserPosts(userId: string) {
  try {
    console.log('getUserPosts called with userId:', userId);
    const q = query(
      collection(db, 'posts'),
      where('userId', '==', userId)
    );
    
    const querySnapshot = await getDocs(q);
    console.log('getUserPosts query returned', querySnapshot.docs.length, 'posts');
    const posts = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    console.log('getUserPosts returning posts:', posts);
    
    return { success: true, data: posts };
  } catch (error: any) {
    console.error('getUserPosts error:', error);
    return { success: false, error: error.message };
  }
}

export async function getFeedPosts(limitCount: number = 20) {
  try {
    const q = query(
      collection(db, 'posts'),
      limit(limitCount)
    );
    
    const querySnapshot = await getDocs(q);
    const posts = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return { success: true, posts, data: posts };
  } catch (error: any) {
    console.error('getFeedPosts error:', error);
    return { success: false, error: error.message, posts: [], data: [] };
  }
}

export async function likePost(postId: string, userId: string) {
  try {
    const postRef = doc(db, 'posts', postId);
    const postSnap = await getDoc(postRef);
    
    if (!postSnap.exists()) throw new Error('Post not found');
    
    const postData = postSnap.data();
    const likes = postData.likes || [];
    
    if (!likes.includes(userId)) {
      // Like
      await updateDoc(postRef, {
        likes: [...likes, userId],
        likesCount: (postData.likesCount || 0) + 1
      });

      // Create notification if not liking own post
      if (postData.userId !== userId) {
        const currentUser = auth.currentUser;
        if (currentUser) {
          await createNotification({
            recipientId: postData.userId,
            senderId: userId,
            senderName: currentUser.displayName || 'Someone',
            senderAvatar: currentUser.photoURL || '',
            type: 'like',
            message: 'liked your post',
            postId: postId
          });
        }
      }
    }
    
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function unlikePost(postId: string, userId: string) {
  try {
    const postRef = doc(db, 'posts', postId);
    const postSnap = await getDoc(postRef);
    
    if (!postSnap.exists()) throw new Error('Post not found');
    
    const postData = postSnap.data();
    const likes = postData.likes || [];
    
    if (likes.includes(userId)) {
      // Unlike
      await updateDoc(postRef, {
        likes: likes.filter((id: string) => id !== userId),
        likesCount: Math.max(0, (postData.likesCount || 0) - 1)
      });
    }
    
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deletePost(postId: string) {
  try {
    // Get the post to find the image path and user ID
    const postDoc = await getDoc(doc(db, 'posts', postId));
    if (!postDoc.exists()) {
      throw new Error('Post not found');
    }

    const postData = postDoc.data();
    const userId = postData.userId;
    const imagePath = postData.imagePath;

    // Delete the image from storage if path exists
    if (imagePath) {
      try {
        const fileRef = ref(storage, imagePath);
        await deleteObject(fileRef);
      } catch (storageError) {
        console.log('Image deletion error (non-critical):', storageError);
      }
    }

    // Delete the post document
    await deleteDoc(doc(db, 'posts', postId));

    // Update user's post count
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      await updateDoc(doc(db, 'users', userId), {
        postsCount: Math.max(0, (userData.postsCount || 1) - 1)
      });
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ============= COMMENTS =============
export async function addComment(postId: string, userId: string, userName: string, userAvatar: string, text: string) {
  try {
    // Get current user's latest profile picture from Firestore
    let currentAvatar = userAvatar;
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        currentAvatar = userData.avatar || userData.photoURL || userAvatar;
      }
    } catch {}

    const commentRef = await addDoc(collection(db, 'posts', postId, 'comments'), {
      userId,
      userName,
      userAvatar: currentAvatar,
      text,
      createdAt: serverTimestamp(),
      likes: [],
      likesCount: 0
    });
    
    // Update post commentsCount
    const postRef = doc(db, 'posts', postId);
    const postSnap = await getDoc(postRef);
    if (postSnap.exists()) {
      const commentsCount = (postSnap.data().commentsCount || 0) + 1;
      await updateDoc(postRef, { commentsCount });

      // Create notification if not commenting on own post
      const postData = postSnap.data();
      if (postData.userId !== userId) {
        await createNotification({
          recipientId: postData.userId,
          senderId: userId,
          senderName: userName,
          senderAvatar: currentAvatar,
          type: 'comment',
          message: `commented: ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`,
          postId: postId,
          commentId: commentRef.id
        });
      }
    }
    
    return { success: true, id: commentRef.id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Like a comment
export async function likeComment(postId: string, commentId: string, userId: string) {
  try {
    const commentRef = doc(db, 'posts', postId, 'comments', commentId);
    const commentSnap = await getDoc(commentRef);
    if (!commentSnap.exists()) throw new Error('Comment not found');
    const commentData = commentSnap.data();
    const likes = commentData.likes || [];
    if (!likes.includes(userId)) {
      await updateDoc(commentRef, {
        likes: [...likes, userId],
        likesCount: (commentData.likesCount || 0) + 1
      });
    }
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Unlike a comment
export async function unlikeComment(postId: string, commentId: string, userId: string) {
  try {
    const commentRef = doc(db, 'posts', postId, 'comments', commentId);
    const commentSnap = await getDoc(commentRef);
    if (!commentSnap.exists()) throw new Error('Comment not found');
    const commentData = commentSnap.data();
    const likes = commentData.likes || [];
    if (likes.includes(userId)) {
      await updateDoc(commentRef, {
        likes: likes.filter((id: string) => id !== userId),
        likesCount: Math.max(0, (commentData.likesCount || 0) - 1)
      });
    }
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getPostComments(postId: string) {
  try {
    const q = query(
      collection(db, 'posts', postId, 'comments'),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const comments = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return { success: true, data: comments };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteComment(postId: string, commentId: string) {
  try {
    await deleteDoc(doc(db, 'posts', postId, 'comments', commentId));
    
    // Update post commentsCount
    const postRef = doc(db, 'posts', postId);
    const postSnap = await getDoc(postRef);
    if (postSnap.exists()) {
      const commentsCount = Math.max(0, (postSnap.data().commentsCount || 1) - 1);
      await updateDoc(postRef, { commentsCount });
    }
    
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Helper: Add liked status to posts for current user
export async function addLikedStatusToPosts(posts: any[], userId: string) {
  try {
    return posts.map(post => ({
      ...post,
      liked: Array.isArray(post.likes) ? post.likes.includes(userId) : false,
      likesCount: post.likesCount || 0,
      commentsCount: post.commentsCount || 0
    }));
  } catch (error: any) {
    return posts;
  }
}

// ============= STORIES =============

export async function createStory(userId: string, mediaUri: string, mediaType: 'image' | 'video' = 'image') {
  try {
    const userResult = await getUserProfile(userId);
    if (!userResult.success) throw new Error('User not found');
    
    // Upload media (image or video)
    const fileExtension = mediaType === 'video' ? 'mp4' : 'jpg';
    const mediaPath = `stories/${userId}/${Date.now()}.${fileExtension}`;
    const uploadResult = await uploadImage(mediaUri, mediaPath);
    if (!uploadResult.success) throw new Error(uploadResult.error);
    
    console.log('Story upload successful:', uploadResult.url);
    
    // Get user's avatar from profile data - prioritize avatar field, then photoURL
    const userData = (userResult as any).data;
    const userAvatar = userData.avatar || userData.photoURL || 'https://firebasestorage.googleapis.com/v0/b/travel-app-3da72.firebasestorage.app/o/default%2Fdefault-pic.jpg?alt=media&token=7177f487-a345-4e45-9a56-732f03dbf65d';
    
    console.log('Creating story with avatar:', userAvatar);
    
    // Create story document
    const storyData = {
      userId,
      userName: userData.name,
      userAvatar: userAvatar,
      imageUrl: uploadResult.url,
      videoUrl: mediaType === 'video' ? uploadResult.url : null,
      mediaPath: mediaPath,
      mediaType: mediaType,
      views: [],
      viewsCount: 0,
      createdAt: serverTimestamp(),
      expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
    };
    
    const docRef = await addDoc(collection(db, 'stories'), storyData);
    console.log('Story document created:', docRef.id);
    
    return { success: true, storyId: docRef.id };
  } catch (error: any) {
    console.error('createStory error:', error);
    return { success: false, error: error.message };
  }
}

export async function getActiveStories() {
  try {
    const now = Date.now();
    const q = query(
      collection(db, 'stories'),
      where('expiresAt', '>', now),
      orderBy('expiresAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const stories = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as any[];
    
    // Group stories by user
    const groupedStories: { [key: string]: any } = {};
    stories.forEach((story: any) => {
      if (!groupedStories[story.userId]) {
        groupedStories[story.userId] = {
          userId: story.userId,
          userName: story.userName,
          userAvatar: story.userAvatar,
          stories: []
        };
      }
      groupedStories[story.userId].stories.push(story);
    });
    
    return { success: true, stories: Object.values(groupedStories) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getUserStories(userId: string) {
  try {
    const now = Date.now();
    console.log(`Getting stories for user ${userId}, current time: ${now}`);
    
    const q = query(
      collection(db, 'stories'),
      where('userId', '==', userId),
      where('expiresAt', '>', now)
    );
    
    const querySnapshot = await getDocs(q);
    console.log(`Found ${querySnapshot.docs.length} stories for user ${userId}`);
    
    const stories = querySnapshot.docs.map(doc => {
      const data = doc.data() as any;
      console.log('Story data:', { id: doc.id, userId: data.userId, expiresAt: data.expiresAt, imageUrl: data.imageUrl?.substring(0, 50) });
      return {
        id: doc.id,
        ...data
      };
    });
    
    // Sort by creation time (most recent first)
    stories.sort((a: any, b: any) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
    
    console.log('Returning stories:', stories);
    return { success: true, stories };
  } catch (error: any) {
    console.error('getUserStories error:', error);
    return { success: false, error: error.message };
  }
}

export async function getAllStoriesForFeed() {
  try {
    const now = Date.now();
    const q = query(
      collection(db, 'stories'),
      where('expiresAt', '>', now),
      limit(100)
    );

    const querySnapshot = await getDocs(q);
    const stories = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as any[];

    // Sort by creation time (most recent first)
    stories.sort((a: any, b: any) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));

    // Group by userId
    const groupedByUser: { [key: string]: any[] } = {};
    stories.forEach((story: any) => {
      if (!groupedByUser[story.userId]) {
        groupedByUser[story.userId] = [];
      }
      groupedByUser[story.userId].push(story);
    });

    return { success: true, data: Object.values(groupedByUser) };
  } catch (error: any) {
    console.error('getAllStoriesForFeed error:', error);
    return { success: false, error: error.message };
  }
}

// ============= HIGHLIGHTS =============

export async function createHighlight(userId: string, name: string, coverImage: string, storyIds: string[]) {
  try {
    const highlightData = {
      userId,
      name,
      coverImage,
      storyIds,
      createdAt: serverTimestamp()
    };
    
    const docRef = await addDoc(collection(db, 'highlights'), highlightData);
    
    return { success: true, highlightId: docRef.id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getUserHighlights(userId: string) {
  try {
    const q = query(
      collection(db, 'highlights'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const highlights = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return { success: true, highlights };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

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
    
    return { success: true, stories: stories.filter(s => s !== null) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ============= FOLLOW/UNFOLLOW =============

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
    
    // Update follower's following list
    await updateDoc(followerRef, {
      following: [...(followerData.following || []), followingId],
      followingCount: (followerData.followingCount || 0) + 1
    });
    
    // Update following's followers list
    await updateDoc(followingRef, {
      followers: [...(followingData.followers || []), followerId],
      followersCount: (followingData.followersCount || 0) + 1
    });

    // Create follow notification
    await createNotification({
      recipientId: followingId,
      senderId: followerId,
      senderName: followerData.name || followerData.displayName || 'Someone',
      senderAvatar: followerData.avatar || followerData.photoURL || '',
      type: 'follow',
      message: 'started following you'
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
    
    // Update follower's following list
    await updateDoc(followerRef, {
      following: (followerData.following || []).filter((id: string) => id !== followingId),
      followingCount: Math.max(0, (followerData.followingCount || 0) - 1)
    });
    
    // Update following's followers list
    await updateDoc(followingRef, {
      followers: (followingData.followers || []).filter((id: string) => id !== followerId),
      followersCount: Math.max(0, (followingData.followersCount || 0) - 1)
    });
    
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ============= SEARCH =============


// ============= CHAT & MESSAGING =============

/**
 * Get or create a chat conversation between two users
 */
export async function getOrCreateConversation(userId1: string, userId2: string) {
  try {
    // Create a consistent conversationId regardless of user order
    const conversationId = [userId1, userId2].sort().join('_');
    const conversationRef = doc(db, 'conversations', conversationId);
    const conversationSnap = await getDoc(conversationRef);
    
    if (!conversationSnap.exists()) {
      // Create new conversation
      await setDoc(conversationRef, {
        id: conversationId,
        participants: [userId1, userId2],
        createdAt: serverTimestamp(),
        lastMessage: null,
        lastMessageAt: null,
        unreadCount: { [userId1]: 0, [userId2]: 0 }
      });
    }
    
    return { success: true, data: { conversationId } };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Send a message in a conversation
 */
export async function sendMessage(conversationId: string, senderId: string, text: string, imageUrl?: string) {
  try {
    const messageData = {
      conversationId,
      senderId,
      text,
      imageUrl: imageUrl || null,
      createdAt: serverTimestamp(),
      read: false
    };
    
    // Add message to messages subcollection
    await addDoc(collection(db, 'conversations', conversationId, 'messages'), messageData);
    
    // Update conversation's last message
    const conversationRef = doc(db, 'conversations', conversationId);
    const conversationSnap = await getDoc(conversationRef);
    
    if (conversationSnap.exists()) {
      const data = conversationSnap.data();
      const participants = data.participants || [];
      const otherUserId = participants.find((id: string) => id !== senderId);
      
      await updateDoc(conversationRef, {
        lastMessage: text,
        lastMessageAt: serverTimestamp(),
        [`unreadCount.${otherUserId}`]: (data.unreadCount?.[otherUserId] || 0) + 1
      });
    }
    
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get all messages in a conversation (real-time listener)
 */
export function subscribeToMessages(conversationId: string, callback: (messages: any[]) => void) {
  const q = query(
    collection(db, 'conversations', conversationId, 'messages'),
    orderBy('createdAt', 'asc')
  );
  
  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(messages);
  });
}

/**
 * Get all conversations for a user
 */
export async function getUserConversations(userId: string) {
  try {
    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', userId),
      orderBy('lastMessageAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const conversations = await Promise.all(
      querySnapshot.docs.map(async (docSnap) => {
        const data = docSnap.data();
        const otherUserId = data.participants.find((id: string) => id !== userId);
        
        // Get other user's profile
        const otherUserRef = doc(db, 'users', otherUserId);
        const otherUserSnap = await getDoc(otherUserRef);
        const otherUser = otherUserSnap.exists() ? otherUserSnap.data() : null;
        
        return {
          id: docSnap.id,
          ...data,
          otherUser: {
            id: otherUserId,
            name: otherUser?.displayName || 'User',
            avatar: otherUser?.photoURL || '',
          },
          unread: data.unreadCount?.[userId] || 0
        };
      })
    );
    
    return { success: true, data: conversations };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Mark conversation as read for a user
 */
export async function markConversationAsRead(conversationId: string, userId: string) {
  try {
    const conversationRef = doc(db, 'conversations', conversationId);
    await updateDoc(conversationRef, {
      [`unreadCount.${userId}`]: 0
    });
    
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Delete a conversation
 */
export async function deleteConversation(conversationId: string) {
  try {
    // Delete all messages first
    const messagesQuery = query(collection(db, 'conversations', conversationId, 'messages'));
    const messagesSnapshot = await getDocs(messagesQuery);
    
    const deletePromises = messagesSnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
    
    // Delete conversation document
    await deleteDoc(doc(db, 'conversations', conversationId));
    
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ============= NOTIFICATIONS =============

/**
 * Get user notifications
 */
export async function getUserNotifications(userId?: string) {
  try {
    const user = userId || getCurrentUser()?.uid;
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('recipientId', '==', user),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const snapshot = await getDocs(notificationsQuery);
    const notifications = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return { success: true, data: notifications };
  } catch (error: any) {
    console.log('getUserNotifications error:', error);
    return { success: true, data: [] }; // Return empty array on error
  }
}

/**
 * Create a notification
 */
export async function createNotification(data: {
  recipientId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  type: 'like' | 'comment' | 'follow' | 'mention';
  message: string;
  postId?: string;
  commentId?: string;
}) {
  try {
    await addDoc(collection(db, 'notifications'), {
      ...data,
      read: false,
      createdAt: serverTimestamp()
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(notificationId: string) {
  try {
    const notifRef = doc(db, 'notifications', notificationId);
    await updateDoc(notifRef, { read: true });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function viewStory(storyId: string, userId: string) {
  try {
    const storyRef = doc(db, 'stories', storyId);
    const storySnap = await getDoc(storyRef);

    if (!storySnap.exists()) throw new Error('Story not found');

    const storyData = storySnap.data();
    const views = storyData.views || [];

    if (!views.includes(userId)) {
      await updateDoc(storyRef, {
        views: [...views, userId],
        viewsCount: (storyData.viewsCount || 0) + 1
      });
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteStory(storyId: string) {
  try {
    await deleteDoc(doc(db, 'stories', storyId));
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ============= STORY LIKES & COMMENTS =============

export async function likeStory(storyId: string, userId: string) {
  try {
    const storyRef = doc(db, 'stories', storyId);
    const storySnap = await getDoc(storyRef);

    if (!storySnap.exists()) throw new Error('Story not found');

    const storyData = storySnap.data();
    const likes = storyData.likes || [];

    if (!likes.includes(userId)) {
      await updateDoc(storyRef, {
        likes: [...likes, userId]
      });
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function unlikeStory(storyId: string, userId: string) {
  try {
    const storyRef = doc(db, 'stories', storyId);
    const storySnap = await getDoc(storyRef);

    if (!storySnap.exists()) throw new Error('Story not found');

    const storyData = storySnap.data();
    const likes = storyData.likes || [];

    if (likes.includes(userId)) {
      await updateDoc(storyRef, {
        likes: likes.filter((id: string) => id !== userId)
      });
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function addStoryComment(storyId: string, userId: string, userName: string, userAvatar: string, text: string) {
  try {
    const storyRef = doc(db, 'stories', storyId);
    const storySnap = await getDoc(storyRef);

    if (!storySnap.exists()) throw new Error('Story not found');

    const storyData = storySnap.data();
    const comments = storyData.comments || [];

    const newComment = {
      id: Date.now().toString(),
      userId,
      userName,
      userAvatar,
      text,
      createdAt: Timestamp.now()
    };

    await updateDoc(storyRef, {
      comments: [...comments, newComment]
    });

    return { success: true, comment: newComment };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ============= LIVE STREAMING =============

// Get all active live streams
export async function getActiveLiveStreams() {
  try {
    const streamsRef = collection(db, 'liveStreams');
    const q = query(streamsRef, where('isLive', '==', true), orderBy('startedAt', 'desc'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error: any) {
    console.error('Error getting live streams:', error);
    return [];
  }
}

// Join a live stream as viewer
export async function joinLiveStream(streamId: string, userId: string) {
  try {
    const streamRef = doc(db, 'liveStreams', streamId);
    const viewerRef = doc(db, 'liveStreams', streamId, 'viewers', userId);
    
    // Add viewer document
    await setDoc(viewerRef, {
      userId,
      joinedAt: serverTimestamp()
    });
    
    // Increment viewer count
    await updateDoc(streamRef, {
      viewerCount: increment(1)
    });
    
    return { success: true };
  } catch (error: any) {
    console.error('Error joining live stream:', error);
    return { success: false, error: error.message };
  }
}

// Leave a live stream
export async function leaveLiveStream(streamId: string, userId: string) {
  try {
    const streamRef = doc(db, 'liveStreams', streamId);
    const viewerRef = doc(db, 'liveStreams', streamId, 'viewers', userId);
    
    // Remove viewer document
    await deleteDoc(viewerRef);
    
    // Decrement viewer count
    await updateDoc(streamRef, {
      viewerCount: increment(-1)
    });
    
    return { success: true };
  } catch (error: any) {
    console.error('Error leaving live stream:', error);
    return { success: false, error: error.message };
  }
}

// Subscribe to live stream updates
export function subscribeToLiveStream(streamId: string, callback: (stream: any) => void) {
  const streamRef = doc(db, 'liveStreams', streamId);
  return onSnapshot(streamRef, (snapshot) => {
    if (snapshot.exists()) {
      callback({ id: snapshot.id, ...snapshot.data() });
    }
  });
}

// Subscribe to live stream comments
export function subscribeToLiveComments(streamId: string, callback: (comments: any[]) => void) {
  const commentsRef = collection(db, 'liveStreams', streamId, 'comments');
  const q = query(commentsRef, orderBy('createdAt', 'asc'));
  
  return onSnapshot(q, (snapshot) => {
    const comments = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(comments);
  });
}
