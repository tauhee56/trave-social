import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getUserProfile } from '../lib/firebaseHelpers';
import { useUser } from './components/UserContext';



export default function FriendsScreen() {
  const authUser = useUser();
  const [friends, setFriends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    async function fetchFriends() {
      if (!authUser?.uid) return;
      setLoading(true);
      const res = await getUserProfile(authUser.uid);
      if (res.success && res.data && Array.isArray(res.data.friends)) {
        setFriends(res.data.friends);
      } else {
        setFriends([]);
      }
      setLoading(false);
    }
    fetchFriends();
  }, [authUser?.uid]);

  if (loading) return (
    <SafeAreaView style={styles.container}>
      <ActivityIndicator style={{ marginTop: 32 }} size="large" color="#FF6B00" />
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Friends</Text>
      <View style={styles.card}>
        <FlatList
          data={friends}
          keyExtractor={item => item.id || item.uid || item}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Text style={styles.name}>{item.name || item.username || item}</Text>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.empty}>No friends yet.</Text>}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 24 },
  header: { fontWeight: '700', fontSize: 24, color: '#FF6B00', marginBottom: 24, textAlign: 'center' },
  card: { backgroundColor: '#f7f7f7', borderRadius: 16, padding: 20, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, elevation: 8 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#eee' },
  name: { fontSize: 17, color: '#222', fontWeight: '600' },
  empty: { color: '#999', fontSize: 16, textAlign: 'center', marginTop: 32 },
});