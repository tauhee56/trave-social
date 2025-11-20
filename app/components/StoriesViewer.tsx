import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Modal,
  SafeAreaView,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  FlatList,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { getCurrentUser, likeStory, unlikeStory, addStoryComment } from '../../lib/firebaseHelpers';

const { width, height } = Dimensions.get('window');

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
  comments?: StoryComment[];
}

interface StoryComment {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  text: string;
  createdAt: any;
}

export default function StoriesViewer({ stories, onClose, initialIndex = 0 }: { stories: Story[]; onClose: () => void; initialIndex?: number }) {
    // Default avatar from Firebase Storage
    const DEFAULT_AVATAR_URL = 'https://firebasestorage.googleapis.com/v0/b/travel-app-3da72.firebasestorage.app/o/default%2Fdefault-pic.jpg?alt=media&token=7177f487-a345-4e45-9a56-732f03dbf65d';
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [imageLoading, setImageLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [localStories, setLocalStories] = useState(stories);
  const videoRef = useRef<Video>(null);
  const currentUser = getCurrentUser();

  useEffect(() => {
    if (isPaused || showComments) return;
    
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          if (currentIndex < localStories.length - 1) {
            setCurrentIndex(currentIndex + 1);
            setImageLoading(true);
            return 0;
          } else {
            onClose();
            return 100;
          }
        }
        return prev + 2;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [currentIndex, localStories.length, isPaused, showComments]);

  const currentStory = localStories[currentIndex];
  const isLiked = currentStory.likes?.includes(currentUser?.uid || '') || false;
  const likesCount = currentStory.likes?.length || 0;

  if (!currentStory) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: '#fff', fontSize: 16 }}>Loading story...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleLike = async () => {
    if (!currentUser) return;
    const updatedStories = [...localStories];
    const likes = updatedStories[currentIndex].likes || [];
    
    if (isLiked) {
      updatedStories[currentIndex].likes = likes.filter(id => id !== currentUser.uid);
      setLocalStories(updatedStories);
      await unlikeStory(currentStory.id, currentUser.uid);
    } else {
      updatedStories[currentIndex].likes = [...likes, currentUser.uid];
      setLocalStories(updatedStories);
      await likeStory(currentStory.id, currentUser.uid);
    }
  };

  const handleComment = async () => {
    if (!currentUser || !commentText.trim()) return;
    const newComment: StoryComment = {
      id: Date.now().toString(),
      userId: currentUser.uid,
      userName: currentUser.displayName || 'User',
      userAvatar: currentUser.photoURL || DEFAULT_AVATAR_URL,
      text: commentText.trim(),
      createdAt: new Date(),
    };
    
    const updatedStories = [...localStories];
    updatedStories[currentIndex].comments = [...(updatedStories[currentIndex].comments || []), newComment];
    setLocalStories(updatedStories);
    setCommentText('');
    
    // Save to Firebase
    await addStoryComment(
      currentStory.id,
      currentUser.uid,
      currentUser.displayName || 'User',
      currentUser.photoURL || DEFAULT_AVATAR_URL,
      newComment.text
    );
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setProgress(0);
      setImageLoading(true);
      setShowComments(false);
    }
  };

  const goToNext = () => {
    if (currentIndex < localStories.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setProgress(0);
      setImageLoading(true);
      setShowComments(false);
    } else {
      onClose();
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Progress Bars */}
        <View style={{ flexDirection: 'row', paddingHorizontal: 8, paddingVertical: 8, gap: 2 }}>
          {localStories.map((_, index) => (
            <View
              key={index}
              style={{
                flex: 1,
                height: 3,
                backgroundColor: '#333',
                borderRadius: 1.5,
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  height: '100%',
                  backgroundColor: '#fff',
                  width: index === currentIndex ? `${progress}%` : index < currentIndex ? '100%' : '0%',
                }}
              />
            </View>
          ))}
        </View>

        {/* Story Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: 'rgba(0,0,0,0.3)' }}>
          <Image
            source={{ uri: currentStory.userAvatar || DEFAULT_AVATAR_URL }}
            style={{ width: 40, height: 40, borderRadius: 20, marginRight: 12, borderWidth: 2, borderColor: '#fff' }}
          />
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 15 }}>{currentStory.userName}</Text>
            <Text style={{ color: '#ddd', fontSize: 12 }}>Just now</Text>
          </View>
          <TouchableOpacity onPress={() => setIsPaused(!isPaused)} style={{ marginRight: 12 }}>
            <Feather name={isPaused ? "play" : "pause"} size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose}>
            <Feather name="x" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Story Media */}
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
          {imageLoading && <ActivityIndicator size="large" color="#fff" style={{ position: 'absolute', zIndex: 1 }} />}
          {(currentStory.videoUrl || currentStory.mediaType === 'video') ? (
            <Video
              ref={videoRef}
              source={{ uri: currentStory.videoUrl || currentStory.imageUrl }}
              style={{ width: width, height: height - 200 }}
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay={!isPaused && !showComments}
              isLooping={false}
              onLoadStart={() => setImageLoading(true)}
              onLoad={() => setImageLoading(false)}
              onError={() => setImageLoading(false)}
              onPlaybackStatusUpdate={(status: AVPlaybackStatus) => {
                if (status.isLoaded && status.didJustFinish) {
                  goToNext();
                }
              }}
            />
          ) : (
            <Image
              source={{ uri: currentStory.imageUrl }}
              style={{ width: width, height: height - 200 }}
              resizeMode="contain"
              onLoadStart={() => setImageLoading(true)}
              onLoad={() => setImageLoading(false)}
              onError={() => setImageLoading(false)}
            />
          )}
        </View>

        {/* Action Buttons */}
        <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, alignItems: 'center', gap: 20 }}>
          <TouchableOpacity onPress={handleLike} style={{ alignItems: 'center' }}>
            <Feather name={isLiked ? "heart" : "heart"} size={24} color={isLiked ? "#f39c12" : "#fff"} fill={isLiked ? "#f39c12" : "none"} />
            {likesCount > 0 && <Text style={{ color: '#fff', fontSize: 12, marginTop: 4 }}>{likesCount}</Text>}
          </TouchableOpacity>
          
          <TouchableOpacity onPress={() => setShowComments(!showComments)} style={{ alignItems: 'center' }}>
            <Feather name="message-circle" size={24} color="#fff" />
            {(currentStory.comments?.length || 0) > 0 && (
              <Text style={{ color: '#fff', fontSize: 12, marginTop: 4 }}>{currentStory.comments?.length}</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Comments Section */}
        {showComments && (
          <View style={{ backgroundColor: '#1a1a1a', maxHeight: 250, borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
            <View style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: '#333' }}>
              <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16 }}>Comments</Text>
            </View>
            <FlatList
              data={currentStory.comments || []}
              keyExtractor={(item) => item.id}
              style={{ maxHeight: 150 }}
              renderItem={({ item }) => (
                <View style={{ flexDirection: 'row', padding: 12, gap: 10 }}>
                  <Image
                    source={{ uri: item.userAvatar || DEFAULT_AVATAR_URL }}
                    style={{ width: 32, height: 32, borderRadius: 16 }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>{item.userName}</Text>
                    <Text style={{ color: '#ccc', fontSize: 14, marginTop: 2 }}>{item.text}</Text>
                  </View>
                </View>
              )}
              ListEmptyComponent={
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <Text style={{ color: '#666', fontSize: 14 }}>No comments yet</Text>
                </View>
              }
            />
            <View style={{ flexDirection: 'row', padding: 12, gap: 10, borderTopWidth: 1, borderTopColor: '#333' }}>
              <TextInput
                value={commentText}
                onChangeText={setCommentText}
                placeholder="Add a comment..."
                placeholderTextColor="#666"
                style={{ flex: 1, color: '#fff', fontSize: 14, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#2a2a2a', borderRadius: 20 }}
              />
              <TouchableOpacity onPress={handleComment} disabled={!commentText.trim()}>
                <Feather name="send" size={24} color={commentText.trim() ? "#f39c12" : "#666"} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Navigation */}
        {!showComments && (
          <View style={{ position: 'absolute', top: 100, left: 0, right: 0, bottom: 100, flexDirection: 'row' }}>
            <TouchableOpacity
              onPress={goToPrevious}
              style={{ flex: 1 }}
              activeOpacity={1}
            />
            <TouchableOpacity
              onPress={goToNext}
              style={{ flex: 1 }}
              activeOpacity={1}
            />
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
