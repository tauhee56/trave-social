/**
 * ZeegoCloud Live Streaming Host Component
 * For broadcasters to start live streams
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, ActivityIndicator, Platform } from 'react-native';

interface ZeegocloudLiveHostProps {
  roomID: string;
  userID: string;
  userName: string;
  onLeave?: () => void;
}

export default function ZeegocloudLiveHost({
  roomID,
  userID,
  userName,
  onLeave
}: ZeegocloudLiveHostProps) {
  const [ZegoComponent, setZegoComponent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        setError(err.message || 'Failed to load live streaming');
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

  if (!ZegoComponent) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>⚠️ Live streaming component failed to load</Text>
        <Text style={styles.errorSubtext}>Make sure you're using a native build or custom dev client</Text>
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
});

