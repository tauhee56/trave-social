import { Ionicons } from '@expo/vector-icons';
import { Camera } from 'expo-camera';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { addDoc, collection, doc, onSnapshot, orderBy, query, serverTimestamp } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from "react";
import { Alert, Dimensions, FlatList, Image, KeyboardAvoidingView, PermissionsAndroid, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
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

  const engineRef = useRef<any>(null);
  const uidRef = useRef(Math.floor(Math.random() * 100000));

  useEffect(() => {
    if (!currentUser || !streamId || !channelName) {
      setComments([]);
      setViewers([]);
      setViewerCount(0);
      return;
    }

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
      if (!AGORA_AVAILABLE) return;

      setIsInitializing(true);
      
      // Request audio permissions for viewer (mic optional, but needed if they want to speak)
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          PermissionsAndroid.PERMISSIONS.CAMERA,
        ]);
        console.log('Permissions:', granted);
      } else {
        await Camera.requestCameraPermissionsAsync();
      }
      
      await joinLiveStream(streamId as string, currentUser!.uid);

      const engine = RtcEngine();
      engineRef.current = engine;

      await engine.initialize({
        appId: AGORA_CONFIG.appId,
        channelProfile: ChannelProfileType.ChannelProfileLiveBroadcasting,
      });

      await engine.enableVideo();
      await engine.setClientRole(ClientRoleType.ClientRoleAudience);

      engine.addListener('onUserJoined', (_connection: any, uid: number) => {
        console.log('Remote user joined:', uid);
        setRemoteUid(uid);
      });

      engine.addListener('onUserOffline', (_connection: any, uid: number) => {
        console.log('Remote user left:', uid);
        setRemoteUid(null);
      });

      const token = await getAgoraToken(channelName as string, uidRef.current);

      await engine.joinChannel(token, channelName as string, uidRef.current, {
        clientRoleType: ClientRoleType.ClientRoleAudience,
      });

      setIsJoined(true);
      setIsInitializing(false);
    } catch (error: any) {
      console.error('Error joining stream:', error);
      setIsInitializing(false);
    }
  };

  const cleanup = async () => {
    if (engineRef.current) {
      try {
        await engineRef.current.leaveChannel();
        engineRef.current.release();
        engineRef.current = null;
      } catch (error) {
        console.error('Error cleaning up:', error);
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

  // Full screen map view
  if (isMapFullScreen) {
    const hasLocation = streamData?.location && typeof streamData.location.latitude === 'number' && typeof streamData.location.longitude === 'number';
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
          <View style={[styles.videoBackground, { justifyContent: 'center', alignItems: 'center' }]}>
            <Text style={{ color: '#fff', fontSize: 16 }}>Waiting for live video...</Text>
          </View>
        )}
      </View>

      {/* Comments Section - Always show comments */}
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

      {/* Bottom Controls */}
      {showComments && (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
          style={{ position: 'absolute', left: 0, right: 0, bottom: 100, width: '100%' }} // 100px above bottom for more space above icons
        >
          <View style={styles.inputRow}>
            <TextInput
              style={styles.inputField}
              value={input}
              onChangeText={setInput}
              placeholder="Send a message"
              placeholderTextColor="rgba(255,255,255,0.5)"
              onSubmitEditing={handleSend}
            />
            <TouchableOpacity onPress={handleSend}>
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
            onPress={() => setShowSelfCamera(!showSelfCamera)}
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

