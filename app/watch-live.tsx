import { Ionicons } from '@expo/vector-icons';
import { Camera } from 'expo-camera';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { addDoc, collection, doc, getDoc, onSnapshot, orderBy, query, serverTimestamp } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Dimensions, FlatList, Image, KeyboardAvoidingView, PermissionsAndroid, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import MapView, { Marker } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
// @ts-ignore
import { AGORA_CONFIG, getAgoraToken } from '../config/agora';
import { db } from '../config/firebase';
import { getCurrentUser, joinLiveStream, leaveLiveStream } from '../lib/firebaseHelpers';

const { width, height } = Dimensions.get('window');
const DEFAULT_AVATAR_URL = 'https://firebasestorage.googleapis.com/v0/b/travel-app-3da72.firebasestorage.app/o/default%2Fdefault-pic.jpg?alt=media&token=7177f487-a345-4e45-9a56-732f03dbf65d';

// Utility: sanitize coordinates for MapView/Marker
function getSafeCoordinate(coord: { latitude?: number; longitude?: number } | null, fallback = { latitude: 51.5074, longitude: -0.1278 }) {
  const lat = typeof coord?.latitude === 'number' && isFinite(coord.latitude) ? coord.latitude : fallback.latitude;
  const lon = typeof coord?.longitude === 'number' && isFinite(coord.longitude) ? coord.longitude : fallback.longitude;
  return { latitude: lat, longitude: lon };
}

