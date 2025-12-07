import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { collection, doc, getDocs, query, setDoc, where, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

/**
 * Sign up with username
 * Creates a hidden email using username@trave-social.internal
 */
export async function signUpWithUsername(username: string, name: string, avatar?: string) {
  try {
    // Validate username
    if (!username || username.trim().length < 3) {
      return {
        success: false,
        error: 'Username must be at least 3 characters',
      };
    }

    // Check if username already exists
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('username', '==', username.toLowerCase().trim()));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      return {
        success: false,
        error: 'Username already taken',
      };
    }

    // Create internal email from username
    const internalEmail = `${username.toLowerCase().trim()}@trave-social.internal`;
    const randomPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12);

    // Create Firebase auth account
    const userCredential = await createUserWithEmailAndPassword(auth, internalEmail, randomPassword);
    const user = userCredential.user;

    // Default avatar
    const defaultAvatar = 'https://firebasestorage.googleapis.com/v0/b/travel-app-3da72.firebasestorage.app/o/default%2Fdefault-pic.jpg?alt=media&token=7177f487-a345-4e45-9a56-732f03dbf65d';

    // Create user document in Firestore
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      username: username.toLowerCase().trim(),
      displayName: name || username,
      name: name || username,
      bio: '',
      website: '',
      avatar: avatar || defaultAvatar,
      photoURL: avatar || defaultAvatar,
      authMethod: 'username',
      internalEmail: internalEmail, // Store for login
      createdAt: serverTimestamp(),
      followers: [],
      following: [],
      postsCount: 0,
      followersCount: 0,
      followingCount: 0,
    });

    return {
      success: true,
      user: user,
      username: username,
    };
  } catch (error: any) {
    console.error('Username Sign-Up Error:', error);

    if (error.code === 'auth/email-already-in-use') {
      return {
        success: false,
        error: 'Username already taken',
      };
    }

    return {
      success: false,
      error: error.message || 'Sign-up failed',
    };
  }
}

/**
 * Login with username
 * Finds the internal email and signs in
 */
export async function loginWithUsername(username: string) {
  try {
    if (!username || username.trim().length < 3) {
      return {
        success: false,
        error: 'Please enter a valid username',
      };
    }

    // Find user by username
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('username', '==', username.toLowerCase().trim()));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return {
        success: false,
        error: 'Username not found',
      };
    }

    // Get user data
    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data();

    if (!userData.internalEmail) {
      return {
        success: false,
        error: 'Account setup incomplete',
      };
    }

    // For username auth, we need to retrieve stored password or use passwordless
    // Since we can't retrieve password, we'll use a different approach:
    // Store a hashed identifier that we can use for authentication
    
    return {
      success: false,
      error: 'Username login requires additional setup. Please use Email, Phone, Google, or Apple login for now.',
    };
  } catch (error: any) {
    console.error('Username Login Error:', error);

    return {
      success: false,
      error: error.message || 'Login failed',
    };
  }
}

/**
 * Check if username is available
 */
export async function checkUsernameAvailability(username: string): Promise<boolean> {
  try {
    if (!username || username.trim().length < 3) {
      return false;
    }

    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('username', '==', username.toLowerCase().trim()));
    const querySnapshot = await getDocs(q);

    return querySnapshot.empty;
  } catch (error) {
    console.error('Username check error:', error);
    return false;
  }
}
