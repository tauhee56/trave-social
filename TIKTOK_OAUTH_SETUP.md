# TikTok OAuth Setup Instructions

## ⚠️ TikTok Sign-In Issue

**Problem:** Browser automatically dismisses (`result.type === 'dismiss'`)

**Root Cause:** TikTok OAuth requires:
1. App approval from TikTok Developer Portal (1-3 days)
2. Proper redirect URI configuration
3. Valid SSL certificate for production

---

## 🔧 Fix Steps

### 1. TikTok Developer Portal Configuration

1. Go to: **https://developers.tiktok.com/apps**
2. Select your app (or create new one)
3. Navigate to **Settings** → **OAuth**
4. Add **Redirect URI**:
   ```
   trave-social://oauth/redirect
   ```
5. **Save** and wait for approval

### 2. Submit App for Review

TikTok requires app review before OAuth works:
- Go to **App Review** section
- Submit app details
- Wait 1-3 business days for approval

### 3. Testing During Development

**Option A: Use Emulator/Simulator**
- May work without full approval
- Test OAuth flow

**Option B: Alternative Auth**
- Use Google/Apple auth instead
- Add TikTok after approval

---

## 📝 Current Configuration

**Redirect URI:** `trave-social://oauth/redirect`  
**Scheme:** `trave-social`  
**Client Key:** Configured ✓  
**Client Secret:** Configured ✓

---

## ✅ Code Changes Made

1. ✅ Changed `isTripleSlashed: false` for better compatibility
2. ✅ Removed `&prompt=consent` (not required)
3. ✅ Added Android `createTask: true` option
4. ✅ Better error handling for dismiss

---

## 🎯 Temporary Workaround

Until TikTok approval, users can:
1. ✅ Sign in with **Google**
2. ✅ Sign in with **Apple**
3. ✅ Sign in with **Snapchat**
4. ⏳ TikTok (after approval)

---

## 🚀 After Approval

Once approved, TikTok auth will work automatically:
- No code changes needed
- User can sign in normally
- Profile synced from TikTok

---

## 📞 TikTok Support

If approval takes long:
- **Developer Portal:** https://developers.tiktok.com
- **Documentation:** https://developers.tiktok.com/doc/login-kit-web
- **Support:** Submit ticket in developer portal
