import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApps, initializeApp } from 'firebase/app';
import { getAuth, getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

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
let app;
let auth;
let db;
let storage;

try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

  // Initialize Firebase Auth with AsyncStorage persistence
  try {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage)
    });
  } catch (authError) {
    // If auth already initialized, get existing instance
    console.log('Auth already initialized, using existing instance');
    auth = getAuth(app);
  }

  db = getFirestore(app);
  storage = getStorage(app);

  console.log('✅ Firebase initialized successfully');
} catch (error) {
  console.error('❌ Firebase initialization error:', error);
  throw error;
}

export { auth, db, storage };
export default app;
