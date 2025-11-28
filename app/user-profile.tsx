import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Profile from './(tabs)/profile';

// Wrapper route so viewing another user's profile doesn't activate the bottom Profile tab.
// Also add safe-area and vertical spacing so content is not flush to edges.
export default function UserProfileWrapper() {
  const params = useLocalSearchParams();
  const userId = typeof params.uid === 'string' ? params.uid : undefined;
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
