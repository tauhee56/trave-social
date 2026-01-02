import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Image, KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    addNotification,
    deleteMessage,
    editMessage,
    fetchMessages,
    // getCurrentUser,
    getOrCreateConversation,
    getUserProfile, isApprovedFollower,
    markConversationAsRead,
    reactToMessage,
    sendMessage,
    subscribeToMessages
} from '../lib/firebaseHelpers/index';
import { getFormattedActiveStatus, subscribeToUserPresence, updateUserOffline, updateUserPresence, UserPresence } from '../lib/userPresence';
import MessageBubble from '../src/_components/MessageBubble';
import useUserProfile from '../src/_hooks/useUserProfile';
import { useUser } from './_components/UserContext';

const DEFAULT_AVATAR_URL = 'https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v1/default/default-pic.jpg';

export default function DM() {
  const { user: paramUser, conversationId: paramConversationId, otherUserId, id } = useLocalSearchParams();
  const realOtherUserId = typeof id === 'string' ? id : otherUserId;
  const router = useRouter();
  const navigation = useNavigation();
  const currentUserTyped = useUser();
  
  // Use the hook to fetch and subscribe to the other user's profile
  const { profile: otherUserProfile, loading: profileLoading } = useUserProfile(
    typeof realOtherUserId === 'string' ? realOtherUserId : null
  );
  
  const username = otherUserProfile?.username;
  const avatar = otherUserProfile?.avatar;
  
  const [input, setInput] = useState("");
  const [canMessage, setCanMessage] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(
    typeof paramConversationId === 'string' ? paramConversationId : null
  );
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [lastMessageDoc, setLastMessageDoc] = useState<any>(null);
  const MESSAGES_PAGE_SIZE = 20;
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  // const currentUser = getCurrentUser();
  // const currentUserTyped = getCurrentUser() as { uid?: string } | null;
  // TODO: Use user from context or props

  // Message edit/delete states
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const [showMessageMenu, setShowMessageMenu] = useState(false);
  const [editingMessage, setEditingMessage] = useState<{ id: string; text: string } | null>(null);
  const [editText, setEditText] = useState('');
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{ id: string; text: string; senderId: string } | null>(null);
  
  // Track other user's active status
  const [otherUserPresence, setOtherUserPresence] = useState<UserPresence | null>(null);

  // Emoji reactions list (Instagram style)
  const REACTIONS = ['❤️', '😂', '😮', '😢', '😡', '👍'];

  // Check if selected message is sent by current user
  const isOwnMessage = selectedMessage && currentUserTyped?.uid && selectedMessage.senderId === currentUserTyped.uid;

  async function handleReaction(emoji: string) {
    if (!selectedMessage || !conversationId || !currentUserTyped?.uid) return;
    
    await reactToMessage(conversationId, selectedMessage.id, currentUserTyped.uid, emoji);
    setShowReactionPicker(false);
    setShowMessageMenu(false);
    setSelectedMessage(null);
  }

  useEffect(() => {
    let isMounted = true;
    
    const initializeDM = async () => {
      try {
        setLoading(true);
        
        // Step 1: Initialize conversation immediately
        if (!currentUserTyped?.uid || !realOtherUserId) {
          console.log('[DM] Missing user IDs, cannot initialize');
          setLoading(false);
          return;
        }

        // Get or create conversation ID
        const result = await getOrCreateConversation(
          String(currentUserTyped.uid),
          typeof realOtherUserId === 'string' ? realOtherUserId : ''
        );
        
        if (isMounted && result?.success && result?.conversationId) {
          setConversationId(result.conversationId);
          console.log('[DM] Conversation initialized:', result.conversationId);
        }
        
        // Step 2: Allow messaging (skip permission check - user can always message)
        setCanMessage(true);
      } catch (error) {
        console.error('[DM] Error initializing:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initializeDM();

    return () => { isMounted = false; };
  }, [currentUserTyped?.uid, realOtherUserId]);

  useEffect(() => {
    if (!conversationId) return;
    setMessages([]);
    setHasMoreMessages(true);
    setLoading(true);

    // Fetch initial messages from backend
    fetchMessages(conversationId).then(res => {
      setMessages(res.messages || []);
      setLoading(false);
    });

    // Subscribe to real-time messages via socket
    const unsub = subscribeToMessages(conversationId, (messages: any[]) => {
      setMessages(messages);
    });

    // Mark as read when opening conversation
    if (currentUserTyped && currentUserTyped.uid) {
      markConversationAsRead(conversationId, currentUserTyped.uid);
    }

    return () => {
      if (typeof unsub === 'function') unsub();
    };
    // eslint-disable-next-line
  }, [conversationId]);

  // Remove loadMessagesPage (pagination) for now; can be re-added with backend support
  const loadMessagesPage = () => {
    // Pagination disabled - all messages loaded on initial fetch
  };

  async function initializeConversation() {
    if (!currentUserTyped || !currentUserTyped.uid || !realOtherUserId) {
      setLoading(false);
      return;
    }

    if (conversationId) {
      setLoading(false);
      return;
    }

    // Create or get conversation
    const result = await getOrCreateConversation(
      String(currentUserTyped.uid),
      typeof realOtherUserId === 'string' ? realOtherUserId : ''
    );
    if (result && result.success && result.conversationId) {
      setConversationId(result.conversationId);
    }
    setLoading(false);
  }

  async function handleSend() {
    if (!input.trim() || !conversationId || !currentUserTyped || !currentUserTyped.uid || sending || !canMessage) return;

    const messageText = input.trim();
    const replyData = replyingTo;
    setInput("");
    setReplyingTo(null);
    setSending(true);

    try {
      // Update user as active when sending message
      await updateUserPresence(currentUserTyped.uid, conversationId);
      
      await sendMessage(conversationId, currentUserTyped.uid, messageText, undefined, replyData);
      // Send notification to recipient
      if (otherUserId && otherUserId !== currentUserTyped.uid) {
        // Fetch sender profile for name and avatar from backend
        let senderName = '';
        let senderAvatar = '';
        // TODO: Replace with backend API call to fetch sender profile
        // Example:
        // const response = await fetch(`/api/users/${currentUserTyped.uid}`);
        // const senderData = await response.json();
        // senderName = senderData.displayName || senderData.name || 'User';
        // senderAvatar = senderData.avatar || senderData.photoURL || DEFAULT_AVATAR_URL;
        await addNotification({
          recipientId: String(otherUserId),
          senderId: currentUserTyped.uid,
          senderName,
          senderAvatar,
          type: 'dm',
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

  async function handleEditMessage() {
    if (!editingMessage || !conversationId || !currentUserTyped?.uid) return;

    const result = await editMessage(
      conversationId,
      editingMessage.id,
      currentUserTyped.uid,
      editText.trim()
    );

    if (result.success) {
      setEditingMessage(null);
      setEditText('');
      // Messages will auto-update via real-time listener
    } else {
      Alert.alert('Error', result.error || 'Failed to edit message');
    }
  }

  async function handleDeleteMessage() {
    if (!selectedMessage || !conversationId || !currentUserTyped?.uid) return;

    Alert.alert(
      'Delete Message',
      'Are you sure you want to delete this message?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!conversationId || !currentUserTyped?.uid) return;
            const result = await deleteMessage(
              conversationId,
              selectedMessage.id,
              currentUserTyped.uid
            );

            if (result.success) {
              setShowMessageMenu(false);
              setSelectedMessage(null);
              // Messages will auto-update via real-time listener
            } else {
              Alert.alert('Error', result.error || 'Failed to delete message');
            }
          }
        }
      ]
    );
  }

  function formatTime(timestamp: any) {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }

  function renderMessage({ item }: { item: any }) {
    const isSelf = item.senderId === currentUserTyped?.uid;
    const reactions = item.reactions || {};
    const reactionsList = Object.entries(reactions);
    const hasReply = item.replyTo && item.replyTo.text;
    const isReplyFromSelf = item.replyTo?.senderId === currentUserTyped?.uid;

    return (
      <TouchableOpacity
        style={isSelf ? styles.msgRowSelf : styles.msgRow}
        onLongPress={() => {
          setSelectedMessage(item);
          setShowMessageMenu(true);
        }}
        activeOpacity={0.9}
      >
        {!isSelf && (
          <Image
            source={{ uri: avatar }}
            style={styles.msgAvatar}
          />
        )}
        <MessageBubble
          text={item.text}
          imageUrl={item.imageUrl}
          createdAt={item.createdAt}
          editedAt={item.editedAt}
          isSelf={isSelf}
          formatTime={formatTime}
          replyTo={item.replyTo}
          username={username}
          currentUserId={currentUserTyped?.uid}
        />
        {/* Reactions display */}
        {reactionsList.length > 0 && (
          <View style={[styles.reactionsContainer, isSelf ? styles.reactionsSelf : styles.reactionsOther]}>
            {reactionsList.map(([userId, emoji], index) => (
              <Text key={`${item.id}_${userId}_${index}`} style={styles.reactionEmoji}>{emoji as string}</Text>
            ))}
          </View>
        )}
      </TouchableOpacity>
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
            if (otherUserId) router.push(`/user-profile?id=${otherUserId}` as any);
          }}>
            <Image source={{ uri: avatar }} style={styles.avatar} />
            <View>
              <Text style={styles.title}>{username}</Text>
              <Text style={styles.activeText}>{getFormattedActiveStatus(otherUserPresence)}</Text>
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
              inverted
              onEndReached={() => {
                if (hasMoreMessages && !loading) loadMessagesPage();
              }}
              onEndReachedThreshold={0.2}
              removeClippedSubviews={true}
              maxToRenderPerBatch={12}
              windowSize={7}
              extraData={messages.length}
              initialNumToRender={12}
              ListFooterComponent={hasMoreMessages ? (
                <TouchableOpacity style={{ alignSelf: 'center', marginVertical: 10 }} onPress={loadMessagesPage}>
                  <Text style={{ color: '#007aff', fontSize: 15 }}>Load more messages</Text>
                </TouchableOpacity>
              ) : null}
            />
          )}
        </View>

        {/* Reply preview bar above input */}
        {replyingTo && (
          <View style={styles.replyBar}>
            <View style={styles.replyBarContent}>
              <View style={styles.replyBarLine} />
              <View style={{ flex: 1 }}>
                <Text style={styles.replyBarName}>
                  Replying to {replyingTo.senderId === currentUserTyped?.uid ? 'yourself' : username}
                </Text>
                <Text style={styles.replyBarText} numberOfLines={1}>
                  {replyingTo.text}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => setReplyingTo(null)} style={styles.replyBarClose}>
              <Feather name="x" size={20} color="#666" />
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.inputBar}>
          <View style={styles.inputWrap}>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.input}
                value={canMessage ? input : ''}
                onChangeText={text => {
                  if (canMessage) setInput(text);
                }}
                placeholder={canMessage ? "Message..." : "You can't message this user"}
                placeholderTextColor="#8e8e8e"
                multiline
                maxLength={500}
                editable={canMessage}
              />
            </View>
            <TouchableOpacity 
              style={[styles.sendBtnText, (!input.trim() || sending || !canMessage) && { opacity: 0.4 }]} 
              onPress={canMessage ? handleSend : undefined}
              disabled={!canMessage || !input.trim() || sending}
            >
              <Text style={styles.sendTextBlue}>{sending ? 'Sending...' : 'Send'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Message Menu Modal with Reactions */}
      <Modal visible={showMessageMenu} transparent animationType="fade">
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => {
            setShowMessageMenu(false);
            setSelectedMessage(null);
          }}
        >
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <View style={styles.menuModal}>
              {/* Reaction picker row */}
              <View style={styles.reactionPickerRow}>
                {REACTIONS.map((emoji) => (
                  <TouchableOpacity
                    key={emoji}
                    style={styles.reactionPickerBtn}
                    onPress={() => handleReaction(emoji)}
                  >
                    <Text style={styles.reactionPickerEmoji}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.menuDivider} />

              {/* Reply option */}
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setShowMessageMenu(false);
                  if (selectedMessage) {
                    setReplyingTo({
                      id: selectedMessage.id,
                      text: selectedMessage.text,
                      senderId: selectedMessage.senderId
                    });
                  }
                  setSelectedMessage(null);
                }}
              >
                <Feather name="corner-up-left" size={20} color="#007aff" />
                <Text style={styles.menuText}>Reply</Text>
              </TouchableOpacity>

              {/* Copy option */}
              <View style={styles.menuDivider} />
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  import('expo-clipboard').then(({ setStringAsync }) => {
                    if (selectedMessage?.text) {
                      setStringAsync(selectedMessage.text);
                    }
                  });
                  setShowMessageMenu(false);
                  setSelectedMessage(null);
                }}
              >
                <Feather name="copy" size={20} color="#007aff" />
                <Text style={styles.menuText}>Copy</Text>
              </TouchableOpacity>

              {/* Edit option - only for own messages */}
              {isOwnMessage && (
                <>
                  <View style={styles.menuDivider} />
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => {
                      setShowMessageMenu(false);
                      setEditingMessage({ id: selectedMessage.id, text: selectedMessage.text });
                      setEditText(selectedMessage.text);
                    }}
                  >
                    <Feather name="edit-2" size={20} color="#007aff" />
                    <Text style={styles.menuText}>Edit Message</Text>
                  </TouchableOpacity>
                </>
              )}

              {/* Delete option - only for own messages */}
              {isOwnMessage && (
                <>
                  <View style={styles.menuDivider} />
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => {
                      setShowMessageMenu(false);
                      handleDeleteMessage();
                    }}
                  >
                    <Feather name="trash-2" size={20} color="#e74c3c" />
                    <Text style={[styles.menuText, { color: '#e74c3c' }]}>Delete Message</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Edit Message Modal */}
      {editingMessage && (
        <Modal visible transparent animationType="fade">
          <KeyboardAvoidingView
            style={styles.editOverlay}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <TouchableOpacity
              style={{ flex: 1 }}
              activeOpacity={1}
              onPress={() => {
                setEditingMessage(null);
                setEditText('');
              }}
            />
            <View style={styles.editModal}>
              <View style={styles.editHeader}>
                <Text style={styles.editTitle}>Edit Message</Text>
                <TouchableOpacity onPress={() => {
                  setEditingMessage(null);
                  setEditText('');
                }}>
                  <Feather name="x" size={24} color="#222" />
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.editInput}
                value={editText}
                onChangeText={setEditText}
                multiline
                autoFocus
                maxLength={500}
                placeholder="Edit your message..."
                placeholderTextColor="#999"
              />

              <View style={styles.editActions}>
                <TouchableOpacity
                  style={[styles.editBtn, styles.cancelBtn]}
                  onPress={() => {
                    setEditingMessage(null);
                    setEditText('');
                  }}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.editBtn, styles.saveBtn, !editText.trim() && { opacity: 0.5 }]}
                  onPress={handleEditMessage}
                  disabled={!editText.trim()}
                >
                  <Text style={styles.saveBtnText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      )}
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
    marginHorizontal: 0,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  msgRowSelf: {
    flexDirection: 'row',
    marginBottom: 4,
    marginHorizontal: 0,
    justifyContent: 'flex-end',
  },
  msgAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8,
    backgroundColor: '#eee',
  },
  msgBubble: {
    position: 'relative',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: '78%',
    // subtle shadow
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  msgBubbleLeft: {
    backgroundColor: '#efefef',
  },
  msgBubbleRight: {
    backgroundColor: '#3797f0',
  },
  tailLeft: {
    position: 'absolute',
    left: -6,
    bottom: 8,
    width: 0,
    height: 0,
    borderTopWidth: 6,
    borderRightWidth: 6,
    borderTopColor: 'transparent',
    borderRightColor: '#efefef',
  },
  tailRight: {
    position: 'absolute',
    right: -6,
    bottom: 8,
    width: 0,
    height: 0,
    borderTopWidth: 6,
    borderLeftWidth: 6,
    borderTopColor: 'transparent',
    borderLeftColor: '#3797f0',
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
  msgFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  editedLabel: {
    fontStyle: 'italic',
    fontSize: 10,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuModal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '80%',
    maxWidth: 300,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  menuText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#eee',
  },
  reactionPickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  reactionPickerBtn: {
    padding: 8,
  },
  reactionPickerEmoji: {
    fontSize: 28,
  },
  reactionsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: -8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    alignSelf: 'flex-start',
  },
  reactionsSelf: {
    alignSelf: 'flex-end',
    marginRight: 8,
  },
  reactionsOther: {
    alignSelf: 'flex-start',
    marginLeft: 36,
  },
  reactionEmoji: {
    fontSize: 14,
    marginHorizontal: 1,
  },
  editOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  editModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  editHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  editTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222',
  },
  editInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    minHeight: 100,
    maxHeight: 200,
    textAlignVertical: 'top',
  },
  editActions: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 12,
  },
  editBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: '#f5f5f5',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },
  saveBtn: {
    backgroundColor: '#007aff',
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  // Reply styles
  replyPreview: {
    flexDirection: 'row',
    marginBottom: 4,
    paddingLeft: 8,
  },
  replyPreviewSelf: {
    alignSelf: 'flex-end',
  },
  replyPreviewOther: {
    alignSelf: 'flex-start',
    marginLeft: 0,
  },
  replyLine: {
    width: 3,
    backgroundColor: '#3797f0',
    borderRadius: 2,
    marginRight: 8,
  },
  replyContent: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    maxWidth: 200,
  },
  replyName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3797f0',
    marginBottom: 2,
  },
  replyText: {
    fontSize: 13,
    color: '#666',
  },
  replyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  replyBarContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  replyBarLine: {
    width: 3,
    height: 36,
    backgroundColor: '#3797f0',
    borderRadius: 2,
    marginRight: 10,
  },
  replyBarName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3797f0',
  },
  replyBarText: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  replyBarClose: {
    padding: 4,
  },
});
