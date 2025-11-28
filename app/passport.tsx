import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getCurrentUser } from '../lib/firebaseHelpers';
import PassportSection from './components/PassportSection';

export default function PassportScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const userId = (params.user as string) || getCurrentUser()?.uid;
  const currentUser = getCurrentUser();
  const isOwner = currentUser?.uid === userId;

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* Professional Header with Gradient */}
      <LinearGradient
        colors={['#FFB800', '#FF8C00']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(tabs)/profile' as any);
            }
          }}>
            <Feather name="x" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>My Passport</Text>
          <View style={{ width: 50 }} />
        </View>
      </LinearGradient>
      
      {/* Live Passport Tracking Section */}
      {userId && (
        <PassportSection userId={userId} isOwner={isOwner} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  headerGradient: {
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  backBtn: {},
  title: { 
    fontSize: 20, 
    fontWeight: '700', 
    color: '#fff',
    flex: 1,
    textAlign: 'center',
    marginLeft: -24,
  },
  notOwnerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  notOwnerText: {
    fontSize: 16,
    color: '#888',
    marginTop: 16,
    textAlign: 'center',
  },
});

