# 🔐 Firebase Configuration - Authentication Only

## Current Setup (Updated: Jan 2, 2026)

Firebase is configured to **ONLY handle authentication**. All other operations use the Backend API.

## ✅ What Firebase DOES

### 1. Authentication Only
- **Google Sign-In** - `signInWithCredential(GoogleAuthProvider)`
- **Apple Sign-In** - `signInWithCredential(OAuthProvider)`
- **Snapchat OAuth** - Token exchange via Firebase Auth
- **TikTok OAuth** - Token exchange via Firebase Auth

**File:** `services/socialAuthService.ts`

```typescript
// Firebase Auth generates JWT tokens after social login
const credential = GoogleAuthProvider.credential(idToken);
const userCredential = await signInWithCredential(auth, credential);
const token = await userCredential.user.getIdToken();
```

## ❌ What Firebase DOES NOT DO

### Disabled Services

#### 1. **Firestore Database** ❌
- **Before:** Stored posts, stories, comments, profiles, highlights
- **Now:** All data operations use Backend API
- **Config:** `export const db = null`

#### 2. **Firebase Storage** ❌
- **Before:** Stored images/videos (posts/, stories/, avatars/)
- **Now:** All file uploads use Backend API
- **Config:** `export const storage = null`

#### 3. **Firestore Helpers** ❌
- `serverTimestamp()` → Use `Date.now()` or Backend timestamps
- `arrayUnion()` → Use Backend array operations
- `arrayRemove()` → Use Backend array operations
- All exported as `null`

## 🔄 Migration Status

### Completed
- ✅ Firebase Auth limited to authentication only
- ✅ All state management uses AsyncStorage (token-based)
- ✅ UserContext disabled (no Firebase listeners)
- ✅ Firestore and Storage exports disabled

### To Do (Backend Migration)
- [ ] Move all Firestore operations to Backend API endpoints
- [ ] Move all Storage uploads to Backend file upload API
- [ ] Update all `lib/firebaseHelpers/` functions to call Backend
- [ ] Remove Firebase dependencies from `package.json` (except Auth)

## 📋 Backend API Integration

**Backend URL:** `https://trave-social-backend.onrender.com/api`

### Required Endpoints (to replace Firebase)

```typescript
// Posts
POST   /posts              // Create post (replace Firestore addDoc)
GET    /posts/:id          // Get post (replace getDoc)
PUT    /posts/:id/like     // Like post (replace updateDoc)
DELETE /posts/:id          // Delete post (replace deleteDoc)

// Stories
POST   /stories            // Create story (replace Firestore + Storage)
GET    /stories/user/:id   // Get user stories
DELETE /stories/:id        // Delete story

// Comments
POST   /posts/:id/comments // Add comment (replace addDoc)
GET    /posts/:id/comments // Get comments (replace getDocs)

// User Profile
GET    /users/:id          // Get user profile (replace getDoc)
PUT    /users/:id          // Update profile (replace updateDoc)

// Highlights
POST   /highlights         // Create highlight
GET    /highlights/:userId // Get user highlights

// File Uploads
POST   /upload/avatar      // Upload avatar (replace Storage)
POST   /upload/post        // Upload post media
POST   /upload/story       // Upload story media
```

## 🛠️ Implementation Guide

### Step 1: Update Firebase Helpers

All functions in `lib/firebaseHelpers/` should call Backend API:

**Before (Firestore):**
```typescript
import { collection, addDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';

export async function createPost(data) {
  const docRef = await addDoc(collection(db, 'posts'), data);
  return docRef.id;
}
```

**After (Backend API):**
```typescript
import { API_BASE_URL } from '@/lib/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export async function createPost(data) {
  const token = await AsyncStorage.getItem('token');
  const response = await fetch(`${API_BASE_URL}/posts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  const result = await response.json();
  return result.postId;
}
```

### Step 2: Update File Uploads

**Before (Firebase Storage):**
```typescript
import { ref, uploadBytes } from 'firebase/storage';
import { storage } from '@/config/firebase';

const storageRef = ref(storage, `posts/${userId}/${Date.now()}.jpg`);
await uploadBytes(storageRef, blob);
```

**After (Backend API):**
```typescript
const formData = new FormData();
formData.append('file', {
  uri: imageUri,
  type: 'image/jpeg',
  name: 'upload.jpg',
});

const token = await AsyncStorage.getItem('token');
const response = await fetch(`${API_BASE_URL}/upload/post`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
  },
  body: formData,
});
```

## 🔒 Security

### Authentication Flow
1. User logs in with Google/Apple/Snapchat/TikTok
2. Firebase Auth generates JWT token
3. Token saved to AsyncStorage: `{ token, userId }`
4. All Backend API calls include: `Authorization: Bearer ${token}`
5. Backend verifies Firebase token with Admin SDK

### Backend Verification (Node.js)
```javascript
const admin = require('firebase-admin');

async function verifyToken(req, res, next) {
  const token = req.headers.authorization?.split('Bearer ')[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.userId = decodedToken.uid;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
}
```

## 📱 App Architecture

```
┌─────────────────────────────────────────┐
│         React Native App               │
├─────────────────────────────────────────┤
│                                         │
│  ┌──────────────────────────────────┐  │
│  │   Firebase Auth (LOGIN ONLY)     │  │
│  │   - Google Sign-In               │  │
│  │   - Apple Sign-In                │  │
│  │   - Token Generation             │  │
│  └──────────────────────────────────┘  │
│              ↓ (JWT Token)             │
│  ┌──────────────────────────────────┐  │
│  │   AsyncStorage                   │  │
│  │   { token, userId }              │  │
│  └──────────────────────────────────┘  │
│              ↓ (All API Calls)         │
│  ┌──────────────────────────────────┐  │
│  │   Backend API (Render.com)       │  │
│  │   - Posts, Stories, Comments     │  │
│  │   - Profiles, Highlights         │  │
│  │   - File Uploads                 │  │
│  │   - MongoDB Database             │  │
│  └──────────────────────────────────┘  │
│                                         │
└─────────────────────────────────────────┘
```

## ⚠️ Important Notes

1. **DO NOT use `db` or `storage`** - They are disabled (null)
2. **DO NOT import Firestore functions** - Use Backend API
3. **DO NOT use Firebase helpers** - Update them to call Backend
4. **Only use `auth`** - For login/signup token generation

## 🚀 Next Steps

1. **Create Backend API endpoints** for all data operations
2. **Migrate firebaseHelpers/** to use Backend API
3. **Test authentication flow** (still uses Firebase)
4. **Test data operations** (now use Backend)
5. **Remove unused Firebase dependencies**

## 📞 Support

If you see errors like:
- ❌ "Cannot read property 'collection' of null" → Update code to use Backend API
- ❌ "storage.ref is not a function" → Update file uploads to Backend
- ✅ Firebase Auth errors → These should still work (authentication only)
