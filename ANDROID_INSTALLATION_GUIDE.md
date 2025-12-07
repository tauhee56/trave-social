# Android Installation Guide

Follow these steps to build, run, and submit your app to the Play Store:

## Prerequisites
- Android Studio installed
- Android device or emulator
- Node.js, npm/yarn
- Expo CLI (`npm install -g expo-cli`)

## 1. Install Dependencies
```bash
npm install
```

## 2. Configure App
- Update `app.json` and `android/app/build.gradle` with your app name, package name, icons, and permissions.
- Add your Firebase/Agora config files if needed.

## 3. Build for Android Emulator
```bash
npx expo run:android
```

## 4. Build for Play Store
```bash
npx expo build:android
```
Or (for EAS Build):
```bash
eas build -p android --profile production
```

## 5. Test on Device
- Use internal testing in Google Play Console.
- Install APK directly: `adb install <path-to-apk>`

## 6. Submit to Play Store
- Go to Google Play Console
- Create a new app record
- Upload your build
- Fill in metadata, screenshots, and submit for review

## Common Commands
- Clean build: `npx expo start -c`
- Open Android project: `npx expo prebuild && cd android && ./gradlew assembleRelease`

## Troubleshooting
- Check device logs: `npx expo start --android`
- Update dependencies: `npm update`
- Reinstall node modules: `rm -rf node_modules && npm install`

---
For more details, see the official Expo and Android docs.
