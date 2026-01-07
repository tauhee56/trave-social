import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import type { Video as VideoType } from 'expo-av';
import { ResizeMode, Video } from 'expo-av';
import { Image as ExpoImage } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Dimensions, KeyboardAvoidingView, Modal, PanResponder, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { feedEventEmitter } from '../../lib/feedEventEmitter';
import { getLocationVisitCount, likePost, unlikePost } from "../../lib/firebaseHelpers";
import { getOptimizedImageUrl } from "../../lib/imageHelpers";
import { notificationService } from '../../lib/notificationService';
import { CommentSection } from "./CommentSection";
import SaveButton from "./SaveButton";
import { useUser } from "./UserContext";
import VerifiedBadge from "./VerifiedBadge";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const isSmallDevice = SCREEN_WIDTH < 375;
const IMAGE_PLACEHOLDER = 'L5H2EC=PM+yV0g-mq.wG9c010J}I';

// Props type for PostCard
interface PostCardProps {
  post: any;
  currentUser: any;
  showMenu?: boolean;
  highlightedCommentId?: string;
  highlightedCommentText?: string;
  showCommentsModal?: boolean;
  onCloseCommentsModal?: () => void;
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: '#fff',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  locationTextWrap: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 0,
  },
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
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  locationInfo: {
    flexDirection: 'column',
    justifyContent: 'center',
    flex: 1,
    minWidth: 0,
  },
  locationName: {
    fontWeight: 'bold',
    fontSize: 15,
    color: '#111',
    marginBottom: 0,
    flexShrink: 1,
    letterSpacing: 0.1,
  },
  visits: {
    fontSize: 13,
    color: '#666',
    fontWeight: '400',
    marginTop: 2,
    letterSpacing: 0.1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#eee',
    borderWidth: 1,
    borderColor: '#ddd',
    overflow: 'hidden',
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
  categoryImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    alignSelf: 'center',
  },
  imageWrap: {
    flex: 1,
    width: '100%',
    height: SCREEN_HEIGHT,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: 'center',
  },
  image: {
    width: '100%',
    height: SCREEN_HEIGHT,
    resizeMode: "contain",
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
  hashtags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
    gap: 6,
  },
  hashtag: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  hashtagText: {
    color: '#667eea',
    fontSize: 12,
    fontWeight: '600',
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
    maxWidth: 800, // Increased max width
    minHeight: 400, // Increased min height
    backgroundColor: "#fff",
    borderTopLeftRadius: 28, // Larger radius
    borderTopRightRadius: 28,
    paddingTop: 32, // More padding
    paddingHorizontal: 32,
    paddingBottom: 40,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
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
  // Video overlay styles
  muteOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    zIndex: 5,
  },
  muteIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  muteText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  muteButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  playButtonOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  playButtonCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoControlsBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(0,0,0,0.4)',
    zIndex: 10,
  },
  videoProgressBar: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    marginHorizontal: 10,
    overflow: 'hidden',
  },
  videoProgressFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 2,
  },
  videoControlButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoTimeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '500',
    minWidth: 35,
  },
});

