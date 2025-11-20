import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Share,
  Modal,
  FlatList,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { Video, ResizeMode } from 'expo-av';
import { Feather } from "@expo/vector-icons";
import { likePost, unlikePost, getCurrentUser, getPostComments, addComment, deleteComment, deletePost, likeComment, unlikeComment } from "../../lib/firebaseHelpers";
import { useRouter } from "expo-router";

const { width } = Dimensions.get("window");

export default function PostCard({ post }: any) {
  console.log('PostCard rendering - post data:', { id: post.id, imageUrl: post.imageUrl, videoUrl: post.videoUrl, mediaType: post.mediaType });
  
  const router = useRouter();
  const currentUser = getCurrentUser();
  // Default avatar from Firebase Storage
  const DEFAULT_AVATAR_URL = 'https://firebasestorage.googleapis.com/v0/b/travel-app-3da72.firebasestorage.app/o/default%2Fdefault-pic.jpg?alt=media&token=7177f487-a345-4e45-9a56-732f03dbf65d';
  const [liked, setLiked] = useState(post.likes?.includes(currentUser?.uid) || false);
  const [likes, setLikes] = useState<number>(post.likesCount || 0);
  const [saving, setSaving] = useState(false);
  const [videoLoading, setVideoLoading] = useState(true);
  const [videoError, setVideoError] = useState(false);
  const [muted, setMuted] = useState(true);
  const [imageError, setImageError] = useState(false);
  // Use fixed image size for modal context
  const imageWidth = Math.min(width, 360);
  const imageHeight = imageWidth;
  
  // Comments state
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentsCount, setCommentsCount] = useState<number>(post.commentsCount || 0);
  const [replyingTo, setReplyingTo] = useState<{ id: string; userName: string } | null>(null);

  async function toggleLike() {
    if (!currentUser || saving) return;
    setSaving(true);
    // Optimistic UI update
    if (liked) {
      setLiked(false);
      setLikes(l => l - 1);
      unlikePost(post.id, currentUser.uid).catch(() => {
        // Revert if failed
        setLiked(true);
        setLikes(l => l + 1);
      }).finally(() => setSaving(false));
    } else {
      setLiked(true);
      setLikes(l => l + 1);
      likePost(post.id, currentUser.uid).catch(() => {
        // Revert if failed
        setLiked(false);
        setLikes(l => l - 1);
      }).finally(() => setSaving(false));
    }
  }

  async function handleComment() {
    setShowCommentsModal(true);
    await loadPostComments();
  }

  async function loadPostComments() {
    setLoadingComments(true);
    const res = await getPostComments(post.id);
    if (res.success) {
      setComments(res.data || []);
      setCommentsCount((res.data ? res.data.length : 0));
    }
    setLoadingComments(false);
  }

  async function handlePostComment() {
    if (!currentUser || !newComment.trim()) return;
    const commentText = replyingTo 
      ? `@${replyingTo.userName} ${newComment}` 
      : newComment;
    // Optimistic UI update
    const tempComment = {
      id: `temp-${Date.now()}`,
      userId: currentUser.uid,
      userName: currentUser.displayName || 'User',
      userAvatar: currentUser.photoURL || DEFAULT_AVATAR_URL,
      text: commentText,
      likes: [],
      likesCount: 0,
      createdAt: new Date(),
    };
    setComments(prev => [tempComment, ...prev]);
    setCommentsCount(prev => prev + 1);
    setNewComment('');
    setReplyingTo(null);
    addComment(
      post.id,
      currentUser.uid,
      currentUser.displayName || 'User',
      currentUser.photoURL || '',
      commentText
    ).then(res => {
      if (res.success) {
        loadPostComments();
      } else {
        // Revert if failed
        setComments(prev => prev.filter(c => c.id !== tempComment.id));
        setCommentsCount(prev => Math.max(0, prev - 1));
      }
    });
  }

  function handleReply(commentId: string, userName: string) {
    setReplyingTo({ id: commentId, userName });
    setNewComment('');
  }

  async function handleDeleteComment(commentId: string) {
    const res = await deleteComment(post.id, commentId);
    if (res.success) {
      setCommentsCount(prev => Math.max(0, prev - 1));
      await loadPostComments();
    }
  }

  async function handleDeletePost() {
    if (!currentUser || currentUser.uid !== post.userId) return;
    
    try {
      setSaving(true);
      const result = await deletePost(post.id);
      if (result.success) {
        router.back();
      } else {
        alert('Failed to delete post: ' + result.error);
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Error deleting post');
    } finally {
      setSaving(false);
    }
  }

  async function handleShare() {
    try {
      await Share.share({
        message: `Check out this post by ${post.userName}: ${post.caption || ''}`,
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  }

  return (
    <>
      <View style={styles.card}>
        <View style={styles.header}>
          <Image source={{ uri: post.userAvatar && post.userAvatar.trim() !== "" ? post.userAvatar : DEFAULT_AVATAR_URL }} style={styles.avatar} />
          <Text style={styles.user}>{post.userName || 'User'}</Text>
        </View>

        <View style={styles.imageWrap}>
          {(post.videoUrl || post.mediaType === 'video') ? (
            <>
              {videoLoading && <ActivityIndicator size="large" color="#007aff" style={{ position: 'absolute', top: '50%', left: '50%', marginLeft: -25, marginTop: -25, zIndex: 1 }} />}
              {videoError && (
                <View style={[styles.image, { width: imageWidth, height: imageHeight, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f0f0' }]}> 
                  <Text style={{ color: '#666', fontSize: 14 }}>Video not available</Text>
                </View>
              )}
              {!videoError && (
                <View style={{ position: 'relative' }}>
                  <Video
                    source={{ uri: post.videoUrl || post.imageUrl }}
                    style={[styles.image, { width: imageWidth, height: imageHeight }]}
                    useNativeControls
                    resizeMode={ResizeMode.COVER}
                    shouldPlay={false}
                    isLooping
                    isMuted={muted}
                    usePoster
                    posterSource={post.imageUrl ? { uri: post.imageUrl } : undefined}
                    posterStyle={{ resizeMode: 'cover', width: imageWidth, height: imageHeight }}
                    onLoadStart={() => {
                      console.log('Video loading started for post:', post.id);
                      setVideoLoading(true);
                    }}
                    onLoad={() => {
                      console.log('Video loaded successfully for post:', post.id);
                      setVideoLoading(false);
                    }}
                    onError={(error: any) => {
                      console.error('Video error for post', post.id, ':', error);
                      setVideoError(true);
                      setVideoLoading(false);
                    }}
                  />
                  <TouchableOpacity
                    style={{ position: 'absolute', bottom: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20, padding: 8, zIndex: 2 }}
                    onPress={() => setMuted(m => !m)}
                  >
                    <Feather name={muted ? 'volume-x' : 'volume-2'} size={22} color="#fff" />
                  </TouchableOpacity>
                </View>
              )}
            </>
          ) : (
            <>
              {imageError ? (
                <View style={[styles.image, { width: imageWidth, height: imageHeight, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f0f0' }]}>
                  <Feather name="image" size={48} color="#ccc" />
                  <Text style={{ color: '#999', marginTop: 8 }}>Image not available</Text>
                </View>
              ) : (
                <Image 
                  source={{ uri: post.imageUrl }} 
                  style={[styles.image, { width: imageWidth, height: imageHeight }]}
                  onError={(e) => {
                    console.error('Image load error:', e.nativeEvent.error);
                    setImageError(true);
                  }}
                  onLoad={() => console.log('Image loaded successfully:', post.imageUrl)}
                />
              )}
            </>
          )}
        </View>

        <View style={styles.actions}>
          <View style={{ flexDirection: "row" }}>
            <TouchableOpacity style={styles.iconBtn} onPress={toggleLike} disabled={saving}>
              <Feather name={liked ? "heart" : "heart"} size={22} color={liked ? "#e0245e" : "#222"} fill={liked ? "#e0245e" : "none"} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={handleComment}>
              <Feather name="message-circle" size={22} color="#222" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={handleShare}>
              <Feather name="send" size={22} color="#222" />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.iconBtn}>
            <Feather name="bookmark" size={22} color="#222" />
          </TouchableOpacity>
        </View>

        <Text style={styles.likes}>{likes.toLocaleString()} likes • {commentsCount} {commentsCount === 1 ? 'comment' : 'comments'}</Text>
        <Text style={styles.caption} numberOfLines={2}>
          <Text style={{ fontWeight: "700" }}>{post.userName || 'User'} </Text>
          {post.caption || ''}
        </Text>
      </View>

      {/* Comments Modal */}
      {showCommentsModal && (
        <Modal
          visible={showCommentsModal}
          animationType="slide"
          transparent={false}
          onRequestClose={() => {
            setShowCommentsModal(false);
            setComments([]);
            setNewComment('');
            setReplyingTo(null);
          }}
        >
          <View style={{ flex: 1, backgroundColor: '#fff' }}>
            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 0.5, borderColor: '#dbdbdb' }}>
              <TouchableOpacity 
                onPress={() => {
                  setShowCommentsModal(false);
                  setComments([]);
                  setNewComment('');
                  setReplyingTo(null);
                }}
                style={{ position: 'absolute', left: 16 }}
              >
                <Feather name="x" size={26} color="#000" />
              </TouchableOpacity>
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#000' }}>Comments</Text>
            </View>

            {/* Comments List */}
            <FlatList
              data={comments}
              keyExtractor={item => item.id}
              renderItem={({ item: comment }) => {
                // Check if this is a reply (starts with @username)
                const isReply = comment.text.startsWith('@');
                const replyMatch = isReply ? comment.text.match(/^@(\w+)\s+(.*)/) : null;
                const replyToUsername = replyMatch ? replyMatch[1] : '';
                const actualText = replyMatch ? replyMatch[2] : comment.text;
                
                return (
                  <View style={{ paddingHorizontal: 16, paddingVertical: 10, marginLeft: isReply ? 44 : 0 }}>
                    {isReply && (
                      <View style={{ position: 'absolute', left: 32, top: 0, bottom: 0, width: 2, backgroundColor: '#dbdbdb' }} />
                    )}
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                      <Image 
                        source={{ uri: comment.userAvatar && comment.userAvatar.trim() !== "" ? comment.userAvatar : DEFAULT_AVATAR_URL }} 
                        style={{ width: 32, height: 32, borderRadius: 16, marginRight: 12 }} 
                      />
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap' }}>
                          <Text style={{ fontWeight: '600', fontSize: 13, color: '#000', marginRight: 6 }}>{comment.userName}</Text>
                          {isReply && (
                            <Text style={{ fontSize: 13, color: '#0095f6', marginRight: 6 }}>@{replyToUsername}</Text>
                          )}
                          <Text style={{ fontSize: 13, color: '#000', lineHeight: 18, flex: 1 }}>{actualText}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 16 }}>
                          <Text style={{ fontSize: 12, color: '#8e8e8e' }}>2m</Text>
                          <TouchableOpacity onPress={() => handleReply(comment.id, comment.userName)}>
                            <Text style={{ fontSize: 12, color: '#8e8e8e', fontWeight: '600' }}>Reply</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={async () => {
                              if (!currentUser) return;
                              if (comment.likes && Array.isArray(comment.likes) && comment.likes.includes(currentUser.uid)) {
                                await unlikeComment(post.id, comment.id, currentUser.uid);
                              } else {
                                await likeComment(post.id, comment.id, currentUser.uid);
                              }
                              await loadPostComments();
                            }}
                          >
                            <Feather
                              name={comment.likes && Array.isArray(comment.likes) && comment.likes.includes(currentUser?.uid) ? "heart" : "heart"}
                              size={11}
                              color={comment.likes && Array.isArray(comment.likes) && comment.likes.includes(currentUser?.uid) ? "#e0245e" : "#8e8e8e"}
                              style={{ fontWeight: comment.likes && Array.isArray(comment.likes) && comment.likes.includes(currentUser?.uid) ? "bold" : "normal" }}
                            />
                            <Text style={{ fontSize: 11, color: '#8e8e8e', marginLeft: 2 }}>{comment.likesCount || 0}</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                      {currentUser?.uid === comment.userId && (
                        <TouchableOpacity onPress={() => handleDeleteComment(comment.id)} style={{ padding: 4 }}>
                          <Feather name="more-horizontal" size={16} color="#8e8e8e" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              }}
              ListEmptyComponent={
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 }}>
                  <Feather name="message-circle" size={80} color="#dbdbdb" style={{ marginBottom: 16 }} />
                  <Text style={{ fontSize: 22, fontWeight: '700', color: '#000', marginBottom: 8 }}>No comments yet</Text>
                  <Text style={{ fontSize: 14, color: '#8e8e8e' }}>
                    {loadingComments ? 'Loading...' : 'Start the conversation.'}
                  </Text>
                </View>
              }
              contentContainerStyle={comments.length === 0 ? { flex: 1 } : {}}
            />

            {/* Input Box */}
            <View style={{ borderTopWidth: 0.5, borderColor: '#dbdbdb', backgroundColor: '#fff' }}>
              {replyingTo && (
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#fafafa' }}>
                  <Text style={{ flex: 1, fontSize: 12, color: '#8e8e8e' }}>
                    Replying to <Text style={{ fontWeight: '600', color: '#000' }}>{replyingTo.userName}</Text>
                  </Text>
                  <TouchableOpacity onPress={() => setReplyingTo(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Feather name="x" size={16} color="#8e8e8e" />
                  </TouchableOpacity>
                </View>
              )}
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 }}>
                <Image 
                  source={{ uri: currentUser?.photoURL && currentUser?.photoURL.trim() !== "" ? currentUser.photoURL : DEFAULT_AVATAR_URL }} 
                  style={{ width: 32, height: 32, borderRadius: 16, marginRight: 12 }} 
                />
                <TextInput
                  style={{ flex: 1, fontSize: 14, color: '#000', paddingVertical: 8 }}
                  placeholder={replyingTo ? `Reply to ${replyingTo.userName}...` : "Add a comment..."}
                  placeholderTextColor="#8e8e8e"
                  value={newComment}
                  onChangeText={setNewComment}
                  multiline
                  maxLength={500}
                />
                {newComment.trim() ? (
                  <TouchableOpacity onPress={handlePostComment}>
                    <Text style={{ fontSize: 14, color: '#0095f6', fontWeight: '600' }}>Post</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          </View>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 18, backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden' },
  header: { flexDirection: "row", alignItems: "center", padding: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 8 },
  user: { fontWeight: "700" },
  image: { width: 340, height: 340, maxWidth: '100%', backgroundColor: "transparent", borderRadius: 0, alignSelf: 'center' },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  iconBtn: { marginRight: 12 },
  likes: { fontWeight: "700", paddingHorizontal: 12 },
  caption: { paddingHorizontal: 12, paddingTop: 6, color: "#333" },
  imageWrap: { 
    position: 'relative',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 320,
  },
});
