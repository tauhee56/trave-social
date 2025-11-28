import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Image, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    createNotification,
    getCurrentUser,
    getOrCreateConversation,
    getUserProfile, isApprovedFollower,
    markConversationAsRead,
    sendMessage,
    subscribeToMessages
} from '../lib/firebaseHelpers';
import { useUserProfile } from './hooks/useUserProfile';

const DEFAULT_AVATAR_URL = 'https://firebasestorage.googleapis.com/v0/b/travel-app-3da72.firebasestorage.app/o/default%2Fdefault-pic.jpg?alt=media&token=7177f487-a345-4e45-9a56-732f03dbf65d';

export default function DM() {
  const { user: paramUser, conversationId: paramConversationId, otherUserId } = useLocalSearchParams();
  const router = useRouter();
  const navigation = useNavigation();
  
  // Use the hook to fetch and subscribe to the other user's profile
  const { profile: otherUserProfile, loading: profileLoading, username, avatar } = useUserProfile(
    typeof otherUserId === 'string' ? otherUserId : null
  );
  
  const [input, setInput] = useState("");
  const [canMessage, setCanMessage] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(
    typeof paramConversationId === 'string' ? paramConversationId : null
  );
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const currentUser = getCurrentUser();

  useEffect(() => {
    initializeConversation();
    checkMessagingPermission();
  }, []);

  async function checkMessagingPermission() {
    if (!otherUserId || !currentUser) {
      setCanMessage(false);
      return;
    }
    const res = await getUserProfile(otherUserId);
    if (res.success && res.data) {
      const isPrivate = !!res.data.isPrivate;
      if (!isPrivate) {
        setCanMessage(true);
      } else {
        const approved = await isApprovedFollower(otherUserId, currentUser.uid);
        setCanMessage(approved);
      }
    } else {
      setCanMessage(false);
    }
  }

  useEffect(() => {
    if (!conversationId) return;

    // Mark as read when opening conversation
    if (currentUser) {
      markConversationAsRead(conversationId, currentUser.uid);
    }

    // Subscribe to real-time messages
    const unsubscribe = subscribeToMessages(conversationId, (newMessages) => {
      setMessages(newMessages);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [conversationId]);

  async function initializeConversation() {
    if (!currentUser || !otherUserId) {
      setLoading(false);
      return;
    }

    if (conversationId) {
      setLoading(false);
      return;
    }

    // Create or get conversation
    const result = await getOrCreateConversation(
      currentUser.uid, 
      typeof otherUserId === 'string' ? otherUserId : ''
    );
    
    if (result.success) {
      setConversationId(result.data.conversationId);
    }
    setLoading(false);
  }

  async function handleSend() {
    if (!input.trim() || !conversationId || !currentUser || sending || !canMessage) return;

    const messageText = input.trim();
    setInput("");
    setSending(true);

    try {
      await sendMessage(conversationId, currentUser.uid, messageText);
      // Send notification to recipient
      if (otherUserId && otherUserId !== currentUser.uid) {
        await createNotification({
          recipientId: String(otherUserId),
          senderId: currentUser.uid,
          senderName: currentUser.displayName || '',
          senderAvatar: currentUser.photoURL || '',
          type: 'mention',
          message: messageText
        });
      }
    } catch (error) {
      console.error('Send message error:', error);
    } finally {
      setSending(false);
      // Try to reload inbox if available
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new Event('reloadInbox'));
      }
    }
  }

  function formatTime(timestamp: any) {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }

  function renderMessage({ item }: { item: any }) {
    const isSelf = item.senderId === currentUser?.uid;

    return (
      <View style={isSelf ? styles.msgRowSelf : styles.msgRow}>
        {!isSelf && (
          <Image 
            source={{ uri: avatar }} 
            style={styles.msgAvatar} 
          />
        )}
        <View style={isSelf ? styles.msgBubbleRight : styles.msgBubbleLeft}>
          {item.imageUrl && (
            <Image source={{ uri: item.imageUrl }} style={styles.msgImage} />
          )}
          <Text style={isSelf ? styles.msgTextSelf : styles.msgText}>{item.text}</Text>
          <Text style={isSelf ? styles.msgTimeSelf : styles.msgTime}>{formatTime(item.createdAt)}</Text>
        </View>
      </View>
    );
  }

  if (loading || profileLoading) {
    return (
      <SafeAreaView style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]} edges={["top", "bottom"]}>
        <ActivityIndicator size="large" color="#007aff" />
      </SafeAreaView>
    );
  }
  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/inbox' as any);
            }
          }}>
            <Feather name="x" size={28} color="#000" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerUser} onPress={() => {
            if (otherUserId) router.push(`/user-profile?userId=${otherUserId}` as any);
          }}>
            <Image source={{ uri: avatar }} style={styles.avatar} />
            <View>
              <Text style={styles.title}>{username}</Text>
              <Text style={styles.activeText}>Active now</Text>
            </View>
          </TouchableOpacity>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.body}>
          {messages.length === 0 ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Feather name="message-circle" size={64} color="#ccc" />
              <Text style={styles.placeholder}>Start the conversation</Text>
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => item.id}
              renderItem={renderMessage}
              contentContainerStyle={{ paddingVertical: 10 }}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
              onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
            />
          )}
        </View>

        <View style={styles.inputBar}>
          <View style={styles.inputWrap}>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.input}
                value={input}
                onChangeText={setInput}
                placeholder={canMessage ? "Message..." : "You can't message this user"}
                placeholderTextColor="#8e8e8e"
                multiline
                maxLength={500}
                editable={canMessage}
              />
            </View>
            <TouchableOpacity 
              style={[styles.sendBtnText, (!input.trim() || sending || !canMessage) && { opacity: 0.4 }]} 
              onPress={handleSend}
              disabled={!input.trim() || sending || !canMessage}
            >
              <Text style={styles.sendTextBlue}>{sending ? 'Sending...' : 'Send'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 12,
      paddingVertical: 12,
      borderBottomWidth: 0.5,
      borderBottomColor: '#dbdbdb',
      backgroundColor: '#fff',
  },
  activeText: {
    fontSize: 11,
    color: '#8e8e8e',
    marginTop: 1,
  },
  inputBar: {
    borderTopWidth: 0.5,
    borderTopColor: '#dbdbdb',
    backgroundColor: '#fff',
    paddingBottom: 10,
    paddingTop: 10,
    paddingHorizontal: 12,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#dbdbdb',
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  iconBtn: {
    marginRight: 8,
  },
  inputBox: {
    flex: 1,
    marginRight: 8,
    maxHeight: 100,
  },
  input: {
    fontSize: 16,
    paddingVertical: 6,
    paddingHorizontal: 4,
    color: '#222',
  },
  sendBtn: {
    backgroundColor: '#3797f0',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 7,
  },
  sendBtnText: {
    paddingHorizontal: 4,
  },
  sendTextBlue: {
    color: '#3797f0',
    fontWeight: '700',
    fontSize: 15,
  },
  sendText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  backBtn: {
    paddingRight: 10,
    paddingVertical: 4,
  },
  headerUser: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
    backgroundColor: '#eee',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222',
  },
  body: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  msgRow: {
    flexDirection: 'row',
    marginBottom: 4,
    marginHorizontal: 12,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  msgRowSelf: {
    flexDirection: 'row',
    marginBottom: 4,
    marginHorizontal: 12,
    justifyContent: 'flex-end',
  },
  msgAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8,
    backgroundColor: '#eee',
  },
  msgBubbleLeft: {
    backgroundColor: '#efefef',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: '75%',
  },
  msgBubbleRight: {
    backgroundColor: '#3797f0',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: '75%',
  },
  msgText: {
    color: '#222',
    fontSize: 15,
  },
  msgTextSelf: {
    color: '#fff',
    fontSize: 15,
  },
  msgTime: {
    color: '#999',
    fontSize: 11,
    marginTop: 4,
  },
  msgTimeSelf: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    marginTop: 4,
  },
  msgImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    marginBottom: 8,
  },
  placeholder: {
    color: '#888',
    fontSize: 15,
    textAlign: 'center',
    marginTop: 20,
  },
});
