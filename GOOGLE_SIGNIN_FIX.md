# 🔐 Google Sign-In SHA-1 Fix Guide

## ⚠️ CURRENT ISSUE
**Error:** "Android Setup Required - Google Sign-In needs SHA-1 certificate to be added in Firebase Console"

**Solution:** Add SHA-1 fingerprint to Firebase Console

---

## 🚀 Quick Fix (3 Steps)

### **Step 1: Get SHA-1 Fingerprint**

Run this command:
```bash
npm run get-sha1
```

**Output:**
```
✅ Found SHA-1 Fingerprints:

1. A1:B2:C3:D4:E5:F6:G7:H8:I9:J0:K1:L2:M3:N4:O5:P6:Q7:R8:S9:T0
```

**📋 Copy the SHA-1 fingerprint!**

---

### **Step 2: Add to Firebase Console**

1. Open: https://console.firebase.google.com/project/travel-app-3da72/settings/general
2. Scroll to **Your apps** → Find **Android app** (com.martin06000.travesocial)
3. Click **"Add fingerprint"**
4. Paste SHA-1 fingerprint
5. Click **"Save"**
6. Click **"Download google-services.json"**

---

### **Step 3: Update google-services.json**

1. Copy downloaded `google-services.json`
2. Replace: `android/app/google-services.json`
3. Commit and push:
   ```bash
   git add android/app/google-services.json
   git commit -m "Update google-services.json with SHA-1 for Google Sign-In"
   git push origin master
   ```

---

## ✅ Done!

After GitHub Actions builds the new APK:
- Install APK
- Click "Continue with Google"
- Should work without error! ✅

---

## 🔑 For EAS Build Users

Also add EAS Build SHA-1:

1. Go to: https://expo.dev/accounts/martin06000/projects/trave-social/credentials
2. Find **Android Keystore**
3. Copy **SHA-1 fingerprint**
4. Add to Firebase Console (same steps as above)

---

## 🆘 Troubleshooting

### **Script not working?**

Run manually:
```bash
cd android
gradlew signingReport
```

Look for:
```
Variant: debug
SHA1: A1:B2:C3:... ← COPY THIS
```

### **Still not working?**

1. Make sure `google-services.json` is updated
2. Rebuild app completely
3. Wait 5-10 minutes for Firebase changes to propagate

---

## 📱 Project Info

- **Firebase Project:** travel-app-3da72
- **Package Name:** com.martin06000.travesocial
- **Firebase Console:** https://console.firebase.google.com/project/travel-app-3da72

