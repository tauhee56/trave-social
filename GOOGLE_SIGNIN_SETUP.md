# Google Sign-In Setup Guide

## Prerequisites
- Firebase Project created
- Google Sign-In enabled in Firebase Console

## Step 1: Get Web Client ID from Firebase

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: **trave-social**
3. Go to **Authentication** → **Sign-in method**
4. Click on **Google** provider
5. You'll see **Web SDK configuration** section
6. Copy the **Web client ID** (format: `xxxx-xxxxx.apps.googleusercontent.com`)

## Step 2: Update socialAuthService.ts

Replace the placeholder in `services/socialAuthService.ts`:

```typescript
GoogleSignin.configure({
  webClientId: 'YOUR_WEB_CLIENT_ID_HERE', // Paste your Web client ID here
  offlineAccess: true,
});
```

## Step 3: Configure Android (if needed)

### For Development:
1. Get SHA-1 fingerprint:
```bash
cd android
gradlew signingReport
```

2. Copy the SHA-1 from `debug` variant

3. Add to Firebase:
   - Firebase Console → Project Settings → Your Android App
   - Add the SHA-1 fingerprint
   - Download new `google-services.json`
   - Replace `android/app/google-services.json`

### For Production:
- Use your release keystore SHA-1

## Step 4: Test on Device

```bash
# Clear cache and rebuild
npx expo start -c

# Test on Android
npx expo run:android

# Test on iOS
npx expo run:ios
```

## Common Issues

### "DEVELOPER_ERROR" or "API not enabled"
- Make sure you added the correct SHA-1 to Firebase
- Enable Google Sign-In in Firebase Console
- Download latest `google-services.json`

### "Play Services not available"
- Update Google Play Services on device
- Test on real device (emulator needs Play Services)

### iOS not working
- No additional setup needed for iOS!
- Just make sure Google is enabled in Firebase

## Current Status

✅ Package installed: `@react-native-google-signin/google-signin`
✅ Code implemented with proper error handling
🔄 **Need to add Web Client ID** (see Step 1)

## What's Working Now

- Email/Password Sign-In ✅
- Phone OTP Sign-In ✅
- Username with Profile Picture ✅
- Apple Sign-In (iOS only) ✅
- **Google Sign-In** (needs Web Client ID) 🔄

## Next Steps

1. Get Web Client ID from Firebase Console
2. Paste it in `socialAuthService.ts`
3. Rebuild app: `npx expo start -c`
4. Test Google Sign-In button

---

**Note**: Google Sign-In ab mobile par bhi kaam karega once you add the Web Client ID!
