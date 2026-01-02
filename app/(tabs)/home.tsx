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
import StoriesViewer from '../../src/_components/StoriesViewer';

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
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [privacyFiltered, setPrivacyFiltered] = useState<any[]>([]);
    const [paginationOffset, setPaginationOffset] = useState(20);
    const POSTS_PER_PAGE = 10;
    const [showStoriesViewer, setShowStoriesViewer] = useState(false);
    const [selectedStories, setSelectedStories] = useState<any[]>([]);
    const [storiesRefreshTrigger, setStoriesRefreshTrigger] = useState(0);
    const flatListRef = React.useRef<FlatList>(null);

    // Get current user ID from AsyncStorage (token-based auth)
    useEffect(() => {
      const getUserId = async () => {
        try {
          const userId = await AsyncStorage.getItem('userId');
          setCurrentUserId(userId);
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
        
        const remaining = [...shuffledRecent.slice(recentCount), ...shuffledMedium, ...shuffledOlder];
        mixed.push(...shufflePosts(remaining));
        return mixed;
    }, [shufflePosts]);

    const loadInitialFeed = async () => {
        setLoading(true);
        try {
            const response = await apiService.get('/posts');
            console.log('[Home] Posts response:', response);
            
            // Handle various response formats from backend
            let postsData: any[] = [];
            if (response?.data && Array.isArray(response.data)) {
                postsData = response.data;
            } else if (response?.posts && Array.isArray(response.posts)) {
                postsData = response.posts;
            } else if (Array.isArray(response)) {
                postsData = response;
            }
            
            console.log('[Home] Loaded posts count:', postsData.length);
            setAllLoadedPosts(postsData);
            const mixedFeed = createMixedFeed(postsData);
            setPosts(mixedFeed);
        } catch (error) {
            console.error('[Home] Error loading posts:', error);
        } finally {
            setLoading(false);
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
        const locationFilter = params.location as string;
        const selectedPostId = params.postId as string;

        if (locationFilter) {
            const locationPosts = posts.filter((p: any) => {
                const pLoc = typeof p.location === 'object' ? p.location?.name : p.location;
                return pLoc?.toLowerCase() === locationFilter.toLowerCase();
            });
            if (selectedPostId) {
                const selected = locationPosts.find(p => p.id === selectedPostId);
                const others = locationPosts.filter(p => p.id !== selectedPostId);
                return selected ? [selected, ...others] : others;
            }
            return locationPosts;
        } else if (filter) {
            return posts.filter((p: any) => p.category?.toLowerCase() === filter.toLowerCase());
        }
        return posts;
    }, [posts, params.location, filter, params.postId]);

    useEffect(() => {
        let isMounted = true;
        const applyFilter = async () => {
            // Remove duplicates using Set based on post ID
            const uniquePosts = Array.from(new Map(filteredRaw.map(p => [p.id, p])).values());
            const filtered = await filterPostsByPrivacy(uniquePosts, currentUserId);
            if (isMounted) {
                // Only show first paginationOffset posts
                setPrivacyFiltered(filtered.slice(0, paginationOffset));
                setAllLoadedPosts(filtered); // Keep all for pagination
            }
        };
        applyFilter();
        return () => { isMounted = false; };
    }, [filteredRaw, currentUserId, paginationOffset]);

    const onRefresh = async () => {
        setRefreshing(t) return;
        setLoadingMore(true);
        
        // Simulate load delay
        await new Promise(r => setTimeout(r, 300));
        
        // Increase pagination offset to show more posts
        setPaginationOffset(prev => {
            const newOffset = prev + POSTS_PER_PAGE;
            console.log('[Home] Loading more posts - new offset:', newOffset, 'total available:', allLoadedPosts.length);
            return newOffset;
        });
        (allLoadedPosts).map((post, idx) => ({
            ...post,
            id: post.id || `generated-${Date.now()}-${idx}`, // Ensure post has an ID
            _loopKey: `loop-${loopCount + 1}-${post.id || `gen-${idx}`}-${idx}`,
        }));
        setPosts(prev => [...prev, ...reshuffled]);
        setLoopCount(prev => prev + 1);
        setLoadingMore(false);
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
                            onStoryPress={(stories) => {
                                setSelectedStories(stories);
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
                    <PostCard post={{ ...item, imageUrl: item.thumbnailUrl || item.imageUrl }} currentUser={currentUserId} showMenu={false} />
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
                    <StoriesViewer stories={selectedStories} onClose={() => setShowStoriesViewer(false)} />
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