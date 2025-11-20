import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyC_0pHFGAK5YySB--8hL3Ctz-u1cx4vaCk",
  authDomain: "travel-app-3da72.firebaseapp.com",
  projectId: "travel-app-3da72", 
  storageBucket: "travel-app-3da72.firebasestorage.app",
  messagingSenderId: "709095117662",
  appId: "1:709095117662:web:5f00f45bb4e392ee17f5cf",
  measurementId: "G-PFZRL4FDFD"
};

// Initialize Firebase
import { getApps } from 'firebase/app';
// Initialize Firebase (prevent duplicate)
let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

// Initialize Firebase Auth with AsyncStorage persistence
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
