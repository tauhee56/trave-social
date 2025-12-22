import { useEffect, useState } from 'react';
import { getUserPosts, getUserProfile, getUserSections, getUserStories } from '../../src/_services/firebaseService';

function useProfileData(userId: string) {
  // Temporary ProfileData type definition
  type ProfileData = {
    id: string;
    name: string;
    avatar?: string;
    bio?: string;
    email?: string;
    website?: string;
  };
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
      // ...existing code...
      .finally(() => setLoading(false));
  }, [userId]);

  return { profile, posts, sections, stories, loading, error, followStatus };
}

export default useProfileData;
