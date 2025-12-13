import { Feather } from '@expo/vector-icons';
import React from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import { useUserProfile } from '../_hooks/useUserProfile';

export default function InboxRow({ item, router, unread, formatTime, DEFAULT_AVATAR_URL }: any) {
  // Use the hook to fetch the other user's profile
  // Fallback for missing otherUser
  // Guard against missing otherUser
  let otherUserId = '';
  if (item.otherUser && typeof item.otherUser.id === 'string') {
    otherUserId = item.otherUser.id;
  } else if (Array.isArray(item.participants) && item.currentUserId) {
    otherUserId = item.participants.find((uid: string) => uid !== item.currentUserId) || '';
  }
  const { username, avatar, loading } = useUserProfile(otherUserId);
  // Fallback for avatar
  const safeAvatar = typeof avatar === 'string' && avatar.trim() !== '' ? avatar : DEFAULT_AVATAR_URL;

  return (
    <TouchableOpacity
      style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16 }}
      onPress={() => {
        if (!otherUserId) return;
        router.push({ 
          pathname: '/dm', 
          params: { 
            conversationId: item.id,
            otherUserId: otherUserId,
            user: username
          } 
        });
      }}
    >
      <View style={[{ width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginRight: 12 }, unread > 0 && { borderWidth: 2, borderColor: '#f39c12' }]}>
        <Image 
          key={safeAvatar + username}
          source={{ uri: safeAvatar }} 
          style={{ 
            width: 56, 
            height: 56, 
            borderRadius: 28, 
            backgroundColor: '#eee', 
            borderWidth: 2, 
            borderColor: '#ccc' 
          }} 
        />
      </View>
      <View style={{ flex: 1, borderBottomWidth: 0, paddingRight: 8 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={[{ fontWeight: '700', fontSize: 15, color: '#111', flex: 1 }, unread > 0 && { color: '#111' }]} numberOfLines={1}>{username}</Text>
          <Text style={{ color: '#888', fontSize: 12, marginLeft: 8 }}>{formatTime(item.lastMessageAt)}</Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
          <Text style={[{ color: '#666', flex: 1 }, unread > 0 && { color: '#111', fontWeight: '600' }]} numberOfLines={1}>
            {typeof item.lastMessage === 'string' && item.lastMessage.trim() !== '' ? item.lastMessage : 'No messages yet'}
          </Text>
          {unread > 0 ? (
            <View style={{ backgroundColor: '#e0245e', minWidth: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 }}><Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>{unread > 9 ? '9+' : unread}</Text></View>
          ) : (
            <Feather name="chevron-right" size={18} color="#ccc" />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}
