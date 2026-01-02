# 🔄 Backend Migration Requirements & Services Needed

**Updated:** January 2, 2026  
**Status:** Firebase disabled except Auth - Full Backend migration required

---

## 📊 Current Situation

### ✅ What's Working
- **Firebase Auth ONLY** - Google, Apple, Snapchat, TikTok login
- **Backend API** - Basic endpoints for posts, users, messages, notifications
- **MongoDB Database** - User data, conversations, posts (partial)
- **Cloudinary** - File storage configured

### ❌ What's Broken (Firebase disabled)
- **ALL Firestore operations** - `db` is now `null`
- **ALL Firebase Storage operations** - `storage` is now `null`
- **Firestore helpers** - `serverTimestamp()`, `arrayUnion()`, `arrayRemove()` are `null`

---

## 🚨 CRITICAL: Files Using Firebase (MUST FIX)

### 1. **App Components Using Firebase DB**

#### `app/_components/StoriesViewer.tsx`
```typescript
import { db } from '../../config/firebase';  // ❌ db is null now
```
**Required Backend Endpoints:**
- `GET /api/stories/:storyId` - Get story by ID
- `GET /api/stories/user/:userId` - Get user's stories
- `PUT /api/stories/:storyId/view` - Track story view

---

#### `app/(tabs)/profile.tsx`
```typescript
import { db } from '../../config/firebase';  // ❌ db is null now
```
**Required Backend Endpoints:**
- `GET /api/users/:userId/profile` - Get complete profile
- `GET /api/users/:userId/sections` - Get profile sections
- `GET /api/users/:userId/highlights` - Get profile highlights
- `PUT /api/users/:userId/sections/order` - Update sections order

---

#### `app/go-live.tsx`
```typescript
import { db, doc, serverTimestamp, setDoc } from '../lib/firebaseCompatibility';  // ❌ All null
```
**Required Backend Endpoints:**
- `POST /api/live/create` - Create live stream
- `PUT /api/live/:streamId/end` - End live stream
- `GET /api/live/active` - Get active streams
- `POST /api/live/:streamId/viewers` - Add viewer
- `DELETE /api/live/:streamId/viewers/:userId` - Remove viewer

---

#### `app/friends.tsx`
```typescript
import { db, doc } from '../lib/firebaseCompatibility';  // ❌ Both null
```
**Required Backend Endpoints:**
- `GET /api/users/:userId/friends` - Get friend list
- `GET /api/users/:userId/followers` - Get followers
- `GET /api/users/:userId/following` - Get following
- `POST /api/users/:userId/follow` - Follow user
- `DELETE /api/users/:userId/unfollow` - Unfollow user

---

### 2. **Services Using Firebase**

#### `services/notificationService.ts`
```typescript
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';  // ❌ db is null

export async function savePushToken(userId: string, token: string) {
  await updateDoc(doc(db, 'users', userId), {  // ❌ WILL CRASH
    pushToken: token,
    pushTokenUpdatedAt: new Date(),
  });
}
```
**Required Backend Endpoints:**
- `PUT /api/users/:userId/push-token` - Save push notification token
- `POST /api/notifications/send` - Send push notification
- `GET /api/users/:userId/notifications` - Get notifications (EXISTS ✅)
- `DELETE /api/notifications/:notificationId` - Delete notification (EXISTS ✅)

**Push Notification Service Needed:**
- **Expo Push Notifications API** (Already using Expo)
- Backend needs to send notifications via: `https://exp.host/--/api/v2/push/send`

---

#### `services/authService.ts`
```typescript
import { getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';
// Uses Firebase Storage for avatar uploads  // ❌ storage is null
```
**Required Backend Endpoints:**
- `POST /api/upload/avatar` - Upload user avatar (Use Cloudinary)
- `PUT /api/users/:userId/profile` - Update profile with avatar URL

---

#### `services/locationService.ts`
```typescript
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';  // ❌ db is null
```
**Required Backend Endpoints:**
- `PUT /api/users/:userId/location` - Update user location
- `GET /api/users/nearby?lat=X&lng=Y&radius=Z` - Find nearby users

---

### 3. **Firebase Helpers Library**

#### All files in `lib/firebaseHelpers/` are broken:
- `archive.ts` - Archive posts (Firestore)
- `comments.ts` - Post comments (Firestore)
- `conversation.ts` - Conversations (Firestore)
- `follow.ts` - Follow/unfollow (Firestore)
- `highlights.ts` - Profile highlights (Firestore + Storage)
- `live.ts` - Live streams (Firestore)
- `messages.ts` - Messages (Firestore)
- `notification.ts` - Notifications (Firestore)
- `passport.ts` - Passport stamps (Firestore)
- `post.ts` - Posts CRUD (Firestore + Storage)
- `user.ts` - User operations (Firestore + Storage)

