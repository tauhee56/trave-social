import { Feather, Ionicons } from '@expo/vector-icons';
import { AVPlaybackStatus, ResizeMode, Video } from 'expo-av';
import { doc, getDoc } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Modal,
    PanResponder,
    Platform,
    SafeAreaView,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { db } from '../../config/firebase';
import { addStoryComment, addStoryCommentReply, deleteStoryComment, editStoryComment, likeStory, likeStoryComment, unlikeStory, unlikeStoryComment } from '../../lib/firebaseHelpers';
import { deleteStory } from '../../lib/firebaseHelpers/deleteStory';
import { useUser } from './UserContext';

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
  replies?: StoryComment[];
  likes?: string[];
  likesCount?: number;
  editedAt?: any;
}

export default function StoriesViewer({ stories, onClose, initialIndex = 0 }: { stories: Story[]; onClose: () => void; initialIndex?: number }) {
    // Default avatar from Firebase Storage
    const DEFAULT_AVATAR_URL = 'https://firebasestorage.googleapis.com/v0/b/travel-app-3da72.firebasestorage.app/o/default%2Fdefault-pic.jpg?alt=media&token=7177f487-a345-4e45-9a56-732f03dbf65d';
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [imageLoading, setImageLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentPanY, setCommentPanY] = useState(0);
  const commentPanResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 5,
    onPanResponderMove: (_, gestureState) => {
      setCommentPanY(gestureState.dy);
    },
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dy > 40) {
        setShowComments(false);
      }
      setCommentPanY(0);
    },
  });
  const [commentText, setCommentText] = useState('');
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [localStories, setLocalStories] = useState(stories);
  const [videoDuration, setVideoDuration] = useState(5000); // ms
  const videoRef = useRef<Video>(null);
  const currentUser = useUser();
  const [latestAvatar, setLatestAvatar] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [likedComments, setLikedComments] = useState<{ [key: string]: boolean }>({});
  const [commentLikesCount, setCommentLikesCount] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    async function fetchLatestAvatar() {
      if (currentUser?.uid) {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setLatestAvatar(userData.avatar || userData.photoURL || null);
        }
      }
    }
    fetchLatestAvatar();
  }, [currentUser?.uid, currentUser?.photoURL]);

  // Sync localStories and currentIndex when stories or initialIndex change
  useEffect(() => {
    setLocalStories(stories);
    setCurrentIndex(initialIndex);
  }, [stories, initialIndex]);

  // Initialize liked comments when current story changes
  useEffect(() => {
    if (currentStory.comments) {
      const likedMap: { [key: string]: boolean } = {};
      const likesCountMap: { [key: string]: number } = {};
      
      currentStory.comments.forEach(comment => {
        likedMap[comment.id] = Array.isArray(comment.likes) ? comment.likes.includes(currentUser?.uid || '') : false;
        likesCountMap[comment.id] = comment.likesCount || 0;
        
        if (comment.replies) {
          comment.replies.forEach(reply => {
            likedMap[reply.id] = Array.isArray(reply.likes) ? reply.likes.includes(currentUser?.uid || '') : false;
            likesCountMap[reply.id] = reply.likesCount || 0;
          });
        }
      });
      
      setLikedComments(likedMap);
      setCommentLikesCount(likesCountMap);
    }
  }, [currentIndex, localStories, currentUser?.uid]);

  useEffect(() => {
    const isVideo = currentStory?.videoUrl || currentStory?.mediaType === 'video';
    const duration = isVideo ? videoDuration : 5000;
    if (isPaused || showComments || imageLoading) return;
    const increment = 100 / (duration / 50);
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          if (currentIndex < localStories.length - 1) {
            setCurrentIndex(currentIndex + 1);
            setImageLoading(true);
            setVideoDuration(5000);
            return 0;
          } else {
            onClose();
            return 100;
          }
        }
        return prev + increment;
      });
    }, 50);
    return () => clearInterval(interval);
  }, [currentIndex, localStories.length, isPaused, showComments, imageLoading, videoDuration]);

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
    if (!currentUser) return;
    let avatarToSave = DEFAULT_AVATAR_URL;
    if (currentUser.photoURL && currentUser.photoURL !== DEFAULT_AVATAR_URL && currentUser.photoURL !== '') {
      avatarToSave = currentUser.photoURL;
    }
    if (replyToId) {
      // Reply to a comment
      if (!replyText.trim()) return;
      const newReply: StoryComment = {
        id: Date.now().toString(),
        userId: currentUser.uid,
        userName: currentUser.displayName || 'User',
        userAvatar: avatarToSave,
        text: replyText.trim(),
        createdAt: new Date(),
      };
      const updatedStories = [...localStories];
      updatedStories[currentIndex].comments = (updatedStories[currentIndex].comments || []).map(c => {
        if (c.id === replyToId) {
          return {
            ...c,
            replies: [...(c.replies || []), newReply]
          };
        }
        return c;
      });
      setLocalStories(updatedStories);
      setReplyText('');
      setReplyToId(null);
      // Save reply to Firestore
      await addStoryCommentReply(
        currentStory.id,
        replyToId,
        newReply
      );
    } else {
      // New top-level comment
      if (!commentText.trim()) return;
      const newComment: StoryComment = {
        id: Date.now().toString(),
        userId: currentUser.uid,
        userName: currentUser.displayName || 'User',
        userAvatar: avatarToSave,
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
        avatarToSave,
        newComment.text
      );
    }
  };

  const getTimeAgo = (timestamp: any) => {
    if (!timestamp) return '';
    const now = new Date();
    const time = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const diff = now.getTime() - time.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'now';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    return `${days}d`;
  };

  const handleLikeComment = async (commentId: string) => {
    if (!currentUser?.uid) return;
    
    const isLiked = likedComments[commentId];
    const result = isLiked 
      ? await unlikeStoryComment(currentStory.id, commentId, currentUser.uid)
      : await likeStoryComment(currentStory.id, commentId, currentUser.uid);
    
    if (result.success) {
      setLikedComments(prev => ({ ...prev, [commentId]: !isLiked }));
      setCommentLikesCount(prev => ({ 
        ...prev, 
        [commentId]: Math.max(0, (prev[commentId] || 0) + (isLiked ? -1 : 1)) 
      }));
    }
  };

  const handleEditComment = async (commentId: string) => {
    if (!editingText.trim()) return;
    const result = await editStoryComment(currentStory.id, commentId, editingText.trim());
    if (result.success) {
      setLocalStories(prev => prev.map(story => 
        story.id === currentStory.id 
          ? {
              ...story,
              comments: story.comments?.map(c => 
                c.id === commentId ? { ...c, text: editingText.trim(), editedAt: new Date() } : c
              )
            }
          : story
      ));
      setEditingComment(null);
      setEditingText('');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    Alert.alert(
      'Delete Comment',
      'Are you sure you want to delete this comment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const result = await deleteStoryComment(currentStory.id, commentId);
            if (result.success) {
              setLocalStories(prev => prev.map(story => 
                story.id === currentStory.id 
                  ? {
                      ...story,
                      comments: story.comments?.filter(c => c.id !== commentId)
                    }
                  : story
              ));
            }
          }
        }
      ]
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
          {currentUser?.uid === currentStory.userId && (
            <TouchableOpacity onPress={async () => {
              const storyId = currentStory.id;
              const res = await deleteStory(storyId);
              if (res.success) {
                const updated = localStories.filter((s, idx) => idx !== currentIndex);
                setLocalStories(updated);
                if (updated.length === 0) onClose();
                else if (currentIndex >= updated.length) setCurrentIndex(updated.length - 1);
              } else {
                alert('Failed to delete story: ' + res.error);
              }
            }} style={{ marginRight: 12 }}>
              <Feather name="trash-2" size={22} color="#fff" />
            </TouchableOpacity>
          )}
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
              onLoad={status => {
                setImageLoading(false);
                if (status && status.isLoaded && 'durationMillis' in status && typeof status.durationMillis === 'number') {
                  setVideoDuration(status.durationMillis);
                }
              }}
              onError={() => setImageLoading(false)}
              onPlaybackStatusUpdate={(status: AVPlaybackStatus) => {
                if (status.isLoaded && status.didJustFinish) {
                  goToNext();
                }
                // Pause progress if buffering/loading
                if (!status.isLoaded || status.isBuffering) setImageLoading(true);
                else setImageLoading(false);
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
          <TouchableOpacity onPress={handleLike} style={{ flexDirection: 'row', alignItems: 'center', marginRight: 8 }}>
            <Feather name={isLiked ? "heart" : "heart"} size={24} color={isLiked ? "#e74c3c" : "#222"} />
            <Text style={{ marginLeft: 6, fontWeight: '700', color: '#222', fontSize: 15 }}>{likesCount}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowComments(!showComments)} style={{ flexDirection: 'row', alignItems: 'center', marginRight: 24 }}>
            <Feather name="message-circle" size={22} color="#222" />
            <Text style={{ marginLeft: 6, color: '#888', fontSize: 15 }}>{currentStory.comments?.length || 0}</Text>
          </TouchableOpacity>
        </View>

        {/* Comments Section as Modal */}
        <Modal visible={showComments} animationType="slide" transparent={true} onRequestClose={() => setShowComments(false)}>
          <KeyboardAvoidingView style={{ flex: 1, justifyContent: 'flex-end' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={{ flex: 1, justifyContent: 'flex-end' }}>
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.18)' }}
                activeOpacity={1}
                onPress={() => setShowComments(false)}
              />
              <View
                {...commentPanResponder.panHandlers}
                style={{
                  backgroundColor: '#fff',
                  borderTopLeftRadius: 20,
                  borderTopRightRadius: 20,
                  paddingTop: 18,
                  paddingHorizontal: 16,
                  height: '60%',
                  shadowColor: '#000',
                  shadowOpacity: 0.08,
                  shadowRadius: 8,
                  elevation: 8,
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: 0,
                  touchAction: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <View style={{ alignItems: 'center', marginBottom: 8 }}>
                  <View style={{ width: 40, height: 4, backgroundColor: '#eee', borderRadius: 2, marginBottom: 8 }} />
                  <Text style={{ fontWeight: '700', fontSize: 17, color: '#222' }}>Comments</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <FlatList
                    data={currentStory.comments || []}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => {
                      let avatarUrl = item.userAvatar || DEFAULT_AVATAR_URL;
                      if (currentUser && item.userId === currentUser.uid) {
                        if (latestAvatar && latestAvatar !== DEFAULT_AVATAR_URL && latestAvatar !== '') {
                          avatarUrl = latestAvatar;
                        } else if (currentUser.photoURL && currentUser.photoURL !== DEFAULT_AVATAR_URL && currentUser.photoURL !== '') {
                          avatarUrl = currentUser.photoURL;
                        } else if (item.userAvatar && item.userAvatar !== DEFAULT_AVATAR_URL) {
                          avatarUrl = item.userAvatar;
                        }
                      }
                      return (
                        <View style={{ marginBottom: 16 }}>
                          <View style={{ flexDirection: 'row', paddingHorizontal: 12, gap: 10 }}>
                            <Image
                              source={{ uri: avatarUrl }}
                              style={{ width: 32, height: 32, borderRadius: 16 }}
                            />
                            <View style={{ flex: 1 }}>
                              {editingComment === item.id ? (
                                <View>
                                  <TextInput
                                    style={{
                                      backgroundColor: '#f0f0f0',
                                      borderRadius: 8,
                                      padding: 8,
                                      fontSize: 14,
                                      color: '#222',
                                      marginBottom: 8,
                                      borderWidth: 1,
                                      borderColor: '#ddd'
                                    }}
                                    value={editingText}
                                    onChangeText={setEditingText}
                                    multiline
                                    autoFocus
                                  />
                                  <View style={{ flexDirection: 'row', gap: 8 }}>
                                    <TouchableOpacity onPress={() => handleEditComment(item.id)}>
                                      <Text style={{ color: '#007aff', fontSize: 14, fontWeight: '600' }}>Save</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => { setEditingComment(null); setEditingText(''); }}>
                                      <Text style={{ color: '#666', fontSize: 14 }}>Cancel</Text>
                                    </TouchableOpacity>
                                  </View>
                                </View>
                              ) : (
                                <View>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                                    <Text style={{ color: '#222', fontWeight: '600', fontSize: 13, marginRight: 8 }}>{item.userName}</Text>
                                    <Text style={{ color: '#666', fontSize: 11 }}>
                                      {getTimeAgo(item.createdAt)}{item.editedAt ? ' • edited' : ''}
                                    </Text>
                                  </View>
                                  <Text style={{ color: '#333', fontSize: 14, lineHeight: 18, marginBottom: 8 }}>{item.text}</Text>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                                    <TouchableOpacity onPress={() => handleLikeComment(item.id)} style={{ flexDirection: 'row', alignItems: 'center' }}>
                                      <Ionicons 
                                        name={likedComments[item.id] ? 'heart' : 'heart-outline'} 
                                        size={16} 
                                        color={likedComments[item.id] ? '#e74c3c' : '#666'} 
                                      />
                                      {(commentLikesCount[item.id] || 0) > 0 && (
                                        <Text style={{ color: '#666', fontSize: 12, marginLeft: 4 }}>
                                          {commentLikesCount[item.id] || 0}
                                        </Text>
                                      )}
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => setReplyToId(item.id)}>
                                      <Text style={{ color: '#007aff', fontSize: 13 }}>Reply</Text>
                                    </TouchableOpacity>
                                    {item.userId === currentUser?.uid && (
                                      <TouchableOpacity onPress={() => {
                                        Alert.alert(
                                          'Comment Options',
                                          '',
                                          [
                                            { text: 'Cancel', style: 'cancel' },
                                            {
                                              text: 'Edit',
                                              onPress: () => {
                                                setEditingComment(item.id);
                                                setEditingText(item.text);
                                              }
                                            },
                                            {
                                              text: 'Delete',
                                              style: 'destructive',
                                              onPress: () => handleDeleteComment(item.id)
                                            }
                                          ]
                                        );
                                      }}>
                                        <Ionicons name="ellipsis-horizontal" size={16} color="#666" />
                                      </TouchableOpacity>
                                    )}
                                  </View>
                                </View>
                              )}
                            </View>
                          </View>
                          
                          {/* Replies */}
                          {item.replies && item.replies.length > 0 && (
                            <View style={{ marginLeft: 54, marginTop: 12 }}>
                              {item.replies.map((r) => {
                                let replyAvatar = r.userAvatar || DEFAULT_AVATAR_URL;
                                if (currentUser && r.userId === currentUser.uid) {
                                  if (latestAvatar && latestAvatar !== DEFAULT_AVATAR_URL && latestAvatar !== '') {
                                    replyAvatar = latestAvatar;
                                  } else if (currentUser.photoURL && currentUser.photoURL !== DEFAULT_AVATAR_URL && currentUser.photoURL !== '') {
                                    replyAvatar = currentUser.photoURL;
                                  } else if (r.userAvatar && r.userAvatar !== DEFAULT_AVATAR_URL) {
                                    replyAvatar = r.userAvatar;
                                  }
                                }
                                return (
                                  <View key={r.id} style={{ marginBottom: 8 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                                      <Image source={{ uri: replyAvatar }} style={{ width: 24, height: 24, borderRadius: 12, marginRight: 8 }} />
                                      <View style={{ flex: 1 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                                          <Text style={{ fontWeight: '600', color: '#222', fontSize: 13, marginRight: 6 }}>{r.userName}</Text>
                                          <Text style={{ color: '#666', fontSize: 11 }}>
                                            {getTimeAgo(r.createdAt)}
                                          </Text>
                                        </View>
                                        <Text style={{ color: '#222', fontSize: 13, lineHeight: 16, marginBottom: 4 }}>{r.text}</Text>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                          <TouchableOpacity onPress={() => handleLikeComment(r.id)} style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <Ionicons 
                                              name={likedComments[r.id] ? 'heart' : 'heart-outline'} 
                                              size={14} 
                                              color={likedComments[r.id] ? '#e74c3c' : '#666'} 
                                            />
                                            {(commentLikesCount[r.id] || 0) > 0 && (
                                              <Text style={{ color: '#666', fontSize: 11, marginLeft: 2 }}>
                                                {commentLikesCount[r.id] || 0}
                                              </Text>
                                            )}
                                          </TouchableOpacity>
                                          {r.userId === currentUser?.uid && (
                                            <TouchableOpacity onPress={() => {
                                              Alert.alert(
                                                'Reply Options',
                                                '',
                                                [
                                                  { text: 'Delete', style: 'destructive', onPress: () => handleDeleteComment(r.id) }
                                                ]
                                              );
                                            }}>
                                              <Ionicons name="ellipsis-horizontal" size={14} color="#666" />
                                            </TouchableOpacity>
                                          )}
                                        </View>
                                      </View>
                                    </View>
                                  </View>
                                );
                              })}
                            </View>
                          )}
                        </View>
                      );
                    }}
                    ListEmptyComponent={
                      <View style={{ padding: 20, alignItems: 'center' }}>
                        <Text style={{ color: '#888', fontSize: 14 }}>No comments yet</Text>
                      </View>
                    }
                  />
                </View>
                <View style={{ flexDirection: 'row', padding: 12, gap: 10, borderTopWidth: 1, borderTopColor: '#eee' }}>
                  <TextInput
                    value={replyToId ? replyText : commentText}
                    onChangeText={replyToId ? setReplyText : setCommentText}
                    placeholder={replyToId ? "Reply to comment..." : "Add a comment..."}
                    placeholderTextColor="#888"
                    style={{ flex: 1, color: '#222', fontSize: 14, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#f5f5f5', borderRadius: 20 }}
                  />
                  <TouchableOpacity onPress={handleComment} disabled={replyToId ? !replyText.trim() : !commentText.trim()}>
                    <Feather name="send" size={24} color={(replyToId ? replyText.trim() : commentText.trim()) ? "#007aff" : "#888"} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

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
