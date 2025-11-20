import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, ActivityIndicator } from "react-native";
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import { getCurrentUser, subscribeToConversations } from '../lib/firebaseHelpers';
import { archiveConversation } from '../lib/firebaseHelpers/archive';

export default function Inbox() {
    // Default avatar from Firebase Storage
    const DEFAULT_AVATAR_URL = 'https://firebasestorage.googleapis.com/v0/b/travel-app-3da72.firebasestorage.app/o/default%2Fdefault-pic.jpg?alt=media&token=7177f487-a345-4e45-9a56-732f03dbf65d';
  const router = useRouter();
  const navigation = useNavigation();
  const currentUserData = getCurrentUser();
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribe = subscribeToConversations(user.uid, (convos) => {
      setConversations(convos);
      setLoading(false);
    });
    return () => unsubscribe && unsubscribe();
  }, []);

  async function loadConversations() {
    const user = getCurrentUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const result = await getUserConversations(user.uid);
    if (result.success) {
      setConversations(result.data || []);
    }
    setLoading(false);
  }

  function formatTime(timestamp: any) {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (hours < 1) return 'now';
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    return date.toLocaleDateString();
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color="#007aff" />
      </SafeAreaView>
    );
  }
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => {
          router.dismissAll();
          router.replace('/(tabs)/profile' as any);
        }} style={styles.backBtn}>
          <Feather name="x" size={28} color="#000" />
        </TouchableOpacity>
        <Text style={[styles.title, { textAlign: 'center', flex: 1 }]}>Messages</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.topActions}>
        <TouchableOpacity style={styles.actionBtn}>
          <Feather name="users" size={20} color="#007aff" />
          <Text style={styles.actionText}>Requests</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/archive')}>
          <Feather name="archive" size={20} color="#007aff" />
          <Text style={styles.actionText}>Archive</Text>
        </TouchableOpacity>
      </View>

      {conversations.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <Feather name="message-circle" size={64} color="#ccc" />
          <Text style={{ color: '#999', marginTop: 16, fontSize: 16 }}>No messages yet</Text>
          <Text style={{ color: '#ccc', marginTop: 8, textAlign: 'center' }}>Start a conversation by visiting someone's profile</Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={t => t.id}
          style={{ width: '100%' }}
          renderItem={({ item }) => (
            <Swipeable
              renderRightActions={() => (
                <TouchableOpacity
                  style={styles.archiveBtn}
                  onPress={async () => {
                    await archiveConversation(item.id, getCurrentUser().uid);
                    setConversations(conversations.filter(c => c.id !== item.id));
                  }}
                >
                  <Text style={styles.archiveText}>Archive</Text>
                </TouchableOpacity>
              )}
            >
              <TouchableOpacity
                style={styles.row}
                onPress={() => router.push({ 
                  pathname: '/dm', 
                  params: { 
                    conversationId: item.id,
                    otherUserId: item.otherUser.id,
                    user: item.otherUser.name, 
                    avatar: item.otherUser.avatar 
                  } 
                })}
              >
                <View style={[styles.avatarRing, item.unread > 0 && styles.avatarRingUnread]}>
                  <Image source={{ uri: item.otherUser.avatar && item.otherUser.avatar.trim() !== "" ? item.otherUser.avatar : DEFAULT_AVATAR_URL }} style={styles.avatar} />
                </View>

                <View style={styles.content}>
                  <View style={styles.rowTop}>
                    <Text style={[styles.user, item.unread > 0 && styles.userUnread]} numberOfLines={1}>{item.otherUser.name}</Text>
                    <Text style={styles.at}>{formatTime(item.lastMessageAt)}</Text>
                  </View>
                  <View style={styles.rowBottom}>
                    <Text style={[styles.last, item.unread > 0 && styles.lastUnread]} numberOfLines={1}>
                      {item.lastMessage || 'No messages yet'}
                    </Text>
                    {item.unread > 0 ? (
                      <View style={styles.unreadBadge}><Text style={styles.unreadText}>{item.unread > 9 ? '9+' : item.unread}</Text></View>
                    ) : (
                      <Feather name="chevron-right" size={18} color="#ccc" />
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            </Swipeable>
          )}
          ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: '#f5f5f5' }} />}
          contentContainerStyle={{ paddingBottom: 16 }}
        />
        // ...existing code...
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
    topActions: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: '#f0f0f0',
      backgroundColor: '#fff',
    },
    actionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#f7f7f7',
      borderRadius: 18,
      paddingHorizontal: 14,
      paddingVertical: 6,
      marginHorizontal: 4,
    },
    actionText: {
      marginLeft: 6,
      color: '#007aff',
      fontWeight: '600',
      fontSize: 15,
    },
  container: { flex: 1, backgroundColor: '#fff' },
  headerRow: { paddingTop: 8, paddingBottom: 8, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 0.5, borderBottomColor: '#dbdbdb' },
  title: { fontSize: 20, fontWeight: '700', flex: 1, textAlign: 'center', marginLeft: -30 },
  backBtn: { padding: 6 },
  iconBtn: { padding: 6 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16 },
  avatarRing: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarRingUnread: { borderWidth: 2, borderColor: '#f39c12' },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#eee' },
  content: { flex: 1, borderBottomWidth: 0, paddingRight: 8 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  user: { fontWeight: '700', fontSize: 15, color: '#111', flex: 1 },
  userUnread: { color: '#111' },
  at: { color: '#888', fontSize: 12, marginLeft: 8 },
  last: { color: '#666', flex: 1 },
  lastUnread: { color: '#111', fontWeight: '600' },
  unreadBadge: { backgroundColor: '#e0245e', minWidth: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  unreadText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  archiveBtn: {
    backgroundColor: '#007aff',
    justifyContent: 'center',
    alignItems: 'center',
    width: 100,
    height: '100%',
    borderRadius: 12,
  },
  archiveText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  archiveBtn: {
    backgroundColor: '#007aff',
    justifyContent: 'center',
    alignItems: 'center',
    width: 100,
    height: '100%',
    borderRadius: 12,
  },
  archiveText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
