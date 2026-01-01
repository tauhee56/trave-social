import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthLoading, useUser } from './_components/UserContext';
// import {} from '../lib/firebaseHelpers';
// @ts-ignore
import { useInboxPolling } from '../hooks/useInboxPolling';
import { archiveConversation } from '../lib/firebaseHelpers/archive';
import InboxRow from '../src/_components/InboxRow';

export default function Inbox() {
    // Default avatar from Firebase Storage
    const DEFAULT_AVATAR_URL = 'https://via.placeholder.com/200x200.png?text=Profile';
  const router = useRouter();
  const navigation = useNavigation();
  const currentUserTyped = useUser();
  const authLoading = useAuthLoading();
  
  console.log('🔵 INBOX COMPONENT RENDERED');
  
  // Use optimized polling instead of real-time listeners (saves 70-80% on costs)
  const { conversations: polledConversations, loading: polledLoading } = useInboxPolling(currentUserTyped?.uid || null, {
    pollingInterval: 15000, // Poll every 15 seconds instead of real-time
    autoStart: true
  });

  console.log('🟠 INBOX: polledLoading=', polledLoading, 'polledConversations.length=', polledConversations?.length);

  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(polledLoading);
  const [forceLoadTimeout, setForceLoadTimeout] = useState(false);

  useEffect(() => {
    // Only set loading if actually loading
    if (!polledLoading) {
      setLoading(false);
      setForceLoadTimeout(false); // Reset timeout flag when data loads successfully
      return;
    }
    
    setLoading(true);
    
    // Force clear loading after 15 seconds max to prevent infinite spinner
    // Only if we haven't already forced a timeout
    if (!forceLoadTimeout) {
      const timeoutId = setTimeout(() => {
        console.warn('⚠️ Inbox loading timeout - forcing display after 15s');
        setLoading(false);
        setForceLoadTimeout(true);
      }, 15000);
      return () => clearTimeout(timeoutId);
    }
  }, [polledLoading]);

  useEffect(() => {
    if (!currentUserTyped || !currentUserTyped.uid) {
      setConversations([]);
      return;
    }
    
    // Filter out private accounts that user is not approved follower of
    const filterPrivateAccounts = async (convos: any) => {
      const filteredConvos = Array.isArray(convos) ? await Promise.all(
        convos.map(async (convo: any) => {
          const otherUser = convo.otherUser;
          if (!otherUser) return convo;
          
          // If other user has private account
          if (otherUser.isPrivate) {
            // Check if current user is in their followers list (approved)
            const followers = otherUser.followers || [];
            const isApproved = followers.includes(currentUserTyped.uid);
            
            console.log(`🔒 Private account check: ${otherUser.name}, isApproved: ${isApproved}`);
            
            // Only show if approved follower
            return isApproved ? convo : null;
          }
          
          return convo;
        })
      ).then(results => results.filter(c => c !== null)) : [];
      
      return filteredConvos;
    };

    // Apply filtering to polled conversations
    filterPrivateAccounts(polledConversations).then(filtered => {
      setConversations(filtered);
    });
  }, [polledConversations, currentUserTyped?.uid]);

  function formatTime(timestamp: any) {
    if (!timestamp) return '';
    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
    if (!date) return '';
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (hours < 1) return 'now';
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    return date.toLocaleDateString();
  }
  console.log('🔵 INBOX CHECK: authLoading=', authLoading, 'currentUser=', currentUserTyped?.uid ? '✅' : '❌', 'uid:', currentUserTyped?.uid);

  if (authLoading) {
    console.log('🔴 SHOWING AUTH LOADING SPINNER');
    return (
      <SafeAreaView style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color="#007aff" />
        <Text style={{ color: '#999', marginTop: 10 }}>Loading...</Text>
      </SafeAreaView>
    );
  }

  if (!currentUserTyped || !currentUserTyped.uid) {
    console.log('🔴 USER NOT LOGGED IN');
    return (
      <SafeAreaView style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}> 
        <Text style={{ color: '#999', fontSize: 18, marginTop: 40 }}>Please sign in to view your messages.</Text>
      </SafeAreaView>
    );
  }

  // Show loading only if still loading AND no conversations yet
  if (loading && (!conversations || conversations.length === 0)) {
    return (
      <SafeAreaView style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}> 
        <ActivityIndicator size="large" color="#007aff" />
        <Text style={{ color: '#999', marginTop: 10 }}>Loading messages...</Text>
      </SafeAreaView>
    );
  }

  if (!conversations || conversations.length === 0) {
    console.log('Inbox: No conversations found for user', currentUserTyped?.uid, conversations);
    return (
      <SafeAreaView style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}> 
        <Text style={{ color: '#999', fontSize: 18, marginTop: 40 }}>No messages yet</Text>
      </SafeAreaView>
    );
  }
  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.headerRow}>
        <TouchableOpacity
          onPress={() => {
            router.replace('/(tabs)/home');
          }}
          style={[styles.backBtn, { minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center' }]}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Feather name="x" size={28} color="#000" />
        </TouchableOpacity>
        <Text style={[styles.title, { textAlign: 'center', flex: 1 }]}>Messages</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.topActions}>
        {/* Requests button removed as per user request */}
        <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/archive')}>
          <Feather name="archive" size={20} color="#007aff" />
          <Text style={styles.actionText}>Archive</Text>
        </TouchableOpacity>
      </View>

      {(!loading && conversations.length === 0) ? (
        (() => {
          console.log('Inbox: No conversations found', conversations);
          return (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
              <Feather name="message-circle" size={64} color="#ccc" />
              <Text style={{ color: '#999', marginTop: 16, fontSize: 16 }}>No messages found</Text>
              <Text style={{ color: '#ccc', marginTop: 8, textAlign: 'center' }}>Start a conversation by visiting someone&apos;s profile</Text>
            </View>
          );
        })()
      ) : (
        <FlatList
          data={conversations.filter(c => !c[`archived_${currentUserTyped?.uid}`])}
          keyExtractor={t => t.id}
          style={{ width: '100%' }}
          renderItem={({ item }) => (
            <Swipeable
              renderRightActions={() => (
                <TouchableOpacity
                  style={styles.archiveBtn}
                  onPress={async () => {
                    if (!currentUserTyped?.uid) return;
                    await archiveConversation(item.id, currentUserTyped.uid);
                    setConversations(conversations.filter(c => c.id !== item.id));
                  }}
                >
                  <Text style={styles.archiveText}>Archive</Text>
                </TouchableOpacity>
              )}
            >
              <InboxRow
                item={{
                  ...item,
                  currentUserId: currentUserTyped?.uid || '',
                  lastMessage: typeof item.lastMessage === 'string' ? item.lastMessage : '',
                  otherUser: item.otherUser || null
                }}
                router={router}
                unread={item.unread}
                formatTime={formatTime}
                DEFAULT_AVATAR_URL={DEFAULT_AVATAR_URL}
              />
            </Swipeable>
          )}
          ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: '#f5f5f5' }} />}
          contentContainerStyle={{ paddingBottom: 16 }}
          extraData={conversations}
          initialNumToRender={10}
          windowSize={7}
          maxToRenderPerBatch={10}
          removeClippedSubviews={true}
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
  headerRow: {
    paddingTop: 12,
    paddingBottom: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderBottomWidth: 0,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
    marginLeft: -30,
    color: '#000',
  },
  backBtn: {
    padding: 6
  },
  iconBtn: {
    padding: 6
  },
  topActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    gap: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  actionText: {
    marginLeft: 6,
    color: '#007aff',
    fontWeight: '600',
    fontSize: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
  },
  avatarRing: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  avatarRingUnread: {
    borderWidth: 2,
    borderColor: '#007aff'
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f0f0f0'
  },
  content: {
    flex: 1,
    paddingRight: 8
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  rowBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4
  },
  user: {
    fontWeight: '600',
    fontSize: 15,
    color: '#000',
    flex: 1
  },
  userUnread: {
    fontWeight: '700',
    color: '#000'
  },
  at: {
    color: '#999',
    fontSize: 12,
    marginLeft: 8
  },
  last: {
    color: '#666',
    fontSize: 14,
    flex: 1
  },
  lastUnread: {
    color: '#000',
    fontWeight: '600'
  },
  unreadBadge: {
    backgroundColor: '#007aff',
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6
  },
  unreadText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 11
  },
  archiveBtn: {
    backgroundColor: '#ff3b30',
    justifyContent: 'center',
    alignItems: 'center',
    width: 90,
    height: '100%',
  },
  archiveText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
});
