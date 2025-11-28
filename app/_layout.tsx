import { Stack } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { auth } from "../config/firebase";
import { UserProvider } from "./components/UserContext";

export default function RootLayout() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen to auth state changes
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
          <ActivityIndicator size="large" color="#f39c12" />
        </View>
      </GestureHandlerRootView>
    );
  }

  return (
    <UserProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
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
      </GestureHandlerRootView>
    </UserProvider>
  );
}
