# Database Reset & Initialization Guide

## Problem
After deleting all data from Firebase (users, posts, categories, etc.), new users face issues:
- "User not found" error when creating posts
- Missing categories
- Missing default data
- Stories and other features not working

## Solution

### Step 1: Delete All Data (if needed)
```bash
node scripts/deleteAllUserData.js
```

This will delete:
- All users (except default avatar)
- All posts
- All likes
- All messages
- All categories
- All storage files (except default images)

### Step 2: Initialize Database with Default Data
```bash
node scripts/initializeDatabase.js
```

This will:
- ✅ Create default categories (Travel, Food, Adventure, etc.)
- ✅ Ensure all required collections exist
- ✅ Set up the database structure

### Step 3: Create New User
1. Open the app
2. Go to Sign Up
3. Create account with email/password or social login
4. User profile will be automatically created with:
   - Default avatar
   - Empty bio
   - 0 followers/following
   - All required fields

### Step 4: Test Features
- ✅ Create a post (should work now)
- ✅ Add story
- ✅ Go live
- ✅ Send messages
- ✅ Like/comment on posts

## What Was Fixed

### 1. User Creation (`lib/firebaseHelpers.ts`)
**Before:**
```javascript
await setDoc(doc(db, 'users', user.uid), {
  uid: user.uid,
  email: user.email,
  displayName: name,
  photoURL: '',  // ❌ Empty avatar
  // Missing fields
});
```

**After:**
```javascript
const defaultAvatar = 'https://firebasestorage.googleapis.com/...default-pic.jpg';

await setDoc(doc(db, 'users', user.uid), {
  uid: user.uid,
  email: user.email,
  displayName: name,
  name: name,
  avatar: defaultAvatar,      // ✅ Default avatar
  photoURL: defaultAvatar,    // ✅ Default avatar
  bio: '',
  website: '',
  followers: [],
  following: [],
  postsCount: 0,
  followersCount: 0,
  followingCount: 0,
  createdAt: serverTimestamp()
});
```

### 2. Social Auth (`services/socialAuthService.ts`)
Now creates complete user profile when signing in with Google/Apple for the first time.

### 3. Database Initialization Script
New script `scripts/initializeDatabase.js` that:
- Creates default categories
- Ensures all collections exist
- Provides status of database

## Common Issues & Solutions

### Issue: "User not found" when creating post
**Cause:** User document missing in Firestore
**Solution:** 
1. Check if user exists in Firebase Console → Firestore → users collection
2. If missing, delete the user from Authentication and sign up again
3. New signup will create proper user document

### Issue: No categories showing
**Cause:** Categories collection is empty
**Solution:** Run `node scripts/initializeDatabase.js`

### Issue: Stories not working
**Cause:** User profile missing avatar field
**Solution:** 
1. Go to Edit Profile
2. Upload a profile picture
3. Or run database initialization to set default avatar

### Issue: Live stream data not saving
**Cause:** liveStreams collection might not exist
**Solution:** Run `node scripts/initializeDatabase.js` to ensure all collections

## Database Structure

### Required Collections:
- `users` - User profiles
- `posts` - User posts
- `stories` - User stories (24h expiry)
- `liveStreams` - Active live streams
- `categories` - Post categories
- `notifications` - User notifications
- `conversations` - Chat conversations
- `messages` - Chat messages

### User Document Structure:
```javascript
{
  uid: string,
  email: string,
  displayName: string,
  name: string,
  avatar: string,        // Required!
  photoURL: string,      // Required!
  bio: string,
  website: string,
  followers: array,
  following: array,
  postsCount: number,
  followersCount: number,
  followingCount: number,
  createdAt: timestamp
}
```

## Testing Checklist

After database reset and initialization:

- [ ] Run initialization script
- [ ] Create new user account
- [ ] Check user document in Firestore (should have avatar field)
- [ ] Create a post (should work without "User not found" error)
- [ ] Add a story
- [ ] Go live
- [ ] Send a message
- [ ] Like/comment on posts
- [ ] Check categories are showing

## Scripts Available

1. `scripts/deleteAllUserData.js` - Delete all data
2. `scripts/initializeDatabase.js` - Initialize with defaults (NEW)
3. `updateCreatedAtTimestamps.js` - Fix timestamp issues
4. `updatePostAvatarsAndLocations.js` - Update old posts

## Need Help?

If issues persist:
1. Check Firebase Console → Firestore → users collection
2. Verify user document has all required fields
3. Check browser/app console for errors
4. Delete user from Authentication and sign up again

