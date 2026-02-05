import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getPassportTickets } from '../../../lib/firebaseHelpers/passport';
import { getUserProfile as getUserProfileAPI } from '../../../src/_services/firebaseService';

type PassportLocation = {
  city?: string;
  country?: string;
  lat?: number;
  lon?: number;
  visitedAt?: string | number;
};

export default function UserLocationsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const userId = useMemo(() => {
    const v = (params as any)?.userId;
    return Array.isArray(v) ? v[0] : v;
  }, [params]);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [canView, setCanView] = useState(true);
  const [locations, setLocations] = useState<PassportLocation[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const id = await AsyncStorage.getItem('userId');
        setCurrentUserId(id);
      } catch {
        setCurrentUserId(null);
      }
    })();
  }, []);

  const load = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    try {
      const profileRes: any = await getUserProfileAPI(String(userId), currentUserId || undefined);
      const profile = profileRes?.success ? profileRes?.data : null;

      const isPrivate = !!profile?.isPrivate;
      const approvedFollower = !!profile?.approvedFollowers?.includes(currentUserId || '');
      const isOwnProfile = !!(currentUserId && String(userId) === String(currentUserId));
      const allowed = !isPrivate || isOwnProfile || approvedFollower;
      setCanView(allowed);

      if (!allowed) {
        setLocations([]);
        return;
      }

      const passportRes: any = await getPassportTickets(String(userId));
      const rawLocations: any[] = Array.isArray(passportRes?.locations)
        ? passportRes.locations
        : (Array.isArray(passportRes) ? passportRes : []);

      const normalized: PassportLocation[] = rawLocations.map((l: any) => ({
        city: l?.city,
        country: l?.country,
        lat: typeof l?.lat === 'number' ? l.lat : undefined,
        lon: typeof l?.lon === 'number' ? l.lon : undefined,
        visitedAt: l?.visitedAt,
      }));

      normalized.sort((a, b) => {
        const ta = a?.visitedAt ? new Date(a.visitedAt).getTime() : 0;
        const tb = b?.visitedAt ? new Date(b.visitedAt).getTime() : 0;
        return tb - ta;
      });

      setLocations(normalized);
    } catch {
      setCanView(true);
      setLocations([]);
    } finally {
      setLoading(false);
    }
  }, [currentUserId, userId]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>Locations</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#f39c12" />
        </View>
      ) : !canView ? (
        <View style={styles.center}>
          <Text style={styles.privateTitle}>Private Account</Text>
          <Text style={styles.privateText}>Follow this user to see their locations.</Text>
        </View>
      ) : (
        <FlatList
          data={locations}
          keyExtractor={(item, index) => `${item.city || 'city'}-${item.country || 'country'}-${index}`}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f39c12" />}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <Text style={styles.countText}>{locations.length}</Text>
              <Text style={styles.countLabel}>Places Visited</Text>
            </View>
          }
          renderItem={({ item }) => {
            const city = item.city || 'Unknown City';
            const country = item.country || 'Unknown Country';
            const ts = item.visitedAt ? new Date(item.visitedAt).getTime() : 0;
            const dateText = ts ? new Date(ts).toLocaleDateString() : '';

            return (
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{city}</Text>
                  <Text style={styles.rowSub}>{country}{dateText ? ` • ${dateText}` : ''}</Text>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyTitle}>No Locations Yet</Text>
              <Text style={styles.emptyText}>Add a stamp in Passport to see it here.</Text>
            </View>
          }
          contentContainerStyle={locations.length === 0 ? { flexGrow: 1 } : undefined}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e0e0e0',
  },
  backBtn: { padding: 8, width: 40 },
  title: { fontSize: 18, fontWeight: '700', color: '#222' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  listHeader: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: '#eee' },
  countText: { fontSize: 20, fontWeight: '800', color: '#222' },
  countLabel: { fontSize: 12, color: '#666', marginTop: 2 },
  row: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: '#f0f0f0',
  },
  rowTitle: { fontSize: 15, fontWeight: '700', color: '#222' },
  rowSub: { fontSize: 13, color: '#666', marginTop: 2 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#222' },
  emptyText: { fontSize: 13, color: '#777', marginTop: 6, textAlign: 'center' },
  privateTitle: { fontSize: 16, fontWeight: '700', color: '#222' },
  privateText: { fontSize: 13, color: '#777', marginTop: 6, textAlign: 'center' },
});
