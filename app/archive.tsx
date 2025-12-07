import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getCurrentUser } from '../lib/firebaseHelpers';

export default function Archive() {
  const router = useRouter();
  const [archived, setArchived] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    import('../lib/firebaseHelpers/archive').then(({ getArchivedConversations }) => {
      getArchivedConversations(user.uid).then(result => {
        if (result.success) {
          setArchived(result.data || []);
        }
        setLoading(false);
      });
    });
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f5f5f5', backgroundColor: '#fff' }}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 6 }}>
          <Feather name="x" size={22} color="#FF8800" />
        </TouchableOpacity>
        <Text style={{ flex: 1, textAlign: 'center', fontSize: 20, fontWeight: '700', color: '#111', marginLeft: -22 }}>Archive Chats</Text>
        <View style={{ width: 28 }} />
      </View>
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#FF8800" />
        </View>
      ) : archived.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <Text style={{ color: '#999', fontSize: 16, textAlign: 'center' }}>No archived chats yet</Text>
        </View>
      ) : (
        <FlatList
          data={archived}
          keyExtractor={t => t.id}
          style={{ width: '100%' }}
          renderItem={({ item }) => (
            <Swipeable
              renderRightActions={() => (
                <TouchableOpacity
                  style={{ backgroundColor: '#FF8800', justifyContent: 'center', alignItems: 'center', width: 100, height: '100%', borderRadius: 12 }}
                  onPress={async () => {
                    const user = getCurrentUser();
                    if (!user) return;
                    const { unarchiveConversation } = await import('../lib/firebaseHelpers/archive');
                    await unarchiveConversation(item.id, user.uid);
                    setArchived(archived.filter(c => c.id !== item.id));
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Unarchive</Text>
                </TouchableOpacity>
              )}
            >
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#eee' }}
                onPress={() => router.push({ pathname: '/dm', params: { id: item.id } })}
              >
                <View style={{ width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                  <Image source={{ uri: (item.otherUser && item.otherUser.avatar) ? item.otherUser.avatar : 'https://firebasestorage.googleapis.com/v0/b/YOUR_PROJECT_ID.appspot.com/o/default-pic.jpg?alt=media' }} style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#eee' }} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: '#222' }}>{item.otherUser && (item.otherUser.displayName || item.otherUser.name) ? (item.otherUser.displayName || item.otherUser.name) : 'Unknown User'}</Text>
                  <Text style={{ fontSize: 14, color: '#666' }} numberOfLines={1}>{item.lastMessage}</Text>
                </View>
              </TouchableOpacity>
            </Swipeable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#dbdbdb',
  },
  backBtn: {
    padding: 6,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    color: '#000',
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  avatarRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarRingUnread: {
    borderWidth: 2,
    borderColor: '#f39c12',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#eee',
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
  },
  lastMsg: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  time: {
    fontSize: 12,
    color: '#aaa',
    marginLeft: 8,
  },
  unarchiveBtn: {
    backgroundColor: '#007aff',
    justifyContent: 'center',
    alignItems: 'center',
    width: 100,
    height: '100%',
    borderRadius: 12,
  },
  unarchiveText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
