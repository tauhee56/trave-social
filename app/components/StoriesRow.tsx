import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, Image, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { getAllStoriesForFeed, getCurrentUser, createStory, getUserProfile } from "../../lib/firebaseHelpers";
import * as ImagePicker from 'expo-image-picker';

interface StoryUser {
  userId: string;
  userName: string;
  userAvatar: string;
  stories: any[];
}

export default function StoriesRow({ onStoryPress }: { onStoryPress?: (stories: any[], initialIndex: number) => void }) {
  const [storyUsers, setStoryUsers] = useState<StoryUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [currentUserAvatar, setCurrentUserAvatar] = useState('');
  // Default avatar from Firebase Storage
  const DEFAULT_AVATAR_URL = 'https://firebasestorage.googleapis.com/v0/b/travel-app-3da72.firebasestorage.app/o/default%2Fdefault-pic.jpg?alt=media&token=7177f487-a345-4e45-9a56-732f03dbf65d';
  const currentUser = getCurrentUser();

  useEffect(() => {
    loadStories();
    loadCurrentUserAvatar();
  }, []);

  const loadCurrentUserAvatar = async () => {
    if (currentUser?.uid) {
      const res = await getUserProfile(currentUser.uid);
      if (res.success && 'data' in res && res.data) {
        setCurrentUserAvatar(res.data.avatar);
      }
    }
  };

  const loadStories = async () => {
    try {
      const result = await getAllStoriesForFeed();
      if (result.success && result.data) {
        const users: StoryUser[] = [];
        for (const storyGroup of result.data) {
          if (storyGroup.length > 0) {
            const firstStory = storyGroup[0];
            
            // Always fetch from user profile to get latest avatar
            let avatar = DEFAULT_AVATAR_URL;
            try {
              const profileRes = await getUserProfile(firstStory.userId);
              if (profileRes.success && 'data' in profileRes && profileRes.data) {
                // getUserProfile already returns proper avatar with fallback
                avatar = profileRes.data.avatar;
              }
            } catch (err) {
              console.error('StoriesRow - Error fetching profile:', err);
            }
            
            users.push({
              userId: firstStory.userId,
              userName: firstStory.userName,
              userAvatar: avatar,
              stories: storyGroup as any[]
            });
          }
        }
        console.log('StoriesRow - Loaded', users.length, 'users with stories');
        setStoryUsers(users);
      }
    } catch (error) {
      console.error('StoriesRow - Error loading stories:', error);
    }
    setLoading(false);
  };

  async function handleAddStory() {
    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All, // Support both images and videos
      allowsEditing: true,
      aspect: [9, 16],
      quality: 0.8,
      videoMaxDuration: 60, // Max 60 seconds like Instagram
    });

    if (!pickerResult.canceled && currentUser) {
      setUploading(true);
      const asset = pickerResult.assets[0];
      const mediaType = asset.type === 'video' ? 'video' : 'image';
      
      const storyRes = await createStory(
        currentUser.uid,
        asset.uri,
        mediaType
      );

      if (storyRes.success) {
        await loadStories();
      }
      setUploading(false);
    }
  }

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', height: 90 }]}>
        <ActivityIndicator size="small" color="#f39c12" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12 }}>
        {/* Current user story circle with + icon */}
        {/* Current user story logic */}
        {(() => {
          const myStory = storyUsers.find(u => u.userId === currentUser?.uid);
          if (myStory && myStory.stories.length > 0) {
            // User has a story: show avatar, clicking views story
            console.log('StoriesRow - Current user story avatar:', myStory.userAvatar);
            return (
              <View style={styles.storyWrapper}>
                <TouchableOpacity
                  onPress={() => onStoryPress?.(myStory.stories, 0)}
                  style={styles.storyButton}
                  disabled={uploading}
                >
                  <LinearGradient
                    colors={['#ff7a5c', '#ff6b5b', '#feda75']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.gradientBorder}
                  >
                    <View style={styles.storyAvatarWrapper}>
                      <Image
                        source={{ uri: myStory.userAvatar }}
                        style={styles.currentUserImage}
                        onError={(error) => console.log('StoriesRow - Current user image load error:', error.nativeEvent.error)}
                        onLoad={() => console.log('StoriesRow - Current user image loaded:', myStory.userAvatar)}
                      />
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleAddStory}
                  style={styles.addButton}
                  disabled={uploading}
                >
                  <Feather name="plus" size={16} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.userName} numberOfLines={1}>{currentUser?.displayName || 'Your Story'}</Text>
              </View>
            );
          } else {
            // No story: show user's profile pic with + icon
            return (
              <View style={styles.storyWrapper}>
                <TouchableOpacity
                  onPress={handleAddStory}
                  style={styles.storyButton}
                  disabled={uploading}
                >
                  <LinearGradient
                    colors={['#ff7a5c', '#ff6b5b', '#feda75']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.gradientBorder}
                  >
                    <View style={styles.storyAvatarWrapper}>
                      {uploading ? (
                        <View style={[styles.currentUserImage, { justifyContent: 'center', alignItems: 'center' }]}>
                          <ActivityIndicator size="small" color="#f39c12" />
                        </View>
                      ) : (
                        <Image
                          source={{ uri: currentUserAvatar || DEFAULT_AVATAR_URL }}
                          style={styles.currentUserImage}
                          defaultSource={require('../../assets/images/icon.png')}
                        />
                      )}
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleAddStory}
                  style={styles.addButton}
                  disabled={uploading}
                >
                  <Feather name="plus" size={16} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.userName} numberOfLines={1}>Add Story</Text>
              </View>
            );
          }
        })()}
        {/* Other users' stories, exclude current user if present in storyUsers */}
        {storyUsers
          .filter(user => user.userId !== currentUser?.uid)
          .map((user) => (
            <View key={user.userId} style={styles.storyWrapper}>
              <TouchableOpacity
                onPress={() => onStoryPress?.(user.stories, 0)}
                style={styles.storyButton}
              >
                <LinearGradient
                  colors={['#ff7a5c', '#ff6b5b', '#feda75']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.gradientBorder}
                >
                  <View style={styles.storyAvatarWrapper}>
                    <Image
                      source={{ uri: user.userAvatar || DEFAULT_AVATAR_URL }}
                      style={styles.storyAvatar}
                      defaultSource={require('../../assets/images/icon.png')}
                    />
                  </View>
                </LinearGradient>
              </TouchableOpacity>
              <Text style={styles.userName} numberOfLines={1}>{user.userName}</Text>
            </View>
          ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
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
    bottom: 10,
    right: -2,
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
});

