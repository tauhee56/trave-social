import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import type { Video as VideoType } from 'expo-av';
import { ResizeMode, Video } from 'expo-av';
import { Image as ExpoImage } from 'expo-image';
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { getLocationVisitCount, likePost, unlikePost } from "../../lib/firebaseHelpers";
import CommentSection from "./CommentSection";
import SaveButton from "./SaveButton";
import { useUser } from "./UserContext";

// Props type for PostCard
interface PostCardProps {
  post: any;
  currentUser: any;
  showMenu?: boolean;
}

const PostCard: React.FC<PostCardProps> = ({ post, currentUser, showMenu = true }) => {
      // Visits logic
      const [visitCount, setVisitCount] = useState<number>(typeof post?.visits === 'number' ? post.visits : 0);
      useEffect(() => {
        async function fetchVisits() {
          if (post?.location) {
            const count = await getLocationVisitCount(post.location);
            setVisitCount(count);
          }
        }
        fetchVisits();
      }, [post?.location]);
    // App color scheme
    const appColors = {
      background: '#fff',
      text: '#222',
      accent: '#007aff',
      muted: '#888',
      border: '#eee',
      input: '#f5f5f5',
      like: '#e74c3c',
      icon: '#222',
    };
    // Expandable description
    const showFullDesc = false;
  // Real-time Firestore listener for likes, likesCount, and savedBy
  const [likes, setLikes] = useState<string[]>(post?.likes || []);
  const [likesCount, setLikesCount] = useState(post?.likesCount || likes.length);
  const [savedBy, setSavedBy] = useState<string[]>(post?.savedBy || []);
  const user = useUser();
  const liked = likes.includes(user?.uid || "");
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    (async () => {
      const firestore = await import('firebase/firestore');
      const { db } = await import('../../config/firebase');
      if (!post?.id) return;
      const postRef = firestore.doc(db, 'posts', post.id);
      unsubscribe = firestore.onSnapshot(postRef, (docSnap: any) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setLikes(data.likes || []);
          setLikesCount(data.likesCount || 0);
          setSavedBy(data.savedBy || []);
        }
      });
    })();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [post?.id]);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [commentCount, setCommentCount] = useState(0);
  const [currentAvatar, setCurrentAvatar] = useState<string>("");
  const images = post?.imageUrls && post.imageUrls.length > 0 ? post.imageUrls : [post?.imageUrl];
  // Video support: gather video URLs
  const videos = post?.videoUrls && post.videoUrls.length > 0 ? post.videoUrls : (post?.videoUrl ? [post.videoUrl] : []);
  // Combine images and videos for carousel
  const mediaItems = [
    ...images.filter(Boolean).map((url: string) => ({ type: 'image', url })),
    ...videos.filter(Boolean).map((url: string) => ({ type: 'video', url }))
  ];
  // Track current media index
  const [mediaIndex, setMediaIndex] = useState(0);
  // Add state for video loading, play, mute, progress, and completed
  const [videoLoading, setVideoLoading] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(true);
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoCompleted, setVideoCompleted] = useState(false);
  // Add ref for Video with correct type
  const videoRef = useRef<VideoType>(null);
  // Menu state
  const [showMenuModal, setShowMenuModal] = useState(false);

  useEffect(() => {
    async function fetchCurrentAvatar() {
      if (post?.userId) {
        const res = await import("../../lib/firebaseHelpers");
        const profile = await res.getUserProfile(post.userId);
        if (profile.success && "data" in profile) {
          if (profile.data.avatar) {
            setCurrentAvatar(profile.data.avatar);
          } else if (profile.data.photoURL) {
            setCurrentAvatar(profile.data.photoURL);
          } else {
            setCurrentAvatar("https://firebasestorage.googleapis.com/v0/b/travel-app-3da72.firebasestorage.app/o/default%2Fdefault-pic.jpg?alt=media&token=7177f487-a345-4e45-9a56-732f03dbf65d");
          }
        } else {
          setCurrentAvatar("https://firebasestorage.googleapis.com/v0/b/travel-app-3da72.firebasestorage.app/o/default%2Fdefault-pic.jpg?alt=media&token=7177f487-a345-4e45-9a56-732f03dbf65d");
        }
      }
    }
    fetchCurrentAvatar();
    setLikes(post?.likes || []);
  }, [post?.likes, post?.userId]);

  // Add replay handler
  const onReplay = () => {
    setVideoCompleted(false);
    setIsVideoPlaying(true);
    setVideoProgress(0);
    if (videoRef.current) {
      videoRef.current.setPositionAsync(0);
    }
  };

  // Delete post handler
  const handleDeletePost = async () => {
    if (!post?.id || !user?.uid) return;
    try {
      const { deletePost } = await import('../../lib/firebaseHelpers');
      const result = await deletePost(post.id, user.uid);
      if (result.success) {
        alert('Post deleted successfully');
        // Optionally: trigger parent to refresh posts
      } else {
        alert(result.error || 'Failed to delete post');
      }
    } catch {
      alert('Error deleting post');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: appColors.background }}>
      <View style={[styles.card, { backgroundColor: appColors.background }]}> 
        {/* Top section: Location, Visits, Avatar */}
        <View style={styles.topRow}>
          {post?.locationData?.verified ? (
            <View style={styles.verifiedBadgeBox}>
              <MaterialCommunityIcons name="shield-check" size={14} color="#111" />
            </View>
          ) : (
            <View style={styles.locationIconBox}>
              <Feather name="map-pin" size={18} color={appColors.accent} />
            </View>
          )}
          <View style={styles.locationInfo}>
            <Text style={styles.locationName}>{(() => {
              let name = '';
              if (typeof post?.locationData?.name === 'string' || typeof post?.locationData?.name === 'number') {
                name = String(post?.locationData?.name);
              } else if (typeof post?.location === 'string' || typeof post?.location === 'number') {
                name = String(post?.location);
              }
              return name;
            })()}</Text>
            {post?.location ? (
              <Text style={styles.visits}>{(() => {
                let visits = '';
                if (typeof visitCount === 'number' || typeof visitCount === 'string') {
                  visits = String(visitCount);
                }
                return `${visits} visits`;
              })()}</Text>
            ) : null}
          </View>
          <View style={{ flex: 1 }} />
          <ExpoImage source={{ uri: currentAvatar || 'https://via.placeholder.com/120x120.png?text=User' }} style={styles.avatar} contentFit="cover" transition={300} />
          {showMenu && (
            <TouchableOpacity onPress={() => setShowMenuModal(true)} style={{ marginLeft: 12, padding: 4 }}>
              <Feather name="more-vertical" size={20} color={appColors.icon} />
            </TouchableOpacity>
          )}
        </View>
        {/* Post Image or Video */}
        <View style={styles.imageWrap}>
          {mediaItems.length > 0 && mediaItems[mediaIndex].type === 'image' ? (
            <ExpoImage source={{ uri: mediaItems[mediaIndex].url }} style={styles.image} contentFit="cover" transition={300} />
          ) : mediaItems.length > 0 && mediaItems[mediaIndex].type === 'video' ? (
            <View style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' }}>
              {/* Timeline progress bar at bottom */}
              <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 4, backgroundColor: 'rgba(255,255,255,0.3)', zIndex: 5 }}>
                <View style={{ width: `${videoProgress * 100}%`, height: '100%', backgroundColor: '#FFB800' }} />
              </View>
              {videoLoading && (
                <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', zIndex: 2 }}>
                  <ActivityIndicator size="large" color="#FFB800" />
                </View>
              )}
              <Video
                ref={videoRef}
                source={{ uri: mediaItems[mediaIndex].url }}
                style={styles.image}
                resizeMode={ResizeMode.COVER}
                shouldPlay={isVideoPlaying}
                useNativeControls={true}
                isLooping={false}
                isMuted={isVideoMuted}
                posterSource={{ uri: mediaItems[mediaIndex].url }}
                posterStyle={{ width: '100%', height: '100%' }}
                onLoadStart={() => setVideoLoading(true)}
                onLoad={() => setVideoLoading(false)}
                onPlaybackStatusUpdate={status => {
                  if ('didJustFinish' in status && status.didJustFinish) {
                    setIsVideoPlaying(false);
                    setVideoCompleted(true);
                  }
                  if (
                    status &&
                    status.isLoaded &&
                    'positionMillis' in status &&
                    'durationMillis' in status &&
                    typeof status.positionMillis === 'number' &&
                    typeof status.durationMillis === 'number' &&
                    status.durationMillis > 0
                  ) {
                    setVideoProgress(status.positionMillis / status.durationMillis);
                  }
                }}
              />
              {!isVideoPlaying && !videoLoading && !videoCompleted && (
                <TouchableOpacity
                  style={{ position: 'absolute', top: '45%', left: '45%', zIndex: 3, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 32, padding: 12 }}
                  onPress={() => setIsVideoPlaying(true)}
                >
                  <Feather name="play" size={36} color="#FFB800" />
                </TouchableOpacity>
              )}
              {/* Mute/unmute button */}
              {isVideoPlaying && !videoLoading && !videoCompleted && (
                <TouchableOpacity
                  style={{ position: 'absolute', top: 16, right: 16, zIndex: 4, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20, padding: 8 }}
                  onPress={() => setIsVideoMuted(m => !m)}
                >
                  <Feather name={isVideoMuted ? "volume-x" : "volume-2"} size={24} color="#FFB800" />
                </TouchableOpacity>
              )}
              {/* Blur and replay icon button when video completed */}
              {videoCompleted && (
                <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)', zIndex: 6 }}>
                  <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.3)', zIndex: 7 }} />
                  <TouchableOpacity style={{ zIndex: 8, backgroundColor: '#FFB800', borderRadius: 32, padding: 12 }} onPress={onReplay}>
                    <Feather name="rotate-ccw" size={24} color="#fff" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ) : null}
          {/* Carousel navigation: left/right tap zones */}
          {mediaItems.length > 1 && (
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, flexDirection: 'row' }}>
              <TouchableOpacity style={{ flex: 1 }} onPress={() => { setIsVideoPlaying(false); setMediaIndex(i => i > 0 ? i - 1 : i); setVideoCompleted(false); }} activeOpacity={1} />
              <TouchableOpacity style={{ flex: 1 }} onPress={() => { setIsVideoPlaying(false); setMediaIndex(i => i < mediaItems.length - 1 ? i + 1 : i); setVideoCompleted(false); }} activeOpacity={1} />
            </View>
          )}
        </View>
        {/* All content inside card box */}
        <View style={{ paddingHorizontal: 2 }}>
          <View style={styles.iconRow}>
            <TouchableOpacity
              onPress={async () => {
                const userId = user?.uid;
                if (!userId) {
                  alert('User not logged in');
                  return;
                }
                try {
                  if (likes.includes(userId)) {
                    const res = await unlikePost(post.id, userId);
                    if (!res.success) {
                      alert('Unlike error: ' + res.error);
                    }
                  } else {
                    const res = await likePost(post.id, userId);
                    if (!res.success) {
                      alert('Like error: ' + res.error);
                    }
                  }
                } catch (err) {
                  alert('Like/unlike exception: ' + err);
                }
              }}
              style={{ marginRight: 8, flexDirection: 'row', alignItems: 'center' }}
            >
              {liked ? (
                <MaterialCommunityIcons name="heart" size={24} color={appColors.like} />
              ) : (
                <MaterialCommunityIcons name="heart-outline" size={24} color={appColors.icon} />
              )}
              <Text style={{ marginLeft: 6, fontWeight: '700', color: appColors.text, fontSize: 15 }}>{typeof likesCount === 'number' || typeof likesCount === 'string' ? String(likesCount) : ''}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowCommentsModal(true)} style={{ marginRight: 24 }}>
              <Feather name="message-circle" size={22} color={appColors.icon} />
            </TouchableOpacity>
            <TouchableOpacity style={{ marginRight: 24 }}>
              <Feather name="send" size={22} color={appColors.accent} />
            </TouchableOpacity>
            <View style={{ flex: 1 }} />
            <SaveButton post={{ ...post, savedBy }} />
          </View>
          {/* Likes Count */}
          <Text style={[styles.likes, { color: appColors.text }]}>{typeof likesCount === 'number' ? `${likesCount.toLocaleString()} likes` : ''}</Text>
          {/* Description (expandable) */}
          <Text style={[styles.caption, { color: appColors.text }]} numberOfLines={showFullDesc ? undefined : 2}>
            {(() => {
              let username = '';
              if (typeof post?.userName === 'string' || typeof post?.userName === 'number') {
                username = String(post?.userName);
              }
              let caption = '';
              if (typeof post?.caption === 'string' || typeof post?.caption === 'number') {
                caption = String(post?.caption);
              } else if (Array.isArray(post?.caption) || typeof post?.caption === 'object') {
                caption = JSON.stringify(post?.caption);
              }
              return username ? `${username} ${caption}`.trim() : caption;
            })()}
          </Text>
          {/* Comments Preview */}
          <TouchableOpacity onPress={() => setShowCommentsModal(true)}>
            <Text style={[styles.commentPreview, { color: appColors.muted }]}>{`View all ${commentCount} comments`}</Text>
          </TouchableOpacity>
          {/* Remove the comment input box below like button */}
          {/* Time */}
          <Text style={styles.time}>{typeof post?.timeAgo === 'string' || typeof post?.timeAgo === 'number' ? String(post?.timeAgo) : '1 day ago'}</Text>
        </View>
        {/* Comments Modal */}
        <Modal
          visible={showCommentsModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowCommentsModal(false)}
        >
          <KeyboardAvoidingView style={{ flex: 1, justifyContent: 'flex-end' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={{ flex: 1, justifyContent: 'flex-end' }}>
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.18)' }}
                activeOpacity={1}
                onPress={() => setShowCommentsModal(false)}
              />
              <View
                style={{
                  backgroundColor: '#fff',
                  borderTopLeftRadius: 18,
                  borderTopRightRadius: 18,
                  paddingTop: 18,
                  paddingHorizontal: 16,
                  height: '92%',
                  shadowColor: '#000',
                  shadowOpacity: 0.08,
                  shadowRadius: 8,
                  elevation: 8,
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: 0,
                  touchAction: 'none',
                }}
              >
                <View style={{ alignItems: 'center', marginBottom: 8 }}>
                  <View style={{ width: 40, height: 4, backgroundColor: '#eee', borderRadius: 2, marginBottom: 8 }} />
                  <Text style={{ fontWeight: '700', fontSize: 17, color: '#222' }}>Comments</Text>
                </View>
                {/* Use reusable CommentSection component */}
                <CommentSection 
                  postId={post.id} 
                  currentAvatar={currentAvatar}
                  maxHeight={300}
                  showInput={true}
                  inlineMode={false}
                  onCommentsLoaded={setCommentCount}
                  instagramStyle
                />
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
        {/* Menu Modal */}
        <Modal
          visible={showMenuModal}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setShowMenuModal(false)}
        >
          <TouchableOpacity
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' }}
            activeOpacity={1}
            onPress={() => setShowMenuModal(false)}
          >
            <View style={styles.menuContainer}>
              {user?.uid === post?.userId && (
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    setShowMenuModal(false);
                    setTimeout(() => {
                      Alert.alert(
                        'Delete Post',
                        'Are you sure you want to delete this post?',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Delete', style: 'destructive', onPress: handleDeletePost }
                        ]
                      );
                    }, 300);
                  }}
                >
                  <Feather name="trash-2" size={20} color="#e74c3c" />
                  <Text style={[styles.menuText, { color: '#e74c3c' }]}>Delete Post</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => setShowMenuModal(false)}
              >
                <Feather name="x" size={20} color="#666" />
                <Text style={styles.menuText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    </View>
  );
}


