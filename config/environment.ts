/**
 * Environment Configuration
 * Load all environment variables from .env file using Expo Constants
 */

import Constants from 'expo-constants';

// Get environment variables
const env = Constants.expoConfig?.extra || {};

// Firebase Configuration
export const FIREBASE_CONFIG = {
  apiKey: env.FIREBASE_API_KEY || 'AIzaSyC_0pHFGAK5YySB--8hL3Ctz-u1cx4vaCk',
  authDomain: env.FIREBASE_AUTH_DOMAIN || 'travel-app-3da72.firebaseapp.com',
  projectId: env.FIREBASE_PROJECT_ID || 'travel-app-3da72',
  storageBucket: env.FIREBASE_STORAGE_BUCKET || 'travel-app-3da72.firebasestorage.app',
  messagingSenderId: env.FIREBASE_MESSAGING_SENDER_ID || '709095117662',
  appId: env.FIREBASE_APP_ID || '1:709095117662:web:5f00f45bb4e392ee17f5cf',
  measurementId: env.FIREBASE_MEASUREMENT_ID || 'G-PFZRL4FDFD',
} as const;

// Google Maps Configuration
export const GOOGLE_MAPS_CONFIG = {
  apiKey: env.GOOGLE_MAP_API_KEY || 'AIzaSyCYpwO1yUux1cHtd2bs-huu1hNKv1kC18c',
  provider: 'google' as const,
} as const;

// Agora Configuration
export const AGORA_CONFIG = {
  appId: env.AGORA_APP_ID || '29320482381a43498eb8ca3e222b6e34',
  appCertificate: env.AGORA_APP_CERTIFICATE || 'e8372567e0334d75add0ec3f597fb67b',
  tokenServerUrl: '',
} as const;

// App Configuration
export const APP_CONFIG = {
  name: 'Travel Social',
  version: '1.0.0',
  environment: 'development',
} as const;

// Feature Flags
export const FEATURES = {
  liveStreaming: true,
  stories: true,
  highlights: true,
  mapView: true,
  passport: true,
  privateAccounts: true,
  verifiedLocations: true,
  offlineMode: false,
  analytics: true,
  pushNotifications: true,
} as const;

// API Configuration
export const API_CONFIG = {
  timeout: 30000, // 30 seconds
  retryAttempts: 3,
  retryDelay: 1000, // 1 second
} as const;

// Storage Configuration
export const STORAGE_CONFIG = {
  maxImageSize: 10 * 1024 * 1024, // 10MB
  maxVideoSize: 100 * 1024 * 1024, // 100MB
  imageQuality: 0.8,
  maxImageWidth: 1080,
  maxImageHeight: 1920,
  allowedImageTypes: ['image/jpeg', 'image/png', 'image/webp'],
  allowedVideoTypes: ['video/mp4', 'video/quicktime'],
} as const;

// Pagination Configuration
export const PAGINATION = {
  postsPerPage: 10,
  storiesPerPage: 20,
  commentsPerPage: 50,
  notificationsPerPage: 30,
  messagesPerPage: 50,
} as const;

// Default Assets
export const DEFAULT_ASSETS = {
  avatar: 'https://firebasestorage.googleapis.com/v0/b/travel-app-3da72.firebasestorage.app/o/default%2Fdefault-pic.jpg?alt=media&token=7177f487-a345-4e45-9a56-732f03dbf65d',
  placeholder: 'https://via.placeholder.com/600x600.png?text=No+Media',
} as const;

// Theme Configuration
export const THEME = {
  primaryColor: '#667eea',
  accentColor: '#764ba2',
  errorColor: '#e74c3c',
  successColor: '#2ecc71',
  warningColor: '#f39c12',
  infoColor: '#3498db',
  backgroundColor: '#ffffff',
  textColor: '#000000',
  borderColor: '#ddd',
} as const;

// Validation Rules
export const VALIDATION = {
  minPasswordLength: 6,
  maxPasswordLength: 128,
  minUsernameLength: 3,
  maxUsernameLength: 30,
  maxBioLength: 150,
  maxCaptionLength: 2200,
  maxCommentLength: 500,
  emailRegex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  usernameRegex: /^[a-zA-Z0-9_]{3,30}$/,
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  networkError: 'Network error. Please check your connection.',
  authError: 'Authentication failed. Please login again.',
  permissionError: 'Permission denied. Please enable required permissions.',
  uploadError: 'Failed to upload media. Please try again.',
  genericError: 'Something went wrong. Please try again.',
  invalidEmail: 'Please enter a valid email address.',
  invalidPassword: 'Password must be at least 6 characters long.',
  invalidUsername: 'Username must be 3-30 characters and contain only letters, numbers, and underscores.',
  userNotFound: 'User not found.',
  postNotFound: 'Post not found.',
  unauthorized: 'You are not authorized to perform this action.',
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  postCreated: 'Post created successfully!',
  postUpdated: 'Post updated successfully!',
  postDeleted: 'Post deleted successfully!',
  profileUpdated: 'Profile updated successfully!',
  followSuccess: 'Followed successfully!',
  unfollowSuccess: 'Unfollowed successfully!',
  commentAdded: 'Comment added successfully!',
  messageSent: 'Message sent successfully!',
} as const;

// Cache Keys
export const CACHE_KEYS = {
  userProfile: (userId: string) => `user_profile_${userId}`,
  posts: (userId: string) => `posts_${userId}`,
  stories: (userId: string) => `stories_${userId}`,
  feed: (userId: string) => `feed_${userId}`,
  notifications: (userId: string) => `notifications_${userId}`,
} as const;

// Storage Keys
export const STORAGE_KEYS = {
  authToken: '@auth_token',
  userData: '@user_data',
  theme: '@theme',
  language: '@language',
  offlineQueue: '@offline_queue',
} as const;

export default {
  FIREBASE_CONFIG,
  GOOGLE_MAPS_CONFIG,
  AGORA_CONFIG,
  APP_CONFIG,
  FEATURES,
  API_CONFIG,
  STORAGE_CONFIG,
  PAGINATION,
  DEFAULT_ASSETS,
  THEME,
  VALIDATION,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  CACHE_KEYS,
  STORAGE_KEYS,
};
