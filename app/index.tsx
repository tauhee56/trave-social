import { useRouter, useSegments } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { auth } from "../config/firebase";
import {
    getPushNotificationToken,
    requestNotificationPermissions,
    savePushToken,
    setupNotificationListeners
} from "../services/notificationService";

export default function Index() {
  const router = useRouter();
  const segments = useSegments();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen to auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      console.log('Index: Auth state changed:', currentUser ? 'Logged in' : 'Not logged in');
      setUser(currentUser);
      setLoading(false);

      // Setup notifications for logged in users
      if (currentUser) {
        await initializeNotifications(currentUser.uid);
      }
    });

    // Setup notification listeners
    const cleanupListeners = setupNotificationListeners(
      (notification) => {
        // Handle notification received while app is open
        console.log('Notification received:', notification);
      },
      (response) => {
        // Handle notification tap
        console.log('Notification tapped:', response);
        const data = response.notification.request.content.data;
        
        // Navigate based on notification type
        if (data?.type === 'like' || data?.type === 'comment') {
          router.push(`/(tabs)/home`);
        } else if (data?.type === 'follow') {
          router.push(`/(tabs)/profile`);
        } else if (data?.type === 'message') {
          router.push('/inbox');
        }
      }
    );

    return () => {
      unsubscribe();
      cleanupListeners();
    };
  }, []);

  async function initializeNotifications(userId: string) {
    try {
      // Request permissions
      const permResult = await requestNotificationPermissions();
      if (!permResult.success) {
        console.log('Notification permissions denied');
        return;
      }

      // Get push token
      const tokenResult = await getPushNotificationToken();
      if (tokenResult.success && tokenResult.token) {
        // Save token to user profile
        await savePushToken(userId, tokenResult.token);
        console.log('Push token saved successfully');
      }
    } catch (error) {
      console.error('Error initializing notifications:', error);
    }
  }

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === 'auth';
    const inTabsGroup = segments[0] === '(tabs)';

    console.log('Index: segments:', segments, 'user:', !!user);

    if (user && !inTabsGroup) {
      // User is signed in but not in tabs, redirect to home
      console.log('Index: Redirecting logged in user to home');
      router.replace('/(tabs)/home');
    } else if (!user && segments.length > 0 && segments[0] !== 'auth') {
      // User is not signed in but trying to access protected route
      console.log('Index: Redirecting to welcome');
      router.replace('/auth/welcome');
    } else if (!user && segments.length === 0) {
      // User is not signed in and on index route
      console.log('Index: Initial redirect to welcome');
      router.replace('/auth/welcome');
    }
  }, [user, loading, segments]);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
      <ActivityIndicator size="large" color="#f39c12" />
      <Text style={{ marginTop: 20, color: '#666' }}>Loading...</Text>
    </View>
  );
}
