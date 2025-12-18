# Testing Guide - Fixed Issues

## Test Environment
- **Device:** Android (Emulator or Physical)
- **App Version:** Latest from npm run android
- **Firebase Project:** travel-app-3da72
- **Account:** tuhee (tuhee@gmail.com)

---

## Test Case 1: Email Authentication

### Test 1.1 - Email Login
1. Launch app
2. Tap "Login" button
3. Enter: `test@example.com` / Password: `password123`
4. Expected: Should navigate to Home screen
5. Verify: Profile tab shows logged-in user

### Test 1.2 - Email Signup
1. From welcome screen, tap "Sign up"
2. Enter: `newuser@example.com` / Password: `password123`
3. Expected: Shows email verification message
4. Check: Verification email received (check console for fake email)
5. Verify: Can proceed to app after verification

### Test 1.3 - Session Persistence
1. After login, close app completely (swipe up/force close)
2. Wait 5 seconds
3. Reopen app
4. Expected: Shows Home screen (NOT welcome screen)
5. Verify: User still logged in

---

## Test Case 2: Google Sign-In

### Test 2.1 - Google Login
1. From welcome/login screen, tap Google button
2. Follow Google authentication flow
3. Expected: Returns to app after auth
4. Verify: Home screen appears, user profile shows

**If error "DEVELOPER_ERROR":**
- Issue: SHA-1 certificate not in Firebase
- Fix: Run `cd android && .\gradlew signingReport`
- Copy SHA-1 from "debug" variant
- Go to Firebase Console → Project Settings → Android app
- Add SHA-1 to list

### Test 2.2 - Google Signup
1. From signup screen, tap Google button
2. Follow Google authentication
3. Expected: New user profile created
4. Verify: Can edit profile immediately

### Test 2.3 - Google Session
1. Login with Google
2. Close app completely
3. Reopen app
4. Expected: Still logged in as Google user

---

## Test Case 3: Social Logins (Apple/TikTok/Snapchat)

### Test 3.1 - Apple Sign-In (iOS Only)
1. From login screen, tap Apple button
2. Authenticate with Apple ID
3. Expected: Returns to app, shows home screen
4. Note: Only works on iOS 13+

### Test 3.2 - TikTok Sign-In
1. From login screen, tap TikTok button
2. If configured: Authenticate with TikTok
3. Expected: Returns to app
4. Note: Requires TikTok app integration (may not be set up)

### Test 3.3 - Snapchat Sign-In
1. From login screen, tap Snapchat button
2. If configured: Authenticate with Snapchat
3. Expected: Returns to app
4. Note: Requires Snapchat app integration (may not be set up)

---

## Test Case 4: Profile Picture Upload

### Test 4.1 - Avatar Upload
1. Go to Profile tab
2. Tap on avatar circle
3. Select image from library
4. Allow editing (crop if prompted)
5. Expected: ✅ No "base64" error
6. Verify: Avatar updates in profile
7. Verify: Avatar appears in posts/map markers

### Test 4.2 - Avatar Persistence
1. After uploading avatar, close app
2. Reopen app
3. Expected: Avatar still shows (not default picture)
4. Verify: Avatar in other tabs (Posts, Map) also updated

### Test 4.3 - Error Handling
1. Simulate no internet connection
2. Try to upload avatar
3. Expected: Shows error alert with details
4. Reconnect internet and retry
5. Expected: Upload succeeds

---

## Test Case 5: Profile Editing

### Test 5.1 - Edit Profile Fields
1. Go to Profile tab
2. Tap Edit Profile button
3. Change:
   - Name: "Test User 123"
   - Bio: "I love traveling! 🌍"
   - Website: "https://example.com"
4. Tap Save
5. Expected: Success message appears
6. Verify: Changes show in profile

### Test 5.2 - Private Account Toggle
1. In Edit Profile, toggle "Private Account"
2. Tap Save
3. Expected: Success message
4. Go back to profile
5. Verify: Profile shows as private (lock icon)
6. Verify: Posts visibility changed

### Test 5.3 - Profile Persistence
1. Make profile edits (name, bio, website)
2. Tap Save
3. Close app completely
4. Reopen app
5. Expected: All edits still there
6. Go to Edit Profile again
7. Verify: Fields populated with saved values

### Test 5.4 - Validation
1. Try to save with empty name
2. Expected: Shows validation error
3. Try to save with valid name
4. Expected: Saves successfully

---

## Test Case 6: Logout & Session

### Test 6.1 - Logout
1. Go to Profile tab
2. Tap Settings/Menu
3. Tap "Logout"
4. Expected: Returns to Welcome screen
5. Verify: Cannot access home screen

