# 🔧 APK Crash Fix Guide

## ❌ Problem: App crashes after splash screen

### Root Causes:
1. **Reanimated not initialized** - Native module missing (MAIN CAUSE)
2. **Firebase initialization error** - AsyncStorage persistence issue
3. **ProGuard minification** - Release build strips required code
4. **Missing native dependencies** - Not bundled in APK
5. **Auth state listener error** - Crashes before UI loads

---

## ✅ Fixes Applied:

### 1. **Reanimated Native Module Initialization (CRITICAL)**
**File:** `android/app/src/main/java/com/tauhee56/travesocial/MainActivity.kt`

```kotlin
// Import Reanimated and GestureHandler
import com.facebook.react.bridge.ReactContext
import com.swmansion.gesturehandler.react.RNGestureHandlerEnabledRootView
```

**Why:** Without these imports, Reanimated native module doesn't initialize, causing immediate crash.

**Config Plugin:** `plugins/withReanimatedFix.js` - Automatically adds imports during prebuild

---

### 2. **Firebase Initialization with Error Handling**
**File:** `config/firebase.js`

```javascript
try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  
  try {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage)
    });
  } catch (authError) {
    // If auth already initialized, get existing instance
    auth = getAuth(app);
  }
  
  db = getFirestore(app);
  storage = getStorage(app);
  
  console.log('✅ Firebase initialized successfully');
} catch (error) {
  console.error('❌ Firebase initialization error:', error);
  throw error;
}
```

**Why:** Prevents crash if Firebase already initialized or AsyncStorage fails.

---

### 2. **Auth State Listener with Error Handling**
**File:** `app/_layout.tsx`

```typescript
useEffect(() => {
  try {
    if (!auth) {
      throw new Error('Firebase Auth not initialized');
    }
    
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    }, (error) => {
      console.error('Auth state change error:', error);
      setInitError(error.message);
      setLoading(false);
    });
    
    return unsubscribe;
  } catch (error: any) {
    console.error('Auth initialization error:', error);
    setInitError(error.message);
    setLoading(false);
  }
}, []);
```

**Why:** Shows error message instead of crashing if auth fails.

---

### 3. **ProGuard Rules for Release Build**
**File:** `android/app/proguard-rules.pro`

```proguard
# Firebase
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }

# Agora RTC
-keep class io.agora.** { *; }

# React Native
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }

# Expo
-keep class expo.modules.** { *; }

# AsyncStorage
-keep class com.reactnativecommunity.asyncstorage.** { *; }
```

**Why:** Prevents ProGuard from removing required classes in release build.

---

### 4. **Suppress Non-Critical Warnings**
**File:** `app/_layout.tsx`

```typescript
LogBox.ignoreLogs([
  'Unable to activate keep awake',
  'Sending `onAnimatedValueUpdate` with no listeners registered',
  'ViewPropTypes will be removed',
]);
```

**Why:** Prevents warning spam that can cause performance issues.

---

## 🚀 Rebuild APK:

```bash
# Commit changes
git add .
git commit -m "Fix: APK crash on launch - Firebase init & ProGuard rules"

# Build new APK
eas build --platform android --profile preview
```

---

## 🔍 How to Debug Crashes:

### Method 1: ADB Logcat (Best)
```bash
# Connect phone via USB
adb devices

# Clear logs
adb logcat -c

# Install and run APK
adb install app.apk

# Watch logs in real-time
adb logcat | grep -i "ReactNative\|Firebase\|Agora\|FATAL"
```

**Look for:**
- `FATAL EXCEPTION` - Shows crash reason
- `Firebase` errors - Auth/Firestore issues
- `Agora` errors - Streaming issues
- `ReactNative` errors - JS bundle issues

---

### Method 2: Sentry Crash Reporting (Recommended)
```bash
# Install Sentry
npm install @sentry/react-native

# Initialize in app/_layout.tsx
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: 'YOUR_SENTRY_DSN',
  enableAutoSessionTracking: true,
  tracesSampleRate: 1.0,
});
```

---

### Method 3: React Native Debugger
```bash
# Install React Native Debugger
# Download from: https://github.com/jhen0409/react-native-debugger

# Enable remote debugging in app
# Shake device → "Debug" → "Enable Remote JS Debugging"
```

---

## 📱 Test Checklist After Rebuild:

1. **Install APK:** `adb install -r app.apk`
2. **Launch app:** Should show splash → loading → welcome/home
3. **Test Firebase Auth:** Login/signup should work
4. **Test Agora:** Go live should work
5. **Test Maps:** Location features should work
6. **Check logs:** `adb logcat` should show no errors

---

## 🐛 Common Crash Causes & Solutions:

| Crash Reason | Solution |
|--------------|----------|
| `Firebase not initialized` | Check `config/firebase.js` exports |
| `AsyncStorage not found` | Add to ProGuard rules |
| `Agora SDK crash` | Add Agora to ProGuard rules |
| `Hermes bytecode error` | Disable Hermes: `hermesEnabled=false` |
| `Native module not found` | Run `npx expo prebuild --clean` |
| `JS bundle not loaded` | Check Metro bundler config |

---

## ✅ Expected Behavior:

1. **Splash screen** (2-3 seconds)
2. **Loading indicator** (Firebase initializing)
3. **Welcome screen** (if not logged in)
4. **Home screen** (if logged in)

---

**If still crashing, send me `adb logcat` output!** 🔍

