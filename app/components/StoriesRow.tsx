import { Feather } from "@expo/vector-icons";
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Image, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { createStory, getAllStoriesForFeed, getCurrentUser, getUserProfile } from "../../lib/firebaseHelpers";
import { useUser } from './UserContext';

interface StoryUser {
  userId: string;
  userName: string;
  userAvatar: string;
  stories: any[];
}

export default function StoriesRow({ onStoryPress, refreshTrigger }: { onStoryPress?: (stories: any[], initialIndex: number) => void; refreshTrigger?: number }) {
  const [storyUsers, setStoryUsers] = useState<StoryUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [currentUserAvatar, setCurrentUserAvatar] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<any>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  // Default avatar from Firebase Storage
  const DEFAULT_AVATAR_URL = 'https://firebasestorage.googleapis.com/v0/b/travel-app-3da72.firebasestorage.app/o/default%2Fdefault-pic.jpg?alt=media&token=7177f487-a345-4e45-9a56-732f03dbf65d';
  const currentUser = getCurrentUser();
  const authUser = useUser();

  useEffect(() => {
    loadStories();
    loadCurrentUserAvatar();
  }, [refreshTrigger]);

  const loadCurrentUserAvatar = async () => {
    if (authUser?.photoURL) {
      setCurrentUserAvatar(authUser.photoURL);
    } else if (currentUser?.uid) {
      const res = await getUserProfile(currentUser.uid);
      if (res.success && 'data' in res && res.data) {
        setCurrentUserAvatar(res.data.avatar);
      }
    }
  };

  const loadStories = async () => {
    try {
      const result = await getAllStoriesForFeed();
      console.log('StoriesRow: getAllStoriesForFeed result:', result);
      if (result.success && result.data) {
        const now = Date.now();
        const users: StoryUser[] = [];
        for (const storyGroup of result.data) {
          // Filter out expired stories in each group
          const activeStories = storyGroup.filter((story: any) => story.expiresAt > now);
          if (activeStories.length > 0) {
            const firstStory = activeStories[0];
            // Always fetch from user profile to get latest avatar
            let avatar = DEFAULT_AVATAR_URL;
            try {
              const profileRes = await getUserProfile(firstStory.userId);
              console.log('StoriesRow: getUserProfile for', firstStory.userId, profileRes);
              if (profileRes.success && 'data' in profileRes && profileRes.data) {
                avatar = profileRes.data.avatar;
              }
            } catch (err) {
              console.error('StoriesRow - Error fetching profile:', err);
            }
            users.push({
              userId: firstStory.userId,
              userName: firstStory.userName,
              userAvatar: avatar,
              stories: activeStories as any[]
            });
          }
        }
        console.log('StoriesRow - Loaded', users.length, 'users with stories:', users);
        setStoryUsers(users);
      } else {
        console.log('StoriesRow: getAllStoriesForFeed failed or returned no data');
      }
    } catch (error) {
      console.error('StoriesRow - Error loading stories:', error);
    }
    setLoading(false);
  };

  async function handleAddStory() {
    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      aspect: [9, 16],
      quality: 0.8,
      videoMaxDuration: 40,
    });
    if (!pickerResult.canceled && currentUser) {
      setSelectedMedia(pickerResult.assets[0]);
      setShowUploadModal(true);
    }
  }

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', height: 90 }]}>
        <ActivityIndicator size="small" color="#f39c12" />
      </View>
    );
  }

  // Check if current user has a story
  const hasMyStory = storyUsers.some(u => u.userId === currentUser?.uid);
  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12 }}>
        {/* Current user story: avatar only if exists, plus if not */}
        <View style={styles.storyWrapper}>
          {hasMyStory ? (
            <View>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  const myUser = storyUsers.find(u => u.userId === currentUser?.uid);
                  if (myUser && onStoryPress) onStoryPress(myUser.stories, 0);
                }}
              >
                <LinearGradient colors={['#f39c12', '#e0245e', '#007aff']} style={styles.gradientBorder}>
                  <View style={styles.storyAvatarWrapper}>
                    <Image
                      source={{ uri: currentUserAvatar || DEFAULT_AVATAR_URL }}
                      style={styles.storyAvatar}
                      resizeMode="cover"
                    />
                  </View>
                </LinearGradient>
              </TouchableOpacity>
              {/* Add story button overlay */}
              <TouchableOpacity
                style={[styles.addButton, { position: 'absolute', bottom: -4, right: -4, zIndex: 2 }]}
                onPress={handleAddStory}
              >
                <Feather name="plus" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.storyButton}
              activeOpacity={0.8}
              onPress={handleAddStory}
            >
              <LinearGradient colors={['#ddd', '#ddd']} style={styles.gradientBorder}>
                <View style={styles.storyAvatarWrapper}>
                  <Image
                    source={{ uri: currentUserAvatar || DEFAULT_AVATAR_URL }}
                    style={styles.storyAvatar}
                    resizeMode="cover"
                  />
                  <View style={styles.addButton}>
                    <Feather name="plus" size={18} color="#fff" />
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          )}
          <Text style={styles.userName} numberOfLines={1}>{hasMyStory ? 'Your Story' : 'Add Story'}</Text>
        </View>
        {/* Other users' stories */}
        {storyUsers.filter(u => u.userId !== currentUser?.uid).map((user, idx) => (
          <View style={styles.storyWrapper} key={user.userId}>
            <TouchableOpacity
              style={styles.storyButton}
              activeOpacity={0.8}
              onPress={() => onStoryPress && onStoryPress(user.stories, 0)}
            >
              <LinearGradient colors={['#f39c12', '#e0245e', '#007aff']} style={styles.gradientBorder}>
                <View style={styles.storyAvatarWrapper}>
                  <Image
                    source={{ uri: user.userAvatar || DEFAULT_AVATAR_URL }}
                    style={styles.storyAvatar}
                    resizeMode="cover"
                  />
                </View>
              </LinearGradient>
            </TouchableOpacity>
            <Text style={styles.userName} numberOfLines={1}>{user.userName}</Text>
          </View>
        ))}
      </ScrollView>
      {/* Instagram-style story upload modal */}
      <Modal
        visible={showUploadModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => {
          setShowUploadModal(false);
          setSelectedMedia(null);
        }}
      >
        <View style={[styles.uploadModalOverlay, { justifyContent: 'center', alignItems: 'center' }]}> 
          <View style={styles.uploadModalGlass} />
          <View style={styles.uploadModalCard}>
            <TouchableOpacity style={styles.closeButton} onPress={() => { setShowUploadModal(false); setSelectedMedia(null); }}>
              <Feather name="x" size={22} color="#222" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Create Story</Text>
            <View style={styles.modalDivider} />
            {selectedMedia ? (
              <Image
                source={{ uri: selectedMedia.uri }}
                style={styles.modalImage}
                resizeMode="cover"
              />
            ) : (
              <TouchableOpacity
                style={styles.imagePickerArea}
                onPress={async () => {
                  const pickerResult = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.All, allowsEditing: true, aspect: [9, 16], quality: 0.8 });
                  if (!pickerResult.canceled && pickerResult.assets && pickerResult.assets[0]?.uri) {
                    setSelectedMedia(pickerResult.assets[0]);
                  }
                }}
              >
                <Feather name="image" size={48} color="#b8b8b8" />
                <Text style={styles.imagePickerText}>Add Photo/Video</Text>
              </TouchableOpacity>
            )}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Caption</Text>
              <TextInput
                placeholder="Write a caption..."
                value={selectedMedia?.caption || ''}
                onChangeText={text => setSelectedMedia((prev: any) => prev ? { ...prev, caption: text } : prev)}
                style={styles.inputField}
                maxLength={120}
                placeholderTextColor="#b8b8b8"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: '#007aff' }]}>Location</Text>
              <GooglePlacesAutocomplete
                placeholder="Add location..."
                onPress={(data, details = null) => {
                  setSelectedMedia((prev: any) => prev ? { ...prev, location: data.description } : prev);
                }}
                query={{
                  key: 'AIzaSyCYpwO1yUux1cHtd2bs-huu1hNKv1kC18c',
                  language: 'en',
                }}
                styles={{
                  textInput: styles.inputField,
                  listView: { backgroundColor: '#fff', borderRadius: 10, zIndex: 99, elevation: 99, position: 'absolute', top: 44 },
                }}
                fetchDetails={true}
              />
            </View>
            {uploading ? (
              <View style={styles.uploadingArea}>
                <Text style={styles.uploadingText}>Uploading...</Text>
                <View style={styles.uploadingBarBg}>
                  <View style={[styles.uploadingBar, { width: `${uploadProgress}%` }]} />
                </View>
              </View>
            ) : null}
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => { setShowUploadModal(false); setSelectedMedia(null); }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.shareButton}
                onPress={async () => {
                  if (!selectedMedia || !currentUser) return;
                  setUploading(true);
                  setUploadProgress(10);
                  const mediaType = selectedMedia.type === 'video' ? 'video' : 'image';
                  let progress = 10;
                  const interval = setInterval(() => {
                    progress += 20;
                    setUploadProgress(progress);
                  }, 400);
                  const storyRes = await createStory(
                    currentUser.uid,
                    selectedMedia.uri,
                    mediaType
                  );
                  clearInterval(interval);
                  setUploadProgress(100);
                  setTimeout(() => {
                    setUploading(false);
                    setShowUploadModal(false);
                    setSelectedMedia(null);
                  }, 600);
                  if (storyRes.success) {
                    await loadStories();
                  }
                }}
              >
                <Text style={styles.shareButtonText}>Share</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
