import { useEffect, useState } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../config/firebase";
import { View, ActivityIndicator, Text } from "react-native";
import { GestureHandlerRootView } from 'react-native-gesture-handler';

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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="signup" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="create-post" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="search-modal" options={{ presentation: 'modal' }} />
        <Stack.Screen name="highlight/[id]" />
        <Stack.Screen name="create" />
        <Stack.Screen name="filters/edit" />
        <Stack.Screen name="inbox" />
        <Stack.Screen name="dm" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="passport" />
        <Stack.Screen name="edit-profile" />
        <Stack.Screen name="go-live" />
        <Stack.Screen name="user-profile" />
      </Stack>
    </GestureHandlerRootView>
  );
}
