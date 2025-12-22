import { Feather } from "@expo/vector-icons";
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Dimensions, Image, Keyboard, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
// import {} from "../../lib/firebaseHelpers";
import { createStory, getAllStoriesForFeed, getUserProfile } from "../../lib/firebaseHelpers/index";
import { useUser } from './UserContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Responsive values
const isSmallDevice = SCREEN_HEIGHT < 700;
const isMediumDevice = SCREEN_HEIGHT >= 700 && SCREEN_HEIGHT < 850;

const responsiveValues = {
  // Image preview height
  imageHeight: isSmallDevice ? 240 : isMediumDevice ? 300 : 340,

  // Font sizes
  titleSize: isSmallDevice ? 16 : 18,
  labelSize: isSmallDevice ? 13 : 14,
  inputSize: isSmallDevice ? 14 : 15,

  // Spacing
  spacing: isSmallDevice ? 12 : 16,
  spacingLarge: isSmallDevice ? 16 : 20,

  // Input heights
  inputHeight: isSmallDevice ? 44 : 48,

  // Padding
  modalPadding: isSmallDevice ? 16 : 20,
};

interface StoryUser {
  userId: string;
  userName: string;
  userAvatar: string;
  stories: any[];
}

function StoriesRowComponent({ onStoryPress, refreshTrigger }: { onStoryPress?: (stories: any[], initialIndex: number) => void; refreshTrigger?: number }) {
  const [storyUsers, setStoryUsers] = useState<StoryUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [currentUserAvatar, setCurrentUserAvatar] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<any>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [locationQuery, setLocationQuery] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState<any[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(false);
  // Default avatar from Firebase Storage
  const DEFAULT_AVATAR_URL = 'https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v1/default/default-pic.jpg';
  // const currentUser = getCurrentUser();
  // const currentUserTyped = getCurrentUser() as { uid?: string } | null;
  // Use authUser from context instead
  const authUser = useUser();

  useEffect(() => {
    loadStories();
    loadCurrentUserAvatar();
  }, [refreshTrigger]);

  // Fetch location suggestions from Google Places API
  useEffect(() => {
    if (locationQuery.length < 2) {
      setLocationSuggestions([]);
      return;
    }
    setLoadingLocations(true);
    const timer = setTimeout(async () => {
      try {
        const { mapService } = await import('../../services');
        const suggestions = await mapService.getAutocompleteSuggestions(locationQuery);
        const predictions = suggestions.map((s: any) => ({
          placeId: s.placeId,
          name: s.mainText || s.description || 'Location',
          address: s.description || '',
        }));
        setLocationSuggestions(predictions);
      } catch (err) {
        setLocationSuggestions([]);
      } finally {
        setLoadingLocations(false);
      }
    }, 600); // Increased from 400ms to 600ms for better debouncing
    return () => clearTimeout(timer);
  }, [locationQuery]);

  const loadCurrentUserAvatar = async () => {
    if (authUser?.photoURL) {
      setCurrentUserAvatar(authUser.photoURL);
    } else if (authUser && authUser.uid) {
      const res = await getUserProfile(authUser.uid);
      if (res && res.success && 'data' in res && res.data) {
        setCurrentUserAvatar(res.data.avatar);
      }
    }
  };

  const loadStories = async () => {
    try {
      const result = await getAllStoriesForFeed();
      if (result.success && result.data) {
        const now = Date.now();
        const users: StoryUser[] = [];
        
        // Collect all unique user IDs first
        const userIdsToFetch: string[] = [];
        const storyGroupsWithActiveStories: { firstStory: any; activeStories: any[] }[] = [];
        
        for (const storyGroup of result.data) {
          const activeStories = storyGroup.filter((story: any) => story.expiresAt > now);
          if (activeStories.length > 0) {
            const firstStory = activeStories[0];
            userIdsToFetch.push(firstStory.userId);
            storyGroupsWithActiveStories.push({ firstStory, activeStories });
          }
        }
        
        // Batch fetch all user profiles at once
        const avatarMap = new Map<string, string>();
        const uniqueUserIds = [...new Set(userIdsToFetch)];
        
        const profilePromises = uniqueUserIds.map(async (userId) => {
          try {
            const profileRes = await getUserProfile(userId);
            if (profileRes.success && 'data' in profileRes && profileRes.data) {
              return { userId, avatar: profileRes.data.avatar };
            }
          } catch {}
          return { userId, avatar: DEFAULT_AVATAR_URL };
        });
        
        const profiles = await Promise.all(profilePromises);
        profiles.forEach(({ userId, avatar }) => avatarMap.set(userId, avatar));
        
        // Build users array with cached avatars
        for (const { firstStory, activeStories } of storyGroupsWithActiveStories) {
          users.push({
            userId: firstStory.userId,
            userName: firstStory.userName,
            userAvatar: avatarMap.get(firstStory.userId) || DEFAULT_AVATAR_URL,
            stories: activeStories as any[]
          });
        }
        
        setStoryUsers(users);
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
  const hasMyStory = authUser && authUser.uid ? storyUsers.some(u => u.userId === authUser.uid) : false;
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
                  const myUser = storyUsers.find(u => u.userId === authUser?.uid);
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
        {authUser && authUser.uid ? storyUsers.filter(u => u.userId !== authUser.uid).map((user, idx) => (
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
        )) : null}
      </ScrollView>
      {/* Simple & Clean Story Upload Modal */}
      <Modal
        visible={showUploadModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => {
          setShowUploadModal(false);
          setSelectedMedia(null);
          setLocationQuery('');
          setLocationSuggestions([]);
        }}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top', 'bottom']}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
          >
            {/* Main content card */}
            <View style={styles.uploadModalCard}>
              {/* Header */}
              <View style={styles.modalHeader}>
                <TouchableOpacity
                  onPress={() => { 
                    setShowUploadModal(false); 
                    setSelectedMedia(null);
                    setLocationQuery('');
                    setLocationSuggestions([]);
                  }}
                >
                  <Feather name="x" size={24} color="#222" />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Create Story</Text>
                <View style={{ width: 24 }} />
              </View>

              <ScrollView
                contentContainerStyle={{
                  paddingHorizontal: responsiveValues.modalPadding,
                  paddingBottom: isSmallDevice ? 30 : 40
                }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled={true}
                bounces={false}
              >
              {/* Media Preview */}
              {selectedMedia ? (
                <View style={styles.mediaPreviewContainer}>
                  <Image
                    source={{ uri: selectedMedia.uri }}
                    style={styles.modalImage}
                    resizeMode="cover"
                  />
                  <TouchableOpacity
                    style={styles.changeMediaButton}
                    onPress={async () => {
                      const pickerResult = await ImagePicker.launchImageLibraryAsync({ 
                        mediaTypes: ImagePicker.MediaTypeOptions.All, 
                        allowsEditing: true, 
                        aspect: [9, 16], 
                        quality: 0.8 
                      });
                      if (!pickerResult.canceled && pickerResult.assets && pickerResult.assets[0]?.uri) {
                        setSelectedMedia(pickerResult.assets[0]);
                      }
                    }}
                  >
                    <Feather name="edit-2" size={16} color="#007aff" />
                    <Text style={styles.changeMediaText}>Change</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.imagePickerArea}
                  onPress={async () => {
                    const pickerResult = await ImagePicker.launchImageLibraryAsync({ 
                      mediaTypes: ImagePicker.MediaTypeOptions.All, 
                      allowsEditing: true, 
                      aspect: [9, 16], 
                      quality: 0.8 
                    });
                    if (!pickerResult.canceled && pickerResult.assets && pickerResult.assets[0]?.uri) {
                      setSelectedMedia(pickerResult.assets[0]);
                    }
                  }}
                >
                  <Feather name="image" size={48} color="#007aff" />
                  <Text style={styles.imagePickerText}>Select Photo or Video</Text>
                </TouchableOpacity>
              )}

              {/* Caption Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Caption (Optional)</Text>
                <TextInput
                  placeholder="Write something..."
                  value={selectedMedia?.caption || ''}
                  onChangeText={text => setSelectedMedia((prev: any) => prev ? { ...prev, caption: text } : prev)}
                  style={styles.inputField}
                  maxLength={120}
                  placeholderTextColor="#999"
                  multiline
                />
              </View>

              {/* Location Input */}
              <View style={[styles.inputGroup, { zIndex: 10 }]}>
                <Text style={styles.inputLabel}>Location (Optional)</Text>
                <View style={{ position: 'relative' }}>
                  <View style={styles.locationInputContainer}>
                    <Feather name="map-pin" size={18} color="#666" />
                    <TextInput
                      placeholder="Add location..."
                      value={locationQuery}
                      onChangeText={setLocationQuery}
                      style={styles.locationInput}
                      placeholderTextColor="#999"
                      returnKeyType="done"
                      blurOnSubmit={true}
                    />
                  </View>
                  {locationSuggestions.length > 0 && (
                    <View style={styles.locationDropdown}>
                      <ScrollView
                        nestedScrollEnabled={true}
                        showsVerticalScrollIndicator={true}
                        keyboardShouldPersistTaps="handled"
                      >
                        {locationSuggestions.map((item) => (
                          <TouchableOpacity
                            key={item.placeId}
                            style={styles.locationItem}
                            onPress={() => {
                              console.log('Location selected:', item);
                              Keyboard.dismiss();
                              setSelectedMedia((prev: any) => prev ? {
                                ...prev,
                                locationData: {
                                  name: item.name,
                                  address: item.address,
                                  placeId: item.placeId,
                                }
                              } : prev);
                              setLocationQuery(item.name);
                              setLocationSuggestions([]);
                            }}
                          >
                            <Feather name="map-pin" size={16} color="#007aff" style={{ marginRight: 8 }} />
                            <View style={{ flex: 1 }}>
                              <Text style={styles.locationName}>{item.name}</Text>
                              <Text style={styles.locationAddress} numberOfLines={1}>{item.address}</Text>
                            </View>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                  {loadingLocations && (
                    <View style={styles.locationLoading}>
                      <ActivityIndicator size="small" color="#007aff" />
                    </View>
                  )}
                </View>
              </View>

              {/* Upload Progress */}
              {uploading && (
                <View style={styles.uploadingArea}>
                  <ActivityIndicator size="small" color="#007aff" style={{ marginBottom: 8 }} />
                  <Text style={styles.uploadingText}>Uploading {uploadProgress}%</Text>
                  <View style={styles.uploadingBarBg}>
                    <View style={[styles.uploadingBar, { width: `${uploadProgress}%` }]} />
                  </View>
                </View>
              )}

              {/* Share Button */}
              <TouchableOpacity
                style={[styles.shareButton, !selectedMedia && styles.shareButtonDisabled]}
                disabled={!selectedMedia || uploading}
                onPress={async () => {
                  if (!selectedMedia || !currentUser || uploading) return;
                  setUploading(true);
                  setUploadProgress(10);
                  let uploadUri = selectedMedia.uri;
                  const mediaType = selectedMedia.type === 'video' ? 'video' : 'image';
                  // Compress image before upload
                  if (mediaType === 'image') {
                    try {
                      const manipResult = await ImageManipulator.manipulateAsync(
                        selectedMedia.uri,
                        [{ resize: { width: 1080 } }],
                        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
                      );
                      uploadUri = manipResult.uri;
                    } catch (err) {
                      // fallback to original
                    }
                  }
                  let progress = 10;
                  const interval = setInterval(() => {
                    progress += 20;
                    setUploadProgress(progress);
                  }, 400);

                  // Pass location data to createStory
                  const storyRes = await createStory(
                    typeof authUser?.uid === 'string' ? authUser.uid : '',
                    uploadUri,
                    mediaType,
                    selectedMedia.locationData // Pass location data
                  );

                  clearInterval(interval);
                  setUploadProgress(100);
                  setTimeout(() => {
                    setUploading(false);
                    setShowUploadModal(false);
                    setSelectedMedia(null);
                    setLocationQuery('');
                    setLocationSuggestions([]);
                  }, 600);
                  if (storyRes.success) {
                    await loadStories();
                  }
                }}
              >
                <Text style={styles.shareButtonText}>
                  {uploading ? 'Sharing...' : 'Share Story'}
                </Text>
              </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

export default React.memo(StoriesRowComponent, (prevProps, nextProps) => {
  return prevProps.refreshTrigger === nextProps.refreshTrigger;
});

const styles = StyleSheet.create({
    uploadModalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    uploadModalBackdrop: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
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
    right: -4,
    backgroundColor: '#007aff',
    borderRadius: 14,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  storyWrapper: {
    alignItems: 'center',
    marginRight: 16,
  },
  storyButton: {
    marginBottom: 6,
  },
  gradientBorder: {
    width: 68,
    height: 68,
    borderRadius: 16,
    padding: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyAvatarWrapper: {
    width: '100%',
    height: '100%',
    borderRadius: 13,
    overflow: 'hidden',
    backgroundColor: '#fff',
    position: 'relative',
    borderWidth: 2,
    borderColor: '#fff',
  },
  storyAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 11,
  },
  userName: {
    fontSize: 10,
    fontWeight: '500',
    width: 72,
    textAlign: 'center',
    color: '#222',
  },
  uploadModalCard: {
    flex: 1,
    backgroundColor: '#fff',
    width: '100%',
    paddingTop: 0,
    paddingHorizontal: 0,
    paddingBottom: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: responsiveValues.spacing,
    paddingHorizontal: responsiveValues.modalPadding,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  modalTitle: {
    fontSize: responsiveValues.titleSize,
    fontWeight: '700',
    color: '#222',
  },
  mediaPreviewContainer: {
    marginTop: responsiveValues.spacingLarge,
    marginBottom: responsiveValues.spacingLarge,
  },
  modalImage: {
    width: '100%',
    height: responsiveValues.imageHeight,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
  },
  changeMediaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 8,
    gap: 6,
  },
  changeMediaText: {
    color: '#007aff',
    fontSize: 15,
    fontWeight: '600',
  },
  imagePickerArea: {
    width: '100%',
    height: responsiveValues.imageHeight,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
    backgroundColor: '#fafafa',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: responsiveValues.spacingLarge,
    marginBottom: responsiveValues.spacingLarge,
  },
  imagePickerText: {
    color: '#007aff',
    marginTop: 12,
    fontWeight: '600',
    fontSize: responsiveValues.inputSize,
  },
  inputGroup: {
    width: '100%',
    marginBottom: responsiveValues.spacingLarge,
    zIndex: 1,
  },
  inputLabel: {
    fontWeight: '600',
    fontSize: responsiveValues.labelSize,
    marginBottom: 8,
    color: '#666',
  },
  inputField: {
    minHeight: responsiveValues.inputHeight,
    maxHeight: isSmallDevice ? 80 : 100,
    fontSize: responsiveValues.inputSize,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: responsiveValues.spacing,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    color: '#222',
  },
  locationInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: responsiveValues.spacing,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    gap: 10,
    minHeight: responsiveValues.inputHeight,
  },
  locationInput: {
    flex: 1,
    fontSize: responsiveValues.inputSize,
    color: '#222',
    padding: 0,
  },
  uploadingArea: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 12,
  },
  uploadingText: {
    marginBottom: 8,
    color: '#666',
    fontWeight: '600',
    fontSize: 14,
  },
  uploadingBarBg: {
    width: '100%',
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  uploadingBar: {
    height: 6,
    backgroundColor: '#007aff',
    borderRadius: 3,
  },
  shareButton: {
    width: '100%',
    backgroundColor: '#007aff',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  shareButtonDisabled: {
    backgroundColor: '#e0e0e0',
  },
  shareButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  locationDropdown: {
    position: 'absolute',
    top: responsiveValues.inputHeight + 8,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    maxHeight: isSmallDevice ? 160 : 200,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: isSmallDevice ? 12 : 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  locationName: {
    color: '#222',
    fontSize: responsiveValues.labelSize,
    fontWeight: '600',
  },
  locationAddress: {
    color: '#999',
    fontSize: isSmallDevice ? 11 : 12,
    marginTop: 2,
  },
  locationLoading: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
});