const styles = StyleSheet.create({
    uploadModalOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.18)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 9999,
      elevation: 99,
      width: '100%',
      height: '100%',
    },
    uploadModalSheet: {
      backgroundColor: '#fff',
      borderRadius: 22,
      padding: 24,
      alignItems: 'center',
      width: 240,
      shadowColor: '#000',
      shadowOpacity: 0.18,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 4 },
      elevation: 16,
    },
  container: {
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  currentUserImage: {
    width: '100%',
    height: '100%',
    borderRadius: 9,
  },
  addButton: {
    position: 'absolute',
    bottom: -4,
    right: -4,   // moved to bottom right corner
    backgroundColor: '#007aff',
    borderRadius: 14,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
    addButtonOnly: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
  storyWrapper: {
    alignItems: 'center',
    marginRight: 20,
  },
  storyButton: {
    marginBottom: 8,
  },
  gradientBorder: {
    width: 60,
    height: 60,
    borderRadius: 12,
    padding: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyAvatarWrapper: {
    width: '100%',
    height: '100%',
    borderRadius: 9,
    overflow: 'hidden',
    backgroundColor: '#fff',
    position: 'relative',
  },
  storyAvatar: {
    width: '100%',
    height: '100%',
  },
  userName: {
    fontSize: 11,
    fontWeight: '500',
    width: 70,
    textAlign: 'center',
    color: '#222',
  },
  uploadModalGlass: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.12)',
    zIndex: 1,
  },
  uploadModalCard: {
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 28,
    padding: 28,
    alignItems: 'center',
    width: 360,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 24,
    zIndex: 2,
  },
  closeButton: {
    position: 'absolute',
    top: 18,
    right: 18,
    backgroundColor: 'rgba(240,240,240,0.7)',
    borderRadius: 16,
    padding: 6,
    zIndex: 3,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#222',
    marginTop: 8,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  modalDivider: {
    width: '80%',
    height: 1.5,
    backgroundColor: '#ececec',
    borderRadius: 2,
    marginVertical: 10,
  },
  modalImage: {
    width: 220,
    height: 380,
    borderRadius: 18,
    marginBottom: 18,
    borderWidth: 1.5,
    borderColor: '#ececec',
    shadowColor: '#e0245e',
    shadowOpacity: 0.12,
    shadowRadius: 12,
  },
  imagePickerArea: {
    width: 220,
    height: 380,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#d6d6d6',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(245,245,245,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },
  imagePickerText: {
    color: '#b8b8b8',
    marginTop: 10,
    fontWeight: '600',
    fontSize: 16,
  },
  inputGroup: {
    width: '100%',
    marginBottom: 14,
  },
  inputLabel: {
    fontWeight: '700',
    fontSize: 15,
    marginBottom: 4,
    color: '#222',
  },
  inputField: {
    height: 40,
    fontSize: 15,
    backgroundColor: '#f7f7f7',
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#ececec',
    color: '#222',
    fontWeight: '500',
  },
  uploadingArea: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  uploadingText: {
    marginBottom: 6,
    color: '#e0245e',
    fontWeight: 'bold',
  },
  uploadingBarBg: {
    width: 160,
    height: 8,
    backgroundColor: '#eee',
    borderRadius: 4,
  },
  uploadingBar: {
    height: 8,
    backgroundColor: '#f39c12',
    borderRadius: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 24,
  },
  cancelButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#ececec',
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 16,
    marginRight: 8,
    shadowColor: '#e0245e',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  cancelButtonText: {
    color: '#222',
    fontWeight: '700',
    fontSize: 16,
  },
  shareButton: {
    backgroundColor: '#e0245e',
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 16,
    shadowColor: '#e0245e',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 2,
  },
  shareButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.5,
  },
});

