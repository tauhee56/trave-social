import { Feather } from "@expo/vector-icons";
import { Image as ExpoImage } from 'expo-image';
import { useLocalSearchParams, useRouter } from "expo-router";
// Firestore imports removed
import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    LayoutAnimation,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import LiveStreamsRow from '../../src/_components/LiveStreamsRow';
import PostCard from '../../app/_components/PostCard';
import StoriesRow from '../../src/_components/StoriesRow';
import StoriesViewer from '../../src/_components/StoriesViewer';
import { getResponsivePadding, scaleFontSize } from '../../utils/responsive';

import { DEFAULT_CATEGORIES, getCategories } from '../../lib/firebaseHelpers/index';
import { useAuthUser } from '../../src/_components/UserContext';
import apiService from '../../src/_services/apiService';
import { useTabEvent } from './_layout';

const { width } = Dimensions.get("window");

export default function Home() {
    // Map DEFAULT_CATEGORIES to objects for UI
    const defaultCategoryObjects = Array.isArray(DEFAULT_CATEGORIES)
      ? DEFAULT_CATEGORIES.map((cat: any) =>
          typeof cat === 'string'
            ? { name: cat, image: 'https://via.placeholder.com/40x40.png?text=' + encodeURIComponent(cat) }
            : cat
        )
      : [];
    const [categories, setCategories] = useState(defaultCategoryObjects);
  const params = useLocalSearchParams();
  const filter = (params.filter as string) || '';
  const router = useRouter();
  
  const [posts, setPosts] = useState<any[]>([]);
  const authUser = useAuthUser();
  const padding = getResponsivePadding();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [feedReloadKey, setFeedReloadKey] = useState(0); // For FlatList force update
  const [unreadCount, setUnreadCount] = useState(0);
  const [showStoriesViewer, setShowStoriesViewer] = useState(false);
  const [selectedStories, setSelectedStories] = useState<any[]>([]);
  const [storiesRefreshTrigger, setStoriesRefreshTrigger] = useState(0);
  const [lastVisible, setLastVisible] = useState<any>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [allLoadedPosts, setAllLoadedPosts] = useState<any[]>([]);
  const [loopCount, setLoopCount] = useState(0); // Track how many times looped
  const flatListRef = React.useRef<FlatList>(null);

  // Memoized shuffle - only recreate if postsArray reference changes
  const shufflePosts = useCallback((postsArray: any[]) => {
    const shuffled = [...postsArray];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }, []);

  // Memoized feed mixer
  const createMixedFeed = useCallback((postsArray: any[]) => {
    if (postsArray.length === 0) return [];
    
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const threeDaysAgo = now - 3 * 24 * 60 * 60 * 1000;
    
    const recentPosts = postsArray.filter((p: any) => {
      const postTime = p.createdAt?.toMillis ? p.createdAt.toMillis() : p.createdAt;
      return postTime > oneDayAgo;
    });
    
    const mediumPosts = postsArray.filter((p: any) => {
      const postTime = p.createdAt?.toMillis ? p.createdAt.toMillis() : p.createdAt;
      return postTime <= oneDayAgo && postTime > threeDaysAgo;
    });
    
    const olderPosts = postsArray.filter((p: any) => {
      const postTime = p.createdAt?.toMillis ? p.createdAt.toMillis() : p.createdAt;
      return postTime <= threeDaysAgo;
    });
    
    const shuffledRecent = shufflePosts(recentPosts);
    const shuffledMedium = shufflePosts(mediumPosts);
    const shuffledOlder = shufflePosts(olderPosts);
    
    const mixed: any[] = [];
    const recentCount = Math.min(5, shuffledRecent.length);
    mixed.push(...shuffledRecent.slice(0, recentCount));
    
    const remaining = [
      ...shuffledRecent.slice(recentCount),
      ...shuffledMedium,
      ...shuffledOlder
    ];
    
    mixed.push(...shufflePosts(remaining));
    return mixed;
  }, [shufflePosts]);

  // Memoized render for FlatList items
  const renderPostItem = useCallback(({ item }: { item: any }) => {
    const currentUser = null;
    
    // Fallback for missing media
    if (!item || (!item.imageUrl && (!item.imageUrls || item.imageUrls.length === 0)) && (!item.videoUrl && (!item.videoUrls || item.videoUrls.length === 0))) {
      return (
        <View style={{ height: 320, backgroundColor: '#222', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
          <Feather name="image" size={80} color="#dbdbdb" />
          <Text style={{ color: '#fff', marginTop: 12 }}>No media found for this post</Text>
        </View>
      );
    }
    
    return <PostCard post={item} currentUser={currentUser} showMenu={false} />;
  }, []);

  // Load categories on mount
  useEffect(() => {
    loadCategories();
  }, []);

  // Listen for feed events (post deleted, privacy changed, etc.)
  useEffect(() => {
    const { feedEventEmitter } = require('../../lib/feedEventEmitter');

    const unsubscribe = feedEventEmitter.onFeedUpdate((event: any) => {
      console.log('📢 Feed event received in home:', event.type);

      if (event.type === 'POST_DELETED') {
        // Remove deleted post from feed
        setPosts(prev => prev.filter(p => p.id !== event.postId));
        setAllLoadedPosts(prev => prev.filter(p => p.id !== event.postId));
      } else if (event.type === 'POST_CREATED') {
        // Refresh feed to show new post
        onRefresh();
      } else if (event.type === 'USER_PRIVACY_CHANGED') {
        // Refresh feed to apply privacy changes
        onRefresh();
      } else if (event.type === 'POST_UPDATED' && event.postId) {
        // Sync like state across duplicates of the same post
        const { data } = event;
        if (data && (typeof data.likesCount !== 'undefined' || typeof data.liked !== 'undefined')) {
          setPosts(prev => prev.map(p => {
            if (p.id !== event.postId) return p;
            const next = { ...p };
            if (typeof data.likesCount === 'number') {
              next.likesCount = data.likesCount;
            }
            if (typeof data.liked === 'boolean' && currentUser?.uid) {
              const uid = currentUser.uid;
              const arr = Array.isArray(next.likes) ? next.likes : [];
              next.likes = data.liked ? (arr.includes(uid) ? arr : [...arr, uid]) : arr.filter((id: string) => id !== uid);
            }
            return next;
          }));
          setAllLoadedPosts(prev => prev.map(p => {
            if (p.id !== event.postId) return p;
            const next = { ...p };
            if (typeof data.likesCount === 'number') {
              next.likesCount = data.likesCount;
            }
            if (typeof data.liked === 'boolean' && currentUser?.uid) {
              const uid = currentUser.uid;
              const arr = Array.isArray(next.likes) ? next.likes : [];
              next.likes = data.liked ? (arr.includes(uid) ? arr : [...arr, uid]) : arr.filter((id: string) => id !== uid);
            }
            return next;
          }));
        }
      } else if (event.type === 'USER_BLOCKED' || event.type === 'USER_UNBLOCKED') {
        // Refresh feed to apply blocking changes
        onRefresh();
      }
    });

    return unsubscribe;
  }, []);

  // Listen for home tab press event from context - scroll to top and refresh
  const tabEvent = useTabEvent();
  useEffect(() => {
    if (!tabEvent) return;
    const unsubscribe = tabEvent.subscribeHomeTabPress(() => {
      // Scroll to top
      if (flatListRef.current) {
        flatListRef.current.scrollToOffset({ offset: 0, animated: true });
      }

      // After scrolling, create fresh mixed feed with complete re-shuffle
      setTimeout(() => {
        if (allLoadedPosts.length > 0) {
          // Clear first, then set new shuffled feed
          setPosts([]);
          setFeedReloadKey(prev => prev + 1);

          setTimeout(() => {
            const newMixedFeed = createMixedFeed(allLoadedPosts);
            setPosts(newMixedFeed);
            setFeedReloadKey(prev => prev + 1);
          }, 10);
        }
      }, 300);
    });
    return unsubscribe;
  }, [tabEvent, allLoadedPosts]);

  useEffect(() => {
    async function fetchNotifications() {
      const user = null;
      if (!user || !user.uid) return;
      const result = await getUserNotifications(user.uid);
      if (Array.isArray(result)) {
        const unread = result.filter((n: any) => n.read === false || n.read === undefined);
        setUnreadCount(unread.length);
      }
    }
    fetchNotifications();
  }, []);

  // OPTIMIZATION: One-time fetch instead of real-time listener (saves 70% Firebase reads)
  useEffect(() => {
    loadInitialFeed();
  }, []);

  const loadInitialFeed = async () => {
    setLoading(true);
    try {
      // Fetch posts from backend
      const posts = await apiService.get('/posts');
      setAllLoadedPosts(posts);
      const mixedFeed = createMixedFeed(posts);
      setPosts(mixedFeed);
      setLoading(false);
    } catch (error) {
      setLoading(false);
    }
  };

  // OPTIMIZATION: Load more posts (reduced from 20 to 10)
  async function loadMorePosts() {
    if (loadingMore || allLoadedPosts.length === 0) return;
    setLoadingMore(true);
    
    try {
      // Create new shuffled version of existing posts with unique keys for loop
      const reshuffled = shufflePosts(allLoadedPosts).map((post, idx) => ({
        ...post,
        _loopKey: `loop-${loopCount + 1}-${post.id}-${idx}`, // Unique key for each loop iteration
      }));
      
      // Append to existing feed to create seamless loop
      setPosts(prev => [...prev, ...reshuffled]);
      setLoopCount(prev => prev + 1);
    } catch (error) {
      logger.error('Loop posts error:', error);
    }
    
    setLoadingMore(false);
  }

    async function loadCategories() {
      const cats = await getCategories();
      // Map each category to correct shape
      const mappedCats = Array.isArray(cats)
        ? cats.map((c: any) => {
            if (typeof c === 'string') {
              return { name: c, image: 'https://via.placeholder.com/40x40.png?text=' + encodeURIComponent(c) };
            }
            return {
              name: typeof c.name === 'string' ? c.name : '',
              image: typeof c.image === 'string' ? c.image : 'https://via.placeholder.com/40x40.png?text=' + encodeURIComponent(c.name || 'Category')
            };
          }).filter((c: any) => c.name && c.image)
        : [];
      setCategories(mappedCats.length > 0 ? mappedCats : defaultCategoryObjects);
    }

  async function onRefresh() {
    setRefreshing(true);

    // OPTIMIZATION: Fetch fresh posts (reduced from 30 to 10)
    try {
      // Fetch fresh posts from backend
      const freshPosts = await apiService.get('/posts');
      setAllLoadedPosts(freshPosts);
      const mixedFeed = createMixedFeed(freshPosts);
      setPosts([]);
      setFeedReloadKey(prev => prev + 1);
      setTimeout(() => {
        setPosts(mixedFeed);
        setFeedReloadKey(prev => prev + 1);
      }, 10);
    } catch (error) {
    }
    setRefreshing(false);
  }

  const selectedPostId = (params.postId as string) || '';
const locationFilter = (params.location as string) || '';






// Fast privacy filtering
function filterPostsByPrivacy(posts: any[], currentUserId: string | undefined) {
  const filtered = posts.filter(post => {
    if (!post.userId) return false;
    if (post.isPrivate) {
      return Array.isArray(post.allowedFollowers) && currentUserId && post.allowedFollowers.includes(currentUserId);
    }
    return true;
  });
  return filtered;
}

// Enhanced privacy filter that checks user's current privacy status - OPTIMIZED
async function filterPostsByPrivacyWithUserCheck(posts: any[], currentUserId: string | undefined) {
  if (!currentUserId) {
    return posts.filter(post => !post.isPrivate);
  }
  
  // Get unique user IDs from posts
  const uniqueUserIds = [...new Set(posts.map(p => p.userId).filter(Boolean))] as string[];
  
  // Batch fetch all users at once instead of one by one
  const userPrivacyMap = new Map<string, { isPrivate: boolean; followers: string[] }>();
  
  // Fetch in batches of 10 for better performance
  const batchSize = 10;
  for (let i = 0; i < uniqueUserIds.length; i += batchSize) {
    const batch = uniqueUserIds.slice(i, i + batchSize);
    const promises = batch.map(async (userId) => {
      try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          return { userId, data: { isPrivate: userData.isPrivate || false, followers: userData.followers || [] } };
        }
        return { userId, data: null };
      } catch {
        return { userId, data: null };
      }
    });
    
    const results = await Promise.all(promises);
    results.forEach(({ userId, data }) => {
      if (data) userPrivacyMap.set(userId, data);
    });
  }
  
  // Filter posts based on both post privacy and user privacy
  return posts.filter(post => {
    if (!post.userId) return false;
    
    const userPrivacy = userPrivacyMap.get(post.userId);
    
    if (post.isPrivate) {
      return Array.isArray(post.allowedFollowers) && post.allowedFollowers.includes(currentUserId);
    }
    
    if (userPrivacy?.isPrivate) {
      return post.userId === currentUserId || userPrivacy.followers.includes(currentUserId);
    }
    
    return true;
  });
}

const currentUser = null;
const currentUserId = currentUser?.uid;


// Memoize filteredRaw to avoid unnecessary recalculation and update loops
const filteredRaw = React.useMemo(() => {
  if (locationFilter) {
    const locationPosts = posts.filter((p: any) => {
      if (typeof p.location === 'string') {
        return p.location.toLowerCase() === locationFilter.toLowerCase();
      }
      if (typeof p.location === 'object' && p.location?.name) {
        return p.location.name.toLowerCase() === locationFilter.toLowerCase();
      }
      return false;
    });
    // Remove duplicate: only show selected post once
    const uniquePosts = locationPosts.filter((p, idx, arr) => arr.findIndex(q => q.id === p.id) === idx);
    if (selectedPostId) {
      const selectedPost = uniquePosts.find(p => p.id === selectedPostId);
      const otherPosts = uniquePosts.filter(p => p.id !== selectedPostId);
      return selectedPost ? [selectedPost, ...otherPosts] : otherPosts;
    }
    return uniquePosts;
  } else if (filter) {
    return posts.filter((p: any) => p.category && p.category.toLowerCase() === filter.toLowerCase());
  }
  return posts;
}, [posts, locationFilter, filter, selectedPostId]);


const [privacyFiltered, setPrivacyFiltered] = useState<any[]>([]);



useEffect(() => {
  let isMounted = true;
  async function applyPrivacyFilter() {
    const filtered = await filterPostsByPrivacyWithUserCheck(filteredRaw, currentUserId);
    // Only update state if result is different and component is mounted
    if (isMounted && JSON.stringify(filtered) !== JSON.stringify(privacyFiltered)) {
      setPrivacyFiltered(filtered);
    }
  }
  applyPrivacyFilter();
  return () => { isMounted = false; };
}, [filteredRaw, currentUserId]);

let filteredPosts = privacyFiltered;

  if (loading) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}> 
        <ActivityIndicator size="large" color="#f39c12" />
      </View>
    );
  }

  const resetFeed = async () => {
    setLoading(true);
    setPosts([]);
    router.replace('/(tabs)/home');
    router.setParams({ filter: undefined, location: undefined, postId: undefined });
    
    // Fetch fresh posts and create new mixed feed
    try {
      const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(30));
      const snapshot = await getDocs(q);
      const freshPosts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        locationName: doc.data().locationData?.name || doc.data().location || '',
      }));
      
      // Apply privacy filter immediately
      const currentUser = null;
      const privacyFilteredPosts = filterPostsByPrivacy(freshPosts, currentUser?.uid);
      
      setAllLoadedPosts(privacyFilteredPosts);
      const mixedFeed = createMixedFeed(privacyFilteredPosts);
      setPosts(mixedFeed);
      setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
      setFeedReloadKey(prev => prev + 1);
      setLoading(false);
    } catch (error) {
      logger.error('Reset feed error:', error);
      setLoading(false);
    }
  };

  const searchText = (!filter && !locationFilter) ? 'Search' : (locationFilter ? locationFilter : filter);

  return (
    <View style={styles.container}> 
      {/* Go Live floating button */}
      <TouchableOpacity 
        style={{
          position: 'absolute',
          bottom: 20,
          right: 20,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: '#e0245e',
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#e0245e',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.4,
          shadowRadius: 8,
          elevation: 8,
          zIndex: 100,
        }}
        onPress={() => router.push('/go-live')}
        activeOpacity={0.85}
      >
        <Feather name="video" size={24} color="#fff" />
      </TouchableOpacity>

      <FlatList
        ref={flatListRef}
        data={filteredPosts}
        keyExtractor={(item, index) => item._loopKey || `${item.id}-${index}`}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f39c12" />}
        key={feedReloadKey}
        onContentSizeChange={() => LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)}
        ListHeaderComponent={() => (
          <View>
            <StoriesRow
              onStoryPress={(stories, _index) => {
                setSelectedStories(stories);
                setShowStoriesViewer(true);
              }}
              refreshTrigger={storiesRefreshTrigger}
            />
            <LiveStreamsRow />
            <View style={styles.headerSection}>
              <TouchableOpacity
                style={styles.searchBar}
                onPress={() => router.push('/search-modal' as any)}
                activeOpacity={0.7}
                accessible={true}
                accessibilityRole="search"
                accessibilityLabel="Search posts"
              >
                <Feather name="search" size={18} color="#222" accessibilityElementsHidden={true} importantForAccessibility="no" />
                <Text style={[styles.searchText, { fontSize: scaleFontSize(15, 13, 18) }]}>{loading ? 'Loading...' : searchText}</Text>
              </TouchableOpacity>
              <View style={styles.chipsRow}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 8 }}>
                  <View style={{ flexDirection: 'row' }}>
                    {categories.map((cat) => (
                      <TouchableOpacity
                        key={cat.name}
                        style={[styles.chip, filter === cat.name && styles.chipActive]}
                        onPress={() => {
                          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                          const next = cat.name === filter ? '' : cat.name;
                          if (next) router.push(`/(tabs)/home?filter=${encodeURIComponent(next)}`);
                          else router.push(`/(tabs)/home`);
                        }}
                        activeOpacity={0.8}
                        accessible={true}
                        accessibilityRole="button"
                        accessibilityLabel={`Filter by category: ${cat.name}`}
                        accessibilityState={{ selected: filter === cat.name }}
                      >
                        <View style={[styles.chipIconWrap, filter === cat.name && styles.chipIconWrapActive]}>
                          <ExpoImage
                            source={{ uri: cat.image }}
                            style={styles.categoryImage}
                            contentFit="cover"
                            transition={300}
                            accessibilityIgnoresInvertColors
                            accessibilityLabel={`${cat.name} icon`}
                            cachePolicy="memory-disk"
                          />
                        </View>
                        <Text style={[styles.chipText, filter === cat.name && styles.chipTextActive, { fontSize: scaleFontSize(11, 10, 14) }]}>{cat.name}</Text>
                        {filter === cat.name && <View style={styles.chipUnderline} />}
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
            </View>
          </View>
        )}
        renderItem={({ item }) => {
          const currentUser = null;
          // Fallback for missing media
          if (!item || (!item.thumbnailUrl && (!item.imageUrls || item.imageUrls.length === 0)) && (!item.videoUrl && (!item.videoUrls || item.videoUrls.length === 0))) {
            return (
              <View style={{ height: 320, backgroundColor: '#222', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <Feather name="image" size={80} color="#dbdbdb" />
                <Text style={{ color: '#fff', marginTop: 12 }}>No media found for this post</Text>
              </View>
            );
          }
          return <PostCard post={{ ...item, imageUrl: item.thumbnailUrl || item.imageUrl }} currentUser={currentUser} showMenu={false} />;
        }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 64 }}>
            <Feather name="image" size={64} color="#ccc" style={{ marginBottom: 16 }} />
            <Text style={{ color: '#888', fontSize: 18, fontWeight: '500', marginBottom: 4 }}>No posts found</Text>
            <Text style={{ color: '#bbb', fontSize: 14, textAlign: 'center', maxWidth: 220 }}>
              Try another category or create a new post in this category.
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
        initialNumToRender={10}
        windowSize={10}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        contentContainerStyle={{ flexGrow: 1 }}
        getItemLayout={(data, index) => ({ length: 400, offset: 400 * index, index })}
        onEndReached={!filter && !locationFilter ? loadMorePosts : undefined}
        onEndReachedThreshold={!filter && !locationFilter ? 0.8 : undefined}
        ListFooterComponent={!filter && !locationFilter && loadingMore ? (
          <View style={{ padding: 16, alignItems: 'center' }}>
            <ActivityIndicator size="small" color="#f39c12" />
          </View>
        ) : null}
      />
      {showStoriesViewer && selectedStories.length > 0 && (
        <Modal
          visible={showStoriesViewer}
          transparent={false}
          animationType="fade"
          onRequestClose={() => setShowStoriesViewer(false)}
        >
          <StoriesViewer
            stories={selectedStories}
            onClose={() => {
              setShowStoriesViewer(false);
              setStoriesRefreshTrigger(prev => prev + 1);
            }}
          />
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  searchBar: {
    marginHorizontal: 16,
    marginVertical: 12,
    backgroundColor: "#fafafa",
    height: 44,
    borderRadius: 22,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  searchText: { marginLeft: 8, color: "#222", textAlign: "center" },
  headerSection: { paddingBottom: 8 },
  chipsRow: { paddingTop: 4, marginBottom: 8 },
  chip: { 
    backgroundColor: 'transparent', 
    borderWidth: 0, 
    paddingVertical: 6, 
    paddingHorizontal: 6, 
    borderRadius: 18, 
    marginRight: 12, 
    elevation: 0, 
    alignItems: 'center',
    width: 70,
  },
  chipText: { color: '#666', marginTop: 6, textAlign: 'center' },
  chipActive: { backgroundColor: 'transparent' },
  chipIconWrap: { 
    width: 56, 
    height: 56, 
    borderRadius: 12, 
    backgroundColor: '#f5f5f5', 
    alignItems: 'center', 
    justifyContent: 'center', 
    borderWidth: 0,
    overflow: 'hidden',
  },
  chipIconWrapActive: { borderColor: '#f39c12', backgroundColor: 'transparent', borderWidth: 2 },
  chipTextActive: { color: '#111', fontWeight: '700' },
  chipUnderline: { height: 2, backgroundColor: '#f39c12', width: 32, marginTop: 4, borderRadius: 1, alignSelf: 'center' },
  categoryImage: {
    width: 56,
    height: 56,
    borderRadius: 12,
  },
});
