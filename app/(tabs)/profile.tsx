import React, { useEffect, useState } from "react";
import CommentAvatar from '../components/CommentAvatar';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Modal,
  Alert,
  TextInput,
  FlatList,
  Share,
} from "react-native";
import { Video, ResizeMode } from 'expo-av';
import { Feather } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useFocusEffect } from '@react-navigation/native';
import { getCurrentUser, getUserProfile, getUserPosts, getUserHighlights, followUser, unfollowUser, getUserSections, addUserSection, deleteUserSection, updateUserSection, getUserStories, createStory, getUserNotifications } from "../../lib/firebaseHelpers";
import { likePost, unlikePost, deletePost, addComment, getPostComments, deleteComment, addLikedStatusToPosts, likeComment, unlikeComment, getAllPosts } from "../../lib/firebaseHelpers";
import { signOut } from "firebase/auth";
import { auth } from "../../config/firebase";
import * as ImagePicker from 'expo-image-picker';
import StoriesViewer from "../components/StoriesViewer";
import DraggableFlatList from 'react-native-draggable-flatlist';
import MapView, { Marker } from 'react-native-maps';

const { width } = Dimensions.get("window");

interface Section {
  name: string;
  postIds: string[];
  coverImage?: string;
}

interface Post {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  imageUrl: string;
  caption?: string;
  location?: string;
  likesCount?: number;
  commentsCount?: number;
  liked?: boolean;
  videoUrl?: string;
  mediaType?: string;
  taggedUsers?: string[];
  lat?: number;
  lon?: number;
}

interface ProfileType {
  id: string;
  uid: string;
  name: string;
  email: string;
  avatar: string;
  bio: string;
  website: string;
  followers: string[];
  following: string[];
  followersCount: number;
  followingCount: number;
  postsCount: number;
}

