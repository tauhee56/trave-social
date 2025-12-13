import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getCurrentUser } from '../lib/firebaseHelpers';
import PostViewerModal from './_components/PostViewerModal';

export default function PostDetailScreen() {
  const params = useLocalSearchParams();
  const postId = params.id as string;
  const router = useRouter();
  
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    async function loadPost() {
      setLoading(true);
      const user = getCurrentUser();
      setCurrentUser(user);
      // Fetch post by ID
      const { getPostById } = await import('../lib/firebaseHelpers/post');
      const result = await getPostById(postId);
      if (result.success && result.post) {
        setPost(result.post);
      }
      setLoading(false);
    }
    loadPost();
  }, [postId]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#007aff" style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  if (!post) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="small" color="#999" style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <PostViewerModal
        visible={true}
        onClose={() => router.back()}
        posts={[post]}
        selectedPostIndex={0}
        profile={profile}
        authUser={currentUser}
        likedPosts={{}}
        savedPosts={{}}
        handleLikePost={() => {}}
        handleSavePost={() => {}}
        handleSharePost={() => {}}
        setCommentModalPostId={() => {}}
        setCommentModalAvatar={() => {}}
        setCommentModalVisible={() => {}}
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
