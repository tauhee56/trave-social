import { useEffect, useState } from 'react';
import { getUserProfile } from '../../lib/firebaseHelpers/index';

const DEFAULT_AVATAR_URL = 'https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v1/default/default-pic.jpg';

export interface UserProfile {
  id: string;
  uid: string;
  name: string;
  username?: string;
  avatar: string;
  photoURL?: string;
  bio?: string;
  email?: string;
  website?: string;
}

function useUserProfile(userId: string | null | undefined) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // ...existing code...

  useEffect(() => {
    let isMounted = true;

    if (!userId) {
      setProfile(null);
      setLoading(false);
      setError(null);
      return () => {
        isMounted = false;
      };
    }

    setLoading(true);
    setError(null);

    (async () => {
      try {
        const res = await getUserProfile(String(userId));
        const data = (res && res.success && 'data' in res) ? (res as any).data : null;

        if (!isMounted) return;

        if (!data) {
          setProfile(null);
          setError((res as any)?.error || 'Failed to load profile');
          return;
        }

        const safeAvatar = data?.avatar || data?.photoURL || DEFAULT_AVATAR_URL;
        const safeName = data?.name || data?.displayName || data?.username || 'User';
        const safeUsername = data?.username || data?.displayName || '';

        setProfile({
          id: String(data?.id || data?._id || data?.uid || userId),
          uid: String(data?.uid || data?._id || userId),
          name: String(safeName),
          username: safeUsername ? String(safeUsername) : undefined,
          avatar: String(safeAvatar),
          photoURL: String(safeAvatar),
          bio: data?.bio,
          email: data?.email,
          website: data?.website,
        });
      } catch (e: any) {
        if (!isMounted) return;
        setProfile(null);
        setError(e?.message || 'Failed to load profile');
      } finally {
        if (!isMounted) return;
        setLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [userId]);

  return { profile, loading, error };
}

export default useUserProfile;
