import React, { useEffect, useState } from 'react';
import { TouchableOpacity } from 'react-native';
import { getFormattedActiveStatus, subscribeToUserPresence, UserPresence } from '../../lib/userPresence';
import useUserProfile from '../../src/_hooks/useUserProfile';

export default function InboxRow({ item, router, unread, formatTime, DEFAULT_AVATAR_URL }: any) {
  let otherUserId = '';
  if (item.otherUser && typeof item.otherUser.id === 'string') {
    otherUserId = item.otherUser.id;
  } else if (Array.isArray(item.participants) && item.currentUserId) {
    otherUserId = item.participants.find((uid: string) => uid !== item.currentUserId) || '';
  }
  const { profile, loading } = useUserProfile(otherUserId);
  const username = profile?.username;
  const avatar = profile?.avatar;
  const [presence, setPresence] = useState<UserPresence | null>(null);
  useEffect(() => {
    if (!otherUserId) return;
    const unsubscribe = subscribeToUserPresence(otherUserId, (p) => {
      setPresence(p);
    });
    return () => unsubscribe?.();
  }, [otherUserId]);
  const safeAvatar = typeof avatar === 'string' && avatar.trim() !== '' ? avatar : DEFAULT_AVATAR_URL;
  const activeStatusText = getFormattedActiveStatus(presence);
  return (
    <TouchableOpacity>{/* ...existing code... */}</TouchableOpacity>
  );
}
