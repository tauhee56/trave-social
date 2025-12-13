import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { collection, getDocs, query } from 'firebase/firestore';
import React from 'react';
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { db } from '../config/firebase';
import { getCurrentUser } from '../lib/firebaseHelpers';
import AcceptDeclineButtons from './_components/AcceptDeclineButtons';

export default function NotificationsScreen() {
    // Default avatar from Firebase Storage
    const DEFAULT_AVATAR_URL = 'https://firebasestorage.googleapis.com/v0/b/travel-app-3da72.firebasestorage.app/o/default%2Fdefault-pic.jpg?alt=media&token=7177f487-a345-4e45-9a56-732f03dbf65d';
  const router = useRouter();
  const [notifications, setNotifications] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  // Removed legacy globalThis/firebase usage

  // OPTIMIZATION: One-time fetch instead of real-time listener (saves Firebase reads)
  const fetchNotifications = async () => {
    const user = getCurrentUser();
    if (!user) {
      setLoading(false);
      setNotifications([]);
      return;
    }

    setLoading(true);
    try {
      const notifRef = collection(db, 'users', user.uid, 'notifications');
      const q = query(notifRef);
      const snapshot = await getDocs(q);

      const notifs = snapshot.docs.map((doc: any) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt || null,
        };
      });

      setNotifications(notifs);
      setLoading(false);
    } catch (error) {
      console.log('Notification fetch error:', error);
      setNotifications([]);
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchNotifications();
  }, []);

  // Refresh notifications when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      fetchNotifications();
    }, [])
  );

  function getNotificationIcon(type: string) {
    switch (type) {
      case 'like': return 'heart';
      case 'comment': return 'message-circle';
      case 'follow': return 'user-plus';
      case 'follow-request': return 'user-plus';
      case 'follow-approved': return 'user-check';
      case 'new-follower': return 'user-plus';
      case 'mention': return 'at-sign';
      case 'dm':
      case 'message': return 'send';
      case 'story-mention': return 'star';
      case 'story-reply': return 'message-square';
      case 'tag': return 'tag';
      default: return 'bell';
    }
  }

  function getNotificationColor(type: string) {
    switch (type) {
      case 'like': return '#FF6B00';
      case 'comment': return '#007aff';
      case 'follow': return '#FF6B00';
      case 'follow-request': return '#FF6B00';
      case 'follow-approved': return '#007aff';
      case 'new-follower': return '#FF6B00';
      case 'mention': return '#8b5cf6';
      case 'dm':
      case 'message': return '#007aff';
      case 'story-mention': return '#FF6B00';
      case 'story-reply': return '#007aff';
      case 'tag': return '#FF6B00';
      default: return '#666';
    }
  }

  function formatTime(timestamp: any) {
    if (!timestamp) return '';
    let date;
    if (timestamp.toDate) {
      date = timestamp.toDate();
    } else if (typeof timestamp === 'string' || typeof timestamp === 'number') {
      date = new Date(timestamp);
    } else {
      date = timestamp;
    }
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff/86400)}d ago`;
    return date.toLocaleDateString();
  }

  function handleNotificationClick(item: any) {
    let navRoute = '';
    if (item.type === 'follow' || item.type === 'follow-request' || item.type === 'new-follower') {
      navRoute = `/user-profile/${item.senderId}`;
    } else if (item.type === 'like' || item.type === 'tag') {
      if (!item.postId || typeof item.postId !== 'string' || item.postId.trim() === '') {
        alert('Notification missing postId. Cannot open post.');
        return;
      }
      navRoute = `/post/${item.postId}`;
    } else if (item.type === 'comment') {
      if (!item.postId || typeof item.postId !== 'string' || item.postId.trim() === '') {
        alert('Notification missing postId. Cannot open post.');
        return;
      }
      navRoute = `/post/${item.postId}?commentId=${item.commentId}`;
    } else if (item.type === 'dm' || item.type === 'message') {
      navRoute = `/dm?otherUserId=${item.senderId}`;
    } else if (item.type === 'story-mention' || item.type === 'story-reply') {
      navRoute = '/stories';
    } else {
      navRoute = `/user-profile/${item.senderId}`;
    }
    router.push(navRoute as any);
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}> 
        <View style={{ width: '100%', padding: 16 }}>
          {[1,2,3,4].map(i => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 18 }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#eee', marginRight: 8 }} />
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#eee', marginRight: 14 }} />
              <View style={{ flex: 1 }}>
                <View style={{ width: '60%', height: 16, borderRadius: 6, backgroundColor: '#eee', marginBottom: 6 }} />
                <View style={{ width: '40%', height: 13, borderRadius: 6, backgroundColor: '#eee' }} />
              </View>
            </View>
          ))}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color="#007aff" />
        </TouchableOpacity>
        <Text style={styles.title}>Notifications</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Bulk Actions */}
      <View style={{ flexDirection: 'row', gap: 12, margin: 12 }}>
        <TouchableOpacity
          style={{ backgroundColor: '#007aff', padding: 8, borderRadius: 8 }}
          onPress={async () => {
            try {
              // Mark all notifications as read
              const { db } = await import('../config/firebase');
              const { collection, getDocs, updateDoc, doc } = await import('firebase/firestore');
              const user = getCurrentUser();
              if (!user) return;
              const notifRef = collection(db, 'users', user.uid, 'notifications');
              const snap = await getDocs(notifRef);
              await Promise.all(snap.docs.map(d => updateDoc(doc(db, 'users', user.uid, 'notifications', d.id), { read: true })));
              alert('All notifications marked as read');
            } catch (err) {
              alert('Error marking all as read');
            }
          }}
        >
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>Mark All Read</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{ backgroundColor: '#FF3B30', padding: 8, borderRadius: 8 }}
          onPress={async () => {
            try {
              // Delete all notifications
              const { db } = await import('../config/firebase');
              const { collection, getDocs, deleteDoc, doc } = await import('firebase/firestore');
              const user = getCurrentUser();
              if (!user) return;
              const notifRef = collection(db, 'users', user.uid, 'notifications');
              const snap = await getDocs(notifRef);
              await Promise.all(snap.docs.map(d => deleteDoc(doc(db, 'users', user.uid, 'notifications', d.id))));
              alert('All notifications deleted');
            } catch (err) {
              alert('Error deleting all notifications');
            }
          }}
        >
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>Clear All</Text>
        </TouchableOpacity>
      </View>

      {notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Feather name="bell-off" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No notifications yet</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={n => n.id}
          initialNumToRender={15}
          maxToRenderPerBatch={10}
          windowSize={7}
          removeClippedSubviews={true}
          renderItem={({ item }) => (
            <View>
              <TouchableOpacity 
                style={[styles.nRow, !item.read && styles.nRowUnread]} 
                onPress={() => handleNotificationClick(item)}
              >
                <View style={[styles.iconContainer, { backgroundColor: getNotificationColor(item.type) + '15' }]}>
                  <Feather name={getNotificationIcon(item.type) as any} size={20} color={getNotificationColor(item.type)} />
                </View>
                <Image source={{ uri: item.senderAvatar && item.senderAvatar.trim() !== "" ? item.senderAvatar : DEFAULT_AVATAR_URL }} style={styles.nAvatar} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.nTitle}>
                    <Text style={{ fontWeight: '700', color: '#FF6B00' }}>{item.senderName}</Text>
                    <Text style={{ fontWeight: '400', color: '#444' }}> {item.message}</Text>
                  </Text>
                  <Text style={styles.nBody}>{formatTime(item.createdAt)}</Text>
                </View>
                {!item.read && <View style={styles.unreadDot} />}
              </TouchableOpacity>
              {/* Accept/Decline for follow-request notifications */}
              {item.type === 'follow-request' && (
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginRight: 24, marginBottom: 8 }}>
                  <AcceptDeclineButtons item={item} onActionTaken={(id) => {
                    setNotifications((prev) => prev.filter(n => n.id !== id));
                  }} />
                </View>
              )}
            </View>
          )}
          ItemSeparatorComponent={() => <View style={styles.nSep} />}
          contentContainerStyle={{ paddingBottom: 16 }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#fff' 
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#222',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },
  nRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
  },
  nRowUnread: {
    backgroundColor: '#f0f8ff',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  nAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 14,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#007aff',
    marginLeft: 8,
  },
  nTitle: {
    fontSize: 15,
    color: '#222',
    marginBottom: 2,
  },
  nBody: {
    fontSize: 13,
    color: '#999',
  },
  nSep: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginLeft: 74,
  },
});
