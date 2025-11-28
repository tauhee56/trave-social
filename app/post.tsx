import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getUserPosts } from '../lib/firebaseHelpers';

export default function PostScreen() {
  const router = useRouter();
  const { postId, commentId, mentionId, tagId } = useLocalSearchParams();
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPost() {
      if (!postId) return;
      // You may want to use a getPostById helper for efficiency
      const res = await getUserPosts(''); // Replace with actual getPostById
      if (res.success && Array.isArray(res.data)) {
        const found = res.data.find((p: any) => p.id === postId);
        setPost(found || null);
      }
      setLoading(false);
    }
    fetchPost();
  }, [postId]);

  if (loading) return (
    <SafeAreaView style={styles.container}>
      <ActivityIndicator size="large" color="#FF6B00" />
    </SafeAreaView>
  );

  if (!post) return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.notFound}>Post not found.</Text>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.header}>Post Details</Text>
        <Text style={styles.caption}>{post.caption}</Text>
        {/* Show comment, mention, or tag highlight if param exists */}
        {commentId && <Text style={styles.highlight}>Comment: {commentId}</Text>}
        {mentionId && <Text style={styles.highlight}>Mention: {mentionId}</Text>}
        {tagId && <Text style={styles.highlight}>Tag: {tagId}</Text>}
        {/* Add more post details as needed */}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 24 },
  header: { fontWeight: '700', fontSize: 24, color: '#FF6B00', marginBottom: 16 },
  caption: { fontSize: 16, color: '#222', marginBottom: 12 },
  highlight: { fontSize: 15, color: '#007aff', marginBottom: 8 },
  notFound: { fontSize: 18, color: '#d00', textAlign: 'center', marginTop: 40 },
});