function PostCard({ post, currentUser, showMenu = true, highlightedCommentId, highlightedCommentText }: PostCardProps) {
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
  const showFullDesc = false;
  // OPTIMIZATION: Use post data directly instead of real-time listeners
  const [likes, setLikes] = useState<string[]>(Array.isArray(post?.likes) ? post.likes : []);
  const [likesCount, setLikesCount] = useState<number>(typeof post?.likesCount === 'number' ? post.likesCount : (Array.isArray(post?.likes) ? post.likes.length : 0));
  const [savedBy, setSavedBy] = useState<string[]>(post?.savedBy || []);
  const user = useUser();
  // FIX: Use currentUser prop if user context is not available
  const userIdForLike = user?.uid || user?.id || currentUser?.uid || currentUser?.firebaseUid || currentUser?.id || currentUser;
  const liked = likes.includes(userIdForLike || "");

  console.log('[PostCard] userIdForLike:', userIdForLike, 'user:', user, 'currentUser:', currentUser, 'likes:', likes.length);

  // OPTIMIZATION: Update local state when post prop changes (no real-time listener)
  useEffect(() => {
    setLikes(Array.isArray(post?.likes) ? post.likes : []);
    setLikesCount(typeof post?.likesCount === 'number' ? post.likesCount : (Array.isArray(post?.likes) ? post.likes.length : 0));
    setSavedBy(Array.isArray(post?.savedBy) ? post.savedBy : []);
  }, [post?.likes, post?.likesCount, post?.savedBy]);

  // OPTIMIZATION: Use commentCount from post data initially
  // Event listener will update when comments are added
  const [commentCount, setCommentCount] = useState(post?.commentCount || 0);

  // DON'T reset from post.commentCount on every change - event emitter handles updates!
  // The post prop may have stale data, event emitter has real-time accurate data

  // Listen for comment updates via event emitter
  useEffect(() => {
    const handlePostUpdated = (postId: string, data: any) => {
      if (postId === post.id) {
        // Use actual commentCount from backend if provided, otherwise increment
        if (data?.commentCount !== undefined && typeof data.commentCount === 'number') {
          console.log('[PostCard] Setting comment count to actual value from backend:', data.commentCount);
          setCommentCount(data.commentCount);
        } else if (data?.newCommentCount || data?.commentAdded) {
          // Fallback: increment by 1 if we don't have actual count
          setCommentCount(prev => {
            const newCount = prev + 1;
            console.log('[PostCard] Incrementing comment count to:', newCount);
            return newCount;
          });
        }
      }
    };

    const subscription = feedEventEmitter.onPostUpdated(post.id, handlePostUpdated);

    return () => {
      feedEventEmitter.offPostUpdated(post.id, subscription);
    };
  }, [post.id]);

  const [currentAvatar, setCurrentAvatar] = useState<string>("https://via.placeholder.com/200x200.png?text=Profile");
  useEffect(() => {
    // Use pre-populated user data from backend if available
    if (post?.userId && typeof post.userId === 'object') {
      // Backend populated userId with user object
      const avatar = post.userId?.avatar || post.userId?.photoURL || post.userId?.profilePicture;
      console.log('[PostCard] Using populated user avatar:', avatar);
      if (avatar) {
        setCurrentAvatar(avatar);
        return;
      }
    }

    // If userId is a string, try to get avatar from the post object directly
    if (typeof post?.userId === 'string' && post?.userAvatar) {
      console.log('[PostCard] Using post.userAvatar:', post.userAvatar);
      setCurrentAvatar(post.userAvatar);
      return;
    }

    // Fallback: fetch avatar if userId is just a string
    async function fetchAvatar() {
      if (post?.userId && typeof post.userId === 'string') {
        try {
          console.log('[PostCard] Fetching avatar for userId:', post.userId);
          const { getUserProfile } = await import('../../lib/firebaseHelpers/user');
          const res = await getUserProfile(post.userId);
          if (res && res.success && res.data && res.data.avatar) {
            console.log('[PostCard] Fetched avatar:', res.data.avatar);
            setCurrentAvatar(res.data.avatar);
          } else {
            console.warn('[PostCard] No avatar in profile response');
          }
        } catch (err) {
          console.warn('[PostCard] Error fetching avatar:', err);
          setCurrentAvatar("https://via.placeholder.com/200x200.png?text=Profile");
        }
      }
    }
    fetchAvatar();
  }, [post?.userId, post?.userAvatar]);

  // Helper function to check if URL is a video
  const isVideoUrl = (url: string) => {
    if (!url) return false;
    const videoExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v'];
    const lowerUrl = url.toLowerCase();
    return videoExtensions.some(ext => lowerUrl.includes(ext));
  };

  // Filter out video URLs from images array
  const rawImages: string[] = post?.imageUrls && post.imageUrls.length > 0 ? post.imageUrls.filter(Boolean) : (post?.imageUrl ? [post.imageUrl] : []);
  const images: string[] = rawImages.filter((url: string) => !isVideoUrl(url));

  const videos: string[] = post?.videoUrls && post.videoUrls.length > 0 ? post.videoUrls.filter(Boolean) : (post?.videoUrl ? [post.videoUrl] : []);

  // If images exist, show only image carousel. If no images, show only first video. If neither, show placeholder.
  let showImages = images.length > 0;
  let showVideo = !showImages && videos.length > 0;
  const [mediaIndex, setMediaIndex] = useState(0);
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false); // Videos don't auto-play
  const [isVideoMuted, setIsVideoMuted] = useState(true); // Muted by default
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoCompleted, setVideoCompleted] = useState(false);
  const [showMuteOverlay, setShowMuteOverlay] = useState(true); // Show tap to unmute overlay
  const [videoDuration, setVideoDuration] = useState(0); // Total duration in seconds
  const [videoCurrentTime, setVideoCurrentTime] = useState(0); // Current position in seconds
  const [showControls, setShowControls] = useState(true); // Show video controls
  const videoRef = useRef<VideoType>(null);
  const mediaIndexRef = useRef(0);

  // Update ref when state changes
  useEffect(() => {
    mediaIndexRef.current = mediaIndex;
  }, [mediaIndex]);

  // Carousel swipe gesture - improved handling
  const carouselPanResponder = React.useMemo(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only capture horizontal swipes
        return Math.abs(gestureState.dx) > 15 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
      },
      onPanResponderTerminationRequest: () => false,
      onPanResponderRelease: (_, gestureState) => {
        const currentIndex = mediaIndexRef.current;
        const totalImages = images.length;

        if (gestureState.dx > 40 && currentIndex > 0) {
          // Swipe right - go to previous
          setMediaIndex(currentIndex - 1);
        } else if (gestureState.dx < -40 && currentIndex < totalImages - 1) {
          // Swipe left - go to next
          setMediaIndex(currentIndex + 1);
        }
      },
    }), [images.length]);
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [localShowCommentsModal, setLocalShowCommentsModal] = useState(false);
  const showCommentsModal = localShowCommentsModal;
  const setShowCommentsModal = setLocalShowCommentsModal;
  // Add PanResponder for swipe down to close comments modal
  const [modalTranslateY, setModalTranslateY] = useState(0);
  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only respond to downward vertical swipes from top area
        return gestureState.dy > 10 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
      },
      onPanResponderMove: (_, gestureState) => {
        // Only allow downward movement
        if (gestureState.dy > 0) {
          setModalTranslateY(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        // If swiped down more than 100px, close modal
        if (gestureState.dy > 100) {
          setShowCommentsModal(false);
          setModalTranslateY(0);
        } else {
          // Otherwise, snap back to position
          setModalTranslateY(0);
        }
      },
    })
  ).current;

  const onReplay = () => {
    setVideoCompleted(false);
    setIsVideoPlaying(true);
    setVideoProgress(0);
    if (videoRef.current) {
      videoRef.current.setPositionAsync(0);
    }
  };

  const handleDeletePost = async () => {
    if (!post?.id || !user?.uid) return;
    try {
      const { deletePost } = await import('../../lib/firebaseHelpers');
      const result = await deletePost(post.id, user.uid);
      if (result.success) {
        alert('Post deleted successfully');
      } else {
        alert(result.error || 'Failed to delete post');
      }
    } catch {
      alert('Error deleting post');
    }
  };

  const router = useRouter();

  return (
    <View style={{ flex: 1, backgroundColor: appColors.background }}>
      <View style={[styles.card, { backgroundColor: appColors.background }]}>
        {/* Top section: Location/Visits (left), Avatar (right) */}
        <View style={styles.topRow}>
          {/* Location and Visits (left) - CLICKABLE */}
          <TouchableOpacity
            style={styles.locationInfo}
            activeOpacity={0.7}
            onPress={() => {
              // Navigate to location screen with location details
              const locationToUse = post?.locationData?.name || post?.locationName || post?.location;
              const addressToUse = post?.locationData?.address || locationToUse;

              if (locationToUse) {
                // Use placeId if available, otherwise use location name
                if (post?.locationData?.placeId) {
                  router.push({
                    pathname: `/location/[placeId]`,
                    params: {
                      placeId: post.locationData.placeId,
                      locationName: locationToUse,
                      locationAddress: addressToUse
                    }
                  } as any);
                } else {
                  // Navigate with location name even without placeId
                  router.push({
                    pathname: `/location/[placeId]`,
                    params: {
                      placeId: 'custom',
                      locationName: locationToUse,
                      locationAddress: addressToUse
                    }
                  } as any);
                }
              } else {
                console.log('No location available for this post');
              }
            }}
            accessible
            accessibilityRole="button"
            accessibilityLabel={liked ? 'Unlike post' : 'Like post'}
          >
            <View style={styles.locationRow}>
              {/* Show verified badge if location is verified, otherwise show map pin */}
              {post?.locationData?.verified ? (
                <View style={styles.verifiedBadgeBox}>
                  <VerifiedBadge size={20} color="#000" />
                </View>
              ) : (
                <View style={styles.locationIconBox}>
                  <Feather name="map-pin" size={20} color="#111" />
                </View>
              )}
              <View style={styles.locationTextWrap}>
                <Text style={styles.locationName} numberOfLines={1} ellipsizeMode="tail">
                  {post?.locationData?.name || post?.locationName || post?.location || 'Unknown Location'}
                </Text>
                <Text style={styles.visits}>{visitCount.toLocaleString()} Visits</Text>
              </View>
            </View>
          </TouchableOpacity>
          {/* Avatar (right) - CLICKABLE */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              // Navigate to user profile
              if (post?.userId) {
                // Handle both string userId and object userId (from backend population)
                const uid = typeof post.userId === 'string' ? post.userId : post.userId?._id || post.userId?.uid;
                if (uid) {
                  router.push({
                    pathname: '/(tabs)/profile',
                    params: { user: uid }
                  } as any);
                } else {
                  console.log('No valid userId found for this post');
                }
              } else {
                console.log('No userId available for this post');
              }
            }}
          >
            <ExpoImage
              source={{ uri: currentAvatar }}
              style={styles.avatar}
              contentFit="cover"
              placeholder={IMAGE_PLACEHOLDER}
              transition={150}
            />
          </TouchableOpacity>
        </View>
        {/* Media content: Image/Video */}
        {/* Image carousel if images exist */}
        {showImages && (
          <View style={styles.imageWrap} {...carouselPanResponder.panHandlers}>
            <ExpoImage
              source={{ uri: getOptimizedImageUrl(images[mediaIndex] || 'https://via.placeholder.com/600x600.png?text=No+Image', 'feed') }}
              style={styles.image}
              contentFit="cover"
              placeholder={IMAGE_PLACEHOLDER}
              transition={200}
            />
            {/* Left/Right tap areas for navigation */}
            {images.length > 1 && (
              <>
                <TouchableOpacity
                  style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '30%', zIndex: 5 }}
                  onPress={() => mediaIndex > 0 && setMediaIndex(mediaIndex - 1)}
                  activeOpacity={1}
                />
                <TouchableOpacity
                  style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '30%', zIndex: 5 }}
                  onPress={() => mediaIndex < images.length - 1 && setMediaIndex(mediaIndex + 1)}
                  activeOpacity={1}
                />
              </>
            )}
            {/* Page indicators (dots) - Instagram style at bottom center */}
            {images.length > 1 && (
              <View style={{ position: 'absolute', bottom: 12, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', zIndex: 10 }}>
                {images.map((_: string, idx: number) => (
                  <View
                    key={idx}
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      marginHorizontal: 3,
                      backgroundColor: idx === mediaIndex ? '#fff' : 'rgba(255,255,255,0.4)',
                    }}
                  />
                ))}
              </View>
            )}
          </View>
        )}
        {/* Video if no images and video exists */}
        {showVideo && (
          <TouchableOpacity
            style={styles.imageWrap}
            activeOpacity={1}
            onPress={() => {
              // Toggle play/pause on tap (center area)
              if (isVideoPlaying) {
                setIsVideoPlaying(false);
              } else {
                setIsVideoPlaying(true);
                setVideoCompleted(false);
              }
            }}
          >
            {videoLoading && (
              <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 10 }}>
                <ActivityIndicator size="large" color="#FFB800" />
              </View>
            )}
            {videos[0] ? (
              <>
                <Video
                  ref={videoRef}
                  source={{ uri: videos[0] }}
                  style={[styles.image, { width: '100%', height: '100%' }]}
                  resizeMode={ResizeMode.COVER}
                  shouldPlay={isVideoPlaying}
                  useNativeControls={false}
                  isLooping={false}
                  isMuted={isVideoMuted}
                  posterSource={{ uri: videos[0] }}
                  posterStyle={{ width: '100%', height: '100%' }}
                  onLoadStart={() => { setVideoLoading(true); setVideoError(null); }}
                  onLoad={(status: any) => {
                    setVideoLoading(false);
                    if (status.durationMillis) {
                      setVideoDuration(Math.floor(status.durationMillis / 1000));
                    }
                  }}
                  onError={(e: any) => { setVideoError(e?.nativeEvent?.error || 'Video failed to load'); setVideoLoading(false); }}
                  onPlaybackStatusUpdate={status => {
                    if ('didJustFinish' in status && status.didJustFinish) {
                      setVideoCompleted(true);
                      setIsVideoPlaying(false);
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
                      setVideoCurrentTime(Math.floor(status.positionMillis / 1000));
                      setVideoDuration(Math.floor(status.durationMillis / 1000));
                    }
                  }}
                />

                {/* Tap to Unmute Overlay - only on first load when muted */}
                {showMuteOverlay && isVideoMuted && !videoCompleted && (
                  <TouchableOpacity
                    style={styles.muteOverlay}
                    onPress={() => {
                      setIsVideoMuted(false);
                      setShowMuteOverlay(false);
                      setIsVideoPlaying(true);
                    }}
                  >
                    <View style={styles.muteIconContainer}>
                      <Feather name="volume-x" size={24} color="#fff" />
                    </View>
                    <Text style={styles.muteText}>Tap to unmute</Text>
                  </TouchableOpacity>
                )}

                {/* Replay Overlay - when video completed */}
                {videoCompleted && (
                  <TouchableOpacity
                    style={styles.muteOverlay}
                    onPress={async () => {
                      // Replay from beginning
                      if (videoRef.current) {
                        await videoRef.current.setPositionAsync(0);
                      }
                      setVideoCompleted(false);
                      setIsVideoPlaying(true);
                      setVideoProgress(0);
                      setVideoCurrentTime(0);
                    }}
                  >
                    <View style={styles.muteIconContainer}>
                      <Feather name="rotate-ccw" size={28} color="#fff" />
                    </View>
                    <Text style={styles.muteText}>Tap to replay</Text>
                  </TouchableOpacity>
                )}

                {/* Play/Pause Button (center) - only show when paused and not loading and not completed */}
                {!isVideoPlaying && !videoLoading && !videoCompleted && !showMuteOverlay && (
                  <TouchableOpacity
                    style={styles.playButtonOverlay}
                    onPress={() => {
                      setIsVideoPlaying(true);
                      setVideoCompleted(false);
                    }}
                  >
                    <View style={styles.playButtonCircle}>
                      <Feather name="play" size={32} color="#fff" style={{ marginLeft: 4 }} />
                    </View>
                  </TouchableOpacity>
                )}

                {/* Video Controls Bar (bottom) */}
                <View style={styles.videoControlsBar}>
                  {/* Play/Pause Button */}
                  <TouchableOpacity
                    style={styles.videoControlButton}
                    onPress={() => {
                      if (videoCompleted) {
                        // Replay
                        if (videoRef.current) {
                          videoRef.current.setPositionAsync(0);
                        }
                        setVideoCompleted(false);
                        setIsVideoPlaying(true);
                        setVideoProgress(0);
                      } else {
                        setIsVideoPlaying(!isVideoPlaying);
                      }
                    }}
                  >
                    <Feather
                      name={videoCompleted ? "rotate-ccw" : (isVideoPlaying ? "pause" : "play")}
                      size={18}
                      color="#fff"
                    />
                  </TouchableOpacity>

                  {/* Current Time */}
                  <Text style={styles.videoTimeText}>
                    {Math.floor(videoCurrentTime / 60)}:{(videoCurrentTime % 60).toString().padStart(2, '0')}
                  </Text>

                  {/* Progress Bar */}
                  <View style={styles.videoProgressBar}>
                    <View style={[styles.videoProgressFill, { width: `${videoProgress * 100}%` }]} />
                  </View>

                  {/* Duration */}
                  <Text style={styles.videoTimeText}>
                    {Math.floor(videoDuration / 60)}:{(videoDuration % 60).toString().padStart(2, '0')}
                  </Text>

                  {/* Mute/Unmute Button */}
                  <TouchableOpacity
                    style={styles.videoControlButton}
                    onPress={() => {
                      setIsVideoMuted(!isVideoMuted);
                      setShowMuteOverlay(false);
                    }}
                  >
                    <Feather name={isVideoMuted ? "volume-x" : "volume-2"} size={18} color="#fff" />
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#222' }}>
                <Text style={{ color: '#fff', fontSize: 16 }}>No video found</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
        {/* Placeholder if no images or videos */}
        {!showImages && !showVideo && (
          <View style={styles.imageWrap}>
            <ExpoImage
              source={{ uri: 'https://via.placeholder.com/600x600.png?text=No+Media' }}
              style={styles.image}
              contentFit="cover"
              placeholder={IMAGE_PLACEHOLDER}
              transition={150}
            />
          </View>
        )}
        {/* Removed old carousel navigation and page counter - now using Instagram-style dots at bottom */}
      </View>
      {/* All content inside card box */}
      <View style={{ paddingHorizontal: 2 }}>
        <View style={styles.iconRow}>
          <TouchableOpacity
            onPress={async () => {
              const userId = userIdForLike;
              if (!userId) {
                console.warn('User not logged in - userId:', userId, 'user:', user, 'currentUser:', currentUser);
                return;
              }
              try {
                // OPTIMIZATION: Optimistic update - update UI immediately
                const wasLiked = likes.includes(userId);
                if (wasLiked) {
                  setLikes(prev => prev.filter(id => id !== userId));
                  setLikesCount((prev: number) => Math.max(0, prev - 1));
                  // Broadcast unlike to update all feed instances
                  feedEventEmitter.emitPostUpdated(post.id, { liked: false, likesCount: Math.max(0, (typeof likesCount === 'number' ? likesCount : Number(likesCount) || 0) - 1) });
                } else {
                  setLikes(prev => [...prev, userId]);
                  setLikesCount((prev: number) => prev + 1);
                  // Broadcast like to update all feed instances
                  feedEventEmitter.emitPostUpdated(post.id, { liked: true, likesCount: (typeof likesCount === 'number' ? likesCount : Number(likesCount) || 0) + 1 });
                }

                // Then update in background
                if (wasLiked) {
                  const res = await unlikePost(post.id, userId) as { success: boolean; error?: string };
                  if (!res.success) {
                    // Revert on error
                    setLikes(prev => [...prev, userId]);
                    setLikesCount((prev: number) => prev + 1);
                    console.error('Unlike error:', res.error);
                    // Re-broadcast revert
                    feedEventEmitter.emitPostUpdated(post.id, { liked: true, likesCount: (typeof likesCount === 'number' ? likesCount : Number(likesCount) || 0) + 1 });
                  }
                } else {
                  const res = await likePost(post.id, userId) as { success: boolean; error?: string };
                  if (!res.success) {
                    // Revert on error
                    setLikes(prev => prev.filter(id => id !== userId));
                    setLikesCount((prev: number) => Math.max(0, prev - 1));
                    console.error('Like error:', res.error);
                    // Re-broadcast revert
                    feedEventEmitter.emitPostUpdated(post.id, { liked: false, likesCount: Math.max(0, (typeof likesCount === 'number' ? likesCount : Number(likesCount) || 0) - 1) });
                  } else {
                    // Send notification to post owner
                    if (post.userId !== userId) {
                      await notificationService.notifyLike(post.userId, userId, post.id);
                    }
                  }
                }
              } catch (err) {
                // Revert on exception
                const wasLiked = !likes.includes(userId);
                if (wasLiked) {
                  setLikes(prev => [...prev, userId]);
                  setLikesCount((prev: number) => prev + 1);
                  feedEventEmitter.emitPostUpdated(post.id, { liked: true, likesCount: (typeof likesCount === 'number' ? likesCount : Number(likesCount) || 0) + 1 });
                } else {
                  setLikes(prev => prev.filter(id => id !== userId));
                  setLikesCount((prev: number) => Math.max(0, prev - 1));
                  feedEventEmitter.emitPostUpdated(post.id, { liked: false, likesCount: Math.max(0, (typeof likesCount === 'number' ? likesCount : Number(likesCount) || 0) - 1) });
                }
                console.error('Like/unlike exception:', err);
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
          <TouchableOpacity
            accessible
            accessibilityRole="button"
            accessibilityLabel="Open comments"
            onPress={() => setShowCommentsModal(true)}
            style={{ marginRight: 24 }}
          >
            <Feather name="message-circle" size={22} color={appColors.icon} />
          </TouchableOpacity>
          <TouchableOpacity
            style={{ marginRight: 24 }}
            onPress={async () => {
              try {
                const { Share } = await import('react-native');
                let shareMessage = `Check out this post`;
                if (post?.userName) {
                  shareMessage += ` by ${post.userName}`;
                }
                if (post?.location) {
                  shareMessage += ` at ${post.location}`;
                }
                if (post?.caption) {
                  shareMessage += `\n\n${post.caption}`;
                }
                await Share.share({
                  message: shareMessage,
                });
              } catch (error) {
                console.log('Share error:', error);
              }
            }}
          >
            <Feather name="send" size={22} color={appColors.accent} />
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          <SaveButton post={{ ...post, savedBy }} currentUser={currentUser} />
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

        {/* Hashtags Display */}
        {post?.hashtags && Array.isArray(post.hashtags) && post.hashtags.length > 0 && (
          <View style={styles.hashtags}>
            {post.hashtags.map((hashtag: string, idx: number) => (
              <TouchableOpacity
                key={`${hashtag}-${idx}`}
                style={styles.hashtag}
                onPress={() => {
                  // Navigate to hashtag search
                  router.push({
                    pathname: '/search',
                    params: { query: hashtag, type: 'hashtag' }
                  });
                }}
              >
                <Text style={styles.hashtagText}>#{hashtag}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Comments Preview */}
        <TouchableOpacity onPress={() => setShowCommentsModal(true)}>
          <Text style={[styles.commentPreview, { color: appColors.muted }]}>{`View all ${commentCount} comments`}</Text>
        </TouchableOpacity>
        {/* Remove the comment input box below like button */}
        {/* Time */}
        <Text style={styles.time}>{getTimeAgo(post?.createdAt)}</Text>
      </View>
      {/* Comments Modal */}
      <Modal
        visible={showCommentsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCommentsModal(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior='padding'
          keyboardVerticalOffset={0}
        >
          <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <TouchableOpacity
              style={{ flex: 1 }}
              activeOpacity={1}
              onPress={() => setShowCommentsModal(false)}
            />
            <View
              style={{
                backgroundColor: '#fff',
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                height: '90%',
                shadowColor: '#000',
                shadowOpacity: 0.1,
                shadowRadius: 12,
                elevation: 10,
              }}
            >
              {/* Swipe Handle */}
              <View
                style={{
                  alignItems: 'center',
                  paddingTop: 12,
                  paddingBottom: 8,
                  borderTopLeftRadius: 20,
                  borderTopRightRadius: 20,
                }}
                {...panResponder.panHandlers}
              >
                <View style={{ width: 40, height: 4, backgroundColor: '#ddd', borderRadius: 2 }} />
              </View>

              {/* Header */}
              <View style={{
                paddingHorizontal: 16,
                paddingBottom: 12,
                borderBottomWidth: 1,
                borderBottomColor: '#f0f0f0',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <Text style={{ fontWeight: '700', fontSize: 18, color: '#222' }}>Comments</Text>
                <TouchableOpacity
                  onPress={() => setShowCommentsModal(false)}
                  style={{ padding: 4 }}
                >
                  <Feather name="x" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              {/* Comments Section */}
              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }}>
                <CommentSection
                  postId={post.id}
                  postOwnerId={post.userId}
                  currentAvatar={user?.photoURL || "https://via.placeholder.com/200x200.png?text=Profile"}
                  currentUser={currentUser}
                  maxHeight={undefined}
                  showInput={true}
                  highlightedCommentId={highlightedCommentId}
                />
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function getTimeAgo(date: any) {
  if (!date) return "";
  let d;
  if (date && date.toDate) {
    d = date.toDate();
  } else if (typeof date === 'string' || typeof date === 'number') {
    d = new Date(date);
  } else {
    d = date;
  }
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  const days = Math.floor(diff / 86400);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(days / 365);
  return `${years}y ago`;
}

export default React.memo(PostCard, (prevProps, nextProps) => {
  // Memoization comparison - only re-render if these props change

  return (
    prevProps.post?.id === nextProps.post?.id &&
    prevProps.post?.likesCount === nextProps.post?.likesCount &&
    prevProps.post?.commentCount === nextProps.post?.commentCount &&
    prevProps.post?.savedBy?.length === nextProps.post?.savedBy?.length &&
    prevProps.currentUser?.uid === nextProps.currentUser?.uid
  );
});

