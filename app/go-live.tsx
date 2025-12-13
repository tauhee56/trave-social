import { Ionicons } from '@expo/vector-icons';
import { Camera } from 'expo-camera';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { addDoc, collection, deleteDoc, doc, getDoc, onSnapshot, orderBy, query, serverTimestamp, setDoc } from 'firebase/firestore';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    BackHandler,
    Dimensions,
    FlatList,
    Image,
    PermissionsAndroid,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
// @ts-ignore
import { AGORA_CONFIG } from '../config/agora';
// @ts-ignore
import { auth, db } from '../config/firebase';
import { logger } from '../utils/logger';


  // Utility: sanitize coordinates for MapView/Marker
  function getSafeCoordinate(coord: { latitude?: number; longitude?: number } | null, fallback = { latitude: 51.5074, longitude: -0.1278 }) {
    const lat = typeof coord?.latitude === 'number' && isFinite(coord.latitude) ? coord.latitude : fallback.latitude;
    const lon = typeof coord?.longitude === 'number' && isFinite(coord.longitude) ? coord.longitude : fallback.longitude;
    return { latitude: lat, longitude: lon };
  }

const { width, height } = Dimensions.get('window');
const DEFAULT_AVATAR_URL = 'https://firebasestorage.googleapis.com/v0/b/travel-app-3da72.firebasestorage.app/o/default%2Fdefault-pic.jpg?alt=media&token=7177f487-a345-4e45-9a56-732f03dbf65d';

// Import Agora SDK
let RtcEngine: any = null;
let RtcSurfaceView: any = null;
let ChannelProfileType: any = null;
let ClientRoleType: any = null;
let VideoSourceType: any = null;
let RenderModeType: any = null;
let AGORA_AVAILABLE = false;

try {
  const AgoraSDK = require('react-native-agora');
  RtcEngine = AgoraSDK.createAgoraRtcEngine || AgoraSDK.default?.createAgoraRtcEngine;
  RtcSurfaceView = AgoraSDK.RtcSurfaceView;
  ChannelProfileType = AgoraSDK.ChannelProfileType;
  ClientRoleType = AgoraSDK.ClientRoleType;
  VideoSourceType = AgoraSDK.VideoSourceType;
  RenderModeType = AgoraSDK.RenderModeType;
  AGORA_AVAILABLE = true;
} catch (e) {
  AGORA_AVAILABLE = false;
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
}

