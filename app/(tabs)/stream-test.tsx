import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
// @ts-ignore
import { ZEEGOCLOUD_CONFIG } from '../../config/zeegocloud';
import ZeegocloudStreamingService from '../../services/implementations/ZeegocloudStreamingService';

export default function TestViewer() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const channelRef = useRef<string>(params.channel as string || 'test');
  const [logs, setLogs] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [remoteBroadcaster, setRemoteBroadcaster] = useState<number | null>(null);
  const [streamReceived, setStreamReceived] = useState(false);
  const serviceRef = useRef<ZeegocloudStreamingService | null>(null);

  const addLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] ${msg}`);
    setLogs(prev => [...prev.slice(-49), `[${timestamp}] ${msg}`]);
  };

  const joinAsViewer = async () => {
    if (isJoining) {
      addLog('⚠️ Already joining, skipping...');
      return;
    }

    setIsJoining(true);

    try {
      addLog('🔄 Initializing Zeegocloud viewer...');

      const service = ZeegocloudStreamingService.getInstance();
      serviceRef.current = service;

      const viewerId = Math.floor(Math.random() * 100000);
      const roomId = channelRef.current;

      addLog(`📡 Joining room: ${roomId} with ID: ${viewerId}`);

      // Setup event listeners
      service.on('onConnected', () => {
        addLog('✅ Viewer connected to Zeegocloud');
        setIsConnected(true);
      });

      service.on('onDisconnected', () => {
        addLog('🔌 Viewer disconnected');
        setIsConnected(false);
      });

      service.on('onUserJoined', (data: any) => {
        addLog(`🔥🔥🔥 BROADCASTER JOINED! UID: ${data.userId}`);
        setRemoteBroadcaster(data.userId);
        setStreamReceived(true);
      });

      service.on('onUserLeft', (data: any) => {
        addLog(`👋 Broadcaster left: ${data.userId}`);
        if (data.userId === remoteBroadcaster) {
          setRemoteBroadcaster(null);
          setStreamReceived(false);
        }
      });

      service.on('onStreamStarted', () => {
        addLog('🎬 Stream started');
        setStreamReceived(true);
      });

      service.on('onError', (error: any) => {
        addLog(`❌ Error: ${error.message}`);
      });

      // Initialize connection
      const initialized = await service.initialize(String(viewerId), roomId);

      if (!initialized) {
        throw new Error('Failed to initialize connection');
      }

      addLog('✅ Initialized successfully');

      // Join as viewer
      const joined = await service.joinAsViewer();
      if (!joined) {
        throw new Error('Failed to join as viewer');
      }

      addLog('✅ Joined as viewer');
      setIsJoining(false);

      // Wait 15 seconds for broadcaster detection
      let waitTime = 0;
      const waitInterval = setInterval(() => {
        waitTime += 1000;
        if (waitTime > 15000) {
          clearInterval(waitInterval);
          if (!streamReceived) {
            addLog('⚠️ Broadcaster not detected after 15 seconds');
          }
        }
      }, 1000);
    } catch (error) {
      addLog(`❌ Error: ${String(error)}`);
      setIsJoining(false);
    }
  };

  const leaveChannel = async () => {
    try {
      if (serviceRef.current) {
        await serviceRef.current.disconnect();
      }
      setIsConnected(false);
      setIsJoining(false);
      setRemoteBroadcaster(null);
      setStreamReceived(false);
      addLog('👋 Left channel');
    } catch (e) {
      addLog(`❌ Leave error: ${String(e)}`);
    }
  };

  useEffect(() => {
    const finalChannel = params.channel as string || 'test';
    channelRef.current = finalChannel;
    addLog('🎬 Test Viewer initialized');
    addLog(`📡 Channel: ${finalChannel}`);

    return () => {
      leaveChannel();
    };
  }, [params.channel]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Test Viewer (Zeegocloud)</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.statusBox}>
        <Text style={styles.statusLabel}>Connection Status</Text>
        <Text style={[styles.statusValue, { color: isConnected ? '#4CAF50' : '#999' }]}>
          {isConnected ? '✅ Connected' : '⚪ Disconnected'}
        </Text>

        <Text style={[styles.statusLabel, { marginTop: 12 }]}>Broadcaster Status</Text>
        <Text style={[styles.statusValue, { color: streamReceived ? '#4CAF50' : '#FF6B00' }]}>
          {streamReceived ? '🎉 DETECTED!' : '⏳ Waiting...'}
        </Text>

        {remoteBroadcaster && (
          <Text style={styles.broadcasterInfo}>Broadcaster UID: {remoteBroadcaster}</Text>
        )}
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.button, isJoining && styles.buttonDisabled]}
          onPress={joinAsViewer}
          disabled={isJoining}
        >
          {isJoining ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Ionicons name="play" size={20} color="white" />
              <Text style={styles.buttonText}>Join & Listen</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#FF6B00' }]}
          onPress={leaveChannel}
        >
          <Ionicons name="stop" size={20} color="white" />
          <Text style={styles.buttonText}>Leave</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.logsSection}>
        <Text style={styles.logsTitle}>📋 Diagnostic Logs</Text>
        <ScrollView style={styles.logsList}>
          {logs.length === 0 ? (
            <Text style={styles.noLogsText}>No logs yet...</Text>
          ) : (
            logs.map((log, idx) => (
              <Text key={idx} style={styles.logText}>
                {log}
              </Text>
            ))
          )}
        </ScrollView>
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>ℹ️ How to Test:</Text>
        <Text style={styles.infoText}>1. Go back and start a broadcast (GO LIVE)</Text>
        <Text style={styles.infoText}>2. Come back to this screen</Text>
        <Text style={styles.infoText}>3. Tap "Join & Listen"</Text>
        <Text style={styles.infoText}>4. Wait for broadcaster detection</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statusBox: {
    margin: 16,
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  broadcasterInfo: {
    marginTop: 12,
    fontSize: 12,
    color: '#999',
    fontFamily: 'monospace',
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  logsSection: {
    flex: 1,
    margin: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  logsTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0F0',
    marginBottom: 8,
  },
  logsList: {
    flex: 1,
  },
  logText: {
    fontSize: 11,
    color: '#0F0',
    fontFamily: 'monospace',
    marginBottom: 2,
  },
  noLogsText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
  },
  infoBox: {
    margin: 16,
    padding: 12,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1565C0',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 12,
    color: '#0D47A1',
    marginBottom: 4,
  },
});
