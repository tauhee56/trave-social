import { useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { getCurrentUser } from "../lib/firebaseHelpers";

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const user = getCurrentUser();
      if (user) {
        router.replace('/(tabs)/home');
      } else {
        router.replace('/auth/welcome');
      }
    };
    checkAuth();
  }, []);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
      <ActivityIndicator size="large" color="#667eea" />
    </View>
  );
}