export default PostCard;

const styles = StyleSheet.create({
  verifiedBadgeBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#fafafa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginTop: 2,
  },
  locationIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginTop: 2,
  },
  locationInfo: {
    flexDirection: 'column',
    justifyContent: 'flex-start',
    marginRight: 10,
    minWidth: 80,
    marginTop: 2,
  },
      locationName: {
        fontWeight: '600',
        fontSize: 15,
        color: '#222',
        marginBottom: 2,
      },
  card: {
    marginBottom: 16,
    backgroundColor: '#fff',
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 0,
    paddingTop: 12,
    paddingBottom: 16,
    overflow: 'hidden',
    borderRadius: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: '100%',
    minHeight: 50,
    paddingHorizontal: 16,
    alignSelf: 'center',
    marginBottom: 8,
  },
  userInfo: {
    flex: 1,
    marginRight: 12,
  },
  userName: {
    fontWeight: "700",
    fontSize: 16,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  locationIcon: {
    marginRight: 4,
  },
  location: {
    fontSize: 14,
    color: "#666",
  },
  visits: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#eee",
  },
  categoryImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    alignSelf: 'center',
  },
  imageWrap: {
    width: '100%',
    height: 520, // Increased height for feed/profile posts
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: 'center',
  },
  image: {
    width: '100%',
    height: 520, // Increased height for feed/profile posts
    resizeMode: "cover",
    alignSelf: 'center',
  },
  iconRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
  },
  likes: {
    fontWeight: "700",
    fontSize: 15,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
  },
  caption: {
    paddingHorizontal: 12,
    paddingBottom: 2,
    color: "#333",
  },
  commentPreview: {
    paddingHorizontal: 12,
    paddingBottom: 2,
    fontSize: 14,
    color: "#007aff",
  },
  commentRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#eee",
  },
  commentInput: {
    flex: 1,
    maxHeight: 100,
    fontSize: 15,
    color: "#222",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#007aff",
  },
  commentIcon: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#007aff",
    alignItems: "center",
    justifyContent: "center",
  },
  time: {
    fontSize: 12,
    color: "#999",
    paddingHorizontal: 12,
    paddingBottom: 2,
    textAlign: "right",
  },
  modalBackground: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
  },
  modalContainer: {
    width: "100%",
    maxWidth: 600,
    backgroundColor: "#fff",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingTop: 18,
    paddingHorizontal: 16,
    paddingBottom: 24,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalHeader: {
    alignItems: "center",
    marginBottom: 12,
  },
  modalCloseButton: {
    position: "absolute",
    top: 12,
    right: 12,
    padding: 8,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
  },
  modalTitle: {
    fontWeight: "700",
    fontSize: 18,
    color: "#222",
  },
  commentsList: {
    maxHeight: 400,
  },
  commentItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  commentUserAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#eee",
  },
  commentContent: {
    flex: 1,
  },
  commentUserName: {
    fontWeight: "700",
    color: "#222",
    fontSize: 14,
  },
  commentText: {
    color: "#222",
    fontSize: 14,
    marginTop: 2,
  },
  replyButton: {
    marginTop: 4,
  },
  replyButtonText: {
    color: "#007aff",
    fontSize: 13,
  },
  viewMoreRepliesText: {
    color: "#007aff",
    fontSize: 13,
    marginTop: 4,
  },
  hideRepliesText: {
    color: "#007aff",
    fontSize: 13,
    marginTop: 4,
  },
  addCommentContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  addCommentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#eee",
  },
  addCommentInput: {
    flex: 1,
    maxHeight: 100,
    fontSize: 15,
    color: "#222",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#007aff",
  },
  addCommentButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#007aff",
    alignItems: "center",
    justifyContent: "center",
  },
  menuContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '80%',
    maxWidth: 300,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 0.5,
    borderBottomColor: '#eee',
  },
  menuText: {
    fontSize: 16,
    marginLeft: 12,
    color: '#222',
    fontWeight: '500',
  },
});
