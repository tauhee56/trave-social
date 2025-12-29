import React from 'react';
import { Image } from 'react-native';
import useUserProfile from '../../src/_hooks/useUserProfile';

export default function CommentAvatar({ userId, userAvatar, size = 36 }: { userId: string, userAvatar?: string, size?: number }) {
  const { profile } = useUserProfile(userId);
  const avatar = profile?.avatar;

  return (
    <Image
      source={{ uri: avatar }}
      style={{ width: size, height: size, borderRadius: size / 2, marginRight: 12 }}
    />
  );
}