### Test 6.2 - Login After Logout
1. After logout, tap "Login"
2. Enter credentials again
3. Expected: Successfully logs in
4. Verify: Same user profile appears

### Test 6.3 - Multiple Users
1. Login with User A
2. Create/edit profile
3. Logout
4. Login with User B
5. Expected: User B profile appears (different data)
6. Logout and login as User A
7. Expected: User A data still there

---

## Test Case 7: Error Scenarios

### Test 7.1 - Network Error
1. Turn off internet/Airplane mode
2. Try to login
3. Expected: Shows network error message
4. Turn internet back on
5. Try login again
6. Expected: Works successfully

### Test 7.2 - Invalid Credentials
1. Login with invalid email/password
2. Expected: Shows "Invalid credentials" error
3. Try again with valid credentials
4. Expected: Succeeds

### Test 7.3 - Social Auth Cancellation
1. Tap Google/Apple button
2. Cancel authentication (press back)
3. Expected: Returns to login screen, shows "Sign in cancelled"
4. Try again and complete auth
5. Expected: Works normally

---

## Debug Logging

### Enable Detailed Logs
1. Open `app/_layout.tsx`
2. Comment out production logging silencing:
   ```typescript
   // if (!__DEV__) {
   //   console.log = noop;
   // }
   ```
3. Run `npm run android` again
4. Check console for detailed Firebase logs

### View Firebase Auth Logs
```bash
# Check AsyncStorage for auth persistence
console.log(AsyncStorage.getItem('@firebase'))
```

### Check Profile Updates
```typescript
// In Firebase Console:
// 1. Go to Firestore Database
// 2. Click Collection: users
// 3. Find user document
// 4. Verify displayName, photoURL, bio fields
```

---

## Performance Checks

### Test P1 - Startup Time
1. Close app
2. Tap to open
3. Time from tap to home screen appearing
4. Expected: < 3 seconds
5. Note: First launch may be slower

### Test P2 - Avatar Load Time
1. Go to Profile tab
2. Verify avatar loads smoothly
3. Go to Posts tab
4. Verify avatars in posts load quickly
5. Go to Map tab
6. Verify marker avatars load smoothly

### Test P3 - Profile Edit Load Time
1. Open Edit Profile screen
2. Expected: Fields load within 1 second
3. Verify: No lag when typing

---

## Expected Results Summary

| Test | Status | Notes |
|------|--------|-------|
| Email Login | ✅ Should Work | Basic Firebase auth |
| Google Login | ✅ Should Work | Social auth implemented |
| Avatar Upload | ✅ Should Work | Error handling added |
| Profile Edit | ✅ Should Work | All fields save |
| Session Persist | ✅ Should Work | AsyncStorage enabled |
| Logout | ✅ Should Work | Clears session |

---

## Troubleshooting

### Issue: "SHA-1 certificate error" when signing in with Google
```
Error Code: 10 (or DEVELOPER_ERROR)
```
**Solution:**
1. Run: `cd android && .\gradlew signingReport`
2. Find "SHA1" in output
3. Copy the SHA-1 value
4. Go to Firebase Console
5. Click "Project Settings" gear icon
6. Go to "Your Apps" section
7. Find Android app "com.tauhee56.travesocial"
8. Click "Add fingerprint"
9. Paste SHA-1
10. Click Save
11. Retry Google login

### Issue: App still shows welcome screen after restart
```
This means AsyncStorage persistence not working
```
**Solution:**
1. Check `config/firebase.ts` has proper import
2. Verify `@react-native-async-storage/async-storage` installed
3. Check Firebase auth not throwing errors (check logs)
4. Try logging out and back in
5. Check Firestore has user document

### Issue: "Cannot read property base64 of undefined"
```
This should be fixed by latest commit
```
**Solution:**
1. Make sure on latest code (git pull)
2. Clear node_modules: `rm -r node_modules && npm install`
3. Clear Expo cache: `expo start -c`
4. Try uploading avatar again

### Issue: Profile fields not saving
```
Changes appear but disappear on app restart
```
**Solution:**
1. Check Firestore has user document with fields
2. Check `displayName` and `photoURL` fields exist
3. Check user has `EDIT` permissions in Firestore Rules
4. Try logging out and back in
5. Try manual refresh (pull down)

---

## Commit Information

**Commit:** 2589840
**Message:** Fix critical auth & profile issues
**Date:** 2025-12-18

Files modified:
- config/firebase.ts
- app/auth/email-login.tsx
- app/auth/email-signup.tsx
- app/(tabs)/profile.tsx
- app/edit-profile.tsx

---

**Testing Status:** Ready for QA ✅
**Estimated Test Time:** 20-30 minutes
**Last Updated:** 2025-12-18
