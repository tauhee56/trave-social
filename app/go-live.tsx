import React, { useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity, TextInput, FlatList, Alert, ActivityIndicator, Platform, PermissionsAndroid } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getCurrentUser } from '../lib/firebaseHelpers';
import { AGORA_CONFIG, generateChannelName, getAgoraToken } from '../config/agora';
import { db } from '../config/firebase';
import { collection, addDoc, doc, updateDoc, deleteDoc, onSnapshot, query, orderBy, serverTimestamp, increment, getDoc, setDoc } from 'firebase/firestore';
import { Camera, CameraView } from 'expo-camera';
import * as Location from 'expo-location';

// Default avatar from Firebase Storage
const DEFAULT_AVATAR_URL = 'https://firebasestorage.googleapis.com/v0/b/travel-app-3da72.firebasestorage.app/o/default%2Fdefault-pic.jpg?alt=media&token=7177f487-a345-4e45-9a56-732f03dbf65d';

// Use runtime requires for native modules so we can fallback gracefully
let RtcEngine: any = null;
let ChannelProfileType: any = null;
let ClientRoleType: any = null;
let VideoCanvas: any = null;
let AGORA_AVAILABLE = false;

try {
  const AgoraSDK = require('react-native-agora');
  RtcEngine = AgoraSDK.default?.createAgoraRtcEngine || AgoraSDK.createAgoraRtcEngine;
  ChannelProfileType = AgoraSDK.ChannelProfileType;
  ClientRoleType = AgoraSDK.ClientRoleType;
  VideoCanvas = AgoraSDK.VideoCanvas;
  AGORA_AVAILABLE = true;
} catch (e) {
  // Silently handle - we'll show UI message to user
  AGORA_AVAILABLE = false;
}

