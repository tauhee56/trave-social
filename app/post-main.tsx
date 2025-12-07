import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, onSnapshot } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { db } from '../config/firebase';
import { ErrorBoundary } from './components/ErrorBoundary';
import PostCard from './components/PostCard';

export default function PostScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  // Support both id and postId for dynamic route compatibility
  const postId = params.postId || params.id;
  let { commentId, mentionId, tagId } = params;
  if (Array.isArray(commentId)) commentId = commentId[0];
  // Debug log for params
  React.useEffect(() => {
    console.log('[POST SCREEN PARAMS]', { postId, commentId, mentionId, tagId });
  }, [postId, commentId, mentionId, tagId]);
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!postId) return;
    setLoading(true);
    const postIdStr = typeof postId === 'string' ? postId : Array.isArray(postId) ? postId[0] : '';
    const postRef = doc(db, 'posts', postIdStr);
    const unsub = onSnapshot(postRef,
      (docSnap) => {
        setPost(docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null);
        setLoading(false);
      },
      (err) => {
        setLoading(false);
      }
    );
    return () => {
      unsub && unsub();
    };
  }, [postId]);

  // Helper to fetch comment text by commentId
  const [highlightedComment, setHighlightedComment] = React.useState<string | null>(null);
  const [showCommentsModal, setShowCommentsModal] = React.useState(false);

  // When commentId is present, open comment modal and fetch comment text
  React.useEffect(() => {
    if (commentId && postId && post) {
      setShowCommentsModal(true);
      // Fetch comment text from Firestore
      import('firebase/firestore').then(firestore => {
        const postIdStr = typeof postId === 'string' ? postId : Array.isArray(postId) ? postId[0] : '';
        const commentIdStr = typeof commentId === 'string' ? commentId : Array.isArray(commentId) ? commentId[0] : '';
        const commentRef = firestore.doc(db, 'posts', postIdStr, 'comments', commentIdStr);
        firestore.getDoc(commentRef).then(docSnap => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setHighlightedComment(data.text || null);
          } else {
            setHighlightedComment(null);
          }
        });
      });
    } else {
      setHighlightedComment(null);
      setShowCommentsModal(false);
    }
  }, [commentId, postId, post]);

  if (!postId) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.notFound}>No postId provided. Cannot load post.</Text>
      </SafeAreaView>
    );
  }
  if (loading) return (
    <SafeAreaView style={styles.container}>
      <View style={{ padding: 24 }}>
        <View style={{ width: '100%', height: 200, borderRadius: 12, backgroundColor: '#eee', marginBottom: 16 }} />
        <View style={{ width: 120, height: 24, borderRadius: 8, backgroundColor: '#eee', marginBottom: 12 }} />
        <View style={{ width: '80%', height: 16, borderRadius: 6, backgroundColor: '#eee', marginBottom: 8 }} />
        <View style={{ width: '60%', height: 16, borderRadius: 6, backgroundColor: '#eee', marginBottom: 8 }} />
      </View>
    </SafeAreaView>
  );

  if (!post) return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.notFound}>Post not found.</Text>
    </SafeAreaView>
  );

  return (
    <ErrorBoundary>
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <PostCard 
            post={post} 
            currentUser={null} 
            showMenu={false} 
            highlightedCommentId={typeof commentId === 'string' ? commentId : undefined}
            highlightedCommentText={highlightedComment || undefined}
            showCommentsModal={showCommentsModal}
            onCloseCommentsModal={() => setShowCommentsModal(false)}
          />
          {/* Highlight post caption for like notifications */}
          {postId && !commentId && (
            <Text style={[styles.highlight, { backgroundColor: '#fffbe6', padding: 8, borderRadius: 8 }]}>Post: {post.caption}</Text>
          )}
        </ScrollView>
      </SafeAreaView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  notFound: { color: '#999', fontSize: 16, textAlign: 'center', marginTop: 40 },
  content: { padding: 16 },
  header: { fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  highlight: { fontWeight: 'bold', color: '#222', marginBottom: 8 },
});
