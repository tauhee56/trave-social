import React from 'react';
import Profile from './(tabs)/profile';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, StyleSheet } from 'react-native';

// Wrapper route so viewing another user's profile doesn't activate the bottom Profile tab.
// Also add safe-area and vertical spacing so content is not flush to edges.
export default function UserProfileWrapper() {
  const params = useLocalSearchParams();
  const userId = typeof params.user === 'string' ? params.user : undefined;
  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.wrapper}>
        <Profile userIdProp={userId} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  wrapper: { flex: 1, paddingTop: 12, paddingBottom: 12 },
});
