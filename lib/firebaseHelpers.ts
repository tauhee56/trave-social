// Only keep unique helpers not present in split files
export async function incrementPostVisits(postId: string) {
  try {
    const postRef = doc(db, 'posts', postId);
    await updateDoc(postRef, {
      visits: increment(1)
    });
    return { success: true };
  } catch (error: any) {
    console.error('incrementPostVisits error:', error);
    return { success: false, error: error.message };
  }
}
// ============= REAL-TIME CONVERSATIONS =============
export function subscribeToConversations(userId: string, callback: (conversations: any[]) => void) {
  const q = query(
    collection(db, 'conversations'),
    where('participants', 'array-contains', userId),
    orderBy('lastMessageAt', 'desc')
  );
  return onSnapshot(q, async (snapshot: any) => {
    const docs = snapshot.docs;
    const conversations = await Promise.all(
      docs.map(async (docSnap: any) => {
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
            name: otherUser?.displayName || otherUser?.name || 'User',
            avatar: otherUser?.avatar || otherUser?.photoURL || '',
          },
          unread: data.unreadCount?.[userId] || 0
        };
      })
    );
    callback(conversations);
  });
}
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    updateProfile
} from 'firebase/auth';
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    increment,
    limit,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    setDoc,
    Timestamp,
    updateDoc,
    where
} from 'firebase/firestore';
import {
    deleteObject,
    getDownloadURL,
    ref,
    uploadBytes
} from 'firebase/storage';
import { auth, db, storage } from '../config/firebase';

// Runtime guard for Firestore instance
if (!db) {
  throw new Error("Firestore 'db' instance is undefined. Check your Firebase initialization and import paths in config/firebase.js.");
}

