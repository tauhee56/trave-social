import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { getCurrentUser } from '../lib/firebaseHelpers';
import { getArchivedConversations, unarchiveConversation } from '../lib/firebaseHelpers/archive';
import Swipeable from 'react-native-gesture-handler/Swipeable';

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
    getArchivedConversations(user.uid).then(result => {
      if (result.success) {
        setArchived(result.data || []);
      }
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}> 
        <ActivityIndicator size="large" color="#007aff" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/inbox' as any)} style={styles.backBtn}>
          <Feather name="x" size={28} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>Archived</Text>
        <View style={{ width: 40 }} />
      </View>
      {archived.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/1828/1828778.png' }} style={{ width: 64, height: 64, marginBottom: 16 }} />
          <Text style={{ color: '#999', fontSize: 16, textAlign: 'center' }}>No archived messages yet</Text>
          <Text style={{ color: '#ccc', marginTop: 8, textAlign: 'center' }}>Archived chats will appear here, just like Instagram</Text>
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
                  style={styles.unarchiveBtn}
                  onPress={async () => {
                    await unarchiveConversation(item.id, getCurrentUser().uid);
                    setArchived(archived.filter(c => c.id !== item.id));
                  }}
                >
                  <Text style={styles.unarchiveText}>Unarchive</Text>
                </TouchableOpacity>
              )}
            >
              <TouchableOpacity
                style={styles.row}
                onPress={() => router.push({ pathname: '/dm', params: { id: item.id } })}
              >
                <View style={[styles.avatarRing, item.unread > 0 && styles.avatarRingUnread]}>
                  <Image source={{ uri: (item.otherUser && item.otherUser.avatar) ? item.otherUser.avatar : 'https://firebasestorage.googleapis.com/v0/b/YOUR_PROJECT_ID.appspot.com/o/default-pic.jpg?alt=media' }} style={styles.avatar} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{item.otherUser && item.otherUser.name ? item.otherUser.name : 'Unknown User'}</Text>
                  <Text style={styles.lastMsg} numberOfLines={1}>{item.lastMessage}</Text>
                </View>
                <Text style={styles.time}>{item.time}</Text>
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
