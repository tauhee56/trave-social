# iOS Installation Guide

Follow these steps to build, run, and submit your app to the App Store:

## Prerequisites
- Mac with Xcode installed
- Apple Developer account
- Node.js, npm/yarn
- Expo CLI (`npm install -g expo-cli`)

## 1. Install Dependencies
```bash
npm install
```

## 2. Configure App
- Update `app.json` and `Info.plist` with your app name, bundle identifier, icons, and permissions.
- Add your Firebase/Agora config files if needed.

## 3. Build for iOS Simulator
```bash
npx expo run:ios
```

## 4. Build for App Store
```bash
npx expo build:ios
```
Or (for EAS Build):
```bash
eas build -p ios --profile production
```

## 5. Test on Device
- Use TestFlight for beta testing.
- Archive and upload via Xcode if needed.

## 6. Submit to App Store

# App Logo & Branding

**App Logo:**
![App Logo](https://firebasestorage.googleapis.com/v0/b/travel-app-3da72.firebasestorage.app/o/logo%2FWhatsApp_Image_2025-12-07_at_4.28.01_PM-removebg-preview.png?alt=media&token=75a3dc49-a927-45f8-8e0e-1f02f65bdeb1)

**Logo Download:**
[`assets/images/app-logo.png`](assets/images/app-logo.png) (placeholder for local reference)

**Color Scheme:**
- Primary: #667eea (Indigo)
- Accent: #f39c12 (Orange)
- Background: #E6F4FE (Light Blue)
- Dark: #1a1a1a

**App Store/Play Store Assets:**
- Logo: [Direct Link](https://firebasestorage.googleapis.com/v0/b/travel-app-3da72.firebasestorage.app/o/logo%2FWhatsApp_Image_2025-12-07_at_4.28.01_PM-removebg-preview.png?alt=media&token=75a3dc49-a927-45f8-8e0e-1f02f65bdeb1)
## Common Commands
- Clean build: `npx expo start -c`
## Troubleshooting
- Check device logs: `npx expo start --ios`
---