export default function GoLiveScreen() {
  const router = useRouter();
  const agoraEngineRef = useRef<any>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [channelName, setChannelName] = useState('');
  const [streamTitle, setStreamTitle] = useState('');

  // Refs to always have latest values for cleanup
  const isStreamingRef = useRef(isStreaming);
  const channelNameRef = useRef(channelName);

  useEffect(() => {
    isStreamingRef.current = isStreaming;
  }, [isStreaming]);

  useEffect(() => {
    channelNameRef.current = channelName;
  }, [channelName]);

  // Cleanup: End stream if unmounting while streaming (always use latest refs)
  useEffect(() => {
    return () => {
      const channel = channelNameRef.current;
      if (channel) {
        // Always mark stream as ended in Firebase
        const streamRef = doc(db, 'liveStreams', channel);
        setDoc(streamRef, {
          isLive: false,
          endedAt: serverTimestamp()
        }, { merge: true });
        // Leave Agora channel if needed
        if (agoraEngineRef.current) {
          agoraEngineRef.current.leaveChannel();
          agoraEngineRef.current.release();
          agoraEngineRef.current = null;
        }
      }
    };
  }, []);
  // ...existing code...
  
  // User state
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // Controls state
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isUsingFrontCamera, setIsUsingFrontCamera] = useState(true);
  
  // Location state
  const [location, setLocation] = useState<{latitude: number; longitude: number} | null>(null);
  
  // Comments state
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  // Defensive: always use array
  const safeComments = Array.isArray(comments) ? comments : [];

  // Viewers state
  const [viewers, setViewers] = useState<Viewer[]>([]);
  const [viewerCount, setViewerCount] = useState(0);
  // Defensive: always use array
  const safeViewers = Array.isArray(viewers) ? viewers : [];

  // UI State - buttons toggle visibility
  const [showComments, setShowComments] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [isMapFullScreen, setIsMapFullScreen] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);

  // Get current user data
  useEffect(() => {
    const fetchUser = async () => {
      if (auth.currentUser) {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userDoc.exists()) {
          setCurrentUser({ id: auth.currentUser.uid, ...userDoc.data() });
        }
      }
    };
    fetchUser();
    // Initialize with empty arrays - real data comes from Firebase
    setComments([]);
    setViewers([]);
    setViewerCount(0);
  }, []);

  // Get location
  useEffect(() => {
    const getLocation = async () => {
      try {
        const loc = await Location.getCurrentPositionAsync({});
        setLocation({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
      } catch (error) {
        logger.error('Error getting location:', error);
      }
    };
    getLocation();
  }, []);

  // Handle back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (isStreamingRef.current) {
        Alert.alert(
          'End Stream',
          'Do you want to end the live stream?',
          [
            { text: 'Cancel', style: 'cancel', onPress: () => {} },
            {
              text: 'End',
              style: 'destructive',
              onPress: async () => {
                const channel = channelNameRef.current;
                if (channel) {
                  const streamRef = doc(db, 'liveStreams', channel);
                  await setDoc(streamRef, {
                    isLive: false,
                    endedAt: serverTimestamp()
                  }, { merge: true });
                  if (agoraEngineRef.current) {
                    await agoraEngineRef.current.leaveChannel();
                    agoraEngineRef.current.release();
                    agoraEngineRef.current = null;
                  }
                }
                setIsStreaming(false);
                router.back();
              }
            }
          ]
        );
        return true;
      }
      return false;
    });
    return () => backHandler.remove();
  }, [channelName]);

  // Initialize Agora engine
  const initAgoraEngine = useCallback(async () => {
    if (!AGORA_AVAILABLE || !RtcEngine) {
      logger.error('Agora SDK not available');
      return null;
    }
    
    try {
      logger.log('Initializing Agora engine...');
      
      // Request permissions first (Android)
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.CAMERA,
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        ]);
        
        if (
          granted['android.permission.CAMERA'] !== PermissionsAndroid.RESULTS.GRANTED ||
          granted['android.permission.RECORD_AUDIO'] !== PermissionsAndroid.RESULTS.GRANTED
        ) {
          logger.warn('Camera/Audio permissions denied');
          Alert.alert('Permission Required', 'Camera and microphone permissions are required for live streaming.');
          return null;
        }
      } else {
        // iOS - use expo-camera for permissions
        const { status } = await Camera.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Camera permission is required for live streaming.');
          return null;
        }
      }
      
      const engine = RtcEngine();
      agoraEngineRef.current = engine;

      await engine.initialize({
        appId: AGORA_CONFIG.appId,
        channelProfile: ChannelProfileType?.ChannelProfileLiveBroadcasting,
      });

      // Set role to broadcaster for preview
      await engine.setClientRole(ClientRoleType?.ClientRoleBroadcaster);
      
      // Enable video
      await engine.enableVideo();
      
      // Set video encoder configuration for full screen without stretching
      await engine.setVideoEncoderConfiguration({
        dimensions: { width: 1080, height: 1920 }, // Portrait Full HD (9:16 aspect ratio)
        frameRate: 30,
        bitrate: 2500,
        orientationMode: 0, // Portrait mode
      });
      
      // Enable local video
      await engine.enableLocalVideo(true);
      
      // Start the camera preview
      await engine.startPreview();
      
      console.log('Camera preview started successfully');
      setIsCameraReady(true);

      engine.addListener('onJoinChannelSuccess', (_connection: any, _elapsed: number) => {
        console.log('Host joined channel');
        setIsStreaming(true);
        setIsInitializing(false);
      });

      engine.addListener('onError', (err: any, msg: string) => {
        console.error('Agora error:', err, msg);
      });

      return engine;
    } catch (error) {
      console.error('Error initializing Agora:', error);
      setIsCameraReady(false);
      return null;
    }
  }, []);

  // Initialize camera preview on mount
  useEffect(() => {
    if (AGORA_AVAILABLE && !agoraEngineRef.current) {
      initAgoraEngine();
    }
    
    return () => {
      // Don't release engine on unmount if we're still streaming
      if (agoraEngineRef.current && !isStreaming) {
        agoraEngineRef.current.stopPreview();
        agoraEngineRef.current.release();
        agoraEngineRef.current = null;
      }
    };
  }, []);

  // Start streaming
  const handleGoLive = async () => {
    if (!streamTitle.trim()) {
      Alert.alert('Error', 'Please enter a stream title');
      return;
    }

    setIsInitializing(true);

    try {
      // Use existing engine or initialize new one
      let engine = agoraEngineRef.current;
      if (!engine && AGORA_AVAILABLE) {
        engine = await initAgoraEngine();
      }
      
      if (!engine) {
        // Demo mode - no Agora available
        console.log('Running in demo mode');
        setIsStreaming(true);
        setIsInitializing(false);
        return;
      }
      
      const channel = `live_${auth.currentUser?.uid}_${Date.now()}`;
      setChannelName(channel);

      // Create stream document in Firebase
      const streamRef = doc(db, 'liveStreams', channel);
      await setDoc(streamRef, {
        hostId: auth.currentUser?.uid,
        hostName: currentUser?.displayName || currentUser?.username || 'Anonymous',
        hostAvatar: currentUser?.avatar || currentUser?.profileImage || '',
        title: streamTitle,
        channelName: channel,
        viewerCount: 0,
        isLive: true,
        location: location,
        startedAt: serverTimestamp(),
      });

      // Set as broadcaster
      await engine.setClientRole(ClientRoleType?.ClientRoleBroadcaster);

      // Join channel
      await engine.joinChannel('', channel, auth.currentUser?.uid || 0, {
        clientRoleType: ClientRoleType?.ClientRoleBroadcaster,
        publishMicrophoneTrack: true,
      });

      // Listen to comments (limit to last 50 for performance)
      const commentsRef = collection(db, 'liveStreams', channel, 'comments');
      const commentsQuery = query(commentsRef, orderBy('timestamp', 'desc'));
      const unsubComments = onSnapshot(commentsQuery, (snapshot) => {
        const newComments = snapshot.docs.slice(0, 50).map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Comment[];
        setComments(newComments.reverse());
      });

      // Listen to viewers (limit to last 50 for performance)
      const viewersRef = collection(db, 'liveStreams', channel, 'viewers');
      const unsubViewers = onSnapshot(viewersRef, (snapshot) => {
        const viewersList = snapshot.docs.slice(0, 50).map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Viewer[];
        setViewers(viewersList);
        setViewerCount(viewersList.length);
      });

      // Cleanup listeners on unmount
      return () => {
        unsubComments();
        unsubViewers();
      };

    } catch (error) {
      logger.error('Error starting stream:', error);
      // Fallback to demo mode
      setIsStreaming(true);
      setIsInitializing(false);
    }
  };

  // End streaming
  const handleEndStream = async () => {
    Alert.alert(
      'End Stream',
      'Are you sure you want to end the live stream?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End',
          style: 'destructive',
          onPress: async () => {
            try {
              if (agoraEngineRef.current) {
                await agoraEngineRef.current.leaveChannel();
                agoraEngineRef.current.release();
                agoraEngineRef.current = null;
              }

              if (channelName) {
                await deleteDoc(doc(db, 'liveStreams', channelName));
              }

              setIsStreaming(false);
              router.back();
            } catch (error) {
              logger.error('Error ending stream:', error);
              router.back();
            }
          },
        },
      ]
    );
  };

  // Toggle mute
  const toggleMute = () => {
    if (agoraEngineRef.current) {
      agoraEngineRef.current.muteLocalAudioStream(!isMuted);
    }
    setIsMuted(!isMuted);
  };

  // Toggle camera
  const toggleCamera = () => {
    if (agoraEngineRef.current) {
      agoraEngineRef.current.enableLocalVideo(!isCameraOn);
    }
    setIsCameraOn(!isCameraOn);
  };

  // Switch camera
  const switchCamera = () => {
    if (agoraEngineRef.current) {
      agoraEngineRef.current.switchCamera();
    }
    setIsUsingFrontCamera(!isUsingFrontCamera);
  };

  // Send comment
  const handleSendComment = async () => {
    if (!newComment.trim()) return;

    if (channelName) {
      try {
        const commentsRef = collection(db, 'liveStreams', channelName, 'comments');
        await addDoc(commentsRef, {
          userId: auth.currentUser?.uid,
          userName: currentUser?.displayName || currentUser?.username || 'Anonymous',
          userAvatar: currentUser?.avatar || currentUser?.profileImage || '',
          text: newComment.trim(),
          timestamp: serverTimestamp(),
        });
      } catch (error) {
        logger.error('Error sending comment:', error);
      }
    }
    setNewComment('');
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (agoraEngineRef.current) {
        agoraEngineRef.current.leaveChannel();
        agoraEngineRef.current.release();
      }
    };
  }, []);

  // Pre-stream setup screen
  if (!isStreaming && !isInitializing) {
    return (
      <View style={styles.container}>
        {/* Camera Preview Background */}
        <View style={styles.previewContainer}>
          {AGORA_AVAILABLE && isCameraReady && RtcSurfaceView ? (
            <RtcSurfaceView
              style={styles.preview}
              canvas={{
                uid: 0,
                sourceType: VideoSourceType?.VideoSourceCamera,
                renderMode: RenderModeType?.RenderModeHidden, // Full screen, crops to fill
              }}
            />
          ) : (
            <View style={[styles.preview, { backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }]}> 
              {!isCameraReady && AGORA_AVAILABLE ? (
                <>
                  <ActivityIndicator size="large" color="#fff" />
                  <Text style={{ color: '#fff', marginTop: 10 }}>Starting camera...</Text>
                </>
              ) : (
                <Image
                  source={{ uri: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=800&q=60' }}
                  style={styles.preview}
                />
              )}
            </View>
          )}
        </View>

        {/* Setup Overlay */}
        <SafeAreaView style={styles.setupOverlay} edges={['top', 'bottom']}>
          {/* Header */}
          <View style={styles.setupHeader}>
            <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#000" />
            </TouchableOpacity>
            <Text style={styles.setupTitle}>Go Live</Text>
            <View style={{ width: 36 }} />
          </View>

          {/* Bottom Setup */}
          <View style={styles.setupBottom}>
            <View style={styles.titleInputContainer}>
              <TextInput
                style={styles.titleInput}
                placeholder="What's your stream about?"
                placeholderTextColor="rgba(255,255,255,0.6)"
                value={streamTitle}
                onChangeText={setStreamTitle}
                maxLength={100}
              />
            </View>

            <TouchableOpacity style={styles.goLiveBtn} onPress={handleGoLive}>
              <Text style={styles.goLiveBtnText}>GO LIVE</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // Full screen map view
  if (isMapFullScreen) {
    return (
      <View style={styles.container}>
        <MapView
          style={StyleSheet.absoluteFillObject}
          initialRegion={{
            ...getSafeCoordinate(location),
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
          showsUserLocation
          loadingEnabled={true}
          loadingIndicatorColor="#00c853"
          liteMode={false}
          cacheEnabled={true}
        >
          <Marker coordinate={getSafeCoordinate(location)}>
            <View style={styles.mapMarker}>
              <Image
                source={{ uri: currentUser?.avatar || currentUser?.profileImage || DEFAULT_AVATAR_URL }}
                style={styles.mapMarkerAvatar}
              />
            </View>
          </Marker>
        </MapView>

        {/* Top Header on Map */}
        <SafeAreaView style={styles.mapTopOverlay} edges={['top']}>
          <View style={styles.mapTopHeader}>
            <View style={styles.hostPill}>
              <Image
                source={{ uri: currentUser?.avatar || currentUser?.profileImage || DEFAULT_AVATAR_URL }}
                style={styles.hostAvatarSmall}
              />
              <Text style={styles.hostNameText}>{currentUser?.displayName || currentUser?.username || 'You'}</Text>
              <View style={styles.greenDot} />
            </View>
            
            <TouchableOpacity style={styles.endBtn} onPress={isInitializing ? undefined : handleEndStream} disabled={isInitializing}>
              {isInitializing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.endBtnText}>End</Text>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.sideCloseBtn} onPress={() => setIsMapFullScreen(false)}>
            <Ionicons name="close" size={18} color="#000" />
          </TouchableOpacity>
        </SafeAreaView>

        {/* Live Video PiP on Map */}
        <View style={styles.liveVideoPipMap}>
          {AGORA_AVAILABLE && isCameraReady && RtcSurfaceView ? (
            <RtcSurfaceView
              style={styles.pipImage}
              canvas={{
                uid: 0,
                sourceType: VideoSourceType?.VideoSourceCamera,
                renderMode: RenderModeType?.RenderModeHidden,
              }}
              zOrderMediaOverlay={true}
            />
          ) : (
            <View style={[styles.pipImage, { backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }]}>
              <ActivityIndicator size="small" color="#fff" />
            </View>
          )}
        </View>

        {/* Comments on Map - Always show */}
        <View style={styles.commentsContainerMap}>
          <FlatList
            data={safeComments}
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
          {showComments && (
            <View style={styles.inputRowMap}>
              <TextInput
                style={styles.inputFieldMap}
                value={newComment}
                onChangeText={setNewComment}
                placeholder="Send a message"
                placeholderTextColor="rgba(0,0,0,0.4)"
              />
              <TouchableOpacity onPress={handleSendComment}>
                <Ionicons name="send" size={20} color="#333" />
              </TouchableOpacity>
            </View>
          )}
          
          <View style={styles.bottomControlsRow}>
            <TouchableOpacity 
              style={[styles.controlBtn, isMuted && styles.controlBtnMuted]}
              onPress={toggleMute}
            >
              <Ionicons name={isMuted ? "mic-off" : "mic"} size={22} color={isMuted ? "#ff4444" : "#333"} />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.controlBtn} onPress={switchCamera}>
              <Ionicons name="camera-reverse-outline" size={22} color="#333" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.controlBtn, styles.controlBtnGreen]}
              onPress={() => setIsMapFullScreen(false)}
            >
              <Ionicons name="location" size={24} color="#fff" />
            </TouchableOpacity>
            
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

  // Main streaming UI
  return (
    <View style={styles.container}>
      {/* Video Background */}
      <View style={styles.videoContainer}>
        {AGORA_AVAILABLE && isCameraReady && RtcSurfaceView ? (
          <RtcSurfaceView
            style={styles.videoBackground}
            canvas={{
              uid: 0,
              sourceType: VideoSourceType?.VideoSourceCamera,
              renderMode: RenderModeType?.RenderModeHidden, // Full screen, crops to fill
            }}
            zOrderMediaOverlay={true}
          />
        ) : (
          <View style={[styles.videoBackground, { backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }]}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={{ color: '#fff', marginTop: 10 }}>Starting camera...</Text>
          </View>
        )}
      </View>

      {/* Top Header */}
      <SafeAreaView style={styles.topOverlay} edges={['top']}>
        <View style={styles.topHeader}>
          {/* Viewer Avatars + Count */}
          <View style={styles.viewerSection}>
            {safeViewers.length > 0 && (
              <View style={styles.viewerAvatars}>
                {safeViewers.slice(0, 3).map((viewer, index) => (
                  <Image
                    key={viewer.id || index}
                    source={{ uri: viewer.avatar || DEFAULT_AVATAR_URL }}
                    style={[styles.viewerAvatar, { marginLeft: index > 0 ? -8 : 0, zIndex: 3 - index }]}
                  />
                ))}
              </View>
            )}
            <Text style={styles.viewerCountText}>{viewerCount} {viewerCount === 1 ? 'Viewer' : 'Viewers'}</Text>
            {viewerCount > 0 && <View style={styles.greenDot} />}
          </View>

          {/* End Button */}
          <TouchableOpacity style={styles.endBtn} onPress={handleEndStream}>
            <Text style={styles.endBtnText}>End</Text>
          </TouchableOpacity>
        </View>

        {/* Host Name Pill */}
        <View style={styles.hostPill}>
          <Image
            source={{ uri: currentUser?.avatar || currentUser?.profileImage || DEFAULT_AVATAR_URL }}
            style={styles.hostAvatarSmall}
          />
          <Text style={styles.hostNameText}>{currentUser?.displayName || currentUser?.username || 'You'}</Text>
          <View style={styles.greenDot} />
        </View>
      </SafeAreaView>

      {/* Map Popup */}
      {showMap && !isMapFullScreen && (
        <View style={styles.mapPopup}>
          <TouchableOpacity 
            style={styles.mapPopupExpandBtn} 
            onPress={() => setIsMapFullScreen(true)}
          >
            <Ionicons name="expand-outline" size={14} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.mapPopupCloseBtn}
            onPress={() => setShowMap(false)}
          >
            <Ionicons name="close" size={14} color="#666" />
          </TouchableOpacity>
          <MapView
            style={styles.mapPopupView}
            initialRegion={{
              ...getSafeCoordinate(location),
              latitudeDelta: 0.02,
              longitudeDelta: 0.02,
            }}
            scrollEnabled={false}
            zoomEnabled={false}
            liteMode={true}
            loadingEnabled={true}
            loadingIndicatorColor="#00c853"
            cacheEnabled={true}
          >
            <Marker coordinate={getSafeCoordinate(location)}>
              <View style={styles.smallMarker} />
            </Marker>
          </MapView>
        </View>
      )}

      {/* Comments Section - Always show comments */}
      <View style={styles.commentsContainer}>
        <FlatList
          data={safeComments}
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

      {/* Bottom Controls */}
      <SafeAreaView style={styles.bottomOverlay} edges={['bottom']}>
        {/* Input Row - Only show when comment icon is ON */}
        {showComments && (
          <View style={styles.inputRow}>
            <TextInput
              style={styles.inputField}
              value={newComment}
              onChangeText={setNewComment}
              placeholder="Send a message"
              placeholderTextColor="rgba(255,255,255,0.5)"
              onSubmitEditing={handleSendComment}
            />
            <TouchableOpacity onPress={handleSendComment}>
              <Ionicons name="send" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        )}

        {/* Bottom Control Buttons */}
        <View style={styles.bottomControlsRow}>
          {/* Mic Toggle */}
          <TouchableOpacity 
            style={[styles.controlBtn, isMuted && styles.controlBtnMuted]}
            onPress={toggleMute}
          >
            <Ionicons name={isMuted ? "mic-off" : "mic"} size={22} color={isMuted ? "#ff4444" : "#333"} />
          </TouchableOpacity>
          
          {/* Switch Camera */}
          <TouchableOpacity style={styles.controlBtn} onPress={switchCamera}>
            <Ionicons name="camera-reverse-outline" size={22} color="#333" />
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 16,
    fontSize: 16,
  },
  
  // Preview/Setup Screen
  previewContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  preview: {
    width: '100%',
    height: '100%',
  },
  setupOverlay: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  setupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  setupTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  setupBottom: {
    paddingBottom: 20,
  },
  titleInputContainer: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
  },
  titleInput: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
  goLiveBtn: {
    backgroundColor: '#FF4757',
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: 'center',
  },
  goLiveBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },

  // Video Container
  videoContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    zIndex: 1,
  },
  videoBackground: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
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
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  endBtn: {
    backgroundColor: '#FF4757',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  endBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
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
  hostNameText: {
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

  // Comments
  commentsContainer: {
    position: 'absolute',
    bottom: 140,
    left: 16,
    right: 80,
    maxHeight: 160,
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

  // Bottom Controls
  bottomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  inputField: {
    flex: 1,
    fontSize: 15,
    color: '#fff',
    marginRight: 10,
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
  controlBtnMuted: {
    backgroundColor: 'rgba(255,68,68,0.2)',
    borderWidth: 1,
    borderColor: '#ff4444',
  },
  controlBtnGreen: {
    backgroundColor: '#00D26A',
  },
  floatingChatBtn: {
    position: 'absolute',
    bottom: 20,
    right: 16,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E88D94',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
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
  mapMarker: {
    alignItems: 'center',
  },
  mapMarkerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: '#00D26A',
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
  pipImage: {
    width: '100%',
    height: '100%',
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
