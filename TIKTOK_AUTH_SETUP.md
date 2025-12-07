# TikTok Authentication Setup Guide

## ✅ Completed
- ✅ TikTok Developer Account created
- ✅ Client Key: `awel823341vepyyl`
- ✅ Client Secret: `dITpPKfOg4kcQiSjvC5ueaezDnbAMDOP`
- ✅ OAuth implementation added to `services/socialAuthService.ts`

## 📋 TikTok Developer Console Setup

### Step 1: Add Redirect URIs
Go to your TikTok Developer Console and add these redirect URIs:

#### For Development (Expo Go)
```
exp://192.168.1.x:8081/--/oauth/redirect
```
*(Replace with your actual IP address from Expo)*

#### For Production
```
travesocial://oauth/redirect
```

### Step 2: Configure OAuth Scopes
In TikTok Developer Console, enable these scopes:
- ✅ `user.info.basic` - Get basic user info (name, avatar)

### Step 3: Add App Bundle Identifiers

#### Android
```
Package Name: com.tauhee56.travesocial
```

#### iOS
```
Bundle ID: com.tauhee56.travesocial
```

### Step 4: Whitelist Your App
Make sure your app is approved for production use in TikTok Developer Console.

---

## 🔧 Technical Implementation

### OAuth Flow
1. **Authorization Request** → `https://www.tiktok.com/v2/auth/authorize/`
2. **Token Exchange** → `https://open.tiktokapis.com/v2/oauth/token/`
3. **User Info** → `https://open.tiktokapis.com/v2/user/info/`

### Redirect URI Format
```
Scheme: travesocial
Path: oauth/redirect
Full URI: travesocial://oauth/redirect
```

### User Data Retrieved
- `open_id` - Unique TikTok user identifier
- `union_id` - Cross-app user identifier
- `display_name` - User's display name
- `avatar_url` - Profile picture URL

---

## 🧪 Testing

### Test in Development
```bash
# Start Expo
npm start

# Run on device
- Scan QR code with Expo Go
- Click "Sign in with TikTok"
- Authorize in TikTok app
- Redirected back to app
```

### Test in Production
```bash
# Build development APK
eas build --profile development --platform android

# Install APK
# Test TikTok login flow
```

---

## ⚠️ Important Notes

### Redirect URI Must Match
The redirect URI in your code **MUST EXACTLY MATCH** what's in TikTok Developer Console:
- ✅ `travesocial://oauth/redirect`
- ❌ `trave-social://oauth/redirect` (wrong scheme)
- ❌ `travesocial://auth/callback` (wrong path)

### TikTok App Required
Users must have TikTok app installed for seamless authentication. If not installed, web browser will be used.

### Firebase Integration
Currently using custom Firebase auth with TikTok ID:
- Email format: `tiktok_{open_id}@trave-social.app`
- Stored in Firestore with `tiktokId` and `authProvider: 'tiktok'`

---

## 🚀 Next Steps

1. **Add Redirect URIs** in TikTok Developer Console
2. **Test OAuth Flow** in Expo Go
3. **Submit for Review** if app is in development mode
4. **Build Production APK** when ready

---

## 📝 Code Files Modified

### `services/socialAuthService.ts`
- ✅ Complete TikTok OAuth implementation
- ✅ Token exchange
- ✅ User info retrieval
- ✅ Firebase integration
- ✅ Error handling

### `app.json`
- ✅ Scheme configured: `travesocial`
- ✅ Deep linking enabled

---

## 🔐 Security Notes

⚠️ **IMPORTANT**: Client Secret is hardcoded for development. For production:
1. Move credentials to environment variables
2. Use Firebase Cloud Functions for token exchange
3. Never expose Client Secret in client-side code

### Production Security (TODO)
```typescript
// Use Firebase Cloud Function
const response = await fetch('https://us-central1-travel-app-3da72.cloudfunctions.net/tiktokAuth', {
  method: 'POST',
  body: JSON.stringify({ code, redirectUri }),
});
```

---

## 📞 Support

If TikTok login fails:
1. Check redirect URI in TikTok Console matches exactly
2. Verify Client Key and Secret are correct
3. Ensure TikTok app is approved/published
4. Check console logs for detailed error messages

---

## ✨ Features

- ✅ TikTok OAuth 2.0 authentication
- ✅ User profile data sync
- ✅ Avatar import from TikTok
- ✅ Firebase integration
- ✅ Error handling with user-friendly alerts
- ✅ Deep linking support
- ✅ Expo Go compatible

---

**Status**: Ready for testing after Redirect URI configuration ✅
