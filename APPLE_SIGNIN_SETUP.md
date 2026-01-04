# 🍎 Apple Sign-In Configuration Guide

## ✅ Current Status

### Frontend Implementation: **COMPLETE** ✅
- ✅ `expo-apple-authentication` installed
- ✅ Apple Sign-In service implemented in `services/socialAuthService.ts`
- ✅ iOS entitlements configured in `app.json`
- ✅ Plugin added to `app.json`
- ✅ Sign-In buttons added to all auth screens

### Backend: **READY** ✅
- ✅ Firebase Auth handles Apple Sign-In tokens
- ✅ Backend validates Firebase tokens via `admin.auth().verifyIdToken()`

---

## 📋 Configuration Checklist

### 1. ✅ App Configuration (app.json)

```json
{
  "ios": {
    "bundleIdentifier": "com.tauhee56.travesocial",
    "entitlements": {
      "com.apple.developer.applesignin": ["Default"]
    }
  },
  "plugins": [
    "expo-apple-authentication"
  ]
}
```

**Status:** ✅ **CONFIGURED**

---

### 2. 🔧 Firebase Console Setup

#### Enable Apple Sign-In Provider:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: **travel-app-3da72**
3. Navigate to: **Authentication** → **Sign-in method**
4. Click **Apple** provider
5. **Enable** the toggle
6. Click **Save**

**Required Info:**
- **Bundle ID:** `com.tauhee56.travesocial`
- **Team ID:** Get from [Apple Developer Account](https://developer.apple.com/account)
- **Service ID:** (Optional - for web)

---

### 3. 🍎 Apple Developer Account Setup

#### Enable Sign in with Apple Capability:

1. Go to [Apple Developer Portal](https://developer.apple.com/account)
2. Navigate to: **Certificates, Identifiers & Profiles**
3. Select **Identifiers**
4. Find your App ID: `com.tauhee56.travesocial`
5. Click **Edit**
6. Enable **Sign in with Apple** capability
7. Click **Save**

---

### 4. 📱 Xcode Configuration (For Native Builds)

If building with Xcode:

1. Open project in Xcode
2. Select target: **travesocial**
3. Go to **Signing & Capabilities**
4. Click **+ Capability**
5. Add **Sign in with Apple**
6. Ensure provisioning profile includes this capability

**Note:** EAS Build handles this automatically with `app.json` config.

---

## 🧪 Testing Apple Sign-In

### iOS Device/Simulator (iOS 13+):

```bash
# Run on iOS
npx expo run:ios
```

1. Open app
2. Go to Login/Signup screen
3. Tap **Continue with Apple** button
4. Apple Sign-In sheet appears
5. Sign in with Apple ID
6. Grant permissions (email, name)
7. User authenticated ✅

### Expected Flow:

```
User taps "Continue with Apple"
  ↓
Apple authentication sheet opens
  ↓
User signs in with Apple ID
  ↓
App receives identityToken
  ↓
Firebase creates/signs in user
  ↓
Backend validates Firebase token
  ↓
User logged in ✅
```

---

## 🔍 Verification Steps

### Check if Apple Sign-In is Available:

```typescript
import * as AppleAuthentication from 'expo-apple-authentication';

const isAvailable = await AppleAuthentication.isAvailableAsync();
console.log('Apple Sign-In available:', isAvailable);
```

**Requirements:**
- ✅ iOS 13 or later
- ✅ Physical device or simulator
- ✅ Apple ID signed in on device

---

## 🐛 Troubleshooting

### Issue: "Apple Sign-In not available"
**Solution:**
- Ensure iOS 13+ device/simulator
- Check Apple ID is signed in on device
- Verify entitlements in `app.json`

### Issue: "Invalid client"
**Solution:**
- Enable Apple provider in Firebase Console
- Verify Bundle ID matches: `com.tauhee56.travesocial`
- Check Apple Developer capability is enabled

### Issue: "No identity token returned"
**Solution:**
- User may have canceled sign-in
- Check network connection
- Verify Firebase project configuration

---

## 📝 Implementation Details

### Frontend Code:

<augment_code_snippet path="services/socialAuthService.ts" mode="EXCERPT">
````typescript
export async function signInWithApple() {
  if (Platform.OS === 'ios') {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
    
    const provider = new OAuthProvider('apple.com');
    const firebaseCredential = provider.credential({
      idToken: credential.identityToken,
    });
    
    const result = await signInWithCredential(auth, firebaseCredential);
    return { success: true, user: result.user };
  }
}
````
</augment_code_snippet>

---

## ✅ Final Checklist

- [x] `expo-apple-authentication` installed
- [x] iOS entitlements configured
- [x] Plugin added to `app.json`
- [ ] **Firebase Console: Enable Apple provider** ⚠️
- [ ] **Apple Developer: Enable Sign in with Apple capability** ⚠️
- [x] Sign-In buttons added to auth screens
- [x] Error handling implemented

---

## 🚀 Next Steps

1. **Enable Apple Sign-In in Firebase Console**
2. **Enable capability in Apple Developer Account**
3. **Test on iOS device (iOS 13+)**
4. **Verify user creation in Firebase Auth**

---

**Bundle ID:** `com.tauhee56.travesocial`  
**Firebase Project:** `travel-app-3da72`  
**Status:** Ready for testing after Firebase/Apple setup ✅

