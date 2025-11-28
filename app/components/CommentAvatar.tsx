import React from 'react';
import { Image } from 'react-native';
import { useUserProfile } from '../hooks/useUserProfile';

export default function CommentAvatar({ userId, userAvatar, size = 36 }: { userId: string, userAvatar?: string, size?: number }) {
  const { avatar } = useUserProfile(userId);

  return (
    <Image
      source={{ uri: avatar }}
      style={{ width: size, height: size, borderRadius: size / 2, marginRight: 12 }}
    />
  );
}
