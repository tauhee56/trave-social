# 🏗️ Backend Abstraction Layer Guide

## 📋 Overview

This app now uses a **Service Layer Architecture** that makes it easy to switch between different backend providers (Firebase, Supabase, AWS, etc.) without changing your app code.

---

## 🎯 Why This Matters

**Before:**
```typescript
// Tightly coupled to Firebase
import { auth } from '../config/firebase';
const user = auth.currentUser;

// Hard to switch to Supabase or AWS Cognito
```

**After:**
```typescript
// Provider-agnostic
import ServiceFactory from '../services/ServiceFactory';
const authService = ServiceFactory.getAuthService();
const user = authService.getCurrentUser();

// Easy to switch - just change one line in ServiceFactory!
```

---

## 🔧 How to Switch Backends

### Example: Firebase → Supabase

**Step 1:** Create Supabase implementation

```typescript
// services/implementations/SupabaseAuthService.ts
import { IAuthService, User, AuthResult } from '../interfaces/IAuthService';
import { createClient } from '@supabase/supabase-js';

export class SupabaseAuthService implements IAuthService {
  private supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  
  async signInWithEmail(email: string, password: string): Promise<AuthResult> {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) throw error;
    
    return {
      user: {
        uid: data.user.id,
        email: data.user.email,
      }
    };
  }
  
  // ... implement other methods
}
```

**Step 2:** Update ServiceFactory (ONE LINE CHANGE!)

```typescript
// services/ServiceFactory.ts
static getAuthService(): IAuthService {
  if (!this.authService) {
    // this.authService = new FirebaseAuthService(); // OLD
    this.authService = new SupabaseAuthService(); // NEW
  }
  return this.authService;
}
```

**That's it!** Your entire app now uses Supabase instead of Firebase.

---

## 📦 Available Services

### 1. Authentication Service (`IAuthService`)

**Providers:** Firebase Auth, Supabase Auth, AWS Cognito, Auth0

**Methods:**
- `signUpWithEmail(email, password)`
- `signInWithEmail(email, password)`
- `signInWithGoogle()`
- `signInWithApple()`
- `sendPasswordResetEmail(email)`
- `getCurrentUser()`
- `signOut()`
- `onAuthStateChanged(callback)`

### 2. Database Service (`IDatabaseService`)

**Providers:** Firebase Firestore, Supabase, MongoDB, PostgreSQL

**Methods:**
- `create(collection, data)` - Create document
- `getById(collection, id)` - Get single document
- `query(collection, filters)` - Query with filters
- `update(collection, id, data)` - Update document
- `delete(collection, id)` - Delete document
- `onSnapshot(collection, id, callback)` - Real-time listener
- `batch(operations)` - Batch operations

### 3. Storage Service (`IStorageService`)

**Providers:** Firebase Storage, AWS S3, Cloudinary, Supabase Storage

**Methods:**
- `uploadImage(uri, path)` - Upload image
- `uploadVideo(uri, path)` - Upload video
- `uploadWithProgress(uri, path, onProgress)` - Upload with progress
- `deleteFile(url)` - Delete file
- `getSignedUrl(path)` - Get signed URL

### 4. Live Stream Service (`ILiveStreamService`)

**Providers:** Agora, Twilio, AWS IVS, Mux

**Methods:**
- `initialize(appId)` - Initialize SDK
- `createStream(channelName, userId)` - Start streaming
- `joinStream(channelName, userId)` - Join as viewer
- `switchCamera()` - Switch front/back camera
- `enableDualCamera(enabled)` - Enable Picture-in-Picture
- `getViewers()` - Get viewer list
- `onViewerJoined(callback)` - Viewer joined event
- `onViewerLeft(callback)` - Viewer left event

### 5. Map Service (`IMapService`)

**Providers:** Google Maps, Mapbox, OpenStreetMap

**Methods:**
- `geocode(address)` - Address → Coordinates
- `reverseGeocode(lat, lon)` - Coordinates → Address
- `searchPlaces(query)` - Search places
- `getPlaceDetails(placeId)` - Get place details
- `autocomplete(input)` - Place autocomplete
- `calculateDistance(from, to)` - Calculate distance
- `getDirections(from, to)` - Get directions

---

## 🚀 Usage Examples

### Authentication

```typescript
import ServiceFactory from '../services/ServiceFactory';

const authService = ServiceFactory.getAuthService();

// Sign up
const result = await authService.signUpWithEmail('user@example.com', 'password123');
console.log('User ID:', result.user.uid);

// Sign in
const user = await authService.signInWithEmail('user@example.com', 'password123');

// Get current user
const currentUser = authService.getCurrentUser();

// Listen to auth changes
const unsubscribe = authService.onAuthStateChanged((user) => {
  if (user) {
    console.log('Logged in:', user.uid);
  } else {
    console.log('Logged out');
  }
});
```

### Database

```typescript
const dbService = ServiceFactory.getDatabaseService();

// Create post
const postId = await dbService.create('posts', {
  title: 'My Post',
  content: 'Hello World',
  userId: currentUser.uid,
  createdAt: dbService.serverTimestamp()
});

// Get post
const post = await dbService.getById('posts', postId);

// Query posts
const myPosts = await dbService.query('posts', [
  { field: 'userId', operator: '==', value: currentUser.uid }
]);

// Update post
await dbService.update('posts', postId, {
  title: 'Updated Title'
});

// Real-time listener
const unsubscribe = dbService.onSnapshot('posts', postId, (post) => {
  console.log('Post updated:', post);
});
```

### Live Streaming

```typescript
const streamService = ServiceFactory.getLiveStreamService();

// Initialize
await streamService.initialize(AGORA_APP_ID);

// Start streaming
const session = await streamService.createStream('my-channel', userId);

// Enable dual camera (Picture-in-Picture)
await streamService.enableDualCamera(true);

// Switch camera
await streamService.switchCamera();

// Get viewers
const viewers = await streamService.getViewers();

// Listen for new viewers
streamService.onViewerJoined((viewer) => {
  console.log('New viewer:', viewer.name);
});
```

---

## ✅ Benefits

1. **Easy Backend Migration** - Switch providers in minutes, not weeks
2. **Testable Code** - Mock services for unit tests
3. **Consistent API** - Same methods regardless of provider
4. **Type Safety** - TypeScript interfaces ensure correctness
5. **Future-Proof** - Add new providers without breaking existing code

---

## 📝 Next Steps

1. ✅ **Forgot Password** - Now uses email-only (no SMS)
2. ✅ **Service Interfaces** - All defined and ready
3. ✅ **Firebase Implementations** - Complete and working
4. ✅ **Dual Camera Live Streaming** - Picture-in-Picture mode
5. ✅ **Viewers List** - See who's watching your stream
6. ⏳ **Migrate Existing Code** - Gradually replace direct Firebase calls with ServiceFactory

---

## 🎥 Live Streaming Features

### Professional Features Added:

1. **Dual Camera (Picture-in-Picture)**
   - Show both front camera (your face) and back camera (scene)
   - Toggle with dual camera button
   - Labeled "You" and "Scene"

2. **Viewers List**
   - Click viewer avatars to see full list
   - Real-time viewer count
   - Shows viewer names and avatars

3. **Professional Controls**
   - Camera switch (front/back)
   - Microphone toggle
   - Video toggle
   - Location sharing
   - Dual camera toggle

4. **Visual Indicators**
   - Live badge
   - Viewer count
   - Connection status
   - Camera labels

---

**Made with ❤️ for easy backend switching!**

