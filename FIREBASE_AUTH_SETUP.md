# Firebase Authentication Setup Guide

## Current Status

✅ **Firebase Authentication is READY to integrate**

Your app currently has:
- ✅ Frontend Firebase helpers (`lib/firebaseHelpers.ts`)
- ✅ Backend authentication endpoints (email/password, Firebase, Apple, Google)
- ✅ AsyncStorage for token management
- ✅ All social auth methods implemented

---

## How Authentication Currently Works

### Frontend Flow (React Native - Expo)

1. **User enters email/password** → `email-login.tsx`
2. **`signInUser()` called** → `lib/firebaseHelpers.ts`
3. **API call to backend** → `/api/auth/login`
4. **Token & userId saved** → AsyncStorage
5. **User redirected to home** → `/app/(tabs)/home`

### Backend Endpoints

```
POST /api/auth/login                    ← Email/password login
POST /api/auth/register                 ← Email/password signup
POST /api/auth/firebase-login           ← Firebase token login
POST /api/auth/apple-signin             ← Apple Sign-in
POST /api/auth/google-signin            ← Google Sign-in
GET  /api/users/:id                     ← Get user profile
```

---

## Firebase Authentication Methods

### Method 1: Email/Password (Currently Working ✅)

**Frontend:**
```typescript
const result = await signInUser('user@example.com', 'password123');
if (result.success) {
  // Token saved, user logged in
  router.replace('/(tabs)/home');
}
```

**Backend Response:**
```json
{
  "success": true,
  "userId": "user_abc123",
  "token": "token_xyz789",
  "user": {
    "id": "user_abc123",
    "email": "user@example.com",
    "name": "User"
  }
}
```

### Method 2: Firebase Authentication (Ready ✅)

**Requirements:**
1. Download Firebase credentials JSON
2. Copy to `serviceAccountKey.json`
3. Install: `npm install firebase-admin`
4. Uncomment Firebase code in `src/index.js`

**How it works:**
```typescript
// Frontend
const idToken = user.idToken;  // From Firebase Auth
const result = await apiService.post('/auth/firebase-login', {
  firebaseToken: idToken,
  email: user.email,
  uid: user.uid
});
```

**Backend validates token:**
```javascript
const decodedToken = await admin.auth().verifyIdToken(token);
// Creates user if not exists
// Returns token + userId
```

### Method 3: Apple Sign-In (Ready ✅)

**Frontend Call:**
```typescript
import * as AppleAuthentication from 'expo-apple-authentication';

const result = await AppleAuthentication.signInAsync({
  requestedScopes: [
    AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
    AppleAuthentication.AppleAuthenticationScope.EMAIL,
  ],
});

// Send to backend
await apiService.post('/api/auth/apple-signin', {
  identityToken: result.identityToken,
  user: result.user
});
```

### Method 4: Google Sign-In (Ready ✅)

**Frontend Call:**
```typescript
import * as GoogleSignIn from 'expo-google-sign-in';

const userInfo = await GoogleSignIn.signInAsync();

// Send to backend
await apiService.post('/api/auth/google-signin', {
  idToken: userInfo.idToken,
  user: {
    id: userInfo.id,
    email: userInfo.email,
    name: userInfo.name,
    photo: userInfo.photoUrl
  }
});
```

---

## Step-by-Step: Enable Firebase in Production

### Phase 1: Get Firebase Credentials (5 min)

