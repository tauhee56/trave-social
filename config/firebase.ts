import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApps, initializeApp } from 'firebase/app';
import { Auth, getAuth, initializeAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { Firestore, getFirestore } from 'firebase/firestore';
import { FirebaseStorage, getStorage } from 'firebase/storage';
import { Platform } from 'react-native';

// Firebase configuration
const firebaseConfig = {
  apiKey: 'AIzaSyC_0pHFGAK5YySB--8hL3Ctz-u1cx4vaCk',
  authDomain: 'travel-app-3da72.firebaseapp.com',
  projectId: 'travel-app-3da72',
  storageBucket: 'travel-app-3da72.firebasestorage.app',
  messagingSenderId: '709095117662',
  appId: '1:709095117662:web:5f00f45bb4e392ee17f5cf',
  measurementId: 'G-PFZRL4FDFD',
};

// Initialize Firebase (prevent duplicate)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize Firestore with settings for better performance
const db: Firestore = getFirestore(app);

// Initialize Firebase Auth with React Native persistence
let auth: Auth;
try {
  try {
    // Try to get existing auth instance first
    auth = getAuth(app);
  } catch {
    // If no existing instance, create with custom persistence
    auth = initializeAuth(app, {
      persistence: Platform.OS === 'web' 
        ? browserLocalPersistence 
        : (require('@react-native-async-storage/async-storage').default as any)
    });
  }
  console.log('✅ Firebase Auth initialized');
} catch (error: any) {
  console.error('Firebase Auth initialization error:', error);
  // Fallback - get existing instance
  auth = getAuth(app);
}

export { auth, db };
export const storage: FirebaseStorage = getStorage(app);

export default app;
