import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getCurrentUser, getFeedPosts } from '../lib/firebaseHelpers';
import PostCard from './components/PostCard';

export default function PostDetailScreen() {
  const params = useLocalSearchParams();
  const postId = params.id as string;
  
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [initialIndex, setInitialIndex] = useState(0);

  useEffect(() => {
    async function loadPosts() {
      setLoading(true);
      const user = getCurrentUser();
      setCurrentUser(user);
      
      if (!user) {
        setLoading(false);
        return;
      }

      // Fetch all feed posts
      const result = await getFeedPosts();
      if (result.success && Array.isArray(result.posts)) {
        const feedPosts = result.posts;
        setPosts(feedPosts);
        
        // Find the index of the target post
        const targetIndex = feedPosts.findIndex((p: any) => p.id === postId);
        if (targetIndex !== -1) {
          setInitialIndex(targetIndex);
        }
      }
      
      setLoading(false);
    }

    loadPosts();
  }, [postId]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#007aff" style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <PostCard post={item} currentUser={currentUser} />}
        initialScrollIndex={initialIndex}
        getItemLayout={(data, index) => ({
          length: 600, // Approximate height of each post
          offset: 600 * index,
          index,
        })}
        onScrollToIndexFailed={(info) => {
          // Handle scroll failure gracefully
          setTimeout(() => {
            if (posts.length > 0 && info.index < posts.length) {
              // Retry scroll
            }
          }, 100);
        }}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