// ============= FOLLOW REQUESTS (PRIVATE ACCOUNTS) =============
// Send a follow request to a private account
export async function sendFollowRequest(fromUserId: string, toUserId: string) {
  try {
    const requestRef = doc(db, 'users', toUserId, 'followRequests', fromUserId);
    await setDoc(requestRef, {
      fromUserId,
      toUserId,
      status: 'requested',
      createdAt: serverTimestamp(),
    });
    // Fetch sender profile for name and avatar
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
    // Create notification for private user
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

// Reject a follow request
export async function rejectFollowRequest(privateUserId: string, requesterId: string) {
  try {
    await deleteDoc(doc(db, 'users', privateUserId, 'followRequests', requesterId));
    // Create notification for requester
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
// Add notification to user's notifications subcollection
export async function addNotification({ recipientId, senderId, type, message, createdAt }: any) {
  try {
    const notificationsRef = collection(db, 'users', recipientId, 'notifications');
    // Fetch sender profile for name and avatar
    let senderName = '';
    let senderAvatar = '';
    try {
      const senderDoc = await getDoc(doc(db, 'users', senderId));
      if (senderDoc.exists()) {
        const senderData = senderDoc.data();
        senderName = senderData.displayName || senderData.name || 'User';
        senderAvatar = senderData.avatar || senderData.photoURL || 'https://firebasestorage.googleapis.com/v0/b/travel-app-3da72.firebasestorage.app/o/default%2Fdefault-pic.jpg?alt=media&token=7177f487-a345-4e45-9a56-732f03dbf65d';
      }
    } catch {}
    // Merge all fields from the input object, so postId/commentId are included if present
    const notifData = {
      ...arguments[0],
      senderName,
      senderAvatar,
      createdAt: serverTimestamp(),
      read: false,
    };
    console.log('[DEBUG] addNotification called:', notifData);
    await addDoc(notificationsRef, notifData);

    // Auto-create conversation for DM/message notifications
    if (type === 'dm' || type === 'message') {
      const convRef = collection(db, 'conversations');
      // Check if conversation already exists between recipient and sender
      const q = query(convRef,
        where('participants', 'array-contains', recipientId)
      );
      const snapshot = await getDocs(q);
      let convDoc = null;
      type ConversationDoc = { id: string, data: any, ref: any };
      let foundConvDoc: ConversationDoc | null = null;
      snapshot.forEach((docSnap: any) => {
        const data = docSnap.data();
        if (Array.isArray(data.participants) && data.participants.includes(senderId)) {
          foundConvDoc = { id: docSnap.id, data, ref: doc(db, 'conversations', docSnap.id) };
        }
      });
      convDoc = foundConvDoc;
      if (!convDoc) {
        // Create new conversation document
        await addDoc(convRef, {
          participants: [recipientId, senderId],
          lastMessage: message,
          lastMessageAt: serverTimestamp(),
          unreadCount: {
            [recipientId]: 1,
            [senderId]: 0
          }
        });
      } else {
        // Update lastMessage and unreadCount if conversation exists
        if (convDoc !== null) {
          const docTyped = convDoc as { id: string, data: any, ref: any };
          const unreadCount = docTyped.data.unreadCount || {};
          await updateDoc(docTyped.ref, {
            lastMessage: message,
            lastMessageAt: serverTimestamp(),
            unreadCount: {
              [recipientId]: (unreadCount[recipientId] || 0) + 1,
              [senderId]: unreadCount[senderId] || 0
            }
          });
        }
      }
    }
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Check if user is approved follower
export async function isApprovedFollower(privateUserId: string, userId: string) {
  try {
    const userRef = doc(db, 'users', privateUserId);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return false;
    const userData = userSnap.data();
    const followers = userData.followers || [];
    return followers.includes(userId);
  } catch {
    return false;
  }
}

// Check if follow request is pending
export async function isFollowRequestPending(privateUserId: string, userId: string) {
  try {
    const requestRef = doc(db, 'users', privateUserId, 'followRequests', userId);
    const requestSnap = await getDoc(requestRef);
    return requestSnap.exists();
  } catch {
    return false;
  }
}

// ============= AUTHENTICATION =============

export async function signUpUser(email: string, password: string, name: string) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Default avatar URL
    const defaultAvatar = 'https://firebasestorage.googleapis.com/v0/b/travel-app-3da72.firebasestorage.app/o/default%2Fdefault-pic.jpg?alt=media&token=7177f487-a345-4e45-9a56-732f03dbf65d';

    // Update profile with display name
    await updateProfile(user, { displayName: name });

    // Create user document in Firestore with all required fields
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      email: user.email,
      displayName: name,
      name: name,
      bio: '',
      website: '',
      avatar: defaultAvatar,
      photoURL: defaultAvatar,
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

export async function updateUserProfile(uid: string, data: any) {
  try {
    const docRef = doc(db, 'users', uid);
    // Always save avatar to both avatar and photoURL fields
    let avatarValue = data.avatar;
    if (!avatarValue || avatarValue.trim() === '') {
      avatarValue = 'https://firebasestorage.googleapis.com/v0/b/travel-app-3da72.firebasestorage.app/o/default%2Fdefault-pic.jpg?alt=media&token=7177f487-a345-4e45-9a56-732f03dbf65d';
    }
    const safeData = {
      ...data,
      avatar: avatarValue,
      photoURL: avatarValue,
    };
    await updateDoc(docRef, safeData);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
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
// ============= CATEGORIES =============
export const DEFAULT_CATEGORIES = [
  { name: 'Winter holidays', image: 'https://images.unsplash.com/photo-1519125323398-675f0ddb6308?w=400&h=400&fit=crop' },
  { name: 'Beach', image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&h=400&fit=crop' },
  { name: 'City life', image: 'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=400&h=400&fit=crop' },
  { name: 'London', image: 'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?w=400&h=400&fit=crop' },
  { name: 'Christmas', image: 'https://images.unsplash.com/photo-1519125323398-675f0ddb6308?w=400&h=400&fit=crop' },
];

export async function ensureDefaultCategories() {
  const categoriesRef = collection(db, 'categories');
  const snapshot = await getDocs(categoriesRef);
  if (snapshot.empty) {
    // Add default categories
    await Promise.all(DEFAULT_CATEGORIES.map(cat => setDoc(doc(categoriesRef, cat.name), cat)));
    return { success: true, created: true };
  }
  return { success: true, created: false };
}

export async function getCategories() {
  const categoriesRef = collection(db, 'categories');
  const snapshot = await getDocs(categoriesRef);
  const categories = snapshot.docs.map((doc: any) => doc.data());
  return categories.length > 0 ? categories : DEFAULT_CATEGORIES;
}
// ============= SECTIONS =============
// Sections are stored in 'users/{userId}/sections' subcollection
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
// Get visit count for a location (number of posts tagged with that location)
export async function getLocationVisitCount(location: string): Promise<number> {
  try {
    if (!location || typeof location !== 'string') return 0;
    const q = query(collection(db, 'posts'), where('location', '==', location));
    const querySnapshot = await getDocs(q);
    return querySnapshot.size;
  } catch (error) {
    console.error('getLocationVisitCount error:', error);
    return 0;
  }
}
export async function getAllPosts(limitCount: number = 100) {
  try {
    const q = query(
      collection(db, 'posts'), 
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    const querySnapshot = await getDocs(q);
    const posts = querySnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    }));
    return { success: true, posts, data: posts };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createPost(
  userId: string,
  mediaUris: string[],
  caption: string,
  location?: string,
  mediaType: 'image' | 'video' = 'image',
  locationData?: { name: string; address: string; lat: number; lon: number; verified?: boolean } | null,
  taggedUserIds?: string[],
  category?: string
) {
  try {
    const { getUserProfile } = await import('./firebaseHelpers/user');
    const userResult = await getUserProfile(userId);

    if (!userResult.success) {
      throw new Error(`User not found: ${userResult.error}`);
    }
    
    // Upload all images
    const imageUrls: string[] = [];
    for (let i = 0; i < mediaUris.length; i++) {
      const uri = mediaUris[i];
      const fileExtension = mediaType === 'video' ? 'mp4' : 'jpg';
      const mediaPath = `posts/${userId}/${Date.now()}_${i}.${fileExtension}`;
      const uploadResult = await uploadImage(uri, mediaPath);
      if (!uploadResult.success) throw new Error(uploadResult.error);
      if (uploadResult.url) imageUrls.push(uploadResult.url);
    }
    console.log('Post media upload successful:', imageUrls);
    
    // Get current auth user's photo URL for consistency
    const currentUser = auth.currentUser;
    const userData = (userResult as any).data;
    const currentAvatar = currentUser?.photoURL || userData.photoURL || '';
    
    // Check if user has private account
    const isPrivate = userData.isPrivate || false;
    const allowedFollowers = isPrivate ? (userData.followers || []) : [];
    
    // Create post document
    const postData: any = {
      userId,
      userName: userData.name !== undefined ? userData.name : '',
      userAvatar: currentAvatar,
      locationName: locationData?.name || location || '',
      imageUrls,
      imageUrl: imageUrls[0],
      videoUrl: mediaType === 'video' ? imageUrls[0] : null,
      mediaType: mediaType,
      caption,
      location: location && location.trim() ? location : (locationData?.name || 'Unknown'),
      category: category || '',
      likes: [],
      likesCount: 0,
      commentsCount: 0,
      createdAt: serverTimestamp(),
      isPrivate: isPrivate,
      allowedFollowers: allowedFollowers
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
    
    console.log('Creating post document with data:', postData);
    const docRef = await addDoc(collection(db, 'posts'), postData);
    console.log('✅ Post document created successfully! ID:', docRef.id);

    // Update user's post count
    console.log('Updating user post count...');
    await updateDoc(doc(db, 'users', userId), {
      postsCount: (userData.postsCount || 0) + 1
    });
    console.log('✅ User post count updated');

    return { success: true, postId: docRef.id };
  } catch (error: any) {
    console.error('❌ createPost error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
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
    const posts = querySnapshot.docs.map((doc: any) => ({
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
    const posts = querySnapshot.docs.map((doc: any) => ({
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
          // Fetch sender profile for name and avatar
          let senderName = '';
          let senderAvatar = '';
          try {
            const senderDoc = await getDoc(doc(db, 'users', userId));
            if (senderDoc.exists()) {
              const senderData = senderDoc.data();
              senderName = senderData.displayName || senderData.name || 'User';
              senderAvatar = senderData.avatar || senderData.photoURL || 'https://firebasestorage.googleapis.com/v0/b/travel-app-3da72.firebasestorage.app/o/default%2Fdefault-pic.jpg?alt=media&token=7177f487-a345-4e45-9a56-732f03dbf65d';
            }
          } catch {}
          await addNotification({
            recipientId: postData.userId,
            senderId: userId,
            senderName,
            senderAvatar,
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

export async function deletePost(postId: string, currentUserId?: string) {
  try {
    // Get the post to find the image path and user ID
    const postDoc = await getDoc(doc(db, 'posts', postId));
    if (!postDoc.exists()) {
      throw new Error('Post not found');
    }

    const postData = postDoc.data();
    const userId = postData.userId;
    const imagePath = postData.imagePath;

    // Only allow delete if currentUserId matches post owner
    if (currentUserId && userId !== currentUserId) {
      throw new Error('You are not allowed to delete this post');
    }

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

      // Create notification and push notification if not commenting on own post
      const postData = postSnap.data();
      if (postData.userId !== userId) {
        // Fetch sender profile for name and avatar
        let senderName = '';
        let senderAvatar = '';
        try {
          const senderDoc = await getDoc(doc(db, 'users', userId));
          if (senderDoc.exists()) {
            const senderData = senderDoc.data();
            senderName = senderData.displayName || senderData.name || 'User';
            senderAvatar = senderData.avatar || senderData.photoURL || 'https://firebasestorage.googleapis.com/v0/b/travel-app-3da72.firebasestorage.app/o/default%2Fdefault-pic.jpg?alt=media&token=7177f487-a345-4e45-9a56-732f03dbf65d';
          }
        } catch {}
        await addNotification({
          recipientId: postData.userId,
          senderId: userId,
          senderName,
          senderAvatar,
          type: 'comment',
          message: `commented: ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`,
          postId: postId,
          commentId: commentRef.id
        });
        // Get post owner's push token
        const postOwnerDoc = await getDoc(doc(db, 'users', postData.userId));
        const pushToken = postOwnerDoc.data()?.pushToken;
        if (pushToken) {
          await sendPushNotification(pushToken, {
            title: '💬 New Comment',
            body: `${userName} commented: ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`,
            data: {
              type: 'comment',
              senderId: userId,
              postId: postId,
              commentId: commentRef.id
            },
          });
        }
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
    const comments = querySnapshot.docs.length > 0
      ? querySnapshot.docs.map((doc: any) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            replies: Array.isArray(data.replies) ? data.replies : [],
          };
        })
      : [];
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

export async function editComment(postId: string, commentId: string, newText: string) {
  try {
    const commentRef = doc(db, 'posts', postId, 'comments', commentId);
    await updateDoc(commentRef, {
      text: newText,
      editedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function addCommentReply(postId: string, parentCommentId: string, reply: any) {
  try {
    const parentRef = doc(db, 'posts', postId, 'comments', parentCommentId);
    const parentSnap = await getDoc(parentRef);
    if (!parentSnap.exists()) throw new Error('Parent comment not found');
    const parentData = parentSnap.data();
    const replies = parentData.replies || [];
    const newReplies = [...replies, reply];
    await updateDoc(parentRef, { replies: newReplies });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Like a story comment
export async function likeStoryComment(storyId: string, commentId: string, userId: string) {
  try {
    const storyRef = doc(db, 'stories', storyId);
    const storySnap = await getDoc(storyRef);

    if (!storySnap.exists()) throw new Error('Story not found');

    const storyData = storySnap.data();
    const comments = storyData.comments || [];

    // Find and update the comment
    const updatedComments = comments.map((comment: any) => {
      if (comment.id === commentId) {
        const likes = comment.likes || [];
        if (!likes.includes(userId)) {
          return {
            ...comment,
            likes: [...likes, userId],
            likesCount: (comment.likesCount || 0) + 1
          };
        }
      }
      return comment;
    });

    await updateDoc(storyRef, {
      comments: updatedComments
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Unlike a story comment
export async function unlikeStoryComment(storyId: string, commentId: string, userId: string) {
  try {
    const storyRef = doc(db, 'stories', storyId);
    const storySnap = await getDoc(storyRef);

    if (!storySnap.exists()) throw new Error('Story not found');

    const storyData = storySnap.data();
    const comments = storyData.comments || [];

    // Find and update the comment
    const updatedComments = comments.map((comment: any) => {
      if (comment.id === commentId) {
        const likes = comment.likes || [];
        if (likes.includes(userId)) {
          return {
            ...comment,
            likes: likes.filter((id: string) => id !== userId),
            likesCount: Math.max(0, (comment.likesCount || 0) - 1)
          };
        }
      }
      return comment;
    });

    await updateDoc(storyRef, {
      comments: updatedComments
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Edit a story comment
export async function editStoryComment(storyId: string, commentId: string, newText: string) {
  try {
    const storyRef = doc(db, 'stories', storyId);
    const storySnap = await getDoc(storyRef);

    if (!storySnap.exists()) throw new Error('Story not found');

    const storyData = storySnap.data();
    const comments = storyData.comments || [];

    // Find and update the comment
    const updatedComments = comments.map((comment: any) => {
      if (comment.id === commentId) {
        return {
          ...comment,
          text: newText,
          editedAt: Timestamp.now()
        };
      }
      return comment;
    });

    await updateDoc(storyRef, {
      comments: updatedComments
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Delete a story comment
export async function deleteStoryComment(storyId: string, commentId: string) {
  try {
    const storyRef = doc(db, 'stories', storyId);
    const storySnap = await getDoc(storyRef);

    if (!storySnap.exists()) throw new Error('Story not found');

    const storyData = storySnap.data();
    const comments = storyData.comments || [];

    // Remove the comment from the array
    const updatedComments = comments.filter((comment: any) => comment.id !== commentId);

    await updateDoc(storyRef, {
      comments: updatedComments
    });

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

export async function createStory(
  userId: string,
  mediaUri: string,
  mediaType: 'image' | 'video' = 'image',
  locationData?: { name: string; address: string; placeId?: string }
) {
  try {
    console.log('🎬 Creating story for userId:', userId);

    const { getUserProfile } = await import('./firebaseHelpers/user');
    const userResult = await getUserProfile(userId);
    if (!userResult.success) throw new Error('User not found');

    // Upload media (image or video)
    const fileExtension = mediaType === 'video' ? 'mp4' : 'jpg';
    const mediaPath = `stories/${userId}/${Date.now()}.${fileExtension}`;
    console.log('📤 Uploading story media to:', mediaPath);

    const uploadResult = await uploadImage(mediaUri, mediaPath);
    if (!uploadResult.success) throw new Error(uploadResult.error);

    console.log('✅ Story upload successful:', uploadResult.url);

    // Get user's avatar from profile data - prioritize avatar field, then photoURL
    const userData = (userResult as any).data;
    const userAvatar = userData.avatar || userData.photoURL || 'https://firebasestorage.googleapis.com/v0/b/travel-app-3da72.firebasestorage.app/o/default%2Fdefault-pic.jpg?alt=media&token=7177f487-a345-4e45-9a56-732f03dbf65d';

    // Create story document
    const storyData: any = {
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

    // Add location data if provided
    if (locationData) {
      storyData.locationData = locationData;
    }

    console.log('📝 Creating story document with data:', storyData);
    const docRef = await addDoc(collection(db, 'stories'), storyData);
    console.log('✅ Story document created successfully! ID:', docRef.id);

    return { success: true, storyId: docRef.id };
  } catch (error: any) {
    console.error('❌ createStory error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
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
    const stories = querySnapshot.docs.map((doc: any) => ({
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

// Moved to user.ts

// Moved to user.ts

// ============= HIGHLIGHTS =============

// Moved to user.ts

// Moved to user.ts

// Moved to user.ts

// ============= FOLLOW/UNFOLLOW =============

// Moved to follow.ts

// Moved to follow.ts

// ============= SEARCH =============


// ============= CHAT & MESSAGING =============

/**
 * Get or create a chat conversation between two users
 */
// Moved to conversation.ts

/**
 * Send a message in a conversation
 */
// Moved to conversation.ts

/**
 * Get all messages in a conversation (real-time listener)
 */
export function subscribeToMessages(conversationId: string, callback: (messages: any[]) => void) {
  const q = query(
    collection(db, 'conversations', conversationId, 'messages'),
    orderBy('createdAt', 'asc')
  );
  
  return onSnapshot(q, (snapshot: any) => {
    const messages = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(messages);
  });
}

/**
 * Get all conversations for a user
 */
// Moved to conversation.ts

/**
 * Mark conversation as read for a user
 */
// Moved to conversation.ts

/**
 * Delete a conversation
 */
// Moved to conversation.ts

// ============= NOTIFICATIONS =============

/**
 * Get user notifications
 */
// Moved to notification.ts

/**
 * Create a notification and send push notification
 */
// Moved to notification.ts

/**
 * Get notification title based on type
 */
function getNotificationTitle(type: string, senderName: string): string {
  switch (type) {
    case 'like':
      return `❤️ ${senderName}`;
    case 'comment':
      return `💬 ${senderName}`;
    case 'follow':
      return `👤 ${senderName}`;
    case 'mention':
      return `📢 ${senderName}`;
    default:
      return senderName;
  }
}

/**
 * Send push notification via Expo Push API
 */
async function sendPushNotification(
  pushToken: string,
  notification: {
    title: string;
    body: string;
    data?: any;
  }
) {
  try {
    const message = {
      to: pushToken,
      sound: 'default',
      title: notification.title,
      body: notification.body,
      data: notification.data || {},
      badge: 1,
    };

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();
    console.log('Push notification sent:', result);
    return { success: true, result };
  } catch (error) {
    console.error('Error sending push notification:', error);
    return { success: false, error };
  }
}

/**
 * Mark notification as read
 */
// Moved to notification.ts

// Moved to user.ts

// Moved to user.ts

// ============= STORY LIKES & COMMENTS =============

// Moved to user.ts

// Moved to user.ts

// Moved to user.ts

// ============= LIVE STREAMING =============

// Get all active live streams
export async function getActiveLiveStreams() {
  try {
    const streamsRef = collection(db, 'liveStreams');
    const q = query(streamsRef, where('isLive', '==', true), orderBy('startedAt', 'desc'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map((doc: any) => ({
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
  return onSnapshot(streamRef, (snapshot: any) => {
    if (snapshot.exists()) {
      callback({ id: snapshot.id, ...snapshot.data() });
    }
  });
}

// Subscribe to live stream comments
export function subscribeToLiveComments(streamId: string, callback: (comments: any[]) => void) {
  const commentsRef = collection(db, 'liveStreams', streamId, 'comments');
  const q = query(commentsRef, orderBy('createdAt', 'asc'));
  
  return onSnapshot(q, (snapshot: any) => {
    const comments = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(comments);
  });
}

