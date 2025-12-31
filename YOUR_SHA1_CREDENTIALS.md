# 🔧 Google Sign-In Fix - Your Credentials

## Your Debug SHA-1 (for development):
```
29:06:B6:A5:28:CB:AD:0F:44:40:8E:8E:E1:E1:8D:93:47:09:60:B2
```

## Action Plan (5 minutes):

### Step 1: Add Debug SHA-1 to Firebase
1. Go to **Firebase Console** → Your Project (travel-app-3da72)
2. Click **Project Settings** (⚙️ gear icon, top-right)
3. Go to **Android apps** section
4. Click on **com.tauhee56.travesocial**
5. Scroll to **SHA certificate fingerprints**
6. Click **Add fingerprint**
7. Paste this:
   ```
   29:06:B6:A5:28:CB:AD:0F:44:40:8E:8E:E1:E1:8D:93:47:09:60:B2
   ```
8. Click **Save**

### Step 2: Re-download google-services.json
1. In Firebase Console, same Android app page
2. Click **Download google-services.json** button (top-right)
3. Replace the one in `c:\Projects\trave-social\google-services.json`

### Step 3: Clear Cache & Test
```bash
cd c:\Projects\trave-social
npx expo start --clear
# Press 'a' for Android or scan QR for Expo Go
```

4. Tap **Google Sign-In** button
5. Should work now! ✅

## If Still Getting DEVELOPER_ERROR:

Check that you're using the SAME SHA-1. Run this to verify:

```bash
keytool -list -v -keystore "$env:USERPROFILE\.android\debug.keystore" -alias androiddebugkey -storepass android -keypass android
```

Compare the SHA1 value with what you added to Firebase.

## For Release Build Later:
When you build for production with EAS:
```bash
eas credentials
```

Get that SHA-1 and add it to Firebase too (don't do it now, only when releasing).

---

**Why this happens:**
- Expo uses Android Debug Keystore during development
- Firebase needs the SHA-1 of the keystore signing the app
- Each keystore = different SHA-1
- If they don't match → DEVELOPER_ERROR ❌
- If they match → Works! ✅
