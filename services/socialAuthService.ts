import * as AppleAuthentication from 'expo-apple-authentication';
import * as WebBrowser from 'expo-web-browser';
import { GoogleAuthProvider, OAuthProvider, signInWithCredential, signInWithPopup } from 'firebase/auth';
import { Alert, Platform } from 'react-native';
import { auth } from '../config/firebase';

// Google Sign-In for native (will be configured)
let GoogleSignin: any = null;
try {
  GoogleSignin = require('@react-native-google-signin/google-signin').GoogleSignin;
} catch (e) {
  console.log('Google Sign-In not configured for native');
}

// Important: Complete auth session for web browser
WebBrowser.maybeCompleteAuthSession();

/**
 * Google Sign-In using @react-native-google-signin for mobile and firebase for web
 * Works on iOS, Android, and Web
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

    // For mobile (iOS/Android)
    if (GoogleSignin) {
      try {
        // Configure Google Sign-In
        GoogleSignin.configure({
          webClientId: '709095117662-2l84b3ua08t9icu8tpqtpchrmtdciep0.apps.googleusercontent.com',
          offlineAccess: true,
          iosClientId: '709095117662-k35juagf7ihkae81tfm9si43jkg7g177.apps.googleusercontent.com', // iOS Client ID from GoogleService-Info.plist
        });

        // Check if device supports Google Play Services (Android only)
        if (Platform.OS === 'android') {
          await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
        }
        
        // Get user info - v16+ returns { data: { idToken, user } } or { type: 'cancelled' }
        const response = await GoogleSignin.signIn();
        
        // Check if sign in was cancelled
        if (response.type === 'cancelled') {
          return {
            success: false,
            error: 'Sign in cancelled by user',
          };
        }
        
        // v16+ uses response.data.idToken, older versions use response.idToken
        const idToken = response.data?.idToken || (response as any).idToken;
        
        console.log('Google Sign-In Response:', JSON.stringify(response, null, 2));
        
        if (!idToken) {
          throw new Error('No ID token received from Google Sign-In');
        }
        
        // Create Firebase credential
        const googleCredential = GoogleAuthProvider.credential(idToken);
        
        // Sign in with Firebase
        const result = await signInWithCredential(auth, googleCredential);
        
        return {
          success: true,
          user: result.user,
        };
      } catch (configError: any) {
        console.error('Google Sign-In Configuration Error:', configError);
        
        // Check if it's Android SHA-1 certificate issue
        if (Platform.OS === 'android' && (configError.code === '10' || configError.message?.includes('DEVELOPER_ERROR'))) {
          Alert.alert(
            'Android Setup Required',
            'Google Sign-In needs SHA-1 certificate to be added in Firebase Console.\n\nSteps:\n1. Run: cd android && ./gradlew signingReport\n2. Copy SHA-1 fingerprint\n3. Add to Firebase Console → Project Settings → Your Android app',
            [{ text: 'OK' }]
          );
          
          return {
            success: false,
            error: 'SHA-1 certificate not configured in Firebase',
          };
        }
        
        throw configError;
      }
    }

    // Fallback if package not available
    Alert.alert(
      'Setup Required',
      'Google Sign-In package not installed. Please use Email or Phone login for now.',
      [{ text: 'OK' }]
    );
    
    return {
      success: false,
      error: 'Google Sign-In package not configured',
    };
  } catch (error: any) {
    console.error('Google Sign-In Error:', error);
    
    // User canceled
    if (error.code === 'SIGN_IN_CANCELLED' || error.code === '-5') {
      return {
        success: false,
        error: 'Sign-in canceled',
      };
    }
    
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
 * TikTok Sign-In using expo-auth-session OAuth
 * TikTok uses OAuth 2.0 authentication
 */
