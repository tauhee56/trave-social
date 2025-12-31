# Google Sign-In SHA-1 Permanent Fix

## The Problem
You keep getting `DEVELOPER_ERROR` because **Expo needs BOTH Debug AND Release SHA-1 fingerprints registered in Firebase**, not just one.

## Solution: Add Both SHA-1 Fingerprints to Firebase

### Step 1: Get Both SHA-1 Fingerprints

```bash
cd c:\Projects\trave-social\android
./gradlew signingReport
```

**Output will show something like:**
```
Task :app:signingReport

Variant: debug
Config: debug
Store: /path/to/.android/debug.keystore
Alias: androiddebugkey
MD5: xx:xx:xx:xx:xx:xx
SHA1: AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99
SHA-256: ...

Variant: release
Config: release
Store: /path/to/app-release-key.keystore
Alias: app
MD5: yy:yy:yy:yy:yy:yy
SHA1: 11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00
SHA-256: ...
```

**Copy BOTH SHA-1 values** (the debug one AND the release one)

### Step 2: Add Both to Firebase Console

1. Go to **Firebase Console** → Your Project
2. Click **Project Settings** (gear icon)
3. Go to **Android apps** section
4. Click your app (com.tauhee56.travesocial)
5. Scroll down to **SHA certificate fingerprints**
6. Click **Add fingerprint**
7. **Paste the DEBUG SHA-1** from Step 1
8. Click **Save**
9. **Repeat Steps 6-8 with the RELEASE SHA-1**

**Result: You should now have TWO SHA-1 fingerprints listed**

### Step 3: Verify in google-services.json

Your `google-services.json` should have been regenerated. Download it again:

1. In Firebase Console Android app settings
2. Click **Download google-services.json**
3. Replace your current `google-services.json` in the project root

### Step 4: Clean and Rebuild

```bash
cd c:\Projects\trave-social
# Clear Expo cache
npx expo start --clear

# On Android device:
# Press 'a' to open in Android emulator
# Or scan QR code to open in Expo Go
```

### Step 5: Test Google Sign-In

- Tap the Google button on login screen
- If it works: ✅ **Done!**
- If still getting DEVELOPER_ERROR: Go to Step 6

### Step 6: If Still Getting DEVELOPER_ERROR

This usually means the SHA-1 you added doesn't match what the app is actually using:

1. **Add print debug to see which SHA-1 the app is using:**
   
   In `services/socialAuthService.ts`, change:
   
   ```typescript
   GoogleSignin.configure({
     webClientId: '709095117662-2l84b3ua08t9icu8tpqtpchrmtdciep0.apps.googleusercontent.com',
     iosClientId: '709095117662-k35juagf7ihkae81tfm9si43jkg7g177.apps.googleusercontent.com',
     offlineAccess: true,
     forceCodeForRefreshToken: true,
   });
   console.log('🔍 DEBUG: GoogleSignin configured');
   ```

2. **If using EAS Build for release:**
   
   You need to get the SHA-1 from EAS certificate:
   
   ```bash
   # In your Expo project:
   eas credentials
   # Select iOS or Android
   # View the certificate details
   ```

## Prevention: Use Expo's Google Sign-In Plugin

For the CLEANEST solution, consider using Expo's built-in auth instead:

```bash
npx expo install expo-google-sign-in
```

This handles SHA-1 management automatically. But for now, adding both SHA-1s above should fix your issue.

## Checklist

- [ ] Run `gradlew signingReport` in android folder
- [ ] Copied DEBUG SHA-1
- [ ] Copied RELEASE SHA-1
- [ ] Added both SHA-1s to Firebase Console
- [ ] Downloaded and replaced google-services.json
- [ ] Cleared Expo cache (`npx expo start --clear`)
- [ ] Tested Google Sign-In button
- [ ] ✅ Google Sign-In works!
