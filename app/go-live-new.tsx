/**
 * Go Live Screen - Simplified with ZeegoCloud UIKit
 */

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { generateRoomId } from '../config/zeegocloud';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ZeegocloudLiveHost from './_components/ZeegocloudLiveHost';

const { width } = Dimensions.get('window');

export default function GoLive() {
  const router = useRouter();
  
  const [streamTitle, setStreamTitle] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [roomId, setRoomId] = useState('');
  const [userId, setUserId] = useState('');
  const [userName, setUserName] = useState('');

  const handleStartStream = async () => {
    if (!streamTitle.trim()) {
      Alert.alert('Error', 'Please enter a stream title');
      return;
    }

    try {
      setIsInitializing(true);

      // Get user info
      const storedUserId = await AsyncStorage.getItem('userId');
      const storedUserName = await AsyncStorage.getItem('userName') || 'Anonymous';
      
      if (!storedUserId) {
        Alert.alert('Error', 'Please login first');
        router.back();
        return;
      }

      // Generate room ID
      const newRoomId = generateRoomId(storedUserId);
      
      setUserId(storedUserId);
      setUserName(storedUserName);
      setRoomId(newRoomId);
      setIsStreaming(true);

      console.log('🎬 Starting stream:', { roomId: newRoomId, userId: storedUserId });
    } catch (error) {
      console.error('❌ Start stream error:', error);
      Alert.alert('Error', 'Failed to start stream');
    } finally {
      setIsInitializing(false);
    }
  };

  const handleEndStream = () => {
    Alert.alert(
      'End Stream',
      'Are you sure you want to end this live stream?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End',
          style: 'destructive',
          onPress: () => {
            setIsStreaming(false);
            setRoomId('');
            router.back();
          },
        },
      ]
    );
  };

  if (isStreaming && roomId) {
    return (
      <ZeegocloudLiveHost
        roomID={roomId}
        userID={userId}
        userName={userName}
        onLeave={handleEndStream}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Go Live</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="videocam" size={80} color="#FF385C" />
        </View>

        <Text style={styles.title}>Start Your Live Stream</Text>
        <Text style={styles.subtitle}>
          Share your moments with your followers in real-time
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Stream Title"
          placeholderTextColor="#999"
          value={streamTitle}
          onChangeText={setStreamTitle}
          maxLength={100}
        />

        <TouchableOpacity
          style={[styles.startButton, isInitializing && styles.startButtonDisabled]}
          onPress={handleStartStream}
          disabled={isInitializing}
        >
          {isInitializing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="radio" size={24} color="#fff" style={{ marginRight: 10 }} />
              <Text style={styles.startButtonText}>Start Live Stream</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 56, 92, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  input: {
    width: '100%',
    height: 50,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#fff',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#333',
  },
  startButton: {
    width: '100%',
    height: 56,
    backgroundColor: '#FF385C',
    borderRadius: 28,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF385C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  startButtonDisabled: {
    opacity: 0.6,
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
});

