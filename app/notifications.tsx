import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getCurrentUser, getUserNotifications, markNotificationAsRead } from '../lib/firebaseHelpers';

export default function NotificationsScreen() {
    // Default avatar from Firebase Storage
    const DEFAULT_AVATAR_URL = 'https://firebasestorage.googleapis.com/v0/b/travel-app-3da72.firebasestorage.app/o/default%2Fdefault-pic.jpg?alt=media&token=7177f487-a345-4e45-9a56-732f03dbf65d';
  const router = useRouter();
  const [notifications, setNotifications] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function fetchNotifications() {
      const user = getCurrentUser();
      if (!user) return;
      const result = await getUserNotifications(user.uid);
      if (result.success && Array.isArray(result.data)) {
        setNotifications(result.data);
      }
      setLoading(false);
    }
    fetchNotifications();
  }, []);

  async function handleNotificationClick(notification: any) {
    // Mark as read
    if (!notification.read) {
      await markNotificationAsRead(notification.id);
      setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, read: true } : n));
    }

    // Instagram-style notification click logic
    switch (notification.type) {
      case 'follow-request':
        // Go to follow requests page (or profile requests)
        router.push('/privacy');
        break;
      case 'follow-approved':
        // Go to sender's profile
        if (notification.senderId) {
          router.push({ pathname: '/user-profile', params: { user: notification.senderId } } as any);
        }
        break;
      case 'follow':
      case 'new-follower':
        // Go to sender's profile
        if (notification.senderId) {
          router.push({ pathname: '/user-profile', params: { user: notification.senderId } } as any);
        }
        break;
      case 'like':
        // Go to post details
        if (notification.postId) {
          router.push({ pathname: '/post', params: { postId: notification.postId } } as any);
        }
        break;
      case 'comment':
        // Go to post details, scroll to comment
        if (notification.postId) {
          router.push({ pathname: '/post', params: { postId: notification.postId, commentId: notification.commentId } } as any);
        }
        break;
      case 'mention':
        // Go to post or comment where mentioned
        if (notification.postId) {
          router.push({ pathname: '/post', params: { postId: notification.postId, mentionId: notification.mentionId } } as any);
        }
        break;
      case 'dm':
      case 'message':
        // Go to DM/chat screen
        if (notification.senderId) {
          router.push({ pathname: '/dm', params: { otherUserId: notification.senderId } } as any);
        }
        break;
      case 'story-mention':
        // Go to story viewer
        if (notification.storyId) {
          router.push({ pathname: '/highlight/[id]', params: { id: notification.storyId } } as any);
        }
        break;
      case 'story-reply':
        // Go to DM/chat screen, highlight reply
        if (notification.senderId) {
          router.push({ pathname: '/dm', params: { otherUserId: notification.senderId, replyId: notification.replyId } } as any);
        }
        break;
      case 'tag':
        // Go to tagged post
        if (notification.postId) {
          router.push({ pathname: '/post', params: { postId: notification.postId, tagId: notification.tagId } } as any);
        }
        break;
      default:
        // Fallback: go to sender's profile
        if (notification.senderId) {
          router.push({ pathname: '/user-profile', params: { user: notification.senderId } } as any);
        }
        break;
    }
  }

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
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (hours < 1) return 'now';
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#007aff" />
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

      {notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Feather name="bell-off" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No notifications yet</Text>
          <Text style={styles.emptySubtext}>When someone likes or comments, you'll see it here</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={n => n.id}
          renderItem={({ item }) => (
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
