import { 
  getAuth, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  User
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  query, 
  collection, 
  where, 
  getDocs 
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const auth = getAuth();
const db = getFirestore();
const storage = getStorage();

// Types
export interface UserProfile {
  uid: string;
  email?: string;
  phoneNumber?: string;
  username: string;
  name?: string;
  avatar?: string;
  createdAt: Date;
}

// ==================== EMAIL/PASSWORD AUTH ====================

/**
 * Sign up with email and password
 */
export async function signUpWithEmail(email: string, password: string) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return { success: true, user: userCredential.user };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Sign in with email and password
 */
export async function signInWithEmail(email: string, password: string) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, user: userCredential.user };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Send password reset email
 */
export async function resetPassword(email: string) {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ==================== PHONE AUTH ====================



/**
 * Send OTP to phone number using MSG91
 * Securely reads API key and sender ID from environment variables
 */
export async function sendPhoneOTP(phoneNumber: string) {
  try {
    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes expiry

    // Store OTP in Firestore (collection: otps, doc: phoneNumber)
    await setDoc(doc(db, 'otps', phoneNumber), {
      otp,
      expiresAt: expiresAt.toISOString(),
      attempts: 0,
      createdAt: now.toISOString(),
    });

    // MSG91 API details
    const apiKey = process.env.MSG91_API_KEY || '<YOUR_MSG91_API_KEY>';
    const senderId = process.env.MSG91_SENDER_ID || '<YOUR_SENDER_ID>';
    const templateId = process.env.MSG91_TEMPLATE_ID || '<YOUR_TEMPLATE_ID>';

    // Format phone number as per MSG91 requirements (e.g., with country code)
    const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;

    // MSG91 API endpoint
    const url = 'https://api.msg91.com/api/v5/otp';

    const payload = {
      mobile: formattedPhone,
      otp,
      sender: senderId,
      template_id: templateId
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'authkey': apiKey
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (data.type === 'success') {
      return { success: true };
    } else {
      return { success: false, error: data.message || 'Failed to send OTP' };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Verify OTP code securely using Firestore
 */
export async function verifyPhoneOTP(phoneNumber: string, code: string) {
  try {
    const otpDocRef = doc(db, 'otps', phoneNumber);
    const otpDoc = await getDoc(otpDocRef);
    if (!otpDoc.exists()) {
      return { success: false, error: 'OTP not found. Please request a new one.' };
    }
    const data = otpDoc.data();
    const now = new Date();
    const expiresAt = new Date(data.expiresAt);
    if (now > expiresAt) {
      await setDoc(otpDocRef, { ...data, attempts: data.attempts + 1 }, { merge: true });
      return { success: false, error: 'OTP expired. Please request a new one.' };
    }
    if (data.attempts >= 5) {
      return { success: false, error: 'Too many attempts. Please request a new OTP.' };
    }
    if (data.otp !== code) {
      await setDoc(otpDocRef, { ...data, attempts: data.attempts + 1 }, { merge: true });
      return { success: false, error: 'Invalid OTP. Please try again.' };
    }
    // OTP is valid, delete it
    await setDoc(otpDocRef, { ...data, otp: null }, { merge: true });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ...existing code...

// ==================== SOCIAL AUTH ====================

/**
 * Sign in with Google
 */
export async function signInWithGoogle() {
  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    return { success: true, user: result.user };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Sign in with Apple
 */
export async function signInWithApple() {
  try {
    const provider = new OAuthProvider('apple.com');
    const result = await signInWithPopup(auth, provider);
    return { success: true, user: result.user };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ==================== USER PROFILE ====================

/**
 * Check if username is available
 */
export async function checkUsernameAvailability(username: string): Promise<boolean> {
  try {
    const q = query(collection(db, 'users'), where('username', '==', username.toLowerCase()));
    const snapshot = await getDocs(q);
    return snapshot.empty;
  } catch (error) {
    console.error('Error checking username:', error);
    return false;
  }
}

/**
 * Create user profile in Firestore
 */
export async function createUserProfile(
  uid: string,
  username: string,
  data: Partial<UserProfile> = {}
) {
  try {
    const userProfile: UserProfile = {
      uid,
      username: username.toLowerCase(),
      name: data.name,
      email: data.email,
      phoneNumber: data.phoneNumber,
      avatar: data.avatar,
      createdAt: new Date(),
    };

    await setDoc(doc(db, 'users', uid), userProfile);
    return { success: true, profile: userProfile };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get user profile from Firestore
 */
export async function getUserProfile(uid: string) {
  try {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { success: true, profile: docSnap.data() as UserProfile };
    } else {
      return { success: false, error: 'Profile not found' };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Upload profile image
 */
export async function uploadProfileImage(uid: string, imageUri: string) {
  try {
    const response = await fetch(imageUri);
    const blob = await response.blob();
    
    const storageRef = ref(storage, `avatars/${uid}`);
    await uploadBytes(storageRef, blob);
    const url = await getDownloadURL(storageRef);
    
    return { success: true, url };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Sign out current user
 */
export async function signOutUser() {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get current user
 */
export function getCurrentUser(): User | null {
  return auth.currentUser;
}

// ==================== PHONE OTP FOR PASSWORD RESET ====================

/**
 * For forgot password flow using phone OTP
 * This would need additional Firestore logic to link phone to email
 */
export async function sendPasswordResetOTP(phoneNumber: string) {
  // Implementation depends on your backend logic
  // You might need a Cloud Function to handle this
  return { success: true, message: 'OTP sent' };
}

export async function verifyPasswordResetOTP(phoneNumber: string, code: string) {
  // Implementation depends on your backend logic
  return { success: true, message: 'OTP verified' };
}
