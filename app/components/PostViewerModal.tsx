import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import React, { useEffect, useState } from 'react';
import { Alert, Dimensions, FlatList, Modal, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getPostComments } from '../../lib/firebaseHelpers';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Post {
  id: string;
  imageUrl?: string;
  imageUrls?: string[];
  caption?: string;
  userId: string;
  likes?: string[];
  savedBy?: string[];
  // Add other fields as needed
}

interface Profile {
  avatar?: string;
  username?: string;
  name?: string;
}

interface AuthUser {
  uid?: string;
}

interface PostViewerModalProps {
  visible: boolean;
  onClose: () => void;
  posts: Post[];
  selectedPostIndex: number;
  profile: Profile | null;
  authUser: AuthUser | null;
  likedPosts: { [key: string]: boolean };
  savedPosts: { [key: string]: boolean };
  handleLikePost: (post: Post) => void;
  handleSavePost: (post: Post) => void;
  handleSharePost: (post: Post) => void;
  setCommentModalPostId: (id: string | null) => void;
  setCommentModalAvatar: (avatar: string) => void;
  setCommentModalVisible: (visible: boolean) => void;
}

export default function PostViewerModal({
  visible,
  onClose,
  posts,
  selectedPostIndex,
  profile,
  authUser,
  likedPosts,
  savedPosts,
  handleLikePost,
  handleSavePost,
  handleSharePost,
  setCommentModalPostId,
  setCommentModalAvatar,
  setCommentModalVisible,
}: PostViewerModalProps) {
  const [currentPostIndex, setCurrentPostIndex] = useState(selectedPostIndex);
  const [showMenu, setShowMenu] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
    // Removed postData and backendCounts state
    // const [postData, setPostData] = useState<any>(null);
    // const [backendCounts, setBackendCounts] = useState<{ likes: number; saves: number; comments: number }>({ likes: 0, saves: 0, comments: 0 });

  useEffect(() => {
    setCurrentPostIndex(selectedPostIndex);
  }, [selectedPostIndex]);

  // Always fetch latest post data from backend when modal opens or post changes
    // Removed fetchLatestPostData function

  // Refetch after like/unlike
    const handleLikePostAndRefresh = async (postId: string) => {
      await handleLikePost(posts[currentPostIndex]);
    };

  useEffect(() => {
    if (showMenu && posts[currentPostIndex]) {
      getPostComments(posts[currentPostIndex].id).then((res: { success: boolean; data?: any[]; error?: string }) => {
        if (res.success) {
          setComments(res.data || []);
        }
      });
    }
  }, [showMenu, currentPostIndex, posts]);
  return (
    <>
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        {/* Header */}
        <SafeAreaView style={styles.postViewerHeader}>
          <View style={styles.postViewerHeaderContent}>
            <TouchableOpacity onPress={onClose} style={styles.postViewerCloseBtn}>
              <Ionicons name="close" size={32} color="#fff" />
            </TouchableOpacity>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <View style={styles.postViewerUserInfo}>
                <ExpoImage
                  source={{ uri: String(profile?.avatar || 'https://via.placeholder.com/40') }}
                  style={styles.postViewerAvatar}
                />
                <Text style={styles.postViewerUsername}>
                  {String(profile?.username || profile?.name || '')}
                </Text>
              </View>
            </View>
            {authUser?.uid === posts[currentPostIndex]?.userId && (
              <TouchableOpacity onPress={() => setShowMenu(true)} style={styles.menuBtn}>
                <Ionicons name="ellipsis-vertical" size={24} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
        </SafeAreaView>

        {/* Fullscreen vertical FlatList for posts */}
        <FlatList
          data={posts}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          initialScrollIndex={selectedPostIndex}
          onMomentumScrollEnd={(event) => {
            const offsetY = event.nativeEvent.contentOffset.y;
            const index = Math.round(offsetY / SCREEN_HEIGHT);
            setCurrentPostIndex(index);
          }}
          getItemLayout={(data, index) => ({
            length: SCREEN_HEIGHT,
            offset: SCREEN_HEIGHT * index,
            index,
          })}
          keyExtractor={(item) => item.id}
          renderItem={({ item: post }) => (
            <View style={[styles.postViewerSlide, { height: SCREEN_HEIGHT }]}> 
              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }} bounces={false} showsVerticalScrollIndicator={false}>
                {/* Post Image */}
                <View style={[styles.postImageContainer, { height: SCREEN_HEIGHT * 0.8, marginTop: 40, marginBottom: 12 }]}> 
                  <ExpoImage
                    source={{ uri: String(post?.imageUrl || (Array.isArray(post?.imageUrls) ? post.imageUrls[0] : '')) }}
                    style={[styles.postViewerImage, { height: SCREEN_HEIGHT * 0.8, width: SCREEN_WIDTH }]}
                    contentFit="cover"
                  />
                </View>
                {/* Post Info & Actions */}
                <View style={styles.postActionsBar}>
                  <View style={styles.postActions}>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => handleLikePostAndRefresh(post.id)}>
                      <Ionicons name={likedPosts[post.id] ? 'heart' : 'heart-outline'} size={28} color={likedPosts[post.id] ? '#e74c3c' : '#fff'} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => {
                      setCommentModalPostId(post.id);
                      setCommentModalAvatar(String(profile?.avatar || ''));
                      setCommentModalVisible(true);
                    }}>
                      <Ionicons name="chatbubble-outline" size={26} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => handleSharePost(post.id)}>
                      <Ionicons name="paper-plane-outline" size={26} color="#fff" />
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => handleSavePost(post.id)}>
                    <Ionicons name={savedPosts[post.id] ? 'bookmark' : 'bookmark-outline'} size={26} color="#fff" />
                  </TouchableOpacity>
                </View>
                {/* Caption */}
                {post?.caption && typeof post.caption === 'string' && post.caption.trim() && (
                  <View style={styles.captionContainer}>
                    <Text style={styles.captionText}>
                      <Text style={styles.captionUsername}>
                        {String(profile?.username || profile?.name || '')}
                      </Text>
                      {' '}
                      {post.caption}
                    </Text>
                  </View>
                )}
              </ScrollView>
            </View>
          )}
        />
      </View>
    </Modal>
    <Modal visible={showMenu} transparent animationType="fade" onRequestClose={() => setShowMenu(false)}>
      <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} activeOpacity={1} onPress={() => setShowMenu(false)}>
        <View style={{ position: 'absolute', top: 120, right: 20, backgroundColor: '#fff', borderRadius: 8, padding: 10, minWidth: 200, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 5 }}>
          <TouchableOpacity onPress={async () => {
            setShowMenu(false);
            const post = posts[currentPostIndex];
            if (!authUser?.uid || !post) return;
            const { deletePost } = await import('../../lib/firebaseHelpers');
            const result = await deletePost(post.id, authUser.uid);
            if (result.success) {
              Alert.alert('Success', 'Post deleted successfully');
              onClose();
            } else {
              Alert.alert('Error', result.error || 'Failed to delete post');
            }
          }} style={{ paddingVertical: 8 }}>
            <Text style={{ color: '#d00', fontSize: 16 }}>Delete</Text>
          </TouchableOpacity>
          <View style={{ height: 1, backgroundColor: '#eee', marginVertical: 8 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 4 }}>
            <Ionicons name={likedPosts[posts[currentPostIndex]?.id] ? 'heart' : 'heart-outline'} size={16} color={likedPosts[posts[currentPostIndex]?.id] ? '#e74c3c' : '#333'} />
            <Text style={{ fontSize: 14, color: '#333', marginLeft: 8 }}>Likes: {Array.isArray(posts[currentPostIndex]?.likes) ? posts[currentPostIndex].likes.length : 0}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 4 }}>
            <Ionicons name={savedPosts[posts[currentPostIndex]?.id] ? 'bookmark' : 'bookmark-outline'} size={16} color={savedPosts[posts[currentPostIndex]?.id] ? '#007aff' : '#333'} />
            <Text style={{ fontSize: 14, color: '#333', marginLeft: 8 }}>Saves: {Array.isArray(posts[currentPostIndex]?.savedBy) ? posts[currentPostIndex].savedBy.length : 0}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 4 }}>
            <Ionicons name="chatbubble-outline" size={16} color="#333" />
            <Text style={{ fontSize: 14, color: '#333', marginLeft: 8 }}>Comments: {typeof posts[currentPostIndex]?.commentsCount === 'number' ? posts[currentPostIndex].commentsCount : (Array.isArray(posts[currentPostIndex]?.comments) ? posts[currentPostIndex].comments.length : 0)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  postViewerHeader: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, backgroundColor: 'rgba(0,0,0,0.5)' },
  postViewerHeaderContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12 },
  postViewerCloseBtn: { padding: 4 },
  postViewerUserInfo: { flexDirection: 'row', alignItems: 'center' },
  postViewerAvatar: { width: 32, height: 32, borderRadius: 16, marginRight: 8 },
  postViewerUsername: { color: '#fff', fontWeight: '700', fontSize: 15 },
  menuBtn: { padding: 4 },
  postViewerSlide: { flex: 1, backgroundColor: '#000' },
  postImageContainer: { width: '100%', aspectRatio: 1, backgroundColor: '#222' },
  postViewerImage: { width: '100%', height: undefined, aspectRatio: 1, borderRadius: 12 },
  postActionsBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  postActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  actionBtn: { padding: 8 },
  captionContainer: { paddingHorizontal: 16, paddingVertical: 8 },
  captionText: { color: '#fff', fontSize: 15 },
  captionUsername: { fontWeight: '700', color: '#fff' },
});