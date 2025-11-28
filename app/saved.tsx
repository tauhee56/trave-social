
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, getDocs, getFirestore, query, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getCurrentUser } from '../lib/firebaseHelpers';

type SavedPost = {
  id: string;
  imageUrl: string;
  // add more fields if needed
};

export default function SavedScreen() {
    const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<SavedPost[]>([]);

  useEffect(() => {
    async function fetchSavedPosts() {
      setLoading(true);
      const user = getCurrentUser();
      if (!user) {
        setPosts([]);
        setLoading(false);
        return;
      }
      try {
        const db = getFirestore();
        // Assume saved posts are stored in users/{uid}/saved collection as doc with postId
        const savedRef = collection(db, 'users', user.uid, 'saved');
        const savedSnap = await getDocs(savedRef);
        const postIds = savedSnap.docs.map(doc => doc.id);
        if (postIds.length === 0) {
          setPosts([]);
          setLoading(false);
          return;
        }
        // Fetch post data for each saved postId
        const postsQuery = query(collection(db, 'posts'), where('__name__', 'in', postIds));
        const postsSnap = await getDocs(postsQuery);
        const postList = postsSnap.docs.map(doc => ({
          id: doc.id,
          imageUrl: doc.data().imageUrl || (doc.data().imageUrls && doc.data().imageUrls[0]) || '',
          // add more fields if needed
        }));
        setPosts(postList);
      } catch (e) {
        setPosts([]);
      }
      setLoading(false);
    }
    fetchSavedPosts();
  }, []);

  const appColors = {
    background: '#fff',
    text: '#222',
    accent: '#f39c12',
    muted: '#888',
    border: '#eee',
    card: '#f5f5f5',
  };
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: appColors.background }]}> 
      <View style={[styles.header, { backgroundColor: appColors.background, shadowColor: appColors.border }]}> 
        <Text style={[styles.headerText, { color: appColors.text }]}>Saved</Text>
        <Feather name="bookmark" size={24} color={appColors.accent} />
      </View>
      {loading ? (
        <ActivityIndicator size="large" color={appColors.accent} style={{ marginTop: 40 }} />
      ) : (
        posts.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Feather name="bookmark" size={48} color={appColors.border} style={{ marginBottom: 12 }} />
            <Text style={[styles.emptyText, { color: appColors.muted }]}>No saved posts yet.</Text>
          </View>
        ) : (
          <FlatList
            data={posts}
            keyExtractor={(item: SavedPost) => item.id}
            numColumns={3}
            contentContainerStyle={styles.grid}
            renderItem={({ item }: { item: SavedPost }) => (
              <TouchableOpacity
                style={[styles.postItem, { backgroundColor: appColors.card, borderColor: appColors.border }]}
                activeOpacity={0.8}
                onPress={() => router.push({ pathname: '/post-detail', params: { id: item.id } })}
              >
                <Image source={{ uri: item.imageUrl }} style={styles.postImage} />
              </TouchableOpacity>
            )}
          />
        )
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginBottom: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  headerText: {
    fontSize: 22,
    fontWeight: '700',
    marginRight: 10,
    letterSpacing: 0.2,
  },
  grid: {
    paddingHorizontal: 2,
    paddingTop: 8,
  },
  postItem: {
    width: '31%',
    aspectRatio: 1,
    margin: '1%',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    height: undefined,
    minHeight: 140,
    maxHeight: 180,
  },
  postImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    borderRadius: 12,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 40,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    marginTop: 2,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
});
