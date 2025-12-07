# Authentication Setup Guide

Complete guide for setting up all authentication methods in your Travel Social App.

## 🔥 Firebase Console Setup

### 1. Enable Authentication Providers

Go to Firebase Console → Authentication → Sign-in method

#### ✅ Already Enabled
- ✅ Email/Password
- ✅ Phone

#### 🔧 Need to Enable

##### **Google Sign-In**
1. Click "Google" in Sign-in providers
2. Enable the toggle
3. Add your app's public-facing name: "Travel Social"
4. Add support email (your email)
5. Save

**For Mobile (Android):**
- Get SHA-1 fingerprint:
  ```bash
  cd android
  ./gradlew signingReport
  ```
- Add SHA-1 to Firebase Console → Project Settings → Android App → Add Fingerprint

**For Mobile (iOS):**
- Download updated `GoogleService-Info.plist`
- Replace in your iOS project

##### **Apple Sign-In**
1. Click "Apple" in Sign-in providers
2. Enable the toggle
3. Save

**For iOS:**
- Add Sign in with Apple capability in Xcode
- Enable in your Apple Developer account

**For Android:**
- Apple Sign-In only works on iOS/Web, not Android

##### **Anonymous (Optional)**
- Enable if you want guest access

---

## 📱 Google Sign-In Configuration

### Get Web Client ID

1. Go to Firebase Console → Project Settings → General
2. Scroll to "Your apps"
3. Click on Web app
4. Copy "Web client ID" (looks like: `123456789-abcdefgh.apps.googleusercontent.com`)

### Update Code

Open `services/socialAuthService.ts` and replace line 37:

```typescript
webClientId: '709095117662-YOUR_WEB_CLIENT_ID.apps.googleusercontent.com',
```

With your actual Web Client ID:

```typescript
webClientId: 'YOUR_ACTUAL_WEB_CLIENT_ID.apps.googleusercontent.com',
```

---

## 🎵 TikTok OAuth Setup (Optional)

TikTok requires developer app registration:

1. Go to [TikTok for Developers](https://developers.tiktok.com/)
2. Create a new app
3. Get Client Key and Client Secret
4. Add redirect URI: `trave-social://auth/callback`

**Note:** TikTok Sign-In is currently a placeholder. Full implementation requires:
- TikTok Developer App approval
- OAuth 2.0 flow implementation
- Custom backend to handle token exchange

---

## 👻 Snapchat Login Kit Setup (Optional)

Snapchat requires Snap Kit registration:

1. Go to [Snap Kit Developer Portal](https://kit.snapchat.com/)
2. Create a new app
3. Register your app bundle ID / package name
4. Get OAuth Client ID and Client Secret
5. Add redirect URI: `trave-social://auth/callback`

**Note:** Snapchat Sign-In is currently a placeholder. Full implementation requires:
- Snap Kit approval
- Login Kit SDK integration
- OAuth flow setup

---

## 👤 Username Authentication

### How It Works
- User creates username (minimum 3 characters)
- System generates internal email: `username@trave-social.internal`
- Random secure password is generated and stored in Firebase Auth
- User document stores username for easy lookup

### Limitations
- Username login requires email/phone backup for password reset
- Users should also set up Email or Phone authentication

### Future Enhancement
Consider implementing:
- Password field for username auth
- Or use Firebase Custom Auth Tokens
- Or link username with Email/Phone

---

## 🔐 Security Best Practices

### Firestore Security Rules

Update your Firestore rules to protect user data:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      // Anyone can read public user info
      allow read: if true;
      
      // Only the user can update their own data
      allow write: if request.auth != null && request.auth.uid == userId;
      
      // Username uniqueness check
      allow get: if request.auth != null;
    }
    
    // Posts collection (with privacy)
    match /posts/{postId} {
      allow read: if true; // Frontend filters by privacy
      allow write: if request.auth != null;
    }
  }
}
```

### App Security

1. **Never commit secrets** to Git
2. **Use environment variables** for sensitive data
3. **Enable App Check** in Firebase Console
4. **Set up rate limiting** for auth endpoints

---

## 📲 Testing Authentication

### Test on Different Platforms

**iOS:**
```bash
npx expo run:ios
```

**Android:**
```bash
npx expo run:android
```

**Web:**
```bash
npx expo start --web
```

### Test Cases

- ✅ Google Sign-In (Web, iOS, Android)
- ✅ Apple Sign-In (iOS, Web only)
- ✅ Email/Password (All platforms)
- ✅ Phone OTP (All platforms)
- ✅ Username Signup (All platforms)
- ⏳ TikTok (Coming soon)
- ⏳ Snapchat (Coming soon)

---

## 🚀 Deployment Checklist

Before production:

- [ ] Update Google Sign-In Web Client ID
- [ ] Enable all auth providers in Firebase
- [ ] Add SHA-1 fingerprint for Android
- [ ] Test on real devices (iOS and Android)
- [ ] Set up Firebase App Check
- [ ] Configure proper redirect URIs
- [ ] Update Firestore security rules
- [ ] Test all auth flows end-to-end
- [ ] Set up error logging (Sentry/Firebase Crashlytics)

---

## 📞 Support

If you need help with auth setup:

1. Check Firebase Console errors
2. Review device/browser console logs
3. Verify package installations
4. Check redirect URI configurations
5. Test with Firebase Auth Emulator first

---

## 🎉 Current Status

✅ **Working Now:**
- Email/Password Authentication
- Phone OTP Authentication
- Google Sign-In (Web, needs Web Client ID for mobile)
- Apple Sign-In (iOS/Web)
- Username Signup (with availability check)

🔄 **In Progress:**
- Username Login (needs password or custom token implementation)

⏳ **Coming Soon:**
- TikTok OAuth
- Snapchat Login Kit

---

**Last Updated:** December 2, 2025
