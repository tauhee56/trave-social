import 'react-native-reanimated';
import 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import * as Font from 'expo-font';
import { Stack, useRouter, useSegments } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";
import { ActivityIndicator, LogBox, Text as RNText, View } from "react-native";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { auth } from "../config/firebase";
import { UserProvider } from "./_components/UserContext";
import { ErrorBoundary } from "../components/ErrorBoundary";
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
    try {
      if (!auth) {
        throw new Error('Firebase Auth not initialized');
      }

      const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser);
        setLoading(false);
      }, (error) => {
        console.error('Auth state change error:', error);
        setInitError(error.message);
        setLoading(false);
      });

      return unsubscribe;
    } catch (error: any) {
      console.error('Auth initialization error:', error);
      setInitError(error.message);
      setLoading(false);
    }
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
            </Stack>
          )}
        </GestureHandlerRootView>
      </UserProvider>
    </ErrorBoundary>
  );
}
