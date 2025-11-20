# Firebase Backend Integration - Setup Guide

## 🚀 Complete Setup Instructions

### 1. Install Required Packages

```bash
cd "c:\Users\tauhe\OneDrive\Desktop\newpj\trave-social"
npx expo install firebase expo-image-picker
```

### 2. Firebase Console Setup

1. **Create Firebase Project**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Click "Add project" or select existing project
   - Follow the setup wizard

2. **Register Web App**
   - In Project Overview, click the Web icon (`</>`)
   - Register your app with a nickname (e.g., "Trave Social")
   - Copy the Firebase configuration object

3. **Enable Authentication**
   - Go to **Authentication** → **Sign-in method**
   - Enable **Email/Password** provider
   - Click Save

4. **Create Firestore Database**
   - Go to **Firestore Database** → **Create database**
   - Start in **Test mode** (for development)
   - Choose a location closest to your users
   - Click Enable

5. **Set Up Firebase Storage**
   - Go to **Storage** → **Get started**
   - Start in **Test mode** (for development)
   - Click Done

### 3. Update Firebase Configuration

Open `config/firebase.js` and replace the placeholder values with your Firebase project credentials:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",              // From Firebase Console
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

**Where to find these values:**
- Firebase Console → Project Settings → General → Your apps → SDK setup and configuration

### 4. Configure Firestore Security Rules (Optional but Recommended)