1. Go to [firebase.google.com](https://firebase.google.com)
2. Create new project "Trave Social"
3. Enable Authentication:
   - Email/Password
   - Google
   - Apple
4. Download Service Account Key:
   - Settings → Service Accounts → Generate Key
   - Save as `serviceAccountKey.json`

### Phase 2: Install Firebase Admin SDK (2 min)

```bash
cd c:\Projects\trave-social-backend
npm install firebase-admin
```

### Phase 3: Enable Firebase Token Verification (3 min)

In `src/index.js`, uncomment:

```javascript
const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const verifyFirebaseToken = async (token) => {
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    return { success: true, uid: decodedToken.uid, email: decodedToken.email };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
```

### Phase 4: Update Firebase Login Endpoint (2 min)

Replace mock token verification with real verification:

```javascript
app.post('/api/auth/firebase-login', async (req, res) => {
  const { firebaseToken } = req.body;
  
  // VERIFY REAL FIREBASE TOKEN
  const verification = await verifyFirebaseToken(firebaseToken);
  
  if (!verification.success) {
    return res.status(401).json({ success: false, error: 'Invalid token' });
  }
  
  // Create or fetch user
  const userId = verification.uid;
  // ... rest of logic
});
```

### Phase 5: Update Frontend (React Native Config)

In your frontend, add Firebase config file:

```typescript
// app/_services/firebaseConfig.ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "your-app.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-storage.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
```

Then use in login:

```typescript
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from './_services/firebaseConfig';

const userCredential = await signInWithEmailAndPassword(auth, email, password);
const idToken = await userCredential.user.getIdToken();

// Send to backend
await apiService.post('/api/auth/firebase-login', {
  firebaseToken: idToken,
  email: userCredential.user.email,
  uid: userCredential.user.uid
});
```

---

## Testing Firebase Auth (Local)

### Test 1: Email/Password Login ✅

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

**Response:**
```json
{
  "success": true,
  "userId": "user_abc123",
  "token": "token_xyz",
  "user": {"id": "user_abc123", "email": "test@example.com"}
}
```

### Test 2: Firebase Login (After Setup)

```bash
curl -X POST http://localhost:5000/api/auth/firebase-login \
  -H "Content-Type: application/json" \
  -d '{"firebaseToken":"real-firebase-id-token-here","email":"user@gmail.com","uid":"firebase_uid_123"}'
```

### Test 3: Apple Sign-In

```bash
curl -X POST http://localhost:5000/api/auth/apple-signin \
  -H "Content-Type: application/json" \
  -d '{"identityToken":"apple-identity-token","user":{"email":"user@icloud.com","localizedFullName":"John Doe"}}'
```

### Test 4: Google Sign-In

```bash
curl -X POST http://localhost:5000/api/auth/google-signin \
  -H "Content-Type: application/json" \
  -d '{"idToken":"google-id-token","user":{"id":"goog123","email":"user@gmail.com","name":"John","photo":"url"}}'
```

---

## Current Architecture

```
┌─────────────────────┐
│   React Native      │
│   (Expo)            │
│   ┌───────────────┐ │
│   │ Email Login   │ │
│   │ Google Sign   │ │
│   │ Apple Sign    │ │
│   └───────────────┘ │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   Backend (Node)    │
│   ┌───────────────┐ │
│   │ /auth/login   │ │ ← Email/Password
│   │ /auth/google  │ │ ← Google
│   │ /auth/apple   │ │ ← Apple
│   │ /auth/firebase│ │ ← Firebase (when enabled)
│   └───────────────┘ │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  AsyncStorage       │
│  - Token            │
│  - UserId           │
└─────────────────────┘
```

---

## Security Checklist

- [ ] Firebase credentials (`serviceAccountKey.json`) NOT committed to git
- [ ] Add to `.gitignore`: `serviceAccountKey.json`
- [ ] Use environment variables for secrets: `FIREBASE_CONFIG=...`
- [ ] Tokens have expiry time (Firebase: auto, custom: add TTL)
- [ ] Validate tokens on every request (middleware)
- [ ] HTTPS only in production (no HTTP)
- [ ] Password min length enforced (8 chars recommended)
- [ ] Rate limiting on login endpoint
- [ ] Never log tokens or passwords

---

## Troubleshooting

### Issue: "Firebase not initialized"
**Solution:** Add Firebase config file and initialize before using

### Issue: "Invalid token" error
**Solution:** Token expired - request new token from frontend

### Issue: "User not found"
**Solution:** Create user during registration/social auth

### Issue: "CORS errors"
**Solution:** Backend has CORS enabled, but check ngrok tunnel headers

---

## Next Steps

1. **Get Firebase credentials** from Google Console
2. **Add `serviceAccountKey.json`** to backend
3. **Install firebase-admin**: `npm install firebase-admin`
4. **Uncomment Firebase code** in `src/index.js`
5. **Test with Postman/curl** using Firebase token
6. **Update frontend Firebase config**
7. **Deploy to Railway.app** with environment variables

---

## Files to Check/Update

- ✅ `src/index.js` - Backend auth endpoints (READY)
- ✅ `lib/firebaseHelpers.ts` - Frontend auth functions (READY)
- ✅ `app/auth/email-login.tsx` - Login UI (READY)
- ⏳ `serviceAccountKey.json` - Firebase credentials (NEED TO ADD)
- ⏳ Firebase config in frontend (OPTIONAL - can use backend verification only)

---

## Timeline

- **Email/Password:** Working now ✅
- **Firebase Token Verification:** 10 min setup ⏳
- **Apple/Google Sign-In:** Native iOS/Android support ✅
- **Production Deploy:** 15 min (Railway.app) ⏳

**Total time to production:** ~30 minutes
