# 🔗 Frontend-Backend Integration Verification Guide

**Date:** December 23, 2025  
**Status:** ✅ READY FOR TESTING

---

## 📊 Integration Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    TRAVE SOCIAL ARCHITECTURE                │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐                 ┌──────────────────┐  │
│  │   FRONTEND       │                 │    BACKEND       │  │
│  │  (React Native)  │                 │   (Express.js)   │  │
│  │    Expo CLI      │                 │   MongoDB        │  │
│  ├──────────────────┤                 ├──────────────────┤  │
│  │ http://5000/api  │◄───────HTTP────►│  Port: 5000      │  │
│  │                  │    REST API     │  Socket.io       │  │
│  │ axios/fetch      │    WebSocket    │                  │  │
│  └──────────────────┘                 └──────────────────┘  │
│                                                               │
│  ┌──────────────────┐                 ┌──────────────────┐  │
│  │    FIREBASE      │                 │  AUTHENTICATION  │  │
│  │   (Auth/Storage) │                 │  & VERIFICATION  │  │
│  ├──────────────────┤                 ├──────────────────┤  │
│  │ Firebase Config  │◄───────────────►│  JWT Tokens      │  │
│  │ Email/Password   │   ID Tokens     │  Backend Verify  │  │
│  │ Phone/Social     │                 │  Session Mgmt    │  │
│  └──────────────────┘                 └──────────────────┘  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## ✅ Integration Checklist

### 1. **Authentication Flow**

#### Signup (Email + Password)
- [ ] User fills email, password, username
- [ ] Frontend: `signUpUser(email, password, username)` called
- [ ] Firebase creates auth account
- [ ] Backend receives Firebase token
- [ ] Backend creates user in MongoDB
- [ ] Session stored locally
- [ ] Navigate to home

**Code Flow:**
```typescript
// app/auth/email-signup.tsx
→ signUpUser() [lib/firebaseHelpers.ts]
→ POST /auth/register [apiService]
→ Backend creates user in DB
→ Return success + user data
```

#### Login (Email + Password)
- [ ] User enters email + password
- [ ] Frontend: `signInUser(email, password)` called
- [ ] Firebase authenticates
- [ ] Get Firebase ID token
- [ ] Send token to backend
- [ ] Backend verifies token
- [ ] Return session/JWT
- [ ] Store locally, navigate to home

**Code Flow:**
```typescript
// app/auth/email-login.tsx or app/login.tsx
→ signInUser() [lib/firebaseHelpers.ts]
→ POST /auth/login [apiService]
→ Firebase Auth + Backend Verify
→ Session established
```

#### Social Login (Google, Phone, OTP)
- [ ] User initiates social login
- [ ] Social provider authentication
- [ ] Firebase credential creation
- [ ] Send to backend for verification
- [ ] Backend creates/updates user
- [ ] Session established

---

### 2. **User Profile Management**

#### Get User Profile
```typescript
GET /api/users/:userId
↓
Backend returns: {
  id, uid, name, email, avatar, bio, website,
  followers, following, followersCount, followingCount,
  postsCount, isPrivate, createdAt
}
↓
Frontend displays in Profile, DM, Comments, etc.
```

**Files Using This:**
- `app/(tabs)/profile.tsx` - Own profile
- `app/(tabs)/home.tsx` - Other users' posts
- `app/dm.tsx` - Conversation users
- `app/_components/InboxRow.tsx` - Message list
- `app/_components/CommentAvatar.tsx` - Comment authors

#### Update User Profile
```typescript
PUT /api/users/:userId
Body: { name, bio, website, username, ... }
↓
Backend updates MongoDB
↓
Frontend refreshes display
```

**Files Implementing:**
- `app/edit-profile.tsx`

#### Upload Profile Picture
```typescript
POST /api/media/upload (multipart)
↓
Backend uploads to Cloudinary/S3
↓
Returns image URL
↓
Save URL in user profile
```

---

### 3. **Posts & Content**

#### Create Post
```typescript
POST /api/posts
Body: {
  caption, location, mediaUrls, category, hashtags, mentions
}
↓
Backend: Create post in MongoDB
↓
Return: { success, postId }
↓
Frontend: Refresh feed/profile
```

**File:** `app/create-post.tsx`

#### Get Posts
```typescript
// Get user's own posts
GET /api/posts?userId=123

// Get feed posts (from followed users)
GET /api/posts/feed?userId=123

// Get all posts
GET /api/posts
```

**Files Using:**
- `app/(tabs)/profile.tsx` - User posts grid
- `app/(tabs)/home.tsx` - Feed display
- `app/map.tsx` - Map posts

#### Like/Unlike Post
```typescript
POST /api/posts/:postId/like
Body: { userId }
↓
Backend: Add/remove like
↓
Return: { success, likesCount }
```

