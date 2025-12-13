# Authentication & User Flow Documentation

This document summarizes all the files, screens, and logic related to login, signup, authentication, and user session management in your project.

---

## 1. Authentication Core (Firebase)
- **Firebase Auth Initialization:**
  - `config/firebase.ts` (and `.js`): Sets up Firebase Auth, exports `auth` object for use throughout the app.
  - Uses `initializeAuth(app)` for Expo compatibility.

---

## 2. Auth State Management
- **App Entry & Routing:**
  - `app/_layout.tsx`:
    - Listens to auth state with `onAuthStateChanged(auth, ...)`.
    - Redirects to `/auth/welcome` if not logged in.
    - Redirects to main app if logged in and on an auth route.
    - Handles all navigation guards for authentication.

---

## 3. Auth Screens & Flows
- **Login Screens:**
  - `app/auth/login-options.tsx` — Login method selection.
  - `app/auth/phone-login.tsx` — Phone login.
  - `app/auth/email-login.tsx` — Email login (calls `signInUser`).
  - `app/auth/username-login.tsx` — Username login.
  - `app/auth/phone-otp.tsx` — OTP verification for phone login/signup.
- **Signup Screens:**
  - `app/auth/signup-options.tsx` — Signup method selection.
  - `app/auth/phone-signup.tsx` — Phone signup.
  - `app/auth/email-signup.tsx` — Email signup.
  - `app/auth/username-signup.tsx` — Username signup.
- **Password Reset:**
  - `app/auth/forgot-password.tsx` — Request password reset.
  - `app/auth/reset-otp.tsx` — OTP for password reset.
  - `app/auth/reset-password.tsx` — Set new password.

---

## 4. Auth Logic & Helpers
- **Helper Functions:**
  - `lib/firebaseHelpers` — Contains functions like `signInUser`, `signUpUser`, `signOutUser`, etc.
  - Used by all login/signup screens.

---

## 5. User Context & Usage
- **User Context:**
  - `app/_components/UserContext.tsx` — Provides `useUser()` hook for accessing current user throughout the app.
  - Used in screens like `profile.tsx`, `privacy.tsx`, etc.
- **Profile & Auth Usage:**
  - `app/(tabs)/profile.tsx` — Uses `useUser()` to get current user, checks `authUser?.uid` for all user-specific actions (follow, like, save, block, etc.).
  - `app/privacy.tsx` — Uses `useUser()` for privacy settings.

---

## 6. Logout
- **Logout Logic:**
  - In `app/(tabs)/_layout.tsx` (TopMenu):
    - Calls `signOut(auth)` from Firebase when user taps Log Out.
    - Redirects to `/auth/welcome` after logout.

---

## 7. Social Auth
- **TikTok Auth:**
  - `app/config/tiktokAuth.ts` — TikTok OAuth endpoints and redirect.

---

## 8. Navigation Guards
- **All navigation is protected in `app/_layout.tsx`** so users cannot access main app screens without being authenticated.

---

## 9. Summary Table
| Feature         | File(s) / Location(s)                  |
|-----------------|----------------------------------------|
| Auth State      | config/firebase.ts, app/_layout.tsx     |
| Login           | app/auth/*-login.tsx, firebaseHelpers   |
| Signup          | app/auth/*-signup.tsx, firebaseHelpers  |
| OTP             | app/auth/phone-otp.tsx, reset-otp.tsx   |
| Password Reset  | app/auth/forgot-password.tsx, ...       |
| User Context    | app/_components/UserContext.tsx         |
| Profile Usage   | app/(tabs)/profile.tsx                  |
| Logout          | app/(tabs)/_layout.tsx (TopMenu)        |
| Social Auth     | app/config/tiktokAuth.ts                |

---

## 10. How it works (Flow)
1. **App loads** → Checks Firebase Auth state.
2. **If not logged in** → Redirects to `/auth/welcome` (login/signup screens).
3. **User logs in or signs up** → Auth state updates, user redirected to main app.
4. **User context** is available everywhere via `useUser()`.
5. **Logout** → Calls `signOut`, returns to `/auth/welcome`.

---

For more details, see the code in the files listed above. This covers all login, signup, authentication, and user session usage in your app.