In Firebase Console → Firestore Database → Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Posts collection
    match /posts/{postId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null && request.auth.uid == resource.data.userId;
    }
    
    // Stories collection
    match /stories/{storyId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow delete: if request.auth != null && request.auth.uid == resource.data.userId;
    }
    
    // Highlights collection
    match /highlights/{highlightId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null && request.auth.uid == resource.data.userId;
    }
  }
}
```

### 5. Configure Storage Security Rules (Optional but Recommended)

In Firebase Console → Storage → Rules:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /posts/{userId}/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    match /stories/{userId}/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    match /avatars/{userId}/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### 6. Run the App

```bash
npx expo start
```

**For camera/photo features, run on:**
- Physical device (recommended)
- iOS Simulator (photos only)
- Android Emulator (photos only)

**Note:** Camera and image picker require native modules - use Expo Dev Client or physical device for full functionality.

## 📱 Features Implemented

### ✅ Authentication
- **Sign Up**: Email/password registration with Firestore user profile creation
- **Login**: Email/password authentication
- **Auto-login**: Session persistence (Firebase handles this automatically)
- **Sign Out**: Available in firebaseHelpers.ts

### ✅ Posts
- **Create Post**: Upload image to Firebase Storage, save post metadata to Firestore
- **View Feed**: Display posts from followed users (getFeedPosts)
- **View Profile Posts**: Display user's own posts (getUserPosts)
- **Like Posts**: Toggle likes (likePost function ready)
- **Image Upload**: Camera or gallery via expo-image-picker

### ✅ Profile Management
- **View Profile**: Display user data from Firestore (avatar, name, bio, website, stats)
- **Edit Profile**: Update profile info and upload new avatar
- **View Other Users**: Navigate to any user's profile
- **Follow/Unfollow**: Functions ready in firebaseHelpers.ts (UI integration pending)

### ✅ Stories (Functions Ready)
- **createStory**: Upload story image with 24-hour expiry
- **getActiveStories**: Fetch stories that haven't expired
- **getUserStories**: Get specific user's stories

### ✅ Highlights (Functions Ready)
- **createHighlight**: Create permanent story collection
- **getUserHighlights**: Fetch user's highlights
- **getHighlightStories**: Get stories in a highlight

### ✅ Social Features (Functions Ready)
- **followUser**: Add to followers/following arrays
- **unfollowUser**: Remove from followers/following
- **searchUsers**: Search by name or email

## 🔧 Firebase Helper Functions

All functions are in `lib/firebaseHelpers.ts` and return `{success: boolean, data/error: any}`:

### Authentication
```typescript
signUpUser(email, password, name)      // Create account + Firestore profile
signInUser(email, password)            // Login
signOutUser()                          // Logout
getCurrentUser()                        // Get current auth user
```

### Profile
```typescript
getUserProfile(userId)                  // Get user data from Firestore
updateUserProfile(userId, updates)      // Update profile fields
```

### Storage
```typescript
uploadImage(uri, path)                  // Upload to Firebase Storage, returns URL
deleteImage(path)                       // Delete from Storage
```

### Posts
```typescript
createPost(userId, imageUri, caption, location)  // Create post with image upload
getUserPosts(userId)                             // Get user's posts
getFeedPosts(userId)                             // Get posts from followed users
likePost(postId, userId)                         // Toggle like
```

### Stories
```typescript
createStory(userId, imageUri)           // Upload story (24hr expiry)
getActiveStories()                      // All non-expired stories
getUserStories(userId)                  // User's stories
```

### Highlights
```typescript
createHighlight(userId, name, coverImage, storyIds)  // Create highlight
getUserHighlights(userId)                            // Get user highlights
getHighlightStories(highlightId)                     // Get highlight's stories
```

### Social
```typescript
followUser(currentUserId, targetUserId)   // Follow user
unfollowUser(currentUserId, targetUserId) // Unfollow user
searchUsers(query)                         // Search by name/email
```

## 📂 Firestore Data Structure

### Collections

#### `users/{userId}`
```javascript
{
  id: "user_uid",
  name: "User Name",
  email: "user@example.com",
  avatar: "https://storage.firebase.com/...",
  bio: "Travel enthusiast",
  website: "https://example.com",
  followers: ["uid1", "uid2"],
  following: ["uid3", "uid4"],
  createdAt: Timestamp
}
```

#### `posts/{postId}`
```javascript
{
  id: "post_id",
  userId: "user_uid",
  imageUrl: "https://storage.firebase.com/...",
  caption: "Amazing sunset!",
  location: "Dubai",
  likes: ["uid1", "uid2"],
  commentsCount: 0,
  createdAt: Timestamp
}
```

#### `stories/{storyId}`
```javascript
{
  id: "story_id",
  userId: "user_uid",
  imageUrl: "https://storage.firebase.com/...",
  createdAt: Timestamp,
  expiresAt: Timestamp  // 24 hours after createdAt
}
```

#### `highlights/{highlightId}`
```javascript
{
  id: "highlight_id",
  userId: "user_uid",
  name: "London Trip",
  coverImage: "https://storage.firebase.com/...",
  storyIds: ["story1", "story2"],
  createdAt: Timestamp
}
```

## 🎯 Next Steps (Optional Enhancements)

### High Priority
1. **Wire Like Button**: Connect heart icon in PostCard to `likePost()`
2. **Comments System**: Add comments collection and UI
3. **Real-time Updates**: Use Firestore `onSnapshot` for live feeds
4. **Story Viewer**: Full-screen story viewer with auto-advance
5. **Highlight Viewer**: Screen to view highlight stories

### Medium Priority
6. **Follow/Unfollow UI**: Wire Follow button to `followUser()`/`unfollowUser()`
7. **Search Integration**: Connect search to `searchUsers()` function
8. **Notifications**: Push notifications for likes, follows, comments
9. **Story Upload**: Add story creation UI
10. **Profile Stats**: Calculate real location count, update stats

### Lower Priority
11. **Image Compression**: Optimize uploads before sending to Storage
12. **Offline Support**: Firestore offline persistence
13. **Loading States**: Skeleton screens for better UX
14. **Error Handling**: Comprehensive error boundaries
15. **Analytics**: Firebase Analytics integration

## ⚠️ Important Notes

### Development Mode
- Firestore and Storage are set to **Test mode** (open access)
- **DO NOT deploy to production with these rules**
- Update security rules before launch

### Image Picker
- Requires `expo-image-picker` package
- Camera access needs physical device or dev client
- Gallery works on simulators/emulators

### Authentication
- Email verification not enabled (add later for production)
- Password reset functionality available via Firebase but not wired in UI
- Consider adding social auth (Google, Apple) for better UX

### Storage Costs
- Images stored in Firebase Storage (free tier: 5GB storage, 1GB/day download)
- Consider image compression/resizing for production
- Use CDN or Image Optimization service for large scale

## 🐛 Troubleshooting

### "expo-image-picker not available"
- Run: `npx expo install expo-image-picker`
- Rebuild app or restart Metro: `npx expo start -c`

### Firebase errors in console
- Check Firebase config values in `config/firebase.js`
- Ensure Firebase services (Auth, Firestore, Storage) are enabled in Console
- Verify security rules allow your operations

### Images not uploading
- Check Storage is enabled in Firebase Console
- Verify Storage security rules
- Ensure image URI is valid (starts with `file://` or `content://`)

### Posts not showing in feed
- Ensure user has followed other users
- Check Firestore has posts data
- Verify `getFeedPosts()` is called with correct userId

### Camera not working
- Physical device or Dev Client required
- Request permissions in app.json if needed
- Check platform-specific permissions (iOS: Info.plist, Android: AndroidManifest)

## 📞 Support

For Firebase documentation:
- [Firebase Authentication](https://firebase.google.com/docs/auth)
- [Firestore Database](https://firebase.google.com/docs/firestore)
- [Firebase Storage](https://firebase.google.com/docs/storage)
- [Expo Image Picker](https://docs.expo.dev/versions/latest/sdk/imagepicker/)

---

**Happy coding! 🚀**
