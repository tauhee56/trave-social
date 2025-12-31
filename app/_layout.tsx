import { Ionicons } from '@expo/vector-icons';
import * as Font from 'expo-font';
import { Stack, useRouter, useSegments } from "expo-router";
// import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";
import { ActivityIndicator, LogBox, Text as RNText, View } from "react-native";
import 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { ErrorBoundary } from "../components/ErrorBoundary";
// import { auth } from "../config/firebase";
// import { initSentry } from "../lib/sentry";
import { UserProvider } from "../src/_components/UserContext";
// Suppress non-critical warnings
LogBox.ignoreLogs([
  'Unable to activate keep awake',
  'Sending `onAnimatedValueUpdate` with no listeners registered',
  'ViewPropTypes will be removed',
  'Native part of Reanimated doesn\'t seem to be initialized', // Suppress in Expo Go
]);

// Silence noisy logs in production for performance
if (!__DEV__) {
  const noop = () => {};
  // Keep warn/error visible
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  console.debug = noop as any;
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  console.log = noop as any;
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  console.time = noop as any;
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  console.timeEnd = noop as any;
}

// initSentry();

export default function RootLayout() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    async function loadFonts() {
      try {
        await Font.loadAsync({
          ...Ionicons.font,
        });
        setFontsLoaded(true);
      } catch (error) {
        console.log('Font loading error:', error);
        setFontsLoaded(true); // Continue anyway
      }
    }
    loadFonts();
  }, []);

  useEffect(() => {
    // Check if user has session token in AsyncStorage
    async function checkAuth() {
      try {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        const token = await AsyncStorage.getItem('token');
        const userId = await AsyncStorage.getItem('userId');
        
        if (token && userId) {
          setUser({ token, userId });
        } else {
          setUser(null);
        }
      } catch (error) {
        console.log('Auth check error:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    
    checkAuth();
    
    // Only check for token changes every 5 seconds (less aggressive)
    const checkAuthInterval = setInterval(checkAuth, 5000);
    
    return () => clearInterval(checkAuthInterval);
  }, []);

  useEffect(() => {
    if (loading || !fontsLoaded) return;

    const inAuthGroup = segments[0] === 'auth';

    if (!user && !inAuthGroup) {
      router.replace('/auth/welcome');
    } else if (user && inAuthGroup) {
      router.replace('/(tabs)/home');
    }
  }, [user, segments, loading, fontsLoaded]);

  return (
    <ErrorBoundary>
      <UserProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          {loading || !fontsLoaded ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
              <ActivityIndicator size="large" color="#667eea" />
              {initError && (
                <View style={{ marginTop: 20, padding: 20 }}>
                  <RNText style={{ color: 'red', textAlign: 'center' }}>
                    Initialization Error: {initError}
                  </RNText>
                </View>
              )}
            </View>
          ) : (
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="auth/welcome" />
              <Stack.Screen name="auth/login-options" />
              <Stack.Screen name="auth/phone-login" />
              <Stack.Screen name="auth/email-login" />
              <Stack.Screen name="auth/username-login" />
              <Stack.Screen name="auth/signup-options" />
              <Stack.Screen name="auth/phone-signup" />
              <Stack.Screen name="auth/email-signup" />
              <Stack.Screen name="auth/username-signup" />
              <Stack.Screen name="auth/phone-otp" />
              <Stack.Screen name="auth/forgot-password" />
              <Stack.Screen name="auth/reset-otp" />
              <Stack.Screen name="auth/reset-password" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="create-post" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
              <Stack.Screen name="search-modal" options={{ presentation: 'modal' }} />
              <Stack.Screen name="inbox" options={{ headerShown: false }} />
              <Stack.Screen name="edit-profile" options={{ headerShown: false }} />
              <Stack.Screen name="passport" options={{ headerShown: false }} />
              <Stack.Screen name="dm" options={{ headerShown: false }} />
              <Stack.Screen name="notifications" options={{ headerShown: false }} />
              <Stack.Screen name="go-live" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
              <Stack.Screen name="watch-live" options={{ headerShown: false }} />
            </Stack>
          )}
        </GestureHandlerRootView>
      </UserProvider>
    </ErrorBoundary>
  );
}
