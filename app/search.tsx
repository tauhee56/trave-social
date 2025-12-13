import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { debounce } from 'lodash';
import React, { useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { getAllPosts, searchUsers } from '../lib/firebaseHelpers/index';

// Cache for search results
const searchCache = new Map<string, { users: any[], posts: any[], timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [userResults, setUserResults] = useState<any[]>([]);
  const [postResults, setPostResults] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'posts' | 'users'>('posts');
  const [allPosts, setAllPosts] = useState<any[]>([]);

  // Load all posts once on mount (with limit)
  React.useEffect(() => {
    let mounted = true;
    const loadPosts = async () => {
      const cacheKey = 'all_posts';
      const cached = searchCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        if (mounted) setAllPosts(cached.posts);
        return;
      }
      
      const result = await getAllPosts();
      if (result.success && mounted) {
        const posts = (result.data || []).slice(0, 100); // Limit to 100 posts
        setAllPosts(posts);
        searchCache.set(cacheKey, { posts, users: [], timestamp: Date.now() });
      }
    };
    loadPosts();
    return () => { mounted = false; };
  }, []);

  // Debounced search handler with cache
  const debouncedSearch = useRef(
    debounce(async (text: string, tab: 'posts' | 'users') => {
      if (!text.trim()) {
        setUserResults([]);
        setPostResults([]);
        setLoading(false);
        return;
      }

      const cacheKey = `${tab}_${text.toLowerCase()}`;
      const cached = searchCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        if (tab === 'users') setUserResults(cached.users);
        else setPostResults(cached.posts);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        if (tab === 'users') {
          const result = await searchUsers(text, 15); // Reduced limit
          const users = result.success ? result.data : [];
          setUserResults(users);
          searchCache.set(cacheKey, { users, posts: [], timestamp: Date.now() });
        } else {
          // Search in cached posts (client-side filtering)
          const filtered = allPosts.filter((post: any) =>
            post.caption?.toLowerCase().includes(text.toLowerCase()) ||
            post.userName?.toLowerCase().includes(text.toLowerCase()) ||
            post.location?.name?.toLowerCase().includes(text.toLowerCase())
          ).slice(0, 20); // Limit results
          setPostResults(filtered);
          searchCache.set(cacheKey, { posts: filtered, users: [], timestamp: Date.now() });
        }
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setLoading(false);
      }
    }, 500) // Increased debounce time
  ).current;

  const handleSearch = (text: string) => {
    setQuery(text);
    if (text.trim()) {
      setLoading(true);
      debouncedSearch(text, activeTab);
    } else {
      setUserResults([]);
      setPostResults([]);
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (query.trim()) {
      setLoading(true);
      debouncedSearch(query, activeTab);
    } else {
      setUserResults([]);
      setPostResults([]);
      setLoading(false);
    }
  }, [activeTab]);

  const handleTabSwitch = (tab: 'posts' | 'users') => {
    setActiveTab(tab);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' }}>
        <TextInput
          style={{ flex: 1, fontSize: 16, backgroundColor: '#f7f7f7', borderRadius: 8, padding: 10 }}
          placeholder={activeTab === 'users' ? 'Search users...' : 'Search posts...'}
          value={query}
          onChangeText={handleSearch}
        />
        <TouchableOpacity onPress={() => setQuery('')} style={{ marginLeft: 8 }}>
          <Feather name="x" size={22} color="#888" />
        </TouchableOpacity>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'center', marginVertical: 10 }}>
        <TouchableOpacity onPress={() => handleTabSwitch('posts')} style={[styles.tabBtn, activeTab === 'posts' && styles.tabActive]}>
          <Text style={[styles.tabText, activeTab === 'posts' && styles.tabTextActive]}>Posts</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleTabSwitch('users')} style={[styles.tabBtn, activeTab === 'users' && styles.tabActive]}>
          <Text style={[styles.tabText, activeTab === 'users' && styles.tabTextActive]}>Users</Text>
        </TouchableOpacity>
      </View>
      {loading ? (
        <ActivityIndicator size="large" color="#FFB800" style={{ marginTop: 32 }} />
      ) : activeTab === 'users' ? (
        <FlatList
          data={userResults}
          keyExtractor={item => item.uid || item.id}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.row} onPress={() => router.push({ pathname: '/user-profile', params: { uid: item.uid || item.id } })}>
              <Image source={{ uri: item.photoURL || item.avatar || 'https://firebasestorage.googleapis.com/v0/b/travel-app-3da72.firebasestorage.app/o/default%2Fdefault-pic.jpg?alt=media&token=7177f487-a345-4e45-9a56-732f03dbf65d' }} style={styles.avatar} />
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.displayName || item.userName || 'User'}</Text>
                <Text style={styles.email}>{item.email}</Text>
              </View>
              <Feather name="chevron-right" size={20} color="#ccc" />
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={{ color: '#888', marginTop: 32, textAlign: 'center' }}>No users found</Text>}
          refreshing={loading}
          onRefresh={() => handleSearch(query)}
          initialNumToRender={15}
          maxToRenderPerBatch={10}
          windowSize={7}
          removeClippedSubviews={true}
        />
      ) : (
        <FlatList
          data={postResults}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.row} onPress={() => router.push({ pathname: '/highlight/[id]', params: { id: item.id } })}>
              <Image source={{ uri: item.imageUrl || item.imageUrls?.[0] || 'https://firebasestorage.googleapis.com/v0/b/travel-app-3da72.firebasestorage.app/o/default%2Fdefault-pic.jpg?alt=media&token=7177f487-a345-4e45-9a56-732f03dbf65d' }} style={styles.postImg} />
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.userName || 'User'}</Text>
                <Text style={styles.caption}>{item.caption}</Text>
              </View>
              <Feather name="chevron-right" size={20} color="#ccc" />
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={{ color: '#888', marginTop: 32, textAlign: 'center' }}>No posts found</Text>}
          refreshing={loading}
          onRefresh={() => handleSearch(query)}
          initialNumToRender={15}
          maxToRenderPerBatch={10}
          windowSize={7}
          removeClippedSubviews={true}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBtn: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f7f7f7',
    marginHorizontal: 6,
  },
  tabActive: {
    backgroundColor: '#FFB800',
  },
  tabText: {
    fontSize: 16,
    color: '#888',
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#000',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 14,
    backgroundColor: '#eee',
  },
  postImg: {
    width: 56,
    height: 56,
    borderRadius: 12,
    marginRight: 14,
    backgroundColor: '#eee',
  },
  name: {
    fontWeight: '700',
    fontSize: 15,
    color: '#111',
  },
  email: {
    color: '#888',
    fontSize: 13,
  },
  caption: {
    color: '#666',
    fontSize: 13,
    marginTop: 2,
  },
});


