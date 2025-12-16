import { useRouter } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { auth } from "../config/firebase";

export default function Index() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Wait for Firebase Auth to load from AsyncStorage
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('🔐 Auth state changed in index.tsx:', user ? `User: ${user.uid}` : 'No user');

      if (user) {
        console.log('✅ User logged in, navigating to home');
        router.replace('/(tabs)/home');
      } else {
        console.log('❌ No user, navigating to welcome');
        router.replace('/auth/welcome');
      }

      setChecking(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
      <ActivityIndicator size="large" color="#667eea" />
    </View>
  );
}