**Action Required:** Rewrite ALL these to call Backend API instead of Firebase

---

## 📧 Forgot Password / Email Services

### Current Implementation
`app/auth/forgot-password.tsx` uses:
```typescript
import { sendPasswordResetEmail } from 'firebase/auth';
await sendPasswordResetEmail(auth, email.trim());
```

### ✅ Firebase Email Service (Already Active)
Firebase Auth's `sendPasswordResetEmail()` **WILL STILL WORK** because:
- We kept `auth` enabled in `config/firebase.ts`
- Firebase Auth emails are handled by Firebase Authentication service
- No changes needed for forgot password

### 📧 Email Service Configuration Needed

**Firebase Console Setup Required:**
1. Go to: https://console.firebase.google.com/project/travel-app-3da72/authentication/emails
2. Configure email templates:
   - **Password Reset Template** (Already configured if emails working)
   - **Email Verification Template** (For new user signups)
3. Customize email sender name: "TraveSocial"
4. Customize email content with app branding

**Optional: Custom Email Service (If you want more control)**
Use **SendGrid** or **Mailgun** for:
- Welcome emails
- Password reset with custom branding
- Email verification
- Notification emails (new follower, new like, etc.)

**SendGrid Setup (Recommended):**
```javascript
// Backend: npm install @sendgrid/mail
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// POST /api/email/forgot-password
router.post('/email/forgot-password', async (req, res) => {
  const { email } = req.body;
  
  // Generate reset token
  const resetToken = jwt.sign({ email }, JWT_SECRET, { expiresIn: '1h' });
  const resetLink = `https://yourdomain.com/reset-password?token=${resetToken}`;
  
  const msg = {
    to: email,
    from: 'noreply@travesocial.com',
    subject: 'Reset Your Password - TraveSocial',
    html: `
      <h1>Reset Your Password</h1>
      <p>Click the link below to reset your password:</p>
      <a href="${resetLink}">Reset Password</a>
      <p>Link expires in 1 hour.</p>
    `,
  };
  
  await sgMail.send(msg);
  res.json({ success: true });
});
```

---

## 🔔 Push Notifications Service Requirements

### Current Status
- **Expo Notifications** - Already installed and configured
- **Backend notification storage** - MongoDB model exists
- **Missing:** Backend endpoint to send push notifications

### Required Backend Implementation

#### 1. Install Expo Server SDK
```bash
cd trave-social-backend
npm install expo-server-sdk
```

#### 2. Create Notification Sender Service
**File:** `trave-social-backend/services/pushNotificationService.js`
```javascript
const { Expo } = require('expo-server-sdk');
const expo = new Expo();

async function sendPushNotification(pushToken, title, body, data = {}) {
  if (!Expo.isExpoPushToken(pushToken)) {
    console.error(`Invalid Expo push token: ${pushToken}`);
    return { success: false, error: 'Invalid token' };
  }

  const message = {
    to: pushToken,
    sound: 'default',
    title: title,
    body: body,
    data: data,
    priority: 'high',
    channelId: 'default',
  };

  try {
    const ticket = await expo.sendPushNotificationsAsync([message]);
    console.log('✅ Push notification sent:', ticket);
    return { success: true, ticket };
  } catch (error) {
    console.error('❌ Push notification error:', error);
    return { success: false, error: error.message };
  }
}

module.exports = { sendPushNotification };
```

#### 3. Add Backend Endpoint
**File:** `trave-social-backend/routes/notification.js` (Add to existing)
```javascript
const { sendPushNotification } = require('../services/pushNotificationService');

// Send push notification
router.post('/notifications/send-push', async (req, res) => {
  try {
    const { userId, title, body, data } = req.body;
    
    // Get user's push token from database
    const User = mongoose.model('User');
    const user = await User.findOne({ userId: userId });
    
    if (!user || !user.pushToken) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found or no push token' 
      });
    }
    
    const result = await sendPushNotification(user.pushToken, title, body, data);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Trigger notification for various events
