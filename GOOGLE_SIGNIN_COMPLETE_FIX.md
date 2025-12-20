# Google Sign-In Complete Fix Guide

## 🔴 Issue Detected
Google Sign-In failing on Android because:
1. ❌ OAuth Consent Screen NOT configured in Firebase
2. ❌ Web Client ID credentials missing/incorrect
3. ❌ SHA-1 certificate not added to Firebase

---

## ✅ Complete Fix (Follow in Order)

### Step 1: Configure OAuth Consent Screen
**IMPORTANT: This MUST be done first!**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project: **travel-app-3da72**
3. Left menu → **APIs & Services** → **OAuth consent screen**
4. Select **External** user type → **Create**
5. Fill in:
   - **App name:** Trave Social
   - **User support email:** your-email@gmail.com
   - **Developer contact:** your-email@gmail.com
6. Click **Save and Continue**
7. **Scopes** → **Save and Continue** (keep defaults)
8. **Test users** → **Add users** → Add your test email → **Save and Continue**
9. Review and click **Back to Dashboard**

✅ Now OAuth Consent Screen is configured!

---

### Step 2: Get SHA-1 Certificate

1. Open terminal in project:
   ```bash
   cd c:\Projects\trave-social\android
   .\gradlew signingReport
   ```

2. Look for: `SHA-1: AB:CD:EF:12:...`

3. Copy the SHA-1 fingerprint

---

### Step 3: Add SHA-1 to Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: **travel-app-3da72**
3. **Project Settings** ⚙️ (top right)
4. Go to **Your apps** tab
5. Find Android app: `com.tauhee56.travesocial`
6. Under **SHA certificate fingerprints**, click **Add fingerprint**
7. Paste your SHA-1 → **Save**

✅ SHA-1 added!

---

### Step 4: Verify Web Client ID

Check if Web Client ID matches in Firebase:

1. Firebase Console → **Project Settings**
2. **Your apps** → Look for **Web** app (if exists, click it)
3. If no Web app exists, click **Add app** → **Web**
4. Copy the **Client ID** from setup

Expected: `709095117662-2l84b3ua08t9icu8tpqtpchrmtdciep0.apps.googleusercontent.com`

✅ This is already configured in: [services/socialAuthService.ts](services/socialAuthService.ts#L50)

---

### Step 5: Download Updated google-services.json

1. Firebase Console → **Project Settings**
2. Scroll to **Android app** → **Download google-services.json**
3. Replace: `android/app/google-services.json`

✅ Updated!

---

### Step 6: Rebuild APK

```bash
cd c:\Projects\trave-social

# Clean and rebuild
npx expo prebuild --clean

# Build
npm run android

# OR use EAS (recommended)
npx eas build --platform android --profile development
```

---

## 🧪 Test Google Sign-In

1. Install APK on Android phone/emulator
2. Tap **Sign in with Google**
3. Should see Google Account selector (NOT error)
4. Select account → Should login successfully

✅ Done!

---

## 🔍 Troubleshooting

| Error | Solution |
|-------|----------|
| **"Developer Error"** or Code **10** | Add SHA-1 to Firebase + wait 5 mins |
| **"Invalid OAuth Client"** | OAuth Consent Screen not configured |
| **"Google Play Services not found"** | Use emulator with Google Play Services or real device |
| **Still stuck on Google button** | Clear app cache: Settings → Apps → Trave Social → Clear Cache |

---

## ✅ Checklist

- [ ] OAuth Consent Screen configured
- [ ] SHA-1 certificate added to Firebase
- [ ] google-services.json downloaded & replaced
- [ ] APK rebuilt
- [ ] Tested on device/emulator
- [ ] Google Sign-In working ✅

---

## 📍 Key Files Modified/Checked

- ✅ [services/socialAuthService.ts](services/socialAuthService.ts) - Google Sign-In implementation
- ✅ [android/app/google-services.json](android/app/google-services.json) - Firebase config
- ✅ [app.json](app.json) - Package name verified
- ✅ [android/app/build.gradle](android/app/build.gradle) - SHA-1 config

All code is already correct! You just need to complete the Firebase/Google Cloud setup steps above.
