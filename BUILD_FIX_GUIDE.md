# 🔧 Build Error Fix Guide

## ❌ Error: `appAuthRedirectScheme` placeholder missing

### Root Cause:
The `react-native-app-auth` package requires `appAuthRedirectScheme` placeholder in AndroidManifest.xml, but it's not being injected during EAS build.

### ✅ Solution Applied:

**1. ✅ FIXED: Added to `android/app/build.gradle`:**
```gradle
android {
    defaultConfig {
        // Manifest placeholders for react-native-app-auth
        manifestPlaceholders = [
            appAuthRedirectScheme: 'trave-social'
        ]
    }
}
```

**2. ✅ Updated `eas.json`:**
```json
{
  "build": {
    "preview": {
      "env": {
        "appAuthRedirectScheme": "trave-social"
      }
    },
    "production": {
      "env": {
        "appAuthRedirectScheme": "trave-social"
      }
    }
  }
}
```

**3. ✅ Already configured in `app.json`:**
```json
{
  "expo": {
    "plugins": [
      [
        "expo-build-properties",
        {
          "android": {
            "manifestPlaceholders": {
              "appAuthRedirectScheme": "trave-social"
            }
          }
        }
      ]
    ]
  }
}
```

**4. ✅ Added Agora namespace fix to `android/gradle.properties`:**
```properties
# Suppress Agora namespace warnings
android.suppressUnsupportedCompileSdk=34
android.disableAutomaticComponentCreation=true
```

---

## ⚠️ Warning: Agora namespace conflict

### Issue:
```
Namespace 'io.agora.rtc' is used in multiple modules
```

### Why it happens:
Agora SDK 4.5.2 has multiple sub-modules with same namespace.

### ✅ Solution:

**Option 1: Ignore (Recommended)**
- This is just a warning, not an error
- Build will still succeed
- Agora SDK works fine with this warning

**Option 2: Add namespace to gradle (if build fails):**

Create/edit `android/app/build.gradle`:
```gradle
android {
    namespace "com.tauhee56.travesocial"
    
    defaultConfig {
        // ... existing config
    }
}
```

---

## 🚀 Build Commands

### IMPORTANT: Config Plugins Created
Two custom plugins ensure the fix persists after `expo prebuild`:
- ✅ `plugins/withAppAuthRedirectScheme.js` - Adds manifestPlaceholders to build.gradle
- ✅ `plugins/withAndroidManifestFix.js` - Replaces ${appAuthRedirectScheme} in AndroidManifest.xml

### Clean Build:
```bash
# Clear cache and prebuild (plugins will run automatically)
npx expo prebuild --clean

# Build with EAS (plugins run automatically during prebuild)
eas build --platform android --profile preview
```

### Local Build (if needed):
```bash
# Prebuild native folders
npx expo prebuild

# Build APK
cd android
./gradlew clean
./gradlew assembleRelease
cd ..
```

---

## 📋 Checklist Before Building:

- ✅ `appAuthRedirectScheme` in `eas.json` (all profiles)
- ✅ `manifestPlaceholders` in `app.json`
- ✅ Google Maps API key configured
- ✅ Firebase config in `config/firebase.js`
- ✅ Agora App ID in `config/agora.ts`
- ✅ All dependencies installed (`npm install`)
- ✅ No TypeScript errors (`npx tsc --noEmit`)

---

## 🎯 Build Now:

```bash
# Preview build (APK for testing)
eas build --platform android --profile preview

# Production build (AAB for Play Store)
eas build --platform android --profile production
```

---

## 🐛 If Build Still Fails:

### 1. Check EAS Build Logs:
- Look for "FAILURE: Build failed" section
- Check for missing placeholders
- Check for dependency conflicts

### 2. Clear Everything:
```bash
# Clear node modules
rm -rf node_modules
npm install

# Clear Expo cache
npx expo start --clear

# Clear EAS cache
eas build --platform android --profile preview --clear-cache
```

### 3. Check Android Manifest:
After `npx expo prebuild`, check:
```
android/app/src/main/AndroidManifest.xml
```

Should contain:
```xml
<data android:scheme="${appAuthRedirectScheme}" />
```

---

## ✅ Expected Build Output:

```
✔ Build successful
✔ APK: https://expo.dev/artifacts/...
```

Download APK and install on device for testing.

---

## 📱 Testing After Build:

1. **Install APK** on Android device
2. **Test Login** - Email/password auth
3. **Test Google Sign In** - OAuth redirect
4. **Test Live Streaming** - Agora functionality
5. **Test Maps** - Google Maps integration
6. **Test Location** - GPS and permissions

---

**Build should succeed now! 🎉**