router.post('/notifications/trigger', async (req, res) => {
  try {
    const { type, recipientId, senderId, data } = req.body;
    
    // Get recipient and sender info
    const User = mongoose.model('User');
    const recipient = await User.findOne({ userId: recipientId });
    const sender = await User.findOne({ userId: senderId });
    
    if (!recipient || !recipient.pushToken) {
      return res.json({ success: false, error: 'No push token' });
    }
    
    // Determine notification content based on type
    let title, body;
    switch (type) {
      case 'like':
        title = 'New Like';
        body = `${sender.displayName || sender.name} liked your post`;
        break;
      case 'comment':
        title = 'New Comment';
        body = `${sender.displayName || sender.name} commented: ${data.comment}`;
        break;
      case 'follow':
        title = 'New Follower';
        body = `${sender.displayName || sender.name} started following you`;
        break;
      case 'message':
        title = sender.displayName || sender.name;
        body = data.message;
        break;
      default:
        title = 'New Notification';
        body = 'You have a new notification';
    }
    
    const result = await sendPushNotification(recipient.pushToken, title, body, data);
    
    // Also save to database
    const Notification = mongoose.model('Notification');
    await new Notification({
      recipientId,
      senderId,
      type,
      message: body,
      senderName: sender.displayName || sender.name,
      senderAvatar: sender.avatar || sender.photoURL,
    }).save();
    
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
```

---

## 📋 Complete Backend API Requirements

### Priority 1: Critical (App Breaking Without These)

#### **Posts**
- ✅ `GET /api/posts` - List posts (EXISTS)
- ✅ `POST /api/posts` - Create post (EXISTS)
- ✅ `GET /api/posts/:postId` - Get single post (EXISTS)
- ❌ `PUT /api/posts/:postId` - Update post
- ❌ `DELETE /api/posts/:postId` - Delete post
- ❌ `POST /api/posts/:postId/like` - Like post
- ❌ `DELETE /api/posts/:postId/like` - Unlike post
- ❌ `POST /api/posts/:postId/save` - Save post
- ❌ `DELETE /api/posts/:postId/save` - Unsave post

#### **Stories**
- ❌ `POST /api/stories` - Create story
- ❌ `GET /api/stories/user/:userId` - Get user stories
- ❌ `DELETE /api/stories/:storyId` - Delete story
- ❌ `PUT /api/stories/:storyId/view` - Track story view
- ❌ `GET /api/stories/following` - Get following users' stories

#### **Comments**
- ❌ `GET /api/posts/:postId/comments` - Get comments
- ❌ `POST /api/posts/:postId/comments` - Add comment
- ❌ `DELETE /api/comments/:commentId` - Delete comment
- ❌ `POST /api/comments/:commentId/like` - Like comment

#### **User Profile**
- ✅ `GET /api/users/:userId` - Get user profile (EXISTS)
- ❌ `PUT /api/users/:userId` - Update profile
- ❌ `GET /api/users/:userId/posts` - Get user posts
- ❌ `GET /api/users/:userId/sections` - Get profile sections
- ❌ `PUT /api/users/:userId/sections` - Update sections
- ❌ `GET /api/users/:userId/highlights` - Get highlights
- ❌ `POST /api/users/:userId/highlights` - Create highlight

#### **Follow System**
- ❌ `POST /api/users/:userId/follow` - Follow user
- ❌ `DELETE /api/users/:userId/unfollow` - Unfollow user
- ❌ `GET /api/users/:userId/followers` - Get followers
- ❌ `GET /api/users/:userId/following` - Get following

---

### Priority 2: Important Features

#### **Live Streams**
- ❌ `POST /api/live/create` - Create live stream
- ❌ `PUT /api/live/:streamId/end` - End stream
- ❌ `GET /api/live/active` - Get active streams
- ❌ `POST /api/live/:streamId/join` - Join stream
- ❌ `POST /api/live/:streamId/comment` - Comment on stream

#### **Notifications**
- ✅ `GET /api/users/:userId/notifications` - Get notifications (EXISTS)
- ✅ `DELETE /api/notifications/:notificationId` - Delete notification (EXISTS)
- ❌ `POST /api/notifications/send-push` - Send push notification (NEW)
- ❌ `POST /api/notifications/trigger` - Trigger notification event (NEW)
- ❌ `PUT /api/notifications/:notificationId/read` - Mark as read

#### **File Uploads** (Use Cloudinary)
- ❌ `POST /api/upload/avatar` - Upload avatar
- ❌ `POST /api/upload/post` - Upload post media
- ❌ `POST /api/upload/story` - Upload story media
- ❌ `POST /api/upload/highlight` - Upload highlight cover

---

### Priority 3: Nice to Have

#### **Search**
- ❌ `GET /api/search/users?q=query` - Search users
- ❌ `GET /api/search/posts?q=query` - Search posts
- ❌ `GET /api/search/hashtags?q=query` - Search hashtags

#### **Archive**
- ❌ `POST /api/posts/:postId/archive` - Archive post
- ❌ `GET /api/users/:userId/archive` - Get archived posts

#### **Location**
- ❌ `PUT /api/users/:userId/location` - Update location
- ❌ `GET /api/users/nearby` - Find nearby users
- ❌ `GET /api/posts/nearby` - Get nearby posts

---

## 🛠️ Implementation Checklist

### Phase 1: Fix Critical Breaking Issues
- [ ] Create all missing Backend API endpoints (Priority 1)
- [ ] Rewrite `lib/firebaseHelpers/post.ts` to use Backend API
- [ ] Rewrite `lib/firebaseHelpers/user.ts` to use Backend API
- [ ] Rewrite `lib/firebaseHelpers/comments.ts` to use Backend API
- [ ] Fix `app/_components/StoriesViewer.tsx` to use Backend
- [ ] Fix `app/(tabs)/profile.tsx` to use Backend
- [ ] Test posts create/read/like functionality

### Phase 2: Stories & Live Streams
- [ ] Create Stories API endpoints
- [ ] Create Live Streams API endpoints
- [ ] Rewrite `lib/firebaseHelpers/live.ts` to use Backend
- [ ] Fix `app/go-live.tsx` to use Backend
- [ ] Test stories creation and viewing

### Phase 3: Notifications & Push
- [ ] Install Expo Server SDK in backend
- [ ] Create push notification service
- [ ] Add push notification endpoints
- [ ] Update `services/notificationService.ts` to use Backend
- [ ] Test push notifications

### Phase 4: File Uploads
- [ ] Implement Cloudinary upload endpoints
- [ ] Update avatar upload to use Backend
- [ ] Update post media upload to use Backend
- [ ] Update story upload to use Backend

### Phase 5: Remaining Features
- [ ] Implement Priority 2 endpoints
- [ ] Rewrite all remaining firebaseHelpers
- [ ] Test all app features end-to-end
- [ ] Remove Firebase dependencies (except Auth)

---

## 📦 Required Services & APIs

### ✅ Already Configured
1. **Firebase Auth** - Google, Apple, Snapchat, TikTok login
2. **MongoDB Atlas** - Database (already connected)
3. **Cloudinary** - File storage (already configured)
4. **Expo Notifications** - Push notification client (in app)
5. **Render.com** - Backend hosting

### ❌ Need to Add
1. **Expo Server SDK** - `npm install expo-server-sdk` (for push notifications)
2. **SendGrid** (Optional) - `npm install @sendgrid/mail` (custom emails)

### 🔧 Services Configuration

#### Firebase Console (For Emails)
- URL: https://console.firebase.google.com/project/travel-app-3da72/authentication/emails
- Configure: Password reset template, Email verification template

#### Expo Push Notifications (For Notifications)
- URL: https://expo.dev/accounts/[your-username]/projects/[project-slug]/push-notifications
- No additional setup needed (uses Expo tokens)

---

## 💰 Cost Estimate

### Free Tier Services
- **Firebase Auth** - 50,000 MAU free
- **MongoDB Atlas** - 512MB free
- **Cloudinary** - 25 GB storage, 25k transformations/month free
- **Expo Push Notifications** - Unlimited free
- **Render.com** - Free tier (may sleep after inactivity)

### Paid Services (Optional)
- **SendGrid** - $15/month for 50k emails (if you want custom emails)
- **Firebase Firestore** - $0 (we disabled it, no longer needed)
- **Firebase Storage** - $0 (we disabled it, using Cloudinary instead)

**Total Monthly Cost: $0-15** (depending on whether you want SendGrid)

---

## 🚀 Quick Start Guide

### Step 1: Install Dependencies
```bash
cd trave-social-backend
npm install expo-server-sdk
# npm install @sendgrid/mail  # Optional for custom emails
```

### Step 2: Create Push Notification Service
Create file: `trave-social-backend/services/pushNotificationService.js`
(Copy code from "Push Notifications Service Requirements" section above)

### Step 3: Update Notification Routes
Add endpoints to: `trave-social-backend/routes/notification.js`
(Copy code from "Add Backend Endpoint" section above)

### Step 4: Create Missing API Endpoints
Start with Priority 1 endpoints:
- Posts CRUD and Like
- Comments
- User Profile sections/highlights
- Follow/Unfollow

### Step 5: Rewrite Firebase Helpers
Update `lib/firebaseHelpers/*.ts` files to call Backend API instead of Firebase

### Step 6: Test Everything
```bash
# Start backend
cd trave-social-backend
npm start

# Start mobile app
cd trave-social
npm start
```

---

## 📞 Support & Next Steps

**Current Status:** Firebase disabled except Auth - App WILL have errors until migration complete

**Priority Actions:**
1. ✅ Read this document completely
2. ⚠️ Start with Phase 1 (Critical endpoints)
3. ⚠️ Rewrite firebaseHelpers one by one
4. ⚠️ Test each feature after migration

**Questions?**
- Firebase email working? → Yes, `sendPasswordResetEmail()` still works
- Need custom emails? → Optional, use SendGrid if you want more control
- Push notifications? → Install expo-server-sdk and follow guide above
