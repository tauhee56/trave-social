import { Feather, Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Image as ExpoImage } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { followUser, getUserHighlights, getUserPosts, getUserProfile, getUserSections, getUserStories, likePost, sendFollowRequest, unfollowUser, unlikePost } from '../../lib/firebaseHelpers';
import CommentSection from '../components/CommentSection';
import EditSectionsModal from '../components/EditSectionsModal';
import HighlightCarousel from '../components/HighlightCarousel';
import HighlightViewer from '../components/HighlightViewer';
import PostViewerModal from '../components/PostViewerModal';
import StoriesViewer from '../components/StoriesViewer';
import { useUser } from '../components/UserContext';

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

type ProfileData = {
  id: string;
  uid: string;
  name: string;
  username?: string;
  email: string;
  avatar: string;
  bio?: string;
  website?: string;
  followersCount?: number;
  followingCount?: number;
  postsCount?: number;
  locationsCount?: number;
  followers?: string[];
  following?: string[];
  // Add backend fields
  isPrivate?: boolean;
  approvedFollowers?: string[];
  followRequestPending?: boolean;
};

export default function Profile({ userIdProp }: any) {
  // State
  const [storiesViewerVisible, setStoriesViewerVisible] = useState(false);
  const [userStories, setUserStories] = useState<any[]>([]);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [highlightViewerVisible, setHighlightViewerVisible] = useState(false);
  const [selectedHighlightId, setSelectedHighlightId] = useState<string | null>(null);
  const router = useRouter();
  const params = useLocalSearchParams();
  const authUser = useUser();
  const viewedUserId = typeof userIdProp !== 'undefined'
    ? userIdProp
    : (typeof params.user === 'string' ? params.user : (authUser?.uid as string | undefined));
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
  const [taggedPosts, setTaggedPosts] = useState<any[]>([]);
  const [editSectionsModal, setEditSectionsModal] = useState<boolean>(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [likedPosts, setLikedPosts] = useState<{ [key: string]: boolean }>({});
  const [savedPosts, setSavedPosts] = useState<{ [key: string]: boolean }>({});
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [commentModalPostId, setCommentModalPostId] = useState<string>('');
  const [commentModalAvatar, setCommentModalAvatar] = useState<string>('');
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const isOwnProfile = !userIdProp && (!params.user || params.user === authUser?.uid);
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

  const handleSavePost = (post: any) => {
    setSavedPosts(prev => ({ ...prev, [post.id]: !prev[post.id] }));
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
            setPosts(postsData);
          } else {
            setPosts([]);
          }
          // Fetch sections
          const sectionsRes = await getUserSections(viewedUserId || '');
          let sectionsData: any[] = [];
          if (sectionsRes.success) {
            if ('data' in sectionsRes && Array.isArray(sectionsRes.data)) sectionsData = sectionsRes.data;
            else if ('sections' in sectionsRes && Array.isArray(sectionsRes.sections)) sectionsData = sectionsRes.sections;
            setSections(sectionsData);
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
        setPosts(postsData);
      } else {
        setPosts([]);
      }
      const sectionsRes = await getUserSections(viewedUserId);
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

  // Single return statement
  return (
    <SafeAreaView style={styles.container}>
      {/* TopMenu is rendered by (tabs)/_layout.tsx, so no need for duplicate top bar here */}
      {/* Ensure top bar 3 dots button opens settings modal, not alert */}
      {/* If you have a custom top bar, make sure its 3 dots button calls setSettingsModalVisible(true) */}
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
                // Debug: log which avatar is being used
                {...(() => { console.log('Profile avatar:', { photoURL: authUser?.photoURL, avatar: profile?.avatar }); return {}; })()}
                source={{ uri: profile?.avatar || 'https://via.placeholder.com/120x120.png?text=User' }}
                style={styles.avatar}
                contentFit="cover"
                transition={200}
              />
            </TouchableOpacity>
            {/* Avatar change logic for own profile */}
            {isOwnProfile && (
              <TouchableOpacity
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10 }}
                activeOpacity={0.6}
                onPress={async () => {
                  // Pick image
                  const picker = await import('expo-image-picker');
                  const result = await picker.launchImageLibraryAsync({ mediaTypes: picker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.8 });
                  if (!result.canceled && result.assets && result.assets[0]?.uri && authUser?.uid) {
                    // Upload image
                    const { uploadImage, updateUserProfile } = await import('../../lib/firebaseHelpers');
                    const uploadRes = await uploadImage(result.assets[0].uri, `avatars/${authUser.uid}`);
                    if (uploadRes.success && uploadRes.url) {
                      // Update backend profile
                      const updateRes = await updateUserProfile(authUser.uid, { avatar: uploadRes.url });
                      if (updateRes.success) {
                        setProfile(prev => prev ? { ...prev, avatar: uploadRes.url ?? '' } : prev);
                        alert('Profile picture updated!');
                      } else {
                        alert('Failed to update profile avatar.');
                      }
                    } else {
                      alert('Image upload failed.');
                    }
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
              <View style={styles.statItem}>
                <Text style={styles.statNum}>{profile?.followersCount ?? (profile?.followers?.length || 0)}</Text>
                <Text style={styles.statLbl}>Followers</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNum}>{profile?.followingCount ?? (profile?.following?.length || 0)}</Text>
                <Text style={styles.statLbl}>Following</Text>
              </View>
            </>
          ) : null}
        </View>

        {/* Name + Bio + Website */}
        <View style={styles.infoBlock}>
          <Text style={styles.displayName}>{profile?.name || 'User'}</Text>
          {!!profile?.bio && <Text style={styles.bio}>{profile.bio}</Text>}
          {!!profile?.website && (!isPrivate || isOwnProfile || approvedFollower) && <Text style={styles.website}>{profile.website}</Text>}
          {/* Only show follow button for other users, and only once */}
          {!isOwnProfile && (
            <TouchableOpacity
              style={[styles.followBtn, (isPrivate && !approvedFollower ? followRequestPending : isFollowing) && styles.followingBtn]}
              onPress={handleFollowToggle}
              disabled={followLoading || (isPrivate && !approvedFollower ? followRequestPending : false)}
            >
              <Text style={[styles.followText, (isPrivate && !approvedFollower ? followRequestPending : isFollowing) && styles.followingText]}>
                {isPrivate && !approvedFollower
                  ? (followRequestPending ? 'Requested' : (followLoading ? 'Requesting...' : 'Follow'))
                  : (isFollowing ? (followLoading ? 'Unfollowing...' : 'Following') : (followLoading ? 'Following...' : 'Follow'))}
              </Text>
            </TouchableOpacity>
          )}
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

        {/* Highlights carousel (Instagram-style) - always show under pill buttons */}
        <View style={{ marginBottom: 8 }}>
          <HighlightCarousel highlights={highlights} onPressHighlight={handlePressHighlight} />
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

        {/* Follow/Unfollow button for other users' profiles */}
        {!isOwnProfile && (
          <View style={styles.pillRow}>
            <TouchableOpacity style={[styles.followBtn, isFollowing && styles.followingBtn]} onPress={handleFollowToggle} disabled={followLoading}>
              <Text style={[styles.followText, isFollowing && styles.followingText]}>
                {isFollowing ? (followLoading ? 'Unfollowing...' : 'Following') : (followLoading ? 'Following...' : 'Follow')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.pillBtn} onPress={handleMessage}>
              <Ionicons name="chatbubble-outline" size={16} color="#000" style={{ marginRight: 4 }} />
              <Text style={styles.pillText}>Message</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.pillBtn} onPress={() => router.push({ pathname: '/passport', params: { user: viewedUserId } })}>
              <Ionicons name="map-outline" size={16} color="#000" style={{ marginRight: 4 }} />
              <Text style={styles.pillText}>Passport</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Icon-based segment control: grid | map | tagged */}
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

        {/* Map view */}
        {segmentTab === 'map' && (
          <View style={styles.mapContainer}>
            <MapView
              style={styles.map}
              initialRegion={{
                latitude: posts.find(p => p.location)?.location?.latitude || 37.78825,
                longitude: posts.find(p => p.location)?.location?.longitude || -122.4324,
                latitudeDelta: 0.0922,
                longitudeDelta: 0.0421,
              }}
              customMapStyle={standardMapStyle}
            >
              {posts.filter(p => p.location && p.location.latitude && p.location.longitude).map((post, index) => (
                <Marker
                  key={post.id}
                  coordinate={{
                    latitude: Number(post.location.latitude),
                    longitude: Number(post.location.longitude),
                  }}
                  onPress={() => {
                    const postIndex = posts.findIndex(p => p.id === post.id);
                    setSelectedPostIndex(postIndex);
                    setPostViewerVisible(true);
                  }}
                  tracksViewChanges={false}
                >
                  <View style={styles.markerContainer}>
                    <ExpoImage
                      source={{ uri: profile?.avatar || 'https://via.placeholder.com/40x40.png?text=User' }}
                      style={styles.markerAvatar}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                    />
                  </View>
                </Marker>
              ))}
            </MapView>
          </View>
        )}

        {/* Sections horizontal scroller */}
        {/* Highlights carousel (Instagram-style) */}
        {segmentTab === 'grid' && (
          <View style={{ marginBottom: 8 }}>
            <HighlightCarousel highlights={highlights} onPressHighlight={handlePressHighlight} />
          </View>
        )}
        {/* Sections horizontal scroller */}
        {segmentTab === 'grid' && sections.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sectionsScroller} contentContainerStyle={{ paddingHorizontal: 12, gap: 12 }}>
            {sections.map((s) => (
              <TouchableOpacity
                key={`section-${s.name}`}
                style={styles.sectionCard}
                activeOpacity={0.7}
                onPress={() => setSelectedSection(selectedSection === s.name ? null : s.name)}
              >
                <ExpoImage
                  source={{ uri: s.coverImage || posts.find(p => s.postIds?.includes?.(p.id))?.imageUrl || 'https://via.placeholder.com/72x72.png?text=+' }}
                  style={styles.sectionCover}
                  contentFit="cover"
                  transition={200}
                />
                <Text style={[styles.sectionLabel, selectedSection === s.name && styles.sectionLabelActive]}>{s.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Posts grid by segment tab */}
        {segmentTab !== 'map' && (
          <View style={styles.grid}>
            {/* Posts */}
            {(segmentTab === 'grid' ? (selectedSection ? visiblePosts : posts) : taggedPosts).map((p, index) => (
              <TouchableOpacity
                key={p.id}
                style={styles.gridItem}
                activeOpacity={0.8}
                onPress={() => {
                  setSelectedPostIndex(index);
                  setPostViewerVisible(true);
                }}
              >
                <ExpoImage
                  source={{ uri: p.imageUrl || p.imageUrls?.[0] }}
                  style={{ width: '100%', height: '100%' }}
                  contentFit="cover"
                  transition={200}
                />
              </TouchableOpacity>
            ))}
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
        <KeyboardAvoidingView style={{ flex: 1, justifyContent: 'flex-end' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={{ flex: 1, justifyContent: 'flex-end' }}>
            <TouchableOpacity
              style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.18)' }}
              activeOpacity={1}
              onPress={() => setCommentModalVisible(false)}
            />
            <View
              style={{
                backgroundColor: '#fff',
                borderTopLeftRadius: 18,
                borderTopRightRadius: 18,
                paddingTop: 18,
                paddingHorizontal: 16,
                height: '92%',
                shadowColor: '#000',
                shadowOpacity: 0.08,
                shadowRadius: 8,
                elevation: 8,
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 0,
                touchAction: 'none',
              }}
            >
              <View style={{ alignItems: 'center', marginBottom: 8 }}>
                <View style={{ width: 40, height: 4, backgroundColor: '#eee', borderRadius: 2, marginBottom: 8 }} />
                <Text style={{ fontWeight: '700', fontSize: 17, color: '#222' }}>Comments</Text>
              </View>
              {!!commentModalPostId && (
                <CommentSection postId={commentModalPostId} currentAvatar={commentModalAvatar} instagramStyle />
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit sections modal */}
      <EditSectionsModal
        visible={editSectionsModal}
        onClose={() => setEditSectionsModal(false)}
        userId={viewedUserId || ''}
        sections={sections}
        posts={posts}
        onSectionsUpdate={setSections}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: '#e0e0e0', justifyContent: 'space-between' },
  topIcon: { padding: 4 },
  topTitle: { fontSize: 16, fontWeight: '600', color: '#000' },
  content: { paddingHorizontal: 16, paddingBottom: 16 },
  avatarContainer: { alignItems: 'center', paddingVertical: 16 },
  avatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#eee' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: '#e0e0e0' },
  statItem: { alignItems: 'center' },
  statNum: { fontWeight: '700', fontSize: 18, color: '#222' },
  statLbl: { fontSize: 12, color: '#666', marginTop: 2 },
  infoBlock: { alignItems: 'center', paddingVertical: 12 },
  displayName: { fontSize: 16, fontWeight: '600', color: '#222' },
  bio: { fontSize: 14, color: '#333', marginTop: 4, textAlign: 'center' },
  website: { fontSize: 13, color: '#007aff', marginTop: 2 },
  pillRow: { flexDirection: 'row', gap: 8, paddingVertical: 12 },
  pillBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0f0f0', paddingVertical: 10, borderRadius: 8 },
  pillText: { fontSize: 13, fontWeight: '500', color: '#000' },
  followBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FF6B00', paddingVertical: 10, borderRadius: 8 },
  followingBtn: { backgroundColor: '#f0f0f0', borderWidth: 1, borderColor: '#d0d0d0' },
  followText: { fontSize: 13, fontWeight: '600', color: '#fff' },
  followingText: { color: '#000' },
  sectionsScroller: { paddingVertical: 12 },
  sectionCard: { alignItems: 'center', width: 80 },
  sectionCover: { width: 40, height: 40, borderRadius: 8, backgroundColor: '#eee' },
  sectionLabel: { marginTop: 6, fontSize: 12, color: '#666', textAlign: 'center' },
  sectionLabelActive: { fontWeight: '700', color: '#000' },
  segmentControl: { flexDirection: 'row', borderTopWidth: 0.5, borderBottomWidth: 0.5, borderColor: '#e0e0e0', marginVertical: 8 },
  segmentBtn: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  segmentBtnActive: { flex: 1, alignItems: 'center', paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: '#f39c12' },
  card: { backgroundColor: '#f7f7f7', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#eee', marginTop: 8 },
  cardText: { color: '#333', lineHeight: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  gridItem: { flexBasis: '33.3333%', aspectRatio: 1, padding: 1 },
  sectionOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.5)', padding: 8, alignItems: 'center' },
  sectionGridLabel: { color: '#fff', fontSize: 12, fontWeight: '600', textAlign: 'center' },
  mapContainer: { width: '100%', height: 400, marginTop: 8, borderRadius: 12, overflow: 'hidden' },
  map: { width: '100%', height: '100%' },
  markerContainer: { alignItems: 'center', justifyContent: 'center' },
  markerAvatar: { width: 40, height: 40, borderRadius: 20, borderWidth: 3, borderColor: '#fff', backgroundColor: '#eee' },
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
});
