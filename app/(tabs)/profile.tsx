import { Feather, Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Image as ExpoImage } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { db } from '../../config/firebase';
import { useCurrentLocation } from '../../hooks/useCurrentLocation';
import { followUser, sendFollowRequest, unfollowUser } from '../../lib/firebaseHelpers/follow';
import { getUserSectionsSorted } from '../../lib/firebaseHelpers/getUserSectionsSorted';
import { likePost, unlikePost } from '../../lib/firebaseHelpers/post';
import { getUserHighlights, getUserPosts, getUserProfile, getUserStories } from '../../lib/firebaseHelpers/user';
import { getOptimizedImageUrl } from '../../lib/imageHelpers';
import { fetchBlockedUserIds, filterOutBlocked } from '../../services/moderation';
import { getKeyboardOffset, getModalHeight } from '../../utils/responsive';
import { CommentSection } from '../_components/CommentSection';
import CreateHighlightModal from '../_components/CreateHighlightModal';
import EditSectionsModal from '../_components/EditSectionsModal';
import HighlightCarousel from '../_components/HighlightCarousel';
import HighlightViewer from '../_components/HighlightViewer';
import PostViewerModal from '../_components/PostViewerModal';
import StoriesViewer from '../_components/StoriesViewer';
import { useUser } from '../_components/UserContext';

// Default avatar URL
const DEFAULT_AVATAR_URL = 'https://firebasestorage.googleapis.com/v0/b/travel-app-3da72.firebasestorage.app/o/default%2Fdefault-pic.jpg?alt=media&token=7177f487-a345-4e45-9a56-732f03dbf65d';
const DEFAULT_IMAGE_URL = DEFAULT_AVATAR_URL;

// Utility to parse/sanitize coordinates
function parseCoord(val: any): number | null {
  if (typeof val === 'number' && isFinite(val)) return val;
  if (typeof val === 'string') {
    const n = parseFloat(val);
    return isFinite(n) ? n : null;
  }
  return null;
}

// Types
const standardMapStyle = [
  { "featureType": "water", "elementType": "geometry", "stylers": [ { "color": "#aadaff" } ] },
  { "featureType": "landscape", "elementType": "geometry", "stylers": [ { "color": "#e5f5e0" } ] },
  { "featureType": "road", "elementType": "geometry", "stylers": [ { "color": "#ffffff" } ] },
  { "featureType": "road", "elementType": "labels.text.fill", "stylers": [ { "color": "#7b7b7b" } ] },
  { "featureType": "road", "elementType": "labels.text.stroke", "stylers": [ { "color": "#ffffff" } ] },
  { "featureType": "poi.park", "elementType": "geometry", "stylers": [ { "color": "#b6e5a8" } ] },
  { "featureType": "administrative", "elementType": "labels.text.fill", "stylers": [ { "color": "#495e6a" } ] },
  { "featureType": "poi", "elementType": "geometry", "stylers": [ { "color": "#e5e5e5" } ] },
  { "featureType": "transit", "elementType": "geometry", "stylers": [ { "color": "#f2f2f2" } ] },
  { "featureType": "landscape.natural", "elementType": "geometry", "stylers": [ { "color": "#d0f5d8" } ] },
  { "featureType": "landscape.man_made", "elementType": "geometry", "stylers": [ { "color": "#f8f8f8" } ] }
];

type Highlight = {
  id: string;
  title: string;
  coverImage: string;
  stories: { id: string; image: string }[];
};

