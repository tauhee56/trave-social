import { Feather } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { useRouter } from 'expo-router';
import { collection, deleteDoc, doc, getDocs } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { db } from '../config/firebase';
import { useUser } from './_components/UserContext';

interface BlockedUser {
  id: string;
  userId: string;
  blockedAt: number;
  name?: string;
  avatar?: string;
  username?: string;
}

export default function SettingsScreen() {
  const router = useRouter();
  const user = useUser();
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [unblocking, setUnblocking] = useState<string | null>(null);

  useEffect(() => {
    loadBlockedUsers();
  }, [user?.uid]);

  const loadBlockedUsers = async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const blockedRef = collection(db, 'users', user.uid, 'blocked');
      const snap = await getDocs(blockedRef);
      const blocked: BlockedUser[] = [];
      
      // Fetch user details for each blocked user
      for (const docSnap of snap.docs) {
        const userId = docSnap.id;
        const data = docSnap.data();
        
        // Try to get user profile
        let name = 'Unknown User';
        let avatar = '';
        let username = '';
        
        try {
          const { doc, getDoc } = await import('firebase/firestore');
          const userSnap = await getDoc(doc(db, 'users', userId));
          if (userSnap.exists()) {
            const userData: any = userSnap.data();
            name = userData.name || userData.displayName || 'Unknown User';
            avatar = userData.avatar || userData.photoURL || '';
            username = userData.username || '';
          }
        } catch (e) {
          console.warn('Failed to fetch user details:', e);
        }
        
        blocked.push({
          id: docSnap.id,
          userId,
          blockedAt: data.blockedAt || Date.now(),
          name,
          avatar,
          username,
        });
      }
      
      setBlockedUsers(blocked);
    } catch (e) {
      console.error('Failed to load blocked users:', e);
    }
    setLoading(false);
  };

  const handleUnblock = async (userId: string) => {
    if (!user?.uid) return;
    
    Alert.alert(
      'Unblock User',
      'You will start seeing content from this user again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          onPress: async () => {
            setUnblocking(userId);
            try {
              await deleteDoc(doc(db, 'users', user.uid, 'blocked', userId));
              setBlockedUsers(prev => prev.filter(u => u.userId !== userId));
              Alert.alert('Success', 'User unblocked');
            } catch (e) {
              Alert.alert('Error', 'Failed to unblock user');
            }
            setUnblocking(null);
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Blocked Users</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f39c12" />
        </View>
      ) : (
        <>
          <TouchableOpacity
            style={styles.feedbackBtn}
            onPress={() => {
              Alert.alert(
                'Send Feedback',
                'Email your feedback or report an issue to support@travesocial.com',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Email', onPress: () => {
                    // Open mail client
                    import('react-native').then(({ Linking }) => {
                      Linking.openURL('mailto:support@travesocial.com?subject=App Feedback');
                    });
                  }}
                ]
              );
            }}
          >
            <Feather name="message-circle" size={18} color="#f39c12" />
            <Text style={styles.feedbackText}>Send Feedback / Report Issue</Text>
          </TouchableOpacity>

          {/* App Version & About Section */}
          <View style={styles.aboutBox}>
            <Text style={styles.aboutTitle}>About trave-social</Text>
            <Text style={styles.aboutText}>Version 1.0.0</Text>
            <Text style={styles.aboutText}>© 2025 tauhee56. All rights reserved.</Text>
            <Text style={styles.aboutText}>For help or feedback, email support@travesocial.com</Text>
          </View>

          <FlatList
            data={blockedUsers}
            keyExtractor={(item) => item.userId}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Feather name="slash" size={64} color="#ccc" />
                <Text style={styles.emptyTitle}>No Blocked Users</Text>
                <Text style={styles.emptySubtitle}>
                  When you block someone, they'll appear here
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={styles.userItem}>
                <ExpoImage
                  source={{ uri: item.avatar || 'https://via.placeholder.com/50x50.png?text=User' }}
                  style={styles.avatar}
                  contentFit="cover"
                  transition={200}
                />
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{item.name}</Text>
                  {item.username && (
                    <Text style={styles.userHandle}>@{item.username}</Text>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.unblockBtn}
                  onPress={() => handleUnblock(item.userId)}
                  disabled={unblocking === item.userId}
                >
                  {unblocking === item.userId ? (
                    <ActivityIndicator size="small" color="#007aff" />
                  ) : (
                    <Text style={styles.unblockText}>Unblock</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          />
        </>
      )}


    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  feedbackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbe6',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    margin: 16,
    marginBottom: 0,
    borderWidth: 1,
    borderColor: '#ffe0a3',
    shadowColor: '#f39c12',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  feedbackText: {
    marginLeft: 10,
    color: '#f39c12',
    fontWeight: '600',
    fontSize: 15,
  },
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
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingVertical: 8,
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#222',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#888',
    marginTop: 8,
    textAlign: 'center',
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#eee',
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
  },
  userHandle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  unblockBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#d0d0d0',
    minWidth: 90,
    alignItems: 'center',
  },
  unblockText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007aff',
  },
  aboutBox: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    marginBottom: 0,
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  aboutTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#222',
    marginBottom: 6,
  },
  aboutText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
});
