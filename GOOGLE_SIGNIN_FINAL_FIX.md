# 🔧 Google Sign-In - Final Fix

## 📊 Current Status:

### SHA-1 Certificates Found:
1. **Project Debug Keystore**: `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25` ✅
2. **System Debug Keystore**: `29:06:B6:A5:28:CB:AD:0F:44:40:8E:8E:E1:E1:8D:93:47:09:60:B2` ✅

### Firebase Console Shows:
1. `29:06:b6:a5:28:cb:ad:0f:44:40:8e:8e:e1:e1:8d:93:47:09:60:b2` ✅ (Match!)
2. `5e:8f:16:06:2e:a3:cd:2c:4a:0d:54:78:76:ba:a6:f3:8c:ab:f6:25` ✅ (Match!)
3. `28:4a:05:94:54:86:3e:a3:79:be:f9:24:1d:6d:aa:e0:23:f9:ce:93` ❓ (Unknown)

---

## 🎯 Problem:

The issue is that **EAS Build** uses a **different certificate** than local debug builds!

When you run:
- `npm run android` → Uses local debug keystore ✅
- `eas build` → Uses EAS keystore ❌ (Not in Firebase!)

---

## ✅ Solution: Add EAS Build SHA-1 to Firebase

### Step 1: Get EAS Build Certificate

Run this command:
```bash
eas credentials
```

Select:
- Platform: **Android**
- Action: **View credentials**
- Look for: **SHA-1 Fingerprint**

**OR** use this simpler method:

```bash
# Get SHA-1 from EAS
eas build:configure
```

### Step 2: Add to Firebase Console

1. Go to: **Firebase Console** → **Project Settings**
2. Scroll to: **Your apps** → **Android app** (com.tauhee56.travesocial)
3. Scroll to: **SHA certificate fingerprints**
4. Click: **Add fingerprint**
5. Paste: EAS SHA-1 certificate
6. Click: **Save**

### Step 3: Download Updated google-services.json

1. Same page → Click **Download google-services.json**
2. Replace: `android/app/google-services.json`
3. Commit the change

### Step 4: Rebuild with EAS

```bash
eas build --platform android --profile preview
```

---

## 🚀 Quick Alternative (Recommended):

Since getting EAS certificate is complex, **use local build** for testing:

```bash
# Clean
cd c:\Projects\trave-social
npx expo prebuild --clean

# Run on device
npm run android

# OR build APK locally
cd android
./gradlew assembleDebug

# APK will be at: android/app/build/outputs/apk/debug/app-debug.apk
```

**This will use the local debug keystore which is already in Firebase!** ✅

---

## 📱 Test Google Sign-In:

### Using Local Build:
1. Build: `npm run android`
2. Open app on device
3. Click: "Sign In with Google"
4. ✅ **Should work!** (Uses local keystore)

### Using EAS Build:
1. Add EAS SHA-1 to Firebase (see above)
2. Build: `eas build --platform android --profile preview`
3. Install APK
4. ✅ **Should work!**

---

## 🎯 Recommended Approach:

### For Development/Testing:
```bash
# Use local build (SHA-1 already in Firebase)
npm run android
```

### For Production:
```bash
# Get EAS SHA-1 and add to Firebase
eas credentials

# Then build
eas build --platform android --profile production
```

---

## 💡 Why This Happens:

| Build Type | Keystore | SHA-1 in Firebase? |
|------------|----------|-------------------|
| Local Debug | `android/app/debug.keystore` | ✅ Yes |
| EAS Build | EAS managed keystore | ❌ No (need to add) |
| Production | Release keystore | ❓ Need to add |

**Solution**: Add all keystores to Firebase!

---

## 🔧 Alternative: Disable Google Sign-In Temporarily

If you want to deploy quickly without fixing Google Sign-In:

### Option 1: Hide Google Button
File: `app/auth/welcome.tsx` and `app/auth/signup-options.tsx`

Comment out Google Sign-In button:
```typescript
{/* Temporarily disabled - needs EAS certificate
<TouchableOpacity onPress={handleGoogleSignIn}>
  <Text>Sign In with Google</Text>
</TouchableOpacity>
*/}
```

### Option 2: Show "Coming Soon" Message
```typescript
<TouchableOpacity onPress={() => Alert.alert('Coming Soon', 'Google Sign-In will be available soon. Please use email sign-in.')}>
  <Text>Sign In with Google (Coming Soon)</Text>
</TouchableOpacity>
```

---

## 📋 Summary:

### Current Status:
- ✅ Email Sign-In: **Working**
- ✅ Local Google Sign-In: **Working** (with `npm run android`)
- ❌ EAS Google Sign-In: **Not Working** (needs EAS SHA-1)

### To Fix:
1. **Quick**: Use local build (`npm run android`)
2. **Proper**: Add EAS SHA-1 to Firebase
3. **Alternative**: Disable Google Sign-In temporarily

---

## 🚀 Recommended Next Steps:

### For Quick Testing:
```bash
# Build locally (Google Sign-In will work!)
npm run android
```

### For Production:
```bash
# 1. Get EAS certificate
eas credentials

# 2. Add to Firebase Console

# 3. Download updated google-services.json

# 4. Build
eas build --platform android --profile production
```

---

**Choose your approach and let me know!** 😊