// Marker component to keep map re-rendering until images load (or timeout)
const ProfilePostMarker: React.FC<{ lat: number; lon: number; imageUrl: string; avatarUrl: string; onPress: () => void }> = ({ lat, lon, imageUrl, avatarUrl, onPress }) => {
  const [tracks, setTracks] = useState(true);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [avatarLoaded, setAvatarLoaded] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setTracks(false), 20000); // allow very slow networks to finish
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (imgLoaded && avatarLoaded) setTracks(false);
  }, [imgLoaded, avatarLoaded]);
  
  // Use thumbnail for profile map markers (200px for small markers)
  const markerImageUrl = getOptimizedImageUrl(imageUrl, 'map-marker');
  const markerAvatarUrl = getOptimizedImageUrl(avatarUrl, 'thumbnail');

  return (
    <Marker coordinate={{ latitude: lat, longitude: lon }} tracksViewChanges={tracks} onPress={onPress}>
      <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={{ backgroundColor: 'transparent' }}>
        <View style={{ position: 'relative', width: 48, height: 48 }}>
          <View style={{ width: 48, height: 48, borderRadius: 12, borderWidth: 2, borderColor: '#ffa726', overflow: 'hidden', backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3, elevation: 3 }}>
            <ExpoImage
              source={{ uri: markerImageUrl }}
              style={{ width: 44, height: 44, borderRadius: 10 }}
              contentFit="cover"
              cachePolicy="memory-disk"
              priority="high"
              transition={150}
              onLoad={() => setImgLoaded(true)}
              onError={() => setImgLoaded(true)}
            />
          </View>
          <View style={{ position: 'absolute', top: -2, right: -2, width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#fff', backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 2, elevation: 4 }}>
            <ExpoImage
              source={{ uri: markerAvatarUrl }}
              style={{ width: 16, height: 16, borderRadius: 8 }}
              contentFit="cover"
              cachePolicy="memory-disk"
              priority="high"
              onLoad={() => setAvatarLoaded(true)}
              onError={() => setAvatarLoaded(true)}
            />
          </View>
        </View>
      </TouchableOpacity>
    </Marker>
  );
};

type ProfileData = {
  id: string;
  uid: string;
  name: string;
  username?: string;
  email: string;
  avatar: string;
  bio?: string;
  website?: string;
  location?: string;
  phone?: string;
  interests?: string;
  followersCount?: number;
  followingCount?: number;
  postsCount?: number;
  locationsCount?: number;
  followers?: string[];
  following?: string[];
  isPrivate?: boolean;
  approvedFollowers?: string[];
  followRequestPending?: boolean;
};

export default function Profile({ userIdProp }: any) {
  // Constants
  const POSTS_PER_PAGE = 12;

  // State and context
  const [storiesViewerVisible, setStoriesViewerVisible] = useState(false);
  const [userStories, setUserStories] = useState<any[]>([]);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [userMenuVisible, setUserMenuVisible] = useState(false);
  const [highlightViewerVisible, setHighlightViewerVisible] = useState(false);
  const [selectedHighlightId, setSelectedHighlightId] = useState<string | null>(null);
  const router = useRouter();
  const params = useLocalSearchParams();
  const authUser = useUser();
  const viewedUserId = typeof userIdProp !== 'undefined'
    ? userIdProp
    : (typeof params.user === 'string' ? params.user : (authUser?.uid as string | undefined));
  
  // Determine if viewing own profile
  const isOwnProfile = viewedUserId === authUser?.uid || (!params.user && !userIdProp);
  
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isPrivate, setIsPrivate] = useState(false);
  const [approvedFollower, setApprovedFollower] = useState(false);
  const [followRequestPending, setFollowRequestPending] = useState(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [posts, setPosts] = useState<any[]>([]);
  const [sections, setSections] = useState<{ name: string; postIds: string[]; coverImage?: string }[]>([]);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [postViewerVisible, setPostViewerVisible] = useState<boolean>(false);
  const [selectedPostIndex, setSelectedPostIndex] = useState<number>(0);
  const [segmentTab, setSegmentTab] = useState<'grid' | 'map' | 'tagged'>('grid');
  const { location: currentLocation } = useCurrentLocation();
  const [taggedPosts, setTaggedPosts] = useState<any[]>([]);
  const [editSectionsModal, setEditSectionsModal] = useState<boolean>(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [likedPosts, setLikedPosts] = useState<{ [key: string]: boolean }>({});
  const [savedPosts, setSavedPosts] = useState<{ [key: string]: boolean }>({});
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [commentModalPostId, setCommentModalPostId] = useState<string>('');
  const [commentModalAvatar, setCommentModalAvatar] = useState<string>('');
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [createHighlightModalVisible, setCreateHighlightModalVisible] = useState(false);
  const isFollowing = !!(profile?.followers || []).includes(authUser?.uid || '');
  const visiblePosts = selectedSection
    ? posts.filter((p: any) => (sections.find((s: any) => s.name === selectedSection)?.postIds || []).includes(p.id))
    : posts;

  // Handlers
  const handleFollowToggle = async () => {
    if (!authUser?.uid || !viewedUserId || followLoading || isOwnProfile) return;
    setFollowLoading(true);
    try {
      if (isPrivate) {
        const res = await sendFollowRequest(authUser.uid, viewedUserId);
        if (res.success) {
          setFollowRequestPending(true);
        }
      } else {
        if (isFollowing) {
          const res = await unfollowUser(authUser.uid, viewedUserId);
          setApprovedFollower(false);
          if (res.success) {
            setProfile((prev) => prev ? { ...prev, followers: (prev.followers || []).filter((id: string) => id !== authUser.uid), followersCount: Math.max(0, (prev.followersCount || 1) - 1) } : prev);
          }
        } else {
          const res = await followUser(authUser.uid, viewedUserId);
          if (res.success) {
            setProfile((prev) => prev ? { ...prev, followers: [...(prev.followers || []), authUser.uid], followersCount: (prev.followersCount || 0) + 1 } : prev);
          }
        }
      }
    } catch (err) {}
    setFollowLoading(false);
  };

  const handleMessage = () => {
    if (!viewedUserId || !profile) return;
    
    // Check if account is private and user is not approved follower
    if (isPrivate && !approvedFollower) {
      Alert.alert('Private Account', 'You need to be an approved follower to send messages to this user.');
      return;
    }
    
    router.push({
      pathname: '/dm',
      params: {
        otherUserId: viewedUserId,
        user: profile.name || 'User',
        avatar: profile.avatar || ''
      }
    });
  };

  const handleLikePost = async (post: any) => {
    if (!authUser?.uid || !post?.id) return;
    if (likedPosts[post.id]) {
      await unlikePost(post.id, authUser.uid);
      setLikedPosts(prev => ({ ...prev, [post.id]: false }));
    } else {
      await likePost(post.id, authUser.uid);
      setLikedPosts(prev => ({ ...prev, [post.id]: true }));
    }
  };

  const handleSavePost = async (post: any) => {
    if (!authUser?.uid || !post?.id) return;

    const isSaved = savedPosts[post.id];

    try {
      const { db } = await import('../../config/firebase');
      const { doc, updateDoc, arrayUnion, arrayRemove, setDoc, deleteDoc } = await import('firebase/firestore');

      if (isSaved) {
        // Unsave
        const postRef = doc(db, 'posts', post.id);
        await updateDoc(postRef, { savedBy: arrayRemove(authUser.uid) });
        const userSavedRef = doc(db, 'users', authUser.uid, 'saved', post.id);
        await deleteDoc(userSavedRef);
        setSavedPosts(prev => ({ ...prev, [post.id]: false }));
      } else {
        // Save
        const postRef = doc(db, 'posts', post.id);
        await updateDoc(postRef, { savedBy: arrayUnion(authUser.uid) });
        const userSavedRef = doc(db, 'users', authUser.uid, 'saved', post.id);
        await setDoc(userSavedRef, { savedAt: Date.now() });
        setSavedPosts(prev => ({ ...prev, [post.id]: true }));
      }
    } catch (error) {
      console.error('Error saving/unsaving post:', error);
    }
  };

  const handleSharePost = (post: any) => {
    import('react-native').then(({ Share }) => {
      Share.share({
        message: post.caption ? `${post.caption}\n${post.imageUrl || post.imageUrls?.[0]}` : (post.imageUrl || post.imageUrls?.[0] || ''),
        url: post.imageUrl || post.imageUrls?.[0],
        title: 'Check out this post!'
      });
    });
  };

  // Block user handler
  const handleBlockUser = async () => {
    if (!authUser?.uid || !viewedUserId || isOwnProfile) return;
    
    Alert.alert(
      'Block User',
      `Block ${profile?.name || 'this user'}?\n\nThey won't be able to find your profile, posts, or stories. They won't be notified that you blocked them.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            try {
              // Add to blocked list
              await setDoc(doc(db, 'users', authUser.uid, 'blocked', viewedUserId), {
                blockedAt: serverTimestamp(),
                userId: viewedUserId,
              });
              
              // Also unfollow if following
              if (isFollowing) {
                await unfollowUser(authUser.uid, viewedUserId);
              }
              
              // Remove from your followers if they follow you
              const theyFollowYou = profile?.followers?.includes(authUser.uid);
              if (theyFollowYou) {
                await unfollowUser(viewedUserId, authUser.uid);
              }
              
              setUserMenuVisible(false);
              Alert.alert('Blocked', `${profile?.name || 'User'} has been blocked.`, [
                { text: 'OK', onPress: () => router.back() }
              ]);
            } catch (error) {
              console.error('Error blocking user:', error);
              Alert.alert('Error', 'Failed to block user. Please try again.');
            }
          }
        }
      ]
    );
  };

  // Report user handler
  const handleReportUser = () => {
    setUserMenuVisible(false);
    Alert.alert(
      'Report User',
      'What would you like to report?',
      [
        { text: 'Spam', onPress: () => submitReport('spam') },
        { text: 'Inappropriate Content', onPress: () => submitReport('inappropriate') },
        { text: 'Harassment', onPress: () => submitReport('harassment') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const submitReport = async (reason: string) => {
    if (!authUser?.uid || !viewedUserId) return;
    
    try {
      const { addDoc, collection } = await import('firebase/firestore');
      await addDoc(collection(db, 'reports'), {
        reportedUserId: viewedUserId,
        reportedBy: authUser.uid,
        reason,
        createdAt: serverTimestamp(),
        status: 'pending',
      });
      Alert.alert('Report Submitted', 'Thank you for your report. We will review it shortly.');
    } catch (error) {
      console.error('Error submitting report:', error);
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    }
  };

  // Add missing highlight handler
  const handlePressHighlight = (highlight: Highlight) => {
    setSelectedHighlightId(highlight.id);
    setHighlightViewerVisible(true);
  };

  // Effects
  useFocusEffect(
    React.useCallback(() => {
      setLoading(true);
      const fetchData = async () => {
        try {
          // Fetch profile
          const profileRes = await getUserProfile(viewedUserId || '');
          if (profileRes.success) {
            let profileData: ProfileData | null = null;
            if ('data' in profileRes && profileRes.data && typeof profileRes.data === 'object') profileData = profileRes.data as ProfileData;
            else if ('profile' in profileRes && profileRes.profile && typeof profileRes.profile === 'object') profileData = profileRes.profile as ProfileData;
            setProfile(profileData);
            setIsPrivate(profileData?.isPrivate || false);
            setApprovedFollower(profileData?.approvedFollowers?.includes(authUser?.uid || '') || false);
            setFollowRequestPending(profileData?.followRequestPending || false);
          } else {
            setProfile(null);
          }
          // Fetch posts
          const postsRes = await getUserPosts(viewedUserId || '');
          let postsData: any[] = [];
          if (postsRes.success) {
            if ('data' in postsRes && Array.isArray(postsRes.data)) postsData = postsRes.data;
            else if ('posts' in postsRes && Array.isArray(postsRes.posts)) postsData = postsRes.posts;
            const blocked = authUser?.uid ? await fetchBlockedUserIds(authUser.uid) : new Set<string>();
            setPosts(filterOutBlocked(postsData, blocked));
          } else {
            setPosts([]);
          }
          // Fetch sections (sorted by user's preferred order)
          let sectionsData: any[] = [];
          if (viewedUserId) {
            const sectionsRes = await getUserSectionsSorted(viewedUserId);
            if (sectionsRes.success) {
              if ('data' in sectionsRes && Array.isArray(sectionsRes.data)) sectionsData = sectionsRes.data;
              else if ('sections' in sectionsRes && Array.isArray(sectionsRes.sections)) sectionsData = sectionsRes.sections;
              setSections(sectionsData);
            } else {
              setSections([]);
            }
          } else {
            setSections([]);
          }
          // Fetch highlights
          const highlightsRes = await getUserHighlights(viewedUserId || '');
          let highlightsData: any[] = [];
          if (highlightsRes.success) {
            if ('data' in highlightsRes && Array.isArray(highlightsRes.data)) highlightsData = highlightsRes.data;
            else if ('highlights' in highlightsRes && Array.isArray(highlightsRes.highlights)) highlightsData = highlightsRes.highlights;
            setHighlights(highlightsData);
          } else {
            setHighlights([]);
          }
        } catch (err) {
          console.log(err);
        }
        setLoading(false);
      };

      fetchData();
    }, [viewedUserId, authUser?.uid])
  );

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const profileRes = await getUserProfile(viewedUserId);
      let profileData: ProfileData | null = null;
      if (profileRes.success) {
        if ('data' in profileRes && profileRes.data && typeof profileRes.data === 'object') profileData = profileRes.data as ProfileData;
        else if ('profile' in profileRes && profileRes.profile && typeof profileRes.profile === 'object') profileData = profileRes.profile as ProfileData;
        setProfile(profileData);
        setIsPrivate(profileData?.isPrivate || false);
        setApprovedFollower(profileData?.approvedFollowers?.includes(authUser?.uid || '') || false);
        setFollowRequestPending(profileData?.followRequestPending || false);
      } else {
        setProfile(null);
      }
      const postsRes = await getUserPosts(viewedUserId);
      let postsData: any[] = [];
      if (postsRes.success) {
        if ('data' in postsRes && Array.isArray(postsRes.data)) postsData = postsRes.data;
        else if ('posts' in postsRes && Array.isArray(postsRes.posts)) postsData = postsRes.posts;
        const blocked = authUser?.uid ? await fetchBlockedUserIds(authUser.uid) : new Set<string>();
        // Show all posts (no pagination limit for now)
        const filteredPosts = filterOutBlocked(postsData, blocked);
        setPosts(filteredPosts);

        // Initialize liked and saved states for posts
        if (authUser?.uid) {
          const likedState: { [key: string]: boolean } = {};
          const savedState: { [key: string]: boolean } = {};
          filteredPosts.forEach((post: any) => {
            likedState[post.id] = post.likes?.includes(authUser.uid) || false;
            savedState[post.id] = post.savedBy?.includes(authUser.uid) || false;
          });
          setLikedPosts(likedState);
          setSavedPosts(savedState);
        }
      } else {
        setPosts([]);
      }
        // ...existing code...
      // Fetch tagged posts
      try {
        if (viewedUserId) {
          const { collection, query, where, getDocs } = await import('firebase/firestore');
          const taggedQ = query(collection(db, 'posts'), where('taggedUsers', 'array-contains', viewedUserId));
          const taggedSnap = await getDocs(taggedQ);
          const tagged = taggedSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          const blocked = authUser?.uid ? await fetchBlockedUserIds(authUser.uid) : new Set<string>();
          setTaggedPosts(filterOutBlocked(tagged, blocked));
        } else {
          setTaggedPosts([]);
        }
      } catch (err) {
        console.error('Error fetching tagged posts:', err);
        setTaggedPosts([]);
      }
      const sectionsRes = await getUserSectionsSorted(viewedUserId);
      let sectionsData: any[] = [];
      if (sectionsRes.success) {
        if ('data' in sectionsRes && Array.isArray(sectionsRes.data)) sectionsData = sectionsRes.data;
        else if ('sections' in sectionsRes && Array.isArray(sectionsRes.sections)) sectionsData = sectionsRes.sections;
        setSections(sectionsData);
      } else {
        setSections([]);
      }
      const highlightsRes = await getUserHighlights(viewedUserId);
      let highlightsData: any[] = [];
      if (highlightsRes.success) {
        if ('data' in highlightsRes && Array.isArray(highlightsRes.data)) highlightsData = highlightsRes.data;
        else if ('highlights' in highlightsRes && Array.isArray(highlightsRes.highlights)) highlightsData = highlightsRes.highlights;
        setHighlights(highlightsData);
      } else {
        setHighlights([]);
      }
      setLoading(false);
    }
    loadData();
  }, [viewedUserId]);

  // Render helpers
  const renderSkeletonPosts = () => (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 0 }}>
      {Array.from({ length: POSTS_PER_PAGE }).map((_, idx) => (
        <View key={idx} style={{ flexBasis: '25%', aspectRatio: 1, padding: 1 }}>
          <View style={{ backgroundColor: '#eee', borderRadius: 8, width: '100%', height: '100%' }} />
        </View>
      ))}
    </View>
  );

  // UI
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header for other users' profiles with back button and 3-dots menu */}
      {!isOwnProfile && (
        <View style={styles.profileHeader}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBackBtn}>
            <Feather name="arrow-left" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{profile?.username || profile?.name || 'Profile'}</Text>
          <TouchableOpacity onPress={() => setUserMenuVisible(true)} style={styles.headerMenuBtn}>
            <Feather name="more-vertical" size={24} color="#000" />
          </TouchableOpacity>
        </View>
      )}
      
      {loading && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99, backgroundColor: 'rgba(255,255,255,0.7)', justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#007aff" />
        </View>
      )}
      <ScrollView contentContainerStyle={styles.content}>
        {/* Avatar centered */}
        <View style={styles.avatarContainer}>
          <View style={{ position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                // If own profile and has stories, open StoriesViewer
                if (isOwnProfile) {
                  // Fetch user's stories and show StoriesViewer
                  getUserStories(viewedUserId || '').then(res => {
                    if (res.success && Array.isArray(res.stories) && res.stories.length > 0) {
                      setUserStories(res.stories);
                      setStoriesViewerVisible(true);
                    } else {
                      alert('No stories found');
                    }
                  });
                }
              }}
            >
              <ExpoImage
                source={{ uri: profile?.avatar || authUser?.photoURL || DEFAULT_AVATAR_URL }}
                style={[styles.avatar, isPrivate && !isOwnProfile && !approvedFollower && { opacity: 0.3 }]}
                contentFit="cover"
                transition={200}
                cachePolicy="memory-disk"
              />
              {isPrivate && !isOwnProfile && !approvedFollower && (
                <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 60 }}>
                  <Ionicons name="lock-closed" size={40} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
            {/* Avatar change logic for own profile */}
            {isOwnProfile && (
              <TouchableOpacity
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10 }}
                activeOpacity={0.6}
                onPress={async () => {
                  try {
                    // Pick image
                    const picker = await import('expo-image-picker');
                    const result = await picker.launchImageLibraryAsync({ 
                      mediaTypes: picker.MediaTypeOptions.Images, 
                      allowsEditing: true, 
                      aspect: [1, 1], 
                      quality: 0.8,
                      base64: false // Don't get base64, we handle it ourselves
                    });
                    
                    if (!result.canceled && result.assets && result.assets[0]?.uri && authUser?.uid) {
                      try {
                        // Upload image with proper error handling
                        const { uploadImage: uploadImageFn, updateUserProfile } = await import('../../lib/firebaseHelpers');
                        const imageUri = result.assets[0].uri;
                        
                        if (!imageUri) {
                          alert('Image URI is invalid');
                          return;
                        }
                        
                        const uploadRes = await uploadImageFn(imageUri, `avatars/${authUser.uid}`);
                        
                        if (uploadRes.success && uploadRes.url) {
                          // Update backend profile
                          const updateRes = await updateUserProfile(authUser.uid, { avatar: uploadRes.url });
                          // Update Firebase Auth user photoURL
                          try {
                            const { updateProfile } = await import('firebase/auth');
                            await updateProfile(authUser, { photoURL: uploadRes.url });
                          } catch (e) {
                            console.log('Failed to update Firebase Auth photoURL:', e);
                          }
                          if (updateRes.success) {
                            setProfile(prev => prev ? { ...prev, avatar: uploadRes.url ?? '' } : prev);
                            alert('Profile picture updated!');
                          } else {
                            alert('Failed to update profile avatar: ' + (updateRes.error || 'Unknown error'));
                          }
                        } else {
                          alert('Image upload failed: ' + (uploadRes.error || 'Unknown error'));
                        }
                      } catch (uploadError: any) {
                        console.error('Avatar upload error:', uploadError);
                        alert('Error uploading image: ' + uploadError.message);
                      }
                    }
                  } catch (error: any) {
                    console.error('Image picker error:', error);
                    alert('Error picking image: ' + error.message);
                  }
                }}
              />
            )}
            {/* Add story button overlay for own profile */}
            {isOwnProfile && (
              <TouchableOpacity
                style={{ position: 'absolute', bottom: 0, right: 0, backgroundColor: '#007aff', borderRadius: 16, width: 32, height: 32, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#fff', zIndex: 2 }}
                onPress={() => {
                  // Open story add modal (navigate to story add or trigger upload)
                  // You can replace this with your story add logic
                  // For now, just alert
                  alert('Add a new story');
                }}
              >
                <Feather name="plus" size={20} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Stats row: Locations | Posts | Followers | Following */}
        <View style={styles.statsRow}>
          {(!isPrivate || isOwnProfile || approvedFollower) ? (
            <>
              <View style={styles.statItem}>
                <Text style={styles.statNum}>{Array.from(new Set(posts.filter(p => p.location && p.location.name).map(p => p.location.name))).length}</Text>
                <Text style={styles.statLbl}>Locations</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNum}>{posts.length}</Text>
                <Text style={styles.statLbl}>Posts</Text>
              </View>
              <TouchableOpacity 
                style={styles.statItem}
                onPress={() => {
                  if (!isPrivate || isOwnProfile || approvedFollower) {
                    router.push(`/friends?userId=${viewedUserId}&tab=followers` as any);
                  }
                }}
                disabled={isPrivate && !isOwnProfile && !approvedFollower}
              >
                <Text style={styles.statNum}>{profile?.followersCount ?? (profile?.followers?.length || 0)}</Text>
                <Text style={styles.statLbl}>Followers</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.statItem}
                onPress={() => {
                  if (!isPrivate || isOwnProfile || approvedFollower) {
                    router.push(`/friends?userId=${viewedUserId}&tab=following` as any);
                  }
                }}
                disabled={isPrivate && !isOwnProfile && !approvedFollower}
              >
                <Text style={styles.statNum}>{profile?.followingCount ?? (profile?.following?.length || 0)}</Text>
                <Text style={styles.statLbl}>Following</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={{ paddingVertical: 20, alignItems: 'center' }}>
              <Ionicons name="lock-closed" size={32} color="#999" />
              <Text style={{ marginTop: 8, fontSize: 14, color: '#999', textAlign: 'center' }}>This account is private</Text>
              <Text style={{ fontSize: 13, color: '#999', textAlign: 'center', marginTop: 4 }}>Follow to see their stats and posts</Text>
            </View>
          )}
        </View>

        {/* Name + Bio + Website + Location + Phone + Interests */}
        <View style={styles.infoBlock}>
          <Text style={styles.displayName}>{profile?.name || 'User'}</Text>
            {!!profile?.username && <Text style={styles.username}>@{profile.username}</Text>}
          {!!profile?.bio && <Text style={styles.bio}>{profile.bio}</Text>}
          {!!profile?.website && (!isPrivate || isOwnProfile || approvedFollower) && <Text style={styles.website}>🔗 {profile.website}</Text>}
          {!!(profile as any)?.location && (!isPrivate || isOwnProfile || approvedFollower) && <Text style={styles.location}>📍 {(profile as any).location}</Text>}
          {!!(profile as any)?.phone && (!isPrivate || isOwnProfile || approvedFollower) && <Text style={styles.phone}>📱 {(profile as any).phone}</Text>}
          {!!(profile as any)?.interests && (!isPrivate || isOwnProfile || approvedFollower) && <Text style={styles.interests}>✨ {(profile as any).interests}</Text>}
          {/* Only show follow button for other users, and only once */}
          {/* Only show follow button for other users in pillRow below, not here */}
        </View>

        {/* Pill buttons: Profile | Sections | Passport (only show for own profile) */}
        {isOwnProfile && (
          <View style={styles.pillRow}>
            <TouchableOpacity style={styles.pillBtn} onPress={() => router.push('/edit-profile' as any)}>
              <Ionicons name="person-outline" size={16} color="#000" style={{ marginRight: 4 }} />
              <Text style={styles.pillText}>Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.pillBtn} onPress={() => setEditSectionsModal(true)}>
              <Ionicons name="albums-outline" size={16} color="#000" style={{ marginRight: 4 }} />
              <Text style={styles.pillText}>Sections</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.pillBtn} onPress={() => router.push('/passport' as any)}>
              <Ionicons name="map-outline" size={16} color="#000" style={{ marginRight: 4 }} />
              <Text style={styles.pillText}>Passport</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Highlights carousel (Instagram-style) - only show for own profile or approved followers */}
        {(!isPrivate || isOwnProfile || approvedFollower) && (
          <View style={{ marginBottom: 4, marginTop: 4 }}>
            <HighlightCarousel highlights={highlights} onPressHighlight={handlePressHighlight} isOwnProfile={isOwnProfile} onAddHighlight={() => setCreateHighlightModalVisible(true)} />
          {/* StoriesViewer for own stories */}
          {storiesViewerVisible && (
            <Modal
              visible={storiesViewerVisible}
              transparent={false}
              animationType="fade"
              onRequestClose={() => setStoriesViewerVisible(false)}
            >
              <StoriesViewer
                stories={userStories}
                onClose={() => setStoriesViewerVisible(false)}
              />
            </Modal>
          )}
            <HighlightViewer
              visible={highlightViewerVisible}
              highlightId={selectedHighlightId}
              onClose={() => setHighlightViewerVisible(false)}
            />
          </View>
        )}

        {/* Follow/Unfollow button for other users' profiles */}
        {!isOwnProfile && (
          <View style={styles.pillRow}>
            <TouchableOpacity style={[styles.followBtn, isFollowing && styles.followingBtn]} onPress={handleFollowToggle} disabled={followLoading}>
              <Text style={[styles.followText, isFollowing && styles.followingText]}>
                {isFollowing ? (followLoading ? 'Unfollowing...' : 'Following') : (followLoading ? 'Following...' : 'Follow')}
              </Text>
            </TouchableOpacity>
            {(!isPrivate || approvedFollower) && (
              <>
                <TouchableOpacity style={styles.pillBtn} onPress={handleMessage}>
                  <Ionicons name="chatbubble-outline" size={16} color="#000" style={{ marginRight: 4 }} />
                  <Text style={styles.pillText}>Message</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.pillBtn} onPress={() => router.push({ pathname: '/passport', params: { user: viewedUserId } })}>
                  <Ionicons name="map-outline" size={16} color="#000" style={{ marginRight: 4 }} />
                  <Text style={styles.pillText}>Passport</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        {/* Icon-based segment control: grid | map | tagged - only show if not private or approved */}
        {(!isPrivate || isOwnProfile || approvedFollower) && (
          <View style={styles.segmentControl}>
            <TouchableOpacity
              style={[styles.segmentBtn, segmentTab === 'grid' && styles.segmentBtnActive]}
              onPress={() => {
                setSegmentTab('grid');
                setSelectedSection(null); // Clear section filter when clicking grid icon
              }}
            >
              <Ionicons name="grid-outline" size={24} color={segmentTab === 'grid' ? '#000' : '#999'} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.segmentBtn, segmentTab === 'map' && styles.segmentBtnActive]} onPress={() => setSegmentTab('map')}>
              <Ionicons name="location-outline" size={24} color={segmentTab === 'map' ? '#000' : '#999'} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.segmentBtn, segmentTab === 'tagged' && styles.segmentBtnActive]} onPress={() => setSegmentTab('tagged')}>
              <Ionicons name="pricetag-outline" size={24} color={segmentTab === 'tagged' ? '#000' : '#999'} />
            </TouchableOpacity>
          </View>
        )}

        {/* Map view - only show if not private or approved */}
        {(!isPrivate || isOwnProfile || approvedFollower) && segmentTab === 'map' && (
          <View style={styles.mapContainer}>
            <MapView
              style={styles.map}
              initialRegion={currentLocation ? {
                latitude: currentLocation.latitude,
                longitude: currentLocation.longitude,
                latitudeDelta: 0.0922,
                longitudeDelta: 0.0421,
              } : {
                latitude: 37.78825,
                longitude: -122.4324,
                latitudeDelta: 0.0922,
                longitudeDelta: 0.0421,
              }}
              customMapStyle={standardMapStyle}
            >
              {posts.filter(p => {
                const lat = parseCoord(p.location?.latitude ?? p.location?.lat ?? p.lat ?? p.locationData?.lat);
                const lon = parseCoord(p.location?.longitude ?? p.location?.lon ?? p.lon ?? p.locationData?.lon);
                return lat !== null && lon !== null;
              }).map((post) => {
                const lat = parseCoord(post.location?.latitude ?? post.location?.lat ?? post.lat ?? post.locationData?.lat);
                const lon = parseCoord(post.location?.longitude ?? post.location?.lon ?? post.lon ?? post.locationData?.lon);
                if (lat === null || lon === null) return null;
                const imageUrl = post.imageUrl || (Array.isArray(post.imageUrls) && post.imageUrls.length > 0 ? post.imageUrls[0] : DEFAULT_IMAGE_URL);
                const avatarUrl = post.userAvatar || profile?.avatar || authUser?.photoURL || DEFAULT_AVATAR_URL;
                
                // Marker with tracksViewChanges true until images are loaded
                return (
                  <ProfilePostMarker
                    key={`post-${post.id}`}
                    lat={lat}
                    lon={lon}
                    imageUrl={imageUrl}
                    avatarUrl={avatarUrl}
                    onPress={() => {
                      const postIndex = posts.findIndex(p => p.id === post.id);
                      setSelectedPostIndex(postIndex);
                      setPostViewerVisible(true);
                    }}
                  />
                );
              })}
            </MapView>
          </View>
        )}

        {/* Sections horizontal scroller - only show if not private or approved */}
        {(!isPrivate || isOwnProfile || approvedFollower) && segmentTab === 'grid' && sections.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sectionsScroller} contentContainerStyle={{ paddingHorizontal: 12, gap: 12 }}>
            {sections.map((s) => (
              <TouchableOpacity
                key={`section-${s.name}`}
                style={styles.sectionCard}
                activeOpacity={0.7}
                onPress={() => setSelectedSection(selectedSection === s.name ? null : s.name)}
              >
                <ExpoImage
                  source={{ uri: s.coverImage || posts.find(p => s.postIds?.includes?.(p.id))?.imageUrl || DEFAULT_AVATAR_URL }}
                  style={styles.sectionCover}
                  contentFit="cover"
                  transition={200}
                />
                <Text style={[styles.sectionLabel, selectedSection === s.name && styles.sectionLabelActive]}>{s.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Posts grid by segment tab - only show if not private or approved */}
        {(!isPrivate || isOwnProfile || approvedFollower) && segmentTab !== 'map' && (
          <View style={styles.grid}>
            {/* Posts */}
            {loading ? renderSkeletonPosts() : (segmentTab === 'grid' ? (selectedSection ? visiblePosts : posts) : taggedPosts).map((p, index) => {
              const currentPostsArray = segmentTab === 'grid' ? (selectedSection ? visiblePosts : posts) : taggedPosts;
              return (
                <TouchableOpacity
                  key={p.id}
                  style={styles.gridItem}
                  activeOpacity={0.8}
                  onPress={() => {
                    // Find correct index in the posts array being passed to modal
                    const modalIndex = currentPostsArray.findIndex(post => post.id === p.id);
                    setSelectedPostIndex(modalIndex >= 0 ? modalIndex : index);
                    setPostViewerVisible(true);
                  }}
                >
                  <ExpoImage
                    source={{ uri: p.thumbnailUrl || p.imageUrl || p.imageUrls?.[0] || DEFAULT_IMAGE_URL }}
                    style={{ width: '100%', height: '100%' }}
                    contentFit="cover"
                    transition={200}
                    cachePolicy="memory-disk"
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Instagram-style Post Viewer */}
      <PostViewerModal
        visible={postViewerVisible}
        onClose={() => setPostViewerVisible(false)}
        posts={segmentTab === 'grid' ? (selectedSection ? visiblePosts : posts) : taggedPosts}
        selectedPostIndex={selectedPostIndex}
        profile={profile}
        authUser={authUser}
        likedPosts={likedPosts}
        savedPosts={savedPosts}
        handleLikePost={handleLikePost}
        handleSavePost={handleSavePost}
        handleSharePost={handleSharePost}
        setCommentModalPostId={(id) => setCommentModalPostId(id || '')}
        setCommentModalAvatar={setCommentModalAvatar}
        setCommentModalVisible={setCommentModalVisible}
      />

      <Modal visible={commentModalVisible} animationType="slide" transparent={true} onRequestClose={() => setCommentModalVisible(false)}>
        <KeyboardAvoidingView
          style={{ flex: 1, justifyContent: 'flex-end' }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={getKeyboardOffset()}
        >
          <View style={{ flex: 1, justifyContent: 'flex-end' }}>
            <TouchableOpacity
              style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}
              activeOpacity={1}
              onPress={() => setCommentModalVisible(false)}
            />
            <View
              style={{
                backgroundColor: '#fff',
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                paddingTop: 18,
                paddingHorizontal: 16,
                maxHeight: getModalHeight(0.9),
                shadowColor: '#000',
                shadowOpacity: 0.08,
                shadowRadius: 8,
                elevation: 8,
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 0,
              }}
            >
              <View style={{ alignItems: 'center', marginBottom: 8 }}>
                <View style={{ width: 40, height: 4, backgroundColor: '#ddd', borderRadius: 2, marginBottom: 8 }} />
                <Text style={{ fontWeight: '700', fontSize: 17, color: '#222' }}>Comments</Text>
              </View>
              {!!commentModalPostId && (
                <CommentSection
                  postId={commentModalPostId}
                  postOwnerId={posts.find(p => p.id === commentModalPostId)?.userId || ''}
                  currentAvatar={commentModalAvatar}
                />
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit sections modal */}
      {viewedUserId && (
        <EditSectionsModal
          visible={editSectionsModal}
          onClose={() => setEditSectionsModal(false)}
          userId={viewedUserId}
          sections={sections}
          posts={posts}
          onSectionsUpdate={setSections}
        />
      )}

      {/* Create Highlight Modal */}
      <CreateHighlightModal
        visible={createHighlightModalVisible}
        onClose={() => setCreateHighlightModalVisible(false)}
        userId={authUser?.uid || ''}
        onSuccess={async () => {
          // Refresh highlights after creating new one
          if (viewedUserId) {
            const highlightsRes = await getUserHighlights(viewedUserId);
            let highlightsData: any[] = [];
            if (highlightsRes.success) {
              if ('data' in highlightsRes && Array.isArray(highlightsRes.data)) highlightsData = highlightsRes.data;
              else if ('highlights' in highlightsRes && Array.isArray(highlightsRes.highlights)) highlightsData = highlightsRes.highlights;
              setHighlights(highlightsData);
            }
          }
        }}
      />

      {/* User Menu Modal (for other users' profiles) - Block, Report options */}
      <Modal
        visible={userMenuVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setUserMenuVisible(false)}
      >
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setUserMenuVisible(false)}
        >
          <View style={styles.menuSheet}>
            {/* Handle */}
            <View style={styles.menuHandle} />
            
            {/* Menu Options */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleBlockUser}
            >
              <View style={[styles.menuIconContainer, { backgroundColor: '#fee' }]}>
                <Ionicons name="ban-outline" size={22} color="#e74c3c" />
              </View>
              <Text style={[styles.menuItemText, { color: '#e74c3c' }]}>Block</Text>
            </TouchableOpacity>

            <View style={styles.menuSeparator} />

            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleReportUser}
            >
              <View style={[styles.menuIconContainer, { backgroundColor: '#fff5e6' }]}>
                <Ionicons name="flag-outline" size={22} color="#f39c12" />
              </View>
              <Text style={styles.menuItemText}>Report</Text>
            </TouchableOpacity>

            <View style={styles.menuSeparator} />

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setUserMenuVisible(false);
                // Share profile
                import('react-native').then(({ Share }) => {
                  Share.share({
                    message: `Check out ${profile?.name || 'this user'}'s profile on Trave Social!`,
                    title: 'Share Profile'
                  });
                });
              }}
            >
              <View style={[styles.menuIconContainer, { backgroundColor: '#e8f4fd' }]}>
                <Ionicons name="share-outline" size={22} color="#0095f6" />
              </View>
              <Text style={styles.menuItemText}>Share Profile</Text>
            </TouchableOpacity>

            <View style={styles.menuSeparator} />

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setUserMenuVisible(false);
                // Copy profile URL
                import('expo-clipboard').then(async (Clipboard) => {
                  await Clipboard.setStringAsync(`trave-social://user/${viewedUserId}`);
                  Alert.alert('Copied', 'Profile link copied to clipboard');
                }).catch(() => {
                  Alert.alert('Error', 'Could not copy link');
                });
              }}
            >
              <View style={[styles.menuIconContainer, { backgroundColor: '#f0f0f0' }]}>
                <Ionicons name="link-outline" size={22} color="#666" />
              </View>
              <Text style={styles.menuItemText}>Copy Profile URL</Text>
            </TouchableOpacity>

            {/* Cancel Button */}
            <TouchableOpacity
              style={styles.menuCancelBtn}
              onPress={() => setUserMenuVisible(false)}
            >
              <Text style={styles.menuCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
    headerBackBtn: { padding: 8, marginRight: 8 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#222', flex: 1, textAlign: 'center' },
    headerMenuBtn: { padding: 8, marginLeft: 8 },
    menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.25)', justifyContent: 'flex-end' },
    menuSheet: { backgroundColor: '#fff', borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingBottom: 24, paddingTop: 8, minHeight: 120 },
    menuHandle: { width: 40, height: 4, backgroundColor: '#ddd', borderRadius: 2, alignSelf: 'center', marginVertical: 8 },
    menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 18, borderBottomWidth: 1, borderBottomColor: '#f4f4f4' },
    menuIconContainer: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
    menuItemText: { fontSize: 16, color: '#222', fontWeight: '500' },
  container: { flex: 1, backgroundColor: '#fff' },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: '#e0e0e0', justifyContent: 'space-between' },
  topIcon: { padding: 4 },
  topTitle: { fontSize: 16, fontWeight: '600', color: '#000' },
  content: { paddingHorizontal: 0, paddingBottom: 0 },
  avatarContainer: { alignItems: 'center', paddingVertical: 12, marginTop: 4 },
  avatar: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#eee', borderWidth: 2, borderColor: '#f39c12' },
  statsRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 16, gap: 24 },
  statItem: { alignItems: 'center', minWidth: 50 },
  statNum: { fontWeight: '700', fontSize: 16, color: '#222' },
  statLbl: { fontSize: 11, color: '#666', marginTop: 2 },
  infoBlock: { alignItems: 'center', paddingVertical: 8, paddingHorizontal: 16 },
  displayName: { fontSize: 15, fontWeight: '600', color: '#222' },
    username: { fontSize: 13, color: '#667eea', marginTop: 2, fontWeight: '500' },
  bio: { fontSize: 13, color: '#555', marginTop: 4, textAlign: 'center', lineHeight: 18 },
  website: { fontSize: 12, color: '#007aff', marginTop: 4 },
  location: { fontSize: 12, color: '#666', marginTop: 3 },
  phone: { fontSize: 12, color: '#666', marginTop: 3 },
  interests: { fontSize: 12, color: '#666', marginTop: 3, fontStyle: 'italic' },
  pillRow: { flexDirection: 'row', gap: 8, paddingVertical: 8, paddingHorizontal: 16 },
  pillBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f5f5', paddingVertical: 8, borderRadius: 6, borderWidth: 1, borderColor: '#e0e0e0' },
  pillText: { fontSize: 12, fontWeight: '500', color: '#333' },
  followBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f39c12', paddingVertical: 8, borderRadius: 6 },
  followingBtn: { backgroundColor: '#f5f5f5', borderWidth: 1, borderColor: '#e0e0e0' },
  followText: { fontSize: 12, fontWeight: '600', color: '#fff' },
  followingText: { color: '#333' },
  sectionsScroller: { paddingVertical: 8 },
  sectionCard: { alignItems: 'center', width: 70, marginRight: 4 },
  sectionCover: { width: 60, height: 60, borderRadius: 8, backgroundColor: '#eee' },
  sectionLabel: { marginTop: 4, fontSize: 10, color: '#666', textAlign: 'center' },
  sectionLabelActive: { fontWeight: '700', color: '#000' },
  segmentControl: { flexDirection: 'row', borderTopWidth: 0.5, borderBottomWidth: 0.5, borderColor: '#e0e0e0', marginTop: 8 },
  segmentBtn: { flex: 1, alignItems: 'center', paddingVertical: 10 },
  segmentBtnActive: { flex: 1, alignItems: 'center', paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: '#f39c12' },
  card: { backgroundColor: '#f7f7f7', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#eee', marginTop: 8 },
  cardText: { color: '#333', lineHeight: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 0, paddingBottom: 8 },
  gridItem: { flexBasis: '25%', aspectRatio: 1, padding: 1 },
  sectionOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.5)', padding: 8, alignItems: 'center' },
  sectionGridLabel: { color: '#fff', fontSize: 12, fontWeight: '600', textAlign: 'center' },
  mapContainer: { width: '100%', height: 400, marginTop: 8, borderRadius: 12, overflow: 'hidden', backgroundColor: '#ffcccc' },
  map: { width: '100%', height: '100%' },
  markerContainer: { alignItems: 'center', justifyContent: 'center', width: 60, height: 60, backgroundColor: '#FF6B6B', borderRadius: 30, borderWidth: 3, borderColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5 },
  markerAvatar: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#eee' },
  customMarkerWrap: {
    width: 70,
    height: 52,
    borderRadius: 18,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 6,
    overflow: 'visible',
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  customMarkerImage: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
    resizeMode: 'cover',
  },
  customMarkerAvatarWrap: {
    position: 'absolute',
    top: -10,
    right: -10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 4,
  },
  customMarkerAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  postViewerHeader: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, backgroundColor: 'rgba(0,0,0,0.5)' },
  postViewerHeaderContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12 },
  postViewerCloseBtn: { padding: 4 },
  postViewerUserInfo: { flexDirection: 'row', alignItems: 'center' },
  postViewerAvatar: { width: 32, height: 32, borderRadius: 16, marginRight: 8 },
  postViewerUsername: { color: '#fff', fontWeight: '700', fontSize: 15 },
  postViewerSlide: { flex: 1, backgroundColor: '#000' },
  postImageContainer: { width: '100%', aspectRatio: 1, backgroundColor: '#222' },
  postViewerImage: { width: '100%', height: undefined, aspectRatio: 1, borderRadius: 12 },
  postActionsBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  postActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  actionBtn: { padding: 8 },
  captionContainer: { paddingHorizontal: 16, paddingVertical: 8 },
  captionText: { color: '#fff', fontSize: 15 },
  captionUsername: { fontWeight: '700', color: '#fff' },
  commentsContainer: { paddingHorizontal: 16, paddingBottom: 24 },
  // Profile header styles (for other users)
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
  menuSeparator: {
    height: 1,
    backgroundColor: '#f0f0f0',
  },
  menuCancelBtn: {
    marginTop: 16,
    paddingVertical: 14,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    alignItems: 'center',
  },
  menuCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
});