const styles = StyleSheet.create({
  settingsModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsModal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '80%',
    alignItems: 'center',
  },
  settingsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  settingsOption: {
    paddingVertical: 12,
    width: '100%',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  closeSettings: {
    marginTop: 16,
    padding: 8,
    backgroundColor: '#eee',
    borderRadius: 8,
  },
  container: { flex: 1, backgroundColor: '#fff' },
  profileHeader: { alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
  avatar: { width: 86, height: 86, borderRadius: 43, marginBottom: 16 },
  statsContainer: { flexDirection: 'row', justifyContent: 'center', width: '100%', gap: 40, marginBottom: 12 },
  stat: { alignItems: 'center' },
  statNumber: { fontWeight: '600', fontSize: 16, color: '#262626' },
  statLabel: { color: '#262626', fontSize: 13, marginTop: 4 },
  profileInfo: { paddingHorizontal: 16, paddingTop: 0, paddingBottom: 8, alignItems: 'center' },
  name: { fontWeight: '600', fontSize: 14, color: '#262626', marginBottom: 0, textAlign: 'center' },
  bio: { color: '#262626', fontSize: 14, lineHeight: 20, marginTop: 4, textAlign: 'center' },
  website: { color: '#00376b', fontSize: 14, marginTop: 2, textAlign: 'center' },
  actionsRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  followBtn: { flex: 1, backgroundColor: '#f39c12', paddingVertical: 8, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  actionBtn: { flex: 1, backgroundColor: '#f5f5f5', paddingVertical: 8, borderRadius: 8, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  highlightsRow: { paddingHorizontal: 16, paddingVertical: 12 },
  highlightItem: { alignItems: 'center', marginRight: 16 },
  highlightRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#f39c12',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  highlightImage: { width: 60, height: 60, borderRadius: 16, backgroundColor: '#eee' },
  highlightLabel: { marginTop: 4, fontSize: 13, color: '#222', fontWeight: '500', textAlign: 'center', maxWidth: 70 },
  profileAddStoryButton: { position: 'absolute', bottom: 5, right: 5, backgroundColor: '#007aff', borderRadius: 14, width: 28, height: 28, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#fff' },
  tabControls: { flexDirection: 'row', borderTopWidth: 0.5, borderBottomWidth: 0.5, borderColor: '#e0e0e0' },
  tabBtn: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  tabBtnActive: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#f39c12',
  },
  filtersRow: { paddingHorizontal: 16, marginBottom: 12 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 1,
    marginTop: 12,
  },
  gridItem: {
    width: '33.33%',
    aspectRatio: 1,
    padding: 1,
    backgroundColor: '#f0f0f0',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e0e0e0',
  }
});

export default function Profile({ userIdProp }: any) {
  // Get userIdProp from props if available, otherwise fallback to params or current user
  let viewedUserId = undefined;
  try {
    viewedUserId = typeof userIdProp !== 'undefined' ? userIdProp : undefined;
  } catch {
    const params = useLocalSearchParams();
    viewedUserId = typeof params.user === 'string' ? params.user : undefined;
  }
  const currentUser = getCurrentUser();
  const isViewingOther = !!viewedUserId && viewedUserId !== currentUser?.uid;
  const targetUserId = isViewingOther ? viewedUserId : currentUser?.uid;

  const router = useRouter();
  const [profile, setProfile] = useState<ProfileType | null>(null);
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const [highlights, setHighlights] = useState<any[]>([]);
  const [selectedHighlight, setSelectedHighlight] = useState<any>(null);
  const [showHighlightModal, setShowHighlightModal] = useState(false);
  const [showCreateHighlight, setShowCreateHighlight] = useState(false);
  const [newHighlightName, setNewHighlightName] = useState('');

  const [activeTab, setActiveTab] = useState('posts');
  const [sections, setSections] = useState<Section[]>([]);
  const [sectionOrder, setSectionOrder] = useState<Section[]>([]);
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);
  const [selectedSectionPosts, setSelectedSectionPosts] = useState<Post[]>([]);
  const [allTaggedPosts, setAllTaggedPosts] = useState<Post[]>([]);

  const [showNewSectionModal, setShowNewSectionModal] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [renamingSectionName, setRenamingSectionName] = useState<string | null>(null);
  const [newName, setNewName] = useState('');

  const [expandedCommentPostId, setExpandedCommentPostId] = useState<string | null>(null);

  const [isStoriesViewerVisible, setIsStoriesViewerVisible] = useState(false);
  const [storiesData, setStoriesData] = useState<any[]>([]);
  const [initialStoryIndex, setInitialStoryIndex] = useState(0);

  const [showMenu, setShowMenu] = useState(false);

  // Additional required states
  const DEFAULT_AVATAR_URL = 'https://firebasestorage.googleapis.com/v0/b/travel-app-3da72.firebasestorage.app/o/default%2Fdefault-pic.jpg?alt=media&token=7177f487-a345-4e45-9a56-732f03dbf65d';
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [showEditSections, setShowEditSections] = useState(false);
  const [editSectionName, setEditSectionName] = useState('');
  const [selectedPostIds, setSelectedPostIds] = useState<string[]>([]);
  const [selectingCover, setSelectingCover] = useState(false);
  const [renamingSection, setRenamingSection] = useState<string | null>(null);
  const [renameSectionText, setRenameSectionText] = useState('');
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [postsToShow, setPostsToShow] = useState<Post[]>([]);
  const [selectedPostForComments, setSelectedPostForComments] = useState<Post | null>(null);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [showStoriesViewer, setShowStoriesViewer] = useState(false);
  const [userStories, setUserStories] = useState<any[]>([]);
  const [storiesViewerIndex, setStoriesViewerIndex] = useState(0);
  const [newHighlightLabel, setNewHighlightLabel] = useState('');
  const [newHighlightImage, setNewHighlightImage] = useState<string>('');
  const [newHighlightStories, setNewHighlightStories] = useState<any[]>([]);
  const [showAddHighlight, setShowAddHighlight] = useState(false);
  const [showHighlightViewer, setShowHighlightViewer] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch tagged posts for the tagged tab
  useEffect(() => {
    async function fetchTaggedPosts() {
      if (!targetUserId) return;
      const res = await getAllPosts();
      if (res.success && Array.isArray(res.posts)) {
        const tagged = res.posts.filter((p: any) => Array.isArray(p.taggedUsers) && p.taggedUsers.includes(targetUserId) && typeof p.userId === 'string' && typeof p.userName === 'string' && typeof p.userAvatar === 'string' && typeof p.imageUrl === 'string');
        setAllTaggedPosts(tagged as Post[]);
      } else {
        setAllTaggedPosts([]);
      }
    }
    fetchTaggedPosts();
  }, [targetUserId]);

// Post actions
async function handleLike(post: Post) {
  if (!currentUser) return;
  if (post.liked) {
    await unlikePost(post.id, currentUser.uid);
    setPostsToShow(postsToShow.map(p => p.id === post.id ? { ...p, liked: false, likesCount: Math.max(0, (p.likesCount || 1) - 1) } : p));
  } else {
    await likePost(post.id, currentUser.uid);
    setPostsToShow(postsToShow.map(p => p.id === post.id ? { ...p, liked: true, likesCount: (p.likesCount || 0) + 1 } : p));
  }
}

function handleComment(post: Post) {
  setSelectedPostForComments(post);
  setShowCommentsModal(true);
  loadPostComments(post.id);
}

async function handleShare(post: Post) {
  try {
    await Share.share({
      message: `Check out this post by ${post.userName}: ${post.caption || ''}`,
    });
  } catch (error) {
    console.error('Share error:', error);
  }
}

async function handleDelete(post: Post) {
  Alert.alert('Delete Post', 'Are you sure you want to delete this post?', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => {
      await deletePost(post.id);
      setSelectedPost(null);
      setPostsToShow(postsToShow.filter(p => p.id !== post.id));
    }}
  ]);
}

async function loadPostComments(postId: string) {
  setLoadingComments(true);
  const res = await getPostComments(postId);
  if (res.success && Array.isArray(res.data)) {
    setComments(res.data);
  } else {
    setComments([]);
  }
  setLoadingComments(false);
}

async function handlePostComment() {
  if (!currentUser || !newComment.trim() || !selectedPostForComments) return;
  // Optimistic UI update
  const tempComment = {
    id: `temp-${Date.now()}`,
    userId: currentUser.uid,
    userName: currentUser.displayName || 'User',
    userAvatar: currentUser.photoURL || '',
    text: newComment,
    likes: [],
    likesCount: 0,
    createdAt: new Date(),
  };
  setComments(prev => [tempComment, ...prev]);
  setNewComment('');
  setPostsToShow(postsToShow.map(p => 
    p.id === selectedPostForComments.id 
      ? { ...p, commentsCount: (p.commentsCount || 0) + 1 }
      : p
  ));
  addComment(
    selectedPostForComments.id,
    currentUser.uid,
    currentUser.displayName || 'User',
    currentUser.photoURL || '',
    newComment
  ).then(res => {
    if (res.success) {
      loadPostComments(selectedPostForComments.id);
    } else {
      // Revert if failed
      setComments(prev => prev.filter(c => c.id !== tempComment.id));
      setPostsToShow(postsToShow.map((p: Post) => 
        p.id === selectedPostForComments.id 
          ? { ...p, commentsCount: Math.max(0, (p.commentsCount || 1) - 1) }
          : p
      ));
    }
  });
}

    async function handleDeleteComment(commentId: string) {
      if (!selectedPostForComments) return;
      const res = await deleteComment(selectedPostForComments.id, commentId);
      if (res.success) {
        await loadPostComments(selectedPostForComments.id);
      }
    }

  // Fetch tagged posts for the tagged tab
  useEffect(() => {
    async function fetchTaggedPosts() {
      if (!targetUserId) return;
      const res = await getAllPosts();
      if (res.success && Array.isArray(res.posts)) {
        const tagged = res.posts.filter((p: any) => Array.isArray(p.taggedUsers) && p.taggedUsers.includes(targetUserId) && typeof p.userId === 'string' && typeof p.userName === 'string' && typeof p.userAvatar === 'string' && typeof p.imageUrl === 'string');
        setAllTaggedPosts(tagged as Post[]);
      } else {
        setAllTaggedPosts([]);
      }
    }
    fetchTaggedPosts();
  }, [targetUserId]);

  // Use useFocusEffect to reload profile and posts when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      loadProfileData();
      fetchSectionsAndPosts();
    }, [targetUserId])
  );

  async function fetchSectionsAndPosts() {
    if (!targetUserId) return;
    const sectionsRes = await getUserSections(targetUserId);
    if (sectionsRes.success && Array.isArray(sectionsRes.data)) {
      const mappedSections = sectionsRes.data.map((s: any) => ({
        name: s.name,
        postIds: Array.isArray(s.postIds) ? s.postIds : [],
        coverImage: s.coverImage || ''
      }));
      setSections(mappedSections);
      setSectionOrder(mappedSections);
    } else {
      setSections([]);
    }
    const postsRes = await getUserPosts(targetUserId);
    if (postsRes.success && Array.isArray(postsRes.data) && currentUser) {
      const postsWithLikes = await addLikedStatusToPosts(postsRes.data, currentUser.uid);
      setPostsToShow(postsWithLikes);
    } else {
      setPostsToShow([]);
    }
  }

  // Add new section
  async function handleAddSection() {
    if (!editSectionName.trim()) return;
    const newSection = { name: editSectionName.trim(), postIds: [], coverImage: selectingCover ? selectedSection?.coverImage || '' : '' };
    if (!targetUserId) return;
    const res = await addUserSection(targetUserId, newSection);
    if (res.success) {
      setSections([...sections, newSection]);
      setEditSectionName('');
    }
  }

  // Delete section
  async function handleDeleteSection(sectionName: string) {
    if (!targetUserId) return;
    Alert.alert(
      'Delete Section',
      `Are you sure you want to delete "${sectionName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const res = await deleteUserSection(targetUserId, sectionName);
            if (res.success) {
              setSections(sections.filter(s => s.name !== sectionName));
              setSectionOrder(sectionOrder.filter(s => s.name !== sectionName));
              setSelectedSection(null);
            }
          }
        }
      ]
    );
  }

  // Rename section
  async function handleRenameSection(oldName: string, newName: string) {
    if (!targetUserId || !newName.trim() || newName === oldName) {
      setRenamingSectionName(null);
      return;
    }
    
    // Check if name already exists
    if (sections.some(s => s.name === newName && s.name !== oldName)) {
      Alert.alert('Error', 'A section with this name already exists');
      return;
    }

    const sectionToRename = sections.find(s => s.name === oldName);
    if (!sectionToRename) return;

    // Delete old section
    await deleteUserSection(targetUserId, oldName);
    
    // Create new section with new name
    const updatedSection = { ...sectionToRename, name: newName };
    const res = await addUserSection(targetUserId, updatedSection);
    
    if (res.success) {
      setSections(sections.map(s => s.name === oldName ? updatedSection : s));
      setSectionOrder(sectionOrder.map(s => s.name === oldName ? updatedSection : s));
      setRenamingSectionName(null);
      setNewSectionName('');
    }
  }

  // Save posts to section
  async function handleSaveSectionPosts() {
    if (!selectedSection) return;
    const updatedSection: Section = { 
      ...selectedSection, 
      postIds: selectedPostIds,
      coverImage: selectedSection.coverImage || '' // Always persist cover image
    };
    if (!targetUserId) return;
    const res = await updateUserSection(targetUserId, updatedSection);
    if (res.success) {
      setSections(sections.map(s => s.name === updatedSection.name ? updatedSection : s));
      setSectionOrder(sectionOrder.map((s: Section) => s.name === updatedSection.name ? updatedSection : s));
      setSelectedPostIds([]);
      setSelectedSection(null);
      setSelectingCover(false);
    }
  }

  // Rename section
  async function handleRenameSectionConfirm(oldName: string) {
    if (!renameSectionText.trim() || renameSectionText === oldName) {
      setRenamingSection(null);
      setRenameSectionText('');
      return;
    }

    // Check if name already exists
    if (sections.some(s => s.name === renameSectionText.trim() && s.name !== oldName)) {
      Alert.alert('Error', 'A section with this name already exists');
      return;
    }

    if (!targetUserId) return;
    const sectionToRename = sections.find(s => s.name === oldName);
    if (!sectionToRename) return;

    // Delete old section and create new one with updated name
    await deleteUserSection(targetUserId, oldName);
    const updatedSection = { ...sectionToRename, name: renameSectionText.trim() };
    const res = await addUserSection(targetUserId, updatedSection);
    
    if (res.success) {
      setSections(sections.map(s => s.name === oldName ? updatedSection : s));
      setSectionOrder(sectionOrder.map((s: Section) => s.name === oldName ? updatedSection : s));
      setRenamingSection(null);
      setRenameSectionText('');
    }
  }

  // Save section order after drag
  async function handleSaveSectionOrder(newOrder: Section[]) {
    setSectionOrder(newOrder);
    setSections(newOrder);
    // Order is now saved in state and will persist during session
  }
  // ...existing code...

  async function loadProfileData() {
    if (!targetUserId) {
      setLoading(false);
      // Do not set profile to null, always use fallback
      return;
    }
    
    setLoading(true);
    
    const [profileRes, postsRes, highlightsRes, storiesRes] = await Promise.all([
      getUserProfile(targetUserId),
      getUserPosts(targetUserId),
      getUserHighlights(targetUserId),
      getUserStories(targetUserId),
    ]);
    
    if (profileRes.success && 'data' in profileRes && typeof profileRes.data === 'object' && profileRes.data) {
      const rawAvatar = profileRes.data.avatar || '';
      // Check if avatar is valid - not empty and not old placeholder URL
      const isValidAvatar = rawAvatar && 
                           rawAvatar.trim() !== "" && 
                           !rawAvatar.includes('via.placeholder.com');
      
      const safeProfile = {
        ...profileRes.data,
        avatar: isValidAvatar ? rawAvatar : DEFAULT_AVATAR_URL,
        name: profileRes.data.name || "User"
      };
      console.log('Profile loaded from DB. Raw avatar:', rawAvatar, 'Is valid:', isValidAvatar, 'Final avatar:', safeProfile.avatar);
      setProfile(safeProfile);
    } else if (currentUser) {
      const fallbackProfile = {
        id: currentUser.uid,
        uid: currentUser.uid,
        name: currentUser.displayName || 'User',
        email: currentUser.email || '',
        avatar: currentUser.photoURL && currentUser.photoURL.trim() !== "" ? currentUser.photoURL : DEFAULT_AVATAR_URL,
        bio: '',
        website: '',
        followers: [],
        following: [],
        followersCount: 0,
        followingCount: 0,
        postsCount: 0
      };
      console.log('Fallback profile used:', fallbackProfile);
      setProfile(fallbackProfile);
    } else {
      // No user found, set a generic default profile
      const genericProfile = {
        id: 'unknown',
        uid: 'unknown',
        name: 'User',
        email: '',
        avatar: DEFAULT_AVATAR_URL,
        bio: '',
        website: '',
        followers: [],
        following: [],
        followersCount: 0,
        followingCount: 0,
        postsCount: 0
      };
      console.log('Generic profile used:', genericProfile);
      setProfile(genericProfile);
    }
    
    console.log('Profile postsRes:', postsRes);
    if (postsRes.success && currentUser) {
      console.log('Setting posts to show:', postsRes.data);
      const postsWithLikes = await addLikedStatusToPosts(postsRes.data || [], currentUser.uid);
      setPostsToShow(postsWithLikes);
    }
    
    if (highlightsRes.success && Array.isArray(highlightsRes.highlights)) {
      setHighlights(highlightsRes.highlights);
    } else {
      setHighlights([]);
    }

    if (storiesRes.success && Array.isArray(storiesRes.stories)) {
      console.log('Loaded stories:', storiesRes.stories);
      setUserStories(storiesRes.stories);
    } else {
      console.log('No stories:', storiesRes);
      setUserStories([]);
    }
    
    console.log('Profile data loaded. Profile:', profile, 'Posts count:', postsRes.data?.length, 'Stories count:', storiesRes.stories?.length);
    setLoading(false);
  }

  function openHighlight(highlight: any) {
    setSelectedHighlight(highlight);
    setShowHighlightViewer(true);
  }

  async function handleLogout() {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut(auth);
              setShowMenu(false);
              router.replace('/login');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to logout');
            }
          }
        }
      ]
    );
  }

  async function addHighlight() {
    // Pick image from gallery
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setNewHighlightImage(result.assets[0].uri);
      setShowAddHighlight(true);
    }
  }

  async function handleAddProfileStory() {
    if (!currentUser) return;
    
    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      aspect: [9, 16],
      quality: 0.8,
    });
    if (!pickerResult.canceled) {
      const asset = pickerResult.assets[0];
      const mediaType = asset.type === 'video' ? 'video' : 'image';
      
      const storyRes = await createStory(
        currentUser.uid,
        asset.uri,
        mediaType
      );

      if (storyRes.success) {
        await loadProfileData();
      }
    }
  }

  function saveHighlight() {
    if (newHighlightImage && newHighlightLabel.trim()) {
      setHighlights([
        ...highlights,
        {
          coverImage: newHighlightImage,
          label: newHighlightLabel.trim(),
          stories: newHighlightStories && newHighlightStories.length > 0
            ? newHighlightStories.map(s => ({ imageUrl: s.uri }))
            : [{ imageUrl: newHighlightImage }]
        }
      ]);
      setShowAddHighlight(false);
      setNewHighlightImage('');
      setNewHighlightLabel('');
      setNewHighlightStories([]);
    }
  }

  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    async function fetchNotifications() {
      const user = getCurrentUser();
      if (!user) return;
      const result = await getUserNotifications(user.uid);
      if (result.success && Array.isArray(result.data)) {
        const unread = result.data.filter((n: any) => n.read === false || n.read === undefined);
        setUnreadCount(unread.length);
      }
    }
    fetchNotifications();
  }, []);

  if (loading) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color="#f39c12" />
      </View>
    );
  }

  if (!profile) {
    // Always show a default profile if missing
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center', padding: 20 }]}> 
        <Image source={{ uri: DEFAULT_AVATAR_URL }} style={styles.avatar} />
        <Text style={{ color: '#666', marginTop: 12, fontSize: 16 }}>Loading profile...</Text>
      </View>
    );
  }

  // Safety check: ensure profile has required fields
  const safeProfile = {
    ...profile,
    avatar: profile.avatar && profile.avatar.trim() !== "" ? profile.avatar : DEFAULT_AVATAR_URL,
    name: profile.name || 'User',
    bio: profile.bio || '',
    website: profile.website || '',
    followers: profile.followers || [],
    following: profile.following || [],
  };
  // ...existing code...

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={[styles.headerRow, { justifyContent: 'space-between' }]}> 
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color="#000" />
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity style={{ marginRight: 12 }} onPress={() => router.push('/go-live')}>
            <View style={{ backgroundColor: '#e0245e', paddingVertical: 4, paddingHorizontal: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center' }}>
              <Feather name="video" size={14} color="#fff" style={{ marginRight: 4 }} />
              <Text style={{ color: '#fff', fontWeight: '600', fontSize: 11 }}>Go Live</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/notifications')}>
            <View>
              <Feather name="bell" size={24} color="#000" />
              {unreadCount > 0 && (
                <View style={{
                  position: 'absolute',
                  top: -4,
                  right: -4,
                  backgroundColor: '#e0245e',
                  borderRadius: 8,
                  width: 16,
                  height: 16,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}>
                  <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{unreadCount}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={{ marginLeft: 12 }} onPress={() => { setShowMenu(true); }}>
            <Feather name="more-vertical" size={24} color="#000" />
          </TouchableOpacity>
        </View>
            {/* Settings modal now triggered from three-dot menu */}
            <Modal visible={showMenu} animationType="slide" transparent={true} onRequestClose={() => setShowMenu(false)}>
              <View style={styles.settingsModalContainer}>
                <View style={styles.settingsModal}>
                  <Text style={styles.settingsTitle}>Profile Settings</Text>
                  <TouchableOpacity style={styles.settingsOption} onPress={() => {/* TODO: Edit profile logic */}}>
                    <Text>Edit Profile</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.settingsOption} onPress={() => {/* TODO: Change password logic */}}>
                    <Text>Change Password</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.settingsOption} onPress={() => {/* TODO: Privacy settings logic */}}>
                    <Text>Privacy</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.settingsOption} onPress={() => { signOut(auth); setShowMenu(false); router.replace('/login'); }}>
                    <Text>Logout</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.closeSettings} onPress={() => setShowMenu(false)}>
                    <Text>Close</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>
      </View>

      <View style={styles.profileHeader}>
        <TouchableOpacity onPress={() => {
          if (userStories && userStories.length > 0) {
            setStoriesViewerIndex(0);
            setShowStoriesViewer(true);
          } else if (!isViewingOther) {
            handleAddProfileStory();
          }
        }} style={{ position: 'relative' }}>
          <Image source={{ uri: safeProfile.avatar }} style={styles.avatar} />
          {!isViewingOther && (
            <TouchableOpacity 
              style={styles.profileAddStoryButton}
              onPress={handleAddProfileStory}
            >
              <Feather name="plus" size={18} color="#fff" />
            </TouchableOpacity>
          )}
        </TouchableOpacity>
        
        <View style={styles.statsContainer}>
          <TouchableOpacity style={styles.stat}>
            <Text style={styles.statNumber}>{postsToShow.length}</Text>
            <Text style={styles.statLabel}>posts</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.stat}>
            <Text style={styles.statNumber}>{safeProfile.followers?.length || 0}</Text>
            <Text style={styles.statLabel}>followers</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.stat}>
            <Text style={styles.statNumber}>{safeProfile.following?.length || 0}</Text>
            <Text style={styles.statLabel}>following</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.profileInfo}>
        <Text style={styles.name}>{safeProfile.name}</Text>
        {safeProfile.bio ? <Text style={styles.bio}>{safeProfile.bio}</Text> : null}
        {safeProfile.website ? <Text style={styles.website}>{safeProfile.website}</Text> : null}
      </View>

      <View style={styles.actionsRow}>
        {isViewingOther ? (
          <>
            <TouchableOpacity
              style={[styles.followBtn, isFollowing && { backgroundColor: '#f5f5f5' }]}
              onPress={async () => {
                if (followLoading || !currentUser || !targetUserId) return;
                setFollowLoading(true);
                if (isFollowing) {
                  const res = await unfollowUser(currentUser.uid, targetUserId);
                  if (res.success) {
                    setIsFollowing(false);
                    setProfile((prev: any) => ({
                      ...prev,
                      followers: (prev.followers || []).filter((id: string) => id !== currentUser.uid),
                      followersCount: Math.max(0, (prev.followersCount || 0) - 1)
                    }));
                  }
                } else {
                  const res = await followUser(currentUser.uid, targetUserId);
                  if (res.success) {
                    setIsFollowing(true);
                    setProfile((prev: any) => ({
                      ...prev,
                      followers: [...(prev.followers || []), currentUser.uid],
                      followersCount: (prev.followersCount || 0) + 1
                    }));
                  }
                }
                setFollowLoading(false);
              }}
              disabled={followLoading}
            >
              <Text style={{ color: isFollowing ? '#000' : '#fff', fontWeight: '600', fontSize: 15 }}>
                {followLoading ? '...' : isFollowing ? 'Following' : 'Follow'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionBtn} 
              onPress={() => router.push({
                pathname: '/dm',
                params: {
                  otherUserId: targetUserId,
                  user: safeProfile.name,
                  avatar: safeProfile.avatar
                }
              })}
            >
              <Feather name="message-circle" size={18} color="#000" style={{ marginRight: 6 }} />
              <Text style={{ fontWeight: '600', fontSize: 15 }}>Message</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => router.push(`/passport?userId=${targetUserId}` as any)}>
              <Feather name="briefcase" size={18} color="#000" style={{ marginRight: 6 }} />
              <Text style={{ fontWeight: '600', fontSize: 15 }}>Passport</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/edit-profile' as any)}>
              <Feather name="edit-3" size={16} color="#000" style={{ marginRight: 6 }} />
              <Text style={{ fontWeight: '600', fontSize: 15 }}>Edit Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => setShowEditSections(true)}>
              <Feather name="sliders" size={16} color="#000" style={{ marginRight: 6 }} />
              <Text style={{ fontWeight: '600', fontSize: 15 }}>Sections</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => router.push(`/passport?userId=${targetUserId}` as any)}>
              <Feather name="briefcase" size={16} color="#000" style={{ marginRight: 6 }} />
              <Text style={{ fontWeight: '600', fontSize: 15 }}>Passport</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Highlights row */}
      <View style={{ marginBottom: 8, marginTop: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 }}>
          <Text style={{ fontWeight: '600', fontSize: 16 }}>Highlights</Text>
          <TouchableOpacity style={{ marginLeft: 12 }} onPress={addHighlight}>
            <Feather name="plus-circle" size={22} color="#f39c12" />
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.highlightsRow} contentContainerStyle={{ paddingHorizontal: 12 }}>
          {highlights.map((h) => (
            <TouchableOpacity key={h.id} style={styles.highlightItem} onPress={() => openHighlight(h)}>
              <View style={styles.highlightRing}>
                <Image source={{ uri: h.coverImage || h.image }} style={styles.highlightImage} />
              </View>
              <Text style={styles.highlightLabel}>{h.name || h.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Add Highlight Modal */}
      <Modal
        visible={showAddHighlight}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddHighlight(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 24, width: '90%', maxWidth: 340, alignItems: 'center' }}>
            {/* Cover Image Selector */}
            <TouchableOpacity onPress={async () => {
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 1,
              });
              if (!result.canceled && result.assets && result.assets.length > 0) {
                setNewHighlightImage(result.assets[0].uri);
              }
            }}>
              {newHighlightImage ? (
                <Image source={{ uri: newHighlightImage }} style={{ width: 80, height: 80, borderRadius: 24, marginBottom: 12 }} />
              ) : (
                <View style={{ width: 80, height: 80, borderRadius: 24, backgroundColor: '#eee', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                  <Feather name="image" size={32} color="#ccc" />
                  <Text style={{ color: '#888', fontSize: 12, marginTop: 4 }}>Select cover</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Label Input */}
            <TextInput
              style={{ borderWidth: 1, borderColor: '#eee', borderRadius: 8, padding: 8, fontSize: 15, width: '100%', marginBottom: 16 }}
              placeholder="Highlight label"
              value={newHighlightLabel}
              onChangeText={setNewHighlightLabel}
            />

            {/* Stories Selector */}
            <TouchableOpacity style={{ backgroundColor: '#f39c12', borderRadius: 8, paddingHorizontal: 24, paddingVertical: 10, marginBottom: 8 }}
              onPress={async () => {
                const result = await ImagePicker.launchImageLibraryAsync({
                  mediaTypes: ImagePicker.MediaTypeOptions.Images,
                  allowsMultipleSelection: true,
                  quality: 1,
                });
                if (!result.canceled && result.assets && result.assets.length > 0) {
                  setNewHighlightStories(result.assets.map(a => ({ uri: a.uri })));
                }
              }}>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Add Stories</Text>
            </TouchableOpacity>
            {newHighlightStories && newHighlightStories.length > 0 && (
              <ScrollView horizontal style={{ marginBottom: 12, maxWidth: 260 }}>
                {newHighlightStories.map((story, idx) => (
                  <Image key={story.uri + idx} source={{ uri: story.uri }} style={{ width: 48, height: 48, borderRadius: 12, marginRight: 8 }} />
                ))}
              </ScrollView>
            )}

            {/* Save/Cancel Buttons */}
            <TouchableOpacity style={{ backgroundColor: '#f39c12', borderRadius: 8, paddingHorizontal: 32, paddingVertical: 12, marginBottom: 8 }} onPress={saveHighlight}>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowAddHighlight(false)}>
              <Text style={{ color: '#222', fontWeight: '600', fontSize: 15 }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Highlight Viewer Modal - Instagram Style */}
      <Modal
        visible={showHighlightViewer}
        transparent={false}
        animationType="fade"
          onRequestClose={() => {
            setShowHighlightViewer(false);
            setSelectedHighlight(null);
          }}
        >
          <View style={{ flex: 1, backgroundColor: '#000' }}>
            {selectedHighlight && (
              <>
                {/* Header */}
                <View style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, paddingTop: 50, paddingHorizontal: 16, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' }}>
                  <Image source={{ uri: selectedHighlight.coverImage || selectedHighlight.image }} style={{ width: 36, height: 36, borderRadius: 18, marginRight: 12 }} />
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600', flex: 1 }}>{selectedHighlight.name || selectedHighlight.label}</Text>
                  <TouchableOpacity onPress={() => { setShowHighlightViewer(false); setSelectedHighlight(null); }}>
                    <Feather name="x" size={28} color="#fff" />
                  </TouchableOpacity>
                </View>

                {/* Instagram-style horizontal stories viewer */}
                <FlatList
                  data={selectedHighlight?.stories || []}
                  horizontal
                  pagingEnabled
                  keyExtractor={(_, idx) => idx.toString()}
                  renderItem={({ item: story }) => (
                    <View style={{ width: Dimensions.get('window').width, minHeight: Dimensions.get('window').height, justifyContent: 'center', alignItems: 'center', paddingVertical: 20 }}>
                      <Image
                        source={{ uri: story.imageUrl || story.media }}
                        style={{ width: '100%', height: '80%', resizeMode: 'contain' }}
                      />
                      {story.caption && (
                        <Text style={{ color: '#fff', fontSize: 16, marginTop: 16, paddingHorizontal: 24, textAlign: 'center' }}>
                          {story.caption}
                        </Text>
                      )}
                    </View>
                  )}
                  ListEmptyComponent={
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000', width: Dimensions.get('window').width, height: Dimensions.get('window').height }}>
                      {selectedHighlight.coverImage || selectedHighlight.image ? (
                        <Image
                          source={{ uri: selectedHighlight.coverImage || selectedHighlight.image }}
                          style={{ width: 220, height: 220, borderRadius: 110, resizeMode: 'cover', marginBottom: 16, alignSelf: 'center' }}
                        />
                      ) : (
                        <Feather name="image" size={64} color="#fff" style={{ alignSelf: 'center' }} />
                      )}
                      <Text style={{ color: '#fff', fontSize: 18, fontWeight: '600', marginTop: 12, textAlign: 'center' }}>No stories in this highlight</Text>
                    </View>
                  }
                  showsHorizontalScrollIndicator={false}
                />

                {/* Instagram-style options */}
                <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, flexDirection: 'row', justifyContent: 'space-between', backgroundColor: 'rgba(0,0,0,0.3)' }}>
                  <TouchableOpacity onPress={() => {/* TODO: Add story logic */}}>
                    <Feather name="plus-circle" size={28} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => {/* TODO: Edit highlight logic */}}>
                    <Feather name="edit" size={28} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => {/* TODO: Change cover logic */}}>
                    <Feather name="image" size={28} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => {/* TODO: Delete highlight logic */}}>
                    <Feather name="trash-2" size={28} color="#fff" />
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </Modal>
      {/* Tab Controls */}
      <View style={styles.tabControls}>
        <TouchableOpacity style={activeTab === 'posts' ? styles.tabBtnActive : styles.tabBtn} onPress={() => { setActiveTab('posts'); setSelectedSection(null); }}>
          <Feather name="grid" size={20} color={activeTab === 'posts' ? "#f39c12" : "#999"} />
        </TouchableOpacity>
        <TouchableOpacity style={activeTab === 'map' ? styles.tabBtnActive : styles.tabBtn} onPress={() => setActiveTab('map')}>
          <Feather name="map-pin" size={20} color={activeTab === 'map' ? "#f39c12" : "#999"} />
        </TouchableOpacity>
        <TouchableOpacity style={activeTab === 'tagged' ? styles.tabBtnActive : styles.tabBtn} onPress={() => setActiveTab('tagged')}>
          <Feather name="user" size={20} color={activeTab === 'tagged' ? "#f39c12" : "#999"} />
        </TouchableOpacity>
      </View>
      {activeTab === 'posts' && sections.length > 0 && (
          <View style={{ paddingHorizontal: 16, marginBottom: 12, marginTop: 8 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {sections.map((section, index) => (
                <TouchableOpacity
                  key={section.name + index}
                  style={{ alignItems: 'center', marginRight: 12 }}
                  onPress={() => setSelectedSection(section)}
                >
                  {section.coverImage ? (
                    <Image source={{ uri: section.coverImage }} style={{ width: 64, height: 64, borderRadius: 12 }} />
                  ) : (
                    <View style={{ width: 64, height: 64, borderRadius: 12, backgroundColor: '#eee', alignItems: 'center', justifyContent: 'center' }}>
                      <Feather name="image" size={28} color="#ccc" />
                    </View>
                  )}
                  <Text style={{ fontWeight: '600', fontSize: 13, marginTop: 4, color: selectedSection?.name === section.name ? '#FFB800' : '#222' }}>{section.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}



      {/* Edit Sections Modal */}
      <Modal
        visible={showEditSections}
        animationType="slide"
        transparent={false}
        onRequestClose={() => {
          setShowEditSections(false);
          setSelectedSection(null);
          setSelectedPostIds([]);
        }}
      >
        <View style={{ flex: 1, backgroundColor: '#fff' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', padding: 18 }}>
            <TouchableOpacity onPress={() => {
              setShowEditSections(false);
              setSelectedSection(null);
              setSelectedPostIds([]);
            }}>
              <Feather name="x" size={28} color="#222" />
            </TouchableOpacity>
            <Text style={{ flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700' }}>Edit sections</Text>
            <View style={{ width: 28 }} />
          </View>
          {/* Add section */}
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, marginBottom: 12 }}>
            <TextInput
              style={{ backgroundColor: '#fff', borderRadius: 8, padding: 8, fontSize: 16, fontWeight: '600', flex: 1, borderWidth: 2, borderColor: '#FFB800' }}
              value={editSectionName}
              onChangeText={setEditSectionName}
              placeholder="Create a new section"
            />
            <TouchableOpacity style={{ marginLeft: 8, backgroundColor: '#FFB800', borderRadius: 8, padding: 8 }} onPress={handleAddSection}>
              <Feather name="plus" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
          {/* Section list */}
          <View style={{ marginHorizontal: 18, flex: 1 }}>
            <DraggableFlatList
              data={sectionOrder}
              keyExtractor={item => item.name}
              onDragEnd={({ data }) => handleSaveSectionOrder(data)}
              renderItem={({ item: section, drag, isActive }) => (
                <View style={{ marginBottom: 10, flexDirection: 'row', alignItems: 'center' }}>
                  {/* 3-line drag handle - OUTSIDE border */}
                  <TouchableOpacity 
                    onLongPress={drag}
                    delayLongPress={100}
                    style={{ paddingRight: 8, paddingVertical: 12 }}
                  >
                    <Feather name="menu" size={22} color="#888" />
                  </TouchableOpacity>
                  
                  <View
                    style={{ 
                      flex: 1,
                      backgroundColor: selectedSection?.name === section.name ? '#FFB800' : '#fff', 
                      borderRadius: 10, 
                      padding: 12, 
                      flexDirection: 'row', 
                      alignItems: 'center',
                      borderWidth: 1,
                      borderColor: selectedSection?.name === section.name ? '#FFB800' : '#e0e0e0'
                    }}
                  >
                    <TouchableOpacity 
                      style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}
                      onPress={() => { 
                        setSelectedSection(section); 
                        setSelectedPostIds(section.postIds || []); 
                      }}
                    >
                      <View style={{ marginRight: 12 }}>
                        {section.coverImage ? (
                          <Image source={{ uri: section.coverImage }} style={{ width: 60, height: 60, borderRadius: 8 }} />
                        ) : (
                          <View style={{ width: 60, height: 60, borderRadius: 8, backgroundColor: '#f0f0f0', alignItems: 'center', justifyContent: 'center' }}>
                            <Feather name="image" size={24} color="#ccc" />
                          </View>
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        {renamingSection === section.name ? (
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <TextInput
                              style={{ 
                                flex: 1, 
                                borderWidth: 1, 
                                borderColor: '#FFB800', 
                                borderRadius: 6, 
                                padding: 6, 
                                fontSize: 14, 
                                backgroundColor: '#fff',
                                color: '#222'
                              }}
                              value={renameSectionText}
                              onChangeText={setRenameSectionText}
                              autoFocus
                              placeholder="New name..."
                            />
                            <TouchableOpacity 
                              style={{ marginLeft: 6, padding: 6 }} 
                              onPress={() => handleRenameSectionConfirm(section.name)}
                            >
                              <Feather name="check" size={20} color="#4CAF50" />
                            </TouchableOpacity>
                            <TouchableOpacity 
                              style={{ padding: 6 }} 
                              onPress={() => {
                                setRenamingSection(null);
                                setRenameSectionText('');
                              }}
                            >
                              <Feather name="x" size={20} color="#f44336" />
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <Text style={{ fontWeight: '600', fontSize: 16, color: selectedSection?.name === section.name ? '#fff' : '#222' }}>
                            {section.name}
                          </Text>
                        )}
                        <Text style={{ color: selectedSection?.name === section.name ? '#fff' : '#888', fontSize: 14, marginTop: 2 }}>
                          {section.postIds?.length || 0} Posts
                        </Text>
                      </View>
                    </TouchableOpacity>
                    
                    {selectedSection?.name === section.name && (
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <TouchableOpacity 
                          style={{ paddingLeft: 8 }} 
                          onPress={() => {
                            setRenamingSection(section.name);
                            setRenameSectionText(section.name);
                          }}
                        >
                          <Feather name="edit-2" size={18} color="#fff" />
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={{ paddingLeft: 12 }} 
                          onPress={() => handleDeleteSection(section.name)}
                        >
                          <Feather name="trash-2" size={20} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              )}
            />
          </View>
          {/* Posts grid for selected section */}
          {selectedSection && (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: 18, marginTop: 10, marginBottom: 10 }}>
                <Text style={{ flex: 1, fontWeight: '500', fontSize: 15 }}>Select posts to add to this section</Text>
                <TouchableOpacity
                  style={{ 
                    backgroundColor: selectingCover ? '#4CAF50' : '#FFB800', 
                    borderRadius: 8, 
                    paddingHorizontal: 12, 
                    paddingVertical: 8, 
                    flexDirection: 'row', 
                    alignItems: 'center' 
                  }}
                  onPress={() => {
                    setSelectingCover(!selectingCover);
                    if (!selectingCover) {
                      Alert.alert('Select Cover', 'Now tap any post to set it as cover photo', [{ text: 'OK' }]);
                    }
                  }}
                >
                  <Feather name={selectingCover ? "check" : "image"} size={16} color="#fff" />
                  <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14, marginLeft: 6 }}>
                    {selectingCover ? 'Done' : 'Select cover'}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', margin: 18, marginTop: 10 }}>
                {postsToShow.length === 0 ? (
                  <View style={{ width: '100%', alignItems: 'center', padding: 40 }}>
                    <Feather name="image" size={48} color="#ccc" />
                    <Text style={{ color: '#999', marginTop: 12, fontSize: 16 }}>No posts available</Text>
                  </View>
                ) : (
                  postsToShow.map((post) => {
                  const isSelected = selectedPostIds.includes(post.id);
                  const isCover = selectedSection.coverImage === post.imageUrl;
                  return (
                    <TouchableOpacity
                      key={post.id}
                      style={{ width: '33.33%', aspectRatio: 1, padding: 2 }}
                      onPress={() => {
                        if (selectingCover) {
                          // Set as cover
                          const updatedSection = { ...selectedSection, coverImage: post.imageUrl };
                          setSelectedSection(updatedSection);
                          setSections(sections.map(s => s.name === updatedSection.name ? updatedSection : s));
                          setSelectingCover(false);
                        } else {
                          // Toggle selection
                          setSelectedPostIds(isSelected
                            ? selectedPostIds.filter(id => id !== post.id)
                            : [...selectedPostIds, post.id]);
                        }
                      }}
                    >
                      <Image
                        source={{ uri: post.imageUrl }}
                        style={{ width: '100%', height: '100%', borderRadius: 4 }}
                        resizeMode="cover"
                      />
                      {isSelected && !selectingCover && (
                        <View style={{ 
                          position: 'absolute', 
                          top: 0, 
                          right: 0, 
                          backgroundColor: '#FFB800', 
                          borderRadius: 12, 
                          width: 20, 
                          height: 20, 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          margin: 4
                        }}>
                          <Feather name="check" size={14} color="#fff" />
                        </View>
                      )}
                      {isCover && (
                        <View style={{ position: 'absolute', top: 4, left: 4, backgroundColor: '#FFB800', borderRadius: 8, padding: 4 }}>
                          <Feather name="star" size={14} color="#fff" />
                        </View>
                      )}
                      {selectingCover && (
                        <View style={{ 
                          position: 'absolute', 
                          top: 0, 
                          left: 0, 
                          right: 0, 
                          bottom: 0, 
                          backgroundColor: 'rgba(76, 175, 80, 0.3)',
                          borderRadius: 4,
                          borderWidth: 2,
                          borderColor: '#4CAF50',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <Feather name="image" size={32} color="#fff" />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })
                )}
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 18, marginBottom: 18 }}>
                <TouchableOpacity 
                  onPress={() => {
                    setSelectedPostIds([]);
                    Alert.alert('Cleared', 'All selected posts have been cleared');
                  }}
                >
                  <Text style={{ color: '#222', fontWeight: '600', fontSize: 16 }}>Clear all</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ backgroundColor: '#FFB800', borderRadius: 8, paddingHorizontal: 32, paddingVertical: 12 }}
                  onPress={async () => {
                    await handleSaveSectionPosts();
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Save</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </Modal>

      {activeTab === 'posts' && (
        <View style={styles.grid}>
          {(selectedSection
            ? postsToShow.filter(post => selectedSection.postIds.includes(post.id))
            : postsToShow
          ).map((post) => (
            <TouchableOpacity key={post.id} style={styles.gridItem} onPress={() => setSelectedPost(post)}>
              <Image 
                source={{ uri: post.imageUrl }} 
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
            </TouchableOpacity>
          ))}
        </View>
      )}
        {activeTab === 'map' && (
          <View style={{ width: '100%', height: 400, marginTop: 12, borderRadius: 12, overflow: 'hidden' }}>
            {postsToShow.filter(p => p.lat != null && p.lon != null).length === 0 ? (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#eaf6ff', borderRadius: 12 }}>
                <Feather name="map" size={64} color="#007aff" />
                <Text style={{ color: '#007aff', fontWeight: '600', marginTop: 8 }}>No location data available</Text>
                <Text style={{ color: '#007aff', fontSize: 13, marginTop: 4 }}>Posts with locations will appear here</Text>
              </View>
            ) : (
              <MapView
                style={{ width: '100%', height: '100%' }}
                initialRegion={{
                  latitude: postsToShow.find(p => p.lat != null)?.lat || 20,
                  longitude: postsToShow.find(p => p.lon != null)?.lon || 0,
                  latitudeDelta: 20,
                  longitudeDelta: 20,
                }}
              >
                {postsToShow
                  .filter(p => p.lat != null && p.lon != null)
                  .map((post) => (
                    <Marker
                      key={post.id}
                      coordinate={{
                        latitude: post.lat!,
                        longitude: post.lon!,
                      }}
                      onPress={() => setSelectedPost(post)}
                    >
                      <View style={{ alignItems: 'center' }}>
                        <Image
                          source={{ uri: post.userAvatar || DEFAULT_AVATAR_URL }}
                          style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 3, borderColor: '#fff' }}
                        />
                      </View>
                    </Marker>
                  ))}
              </MapView>
            )}
          </View>
        )}
      {activeTab === 'tagged' && (
        <View style={{ width: '100%', minHeight: 120 }}>
          {allTaggedPosts.length === 0 ? (
            <View style={{ alignItems: 'center', justifyContent: 'center', backgroundColor: '#fffbe6', borderRadius: 12, marginTop: 12, paddingVertical: 40 }}>
              <Feather name="tag" size={48} color="#f39c12" />
              <Text style={{ color: '#f39c12', fontWeight: '600', marginTop: 8 }}>No tagged posts yet</Text>
              <Text style={{ color: '#f39c12', fontSize: 13, marginTop: 4 }}>Posts where you're tagged will appear here</Text>
            </View>
          ) : (
            <View style={styles.grid}>
              {allTaggedPosts.map((post) => (
                <TouchableOpacity key={post.id} style={styles.gridItem} onPress={() => setSelectedPost(post)}>
                  <Image 
                    source={{ uri: post.imageUrl }} 
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="cover"
                  />
                  {/* Tag indicator */}
                  <View style={{ position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(243, 156, 18, 0.9)', borderRadius: 12, padding: 4 }}>
                    <Feather name="tag" size={12} color="#fff" />
                  </View>
                </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

      {/* Modal for full-screen post view with vertical scroll */}
      {selectedPost && (
        <Modal
          visible={!!selectedPost}
          animationType="slide"
          transparent={false}
          onRequestClose={() => setSelectedPost(null)}
        >
          <View style={{ flex: 1, backgroundColor: '#000' }}>
            <FlatList
              data={activeTab === 'tagged' ? allTaggedPosts : activeTab === 'posts' && selectedSection ? selectedSectionPosts : postsToShow}
              keyExtractor={item => item.id}
              renderItem={({ item: post }) => (
                <ProfilePostModalItem
                  post={post}
                  onClose={() => setSelectedPost(null)}
                  onLike={handleLike}
                  onComment={handleComment}
                  onShare={handleShare}
                  onDelete={handleDelete}
                  currentUser={profile && typeof profile.id === 'string' ? profile : null}
                />
              )}
              pagingEnabled
              showsVerticalScrollIndicator={false}
              snapToAlignment="start"
              decelerationRate="fast"
              initialScrollIndex={postsToShow.findIndex(p => p.id === selectedPost.id)}
              getItemLayout={(data, index) => ({
                length: Dimensions.get('window').height,
                offset: Dimensions.get('window').height * index,
                index,
              })}
            />
          </View>
        </Modal>
      )}

      {/* Comments Modal */}
      {showCommentsModal && selectedPostForComments && (
        <Modal
          visible={showCommentsModal}
          animationType="slide"
          transparent={false}
          onRequestClose={() => {
            setShowCommentsModal(false);
            setComments([]);
            setNewComment('');
          }}
        >
          <View style={{ flex: 1, backgroundColor: '#fff' }}>
            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderColor: '#eee' }}>
              <Text style={{ fontSize: 18, fontWeight: '700', flex: 1 }}>Comments</Text>
              <TouchableOpacity onPress={() => {
                setShowCommentsModal(false);
                setComments([]);
                setNewComment('');
              }}>
                <Feather name="x" size={24} color="#222" />
              </TouchableOpacity>
            </View>

            {/* Comments List */}
            <FlatList
              data={comments}
              keyExtractor={item => item.id}
              renderItem={({ item: comment }) => (
                <View style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5, borderColor: '#f0f0f0' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                    <CommentAvatar userId={comment.userId} userAvatar={comment.userAvatar} />
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={{ fontWeight: '600', fontSize: 14, color: '#222' }}>{comment.userName}</Text>
                        <Text style={{ fontSize: 12, color: '#999', marginLeft: 6 }}>2m</Text>
                      </View>
                      <Text style={{ fontSize: 14, color: '#222', marginTop: 4, lineHeight: 20 }}>{comment.text}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                          <TouchableOpacity
                            style={{ marginRight: 16 }}
                            onPress={async () => {
                              if (!currentUser) return;
                              if (comment.likes && Array.isArray(comment.likes) && comment.likes.includes(currentUser.uid)) {
                                await unlikeComment(selectedPostForComments.id, comment.id, currentUser.uid);
                              } else {
                                await likeComment(selectedPostForComments.id, comment.id, currentUser.uid);
                              }
                              await loadPostComments(selectedPostForComments.id);
                            }}
                          >
                            <Feather
                              name={comment.likes && Array.isArray(comment.likes) && comment.likes.includes(currentUser?.uid) ? "heart" : "heart"}
                              size={14}
                              color={comment.likes && Array.isArray(comment.likes) && comment.likes.includes(currentUser?.uid) ? "#e0245e" : "#999"}
                              style={{ fontWeight: comment.likes && Array.isArray(comment.likes) && comment.likes.includes(currentUser?.uid) ? "bold" : "normal" }}
                            />
                            <Text style={{ fontSize: 12, color: '#999', marginLeft: 4 }}>{comment.likesCount || 0}</Text>
                          </TouchableOpacity>
                          <Text style={{ fontSize: 12, color: '#999' }}>Reply</Text>
                      </View>
                    </View>
                    {currentUser?.uid === comment.userId && (
                      <TouchableOpacity onPress={() => handleDeleteComment(comment.id)} style={{ padding: 6 }}>
                        <Feather name="x" size={16} color="#ccc" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}
              ListEmptyComponent={
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 }}>
                  <Text style={{ fontSize: 16, color: '#999' }}>
                    {loadingComments ? 'Loading comments...' : 'No comments yet. Be first to comment!'}
                  </Text>
                </View>
              }
            />

            {/* Input Box */}
            <View style={{ borderTopWidth: 0.5, borderColor: '#eee', paddingHorizontal: 12, paddingVertical: 12, backgroundColor: '#fff' }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
                <Image 
                  source={{ uri: currentUser?.photoURL || 'https://via.placeholder.com/40?text=You' }} 
                  style={{ width: 32, height: 32, borderRadius: 16, marginRight: 10 }} 
                />
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-end', backgroundColor: '#f5f5f5', borderRadius: 20, paddingHorizontal: 16 }}>
                  <TextInput
                    style={{ flex: 1, paddingHorizontal: 0, paddingVertical: 10, fontSize: 14, color: '#222' }}
                    placeholder="Add a comment..."
                    placeholderTextColor="#999"
                    value={newComment}
                    onChangeText={setNewComment}
                    multiline
                    maxLength={500}
                  />
                  <TouchableOpacity onPress={handlePostComment} disabled={!newComment.trim()}>
                    <Feather name="send" size={18} color={newComment.trim() ? '#007aff' : '#ddd'} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Stories Viewer Modal */}
      <Modal 
        visible={showStoriesViewer} 
        transparent={true} 
        animationType="fade"
        onRequestClose={() => setShowStoriesViewer(false)}
      >
        <StoriesViewer
          stories={userStories}
          initialIndex={storiesViewerIndex}
          onClose={() => setShowStoriesViewer(false)}
        />
      </Modal>
    </ScrollView>
  );
}

/**
 * @param {Object} props
 * @param {Object} props.post
 * @param {Function} props.onClose
 * @param {Function} props.onLike
 * @param {Function} props.onComment
 * @param {Function} props.onShare
 * @param {Function} props.onDelete
 * @param {Object|null} props.currentUser
 */

function ProfilePostModalItem({ post, onClose, onLike, onComment, onShare, onDelete, currentUser }: any) {
  const [muted, setMuted] = React.useState(true);
  const isVideo = post.mediaType === 'video' || !!post.videoUrl;
  const screenHeight = Dimensions.get('window').height;
  
  return (
    <View style={{ width: width, height: screenHeight, backgroundColor: '#000' }}>
      {/* Close button - top left */}
      <TouchableOpacity 
        onPress={onClose} 
        style={{ position: 'absolute', top: 50, left: 16, zIndex: 10, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 20, padding: 8 }}
      >
        <Feather name="x" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Media - Full height */}
      {isVideo ? (
        <View style={{ width: '100%', height: '100%', position: 'absolute' }}>
          <Video
            source={{ uri: typeof post.videoUrl === 'string' ? post.videoUrl : (typeof post.imageUrl === 'string' ? post.imageUrl : '') }}
            style={{ width: '100%', height: '100%' }}
            useNativeControls
            resizeMode={ResizeMode.CONTAIN}
            shouldPlay={true}
            isLooping
            isMuted={muted}
            posterSource={post.imageUrl ? { uri: post.imageUrl } : undefined}
            posterStyle={{ resizeMode: 'contain' }}
          />
          <TouchableOpacity
            style={{ position: 'absolute', bottom: 100, right: 16, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20, padding: 8, zIndex: 2 }}
            onPress={() => setMuted(m => !m)}
          >
            <Feather name={muted ? 'volume-x' : 'volume-2'} size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      ) : (
        <Image source={{ uri: post.imageUrl }} style={{ width: '100%', height: '100%', position: 'absolute' }} resizeMode="contain" />
      )}

      {/* Bottom overlay with user info and actions - Instagram style */}
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'transparent' }}>
        {/* User info and caption */}
        <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, backgroundColor: 'rgba(0,0,0,0.3)' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Image source={{ uri: post.userAvatar }} style={{ width: 32, height: 32, borderRadius: 16, marginRight: 10, borderWidth: 2, borderColor: '#fff' }} />
            <Text style={{ fontWeight: '700', fontSize: 15, color: '#fff' }}>{post.userName}</Text>
            {post.location && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 8 }}>
                <Feather name="map-pin" size={12} color="#fff" />
                <Text style={{ fontSize: 12, color: '#fff', marginLeft: 3 }}>{post.location}</Text>
              </View>
            )}
          </View>
          {post.caption && (
            <Text style={{ fontSize: 14, color: '#fff', lineHeight: 20, marginBottom: 8 }}>
              <Text style={{ fontWeight: '600' }}>{post.userName} </Text>
              {post.caption}
            </Text>
          )}
        </View>

        {/* Action buttons row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <TouchableOpacity onPress={() => onLike(post)} style={{ marginRight: 18 }}>
            <Feather name={post.liked ? 'heart' : 'heart'} size={26} color={post.liked ? '#e0245e' : '#fff'} style={{ fontWeight: post.liked ? 'bold' : 'normal' }} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onComment(post)} style={{ marginRight: 18 }}>
            <Feather name="message-circle" size={26} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onShare(post)} style={{ marginRight: 18 }}>
            <Feather name="send" size={26} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          {post.userId === currentUser?.uid && (
            <TouchableOpacity onPress={() => onDelete(post)}>
              <Feather name="trash-2" size={22} color="#fff" />
            </TouchableOpacity>
          )}
        </View>

        {/* Likes and comments count */}
        <View style={{ paddingHorizontal: 16, paddingBottom: 16, backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff', marginBottom: 2 }}>
            {post.likesCount || 0} likes
          </Text>
          {(post.commentsCount || 0) > 0 && (
            <TouchableOpacity onPress={() => onComment(post)}>
              <Text style={{ fontSize: 13, color: '#bbb' }}>View all {post.commentsCount} comments</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}