export async function signInWithTikTok() {
  try {
    const { makeRedirectUri } = await import('expo-auth-session');
    const ExpoCrypto = await import('expo-crypto');
    
    // TikTok OAuth configuration from developer console
    const TIKTOK_CLIENT_KEY = 'awel823341vepyyl';
    const TIKTOK_CLIENT_SECRET = 'dITpPKfOg4kcQiSjvC5ueaezDnbAMDOP';
    
    // TikTok OAuth endpoints
    const discovery = {
      authorizationEndpoint: 'https://www.tiktok.com/v2/auth/authorize/',
      tokenEndpoint: 'https://open.tiktokapis.com/v2/oauth/token/',
    };
    
    // Redirect URI - must match TikTok Developer Console
    const redirectUri = makeRedirectUri({
      scheme: 'trave-social',
      path: 'oauth/redirect'
    });
    
    // Generate random state for CSRF protection (required by TikTok)
    const stateBytes = await ExpoCrypto.getRandomBytesAsync(16);
    const state = Array.from(new Uint8Array(stateBytes))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    console.log('TikTok Redirect URI:', redirectUri);
    console.log('TikTok State:', state);
    
    // Open TikTok authorization URL with required state parameter
    const authUrl = `${discovery.authorizationEndpoint}?client_key=${TIKTOK_CLIENT_KEY}&scope=user.info.basic&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
    
    console.log('TikTok Auth URL:', authUrl);
    
    // Open browser for authentication
    const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);
    
    console.log('TikTok OAuth Result:', JSON.stringify(result, null, 2));
    
    if (result.type === 'success' && result.url) {
      // Extract authorization code from URL
      const url = new URL(result.url);
      const code = url.searchParams.get('code');
      const error = url.searchParams.get('error');
      
      console.log('TikTok OAuth Code:', code);
      console.log('TikTok OAuth Error:', error);
      
      if (error) {
        throw new Error(`TikTok OAuth error: ${error}`);
      }
      
      if (!code) {
        throw new Error('No authorization code received');
      }
      
      // Exchange code for access token
      const tokenResponse = await fetch(discovery.tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_key: TIKTOK_CLIENT_KEY,
          client_secret: TIKTOK_CLIENT_SECRET,
          code: code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
        }).toString(),
      });
      
      const tokenData = await tokenResponse.json();
      
      if (!tokenData.access_token) {
        throw new Error('Failed to get access token');
      }
      
      // Get user info from TikTok
      const userResponse = await fetch('https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Content-Type': 'application/json',
        },
      });
      
      const userData = await userResponse.json();
      
      if (!userData.data || !userData.data.user) {
        throw new Error('Failed to get user info');
      }
      
      const tiktokUser = userData.data.user;
      
      // Create custom token in Firebase (you'll need Cloud Function for this)
      // For now, use email/password with TikTok ID
      const { createUserWithEmailAndPassword, signInWithEmailAndPassword } = await import('firebase/auth');
      const { doc, setDoc, getDoc, serverTimestamp } = await import('firebase/firestore');
      const { db } = await import('../config/firebase');
      
      // Use TikTok open_id as unique identifier
      const tiktokEmail = `tiktok_${tiktokUser.open_id}@trave-social.app`;
      const tiktokPassword = `TikTok_${tiktokUser.open_id}_${TIKTOK_CLIENT_SECRET}`;
      
      let firebaseUser;
      
      try {
        // Try to sign in first
        const signInResult = await signInWithEmailAndPassword(auth, tiktokEmail, tiktokPassword);
        firebaseUser = signInResult.user;
      } catch (signInError: any) {
        if (signInError.code === 'auth/user-not-found') {
          // Create new account
          const createResult = await createUserWithEmailAndPassword(auth, tiktokEmail, tiktokPassword);
          firebaseUser = createResult.user;
          
          // Create user document in Firestore
          const defaultAvatar = 'https://firebasestorage.googleapis.com/v0/b/travel-app-3da72.firebasestorage.app/o/default%2Fdefault-pic.jpg?alt=media&token=7177f487-a345-4e45-9a56-732f03dbf65d';
          
          await setDoc(doc(db, 'users', firebaseUser.uid), {
            uid: firebaseUser.uid,
            email: tiktokEmail,
            displayName: tiktokUser.display_name || 'TikTok User',
            name: tiktokUser.display_name || 'TikTok User',
            bio: '',
            website: '',
            avatar: tiktokUser.avatar_url || defaultAvatar,
            photoURL: tiktokUser.avatar_url || defaultAvatar,
            tiktokId: tiktokUser.open_id,
            tiktokUnionId: tiktokUser.union_id,
            authProvider: 'tiktok',
            createdAt: serverTimestamp(),
            followers: [],
            following: [],
            postsCount: 0,
            followersCount: 0,
            followingCount: 0
          });
        } else {
          throw signInError;
        }
      }
      
      return {
        success: true,
        user: firebaseUser,
      };
    }
    
    // User canceled
    return {
      success: false,
      error: 'Sign-in canceled',
    };
  } catch (error: any) {
    console.error('TikTok Sign-In Error:', error);
    
    Alert.alert(
      'TikTok Login Error',
      error.message || 'Failed to sign in with TikTok. Please try again.',
      [{ text: 'OK' }]
    );
    
    return {
      success: false,
      error: error.message || 'TikTok Sign-In failed',
    };
  }
}

/**
 * Snapchat Sign-In using expo-auth-session OAuth
 * Snapchat uses Snap Kit for authentication
 */
export async function signInWithSnapchat() {
  try {
    const { makeRedirectUri } = await import('expo-auth-session');
    
    // Snapchat OAuth configuration
    const discovery = {
      authorizationEndpoint: 'https://accounts.snapchat.com/accounts/oauth2/auth',
      tokenEndpoint: 'https://accounts.snapchat.com/accounts/oauth2/token',
    };
    
    const redirectUri = makeRedirectUri({
      scheme: 'trave-social',
      path: 'auth/callback'
    });
    
    // TODO: Replace with your Snapchat client_id and client_secret
    const SNAPCHAT_CLIENT_ID = 'YOUR_SNAPCHAT_CLIENT_ID';
    const SNAPCHAT_CLIENT_SECRET = 'YOUR_SNAPCHAT_CLIENT_SECRET';
    const { makeRedirectUri: makeSnapRedirectUri } = await import('expo-auth-session');
    const snapRedirectUri = makeSnapRedirectUri({
      scheme: 'trave-social',
      path: 'auth/callback'
    });
    const snapDiscovery = {
      authorizationEndpoint: 'https://accounts.snapchat.com/accounts/oauth2/auth',
      tokenEndpoint: 'https://accounts.snapchat.com/accounts/oauth2/token',
    };
    // Build Snapchat OAuth URL
    const snapAuthUrl = `${snapDiscovery.authorizationEndpoint}?client_id=${SNAPCHAT_CLIENT_ID}&redirect_uri=${encodeURIComponent(snapRedirectUri)}&response_type=code&scope=snapchat-marketing-api%20user.display_name%20user.bitmoji.avatar`;
    // Open browser for authentication
    const snapResult = await WebBrowser.openAuthSessionAsync(snapAuthUrl, snapRedirectUri);
    if (snapResult.type === 'success' && snapResult.url) {
      // Extract authorization code from URL
      const url = new URL(snapResult.url);
      const code = url.searchParams.get('code');
      if (!code) {
        throw new Error('No authorization code received');
      }
      // Exchange code for access token
      const tokenResponse = await fetch(snapDiscovery.tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: SNAPCHAT_CLIENT_ID,
          client_secret: SNAPCHAT_CLIENT_SECRET,
          code: code,
          grant_type: 'authorization_code',
          redirect_uri: snapRedirectUri,
        }).toString(),
      });
      const tokenData = await tokenResponse.json();
      if (!tokenData.access_token) {
        throw new Error('Failed to get access token');
      }
      // Get user info from Snapchat (Bitmoji, display name)
      const userResponse = await fetch('https://kit.snapchat.com/v1/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Content-Type': 'application/json',
        },
      });
      const userData = await userResponse.json();
      if (!userData.data) {
        throw new Error('Failed to get user info');
      }
      // Create Firebase user (similar to TikTok logic)
      const { createUserWithEmailAndPassword, signInWithEmailAndPassword } = await import('firebase/auth');
      const { doc, setDoc, getDoc, serverTimestamp } = await import('firebase/firestore');
      const { db } = await import('../config/firebase');
      const snapchatEmail = `snapchat_${userData.data.me.external_id}@trave-social.app`;
      const snapchatPassword = `Snapchat_${userData.data.me.external_id}_${SNAPCHAT_CLIENT_SECRET}`;
      let firebaseUser;
      try {
        const signInResult = await signInWithEmailAndPassword(auth, snapchatEmail, snapchatPassword);
        firebaseUser = signInResult.user;
      } catch (signInError) {
        const errorAny = signInError as any;
        if (errorAny.code === 'auth/user-not-found') {
          const createResult = await createUserWithEmailAndPassword(auth, snapchatEmail, snapchatPassword);
          firebaseUser = createResult.user;
          await setDoc(doc(db, 'users', firebaseUser.uid), {
            uid: firebaseUser.uid,
            email: snapchatEmail,
            displayName: userData.data.me.display_name || 'Snapchat User',
            name: userData.data.me.display_name || 'Snapchat User',
            bio: '',
            website: '',
            avatar: userData.data.me.bitmoji.avatar || '',
            photoURL: userData.data.me.bitmoji.avatar || '',
            snapchatId: userData.data.me.external_id,
            authProvider: 'snapchat',
            createdAt: serverTimestamp(),
            followers: [],
            following: [],
            postsCount: 0,
            followersCount: 0,
            followingCount: 0
          });
        } else {
          throw signInError;
        }
      }
      return {
        success: true,
        user: firebaseUser,
      };
    }
    // User canceled
    return {
      success: false,
      error: 'Sign-in canceled',
    };
  } catch (error: any) {
    console.error('Snapchat Sign-In Error:', error);
    
    return {
      success: false,
      error: error.message || 'Snapchat Sign-In failed',
    };
  }
}

/**
 * Helper to handle social auth result
 */
export async function handleSocialAuthResult(result: any, router: any) {
  if (result.success) {
    // Check if user needs to complete profile
    const user = result.user;
    const defaultAvatar = 'https://firebasestorage.googleapis.com/v0/b/travel-app-3da72.firebasestorage.app/o/default%2Fdefault-pic.jpg?alt=media&token=7177f487-a345-4e45-9a56-732f03dbf65d';
    const userAvatar = user.photoURL || defaultAvatar;
    const userName = user.displayName || user.email?.split('@')[0] || 'User';

    console.log('handleSocialAuthResult - User:', {
      uid: user.uid,
      photoURL: user.photoURL,
      displayName: user.displayName,
      isNew: user.metadata.creationTime === user.metadata.lastSignInTime
    });

    // If user is new, create Firestore document
    if (user.metadata.creationTime === user.metadata.lastSignInTime) {
      try {
        const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
        const { db } = await import('../config/firebase');

        // Create user document in Firestore
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email,
          displayName: userName,
          name: userName,
          bio: '',
          website: '',
          avatar: userAvatar,
          photoURL: userAvatar,
          createdAt: serverTimestamp(),
          followers: [],
          following: [],
          postsCount: 0,
          followersCount: 0,
          followingCount: 0
        });

        // Go to home after creating profile
        router.replace('/(tabs)/home');
      } catch (error) {
        console.error('Error creating user profile:', error);
        Alert.alert('Error', 'Failed to create user profile');
      }
    } else {
      // Existing user - check if avatar needs updating
      try {
        const { doc, getDoc, updateDoc } = await import('firebase/firestore');
        const { db } = await import('../config/firebase');
        
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          // Update avatar if it's empty or default, and Google has a photoURL
          if (user.photoURL && (!userData.avatar || userData.avatar === defaultAvatar || userData.avatar === '')) {
            await updateDoc(doc(db, 'users', user.uid), {
              avatar: user.photoURL,
              photoURL: user.photoURL
            });
            console.log('Updated existing user avatar from Google:', user.photoURL);
          }
        }
      } catch (error) {
        console.error('Error checking/updating user avatar:', error);
      }
      
      // Go to home
      router.replace('/(tabs)/home');
    }
  } else {
    Alert.alert('Authentication Error', result.error);
  }
}
