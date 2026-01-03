/**
 * ZeegoCloud Live Streaming Host Component
 * For broadcasters to start live streams
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Text, ActivityIndicator, Platform } from 'react-native';
import { Camera } from 'expo-camera';

interface ZeegocloudLiveHostProps {
  roomID: string;
  userID: string;
  userName: string;
  onLeave?: () => void;
  isCameraOn?: boolean;
  isMuted?: boolean;
  isUsingFrontCamera?: boolean;
}

export default function ZeegocloudLiveHost({
  roomID,
  userID,
  userName,
  onLeave,
  isCameraOn = true,
  isMuted = false,
  isUsingFrontCamera = true,
}: ZeegocloudLiveHostProps) {
  const [ZegoComponent, setZegoComponent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [useFallbackCamera, setUseFallbackCamera] = useState(false);
  const cameraRef = useRef<Camera>(null);

  // Update camera type based on prop (using string values for expo-camera)
  const cameraType = isUsingFrontCamera ? 'front' : 'back';

  useEffect(() => {
    // Lazy load Zegocloud only when component is mounted
    const loadZego = async () => {
      try {
        // Only load on native platforms
        if (Platform.OS === 'web') {
          setError('Live streaming is not supported on web');
          setLoading(false);
          return;
        }

        let ZegoUIKitPrebuiltLiveStreaming: any;
        let HOST_DEFAULT_CONFIG: any;
        
        try {
          const zegoModule = await import('@zegocloud/zego-uikit-prebuilt-live-streaming-rn');
          ZegoUIKitPrebuiltLiveStreaming = zegoModule.ZegoUIKitPrebuiltLiveStreaming;
          HOST_DEFAULT_CONFIG = zegoModule.HOST_DEFAULT_CONFIG;
        } catch (zegoErr: any) {
          console.warn('Zego SDK not available:', zegoErr.message);
          setError('Live streaming SDK not available. Please use a custom dev client or native build.');
          setLoading(false);
          return;
        }

        const { ZEEGOCLOUD_CONFIG } = await import('../../config/zeegocloud');

        if (!ZegoUIKitPrebuiltLiveStreaming) {
          setError('Live streaming component not found');
          setLoading(false);
          return;
        }

        const Component = () => (
          <ZegoUIKitPrebuiltLiveStreaming
            appID={ZEEGOCLOUD_CONFIG.appID}
            appSign={ZEEGOCLOUD_CONFIG.appSign}
            userID={userID}
            userName={userName}
            liveID={roomID}

            config={{
              ...HOST_DEFAULT_CONFIG,
              // Enable camera and audio by default
              turnOnCameraWhenJoining: true,
              turnOnMicrophoneWhenJoining: true,
              useFrontFacingCamera: true,

              // Video quality settings
              videoResolutionDefault: 'MEDIUM', // 360p

              // Enable all controls
              bottomMenuBarConfig: {
                hostButtons: ['toggleCameraButton', 'toggleMicrophoneButton', 'switchCameraButton', 'beautyButton'],
                coHostButtons: ['toggleCameraButton', 'toggleMicrophoneButton', 'switchCameraButton'],
                audienceButtons: [],
                maxCount: 5,
                showInRoomMessageButton: true,
              },

              // Top menu bar config
              topMenuBarConfig: {
                isVisible: true,
                buttons: ['minimizingButton', 'leaveButton'],
              },

              // Member list config
              memberListConfig: {
                showMicrophoneState: true,
                showCameraState: true,
              },

              // Callbacks
              onLeaveLiveStreaming: () => {
                console.log('🔴 Host left live stream');
                onLeave?.();
              },
              onLiveStreamingEnded: () => {
                console.log('⏹️ Live stream ended');
                onLeave?.();
              },
            }}
          />
        );

        setZegoComponent(() => Component);
        setLoading(false);
      } catch (err: any) {
        console.error('Failed to load Zegocloud:', err);
        console.warn('⚠️ ZegoCloud native module not available, using fallback camera');
        // Use fallback camera instead of showing error
        setUseFallbackCamera(true);
        setLoading(false);
      }
    };

    loadZego();
  }, [roomID, userID, userName, onLeave]);

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading live stream...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>⚠️ {error}</Text>
        <Text style={styles.errorSubtext}>Please try again later</Text>
      </View>
    );
  }

  // Use fallback camera if ZegoCloud failed to load
  if (useFallbackCamera || !ZegoComponent) {
    return (
      <View style={styles.container}>
        {isCameraOn ? (
          <Camera
            ref={cameraRef}
            style={styles.camera}
            type={cameraType}
          >
            <View style={styles.fallbackOverlay}>
              <Text style={styles.fallbackText}>📹 Live Stream</Text>
              <Text style={styles.fallbackSubtext}>
                {useFallbackCamera
                  ? 'Camera Active • Using Expo Camera'
                  : 'Connecting...'}
              </Text>
              {isMuted && (
                <View style={styles.mutedBadge}>
                  <Text style={styles.mutedText}>🔇 Muted</Text>
                </View>
              )}
            </View>
          </Camera>
        ) : (
          <View style={[styles.container, styles.centered]}>
            <Text style={styles.cameraOffText}>📷 Camera Off</Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ZegoComponent />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 16,
    fontSize: 16,
  },
  errorText: {
    color: '#ff4444',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  errorSubtext: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 20,
  },
  camera: {
    flex: 1,
  },
  fallbackOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  fallbackText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  fallbackSubtext: {
    color: '#ccc',
    fontSize: 14,
    textAlign: 'center',
  },
  mutedBadge: {
    marginTop: 16,
    backgroundColor: 'rgba(255, 68, 68, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  mutedText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  cameraOffText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
});

