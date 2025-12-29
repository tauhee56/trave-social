# Firebase + MongoDB Authentication

## How it works

### Registration Flow
1. User enters email, password, username
2. **Firebase** authenticates and creates user account
3. **Backend** (MongoDB) syncs user data:
   - Stores firebaseUid + user profile
   - Generates JWT token for API calls
4. **AsyncStorage** stores JWT token for offline access
5. App navigates to home

### Login Flow
1. User enters email, password
2. **Firebase** authenticates user
3. **Backend** (MongoDB) syncs user data:
   - Updates user info (name, avatar)
   - Generates new JWT token
4. **AsyncStorage** stores JWT token
5. App navigates to home

### Logout Flow
1. **Firebase** signs out user
2. **Backend** notified of logout (optional)
3. **AsyncStorage** clears token and user data
4. App navigates to welcome screen

## Backend Endpoints

### New Firebase Endpoints

```
POST /api/auth/register-firebase
Body: { firebaseUid, email, displayName, avatar }
Response: { success, token, user }

POST /api/auth/login-firebase
Body: { firebaseUid, email, displayName, avatar }
Response: { success, token, user }
```

### MongoDB Schema
```
User {
  firebaseUid: String (unique identifier from Firebase)
  email: String (unique)
  displayName: String
  avatar: String (URL)
  bio: String
  followers: Number
  following: Number
  createdAt: Date
  updatedAt: Date
}
```

## Frontend Implementation

File: `lib/firebaseHelpers.ts`
- `signInWithEmailPassword()` - Firebase auth + MongoDB sync
- `registerWithEmailPassword()` - Firebase auth + MongoDB sync
- `signOutUser()` - Clear Firebase + MongoDB + AsyncStorage

## Features
✅ Firebase handles complex authentication (email, phone, social)
✅ MongoDB stores user profile and relationships
✅ JWT tokens for backend API calls
✅ Offline support via AsyncStorage
✅ Automatic user sync on every login
✅ Fallback endpoints for testing (in-memory storage)

## Testing

1. Register: Navigate to sign-up, create account
   - Firebase: New user created
   - MongoDB: User document created with firebaseUid
   - Token: JWT stored in AsyncStorage

2. Login: Use same credentials
   - Firebase: User authenticated
   - MongoDB: User data updated
   - Token: New JWT generated

3. Logout: Tap logout button
   - Firebase: User signed out
   - MongoDB: Session logged (optional)
   - AsyncStorage: Token cleared

4. Persistence: Kill app and reopen
   - Check AsyncStorage for token
   - Navigate to home if token exists
   - Navigate to welcome if token cleared
