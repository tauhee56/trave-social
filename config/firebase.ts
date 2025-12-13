import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApps, initializeApp } from 'firebase/app';
import { Auth, getAuth, initializeAuth } from 'firebase/auth';
import { Firestore, getFirestore } from 'firebase/firestore';
import { FirebaseStorage, getStorage } from 'firebase/storage';

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

// Initialize Firebase Auth with AsyncStorage persistence
// This ensures user stays logged in even after app restart
// For React Native, we use a custom persistence implementation
let auth: Auth;
try {
  // Try to initialize with custom persistence using AsyncStorage
  auth = initializeAuth(app, {
    persistence: {
      _isAvailable: () => Promise.resolve(true),
      _set: (key: string, value: any) => AsyncStorage.setItem(key, JSON.stringify(value)),
      _get: (key: string) => AsyncStorage.getItem(key).then(value => value ? JSON.parse(value) : null),
      _remove: (key: string) => AsyncStorage.removeItem(key),
      type: 'LOCAL'
    } as any
  });
} catch (error) {
  // If already initialized, get existing instance
  auth = getAuth(app);
}

export { auth };
export const db: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);

export default app;