**File:** `app/_components/PostCard.tsx`

#### Delete Post
```typescript
DELETE /api/posts/:postId
↓
Backend: Remove from MongoDB
↓
Frontend: Refresh
```

---

### 4. **Messaging & Conversations**

#### Create/Get Conversation
```typescript
POST /api/conversations
Body: { participantIds }
↓
Backend: Create or return existing conversation
↓
Return: { conversationId, participants, lastMessage }
```

**File:** `app/dm.tsx`

#### Get Messages
```typescript
GET /api/conversations/:conversationId/messages
↓
Backend: Return message history
↓
Frontend: Display in chat
```

#### Send Message
```typescript
POST /api/conversations/:conversationId/messages
Body: { senderId, text, attachments, replyTo }
↓
Backend: Save message
↓
Socket.io: Broadcast to recipient
↓
Frontend: Update chat display
```

#### Real-time Messages (WebSocket)
```typescript
subscribeToMessages(conversationId, callback)
↓
Socket.io listener on backend
↓
Receive new messages in real-time
↓
Update UI immediately
```

**File:** `app/dm.tsx`

---

### 5. **Streaming & Live Features**

#### Start Live Stream
```typescript
POST /api/livestreams
Body: { userId, title, description }
↓
Backend: Create stream record
↓
Return: { streamId, streamKey, rtmpUrl }
↓
Frontend: Connect to streaming service
```

#### Join Live Stream
```typescript
POST /api/livestreams/:streamId/join
Body: { userId }
↓
Backend: Add viewer
↓
Update viewer count
```

**File:** `app/watch-live.tsx`

#### Send Live Comments
```typescript
POST /api/livestreams/:streamId/comments
Body: { userId, message }
↓
Backend: Save comment
↓
Socket.io: Broadcast to all viewers
```

---

### 6. **Follow/Unfollow System**

```typescript
POST /api/users/:userId/follow
Body: { followerId }
↓
Backend: Create follow relationship
↓
Update followersCount, followingCount
↓
Frontend: Update UI
```

**Files Using:**
- `app/(tabs)/profile.tsx` - Follow button
- `app/friends.tsx` - Friends list

---

### 7. **Notifications**

```typescript
GET /api/notifications?userId=123
↓
Backend: Get all notifications for user
↓
Frontend: Display in Inbox/Notifications

POST /api/notifications/:id/read
↓
Mark as read
```

**File:** `app/inbox.tsx`

---

## 🧪 Manual Testing Steps

### Test 1: Signup & Authentication
```
1. Open app
2. Navigate to Signup
3. Enter: email, password, username
4. Click "Sign Up"
5. Expected:
   ✓ Firebase creates account
   ✓ User data sent to backend
   ✓ Session stored locally
   ✓ Redirect to home
```

### Test 2: Login
```
1. Close and reopen app (clear cache)
2. Navigate to Login
3. Enter same credentials
4. Click "Login"
5. Expected:
   ✓ Firebase authenticates
   ✓ Token sent to backend
   ✓ Session validated
   ✓ Redirect to home
```

### Test 3: Profile Operations
```
1. Navigate to Profile
2. Expected:
   ✓ User data loads from /api/users/:userId
   ✓ Avatar displays
   ✓ Bio, website show
   ✓ Posts count accurate
   ✓ Followers/Following counts show

3. Click "Edit Profile"
4. Change name, bio, upload new avatar
5. Click "Save"
6. Expected:
   ✓ PUT /api/users/:userId called
   ✓ Image uploaded
   ✓ Profile updated
   ✓ Changes visible
```

### Test 4: Create Post
```
1. Navigate to Post Creation
2. Pick image from camera/gallery
3. Add caption, location, category
4. Click "Share"
5. Expected:
   ✓ POST /api/posts called
   ✓ Image uploaded
   ✓ Post created in DB
   ✓ Appear in profile + home feed
```

### Test 5: Messaging
```
1. Navigate to DM
2. Select or start conversation
3. Type message
4. Send
5. Expected:
   ✓ POST /api/conversations/.../messages
   ✓ Message appears locally
   ✓ WebSocket updates recipient
   ✓ Message shows in receiver's app
```

### Test 6: Live Streaming
```
1. Navigate to Watch Live or Create Stream
2. Start stream
3. Expected:
   ✓ POST /api/livestreams created
   ✓ Stream connects
   ✓ Can send live comments
   ✓ Viewers can see stream + comments
```

### Test 7: Feed & Following
```
1. Navigate to Home
2. Expected:
   ✓ GET /api/posts/feed called
   ✓ Posts from followed users show
   ✓ Images load from URLs
   ✓ Pull to refresh works

3. Click on a user from post
4. Navigate to their profile
5. Click Follow
6. Expected:
   ✓ POST /api/users/:userId/follow
   ✓ Follow count updates
   ✓ Feed includes their posts
```

