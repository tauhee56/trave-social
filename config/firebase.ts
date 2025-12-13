import { getApps, initializeApp } from 'firebase/app';
import { Auth, initializeAuth } from 'firebase/auth';
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

// Initialize Firebase Auth (no persistence config for Expo)
export const auth: Auth = initializeAuth(app);

export const db: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);

export default app;
