import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from '@react-navigation/native';
import { Image as ExpoImage } from 'expo-image';
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
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
    View,
} from "react-native";
import { addLikedStatusToPosts, DEFAULT_CATEGORIES, getCategories, getCurrentUser, getFeedPosts, getUserNotifications } from "../../lib/firebaseHelpers";
import PostCard from "../components/PostCard";
import StoriesRow from "../components/StoriesRow";
import StoriesViewer from "../components/StoriesViewer";
import { useTabEvent } from './_layout';

const { width } = Dimensions.get("window");

export default function Home() {
    const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const params = useLocalSearchParams();
  const filter = (params.filter as string) || '';
  const router = useRouter();
  
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [feedReloadKey, setFeedReloadKey] = useState(0); // For FlatList force update
  const [unreadCount, setUnreadCount] = useState(0);
  const [showStoriesViewer, setShowStoriesViewer] = useState(false);
  const [selectedStories, setSelectedStories] = useState<any[]>([]);
  const [storiesRefreshTrigger, setStoriesRefreshTrigger] = useState(0);

  // Refresh logic: reload posts when Home tab is focused (only clear filter if no filter in URL)
  useFocusEffect(
    React.useCallback(() => {
      loadPosts();
      loadCategories();
    }, [])
  );

  // Listen for home tab press event from context
  const tabEvent = useTabEvent();
  useEffect(() => {
    if (!tabEvent) return;
    const unsubscribe = tabEvent.subscribeHomeTabPress(() => {
      if (typeof resetFeed === 'function') {
        resetFeed();
      }
    });
    return unsubscribe;
  }, [tabEvent]);

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

  async function loadPosts() {
    const user = getCurrentUser();
    if (!user) {
      setLoading(false);
      console.log('Feed: No user found');
      return;
    }
    const result = await getFeedPosts();
    console.log('Feed: getFeedPosts result:', result);
    if (result.success && Array.isArray(result.posts)) {
      const postsWithLikes = await addLikedStatusToPosts(result.posts, user.uid);
      console.log('Feed: postsWithLikes:', postsWithLikes);
      setPosts(postsWithLikes);
    } else {
      console.log('Feed: getFeedPosts failed or returned no posts');
    }
    setLoading(false);
    }

    async function loadCategories() {
      const cats = await getCategories();
      // Map each category to correct shape
      const mappedCats = Array.isArray(cats)
        ? cats
            .map((c: any) => ({
                name: typeof c.name === 'string' ? c.name : '',
                image: typeof c.image === 'string' ? c.image : ''
            }))
            .filter((c: any) => c.name && c.image)
        : [];
      setCategories(mappedCats.length > 0 ? mappedCats : DEFAULT_CATEGORIES);
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadPosts();
    setRefreshing(false);
  }

  const selectedPostId = (params.postId as string) || '';
const locationFilter = (params.location as string) || '';

let filtered = posts;
if (locationFilter) {
  // Show selected post first, then all other posts from same location
  const locationPosts = posts.filter((p: any) => {
    if (typeof p.location === 'string') {
      return p.location.toLowerCase() === locationFilter.toLowerCase();
    }
    if (typeof p.location === 'object' && p.location?.name) {
      return p.location.name.toLowerCase() === locationFilter.toLowerCase();
    }
    return false;
  });
  // Move selected post to top
  const selectedPost = locationPosts.find(p => p.id === selectedPostId);
  const otherPosts = locationPosts.filter(p => p.id !== selectedPostId);
  filtered = selectedPost ? [selectedPost, ...otherPosts] : otherPosts;
} else if (filter) {
  filtered = posts.filter((p: any) => p.category && p.category.toLowerCase() === filter.toLowerCase());
}

  if (loading) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}> 
        <ActivityIndicator size="large" color="#f39c12" />
      </View>
    );
  }

  const resetFeed = () => {
    setLoading(true);
    setPosts([]);
    router.replace('/(tabs)/home');
    router.setParams({ filter: undefined, location: undefined, postId: undefined });
    setTimeout(() => {
      loadPosts(); // Reload all posts from backend
      setFeedReloadKey(prev => prev + 1); // Force FlatList rerender
    }, 100);
  };

  const searchText = (!filter && !locationFilter) ? 'Search' : (locationFilter ? locationFilter : filter);

  return (
    <View style={styles.container}>
      <View style={{ alignItems: 'center', marginVertical: 8 }}>
        <TouchableOpacity
          style={{ backgroundColor: '#e0245e', paddingVertical: 6, paddingHorizontal: 18, borderRadius: 18, flexDirection: 'row', alignItems: 'center' }}
          onPress={() => router.push('/go-live')}
        >
          <Feather name="video" size={16} color="#fff" style={{ marginRight: 6 }} />
          <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>Go Live</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f39c12" />}
        key={feedReloadKey} // Force rerender on feed reload
        ListHeaderComponent={() => (
          <View>
            <StoriesRow
              onStoryPress={(stories, index) => {
                setSelectedStories(stories);
                setShowStoriesViewer(true);
              }}
              refreshTrigger={storiesRefreshTrigger}
            />
            <View style={styles.headerSection}>
              <TouchableOpacity style={styles.searchBar} onPress={() => router.push('/search-modal' as any)} activeOpacity={0.7}>
                <Feather name="search" size={18} color="#777" />
                <Text style={styles.searchText}>{loading ? 'Loading...' : searchText}</Text>
              </TouchableOpacity>
              <View style={styles.chipsRow}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 8 }}>
                  <View style={{ flexDirection: 'row' }}>
                    {categories.map((cat) => (
                      <TouchableOpacity
                        key={cat.name}
                        style={[styles.chip, filter === cat.name && styles.chipActive]}
                        onPress={() => {
                          const next = cat.name === filter ? '' : cat.name;
                          if (next) router.push(`/(tabs)/home?filter=${encodeURIComponent(next)}`);
                          else router.push(`/(tabs)/home`);
                        }}
                        activeOpacity={0.8}
                      >
                        <View style={[styles.chipIconWrap, filter === cat.name && styles.chipIconWrapActive]}>
                          <ExpoImage
                            source={{ uri: cat.image }}
                            style={{ width: 40, height: 40, borderRadius: 10 }}
                            contentFit="cover"
                            transition={300}
                          />
                        </View>
                        <Text style={[styles.chipText, filter === cat.name && styles.chipTextActive]}>{cat.name}</Text>
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
          const currentUser = getCurrentUser();
          return item ? <PostCard post={item} currentUser={currentUser} showMenu={false} /> : null;
        }}
        ListEmptyComponent={() => (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 }}>
            <Feather name="image" size={80} color="#dbdbdb" style={{ marginBottom: 16 }} />
            <Text style={{ fontSize: 22, fontWeight: '700', color: '#000', marginBottom: 8 }}>No posts found</Text>
            <Text style={{ fontSize: 14, color: '#8e8e8e' }}>
              Try refreshing or check your connection.
            </Text>
          </View>
        )}
        showsVerticalScrollIndicator={false}
        initialNumToRender={5}
        windowSize={10}
        removeClippedSubviews={true}
        maxToRenderPerBatch={5}
        updateCellsBatchingPeriod={50}
        contentContainerStyle={{ flexGrow: 1 }}
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
    margin: 12,
    backgroundColor: "#f2f2f2",
    height: 44,
    borderRadius: 22,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  searchText: { marginLeft: 8, color: "#777", textAlign: "center" },
  headerSection: { paddingBottom: 8 },
  chipsRow: { paddingTop: 4 },
  chip: { backgroundColor: 'transparent', borderWidth: 0, paddingVertical: 6, paddingHorizontal: 8, borderRadius: 18, marginRight: 8, elevation: 0, alignItems: 'center' },
  chipText: { color: '#444', fontSize: 12, marginTop: 6, textAlign: 'center' },
  chipActive: { backgroundColor: 'transparent' },
  chipIconWrap: { width: 52, height: 52, borderRadius: 12, backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center', borderWidth: 0 },
  chipIconWrapActive: { borderColor: 'transparent', backgroundColor: 'transparent' },
  chipTextActive: { color: '#111', fontWeight: '700' },
  chipUnderline: { height: 2, backgroundColor: '#111', width: 32, marginTop: 4, borderRadius: 1, alignSelf: 'center' },
});
