/**
 * Watch Live Screen - ZeegoCloud with Full Features
 * Features: Comments, Viewers, Map, Share, etc.
 */

import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { auth } from '../config/firebase';
import { logger } from '../utils/logger';
// ZeegoCloud imports
import { ZEEGOCLOUD_CONFIG } from '../config/zeegocloud';
import ZeegocloudStreamingService from '../services/implementations/ZeegocloudStreamingService';
import ZeegocloudLiveViewer from './_components/ZeegocloudLiveViewer';
import { addLiveComment, joinLiveStream, leaveLiveStream, subscribeToLiveComments } from '../lib/firebaseHelpers/live';

let MapView: any = null;
let Marker: any = null;
if (Platform.OS !== 'web') {
  const RNMaps = require('react-native-maps');
  MapView = RNMaps.default ?? RNMaps;
  Marker = RNMaps.Marker;
}

const { width, height } = Dimensions.get('window');
const DEFAULT_AVATAR_URL = 'https://via.placeholder.com/200x200.png?text=Profile';

// Utility functions
function getSafeCoordinate(coord: { latitude?: number; longitude?: number } | null, fallback = { latitude: 51.5074, longitude: -0.1278 }) {
  const lat = typeof coord?.latitude === 'number' && isFinite(coord.latitude) ? coord.latitude : fallback.latitude;
  const lon = typeof coord?.longitude === 'number' && isFinite(coord.longitude) ? coord.longitude : fallback.longitude;
  return { latitude: lat, longitude: lon };
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km.toFixed(1)}km`;
}

interface Comment {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  text: string;
  timestamp: any;
}

interface Viewer {
  id: string;
  name: string;
  avatar: string;
  location?: { latitude: number; longitude: number };
}

export default function WatchLiveScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();

  const streamIdParam = typeof params.streamId === 'string' ? params.streamId : undefined;
  const roomIdParam = typeof params.roomId === 'string'
    ? params.roomId
    : (typeof params.channelName === 'string' ? params.channelName : '');
  const titleParam = typeof params.title === 'string' ? params.title : 'Live Stream';

  const [effectiveRoomId, setEffectiveRoomId] = useState<string>(roomIdParam || '');
  const [effectiveTitle, setEffectiveTitle] = useState<string>(titleParam);
  
  const zeegocloudServiceRef = useRef<ZeegocloudStreamingService | null>(null);
  const commentsUnsubRef = useRef<null | (() => void)>(null);
  const [isJoined, setIsJoined] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  
  // User state
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // Location state
  const [location, setLocation] = useState<{latitude: number; longitude: number} | null>(null);
  const [broadcasterLocation, setBroadcasterLocation] = useState<{latitude: number; longitude: number} | null>(null);
  
  // Comments state
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  
  // Viewers state
  const [viewers, setViewers] = useState<Viewer[]>([]);
  const [viewerCount, setViewerCount] = useState(0);
  
  // UI state
  const [showComments, setShowComments] = useState(false);
  const [showViewers, setShowViewers] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Get current location
  useEffect(() => {
    const getLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({});
          setLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        }
      } catch (error) {
        logger.error('Error getting location:', error);
      }
    };
    getLocation();
  }, []);

  // Load user data
  useEffect(() => {
    const loadUser = async () => {
      const user = auth.currentUser;
      if (user) {
        setCurrentUser({ uid: user.uid, displayName: user.displayName || 'Anonymous', photoURL: user.photoURL || DEFAULT_AVATAR_URL });
      }
    };
    loadUser();
  }, []);

  // Auto-join stream
  useEffect(() => {
    if (effectiveRoomId && currentUser && !isJoined && !isJoining) {
      handleJoinStream();
    }
  }, [effectiveRoomId, currentUser]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      try {
        if (commentsUnsubRef.current) {
          commentsUnsubRef.current();
          commentsUnsubRef.current = null;
        }
      } catch {}
    };
  }, []);

  // Resolve roomId/title if only streamId is provided
  useEffect(() => {
    const resolve = async () => {
      try {
        if ((!effectiveRoomId || effectiveRoomId.length === 0) && streamIdParam) {
          const mod: { subscribeToLiveStream: (id: string, cb: (s: any) => void) => () => void } = await import('../lib/firebaseHelpers/live');
          const unsubscribe = mod.subscribeToLiveStream(streamIdParam, (s: any) => {
            const rid = typeof s?.roomId === 'string' && s.roomId
              ? s.roomId
              : (typeof s?.channelName === 'string' ? s.channelName : '');
            if (rid) setEffectiveRoomId(rid);
            if (typeof s?.title === 'string' && s.title) setEffectiveTitle(s.title);
          });
          // Give it a moment to fetch once, then cleanup.
          setTimeout(() => {
            try { unsubscribe(); } catch {}
          }, 6000);
        }
      } catch (e: any) {
        logger.error('Resolve live stream roomId failed:', e);
      }
    };
    resolve();
    // Only run once for initial params.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Join stream
  const handleJoinStream = async () => {
    if (!effectiveRoomId) {
      Alert.alert('Error', 'Invalid room ID');
      router.back();
      return;
    }

    try {
      setIsJoining(true);
      const service = ZeegocloudStreamingService.getInstance();
      const userId = currentUser?.uid || 'anonymous';
      const userName = currentUser?.displayName || 'Anonymous';
      
      const success = await service.initialize(userId, effectiveRoomId, userName, false);

      if (success) {
        zeegocloudServiceRef.current = service;
        setIsJoined(true);

        // Notify backend that user joined (best-effort)
        try {
          if (streamIdParam && userId) {
            const joined: any = await joinLiveStream(String(streamIdParam), String(userId));
            const vc = joined?.data?.viewerCount;
            if (typeof vc === 'number') setViewerCount(vc);
          }
        } catch (e: any) {
          logger.error('Join live stream (backend) failed:', e);
        }

        // Subscribe to comments (best-effort polling)
        try {
          if (streamIdParam) {
            if (commentsUnsubRef.current) {
              try { commentsUnsubRef.current(); } catch {}
              commentsUnsubRef.current = null;
            }

            const unsub = subscribeToLiveComments(String(streamIdParam), (raw: any[]) => {
              const items = Array.isArray(raw) ? raw : [];
              const mapped: Comment[] = items
                .map((c: any) => ({
                  id: c?._id ? String(c._id) : String(c?.id || c?.createdAt || Date.now()),
                  userId: String(c?.userId || ''),
                  userName: c?.userName || 'Anonymous',
                  userAvatar: c?.userAvatar || DEFAULT_AVATAR_URL,
                  text: c?.text || '',
                  timestamp: c?.createdAt ? new Date(c.createdAt).getTime() : Date.now(),
                }))
                .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
              setComments(mapped);
            });

            commentsUnsubRef.current = () => {
              try { unsub(); } catch {}
            };
          }
        } catch (e: any) {
          logger.error('Subscribe to live comments failed:', e);
        }

        logger.info('Joined stream:', effectiveRoomId);
      } else {
        Alert.alert('Error', 'Failed to join stream');
        router.back();
      }
    } catch (error) {
      logger.error('Join stream error:', error);
      Alert.alert('Error', 'Failed to join stream');
      router.back();
    } finally {
      setIsJoining(false);
    }
  };

  // Leave stream
  const handleLeaveStream = async () => {
    try {
      try {
        if (commentsUnsubRef.current) {
          commentsUnsubRef.current();
          commentsUnsubRef.current = null;
        }
      } catch {}

      if (zeegocloudServiceRef.current) {
        await zeegocloudServiceRef.current.disconnect();
      }

      // Notify backend that user left (best-effort)
      try {
        const userId = currentUser?.uid;
        if (streamIdParam && userId) {
          const left: any = await leaveLiveStream(String(streamIdParam), String(userId));
          const vc = left?.data?.viewerCount;
          if (typeof vc === 'number') setViewerCount(vc);
        }
      } catch (e: any) {
        logger.error('Leave live stream (backend) failed:', e);
      }

      router.back();
    } catch (error) {
      logger.error('Leave stream error:', error);
      router.back();
    }
  };

  // Toggle mute
  const toggleMute = () => setIsMuted(!isMuted);

  // Share stream
  const handleShare = async () => {
    try {
      const shareUrl = `https://yourapp.com/watch-live?roomId=${encodeURIComponent(effectiveRoomId)}`;
      await Share.share({
        message: `Watch this live stream: ${effectiveTitle}\n${shareUrl}`,
        url: shareUrl,
      });
    } catch (error) {
      logger.error('Share error:', error);
    }
  };

  // Send comment
  const handleSendComment = async () => {
    if (!newComment.trim()) return;

    const comment: Comment = {
      id: Date.now().toString(),
      userId: currentUser?.uid || 'anonymous',
      userName: currentUser?.displayName || 'Anonymous',
      userAvatar: currentUser?.photoURL || DEFAULT_AVATAR_URL,
      text: newComment.trim(),
      timestamp: Date.now(),
    };

    setComments([...comments, comment]);
    setNewComment('');

    // Send to backend (best-effort). Polling will refresh canonical list.
    try {
      if (streamIdParam) {
        await addLiveComment(String(streamIdParam), {
          userId: String(currentUser?.uid || 'anonymous'),
          text: comment.text,
          userName: comment.userName,
          userAvatar: comment.userAvatar,
        });
      }
    } catch (e: any) {
      logger.error('Add live comment failed:', e);
    }
  };

  // Render comment item
  const renderComment = ({ item }: { item: Comment }) => (
    <View style={styles.commentItem}>
      <Image source={{ uri: item.userAvatar }} style={styles.commentAvatar} />
      <View style={styles.commentContent}>
        <Text style={styles.commentUser}>{item.userName}</Text>
        <Text style={styles.commentText}>{item.text}</Text>
      </View>
    </View>
  );

  // Render viewer item
  const renderViewer = ({ item }: { item: Viewer }) => {
    let distance = '';
    if (location && item.location) {
      const km = calculateDistance(location.latitude, location.longitude, item.location.latitude, item.location.longitude);
      distance = formatDistance(km);
    }

    return (
      <View style={styles.viewerItem}>
        <Image source={{ uri: item.avatar }} style={styles.viewerAvatar} />
        <View style={styles.viewerInfo}>
          <Text style={styles.viewerName}>{item.name}</Text>
          {distance && <Text style={styles.viewerDistance}>{distance} away</Text>}
        </View>
      </View>
    );
  };

  // Loading state
  if (isJoining) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={styles.loadingText}>Joining stream...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Main UI
  return (
    <SafeAreaView style={styles.container}>
      {/* ZeegoCloud Video Component */}
      <View style={styles.videoContainer}>
        <ZeegocloudLiveViewer
          roomID={effectiveRoomId}
          userID={currentUser?.uid || 'anonymous'}
          userName={currentUser?.displayName || 'Anonymous'}
          onLeave={handleLeaveStream}
        />
      </View>

      {/* Overlay UI */}
      <View style={styles.overlay}>
        {/* Top Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={handleLeaveStream} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>

          <View style={styles.streamInfo}>
            <View style={styles.liveIndicator}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
            <Text style={styles.streamTitle} numberOfLines={1}>{effectiveTitle}</Text>
          </View>

          <View style={styles.topRight}>
            <TouchableOpacity style={styles.iconButton} onPress={() => {}}>
              <Ionicons name="people" size={20} color="#fff" />
              <Text style={styles.iconButtonText}>{viewerCount}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.iconButton} onPress={handleShare}>
              <Ionicons name="share-social" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom Controls */}
        <View style={[styles.bottomBar, { paddingBottom: 16 + (insets?.bottom || 0) }]}>
          <TouchableOpacity style={styles.controlButton} onPress={toggleMute}>
            <Ionicons name={isMuted ? "volume-mute" : "volume-high"} size={24} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.controlButton} onPress={() => setShowComments(!showComments)}>
            <Ionicons name="chatbubble" size={24} color="#fff" />
            {comments.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{comments.length}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.controlButton} onPress={() => setShowViewers(!showViewers)}>
            <Ionicons name="people" size={24} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.controlButton} onPress={() => setShowMap(!showMap)}>
            <Ionicons name="map" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Comments Panel */}
      {showComments && (
        <View style={styles.commentsPanel}>
          <View style={styles.commentsPanelHeader}>
            <Text style={styles.commentsPanelTitle}>Comments ({comments.length})</Text>
            <TouchableOpacity onPress={() => setShowComments(false)}>
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>

          <FlatList
            data={comments}
            renderItem={renderComment}
            keyExtractor={(item) => item.id}
            style={styles.commentsList}
          />

          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={styles.commentInput}>
              <TextInput
                style={styles.commentTextInput}
                placeholder="Add a comment..."
                value={newComment}
                onChangeText={setNewComment}
              />
              <TouchableOpacity onPress={handleSendComment} style={styles.sendButton}>
                <Ionicons name="send" size={20} color="#667eea" />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      )}

      {/* Viewers Panel */}
      {showViewers && (
        <View style={styles.viewersPanel}>
          <View style={styles.viewersPanelHeader}>
            <Text style={styles.viewersPanelTitle}>Viewers ({viewers.length})</Text>
            <TouchableOpacity onPress={() => setShowViewers(false)}>
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>

          <FlatList
            data={viewers}
            renderItem={renderViewer}
            keyExtractor={(item) => item.id}
            style={styles.viewersList}
          />
        </View>
      )}

      {/* Map Panel */}
      {showMap && broadcasterLocation && (
        <View style={styles.mapPanel}>
          <View style={styles.mapPanelHeader}>
            <Text style={styles.mapPanelTitle}>Broadcaster Location</Text>
            <TouchableOpacity onPress={() => setShowMap(false)}>
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>

          {Platform.OS !== 'web' && MapView ? (
            <MapView
              style={styles.map}
              initialRegion={{
                latitude: broadcasterLocation.latitude,
                longitude: broadcasterLocation.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
            >
              <Marker coordinate={broadcasterLocation} title="Broadcaster" />
              {location && <Marker coordinate={location} title="You" pinColor="blue" />}
            </MapView>
          ) : (
            <View style={[styles.map, { alignItems: 'center', justifyContent: 'center' }]}>
              <Text style={{ color: '#666' }}>Map is not available on web preview.</Text>
            </View>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  loadingText: { marginTop: 16, fontSize: 16, color: '#fff' },
  videoContainer: { flex: 1, backgroundColor: '#000' },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'box-none' },
  topBar: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: 'rgba(0,0,0,0.5)' },
  backButton: { padding: 8, marginRight: 12 },
  streamInfo: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  liveIndicator: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e74c3c', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginRight: 12 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff', marginRight: 6 },
  liveText: { fontSize: 14, fontWeight: 'bold', color: '#fff' },
  streamTitle: { flex: 1, fontSize: 16, fontWeight: '600', color: '#fff' },
  topRight: { flexDirection: 'row', gap: 8 },
  iconButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  iconButtonText: { fontSize: 14, color: '#fff', marginLeft: 4, fontWeight: 'bold' },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16, backgroundColor: 'transparent' },
  controlButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#e74c3c', borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontSize: 10, color: '#fff', fontWeight: 'bold' },
  commentsPanel: { position: 'absolute', bottom: 0, left: 0, right: 0, height: height * 0.5, backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  commentsPanelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  commentsPanelTitle: { fontSize: 18, fontWeight: 'bold', color: '#000' },
  commentsList: { flex: 1 },
  commentItem: { flexDirection: 'row', padding: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  commentAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
  commentContent: { flex: 1 },
  commentUser: { fontSize: 14, fontWeight: '600', color: '#000', marginBottom: 4 },
  commentText: { fontSize: 14, color: '#333' },
  commentInput: { flexDirection: 'row', alignItems: 'center', padding: 12, borderTopWidth: 1, borderTopColor: '#eee' },
  commentTextInput: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, marginRight: 8 },
  sendButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f0f0f0', alignItems: 'center', justifyContent: 'center' },
  viewersPanel: { position: 'absolute', bottom: 0, left: 0, right: 0, height: height * 0.5, backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  viewersPanelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  viewersPanelTitle: { fontSize: 18, fontWeight: 'bold', color: '#000' },
  viewersList: { flex: 1 },
  viewerItem: { flexDirection: 'row', padding: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  viewerAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
  viewerInfo: { flex: 1, justifyContent: 'center' },
  viewerName: { fontSize: 14, fontWeight: '600', color: '#000' },
  viewerDistance: { fontSize: 12, color: '#666', marginTop: 2 },
  mapPanel: { position: 'absolute', bottom: 0, left: 0, right: 0, height: height * 0.5, backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  mapPanelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  mapPanelTitle: { fontSize: 18, fontWeight: 'bold', color: '#000' },
  map: { flex: 1 },
});