---

## 🔌 API Endpoints Checklist

### Authentication
- [ ] POST `/auth/login`
- [ ] POST `/auth/register`
- [ ] POST `/auth/firebase-login` (Firebase token verification)
- [ ] POST `/auth/logout`

### Users
- [ ] GET `/api/users/:userId`
- [ ] PUT `/api/users/:userId`
- [ ] GET `/api/users/:userId/posts`
- [ ] POST `/api/users/:userId/follow`
- [ ] DELETE `/api/users/:userId/follow`

### Posts
- [ ] POST `/api/posts` (create)
- [ ] GET `/api/posts` (all posts)
- [ ] GET `/api/posts/feed` (feed)
- [ ] GET `/api/posts/:postId`
- [ ] DELETE `/api/posts/:postId`
- [ ] POST `/api/posts/:postId/like`
- [ ] DELETE `/api/posts/:postId/like`

### Messages & Conversations
- [ ] POST `/api/conversations` (create/get)
- [ ] GET `/api/conversations/:id/messages`
- [ ] POST `/api/conversations/:id/messages` (send)
- [ ] PUT `/api/conversations/:id/messages/:msgId`
- [ ] DELETE `/api/conversations/:id/messages/:msgId`

### Live Streams
- [ ] POST `/api/livestreams` (create)
- [ ] GET `/api/livestreams` (active)
- [ ] GET `/api/livestreams/:id`
- [ ] POST `/api/livestreams/:id/join`
- [ ] POST `/api/livestreams/:id/leave`

### Notifications
- [ ] GET `/api/notifications?userId=`
- [ ] POST `/api/notifications/:id/read`
- [ ] DELETE `/api/notifications/:id`

---

## 🐛 Common Issues & Solutions

### Issue: 401 Unauthorized
**Cause:** Token missing or expired
**Solution:**
- Check localStorage for token/userId
- Re-authenticate if needed
- Implement token refresh

### Issue: CORS Error
**Cause:** Frontend/Backend origin mismatch
**Solution:**
- Check `cors()` config in backend
- Ensure localhost:5000 is whitelisted
- For mobile: use actual IP instead of localhost

### Issue: Messages not sending
**Cause:** WebSocket not connected
**Solution:**
- Check Socket.io connection in logs
- Verify Socket.io middleware auth
- Check backend socket handlers

### Issue: Images not uploading
**Cause:** File too large or wrong format
**Solution:**
- Compress images before upload
- Check allowed formats
- Monitor upload progress

### Issue: Profile data not loading
**Cause:** User not authenticated
**Solution:**
- Verify user is logged in
- Check userId in request
- Verify backend user exists in DB

---

## 📈 Performance Metrics

**Target Response Times:**
- Login: < 2 seconds
- Post Creation: < 3 seconds
- Feed Load: < 2 seconds
- Message Send: < 1 second (WebSocket)
- Profile Load: < 1.5 seconds

---

## 🔐 Security Checklist

- [ ] Firebase ID tokens validated on backend
- [ ] JWT tokens issued for session
- [ ] Passwords never exposed in logs
- [ ] CORS properly configured
- [ ] Rate limiting on sensitive endpoints
- [ ] Input validation on all endpoints
- [ ] SQL injection protection (MongoDB prepared)
- [ ] XSS protection headers set
- [ ] HTTPS enforced in production

---

## ✨ Integration Status Summary

| Feature | Frontend | Backend | Status |
|---------|----------|---------|--------|
| **Auth** | ✅ | ✅ | Ready |
| **Profiles** | ✅ | ✅ | Ready |
| **Posts** | ✅ | ✅ | Ready |
| **Messaging** | ✅ | ✅ | Ready |
| **Streaming** | ✅ | ✅ | Ready |
| **Notifications** | ✅ | ✅ | Ready |
| **Following** | ✅ | ✅ | Ready |
| **Comments** | ✅ | ✅ | Ready |
| **Likes** | ✅ | ✅ | Ready |
| **Stories** | ✅ | ✅ | Ready |

---

## 🚀 Next Steps

1. **Start Backend Server**
   ```bash
   cd trave-social-backend
   npm start
   ```

2. **Start Frontend**
   ```bash
   cd trave-social
   npx expo start
   ```

3. **Run Manual Tests**
   - Follow testing steps above
   - Monitor network tab for API calls
   - Check backend logs

4. **Fix Issues**
   - Debug using logs
   - Check API responses
   - Verify database state

---

**Generated:** December 23, 2025  
**Status:** Integration Ready for Testing ✅
