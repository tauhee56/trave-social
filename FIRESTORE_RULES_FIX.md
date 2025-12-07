# Firestore Security Rules Fix

## Problem
Posts and stories are being created successfully in the app (showing "Success" alert), but they're not appearing in the Firebase database. This is likely due to **Firestore Security Rules** blocking writes from the client.

## Solution

### Step 1: Check Current Rules
Go to Firebase Console → Firestore Database → Rules

### Step 2: Update Firestore Rules

Replace your current rules with these **development-friendly rules**:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Allow authenticated users to read/write their own user document
    match /users/{userId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Allow authenticated users to create posts
    // Allow anyone to read posts
    match /posts/{postId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null && 
        (resource.data.userId == request.auth.uid || request.auth.uid == resource.data.userId);
    }
    
    // Allow authenticated users to create stories
    // Allow anyone to read stories
    match /stories/{storyId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null && 
        (resource.data.userId == request.auth.uid || request.auth.uid == resource.data.userId);
    }
    
    // Categories - read by all, write by authenticated users
    match /categories/{categoryId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // Notifications - users can read/write their own
    match /notifications/{notificationId} {
      allow read: if request.auth != null && resource.data.userId == request.auth.uid;
      allow write: if request.auth != null;
    }
    
    // Conversations - users can read/write their own
    match /conversations/{conversationId} {
      allow read: if request.auth != null && 
        request.auth.uid in resource.data.participants;
      allow write: if request.auth != null;
    }
    
    // Messages - users can read/write in their conversations
    match /messages/{messageId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    
    // Live streams - read by all, write by authenticated users
    match /liveStreams/{streamId} {
      allow read: if true;
      allow write: if request.auth != null;
      
      // Subcollections
      match /comments/{commentId} {
        allow read: if true;
        allow write: if request.auth != null;
      }
      
      match /viewers/{viewerId} {
        allow read: if true;
        allow write: if request.auth != null;
      }
    }
    
    // Passport tickets
    match /users/{userId}/passportTickets/{ticketId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### Step 3: Publish Rules
1. Click "Publish" button in Firebase Console
2. Wait for rules to deploy (usually instant)

### Step 4: Test Again
1. Restart your app
2. Try creating a post
3. Try creating a story
4. Check Firebase Console → Firestore Database
5. Posts and stories should now appear!

## Alternative: Temporary Open Rules (DEVELOPMENT ONLY)

⚠️ **WARNING: Only use this for testing! Never use in production!**

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

This allows all reads and writes without authentication. Use only for debugging!

## How to Check if Rules are the Problem

Run this test in your app console:

```javascript
// In your app, try to manually create a document
import { addDoc, collection } from 'firebase/firestore';
import { db } from './config/firebase';

const testPost = async () => {
  try {
    const docRef = await addDoc(collection(db, 'posts'), {
      test: true,
      userId: 'test-user',
      createdAt: new Date()
    });
    console.log('✅ Test post created:', docRef.id);
  } catch (error) {
    console.error('❌ Error:', error.code, error.message);
    // If you see "permission-denied", it's a rules issue!
  }
};
```

## Common Error Messages

### "Missing or insufficient permissions"
- **Cause**: Firestore rules are blocking the write
- **Solution**: Update rules as shown above

### "PERMISSION_DENIED"
- **Cause**: User is not authenticated or rules don't allow the operation
- **Solution**: 
  1. Check if user is logged in (`auth.currentUser`)
  2. Update Firestore rules

### No error but data not appearing
- **Cause**: Silent failure due to offline mode or rules
- **Solution**: 
  1. Check network connection
  2. Check Firestore rules
  3. Look for errors in console

## Verification Steps

After updating rules:

1. ✅ Go to Firebase Console → Firestore Database
2. ✅ Create a post in the app
3. ✅ Refresh Firestore console
4. ✅ You should see the new post document
5. ✅ Create a story
6. ✅ Refresh Firestore console
7. ✅ You should see the new story document

## Production Rules (Use Later)

Once everything works, tighten security:

```javascript
// Only allow users to create posts with their own userId
match /posts/{postId} {
  allow read: if true;
  allow create: if request.auth != null && 
    request.resource.data.userId == request.auth.uid;
  allow update, delete: if request.auth != null && 
    resource.data.userId == request.auth.uid;
}
```

