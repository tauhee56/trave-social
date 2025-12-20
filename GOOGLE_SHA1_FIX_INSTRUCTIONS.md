# Google Sign-In SHA-1 Certificate Fix

## Issue
Google Sign-In not working in APK - certificate fingerprint not configured in Firebase

## Solution Steps

### 1. Get Your SHA-1 Fingerprint

**Method A - Using your keystore:**
```bash
cd android
keytool -list -v -keystore debug.keystore -alias androiddebugkey -storepass android -keypass android
```

**Method B - After building APK:**
```bash
cd android
.\gradlew signingReport
```

Look for the SHA-1 under **Variant: debug**
Example: `SHA1: AB:CD:EF:12:34:56:78:90:AB:CD:EF:12:34:56:78:90:AB:CD:EF:12`

### 2. Add SHA-1 to Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **travel-app-3da72**
3. Click ⚙️ **Project Settings**
4. Scroll to **Your apps** section
5. Find your Android app: `com.tauhee56.travesocial`
6. Click **Add fingerprint**
7. Paste your SHA-1 fingerprint
8. Click **Save**

### 3. Download Updated google-services.json

1. Still in Firebase Console
2. Click **Download google-services.json**
3. Replace the file at: `android/app/google-services.json`

### 4. Rebuild APK

```bash
npm run android
# or
eas build --platform android --profile development
```

### 5. Test Google Sign-In

Open the app and try Google Sign-In - it should now work!

---

## Common SHA-1 Fingerprints to Add

Add **ALL** of these to Firebase for different build types:

1. **Debug keystore** (for development builds)
2. **Release keystore** (for production APK)  
3. **Play Store keystore** (if uploading to Google Play)

## Troubleshooting

❌ **Still not working?**
- Make sure you added SHA-1 for the **correct keystore**
- Wait 5-10 minutes after adding SHA-1 for Firebase to propagate
- Clear app data and try again
- Check that package name matches: `com.tauhee56.travesocial`

✅ **Working?**
The Google Sign-In button should now successfully authenticate users!
