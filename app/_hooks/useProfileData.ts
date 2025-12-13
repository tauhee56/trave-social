import { useEffect, useState } from 'react';
import { getUserPosts, getUserProfile, getUserSections, getUserStories, sendFollowRequest, unfollowUser } from '../_services/firebaseService';

export function useProfileData(userId: string) {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [stories, setStories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [followStatus, setFollowStatus] = useState<'none' | 'pending' | 'approved'>('none');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getUserProfile(userId),
      getUserPosts(userId),
      getUserSections(userId),
      getUserStories(userId)
    ])
      .then(([profileData, postsData, sectionsData, storiesData]) => {
        setProfile(hasData<ProfileData>(profileData) ? profileData.data : null);
        setPosts(postsData.success && postsData.data ? postsData.data : []);
        setSections(sectionsData.success && sectionsData.data ? sectionsData.data : []);
        setStories(storiesData.success && storiesData.stories ? storiesData.stories : []);
        setFollowStatus(hasData<ProfileData>(profileData) && profileData.data.followStatus ? profileData.data.followStatus : 'none');
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load profile');
        setLoading(false);
      });
  }, [userId]);

  const handleFollow = async () => {
    setLoading(true);
    try {
      if (followStatus === 'none') {
        await sendFollowRequest(userId);
        setFollowStatus('pending');
      } else if (followStatus === 'pending') {
        await unfollowUser(userId);
        setFollowStatus('none');
      } else if (followStatus === 'approved') {
        await unfollowUser(userId);
        setFollowStatus('none');
      }
      setLoading(false);
    } catch (err: any) {
      setError(err.message || 'Follow action failed');
      setLoading(false);
    }
  };

  return { profile, posts, sections, stories, loading, error, followStatus, handleFollow };
}

// Add ProfileData type if not already defined
export type ProfileData = {
  uid: string;
  name: string;
  email?: string;
  avatar?: string;
  photoURL?: string;
  bio?: string;
  website?: string;
  followers?: any[];
  following?: any[];
  followStatus?: 'none' | 'pending' | 'approved';
  // Add other fields as needed
};

function hasData<T>(obj: any): obj is { success: true; data: T } {
  return obj && obj.success && 'data' in obj;
}
