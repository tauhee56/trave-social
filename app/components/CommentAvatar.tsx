import React, { useEffect, useState } from 'react';
import { Image } from 'react-native';
import { getUserProfile } from '../../lib/firebaseHelpers';

const DEFAULT_AVATAR_URL = 'https://firebasestorage.googleapis.com/v0/b/travel-app-3da72.firebasestorage.app/o/default%2Fdefault-pic.jpg?alt=media&token=7177f487-a345-4e45-9a56-732f03dbf65d';

export default function CommentAvatar({ userId, userAvatar }: { userId: string, userAvatar?: string }) {
  const [avatar, setAvatar] = useState<string>(userAvatar || DEFAULT_AVATAR_URL);

  useEffect(() => {
    if (!userAvatar || userAvatar.includes('default-pic.jpg')) {
      getUserProfile(userId).then(res => {
        if (res.success && res.data && typeof res.data.avatar === 'string' && res.data.avatar.trim() !== '') {
          setAvatar(res.data.avatar);
        } else if (res.success && res.data && typeof res.data.photoURL === 'string' && res.data.photoURL.trim() !== '') {
          setAvatar(res.data.photoURL);
        } else {
          setAvatar(DEFAULT_AVATAR_URL);
        }
      });
    } else {
      setAvatar(userAvatar);
    }
  }, [userId, userAvatar]);

  return (
    <Image
      source={{ uri: avatar }}
      style={{ width: 36, height: 36, borderRadius: 18, marginRight: 12 }}
    />
  );
}
