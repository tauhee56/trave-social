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

// Fallback custom persistence (if RN helper not available)
const customPersistence = {
  type: 'LOCAL',
  _isAvailable: async () => {
    try {
      await AsyncStorage.setItem('__test__', 'test');
      await AsyncStorage.removeItem('__test__');
      return true;
    } catch {
      return false;
    }
  },
  _set: async (key: string, value: any) => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('AsyncStorage _set error:', error);
      throw error;
    }
  },
  _get: async (key: string) => {
    try {
      const value = await AsyncStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('AsyncStorage _get error:', error);
      return null;
    }
  },
  _remove: async (key: string) => {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('AsyncStorage _remove error:', error);
      throw error;
    }
  },
} as any;

// Initialize Firebase Auth with React Native AsyncStorage persistence (robust)
let auth: Auth;
try {
  let persistenceOption: any | undefined;
  try {
    // Prefer official RN persistence helper if available
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const rnAuth = require('firebase/auth/react-native');
    if (rnAuth?.getReactNativePersistence) {
      persistenceOption = rnAuth.getReactNativePersistence(AsyncStorage);
      console.log('🔧 Using getReactNativePersistence for Firebase Auth');
    }
  } catch (rnErr) {
    // Module may not be resolvable in some TS environments; fallback below
  }

  auth = initializeAuth(app, {
    persistence: persistenceOption ?? customPersistence,
  });
  console.log('✅ Firebase Auth initialized with persistent storage');
} catch (error: any) {
  // If already initialized, get existing instance
  console.log('⚠️ Auth already initialized, using existing instance:', error?.message ?? error);
  auth = getAuth(app);
}

export { auth };
export const db: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);

export default app;
