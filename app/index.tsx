import { useEffect } from "react";
import { View, ActivityIndicator, Text } from "react-native";
import { useRouter } from "expo-router";
import { getCurrentUser } from "../lib/firebaseHelpers";

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in
    const checkAuth = async () => {
      try {
        console.log('Index: Starting auth check...');
        // Small delay to ensure auth is initialized
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const user = getCurrentUser();
        console.log('Index: Current user:', user ? 'Logged in' : 'Not logged in');
        
        if (user) {
          console.log('Index: Navigating to home');
          router.replace("/(tabs)/home");
        } else {
          console.log('Index: Navigating to login');
          router.replace("/login");
        }
      } catch (error) {
        console.error('Index: Error during auth check:', error);
        // Fallback to login on error
        router.replace("/login");
      }
    };

    checkAuth();
  }, []);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
      <ActivityIndicator size="large" color="#f39c12" />
      <Text style={{ marginTop: 20, color: '#666' }}>Loading...</Text>
    </View>
  );
}
