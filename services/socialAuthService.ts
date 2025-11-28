import * as AppleAuthentication from 'expo-apple-authentication';
import * as WebBrowser from 'expo-web-browser';
import { GoogleAuthProvider, OAuthProvider, signInWithCredential, signInWithPopup } from 'firebase/auth';
import { Alert, Platform } from 'react-native';
import { auth } from '../config/firebase';

// Important: Complete auth session for web browser
WebBrowser.maybeCompleteAuthSession();

/**
 * Google Sign-In using expo-auth-session
 * Works on both iOS and Android
 */
export async function signInWithGoogle() {
  try {
    // For web
    if (Platform.OS === 'web') {
      const provider = new GoogleAuthProvider();
      provider.addScope('profile');
      provider.addScope('email');

      const result = await signInWithPopup(auth, provider);
      return {
        success: true,
        user: result.user,
      };
    }

    // For mobile - Coming soon
    Alert.alert(
      'Coming Soon!',
      'Google Sign-In will be available soon. Please use Email or Phone login for now.',
      [{ text: 'OK' }]
    );
    
    return {
      success: false,
      error: 'Coming soon',
    };
  } catch (error: any) {
    console.error('Google Sign-In Error:', error);
    
    return {
      success: false,
      error: error.message || 'Google Sign-In failed',
    };
  }
}

/**
 * Apple Sign-In using expo-apple-authentication
 * iOS only
 */
export async function signInWithApple() {
  try {
    // Check if Apple Sign-In is available (iOS 13+)
    if (Platform.OS === 'ios') {
      const isAvailable = await AppleAuthentication.isAvailableAsync();
      
      if (!isAvailable) {
        Alert.alert('Apple Sign-In', 'Apple Sign-In is not available on this device');
        return {
          success: false,
          error: 'Apple Sign-In not available',
        };
      }

      // Request Apple authentication
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      // Create Firebase credential
      const { identityToken } = credential;
      if (!identityToken) {
        throw new Error('No identity token returned');
      }

      const provider = new OAuthProvider('apple.com');
      const firebaseCredential = provider.credential({
        idToken: identityToken,
      });

      // Sign in with Firebase
      const result = await signInWithCredential(auth, firebaseCredential);
      
      return {
        success: true,
        user: result.user,
      };
    }

    // For web
    if (Platform.OS === 'web') {
      const provider = new OAuthProvider('apple.com');
      provider.addScope('email');
      provider.addScope('name');

      const result = await signInWithPopup(auth, provider);
      return {
        success: true,
        user: result.user,
      };
    }

    // Android not supported
    Alert.alert(
      'iOS Only Feature',
      'Apple Sign-In is only available on iPhone and iPad. Please use Email, Phone, or Google login on Android.',
      [{ text: 'OK' }]
    );
    return {
      success: false,
      error: 'Apple Sign-In not available on Android',
    };
  } catch (error: any) {
    console.error('Apple Sign-In Error:', error);
    
    // User canceled
    if (error.code === 'ERR_REQUEST_CANCELED') {
      return {
        success: false,
        error: 'Sign-in canceled',
      };
    }

    return {
      success: false,
      error: error.message || 'Apple Sign-In failed',
    };
  }
}

/**
 * TikTok Sign-In (Placeholder)
 * TikTok doesn't have Firebase integration
 * You'll need to use TikTok's OAuth API directly
 */
export async function signInWithTikTok() {
  Alert.alert(
    'Coming Soon!',
    'TikTok Sign-In will be available in a future update. Please use Email or Phone login for now.',
    [{ text: 'OK' }]
  );
  
  return {
    success: false,
    error: 'TikTok Sign-In coming soon',
  };
}

/**
 * Snapchat Sign-In (Placeholder)
 * Snapchat doesn't have Firebase integration
 * You'll need to use Snap Kit for authentication
 */
export async function signInWithSnapchat() {
  Alert.alert(
    'Coming Soon!',
    'Snapchat Sign-In will be available in a future update. Please use Email or Phone login for now.',
    [{ text: 'OK' }]
  );
  
  return {
    success: false,
    error: 'Snapchat Sign-In coming soon',
  };
}

/**
 * Helper to handle social auth result
 */
export async function handleSocialAuthResult(result: any, router: any) {
  if (result.success) {
    // Check if user needs to complete profile
    const user = result.user;
    
    // If user is new, redirect to username/profile setup
    if (user.metadata.creationTime === user.metadata.lastSignInTime) {
      router.push('/auth/username-signup');
    } else {
      // Existing user, go to home
      router.replace('/(tabs)/home');
    }
  } else {
    Alert.alert('Authentication Error', result.error);
  }
}