export default function GoLive() {
  const router = useRouter();
  const currentUser = getCurrentUser();
  
  const [input, setInput] = useState("");
  const [comments, setComments] = useState<any[]>([]);
  const [isLive, setIsLive] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [channelName, setChannelName] = useState('');
  const [isInitializing, setIsInitializing] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [liveStreamId, setLiveStreamId] = useState<string | null>(null);
  
  const engineRef = useRef<any>(null);
  const uidRef = useRef(Math.floor(Math.random() * 100000));

  useEffect(() => {
    if (!currentUser) {
      Alert.alert('Error', 'Please login to go live');
      router.back();
      return;
    }

    // Generate channel name for this stream
    const channel = generateChannelName(currentUser.uid);
    setChannelName(channel);

    // Request camera and microphone permissions
    requestPermissions();

    return () => {
      // Cleanup on unmount
      stopLiveStream();
    };
  }, []);

  const requestPermissions = async () => {
    try {
      if (Platform.OS === 'android') {
        const cameraGranted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Camera Permission',
            message: 'This app needs access to your camera for live streaming',
            buttonPositive: 'OK',
          }
        );
        const audioGranted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Microphone Permission',
            message: 'This app needs access to your microphone for live streaming',
            buttonPositive: 'OK',
          }
        );
        
        if (cameraGranted !== PermissionsAndroid.RESULTS.GRANTED || 
            audioGranted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert('Permissions Required', 'Camera and microphone permissions are required for live streaming');
        }
      } else {
        const { status: cameraStatus } = await Camera.requestCameraPermissionsAsync();
        const { status: audioStatus } = await Camera.requestMicrophonePermissionsAsync();
        
        if (cameraStatus !== 'granted' || audioStatus !== 'granted') {
          Alert.alert('Permissions Required', 'Camera and microphone permissions are required for live streaming');
        }
      }
    } catch (error) {
      console.warn('Permission request error:', error);
    }
  };

  // Subscribe to live stream comments and viewer count
  useEffect(() => {
    if (!liveStreamId) return;

    // Subscribe to comments
    const commentsRef = collection(db, 'liveStreams', liveStreamId, 'comments');
    const commentsQuery = query(commentsRef, orderBy('createdAt', 'asc'));
    
    const unsubComments = onSnapshot(commentsQuery, (snapshot) => {
      const newComments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setComments(newComments);
    });

    // Subscribe to viewer count
    const streamRef = doc(db, 'liveStreams', liveStreamId);
    const unsubStream = onSnapshot(streamRef, (snapshot) => {
      if (snapshot.exists()) {
        setViewerCount(snapshot.data()?.viewerCount || 0);
      }
    });

    return () => {
      unsubComments();
      unsubStream();
    };
  }, [liveStreamId]);

  const initializeAgora = async () => {
    if (!currentUser) {
      Alert.alert('Error', 'Please login to go live');
      return false;
    }
    
    if (!AGORA_AVAILABLE) {
      Alert.alert(
        'Live Streaming Unavailable', 
        'This feature requires a development build. Run:\nnpx expo run:android\nor\nnpx expo run:ios',
        [{ text: 'OK' }]
      );
      return false;
    }

    try {
      setIsInitializing(true);
      
      // Create live stream document in Firebase
      const streamData = {
        userId: currentUser.uid,
        userName: currentUser.displayName || 'User',
        userAvatar: currentUser.photoURL || DEFAULT_AVATAR_URL,
        channelName: channelName,
        startedAt: serverTimestamp(),
        viewerCount: 0,
        isLive: true,
      };
      
      const streamRef = await addDoc(collection(db, 'liveStreams'), streamData);
      setLiveStreamId(streamRef.id);
      
      // Create Agora engine instance
      const engine = RtcEngine();
      engineRef.current = engine;

      // Initialize the engine
      await engine.initialize({
        appId: AGORA_CONFIG.appId,
        channelProfile: ChannelProfileType.ChannelProfileLiveBroadcasting,
      });

      // Enable video
      await engine.enableVideo();
      
      // Set client role as broadcaster
      await engine.setClientRole(ClientRoleType.ClientRoleBroadcaster);

      // Get token (null for development, or from your token server for production)
      const token = await getAgoraToken(channelName, uidRef.current);

      // Join channel
      await engine.joinChannel(token, channelName, uidRef.current, {
        clientRoleType: ClientRoleType.ClientRoleBroadcaster,
      });

      // Start preview
      await engine.startPreview();

      setIsLive(true);
      setIsInitializing(false);
      
      return true;
    } catch (error: any) {
      console.error('Error initializing Agora:', error);
      Alert.alert('Error', 'Failed to start live stream: ' + (error?.message || 'Unknown error'));
      setIsInitializing(false);
      return false;
    }
  };

  const stopLiveStream = async () => {
    if (engineRef.current) {
      try {
        await engineRef.current.leaveChannel();
        await engineRef.current.stopPreview();
        engineRef.current.release();
        engineRef.current = null;
      } catch (error) {
        console.error('Error stopping stream:', error);
      }
    }
    
    // Update Firebase document
    if (liveStreamId) {
      try {
        const streamRef = doc(db, 'liveStreams', liveStreamId);
        await updateDoc(streamRef, {
          isLive: false,
          endedAt: serverTimestamp()
        });
        
        // Optionally delete after some time or keep for analytics
        // await deleteDoc(streamRef);
      } catch (error) {
        console.error('Error updating stream:', error);
      }
    }
    
    setIsLive(false);
    setLiveStreamId(null);
  };

  const handleGoLive = async () => {
    if (isLive) {
      // Stop streaming
      await stopLiveStream();
      Alert.alert('Stream Ended', 'Your live stream has ended', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } else {
      // Start streaming
      const success = await initializeAgora();
      if (success) {
        Alert.alert('Live', 'You are now live!');
      }
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !liveStreamId || !isLive || !currentUser) return;
    
    try {
      const commentsRef = collection(db, 'liveStreams', liveStreamId, 'comments');
      await addDoc(commentsRef, {
        userId: currentUser.uid,
        userName: currentUser.displayName || 'User',
        userAvatar: currentUser.photoURL || DEFAULT_AVATAR_URL,
        text: input.trim(),
        createdAt: serverTimestamp()
      });
      setInput("");
    } catch (error) {
      console.error('Error sending comment:', error);
      Alert.alert('Error', 'Failed to send comment');
    }
  };

  return (
    <View style={styles.container}>
      {/* Full Screen Video Background */}
      <View style={styles.videoContainer}>
        {!AGORA_AVAILABLE ? (
          <Image 
            source={{ uri: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=60' }} 
            style={styles.videoBackground}
          />
        ) : isInitializing ? (
          <View style={styles.videoBackground}>
            <ActivityIndicator size="large" color="#fff" />
          </View>
        ) : isLive ? (
          <CameraView style={styles.videoBackground} facing="back">
            <View style={{ flex: 1, backgroundColor: 'transparent' }} />
          </CameraView>
        ) : (
          <Image 
            source={{ uri: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=60' }} 
            style={styles.videoBackground}
          />
        )}
        
        {/* Dark overlay */}
        <View style={styles.overlay} />
      </View>

      {/* Top Header with User Info */}
      <SafeAreaView style={styles.topOverlay} edges={["top"]}>
        <View style={styles.topHeader}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          
          <View style={styles.userInfo}>
            <Image source={{ uri: currentUser?.photoURL || DEFAULT_AVATAR_URL }} style={styles.avatar} />
            <View style={styles.userDetails}>
              <Text style={styles.username}>{currentUser?.displayName || 'User'}</Text>
              {isLive && (
                <View style={styles.liveIndicator}>
                  <View style={styles.liveBadge}>
                    <Text style={styles.liveText}>LIVE</Text>
                  </View>
                  <Text style={styles.viewerCount}>{viewerCount} viewers</Text>
                </View>
              )}
            </View>
          </View>

          <TouchableOpacity onPress={() => {
            if (isLive) {
              Alert.alert('End Stream', 'Are you sure?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'End', style: 'destructive', onPress: () => { stopLiveStream(); router.back(); } }
              ]);
            } else {
              router.back();
            }
          }} style={styles.closeButton}>
            <Text style={styles.closeIcon}>×</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Comments Section - Scrollable */}
      <View style={styles.commentsContainer}>
        <FlatList
          data={comments}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.commentBubble}>
              <Text style={styles.commentUsername}>{item.userName || 'User'}</Text>
              <Text style={styles.commentText}>{item.text}</Text>
            </View>
          )}
        />
      </View>

      {/* Bottom Controls */}
      <SafeAreaView style={styles.bottomOverlay} edges={["bottom"]}>
        {/* Map View (Expandable) */}
        {showMap && (
          <View style={styles.mapContainer}>
            <View style={styles.mapHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="location" size={20} color="#ff0000" style={{ marginRight: 6 }} />
                <Text style={styles.mapTitle}>Enable location to show map</Text>
              </View>
              <TouchableOpacity onPress={() => setShowMap(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <View style={styles.mapPlaceholder}>
              <Ionicons name="map" size={48} color="#ccc" />
              <Text style={styles.mapText}>Location services required</Text>
            </View>
          </View>
        )}

        {/* Bottom Action Buttons */}
        <View style={styles.bottomActions}>
          <TouchableOpacity style={styles.actionButton} onPress={() => setShowMap(!showMap)}>
            <Ionicons name="map-outline" size={28} color="#fff" />
            <Text style={styles.actionLabel}>Map</Text>
          </TouchableOpacity>

          {/* Center Go Live Button */}
          {!isLive ? (
            <TouchableOpacity style={styles.goLiveButton} onPress={handleGoLive}>
              <View style={styles.goLiveInner}>
                <Ionicons name="radio-outline" size={36} color="#fff" />
              </View>
              <Text style={styles.goLiveLabel}>Go Live</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.endLiveButton} onPress={() => {
              Alert.alert('End Stream', 'Stop streaming?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'End', style: 'destructive', onPress: stopLiveStream }
              ]);
            }}>
              <View style={styles.endLiveInner}>
                <Ionicons name="stop" size={28} color="#fff" />
              </View>
              <Text style={styles.endLiveLabel}>End</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="ellipsis-horizontal" size={28} color="#fff" />
            <Text style={styles.actionLabel}>Options</Text>
          </TouchableOpacity>
        </View>

        {/* Comment Input */}
        <View style={styles.commentInput}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder={isLive ? "Add a comment..." : "Go live to comment"}
            placeholderTextColor="rgba(255,255,255,0.5)"
            editable={isLive}
            onSubmitEditing={handleSend}
          />
          <TouchableOpacity 
            style={[styles.sendButton, !isLive && styles.sendButtonDisabled]} 
            onPress={handleSend}
            disabled={!isLive}
          >
            <Ionicons name="send" size={18} color="#fff" />
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
  videoContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  videoBackground: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 28,
    color: '#fff',
    fontWeight: '300',
  },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#333',
    marginRight: 10,
  },
  userDetails: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveBadge: {
    backgroundColor: '#ff0000',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginRight: 8,
  },
  liveText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  viewerCount: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '500',
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeIcon: {
    fontSize: 36,
    color: '#fff',
    fontWeight: '300',
    lineHeight: 36,
  },
  commentsContainer: {
    position: 'absolute',
    bottom: 200,
    left: 16,
    right: 16,
    maxHeight: 250,
    zIndex: 5,
  },
  commentBubble: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 8,
    alignSelf: 'flex-start',
    maxWidth: '85%',
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
  bottomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  mapContainer: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginBottom: 8,
    overflow: 'hidden',
  },
  mapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  mapTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#222',
  },
  mapPlaceholder: {
    height: 200,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapText: {
    fontSize: 16,
    color: '#999',
  },
  bottomActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  actionButton: {
    alignItems: 'center',
    padding: 8,
  },
  actionLabel: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  goLiveButton: {
    alignItems: 'center',
  },
  goLiveInner: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#ff0000',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  goLiveLabel: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '700',
    marginTop: 6,
  },
  endLiveButton: {
    alignItems: 'center',
  },
  endLiveInner: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#fff',
  },
  endLiveLabel: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '700',
    marginTop: 6,
  },
  commentInput: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: '#fff',
    marginRight: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007aff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#555',
    opacity: 0.5,
  },
});
