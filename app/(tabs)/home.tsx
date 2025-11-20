import React, { useEffect, useState } from "react";
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from "expo-router";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Modal,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import PostCard from "../components/PostCard";
import StoriesRow from "../components/StoriesRow";
import StoriesViewer from "../components/StoriesViewer";
import { useLocalSearchParams } from "expo-router";
import { getFeedPosts, getCurrentUser, getUserNotifications, addLikedStatusToPosts } from "../../lib/firebaseHelpers";

const { width } = Dimensions.get("window");

export default function Home() {
  const params = useLocalSearchParams();
  const filter = (params.filter as string) || '';
  const router = useRouter();
  
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showStoriesViewer, setShowStoriesViewer] = useState(false);
  const [selectedStories, setSelectedStories] = useState<any[]>([]);

  // Refresh logic: reload posts when Home tab is focused (only clear filter if no filter in URL)
  useFocusEffect(
    React.useCallback(() => {
      loadPosts();
    }, [])
  );

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
      return;
    }
    const result = await getFeedPosts();
    if (result.success && Array.isArray(result.posts)) {
      const postsWithLikes = await addLikedStatusToPosts(result.posts, user.uid);
      setPosts(postsWithLikes);
    }
    setLoading(false);
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadPosts();
    setRefreshing(false);
  }

  const filtered = filter
    ? posts.filter((p: any) => p.location && p.location.toLowerCase().includes(filter.toLowerCase()))
    : posts;

  if (loading) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}> 
        <ActivityIndicator size="large" color="#f39c12" />
      </View>
    );
  }

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
        ListHeaderComponent={() => (
          <View>
            <StoriesRow
              onStoryPress={(stories, index) => {
                setSelectedStories(stories);
                setShowStoriesViewer(true);
              }}
            />
            <View style={styles.headerSection}>
              <TouchableOpacity style={styles.searchBar} onPress={() => router.push('/search-modal' as any)} activeOpacity={0.7}>
                <Feather name="search" size={18} color="#777" />
                <Text style={styles.searchText}>{filter ? filter : 'Search'}</Text>
              </TouchableOpacity>
              <View style={styles.chipsRow}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 8 }}>
                  <View style={{ flexDirection: 'row' }}>
                    {[{ key: 'London', icon: 'map-pin' },
                      { key: 'Dubai', icon: 'sun' },
                      { key: 'Arctic', icon: 'cloud' },
                      { key: 'Islands', icon: 'globe' },
                      { key: 'Winter', icon: 'cloud' },
                      { key: 'Paris', icon: 'coffee' },
                    ].map((c) => (
                      <TouchableOpacity
                        key={c.key}
                        style={[styles.chip, filter === c.key && styles.chipActive]}
                        onPress={() => {
                          const next = c.key === filter ? '' : c.key;
                          if (next) router.push(`/(tabs)/home?filter=${encodeURIComponent(next)}`);
                          else router.push(`/(tabs)/home`);
                        }}
                        activeOpacity={0.8}
                      >
                        <View style={[styles.chipIconWrap, filter === c.key && styles.chipIconWrapActive]}>
                          <Feather name={(c.icon as any) || 'map-pin'} size={18} color={filter === c.key ? '#f39c12' : '#777'} />
                        </View>
                        <Text style={[styles.chipText, filter === c.key && styles.chipTextActive]}>{c.key}</Text>
                        {filter === c.key && <View style={styles.chipUnderline} />}
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
            </View>
          </View>
        )}
        renderItem={({ item }) => <PostCard post={item} />}
        showsVerticalScrollIndicator={false}
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
            onClose={() => setShowStoriesViewer(false)}
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
