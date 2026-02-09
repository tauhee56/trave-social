import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import type { Video as VideoType } from 'expo-av';
import { ResizeMode, Video } from 'expo-av';
import { Image as ExpoImage } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Dimensions, KeyboardAvoidingView, Modal, PanResponder, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { feedEventEmitter } from '../../lib/feedEventEmitter';
import { getLocationVisitCount, likePost, unlikePost } from "../../lib/firebaseHelpers";
import { getOptimizedImageUrl } from "../../lib/imageHelpers";
import { sharePost } from '../../lib/postShare';
import { notificationService } from '../../lib/notificationService';
import { CommentSection } from "./CommentSection";
import SaveButton from "./SaveButton";
import { useUser } from "./UserContext";
import VerifiedBadge from "./VerifiedBadge";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const isSmallDevice = SCREEN_WIDTH < 375;
const IMAGE_PLACEHOLDER = 'L5H2EC=PM+yV0g-mq.wG9c010J}I';

const MIN_MEDIA_RATIO = 4 / 5;
const MAX_MEDIA_RATIO = 1.91;

// Props type for PostCard
interface PostCardProps {
  post: any;
  currentUser: any;
  showMenu?: boolean;
  highlightedCommentId?: string;
  highlightedCommentText?: string;
  showCommentsModal?: boolean;
  onCloseCommentsModal?: () => void;
  mirror?: boolean;
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
  topCenter: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  topRight: {
    width: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
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
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationInfo: {
    flexDirection: 'column',
    flex: 1,
    minWidth: 0,
  },
  locationName: {
    fontWeight: 'bold',
    fontSize: 18,
    color: '#111',
    marginBottom: 0,
    flexShrink: 1,
    letterSpacing: 0.1,
    textAlign: 'right',
  },
  visits: {
    fontSize: 14,
    color: '#777',
    fontWeight: '500',
    marginTop: 2,
    letterSpacing: 0.1,
    textAlign: 'right',
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#eee',
    borderWidth: 1,
    borderColor: '#ddd',
    overflow: 'hidden',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
  },
  metaRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  metaTextWrap: {
    alignItems: 'flex-end',
  },
  metaName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
  },
  metaTime: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '500',
    color: '#888',
  },
  captionWrap: {
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  caption: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    color: '#111',
  },
  captionMore: {
    marginTop: 2,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    color: '#777',
  },
  iconRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 3,
    paddingBottom: 7,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    minHeight: 24,
  },
  actionCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111',
  },
  commentCtaRow: {
    paddingHorizontal: 16,
    paddingBottom: 5,
  },
  commentCtaBox: {
    borderRadius: 5,
    backgroundColor: '#f2f2f2',
    paddingVertical: 9,
    paddingHorizontal: 16,
    alignSelf: 'stretch',
  },
  commentCtaText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    textAlign: 'right',
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
    borderRadius: 18,
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
    width: '100%',
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: "contain",
    alignSelf: 'center',
  },
  likes: {
    fontWeight: "700",
    fontSize: 15,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
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
  mediaModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaModalClose: {
    position: 'absolute',
    top: 18,
    right: 18,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 60,
  },
  mediaModalMedia: {
    width: '100%',
    height: '100%',
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

function PostCard({ post, currentUser, showMenu = true, highlightedCommentId, highlightedCommentText, mirror = false }: PostCardProps) {
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
          setCommentCount((prev: number) => {
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
  const [currentUserName, setCurrentUserName] = useState<string>('User');
  useEffect(() => {
    // Use pre-populated user data from backend if available
    if (post?.userId && typeof post.userId === 'object') {
      // Backend populated userId with user object
      const avatar = post.userId?.avatar || post.userId?.photoURL || post.userId?.profilePicture;
      const name =
        post.userId?.name ||
        post.userId?.displayName ||
        post.userId?.username ||
        post.userId?.userName ||
        post?.userName ||
        post?.username;
      console.log('[PostCard] Using populated user avatar:', avatar);
      if (avatar) {
        setCurrentAvatar(avatar);
      }
      if (name) {
        setCurrentUserName(String(name));
        return;
      }
    }

    // If userId is a string, try to get avatar from the post object directly
    if (typeof post?.userId === 'string' && post?.userAvatar) {
      console.log('[PostCard] Using post.userAvatar:', post.userAvatar);
      setCurrentAvatar(post.userAvatar);
    }

    const directName =
      (post as any)?.userName ||
      (post as any)?.username ||
      (post as any)?.user?.name ||
      (post as any)?.user?.displayName ||
      (post as any)?.user?.username;
    if (directName) {
      setCurrentUserName(String(directName));
      return;
    }

    // Fallback: fetch avatar if userId is just a string
    async function fetchAvatar() {
      if (post?.userId && typeof post.userId === 'string') {
        try {
          console.log('[PostCard] Fetching avatar for userId:', post.userId);
          const { getUserProfile } = await import('../../lib/firebaseHelpers/user');
          const res = await getUserProfile(post.userId);
          if (res && res.success && res.data) {
            if (res.data.avatar) {
              console.log('[PostCard] Fetched avatar:', res.data.avatar);
              setCurrentAvatar(res.data.avatar);
            }
            const fetchedName = res.data.name || res.data.username;
            if (fetchedName) {
              setCurrentUserName(String(fetchedName));
            }
          }
        } catch (err) {
          console.warn('[PostCard] Error fetching avatar:', err);
          setCurrentAvatar("https://via.placeholder.com/200x200.png?text=Profile");
        }
      }
    }
    fetchAvatar();
  }, [post?.userId, post?.userAvatar, post?.userName, (post as any)?.username]);

  // Helper function to check if URL is a video
  const isVideoUrl = (url: string) => {
    if (!url) return false;
    const videoExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v'];
    const lowerUrl = url.toLowerCase();
    return videoExtensions.some(ext => lowerUrl.includes(ext));
  };

  const rawMedia: string[] = Array.isArray((post as any)?.mediaUrls) && (post as any).mediaUrls.length > 0
    ? (post as any).mediaUrls.filter(Boolean)
    : (post?.imageUrls && post.imageUrls.length > 0
      ? post.imageUrls.filter(Boolean)
      : (post?.imageUrl ? [post.imageUrl] : []));

  const images: string[] = rawMedia.filter((url: string) => !isVideoUrl(url));
  const mediaVideos: string[] = rawMedia.filter((url: string) => isVideoUrl(url));

  const rawVideos: string[] = post?.videoUrls && post.videoUrls.length > 0
    ? post.videoUrls.filter(Boolean)
    : (post?.videoUrl ? [post.videoUrl] : []);

  const videos: string[] = [...mediaVideos, ...rawVideos].filter(Boolean);

  // If images exist, show only image carousel. If no images, show only first video. If neither, show placeholder.
  let showImages = images.length > 0;
  let showVideo = !showImages && videos.length > 0;
  const [mediaIndex, setMediaIndex] = useState(0);
  const [modalMediaIndex, setModalMediaIndex] = useState(0);
  const currentImageUrl = showImages ? images[mediaIndex] : undefined;
  const currentVideoUrl = showVideo ? videos[0] : undefined;
  const currentMediaUrl = currentImageUrl || currentVideoUrl;
  const isCurrentMediaVideo = typeof currentVideoUrl === 'string' && !!currentVideoUrl;
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

  const [showMediaModal, setShowMediaModal] = useState(false);
  const modalTapLockRef = useRef(false);
  const modalMediaIndexRef = useRef(0);

  const closeMediaModal = useCallback(() => {
    setShowMediaModal(false);
    requestAnimationFrame(() => {
      setMediaIndex(modalMediaIndex);
    });
  }, [modalMediaIndex]);

  const openMediaModal = useCallback(() => {
    setModalMediaIndex(mediaIndex);
    setShowMediaModal(true);
  }, [mediaIndex]);

  useEffect(() => {
    if (!showMediaModal) return;
    if (!showImages || images.length === 0) return;

    const getUri = (idx: number) => {
      const raw = images[idx];
      if (typeof raw !== 'string' || !raw) return null;
      return getOptimizedImageUrl(raw, 'detail');
    };

    const all = images.length <= 12;
    const window = 3;
    const candidates: (string | null)[] = [];
    if (all) {
      for (let i = 0; i < images.length; i++) candidates.push(getUri(i));
    } else {
      for (let d = -window; d <= window; d++) candidates.push(getUri(modalMediaIndex + d));
    }

    const uris = candidates.filter(Boolean) as string[];

    if (uris.length > 0) {
      ExpoImage.prefetch(uris);
    }
  }, [showMediaModal, showImages, images, modalMediaIndex]);

  useEffect(() => {
    modalMediaIndexRef.current = modalMediaIndex;
  }, [modalMediaIndex]);

  const mediaRatioCacheRef = useRef<Map<string, number>>(new Map());
  const [mediaHeight, setMediaHeight] = useState<number>(SCREEN_WIDTH);

  const clampMediaRatio = (ratio: number) => {
    if (!Number.isFinite(ratio) || ratio <= 0) return 1;
    return Math.min(MAX_MEDIA_RATIO, Math.max(MIN_MEDIA_RATIO, ratio));
  };

  const setHeightFromRatio = (ratio: number) => {
    const clamped = clampMediaRatio(ratio);
    const nextHeight = SCREEN_WIDTH / clamped;
    setMediaHeight(nextHeight);
  };

  // Update ref when state changes
  useEffect(() => {
    mediaIndexRef.current = mediaIndex;
  }, [mediaIndex]);

  useEffect(() => {
    if (showImages && images.length > 0 && mediaIndex >= images.length) {
      setMediaIndex(0);
    }
  }, [showImages, images.length, mediaIndex]);

  useEffect(() => {
    const currentUrl = currentImageUrl || currentVideoUrl;
    if (typeof currentUrl === 'string' && currentUrl) {
      const cached = mediaRatioCacheRef.current.get(currentUrl);
      if (typeof cached === 'number') {
        setHeightFromRatio(cached);
      } else {
        setHeightFromRatio(1);
      }
    } else {
      setHeightFromRatio(1);
    }
  }, [currentImageUrl, currentVideoUrl]);

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

  const modalPanResponder = React.useMemo(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 12 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
      },
      onPanResponderTerminationRequest: () => false,
      onPanResponderRelease: (_, gestureState) => {
        const currentIndex = modalMediaIndexRef.current;
        const totalImages = images.length;

        if (gestureState.dx > 35 && currentIndex > 0) {
          setModalMediaIndex(() => {
            const next = Math.max(0, currentIndex - 1);
            modalMediaIndexRef.current = next;
            return next;
          });
        } else if (gestureState.dx < -35 && currentIndex < totalImages - 1) {
          setModalMediaIndex(() => {
            const next = Math.min(totalImages - 1, currentIndex + 1);
            modalMediaIndexRef.current = next;
            return next;
          });
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

  const postUserName = currentUserName;

  const postTimeText = getTimeAgo(post?.createdAt);

  const [isCaptionExpanded, setIsCaptionExpanded] = useState(false);

  const captionText = (() => {
    let caption = '';
    if (typeof post?.caption === 'string' || typeof post?.caption === 'number') {
      caption = String(post?.caption);
    } else if (Array.isArray(post?.caption) || typeof post?.caption === 'object') {
      caption = JSON.stringify(post?.caption);
    }
    return caption;
  })();

  const shouldShowMore = !isCaptionExpanded && captionText.trim().length > 110;

  return (
    <View style={{ flex: 1, backgroundColor: appColors.background }}>
      <View style={[styles.card, { backgroundColor: appColors.background }]}>
        {/* Top header: centered location + visits, verified badge on right */}
        <View style={styles.topRow}>
          <View style={{ width: 44 }} />
          <TouchableOpacity
            style={styles.topCenter}
            activeOpacity={0.7}
            onPress={() => {
              const locationToUse = post?.locationData?.name || post?.locationName || post?.location;
              const addressToUse = post?.locationData?.address || locationToUse;

              if (locationToUse) {
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
                  router.push({
                    pathname: `/location/[placeId]`,
                    params: {
                      placeId: 'custom',
                      locationName: locationToUse,
                      locationAddress: addressToUse
                    }
                  } as any);
                }
              }
            }}
            accessibilityRole="button"
            accessibilityLabel="Open location"
          >
            <Text style={styles.locationName} numberOfLines={1} ellipsizeMode="tail">
              {post?.locationData?.name || post?.locationName || post?.location || 'Unknown Location'}
            </Text>
            <Text style={styles.visits}>{visitCount.toLocaleString()} Visits</Text>
          </TouchableOpacity>
          <View style={styles.topRight}>
            {post?.locationData?.verified ? (
              <View style={styles.verifiedBadgeBox}>
                <VerifiedBadge size={18} color="#111" />
              </View>
            ) : (
              <View style={styles.verifiedBadgeBox}>
                <Feather name="map-pin" size={18} color="#111" />
              </View>
            )}
          </View>
        </View>
        {/* Media content: Image/Video */}
        {/* Image carousel if images exist */}
        {showImages && (
          <View style={[styles.imageWrap, { height: mediaHeight }]} {...carouselPanResponder.panHandlers}>
            <ExpoImage
              source={{ uri: getOptimizedImageUrl(currentImageUrl || 'https://via.placeholder.com/600x600.png?text=No+Image', 'feed') }}
              style={styles.image}
              contentFit="cover"
              placeholder={IMAGE_PLACEHOLDER}
              transition={0}
              onLoad={(e: any) => {
                const w = e?.source?.width;
                const h = e?.source?.height;
                if (typeof w === 'number' && typeof h === 'number' && h > 0) {
                  const rawUrl = currentImageUrl;
                  if (typeof rawUrl === 'string' && rawUrl) {
                    const ratio = w / h;
                    mediaRatioCacheRef.current.set(rawUrl, ratio);
                    setHeightFromRatio(ratio);
                  }
                }
              }}
            />
            {images.length > 1 && (
              <View
                style={{
                  position: 'absolute',
                  top: 14,
                  right: 14,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 999,
                  backgroundColor: 'rgba(0,0,0,0.55)',
                  zIndex: 12,
                }}
              >
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>
                  {mediaIndex + 1}/{images.length}
                </Text>
              </View>
            )}
            {/* Left/Right tap areas for navigation */}
            {images.length > 1 && (
              <>
                <TouchableOpacity
                  style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '30%', zIndex: 5 }}
                  onPress={() => {
                    setMediaIndex(i => Math.max(0, i - 1));
                  }}
                  activeOpacity={1}
                />
                <TouchableOpacity
                  style={{ position: 'absolute', left: '30%', top: 0, bottom: 0, width: '40%', zIndex: 6 }}
                  onPress={() => {
                    if (currentMediaUrl) openMediaModal();
                  }}
                  activeOpacity={1}
                />
                <TouchableOpacity
                  style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '30%', zIndex: 5 }}
                  onPress={() => {
                    setMediaIndex(i => Math.min(images.length - 1, i + 1));
                  }}
                  activeOpacity={1}
                />
              </>
            )}
            {images.length === 1 && (
              <TouchableOpacity
                style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, zIndex: 6 }}
                onPress={() => {
                  if (currentMediaUrl) openMediaModal();
                }}
                activeOpacity={1}
              />
            )}
          </View>
        )}
        {/* Video if no images and video exists */}
        {showVideo && (
          <TouchableOpacity
            style={[styles.imageWrap, { height: mediaHeight }]}
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
                    const w = status?.naturalSize?.width;
                    const h = status?.naturalSize?.height;
                    if (typeof w === 'number' && typeof h === 'number' && h > 0) {
                      const ratio = w / h;
                      const rawUrl = videos[0];
                      if (typeof rawUrl === 'string' && rawUrl) {
                        mediaRatioCacheRef.current.set(rawUrl, ratio);
                        setHeightFromRatio(ratio);
                      }
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
      <View style={{ paddingHorizontal: 0 }}>
        <View style={styles.metaRow}>
          <View style={{ flex: 1 }} />
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              if (post?.userId) {
                const uid = typeof post.userId === 'string' ? post.userId : post.userId?._id || post.userId?.uid;
                if (uid) {
                  router.push({
                    pathname: '/(tabs)/profile',
                    params: { user: uid }
                  } as any);
                }
              }
            }}
          >
            <View style={styles.metaRight}>
              <View style={styles.metaTextWrap}>
                <Text style={styles.metaName} numberOfLines={1}>{postUserName}</Text>
                <Text style={styles.metaTime}>{postTimeText}</Text>
              </View>
              <ExpoImage
                source={{ uri: currentAvatar }}
                style={styles.avatar}
                contentFit="cover"
                placeholder={IMAGE_PLACEHOLDER}
                transition={150}
              />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.captionWrap}>
          <Text style={[styles.caption, { color: appColors.text }]} numberOfLines={isCaptionExpanded ? undefined : 2}>
            {captionText}
          </Text>
          {shouldShowMore && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setIsCaptionExpanded(true)}
              accessibilityRole="button"
              accessibilityLabel="Expand caption"
            >
              <Text style={styles.captionMore}>...more</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.commentCtaRow}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setShowCommentsModal(true)}
          >
            <View style={styles.commentCtaBox}>
              <Text style={styles.commentCtaText}>Write a comment</Text>
            </View>
          </TouchableOpacity>
        </View>

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
            style={styles.actionItem}
          >
            {liked ? (
              <MaterialCommunityIcons name="heart" size={24} color={appColors.like} />
            ) : (
              <MaterialCommunityIcons name="heart-outline" size={24} color={appColors.icon} />
            )}
            <Text style={styles.actionCount}>{typeof likesCount === 'number' ? String(likesCount) : String(likesCount || '')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessible
            accessibilityRole="button"
            accessibilityLabel="Open comments"
            onPress={() => setShowCommentsModal(true)}
            style={styles.actionItem}
          >
            <Feather name="message-circle" size={22} color={appColors.icon} />
            <Text style={styles.actionCount}>{String(commentCount || 0)}</Text>
          </TouchableOpacity>

          <View style={{ minWidth: 28, alignItems: 'center', justifyContent: 'center' }}>
            <SaveButton post={{ ...post, savedBy }} currentUser={currentUser} />
          </View>

          <TouchableOpacity
            onPress={async () => {
              try {
                await sharePost(post);
              } catch (error) {
                console.log('Share error:', error);
              }
            }}
            accessibilityRole="button"
            accessibilityLabel="Share post"
            style={{ minWidth: 28, alignItems: 'center', justifyContent: 'center' }}
          >
            <Feather name="send" size={22} color={appColors.icon} />
          </TouchableOpacity>
        </View>
      </View>
      {/* Comments Modal */}
      <Modal
        visible={showCommentsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCommentsModal(false)}
      >
        {Platform.OS === 'ios' ? (
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={'padding'}
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
                <View style={{ flex: 1 }}>
                  <CommentSection
                    postId={post.id}
                    postOwnerId={post.userId}
                    currentAvatar={user?.photoURL || "https://via.placeholder.com/200x200.png?text=Profile"}
                    currentUser={currentUser}
                    maxHeight={undefined}
                    showInput={true}
                    highlightedCommentId={highlightedCommentId}
                  />
                </View>
              </View>
            </View>
          </KeyboardAvoidingView>
        ) : (
          <View style={{ flex: 1 }}>
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
                <View style={{ flex: 1 }}>
                  <CommentSection
                    postId={post.id}
                    postOwnerId={post.userId}
                    currentAvatar={user?.photoURL || "https://via.placeholder.com/200x200.png?text=Profile"}
                    currentUser={currentUser}
                    maxHeight={undefined}
                    showInput={true}
                    highlightedCommentId={highlightedCommentId}
                  />
                </View>
              </View>
            </View>
          </View>
        )}
      </Modal>

      <Modal
        visible={showMediaModal}
        animationType="none"
        transparent={true}
        presentationStyle="overFullScreen"
        hardwareAccelerated={true}
        statusBarTranslucent={true}
        onRequestClose={closeMediaModal}
      >
        <View style={styles.mediaModalBackdrop}>
          <TouchableOpacity
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            activeOpacity={1}
            onPress={closeMediaModal}
          />

          {showImages && images.length > 1 && (
            <View
              style={{
                position: 'absolute',
                top: 18,
                left: 18,
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 999,
                backgroundColor: 'rgba(0,0,0,0.55)',
                zIndex: 21,
              }}
            >
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>
                {modalMediaIndex + 1}/{images.length}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.mediaModalClose}
            onPress={closeMediaModal}
            accessibilityRole="button"
            accessibilityLabel="Close media"
          >
            <Feather name="x" size={22} color="#fff" />
          </TouchableOpacity>

          {showImages && images.length > 0 ? (
            <>
              <View style={styles.mediaModalMedia} {...modalPanResponder.panHandlers}>
                <ExpoImage
                  source={{
                    uri: getOptimizedImageUrl(
                      images[modalMediaIndex] || images[0] || currentMediaUrl || 'https://via.placeholder.com/600x600.png?text=No+Image',
                      'detail'
                    )
                  }}
                  recyclingKey={String(modalMediaIndex)}
                  style={styles.mediaModalMedia}
                  contentFit="contain"
                  placeholder={IMAGE_PLACEHOLDER}
                  cachePolicy="memory-disk"
                  priority="high"
                  transition={0}
                />
              </View>
              {images.length > 1 && (
                <>
                  <TouchableOpacity
                    style={{ position: 'absolute', left: 0, top: 80, bottom: 0, width: '30%', zIndex: 10 }}
                    onPress={() => {
                      if (modalTapLockRef.current) return;
                      modalTapLockRef.current = true;
                      setModalMediaIndex(i => {
                        const next = Math.max(0, i - 1);
                        modalMediaIndexRef.current = next;
                        return next;
                      });
                      setTimeout(() => {
                        modalTapLockRef.current = false;
                      }, 120);
                    }}
                    activeOpacity={1}
                  />
                  <TouchableOpacity
                    style={{ position: 'absolute', right: 0, top: 80, bottom: 0, width: '30%', zIndex: 10 }}
                    onPress={() => {
                      if (modalTapLockRef.current) return;
                      modalTapLockRef.current = true;
                      setModalMediaIndex(i => {
                        const next = Math.min(images.length - 1, i + 1);
                        modalMediaIndexRef.current = next;
                        return next;
                      });
                      setTimeout(() => {
                        modalTapLockRef.current = false;
                      }, 120);
                    }}
                    activeOpacity={1}
                  />
                </>
              )}
            </>
          ) : currentMediaUrl ? (
            isCurrentMediaVideo ? (
              <Video
                source={{ uri: currentMediaUrl }}
                style={styles.mediaModalMedia}
                resizeMode={ResizeMode.CONTAIN}
                shouldPlay={true}
                useNativeControls={true}
                isLooping={true}
              />
            ) : (
              <ExpoImage
                source={{ uri: getOptimizedImageUrl(currentMediaUrl, 'detail') }}
                style={styles.mediaModalMedia}
                contentFit="contain"
                placeholder={IMAGE_PLACEHOLDER}
                transition={0}
              />
            )
          ) : null}
        </View>
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

