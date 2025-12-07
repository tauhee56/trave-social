import { useEffect, useState } from 'react';
import { getUserProfile } from '../../lib/firebaseHelpers/index';

const DEFAULT_AVATAR_URL = 'https://firebasestorage.googleapis.com/v0/b/travel-app-3da72.firebasestorage.app/o/default%2Fdefault-pic.jpg?alt=media&token=7177f487-a345-4e45-9a56-732f03dbf65d';

export interface UserProfile {
  id: string;
  uid: string;
  name: string;
  avatar: string;
  photoURL?: string;
  bio?: string;
  email?: string;
  website?: string;
}

export function useUserProfile(userId: string | null | undefined) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      setProfile(null);
      return;
    }

    let mounted = true;

    async function fetchProfile() {
      try {
        setLoading(true);
        setError(null);
        
        const result = await getUserProfile(userId as string);
        
        if (!mounted) return;

        if (result.success && 'data' in result && result.data) {
          // Ensure avatar always has a value
          const avatarUrl = result.data.avatar || result.data.photoURL || DEFAULT_AVATAR_URL;
          
          setProfile({
            ...result.data,
            avatar: avatarUrl,
            name: result.data.name || 'User',
          });
        } else {
          setError('Failed to load profile');
          setProfile(null);
        }
      } catch (err) {
        if (!mounted) return;
        console.error('useUserProfile error:', err);
        setError('An error occurred');
        setProfile(null);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    fetchProfile();

    return () => {
      mounted = false;
    };
  }, [userId]);

  return {
    profile,
    loading,
    error,
    username: profile?.name || 'User',
    avatar: profile?.avatar || DEFAULT_AVATAR_URL,
  };
}
