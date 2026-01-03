import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, ActivityIndicator, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiService } from '../../app/_services/apiService';
import { getUserStories } from '../../lib/firebaseHelpers';
import AddStoriesToHighlightModal from './AddStoriesToHighlightModal';

interface CreateHighlightModalProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
  onSuccess?: () => void;
}

interface Story {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  imageUrl: string;
  videoUrl?: string;
  mediaType?: 'image' | 'video';
  createdAt: any;
  views?: string[];
  likes?: string[];
}

export default function CreateHighlightModal({ visible, onClose, userId, onSuccess }: CreateHighlightModalProps) {
  const [name, setName] = useState('');
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [highlightCreated, setHighlightCreated] = useState(false);
  const [createdHighlightId, setCreatedHighlightId] = useState<string | null>(null);
  const [stories, setStories] = useState<Story[]>([]);
  const [showAddStories, setShowAddStories] = useState(false);
  const [loadingStories, setLoadingStories] = useState(false);

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]?.uri) {
        const uri = result.assets[0].uri;
        console.log('📸 Image picked:', uri);
        setCoverImage(uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const fetchUserStories = async () => {
    try {
      setLoadingStories(true);
      const res = await getUserStories(userId);
      if (res && Array.isArray(res)) {
        setStories(res);
      } else if (res?.success && Array.isArray(res.stories)) {
        setStories(res.stories);
      }
    } catch (error) {
      console.error('Failed to fetch stories:', error);
      setStories([]);
    } finally {
      setLoadingStories(false);
    }
  };

  const handleCreateHighlight = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a highlight name');
      return;
    }

    if (!coverImage) {
      Alert.alert('Error', 'Please select a cover image');
      return;
    }

    setLoading(true);
    try {
      // For now, use simple JSON without file upload
      // Backend will handle image URL if needed
      const response = await apiService.post(`/users/${userId}/highlights`, {
        title: name.trim(),
        coverImage: coverImage,  // Send URI as-is for now
      });
      
      if (response.success || response.data) {
        const highlightId = response.data?._id || response.data?.id;
        setCreatedHighlightId(highlightId);
        setHighlightCreated(true);
        
        // Fetch user stories for adding
        await fetchUserStories();
        
        // Show option to add stories
        Alert.alert(
          'Highlight Created',
          'Would you like to add stories to this highlight?',
          [
            { text: 'Maybe Later', onPress: finishCreating },
            { text: 'Add Stories', onPress: () => setShowAddStories(true) },
          ]
        );
      } else {
        throw new Error('Backend response was not successful');
      }
    } catch (error: any) {
      console.warn('⚠️ Backend highlight creation failed, saving locally:', error.message);
      
      try {
        // Create a local highlight object
        const localHighlight = {
          _id: `local_${Date.now()}`,
          title: name.trim(),
          coverImage: coverImage,
          stories: [],
          createdAt: new Date().toISOString(),
          isLocal: true,
        };
        
        // Save to AsyncStorage
        const existingHighlights = JSON.parse(await AsyncStorage.getItem('localHighlights') || '[]');
        existingHighlights.push(localHighlight);
        await AsyncStorage.setItem('localHighlights', JSON.stringify(existingHighlights));
        
        console.log('✅ Highlight saved locally:', localHighlight._id);
        Alert.alert('Success', 'Highlight created (saved locally)');
        resetForm();
        onClose();
        if (onSuccess) {
          onSuccess();
        }
      } catch (storageError: any) {
        console.error('Storage error:', storageError);
        Alert.alert('Error', 'Failed to save highlight: ' + storageError.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const finishCreating = () => {
    Alert.alert('Success', 'Highlight created successfully');
    resetForm();
    onClose();
    if (onSuccess) {
      onSuccess();
    }
  };

  const resetForm = () => {
    setName('');
    setCoverImage(null);
  };

  const handleClose = () => {
    resetForm();
    setHighlightCreated(false);
    setCreatedHighlightId(null);
    setShowAddStories(false);
    onClose();
  };

  if (highlightCreated && createdHighlightId) {
    return (
      <>
        <AddStoriesToHighlightModal
          visible={showAddStories}
          onClose={() => {
            setShowAddStories(false);
            finishCreating();
          }}
          highlightId={createdHighlightId}
          stories={stories}
          onStoryAdded={finishCreating}
        />
      </>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.title}>Create Highlight</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Cover Image Section */}
          <TouchableOpacity
            style={[styles.coverImageContainer, !coverImage && styles.coverImagePlaceholder]}
            onPress={handlePickImage}
            disabled={loading}
          >
            {coverImage ? (
              <>
                <Image
                  source={{ uri: coverImage }}
                  style={styles.coverImage}
                />
                <View style={styles.changeImageOverlay}>
                  <Ionicons name="camera" size={24} color="#fff" />
                  <Text style={styles.changeImageText}>Change</Text>
                </View>
              </>
            ) : (
              <View style={styles.placeholderContent}>
                <Ionicons name="image-outline" size={48} color="#999" />
                <Text style={styles.placeholderText}>Tap to select cover image</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Name Input */}
          <View style={styles.section}>
            <Text style={styles.label}>Highlight Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter highlight name"
              placeholderTextColor="#999"
              value={name}
              onChangeText={setName}
              maxLength={30}
              editable={!loading}
            />
            <Text style={styles.charCount}>{name.length}/30</Text>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.info}>
              • Highlights are circular story collections
              • They appear on your profile permanently
              • You can add stories from your archive
              • Tap Create to add stories next
            </Text>
          </View>
        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={handleClose}
            disabled={loading}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.createButton, loading && styles.buttonDisabled]}
            onPress={handleCreateHighlight}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.createButtonText}>Create</Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  closeBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  coverImageContainer: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
    backgroundColor: '#f5f5f5',
  },
  coverImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  changeImageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  changeImageText: {
    color: '#fff',
    marginTop: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  placeholderContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    marginTop: 12,
    color: '#999',
    fontSize: 14,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#000',
  },
  charCount: {
    fontSize: 12,
    color: '#999',
    marginTop: 6,
    textAlign: 'right',
  },
  info: {
    fontSize: 13,
    color: '#666',
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  createButton: {
    backgroundColor: '#007AFF',
  },
  createButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
