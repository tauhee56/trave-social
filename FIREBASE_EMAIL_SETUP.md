# 📧 Firebase Password Reset Email Setup Guide

## Problem
Forgot password email nahi aa rahi despite using `sendPasswordResetEmail()`.

## Solution Steps

### 1. Firebase Console Email Template Setup

1. **Open Firebase Console**: https://console.firebase.google.com
2. **Select Your Project**: `travel-app-3da72`
3. Go to **Authentication** (left sidebar)
4. Click on **Templates** tab
5. Select **Password reset** template

---

### 2. Configure Email Template

#### Basic Settings:
```
From Name: Trave Social
Reply-to: noreply@trave-social.com (or your domain)
```

#### Email Subject:
```
Reset your Trave Social password
```

#### Email Body (HTML):
```html
<p>Hello,</p>
<p>We received a request to reset your Trave Social password.</p>
<p>Click the button below to reset your password:</p>
<p>
  <a href="%LINK%" 
     style="display: inline-block; 
            padding: 12px 24px; 
            background-color: #007aff; 
            color: white; 
            text-decoration: none; 
            border-radius: 8px;
            font-weight: bold;">
    Reset Password
  </a>
</p>
<p>Or copy and paste this link into your browser:</p>
<p>%LINK%</p>
<p>If you didn't request this, please ignore this email.</p>
<p>This link will expire in 1 hour.</p>
<p>Thanks,<br>Trave Social Team</p>
```

**Important**: `%LINK%` will be automatically replaced by Firebase with the actual reset link.

---

### 3. Domain Verification (CRITICAL)

Firebase might block emails if domain is not verified.

#### Option A: Use Firebase Default Domain (Easiest)
- Firebase automatically sends from `@project-name.firebaseapp.com`
- No setup needed, works immediately

#### Option B: Custom Domain (Professional)
1. Go to **Project Settings** → **Authorized domains**
2. Add your domain: `trave-social.com`
3. Verify domain ownership (follow Firebase instructions)
4. Update email settings to use custom domain

---

### 4. Check Spam Folder

Firebase emails often go to spam initially. Ask users to:
1. Check spam/junk folder
2. Mark as "Not Spam"
3. Add `noreply@project-name.firebaseapp.com` to contacts

---

### 5. Test Password Reset Flow

```typescript
// Test in your app
await sendPasswordResetEmail(auth, 'test@example.com');
// Should receive email within 1-2 minutes
```

---

### 6. Email Delivery Settings

In Firebase Console:
1. Go to **Authentication** → **Settings** → **Email Enumeration Protection**
2. Enable **Email Enumeration Protection** (recommended for security)
3. This sends email even if account doesn't exist (prevents user enumeration)

---

### 7. Common Issues & Solutions

#### Issue 1: Email not arriving
**Solutions**:
- Wait 5-10 minutes (can be delayed)
- Check spam folder
- Verify email address is correct
- Check Firebase Console → Authentication → Users (user must exist)

#### Issue 2: "Too many requests" error
**Solution**:
```typescript
// Add rate limiting in your code
const lastResetAttempt = localStorage.getItem('lastReset');
const now = Date.now();
if (lastResetAttempt && now - parseInt(lastResetAttempt) < 60000) {
  Alert.alert('Error', 'Please wait 1 minute before trying again');
  return;
}
localStorage.setItem('lastReset', now.toString());
```

#### Issue 3: Invalid email domain
**Solution**:
- Use Gmail/Outlook for testing
- Custom domains need verification

#### Issue 4: Email blocked by Firebase
**Check Firebase Quota**:
1. Firebase Console → Usage
2. Check "Email sent" quota
3. Free tier: 100 emails/day
4. Upgrade to Blaze plan for more

---

### 8. Enhanced Error Handling

Update your forgot-password.tsx:

```typescript
const handleSendResetEmail = async () => {
  if (!email.trim()) {
    Alert.alert('Error', 'Please enter your email address');
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    Alert.alert('Error', 'Please enter a valid email address');
    return;
  }

  setLoading(true);
  try {
    await sendPasswordResetEmail(auth, email.trim(), {
      url: 'https://your-app.com/reset-password', // Deep link back to app
      handleCodeInApp: true,
    });
    
    Alert.alert(
      'Email Sent! ✅',
      'Please check your email inbox (and spam folder) for the password reset link.',
      [
        {
          text: 'Check Spam Folder',
          onPress: () => {
            // Open email app or show instructions
          }
        },
        {
          text: 'OK',
          onPress: () => router.back()
        }
      ]
    );
  } catch (error: any) {
    console.error('Password reset error:', error);
    let errorMessage = 'Failed to send reset email. Please try again.';

    switch (error.code) {
      case 'auth/user-not-found':
        errorMessage = 'No account found with this email. Please check your email or sign up.';
        break;
      case 'auth/invalid-email':
        errorMessage = 'Invalid email address format.';
        break;
      case 'auth/too-many-requests':
        errorMessage = 'Too many attempts. Please wait 5 minutes and try again.';
        break;
      case 'auth/network-request-failed':
        errorMessage = 'Network error. Please check your internet connection.';
        break;
      case 'auth/user-disabled':
        errorMessage = 'This account has been disabled. Please contact support.';
        break;
    }

    Alert.alert('Error', errorMessage);
  } finally {
    setLoading(false);
  }
};
```

---

### 9. Firebase Console Email Logs

Check if emails are being sent:
1. Firebase Console → **Authentication** → **Templates**
2. Click on **Email logs** (if available on your plan)
3. Check delivery status

---

### 10. Alternative: Custom Email Service

If Firebase emails still don't work, use SendGrid/Mailgun:

```typescript
// Backend function (Firebase Cloud Functions)
import * as sgMail from '@sendgrid/mail';

export const sendCustomPasswordReset = functions.https.onCall(async (data, context) => {
  const { email } = data;
  
  // Generate reset link
  const resetLink = await auth.generatePasswordResetLink(email);
  
  // Send via SendGrid
  await sgMail.send({
    to: email,
    from: 'noreply@trave-social.com',
    subject: 'Reset your password',
    html: `<p>Click here to reset: <a href="${resetLink}">Reset Password</a></p>`
  });
  
  return { success: true };
});
```

---

## Testing Checklist

- [ ] Firebase email template configured
- [ ] Domain authorized in Firebase
- [ ] Test with Gmail account
- [ ] Check spam folder
- [ ] Verify user exists in Firebase Authentication
- [ ] Check Firebase quota (100 emails/day on free tier)
- [ ] Test reset link works
- [ ] Error handling works for invalid emails

---

## Quick Test Commands

```bash
# Test email sending (from browser console)
firebase.auth().sendPasswordResetEmail('test@gmail.com')
  .then(() => console.log('Email sent!'))
  .catch(err => console.error('Error:', err));
```

---

## Support

If emails still don't arrive after setup:
1. Check Firebase Console logs
2. Verify Firebase project is not suspended
3. Check billing status (might need Blaze plan)
4. Contact Firebase Support: https://firebase.google.com/support

---

## Expected Timeline

- **Template setup**: 5 minutes
- **Email delivery**: 1-5 minutes
- **Spam folder check**: If not in inbox after 5 minutes

---

**Status**: Email functionality is configured in code ✅  
**Next Step**: Configure Firebase Console email template (5 minutes)
