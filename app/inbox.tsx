import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'react-native';
// import { useAuthLoading, useUser } from './_components/UserContext';
// import {} from '../lib/firebaseHelpers';
// @ts-ignore
import { useInboxPolling } from '../hooks/useInboxPolling';
import { archiveConversation, deleteConversation } from '../lib/firebaseHelpers/archive';
import InboxRow from '../src/_components/InboxRow';
import { useUserProfile } from '../app/_hooks/useUserProfile';
import { apiService } from './_services/apiService';

// Helper component to show conversation with user profile
function ConversationItem({ item, userId, router, formatTime, conversations, setConversations, setOptimisticReadByOtherId, onOpenActions }: any) {
  const otherUserId = item.participants?.find((uid: string) => uid !== userId);
  const { profile, loading } = useUserProfile(otherUserId);
  const profileAny = profile as any;
  const username = profileAny?.username || profileAny?.displayName || profileAny?.name || otherUserId?.substring(0, 12) || 'User';
  const avatar = profileAny?.avatar || profileAny?.photoURL;
  const lastMsgPreview = item.lastMessage?.substring(0, 40) || 'No messages yet';
  
  const DEFAULT_AVATAR = 'https://res.cloudinary.com/dinwxxnzm/image/upload/v1/default/default-pic.jpg';
  const displayAvatar = avatar && avatar.trim() ? avatar : DEFAULT_AVATAR;
  
  return (
    <TouchableOpacity
      style={{
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f5f5f5',
        flexDirection: 'row',
        alignItems: 'center'
      }}
      onLongPress={() => {
        if (typeof onOpenActions === 'function') {
          onOpenActions(item, otherUserId, username);
        }
      }}
      delayLongPress={350}
      onPress={() => {
        if (!otherUserId) return;

        if (typeof setConversations === 'function') {
          setConversations((prev: any[]) => {
            if (!Array.isArray(prev)) return prev;
            return prev.map((c: any) => {
              const participants = Array.isArray(c?.participants) ? c.participants.map(String) : [];
              const otherId = participants.find((p: string) => p !== String(userId));
              if (otherId && otherId === String(otherUserId)) {
                return { ...c, unreadCount: 0 };
              }
              return c;
            });
          });
        }

        if (typeof setOptimisticReadByOtherId === 'function') {
          setOptimisticReadByOtherId((prev: any) => ({
            ...(prev || {}),
            [String(otherUserId)]: Date.now()
          }));
        }

        router.push({
          pathname: '/dm',
          params: {
            conversationId: item.conversationId || item.id || item._id,
            otherUserId: otherUserId,
            user: username
          }
        });
      }}
    >
      <Image
        source={{ uri: displayAvatar }}
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          marginRight: 12,
          backgroundColor: '#eee'
        }}
      />
      
      <View style={{ flex: 1 }}>
        <Text style={{ fontWeight: '700', fontSize: 15, color: '#000', marginBottom: 4 }}>
          {username}
        </Text>
        <Text style={{ color: '#666', fontSize: 13 }} numberOfLines={1}>
          {lastMsgPreview}
        </Text>
      </View>

      <View style={{ alignItems: 'flex-end' }}>
        <Text style={{ color: '#999', fontSize: 12 }}>
          {formatTime(item.lastMessageAt)}
        </Text>
        {typeof item?.unreadCount === 'number' && item.unreadCount > 0 ? (
          <View style={{ marginTop: 6, backgroundColor: '#e0245e', minWidth: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 }}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>{item.unreadCount > 9 ? '9+' : item.unreadCount}</Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

export default function Inbox() {
    // Default avatar from Firebase Storage
    const DEFAULT_AVATAR_URL = 'https://via.placeholder.com/200x200.png?text=Profile';
  const router = useRouter();
  const navigation = useNavigation();

  const handleClose = () => {
    try {
      const nav: any = navigation as any;
      if (nav?.canGoBack?.() && typeof nav.goBack === 'function') {
        nav.goBack();
        return;
      }
    } catch {}

    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/(tabs)/home');
  };
  
  // Get userId from AsyncStorage (token-based auth)
  const [userId, setUserId] = useState<string | null>(null);
  const [userLoading, setUserLoading] = useState(true);
  
  useEffect(() => {
    const getUser = async () => {
      try {
        const uid = await AsyncStorage.getItem('userId');
        console.log('📱 Inbox: Got userId from storage:', uid);
        setUserId(uid);
      } catch (error) {
        console.error('Error getting userId:', error);
      } finally {
        setUserLoading(false);
      }
    };
    getUser();
  }, []);
  
  // Use optimized polling instead of real-time listeners (saves 70-80% on costs)
  const { conversations: polledConversations, loading: polledLoading } = useInboxPolling(userId || null, {
    pollingInterval: 15000, // Poll every 15 seconds instead of real-time
    autoStart: true
  });

  console.log('🟠 INBOX: userId=', userId, 'userLoading=', userLoading, 'polledLoading=', polledLoading, 'polledConversations.length=', polledConversations?.length);

  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(polledLoading || userLoading);
  const [forceLoadTimeout, setForceLoadTimeout] = useState(false);
  const [optimisticReadByOtherId, setOptimisticReadByOtherId] = useState<Record<string, number>>({});

  const [actionsVisible, setActionsVisible] = useState(false);
  const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false);
  const [actionItem, setActionItem] = useState<any | null>(null);
  const [actionOtherUserId, setActionOtherUserId] = useState<string | null>(null);
  const [actionTitle, setActionTitle] = useState<string>('');

  const normalizeConversations = useCallback((raw: any[]) => {
    if (!Array.isArray(raw)) return [];

    return raw.map((convo: any) => {
      const participants = Array.isArray(convo?.participants) ? convo.participants.map(String) : [];
      const otherId = participants.find((p: string) => p !== String(userId));
      const optimisticTs = otherId ? optimisticReadByOtherId[String(otherId)] : undefined;
      const suppressUnread = typeof optimisticTs === 'number' && (Date.now() - optimisticTs) < 30000;

      return {
        ...convo,
        id: convo.id || convo._id,
        unreadCount: suppressUnread ? 0 : convo?.unreadCount
      };
    });
  }, [optimisticReadByOtherId, userId]);

  const refreshInbox = useCallback(async () => {
    if (!userId) return;
    try {
      const response = await apiService.get(`/conversations?userId=${userId}`);
      let convos = response?.data;
      if (!response?.success) convos = [];
      if (!Array.isArray(convos)) convos = [];
      setConversations(normalizeConversations(convos));
    } catch (err: any) {
      console.error('❌ Inbox refresh failed:', err?.message || err);
    }
  }, [normalizeConversations, userId]);

  const openActions = useCallback((item: any, otherId: string | null, title: string) => {
    setActionItem(item);
    setActionOtherUserId(otherId);
    setActionTitle(typeof title === 'string' ? title : 'Conversation');
    setConfirmDeleteVisible(false);
    setActionsVisible(true);
  }, []);

  const closeActions = useCallback(() => {
    setActionsVisible(false);
    setConfirmDeleteVisible(false);
  }, []);

  const handleArchive = useCallback(async () => {
    const conversationId = actionItem?.conversationId || actionItem?.id || actionItem?._id;
    if (!conversationId || !userId) return;

    closeActions();
    try {
      setConversations((prev: any[]) => {
        if (!Array.isArray(prev)) return prev;
        return prev.map((c: any) => {
          const cid = c?.conversationId || c?.id || c?._id;
          if (String(cid) === String(conversationId)) {
            return { ...c, isArchived: true, [`archived_${String(userId)}`]: true };
          }
          return c;
        });
      });

      const result = await archiveConversation(String(conversationId), String(userId));
      if (!result?.success) {
        await refreshInbox();
      }
    } catch {
      await refreshInbox();
    }
  }, [actionItem, closeActions, refreshInbox, userId]);

  const handleDelete = useCallback(async () => {
    const conversationId = actionItem?.conversationId || actionItem?.id || actionItem?._id;
    if (!conversationId || !userId) return;

    closeActions();
    try {
      setConversations((prev: any[]) => {
        if (!Array.isArray(prev)) return prev;
        return prev.filter((c: any) => {
          const participants = Array.isArray(c?.participants) ? c.participants.map(String) : [];
          const otherId = participants.find((p: string) => p !== String(userId));
          const cid = c?.conversationId || c?.id || c?._id;
          if (actionOtherUserId && otherId && String(otherId) === String(actionOtherUserId)) return false;
          return String(cid) !== String(conversationId);
        });
      });

      const result = await deleteConversation(String(conversationId), String(userId));
      if (!result?.success) {
        await refreshInbox();
      }
    } catch {
      await refreshInbox();
    }
  }, [actionItem, actionOtherUserId, closeActions, refreshInbox, userId]);

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
    if (!userId) {
      setConversations([]);
      return;
    }
    
    console.log('🔵 EFFECT TRIGGERED: polledConversations=', polledConversations?.length, 'userId=', userId);
    
    if (!Array.isArray(polledConversations) || polledConversations.length === 0) {
      console.log('🟠 No conversations to process');
      setConversations([]);
      return;
    }

    // Normalize IDs and apply optimistic unread suppression
    const normalizedConvos = normalizeConversations(polledConversations);
    
    console.log('🟢 SETTING CONVERSATIONS:', normalizedConvos?.length, 'convos');
    console.log('📋 First convo sample:', normalizedConvos?.[0]);
    setConversations(normalizedConvos);
  }, [polledConversations, userId, optimisticReadByOtherId]);

  // Immediate refresh when returning to Inbox (do not wait for next polling tick)
  useFocusEffect(
    useCallback(() => {
      if (!userId) return;

      let isActive = true;

      (async () => {
        await refreshInbox();
      })();

      return () => {
        isActive = false;
      };
    }, [refreshInbox, userId])
  );

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

  if (userLoading) {
    console.log('🔴 SHOWING USER LOADING SPINNER');
    return (
      <SafeAreaView style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color="#007aff" />
        <Text style={{ color: '#999', marginTop: 10 }}>Loading...</Text>
      </SafeAreaView>
    );
  }

  if (!userId) {
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
    console.log('🔴 NO CONVERSATIONS - Inbox: No conversations found for user', userId, 'conversations=', conversations);
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => {
              handleClose();
            }}
            style={[styles.backBtn, { minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center', zIndex: 10, elevation: 10 }]}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Feather name="x" size={28} color="#000" />
          </TouchableOpacity>
          <Text pointerEvents="none" style={[styles.title, { textAlign: 'center', flex: 1 }]}>Messages</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.emptyStateContainer}>
          <View style={styles.emptyIconWrapper}>
            <Feather name="send" size={64} color="#dbdbdb" strokeWidth={1} />
          </View>
          
          <Text style={styles.emptyTitle}>Your inbox is empty</Text>
          <Text style={styles.emptySubtitle}>Send a message to start a conversation</Text>
          
          <TouchableOpacity 
            style={styles.exploreBtn}
            onPress={() => router.push('/search-modal')}
          >
            <Text style={styles.exploreBtnText}>Find People</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.headerRow}>
        <TouchableOpacity
          onPress={() => {
            handleClose();
          }}
          style={[styles.backBtn, { minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center', zIndex: 10, elevation: 10 }]}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Feather name="x" size={28} color="#000" />
        </TouchableOpacity>
        <Text pointerEvents="none" style={[styles.title, { textAlign: 'center', flex: 1 }]}>Messages</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.topActions}>
        {/* Requests button removed as per user request */}
        <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/archive')}>
          <Feather name="archive" size={20} color="#007aff" />
          <Text style={styles.actionText}>Archive</Text>
        </TouchableOpacity>
      </View>

      {(() => {
        console.log('🟢 RENDERING: conversations.length=', conversations?.length, '| filtered data=', conversations?.filter(c => !c[`archived_${userId}`])?.length);
        
        if (!loading && conversations.length === 0) {
          console.log('🔴 NO CONVERSATIONS - Inbox: No conversations found', conversations);
          return (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
              <Feather name="message-circle" size={64} color="#ccc" />
              <Text style={{ color: '#999', marginTop: 16, fontSize: 16 }}>No messages found</Text>
              <Text style={{ color: '#ccc', marginTop: 8, textAlign: 'center' }}>Start a conversation by visiting someone&apos;s profile</Text>
            </View>
          );
        }
        
        const filteredConvosRaw = conversations.filter(c => !c[`archived_${userId}`]);
        const filteredConvosRawStable = filteredConvosRaw.filter((c: any) => {
          const archived = typeof c?.isArchived === 'boolean' ? c.isArchived : c?.[`archived_${userId}`];
          return !archived;
        });

        const getSortTime = (c: any) => {
          const t = c?.updatedAt || c?.lastMessageAt || c?.lastMessageTime || c?.createdAt;
          const d = t?.toDate ? t.toDate() : (t ? new Date(t) : null);
          return d && !Number.isNaN(d.getTime()) ? d.getTime() : 0;
        };

        // Frontend safety dedupe: 1 row per other participant; keep newest but sum unreadCount
        const map = new Map<string, any>();
        for (const c of filteredConvosRawStable) {
          const participants = Array.isArray(c?.participants) ? c.participants.map(String) : [];
          const otherId = participants.find((p: string) => p !== String(userId));
          const key = otherId || (c?.conversationId ? String(c.conversationId) : String(c?.id || c?._id));

          const existing = map.get(key);
          if (!existing) {
            map.set(key, c);
          } else {
            const aggregatedUnread = (existing?.unreadCount || 0) + (c?.unreadCount || 0);
            const keep = getSortTime(c) >= getSortTime(existing) ? c : existing;
            keep.unreadCount = aggregatedUnread;
            map.set(key, keep);
          }
        }

        const filteredConvos = Array.from(map.values()).sort((a, b) => getSortTime(b) - getSortTime(a));
        console.log('📋 FLATLIST DATA:', filteredConvos.length, 'items to render');
        
        if (filteredConvos.length > 0) {
          return (
            <FlatList
              data={filteredConvos}
              keyExtractor={(item, index) => item.conversationId || item.id || item._id || `convo-${index}`}
              style={{ width: '100%', flex: 1 }}
              renderItem={({ item, index }) => (
                <ConversationItem 
                  item={item} 
                  userId={userId}
                  router={router}
                  formatTime={formatTime}
                  conversations={conversations}
                  setConversations={setConversations}
                  setOptimisticReadByOtherId={setOptimisticReadByOtherId}
                  onOpenActions={openActions}
                />
              )}
              contentContainerStyle={{ paddingBottom: 16 }}
              scrollEnabled={true}
            />
          );
        }
        
        // No conversations after filter
        return (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <Text style={{ color: '#999' }}>All conversations archived</Text>
          </View>
        );
      })()}

      <Modal
        visible={actionsVisible}
        transparent
        animationType="fade"
        onRequestClose={closeActions}
      >
        <Pressable style={styles.actionSheetBackdrop} onPress={closeActions}>
          <Pressable style={styles.actionSheetContainer} onPress={() => {}}>
            <Text style={styles.actionSheetTitle} numberOfLines={1}>{actionTitle || 'Conversation'}</Text>

            <TouchableOpacity style={styles.actionSheetButton} activeOpacity={0.8} onPress={handleArchive}>
              <Feather name="archive" size={18} color="#007aff" />
              <Text style={styles.actionSheetButtonText}>Archive</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionSheetButton, styles.actionSheetDeleteButton]}
              activeOpacity={0.8}
              onPress={() => {
                setActionsVisible(false);
                setConfirmDeleteVisible(true);
              }}
            >
              <Feather name="trash-2" size={18} color="#ff3b30" />
              <Text style={[styles.actionSheetButtonText, styles.actionSheetDeleteText]}>Delete</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionSheetButton, styles.actionSheetCancelButton]} activeOpacity={0.8} onPress={closeActions}>
              <Text style={styles.actionSheetCancelText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={confirmDeleteVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmDeleteVisible(false)}
      >
        <Pressable style={styles.actionSheetBackdrop} onPress={() => setConfirmDeleteVisible(false)}>
          <Pressable style={styles.confirmContainer} onPress={() => {}}>
            <Text style={styles.confirmTitle}>Delete conversation?</Text>
            <Text style={styles.confirmSubtitle}>This will remove the conversation from your inbox.</Text>
            <View style={styles.confirmRow}>
              <TouchableOpacity style={[styles.confirmBtn, styles.confirmCancelBtn]} onPress={() => setConfirmDeleteVisible(false)}>
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.confirmBtn, styles.confirmDeleteBtn]} onPress={handleDelete}>
                <Text style={styles.confirmDeleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
  actionSheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  actionSheetContainer: {
    backgroundColor: '#fff',
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 18,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  actionSheetTitle: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
    marginBottom: 10,
  },
  actionSheetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
  },
  actionSheetButtonText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#111',
    fontWeight: '600',
  },
  actionSheetDeleteButton: {
    marginTop: 2,
  },
  actionSheetDeleteText: {
    color: '#ff3b30',
  },
  actionSheetCancelButton: {
    marginTop: 10,
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
  },
  actionSheetCancelText: {
    fontSize: 16,
    color: '#111',
    fontWeight: '700',
  },
  confirmContainer: {
    marginHorizontal: 22,
    marginBottom: 24,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
  },
  confirmTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111',
    marginBottom: 6,
  },
  confirmSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 14,
  },
  confirmRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  confirmBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginLeft: 10,
  },
  confirmCancelBtn: {
    backgroundColor: '#f5f5f5',
  },
  confirmCancelText: {
    fontWeight: '700',
    color: '#111',
  },
  confirmDeleteBtn: {
    backgroundColor: '#ff3b30',
  },
  confirmDeleteText: {
    fontWeight: '800',
    color: '#fff',
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
  emptyStateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 60,
  },
  emptyIconWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#999',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  exploreBtn: {
    backgroundColor: '#FFB800',
    paddingHorizontal: 28,
    paddingVertical: 10,
    borderRadius: 6,
    marginTop: 16,
  },
  exploreBtnText: {
    color: '#000',
    fontWeight: '600',
    fontSize: 15,
  },
});