// Calculate distance between two coordinates (in km)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Format distance for display
function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)}m`;
  }
  return `${km.toFixed(1)}km`;
}

// Import Agora SDK
let RtcEngine: any = null;
let RtcSurfaceView: any = null;
let ChannelProfileType: any = null;
let ClientRoleType: any = null;
let AGORA_AVAILABLE = false;

try {
  const AgoraSDK = require('react-native-agora');
  RtcEngine = AgoraSDK.default?.createAgoraRtcEngine || AgoraSDK.createAgoraRtcEngine;
  RtcSurfaceView = AgoraSDK.RtcSurfaceView;
  ChannelProfileType = AgoraSDK.ChannelProfileType;
  ClientRoleType = AgoraSDK.ClientRoleType;
  AGORA_AVAILABLE = true;
} catch (e) {
  AGORA_AVAILABLE = false;
}

export default function WatchLiveScreen() {


  const router = useRouter();
  const { streamId, channelName } = useLocalSearchParams();
  const currentUser = getCurrentUser();

  const [input, setInput] = useState("");
  const [comments, setComments] = useState<any[]>([]);
  const [viewerCount, setViewerCount] = useState(0);
  const [isJoined, setIsJoined] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [remoteUid, setRemoteUid] = useState<number | null>(null);
  const [viewers, setViewers] = useState<any[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'reconnecting'>('connecting');
  // Real stream data
  const [streamData, setStreamData] = useState<any>(null);

  // Host info fallback logic for all views
  const hostName = streamData?.hostName || streamData?.host?.name || 'Streamer';
  const hostAvatarSafe =
    streamData?.hostAvatar ||
    streamData?.host?.avatar ||
    streamData?.host?.photoURL ||
    streamData?.avatar ||
    DEFAULT_AVATAR_URL;

  // UI State - buttons toggle visibility
  const [showComments, setShowComments] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [showSelfCamera, setShowSelfCamera] = useState(false);
  const [isMapFullScreen, setIsMapFullScreen] = useState(false);

  // Viewer location state
  const [viewerLocation, setViewerLocation] = useState<{latitude: number; longitude: number} | null>(null);

  const engineRef = useRef<any>(null);
  const uidRef = useRef(Math.floor(Math.random() * 100000));
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttemptsRef = useRef(3);
  const isInitializingRef = useRef(false);

  // Get viewer location
  useEffect(() => {
    const getLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({});
          setViewerLocation({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          });
        }
      } catch (error) {
        console.error('Error getting location:', error);
      }
    };
    getLocation();
  }, []);

  useEffect(() => {
    if (!currentUser || !streamId || !channelName) {
      setComments([]);
      setViewers([]);
      setViewerCount(0);
      return;
    }

    reconnectAttemptsRef.current = 0; // Reset on new stream
    initializeViewer();

    return () => {
      cleanup();
    };
  }, []);

  useEffect(() => {
    if (!streamId) {
      setComments([]);
      return;
    }
    const commentsRef = collection(db, 'liveStreams', streamId as string, 'comments');
    const commentsQuery = query(commentsRef, orderBy('createdAt', 'desc'));
    const unsubComments = onSnapshot(commentsQuery, (snapshot) => {
      const newComments = snapshot.docs.slice(0, 50).map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setComments(newComments);
    });

    const streamRef = doc(db, 'liveStreams', streamId as string);
    const unsubStream = onSnapshot(streamRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setStreamData(data);
        if (!data?.isLive) {
          Alert.alert('Stream Ended', 'The host has ended the stream', [
            { text: 'OK', onPress: () => router.back() }
          ]);
        }
      }
    });

    const viewersRef = collection(db, 'liveStreams', streamId as string, 'viewers');
    const unsubViewers = onSnapshot(viewersRef, (snapshot) => {
      const viewersList = snapshot.docs.slice(0, 50).map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setViewers(viewersList);
      setViewerCount(viewersList.length);
    });

    return () => {
      unsubComments();
      unsubStream();
      unsubViewers();
    };
  }, [streamId]);

  const initializeViewer = async () => {
    try {
      // Prevent multiple simultaneous initializations
      if (isInitializingRef.current) {
        console.log('⚠️ Already initializing, skipping...');
        return;
      }
      
      isInitializingRef.current = true;
      
      if (!AGORA_AVAILABLE) {
        console.log('❌ Agora SDK not available');
        setIsInitializing(false);
        isInitializingRef.current = false;
        return;
      }

      if (!streamId || !channelName) {
        console.log('❌ Missing streamId or channelName:', { streamId, channelName });
        Alert.alert('Error', 'Stream information missing');
        setIsInitializing(false);
        isInitializingRef.current = false;
        return;
      }

      if (!currentUser) {
        console.log('❌ No current user');
        Alert.alert('Error', 'Please log in first');
        setIsInitializing(false);
        isInitializingRef.current = false;
        return;
      }
      
      // Clean up existing engine before creating new one
      if (engineRef.current) {
        console.log('🧹 Cleaning up existing engine before reinitializing...');
        try {
          await engineRef.current.leaveChannel();
          await engineRef.current.release();
        } catch (e) {
          console.log('Error during pre-cleanup:', e);
        }
        engineRef.current = null;
      }

      // Check if stream exists and is live BEFORE trying to join
      console.log('🔍 Checking if stream exists:', streamId);
      const streamRef = doc(db, 'liveStreams', streamId as string);
      const streamSnap = await getDoc(streamRef);

      if (!streamSnap.exists()) {
        console.log('❌ Stream document does not exist');
        Alert.alert('Stream Not Found', 'This stream does not exist or has ended.', [
          { text: 'OK', onPress: () => router.back() }
        ]);
        setIsInitializing(false);
        return;
      }

      const streamDataCheck = streamSnap.data();
      if (!streamDataCheck?.isLive) {
        console.log('❌ Stream is not live');
        Alert.alert('Stream Ended', 'This stream has ended.', [
          { text: 'OK', onPress: () => router.back() }
        ]);
        setIsInitializing(false);
        return;
      }

      console.log('✅ Stream is live, proceeding to join...');

      setIsInitializing(true);
      setConnectionStatus('connecting');

      // Request audio permissions for viewer (mic optional, but needed if they want to speak)
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          PermissionsAndroid.PERMISSIONS.CAMERA,
        ]);
        console.log('✅ Permissions granted:', granted);
      } else {
        await Camera.requestCameraPermissionsAsync();
      }

      await joinLiveStream(streamId as string, currentUser.uid);

      const engine = RtcEngine();
      if (!engine) {
        console.log('❌ Failed to create Agora engine');
        setIsInitializing(false);
        return;
      }

      engineRef.current = engine;

      console.log('🔧 Initializing Agora engine with appId:', AGORA_CONFIG.appId);
      await engine.initialize({
        appId: AGORA_CONFIG.appId,
        channelProfile: ChannelProfileType.ChannelProfileLiveBroadcasting,
      });

      await engine.enableVideo();
      await engine.enableAudio();
      await engine.setClientRole(ClientRoleType.ClientRoleAudience);
      
      // Enable dual stream mode for better quality
      await engine.enableDualStreamMode(true);
      await engine.setRemoteDefaultVideoStreamType(0); // High quality

      console.log('📡 Registering event handlers...');
      // CRITICAL FIX: Register event handlers BEFORE joining channel
      engine.registerEventHandler({
        onUserJoined: (_connection: any, uid: number) => {
          console.log('✅ Remote broadcaster joined:', uid);
          setRemoteUid(uid);
          setConnectionStatus('connected');
          setIsInitializing(false);
        },
        onUserOffline: (_connection: any, uid: number, reason: number) => {
          console.log('❌ Remote broadcaster left:', uid, 'reason:', reason);
          if (uid === remoteUid) {
            setRemoteUid(null);
            setConnectionStatus('disconnected');
            Alert.alert('Stream Ended', 'The broadcaster has left', [
              { text: 'OK', onPress: () => router.back() }
            ]);
          }
        },
        onJoinChannelSuccess: (_connection: any, elapsed: number) => {
          console.log('✅ Successfully joined channel as viewer, elapsed:', elapsed);
          setIsJoined(true);
          setConnectionStatus('connected');
        },
        onRemoteVideoStateChanged: (_connection: any, uid: number, state: number, reason: number) => {
          console.log('📹 Remote video state changed:', uid, 'state:', state, 'reason:', reason);
          // state 2 = playing
          if (state === 2 && !remoteUid) {
            console.log('✅ Setting remote UID from video state change:', uid);
            setRemoteUid(uid);
            setConnectionStatus('connected');
            setIsInitializing(false);
          }
        },
        onError: (err: number, msg: string) => {
          console.error('❌ Agora error:', err, msg);
          // Error codes:
          // 17 = ERR_JOIN_CHANNEL_REJECTED
          // 110 = ERR_OPEN_CHANNEL_TIMEOUT (channel join timeout)
          // 2 = ERR_INVALID_ARGUMENT

          if (err === 110) {
            // Error 110: Timeout joining channel - broadcaster might not be ready
            console.log('⚠️ Channel join timeout (110) - broadcaster may not be streaming yet');
            
            if (reconnectAttemptsRef.current < maxReconnectAttemptsRef.current) {
              reconnectAttemptsRef.current += 1;
              setConnectionStatus('reconnecting');
              console.log(`🔄 Reconnecting... Attempt ${reconnectAttemptsRef.current}/${maxReconnectAttemptsRef.current}`);

              // Proper cleanup before retry
              isInitializingRef.current = false;
              
              setTimeout(async () => {
                try {
                  if (engineRef.current) {
                    await engineRef.current.leaveChannel();
                  }
                } catch (e) {
                  console.log('Error leaving channel during error 110 retry:', e);
                }
                initializeViewer();
              }, 5000); // Wait 5 seconds for error 110 (broadcaster might need time to start publishing)
            } else {
              setConnectionStatus('disconnected');
              setIsInitializing(false);
              isInitializingRef.current = false;
              Alert.alert(
                'Connection Timeout', 
                'Unable to connect to the stream. The broadcaster may not be streaming yet or there may be network issues.',
                [{ text: 'OK', onPress: () => router.back() }]
              );
            }
          } else if (err === 17 || err === 2) {
            // Other errors - try reconnecting
            if (reconnectAttemptsRef.current < maxReconnectAttemptsRef.current) {
              reconnectAttemptsRef.current += 1;
              setConnectionStatus('reconnecting');
              console.log(`🔄 Reconnecting... Attempt ${reconnectAttemptsRef.current}/${maxReconnectAttemptsRef.current}`);

              isInitializingRef.current = false;
              
              setTimeout(async () => {
                try {
                  if (engineRef.current) {
                    await engineRef.current.leaveChannel();
                  }
                } catch (e) {
                  console.log('Error leaving channel during retry:', e);
                }
                initializeViewer();
              }, 3000);
            } else {
              setConnectionStatus('disconnected');
              setIsInitializing(false);
              isInitializingRef.current = false;
              Alert.alert('Connection Error', 'Unable to join stream after multiple attempts.');
            }
          }
        },
        onConnectionStateChanged: (_connection: any, state: number, reason: number) => {
          console.log('🔌 Connection state changed:', state, 'reason:', reason);
          // state 1 = connecting, 2 = connected, 3 = reconnecting, 4 = failed, 5 = disconnected
          // reason 0 = default, 5 = leave channel, 8 = client role changed
          
          if (state === 2) { // connected
            setConnectionStatus('connected');
            console.log('✅ Connection established');
            reconnectAttemptsRef.current = 0; // Reset on successful connection
            isInitializingRef.current = false;
          } else if (state === 3) {
            setConnectionStatus('reconnecting');
            console.log('⚠️ Reconnecting to Agora...');
          } else if (state === 4 || state === 5) {
            // Only reconnect for actual disconnections, not intentional leaves (reason 5)
            if (reason !== 5 && reason !== 0) {
              setConnectionStatus('disconnected');
              console.log('❌ Connection failed/disconnected (reason:', reason, ')');
              
              // Don't auto-reconnect on connection state changes if we're already handling error 110
              // The error handler will manage reconnects
            } else {
              console.log('ℹ️ Connection state changed but not reconnecting (reason:', reason, ')');
            }
          }
        }
      });

      const token = await getAgoraToken(channelName as string, uidRef.current);
      console.log('🎫 Got Agora token:', token ? 'Yes (secure)' : 'No (dev mode - null token)');

      console.log('📡 Joining channel:', channelName, 'with uid:', uidRef.current);

      try {
        await engine.joinChannel(token || '', channelName as string, uidRef.current, {
          clientRoleType: ClientRoleType.ClientRoleAudience,
          publishMicrophoneTrack: false,
          publishCameraTrack: false,
          autoSubscribeAudio: true,
          autoSubscribeVideo: true,
        });

        console.log('✅ Successfully called joinChannel, waiting for broadcaster...');
        setIsJoined(true);
      } catch (joinError: any) {
        console.error('❌ Failed to join channel:', joinError);

        // If token error, show helpful message
        if (joinError.message?.includes('token') || joinError.message?.includes('certificate')) {
          Alert.alert(
            'Connection Error',
            'Unable to connect to stream. The stream may require authentication. Please contact support.',
            [{ text: 'OK', onPress: () => router.back() }]
          );
        } else {
          throw joinError; // Re-throw to be caught by outer try-catch
        }
      }
      
      // Timeout after 30 seconds if no broadcaster found (increased to give more time)
      const timeoutId = setTimeout(() => {
        if (!remoteUid && isInitializing) {
          console.log('⏱️ Timeout: No broadcaster found after 30s, marking as not initializing');
          setIsInitializing(false);
          isInitializingRef.current = false;
          setConnectionStatus('connected'); // Show connected but no video available
        }
      }, 30000);

      return () => clearTimeout(timeoutId);
    } catch (error: any) {
      console.error('💥 Error initializing viewer:', error.message, error);
      setIsInitializing(false);
      isInitializingRef.current = false;
      setConnectionStatus('disconnected');
      Alert.alert('Error', `Failed to join stream: ${error.message}`);
    }
  };

  const cleanup = async () => {
    console.log('🧹 Starting cleanup...');
    isInitializingRef.current = false;
    
    if (engineRef.current) {
      try {
        console.log('🔌 Leaving channel and releasing engine...');
        await engineRef.current.leaveChannel();
        await engineRef.current.release();
        engineRef.current = null;
        console.log('✅ Engine cleaned up successfully');
      } catch (error) {
        console.error('Error cleaning up engine:', error);
        engineRef.current = null; // Force null even if error
      }
    }

    if (currentUser && streamId) {
      await leaveLiveStream(streamId as string, currentUser.uid);
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    if (streamId && currentUser) {
      try {
        const commentsRef = collection(db, 'liveStreams', streamId as string, 'comments');
        await addDoc(commentsRef, {
          userId: currentUser.uid,
          userName: currentUser.displayName || 'User',
          userAvatar: currentUser.photoURL || DEFAULT_AVATAR_URL,
          text: input.trim(),
          createdAt: serverTimestamp()
        });
      } catch (error) {
        console.error('Error sending comment:', error);
      }
    }
    setInput("");
  };

  // Helper for video icon comment
  const handleSendVideoComment = async () => {
    if (streamId && currentUser) {
      try {
        const commentsRef = collection(db, 'liveStreams', streamId as string, 'comments');
        await addDoc(commentsRef, {
          userId: currentUser.uid,
          userName: currentUser.displayName || 'User',
          userAvatar: currentUser.photoURL || DEFAULT_AVATAR_URL,
          text: "I'm watching the stream!",
          createdAt: serverTimestamp()
        });
      } catch (error) {
        console.error('Error sending video comment:', error);
      }
    }
  };

  // Toggle viewer's camera
  const toggleSelfCamera = async () => {
    if (!engineRef.current) return;

    const newState = !showSelfCamera;
    setShowSelfCamera(newState);

    try {
      if (newState) {
        // Enable camera
        console.log('📹 Enabling viewer camera...');
        await engineRef.current.enableLocalVideo(true);
        await engineRef.current.startPreview();

        // Request camera permissions if needed
        if (Platform.OS === 'android') {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.CAMERA
          );
          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            console.warn('Camera permission denied');
            setShowSelfCamera(false);
            return;
          }
        } else {
          const { status } = await Camera.requestCameraPermissionsAsync();
          if (status !== 'granted') {
            console.warn('Camera permission denied');
            setShowSelfCamera(false);
            return;
          }
        }
      } else {
        // Disable camera
        console.log('📹 Disabling viewer camera...');
        await engineRef.current.enableLocalVideo(false);
        await engineRef.current.stopPreview();
      }
    } catch (error) {
      console.error('Error toggling camera:', error);
      setShowSelfCamera(false);
    }
  };

  // Full screen map view
  if (isMapFullScreen) {
    const hasLocation = streamData?.location && typeof streamData.location.latitude === 'number' && typeof streamData.location.longitude === 'number';

    // Calculate distance if both locations available
    const distance = hasLocation && viewerLocation
      ? calculateDistance(
          viewerLocation.latitude,
          viewerLocation.longitude,
          streamData.location.latitude,
          streamData.location.longitude
        )
      : 0;

    return (
      <View style={styles.container}>
        <MapView
          style={StyleSheet.absoluteFillObject}
          initialRegion={hasLocation ? {
            latitude: streamData.location.latitude,
            longitude: streamData.location.longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          } : {
            latitude: 20,
            longitude: 70,
            latitudeDelta: 10,
            longitudeDelta: 10,
          }}
          showsUserLocation
          loadingEnabled={true}
          loadingIndicatorColor="#00c853"
          liteMode={false}
          cacheEnabled={true}
        >
          {/* Streamer marker */}
          {hasLocation ? (
            <Marker coordinate={{ latitude: streamData.location.latitude, longitude: streamData.location.longitude }}>
              <View style={styles.mapMarker}>
                <Image
                  source={{ uri: hostAvatarSafe }}
                  style={styles.mapMarkerAvatar}
                />
              </View>
            </Marker>
          ) : null}

          {/* Viewer marker (you) with distance */}
          {viewerLocation && (
            <Marker coordinate={viewerLocation}>
              <View style={styles.viewerMarkerContainer}>
                {hasLocation && distance > 0 && (
                  <View style={styles.distanceBadge}>
                    <Text style={styles.distanceText}>{formatDistance(distance)}</Text>
                  </View>
                )}
                <View style={styles.viewerMarker}>
                  <Image
                    source={{ uri: currentUser?.avatar || currentUser?.photoURL || DEFAULT_AVATAR_URL }}
                    style={styles.viewerMarkerAvatar}
                  />
                </View>
              </View>
            </Marker>
          )}
        </MapView>

        {/* Top Header on Map */}
        <SafeAreaView style={styles.mapTopOverlay} edges={['top']}>
          <View style={styles.mapTopHeader}>
            <View style={styles.hostPill}>
              <Image
                source={{ uri: hostAvatarSafe }}
                style={styles.hostAvatarSmall}
              />
              <Text style={styles.hostName}>{hostName}</Text>
              <View style={styles.greenDot} />
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
              <Ionicons name="close" size={20} color="#000" />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.sideCloseBtn} onPress={() => setIsMapFullScreen(false)}>
            <Ionicons name="close" size={18} color="#000" />
          </TouchableOpacity>
        </SafeAreaView>

        {/* Self Camera PiP on Map */}
        {showSelfCamera && (
          <View style={styles.selfCameraPipMap}>
            {AGORA_AVAILABLE ? (
              <Image
                source={{ uri: hostAvatarSafe }}
                style={styles.pipImage}
              />
            ) : (
              <View style={[styles.pipImage, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#222' }]}> 
                <Text style={{ color: '#fff', fontSize: 12 }}>Camera not available</Text>
              </View>
            )}
            <TouchableOpacity style={styles.pipExpandBtn}>
              <Ionicons name="expand-outline" size={12} color="#666" />
            </TouchableOpacity>
          </View>
        )}

        {/* Live Video PiP on Map - Show live video or loading */}
        <View style={styles.liveVideoPipMap}>
          {AGORA_AVAILABLE && isJoined && remoteUid && RtcSurfaceView ? (
            <RtcSurfaceView
              style={styles.pipImage}
              canvas={{ uid: remoteUid, sourceType: 0, renderMode: 2 }}
              zOrderMediaOverlay={false}
            />
          ) : (
            <View style={[styles.pipImage, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#222' }]}>
              <Text style={{ color: '#fff', fontSize: 12 }}>Live video not available</Text>
            </View>
          )}
        </View>

        {/* Comments on Map - Always show */}
        <View style={styles.commentsContainerMap}>
          <FlatList
            data={comments}
            keyExtractor={item => item.id}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <View style={styles.commentBubble}>
                <Text style={styles.commentUsername}>{item.userName}</Text>
                <Text style={styles.commentText}>{item.text}</Text>
              </View>
            )}
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={5}
            removeClippedSubviews={true}
          />
        </View>

        {/* Bottom Controls on Map */}
        <SafeAreaView style={styles.bottomOverlay} edges={['bottom']}>
          {/* Input Row */}
          {showComments && (
            <View style={styles.inputRowMap}>
              <TextInput
                style={styles.inputFieldMap}
                value={input}
                onChangeText={setInput}
                placeholder="Send a message"
                placeholderTextColor="rgba(0,0,0,0.4)"
              />
              <TouchableOpacity onPress={handleSend}>
                <Ionicons name="send" size={20} color="#333" />
              </TouchableOpacity>
            </View>
          )}
          
          <View style={styles.bottomControlsRow}>
            {/* Removed recording (videocam-outline) icon */}
            {/* Camera/Selfie Button */}
            <TouchableOpacity 
              style={[styles.controlBtn, showSelfCamera && styles.controlBtnActive]}
              onPress={() => setShowSelfCamera(!showSelfCamera)}
            >
              <Ionicons name="camera-outline" size={22} color={showSelfCamera ? "#fff" : "#333"} />
            </TouchableOpacity>
            {/* Location Button - Green only when map is open */}
            <TouchableOpacity 
              style={[styles.controlBtn, showMap && styles.controlBtnGreen]}
              onPress={() => setIsMapFullScreen(false)}
            >
              <Ionicons name="location" size={24} color="#fff" />
            </TouchableOpacity>
            {/* Chat Button */}
            <TouchableOpacity 
              style={[styles.controlBtn, showComments ? styles.controlBtnActive : styles.controlBtnOff]}
              onPress={() => setShowComments(!showComments)}
            >
              <Ionicons name={showComments ? "chatbubble" : "chatbubble-outline"} size={22} color={showComments ? "#fff" : "#ff6b6b"} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // Main view (Video fullscreen)
  return (
    <View style={styles.container}>
      {/* Video Background - Always show video, show loading if not available */}
      <View style={styles.videoContainer}>
        {AGORA_AVAILABLE && isJoined && remoteUid && RtcSurfaceView ? (
          <RtcSurfaceView
            style={styles.videoBackground}
            canvas={{ uid: remoteUid, sourceType: 0, renderMode: 2 }}
            zOrderMediaOverlay={false}
          />
        ) : (
          <View style={[styles.videoBackground, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }]}>
            <ActivityIndicator size="large" color="#fff" style={{ marginBottom: 10 }} />
            <Text style={{ color: '#fff', fontSize: 16 }}>
              {connectionStatus === 'reconnecting' ? 'Reconnecting...' : 'Connecting to live stream...'}
            </Text>
            <Text style={{ color: '#aaa', fontSize: 12, marginTop: 5 }}>
              {connectionStatus === 'reconnecting' ? `Attempt ${reconnectAttemptsRef.current}/${maxReconnectAttemptsRef.current}` : 'Please wait'}
            </Text>
            {connectionStatus === 'disconnected' && (
              <TouchableOpacity 
                style={{ marginTop: 20, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#ff6b6b', borderRadius: 8 }}
                onPress={() => {
                  reconnectAttemptsRef.current = 0;
                  initializeViewer();
                }}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Try Again</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Top Header - Host info and viewer count */}
      <SafeAreaView style={styles.topOverlay} edges={['top']}>
        <View style={styles.topHeader}>
          <View style={styles.viewerSection}>
            <View style={styles.viewerAvatars}>
              {viewers.slice(0, 3).map((viewer, idx) => (
                <Image
                  key={viewer.id}
                  source={{ uri: viewer.avatar || DEFAULT_AVATAR_URL }}
                  style={[styles.viewerAvatar, { marginLeft: idx > 0 ? -8 : 0 }]}
                />
              ))}
            </View>
            <Text style={styles.viewerCountText}>{viewerCount}</Text>
            <View style={styles.greenDot} />
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
            <Ionicons name="close" size={20} color="#000" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Self Camera PiP - Show viewer's own camera when enabled */}
      {showSelfCamera && AGORA_AVAILABLE && RtcSurfaceView && (
        <View style={styles.selfCameraPip}>
          <RtcSurfaceView
            style={styles.pipImage}
            canvas={{ uid: 0, sourceType: 1, renderMode: 2 }}
            zOrderMediaOverlay={true}
          />
          <TouchableOpacity
            style={styles.pipCloseBtn}
            onPress={() => setShowSelfCamera(false)}
          >
            <Ionicons name="close-circle" size={24} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>
        </View>
      )}

      {/* Map Popup - Show location when enabled */}
      {showMap && streamData?.location && typeof streamData.location.latitude === 'number' && (
        <View style={styles.mapPopup}>
          <TouchableOpacity 
            style={styles.mapPopupExpandBtn}
            onPress={() => setIsMapFullScreen(true)}
          >
            <Ionicons name="expand-outline" size={18} color="#333" />
          </TouchableOpacity>
          <MapView
            style={styles.mapPopupView}
            initialRegion={{
              latitude: streamData.location.latitude,
              longitude: streamData.location.longitude,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
            showsUserLocation
            loadingEnabled={true}
            loadingIndicatorColor="#00c853"
            cacheEnabled={true}
          >
            <Marker coordinate={{ latitude: streamData.location.latitude, longitude: streamData.location.longitude }}>
              <View style={styles.mapMarker}>
                <Image
                  source={{ uri: hostAvatarSafe }}
                  style={styles.mapMarkerAvatar}
                />
              </View>
            </Marker>
          </MapView>
        </View>
      )}

      {/* Comments Section - Always show comments ABOVE input */}
      {!showComments && (
        <View style={styles.commentsContainer}>
          <FlatList
            data={comments}
            keyExtractor={item => item.id}
            inverted={true}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => <CommentItem item={item} />}
            initialNumToRender={8}
            maxToRenderPerBatch={8}
            windowSize={5}
            removeClippedSubviews={true}
            contentContainerStyle={{ paddingBottom: 10, paddingTop: 10 }}
          />
        </View>
      )}

      {/* Bottom Controls - Comment Input with KeyboardAvoidingView */}
      {showComments && (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
          style={styles.commentInputContainer}
        >
          {/* Comments List ABOVE input */}
          <View style={styles.commentsListAboveInput}>
            <FlatList
              data={comments}
              keyExtractor={item => item.id}
              inverted={true}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => <CommentItem item={item} />}
              initialNumToRender={8}
              maxToRenderPerBatch={8}
              windowSize={5}
              removeClippedSubviews={true}
              contentContainerStyle={{ paddingBottom: 10, paddingTop: 10 }}
            />
          </View>

          {/* Input Row */}
          <View style={styles.inputRow}>
            <TextInput
              style={styles.inputField}
              value={input}
              onChangeText={setInput}
              placeholder="Send a message"
              placeholderTextColor="rgba(255,255,255,0.5)"
              onSubmitEditing={handleSend}
              returnKeyType="send"
              blurOnSubmit={false}
            />
            <TouchableOpacity onPress={handleSend} style={styles.sendButton}>
              <Ionicons name="send" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
      {/* Bottom Control Buttons */}
      <SafeAreaView style={styles.bottomOverlay} edges={['bottom']}>
        <View style={styles.bottomControlsRow}>
          {/* Camera/Selfie Button */}
          <TouchableOpacity
            style={[styles.controlBtn, showSelfCamera && styles.controlBtnActive]}
            onPress={toggleSelfCamera}
          >
            <Ionicons name="camera-outline" size={22} color={showSelfCamera ? "#fff" : "#333"} />
          </TouchableOpacity>

          {/* Location Button - Green only when map is open */}
          <TouchableOpacity
            style={[styles.controlBtn, showMap && styles.controlBtnGreen]}
            onPress={() => setShowMap(!showMap)}
          >
            <Ionicons name="location" size={24} color={showMap ? "#fff" : "#333"} />
          </TouchableOpacity>

          {/* Chat Button - Reddish when off, white bg when on */}
          <TouchableOpacity
            style={[styles.controlBtn, showComments ? styles.controlBtnActive : styles.controlBtnOff]}
            onPress={() => setShowComments(!showComments)}
          >
            <Ionicons name={showComments ? "chatbubble" : "chatbubble-outline"} size={22} color={showComments ? "#fff" : "#ff6b6b"} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

// Memoized comment item for FlatList
const CommentItem = React.memo(({ item }: { item: any }) => (
  <View style={styles.commentBubble}>
    <Text style={styles.commentUsername}>{item.userName}</Text>
    <Text style={styles.commentText}>{item.text}</Text>
  </View>
));

CommentItem.displayName = 'CommentItem';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    width: '100%',
    height: '100%',
  },
  videoContainer: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  videoBackground: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1a1a1a',
  },
  commentsContainer: {
    position: 'absolute',
    bottom: '25%', // moved up from 18%
    left: '4%',
    right: '20%',
    maxHeight: '22%',
    zIndex: 5,
  },
  commentBubble: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 6,
    alignSelf: 'flex-start',
    maxWidth: '95%',
  },
  commentUsername: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 2,
  },
  commentText: {
    fontSize: 14,
    color: '#fff',
    lineHeight: 18,
  },

  // Top Overlay
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  viewerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 25,
    paddingVertical: 6,
    paddingHorizontal: 10,
    paddingRight: 14,
  },
  viewerAvatars: {
    flexDirection: 'row',
    marginRight: 8,
  },
  viewerAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#fff',
  },
  viewerCountText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000',
    marginRight: 6,
  },
  greenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00D26A',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Host Pill
  hostPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(50,50,50,0.9)',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 10,
    paddingRight: 14,
    alignSelf: 'flex-start',
    marginLeft: 16,
    marginTop: 12,
  },
  hostAvatarSmall: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  hostName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
    marginRight: 6,
  },

  // Map Popup
  mapPopup: {
    position: 'absolute',
    bottom: 180,
    left: 16,
    right: 16,
    height: 140,
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    zIndex: 20,
  },
  mapPopupView: {
    width: '100%',
    height: '100%',
  },
  mapPopupExpandBtn: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  mapPopupCloseBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  smallMarker: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#E74C3C',
    borderWidth: 2,
    borderColor: '#fff',
  },
  mapMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#00D26A',
  },
  mapMarkerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },

  // Viewer marker styles
  viewerMarkerContainer: {
    alignItems: 'center',
  },
  distanceBadge: {
    backgroundColor: '#e0245e',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  distanceText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  viewerMarker: {
    alignItems: 'center',
  },
  viewerMarkerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#3498db',
  },

  // Self Camera PiP
  selfCameraPip: {
    position: 'absolute',
    bottom: 340,
    left: 16,
    width: 90,
    height: 120,
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    overflow: 'hidden',
    zIndex: 15,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  pipImage: {
    width: '100%',
    height: '100%',
  },
  pipExpandBtn: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pipCloseBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    zIndex: 20,
  },

  // Bottom Controls
  bottomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingBottom: 16,
  },
  commentInputContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 80,
    zIndex: 20,
    maxHeight: '50%',
  },
  commentsListAboveInput: {
    maxHeight: 200,
    marginBottom: 10,
    paddingHorizontal: 16,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inputField: {
    flex: 1,
    fontSize: 15,
    color: '#fff',
    marginRight: 10,
    maxHeight: 100,
  },
  sendButton: {
    padding: 4,
  },
  inputRowMap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  inputFieldMap: {
    flex: 1,
    fontSize: 15,
    color: '#000',
    marginRight: 10,
  },
  bottomControlsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 40,
  },
  controlBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(255,255,255,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlBtnActive: {
    backgroundColor: '#333',
  },
  controlBtnOff: {
    backgroundColor: 'rgba(255,107,107,0.2)',
    borderWidth: 1,
    borderColor: '#ff6b6b',
  },
  controlBtnGreen: {
    backgroundColor: '#00D26A',
  },

  // Map Full Screen
  mapTopOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: 16,
  },
  mapTopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  sideCloseBtn: {
    position: 'absolute',
    left: 0,
    top: 90,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selfCameraPipMap: {
    position: 'absolute',
    top: 180,
    left: 16,
    width: 90,
    height: 120,
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    overflow: 'hidden',
    zIndex: 15,
  },
  liveVideoPipMap: {
    position: 'absolute',
    bottom: 180,
    right: 16,
    width: 120,
    height: 160,
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    overflow: 'hidden',
    zIndex: 15,
    borderWidth: 3,
    borderColor: '#7DD3C0',
  },
  commentsContainerMap: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    right: 16,
    maxHeight: 140,
    zIndex: 5,
  },
});

