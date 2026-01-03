import { Feather } from "@expo/vector-icons";
import { Image as ExpoImage } from 'expo-image';
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import PostCard from '../../app/_components/PostCard';
import StoriesRow from '../../app/_components/StoriesRow';
import LiveStreamsRow from '../../src/_components/LiveStreamsRow';
import StoriesViewer from '../../app/_components/StoriesViewer';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_CATEGORIES, getCategories } from '../../lib/firebaseHelpers/index';
import { apiService } from '../_services/apiService';

const { width } = Dimensions.get("window");

export default function Home() {
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
    const [allLoadedPosts, setAllLoadedPosts] = useState<any[]>([]);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [currentUserData, setCurrentUserData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [privacyFiltered, setPrivacyFiltered] = useState<any[]>([]);
    const [paginationOffset, setPaginationOffset] = useState(20);
    const POSTS_PER_PAGE = 10;
    const [showStoriesViewer, setShowStoriesViewer] = useState(false);
    const [selectedStories, setSelectedStories] = useState<any[]>([]);
    const [storyInitialIndex, setStoryInitialIndex] = useState(0);
    const [storiesRefreshTrigger, setStoriesRefreshTrigger] = useState(0);
    const flatListRef = React.useRef<FlatList>(null);

    // Get current user ID from AsyncStorage (token-based auth)
    useEffect(() => {
      const getUserId = async () => {
        try {
          const userId = await AsyncStorage.getItem('userId');
          setCurrentUserId(userId);
          
          // Also fetch user's display name and other info
          if (userId) {
            try {
              const response = await apiService.get(`/users/${userId}`);
              if (response.success && response.data) {
                setCurrentUserData(response.data);
                console.log('[Home] Loaded current user data:', response.data?.displayName || response.data?.name);
              }
            } catch (error) {
              console.log('[Home] Could not fetch user data:', error);
            }
          }
        } catch (error) {
          console.error('[Home] Failed to get userId from storage:', error);
        }
      };
      getUserId();
    }, []);

    // Memoized shuffle
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
        
        // Helper to convert createdAt to timestamp
        const getPostTimestamp = (createdAt: any): number => {
            if (!createdAt) return 0;
            // If it's a Firestore timestamp with toMillis()
            if (typeof createdAt.toMillis === 'function') return createdAt.toMillis();
            // If it's an ISO string
            if (typeof createdAt === 'string') return new Date(createdAt).getTime();
            // If it's already a number
            if (typeof createdAt === 'number') return createdAt;
            return 0;
        };
        
        const recentPosts = postsArray.filter((p: any) => {
            const postTime = getPostTimestamp(p.createdAt);
            return postTime > oneDayAgo;
        });
        
        const mediumPosts = postsArray.filter((p: any) => {
            const postTime = getPostTimestamp(p.createdAt);
            return postTime <= oneDayAgo && postTime > threeDaysAgo;
        });
        
        const olderPosts = postsArray.filter((p: any) => {
            const postTime = getPostTimestamp(p.createdAt);
            return postTime <= threeDaysAgo;
        });
        
        console.log('[Home] createMixedFeed - recent:', recentPosts.length, 'medium:', mediumPosts.length, 'older:', olderPosts.length);
        
        const shuffledRecent = shufflePosts(recentPosts);
        const shuffledMedium = shufflePosts(mediumPosts);
        const shuffledOlder = shufflePosts(olderPosts);
        
        const mixed: any[] = [];
        const recentCount = Math.min(5, shuffledRecent.length);
        mixed.push(...shuffledRecent.slice(0, recentCount));
        
        const remaining = [...shuffledRecent.slice(recentCount), ...shuffledMedium, ...shuffledOlder];
        mixed.push(...shufflePosts(remaining));
        return mixed;
    }, [shufflePosts]);

    const loadInitialFeed = async (pageNum = 0) => {
        if (pageNum === 0) setLoading(true);
        try {
            // Request posts with pagination from backend
            const limit = 50; // Request 50 posts at a time from backend
            const skip = pageNum * limit;
            const response = await apiService.get(`/posts?skip=${skip}&limit=${limit}`);
            console.log('[Home] Posts response:', response);
            
            // Handle various response formats from backend
            let postsData: any[] = [];
            if (response?.data && Array.isArray(response.data)) {
                postsData = response.data;
                console.log('[Home] Using response.data format:', postsData.length);
            } else if (response?.posts && Array.isArray(response.posts)) {
                postsData = response.posts;
                console.log('[Home] Using response.posts format:', postsData.length);
            } else if (Array.isArray(response)) {
                postsData = response;
                console.log('[Home] Using response as array:', postsData.length);
            } else {
                console.log('[Home] Unhandled response format:', response);
            }
            
            // Normalize posts: convert MongoDB _id to id, ensure required fields exist
            const normalizedPosts = postsData.map(p => ({
                ...p,
                id: p.id || p._id, // Use id if exists, otherwise use _id
                isPrivate: p.isPrivate ?? false, // Default to false if not set
                allowedFollowers: p.allowedFollowers || [], // Default to empty array
            }));
            
            console.log('[Home] Loaded posts count:', normalizedPosts.length);
            // Log post details
            normalizedPosts.forEach(p => {
                console.log(`  Loaded Post: id=${p.id}, userId=${p.userId}, isPrivate=${p.isPrivate}, category=${p.category}, location=${p.location?.name || p.location}`);
            });
            
            if (pageNum === 0) {
                // First page: replace all
                console.log('[Home] Setting allLoadedPosts to:', normalizedPosts.length);
                setAllLoadedPosts(normalizedPosts);
                const mixedFeed = createMixedFeed(normalizedPosts);
                console.log('[Home] Mixed feed count:', mixedFeed.length);
                setPosts(mixedFeed);
                setPaginationOffset(20); // Reset pagination
            } else {
                // Subsequent pages: append
                setAllLoadedPosts(prev => {
                    const updated = [...prev, ...normalizedPosts];
                    // Deduplicate by ID
                    const unique = Array.from(new Map(updated.map(p => [p.id, p])).values());
                    return unique;
                });
            }
        } catch (error) {
            console.error('[Home] Error loading posts:', error);
        } finally {
            if (pageNum === 0) setLoading(false);
        }
    };

    const loadCategories = async () => {
        const cats = await getCategories();
        const mappedCats = Array.isArray(cats)
            ? cats.map((c: any) => {
                if (typeof c === 'string') return { name: c, image: 'https://via.placeholder.com/40x40.png?text=' + encodeURIComponent(c) };
                return {
                    name: typeof c.name === 'string' ? c.name : '',
                    image: typeof c.image === 'string' ? c.image : 'https://via.placeholder.com/40x40.png?text=' + encodeURIComponent(c.name || 'Category')
                };
            }).filter((c: any) => c.name && c.image)
            : [];
        setCategories(mappedCats.length > 0 ? mappedCats : defaultCategoryObjects);
    };

    useEffect(() => {
        console.log('[Home] Initial load effect running...');
        loadInitialFeed();
        loadCategories();
    }, []);

    // Privacy Filter logic - FIXED to properly check if user has access
    async function filterPostsByPrivacy(posts: any[], userId: string | undefined) {
        // If no user logged in, show only public posts
        if (!userId) return posts.filter(post => !post.isPrivate);
        
        // For logged-in users: show all non-private posts + private posts they have access to
        return posts.filter(post => {
            if (!post.userId) return false;
            
            // Show own posts
            if (post.userId === userId) return true;
            
            // Show public posts
            if (!post.isPrivate) return true;
            
            // Show private posts only if current user is in allowedFollowers
            if (post.isPrivate && Array.isArray(post.allowedFollowers)) {
                return post.allowedFollowers.includes(userId);
            }
            
            return false;
        });
    }

    const filteredRaw = React.useMemo(() => {
        console.log('[Home] filteredRaw memo - posts count:', posts.length, 'filter:', filter, 'location:', params.location);
        
        const locationFilter = params.location as string;
        const selectedPostId = params.postId as string;

        if (locationFilter) {
            const locationPosts = posts.filter((p: any) => {
                const pLoc = typeof p.location === 'object' ? p.location?.name : p.location;
                return pLoc?.toLowerCase() === locationFilter.toLowerCase();
            });
            console.log('[Home] filteredRaw location filter - result:', locationPosts.length);
            if (selectedPostId) {
                const selected = locationPosts.find(p => p.id === selectedPostId);
                const others = locationPosts.filter(p => p.id !== selectedPostId);
                return selected ? [selected, ...others] : others;
            }
            return locationPosts;
        } else if (filter) {
            const categoryPosts = posts.filter((p: any) => p.category?.toLowerCase() === filter.toLowerCase());
            console.log('[Home] filteredRaw category filter - result:', categoryPosts.length);
            return categoryPosts;
        }
        console.log('[Home] filteredRaw no filter - returning all posts');
        return posts;
    }, [posts, params.location, filter, params.postId]);

    useEffect(() => {
        let isMounted = true;
        const applyFilter = async () => {
            console.log('[Home] Apply filter - filteredRaw count:', filteredRaw.length, 'currentUserId:', currentUserId, 'paginationOffset:', paginationOffset);
            
            // Remove duplicates using Set based on post ID
            const uniquePosts = Array.from(new Map(filteredRaw.map(p => [p.id, p])).values());
            console.log('[Home] After dedup - uniquePosts count:', uniquePosts.length);
            
            const filtered = await filterPostsByPrivacy(uniquePosts, currentUserId);
            console.log('[Home] After privacy filter - filtered count:', filtered.length);
            
            // Log details of posts being filtered
            filtered.forEach(p => {
                console.log(`  Post: ${p.id}, userId: ${p.userId}, isPrivate: ${p.isPrivate}, hasImage: ${!!p.imageUrl}`);
            });
            
            if (isMounted) {
                // Only show first paginationOffset posts
                const sliced = filtered.slice(0, paginationOffset);
                console.log('[Home] Sliced to paginationOffset:', sliced.length);
                setPrivacyFiltered(sliced);
                setAllLoadedPosts(filtered); // Keep all for pagination
            }
        };
        applyFilter();
        return () => { isMounted = false; };
    }, [filteredRaw, currentUserId, paginationOffset]);

    const loadMorePosts = () => {
        if (loadingMore || privacyFiltered.length >= allLoadedPosts.length) {
            console.log('[Home] Load more skipped - loadingMore:', loadingMore, 'displayed:', privacyFiltered.length, 'available:', allLoadedPosts.length);
            return;
        }
        
        // Check if we need to fetch more from backend
        if (privacyFiltered.length > allLoadedPosts.length * 0.8) {
            // Fetch next batch from backend
            const pageNum = Math.floor(allLoadedPosts.length / 50);
            setLoadingMore(true);
            loadInitialFeed(pageNum + 1).then(() => {
                setTimeout(() => setLoadingMore(false), 300);
            });
        } else {
            // Still have posts to show, just increment pagination offset
            setLoadingMore(true);
            setTimeout(() => {
                setPaginationOffset(prev => {
                    const newOffset = prev + POSTS_PER_PAGE;
                    console.log('[Home] Loading more posts - new offset:', newOffset, 'total available:', allLoadedPosts.length);
                    return newOffset;
                });
                setLoadingMore(false);
            }, 300);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await new Promise(r => setTimeout(r, 300));
        setPaginationOffset(20); // Reset to initial count
        setRefreshing(false);
    };

    if (loading) {
        return (
            <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}> 
                <ActivityIndicator size="large" color="#f39c12" />
            </View>
        );
    }

    const searchText = (!filter && !params.location) ? 'Search' : (params.location || filter);

    return (
        <View style={styles.container}> 
            <TouchableOpacity 
                style={styles.fab}
                onPress={() => router.push('/go-live')}
            >
                <Feather name="video" size={24} color="#fff" />
            </TouchableOpacity>

            <FlatList
                ref={flatListRef}
                data={privacyFiltered}
                keyExtractor={(item, index) => `post-${item.id}-${index}`}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f39c12" />}
                initialNumToRender={5}
                maxToRenderPerBatch={5}
                windowSize={7}
                removeClippedSubviews={true}
                updateCellsBatchingPeriod={50}
                ListHeaderComponent={() => (
                    <View>
                        <StoriesRow
                            onStoryPress={(stories, initialIndex) => {
                                console.log('[Home] onStoryPress called with', stories.length, 'stories, initialIndex:', initialIndex);
                                setSelectedStories(stories);
                                setStoryInitialIndex(initialIndex || 0);
                                setShowStoriesViewer(true);
                            }}
                            refreshTrigger={storiesRefreshTrigger}
                        />
                        <LiveStreamsRow />
                        <View style={styles.headerSection}>
                            <TouchableOpacity style={styles.searchBar} onPress={() => router.push('/search-modal')}>
                                <Feather name="search" size={18} color="#222" />
                                <Text style={styles.searchText}>{searchText}</Text>
                            </TouchableOpacity>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 8 }}>
                                {categories.map((cat) => (
                                    <TouchableOpacity
                                        key={cat.name}
                                        style={styles.chip}
                                        onPress={() => {
                                            console.log('[Category] Clicked category:', cat.name);
                                            const next = cat.name === filter ? '' : cat.name;
                                            console.log('[Category] New filter:', next);
                                            // Scroll to top when changing filter
                                            flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
                                            router.push(next ? `/(tabs)/home?filter=${encodeURIComponent(next)}` : `/(tabs)/home`);
                                        }}
                                    >
                                        <View style={[styles.chipIconWrap, filter === cat.name && styles.chipIconWrapActive]}>
                                            <ExpoImage source={{ uri: cat.image }} style={styles.categoryImage} />
                                        </View>
                                        <Text style={[styles.chipText, filter === cat.name && styles.chipTextActive]}>{cat.name}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    </View>
                )}
                renderItem={({ item }: { item: any }) => (
                    <PostCard post={{ ...item, imageUrl: item.thumbnailUrl || item.imageUrl }} currentUser={currentUserData || currentUserId} showMenu={false} />
                )}
                ListFooterComponent={
                    loadingMore ? (
                        <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                            <ActivityIndicator size="small" color="#f39c12" />
                        </View>
                    ) : privacyFiltered.length < allLoadedPosts.length ? (
                        <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                            <Text style={{ color: '#999' }}>Scroll for more posts</Text>
                        </View>
                    ) : (
                        <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                            <Text style={{ color: '#999' }}>No more posts</Text>
                        </View>
                    )
                }
                onEndReached={loadMorePosts}
                onEndReachedThreshold={0.5}
            />
            {showStoriesViewer && (
                <Modal visible={showStoriesViewer} animationType="fade" onRequestClose={() => setShowStoriesViewer(false)}>
                    <StoriesViewer stories={selectedStories} initialIndex={storyInitialIndex} onClose={() => setShowStoriesViewer(false)} />
                </Modal>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#fff" },
    fab: {
        position: 'absolute', bottom: 20, right: 20, width: 56, height: 56, borderRadius: 28,
        backgroundColor: '#e0245e', alignItems: 'center', justifyContent: 'center', elevation: 8, zIndex: 100,
    },
    searchBar: {
        marginHorizontal: 16, marginVertical: 12, backgroundColor: "#fafafa", height: 44,
        borderRadius: 22, flexDirection: "row", alignItems: "center", justifyContent: "center",
    },
    searchText: { marginLeft: 8, color: "#222" },
    headerSection: { paddingBottom: 8 },
    chip: { alignItems: 'center', width: 70, marginRight: 12 },
    chipIconWrap: { width: 56, height: 56, borderRadius: 12, backgroundColor: '#f5f5f5', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    chipIconWrapActive: { borderColor: '#f39c12', borderWidth: 2 },
    chipText: { color: '#666', marginTop: 6, fontSize: 11 },
    chipTextActive: { color: '#111', fontWeight: '700' },
    categoryImage: { width: 56, height: 56, borderRadius: 12 },
});