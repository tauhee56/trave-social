import { Feather, Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { Alert, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { addComment, addCommentReply, deleteComment, editComment, getPostComments, likeComment, unlikeComment } from "../../lib/firebaseHelpers";
import CommentAvatar from "./CommentAvatar";
import { useUser } from "./UserContext";

export type Comment = {
  id: string;
  text: string;
  userAvatar: string;
  userName: string;
  likes?: string[];
  likesCount?: number;
  userId: string;
  timeAgo?: string;
  replies?: Comment[];
  showReplies?: boolean;
  createdAt?: any;
  editedAt?: any;
};

interface CommentSectionProps {
  postId: string;
  currentAvatar: string;
  instagramStyle?: boolean;
}

const appColors = {
  background: '#fff',
  text: '#222',
  accent: '#007aff',
  muted: '#888',
  border: '#eee',
  input: '#f5f5f5',
  like: '#e74c3c',
  icon: '#222',
};

const CommentSection: React.FC<CommentSectionProps> = ({ postId, currentAvatar, instagramStyle }) => {
  const user = useUser();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [expandedComments, setExpandedComments] = useState<{ [key: string]: boolean }>({});
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [likedComments, setLikedComments] = useState<{ [key: string]: boolean }>({});
  const [commentLikesCount, setCommentLikesCount] = useState<{ [key: string]: number }>({});
  const [commentsLoaded, setCommentsLoaded] = useState<{ [key: string]: { data: Comment[], timestamp: number } }>({});
  const [lastFetchTime, setLastFetchTime] = useState<{ [key: string]: number }>({});

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
    if (!user?.uid) return;
    
    const isLiked = likedComments[commentId];
    const result = isLiked 
      ? await unlikeComment(postId, commentId, user.uid)
      : await likeComment(postId, commentId, user.uid);
    
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
    const result = await editComment(postId, commentId, editingText.trim());
    if (result.success) {
      setComments(prev => prev.map(c => 
        c.id === commentId ? { ...c, text: editingText.trim(), editedAt: new Date() } : c
      ));
      
      // Update cache
      setCommentsLoaded(prev => {
        const cached = prev[postId];
        if (cached) {
          const updatedData = cached.data.map(c => 
            c.id === commentId ? { ...c, text: editingText.trim(), editedAt: new Date() } : c
          );
          return { ...prev, [postId]: { ...cached, data: updatedData } };
        }
        return prev;
      });
      
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
            const result = await deleteComment(postId, commentId);
            if (result.success) {
              setComments(prev => prev.filter(c => c.id !== commentId));
              
              // Update cache
              setCommentsLoaded(prev => {
                const cached = prev[postId];
                if (cached) {
                  const updatedData = cached.data.filter(c => c.id !== commentId);
                  return { ...prev, [postId]: { ...cached, data: updatedData } };
                }
                return prev;
              });
            }
          }
        }
      ]
    );
  };

  useEffect(() => {
    const fetchComments = async () => {
      // Check if we have cached comments that are less than 30 seconds old
      const now = Date.now();
      const lastFetch = lastFetchTime[postId];
      const cached = commentsLoaded[postId];
      
      if (cached && lastFetch && (now - lastFetch) < 30000) {
        // Use cached data
        setComments(cached.data);
        
        // Initialize liked status and likes count from cached data
        const likedMap: { [key: string]: boolean } = {};
        const likesCountMap: { [key: string]: number } = {};
        
        cached.data.forEach(comment => {
          likedMap[comment.id] = Array.isArray(comment.likes) ? comment.likes.includes(user?.uid || '') : false;
          likesCountMap[comment.id] = comment.likesCount || 0;
          
          // Also for replies
          if (comment.replies) {
            comment.replies.forEach(reply => {
              likedMap[reply.id] = Array.isArray(reply.likes) ? reply.likes.includes(user?.uid || '') : false;
              likesCountMap[reply.id] = reply.likesCount || 0;
            });
          }
        });
        
        setLikedComments(likedMap);
        setCommentLikesCount(likesCountMap);
          if (onCommentsLoaded) onCommentsLoaded(cached.data.length);
        return;
      }

      setLoadingComments(true);
      const res = await getPostComments(postId);
      if (res.success && Array.isArray(res.data)) {
        const commentsData = res.data as Comment[];
        setComments(commentsData);
          if (onCommentsLoaded) onCommentsLoaded(commentsData.length);
        
        // Cache the comments
        setCommentsLoaded(prev => ({ ...prev, [postId]: { data: commentsData, timestamp: now } }));
        setLastFetchTime(prev => ({ ...prev, [postId]: now }));
        
        // Initialize liked status and likes count
        const likedMap: { [key: string]: boolean } = {};
        const likesCountMap: { [key: string]: number } = {};
        
        commentsData.forEach(comment => {
          likedMap[comment.id] = Array.isArray(comment.likes) ? comment.likes.includes(user?.uid || '') : false;
          likesCountMap[comment.id] = comment.likesCount || 0;
          
          // Also for replies
          if (comment.replies) {
            comment.replies.forEach(reply => {
              likedMap[reply.id] = Array.isArray(reply.likes) ? reply.likes.includes(user?.uid || '') : false;
              likesCountMap[reply.id] = reply.likesCount || 0;
            });
          }
        });
        
        setLikedComments(likedMap);
        setCommentLikesCount(likesCountMap);
      }
      setLoadingComments(false);
    };
    if (postId) fetchComments();
  }, [postId, user?.uid]);

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={{ flex: 1 }}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <View style={{ flex: 1, backgroundColor: instagramStyle ? '#fff' : undefined }}>
        <View style={{ flex: 1, marginBottom: 60 }}>
          {loadingComments ? (
            <Text style={{ color: '#888', fontSize: 15, textAlign: 'center', marginTop: 40 }}>Loading...</Text>
          ) : comments.length === 0 ? (
            <Text style={{ color: '#888', fontSize: 15, textAlign: 'center', marginTop: 40 }}>No comments yet</Text>
          ) : (
            <ScrollView 
              showsVerticalScrollIndicator={false} 
              style={{ maxHeight: 320 }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
            >
              {comments.map((c) => (
                <View key={c.id} style={{ marginBottom: 16 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                    <CommentAvatar userId={c.userId} userAvatar={c.userAvatar} size={32} />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      {editingComment === c.id ? (
                        <View style={{ 
                          backgroundColor: '#f8f9fa', 
                          borderRadius: 12, 
                          padding: 16, 
                          borderWidth: 1, 
                          borderColor: '#e1e5e9',
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.1,
                          shadowRadius: 4,
                          elevation: 3
                        }}>
                          <Text style={{ 
                            fontSize: 16, 
                            fontWeight: '600', 
                            color: '#333', 
                            marginBottom: 12 
                          }}>
                            Edit Comment
                          </Text>
                          <TextInput
                            style={{
                              backgroundColor: '#fff',
                              borderRadius: 8,
                              padding: 12,
                              fontSize: 15,
                              color: '#222',
                              borderWidth: 1,
                              borderColor: '#ddd',
                              minHeight: 80,
                              textAlignVertical: 'top',
                              marginBottom: 16
                            }}
                            value={editingText}
                            onChangeText={setEditingText}
                            multiline
                            autoFocus
                            placeholder="Edit your comment..."
                            placeholderTextColor="#999"
                          />
                          <View style={{ 
                            flexDirection: 'row', 
                            justifyContent: 'flex-end', 
                            gap: 12 
                          }}>
                            <TouchableOpacity 
                              onPress={() => { setEditingComment(null); setEditingText(''); }}
                              style={{
                                paddingVertical: 8,
                                paddingHorizontal: 16,
                                borderRadius: 6
                              }}
                            >
                              <Text style={{ 
                                color: '#666', 
                                fontSize: 14, 
                                fontWeight: '500' 
                              }}>
                                Cancel
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                              onPress={() => handleEditComment(c.id)}
                              style={{
                                backgroundColor: '#007aff',
                                paddingVertical: 8,
                                paddingHorizontal: 16,
                                borderRadius: 6
                              }}
                            >
                              <Text style={{ 
                                color: '#fff', 
                                fontSize: 14, 
                                fontWeight: '600' 
                              }}>
                                Save
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ) : (
                        <View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                            <Text style={{ fontWeight: '700', color: '#222', fontSize: 14, marginRight: 8 }}>
                              {typeof c.userName === 'string' || typeof c.userName === 'number' ? String(c.userName) : ''}
                            </Text>
                            <Text style={{ color: '#666', fontSize: 12 }}>
                              {getTimeAgo(c.createdAt)}{c.editedAt ? ' • edited' : ''}
                            </Text>
                          </View>
                          <Text style={{ color: '#222', fontSize: 14, lineHeight: 18, marginBottom: 8 }}>
                            {typeof c.text === 'string' || typeof c.text === 'number' ? String(c.text) : ''}
                          </Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                            <TouchableOpacity onPress={() => handleLikeComment(c.id)} style={{ flexDirection: 'row', alignItems: 'center' }}>
                              <Ionicons 
                                name={likedComments[c.id] ? 'heart' : 'heart-outline'} 
                                size={16} 
                                color={likedComments[c.id] ? '#e74c3c' : '#666'} 
                              />
                              {commentLikesCount[c.id] > 0 && (
                                <Text style={{ color: '#666', fontSize: 12, marginLeft: 4 }}>
                                  {commentLikesCount[c.id]}
                                </Text>
                              )}
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setReplyTo(c.id)}>
                              <Text style={{ color: '#666', fontSize: 14 }}>Reply</Text>
                            </TouchableOpacity>
                            {c.userId === user?.uid && (
                              <TouchableOpacity onPress={() => {
                                Alert.alert(
                                  'Comment Options',
                                  '',
                                  [
                                    { text: 'Cancel', style: 'cancel' },
                                    {
                                      text: 'Edit',
                                      onPress: () => {
                                        setEditingComment(c.id);
                                        setEditingText(c.text);
                                      }
                                    },
                                    {
                                      text: 'Delete',
                                      style: 'destructive',
                                      onPress: () => handleDeleteComment(c.id)
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
                  {c.replies && c.replies.length > 0 && (
                    <View style={{ marginLeft: 44, marginTop: 12 }}>
                      {!expandedComments[c.id] ? (
                        <TouchableOpacity onPress={() => setExpandedComments({ ...expandedComments, [c.id]: true })}>
                          <Text style={{ color: '#666', fontSize: 14 }}>
                            View {c.replies.length} {c.replies.length > 1 ? 'replies' : 'reply'}
                          </Text>
                        </TouchableOpacity>
                      ) : (
                        <View>
                          {c.replies.map((r) => (
                            <View key={r.id} style={{ marginBottom: 8 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                                <CommentAvatar userId={r.userId} userAvatar={r.userAvatar} size={24} />
                                <View style={{ flex: 1, marginLeft: 8 }}>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                                    <Text style={{ fontWeight: '700', color: '#222', fontSize: 13, marginRight: 6 }}>
                                      {typeof r.userName === 'string' || typeof r.userName === 'number' ? String(r.userName) : ''}
                                    </Text>
                                    <Text style={{ color: '#666', fontSize: 11 }}>
                                      {getTimeAgo(r.createdAt)}
                                    </Text>
                                  </View>
                                  <Text style={{ color: '#222', fontSize: 13, lineHeight: 16, marginBottom: 4 }}>
                                    {typeof r.text === 'string' || typeof r.text === 'number' ? String(r.text) : ''}
                                  </Text>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                    <TouchableOpacity onPress={() => handleLikeComment(r.id)} style={{ flexDirection: 'row', alignItems: 'center' }}>
                                      <Ionicons 
                                        name={likedComments[r.id] ? 'heart' : 'heart-outline'} 
                                        size={14} 
                                        color={likedComments[r.id] ? '#e74c3c' : '#666'} 
                                      />
                                      {commentLikesCount[r.id] > 0 && (
                                        <Text style={{ color: '#666', fontSize: 11, marginLeft: 2 }}>
                                          {commentLikesCount[r.id]}
                                        </Text>
                                      )}
                                    </TouchableOpacity>
                                    {r.userId === user?.uid && (
                                      <TouchableOpacity onPress={() => {
                                        Alert.alert(
                                          'Reply Options',
                                          '',
                                          [
                                            { text: 'Cancel', style: 'cancel' },
                                            {
                                              text: 'Edit',
                                              onPress: () => {
                                                setEditingComment(r.id);
                                                setEditingText(r.text);
                                              }
                                            },
                                            {
                                              text: 'Delete',
                                              style: 'destructive',
                                              onPress: () => handleDeleteComment(r.id)
                                            }
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
                          ))}
                          <TouchableOpacity onPress={() => setExpandedComments({ ...expandedComments, [c.id]: false })}>
                            <Text style={{ color: '#666', fontSize: 14 }}>Hide replies</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              ))}
            </ScrollView>
          )}
        </View>
        {/* Add Comment Row fixed at bottom */}
        <View style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          padding: 12,
          backgroundColor: replyTo ? '#eaf3ff' : '#fafafa',
          borderTopWidth: 1,
          borderTopColor: '#eee',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
        }}>
          <Image
            source={{ uri: currentAvatar && currentAvatar !== 'https://firebasestorage.googleapis.com/v0/b/travel-app-3da72.firebasestorage.app/o/default%2Fdefault-pic.jpg?alt=media&token=7177f487-a345-4e45-9a56-732f03dbf65d' ? currentAvatar : (user?.photoURL || 'https://firebasestorage.googleapis.com/v0/b/travel-app-3da72.firebasestorage.app/o/default%2Fdefault-pic.jpg?alt=media&token=7177f487-a345-4e45-9a56-732f03dbf65d') }}
            style={{ width: 32, height: 32, borderRadius: 16, marginRight: 8, borderWidth: 1, borderColor: '#eee' }}
          />
          <View style={{ flex: 1 }}>
            {replyTo && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                <Text style={{ fontSize: 13, color: '#007aff', fontWeight: '700', marginRight: 8 }}>Replying to:</Text>
                <Text style={{ fontSize: 13, color: '#222', fontWeight: '700' }}>{comments.find(c => c.id === replyTo)?.userName}</Text>
                <TouchableOpacity onPress={() => { setReplyTo(null); setReplyText(''); }} style={{ marginLeft: 8 }}>
                  <Text style={{ color: '#ff3b30', fontSize: 13 }}>Cancel</Text>
                </TouchableOpacity>
              </View>
            )}
            <TextInput
              style={{
                backgroundColor: '#fff',
                borderRadius: 20,
                paddingHorizontal: 16,
                paddingVertical: 10,
                fontSize: 15,
                color: '#222',
                borderWidth: 1,
                borderColor: '#e1e5e9',
                maxHeight: 100,
                minHeight: 40
              }}
              placeholder={replyTo ? "Reply to comment..." : "Add a comment..."}
              placeholderTextColor="#999"
              value={replyTo ? replyText : newComment}
              onChangeText={replyTo ? setReplyText : setNewComment}
              returnKeyType="send"
              multiline
              textAlignVertical="center"
              blurOnSubmit={false}
              keyboardType="default"
              autoCapitalize="sentences"
              autoCorrect={true}
              onSubmitEditing={async () => {
                const text = replyTo ? replyText : newComment;
                if (!text.trim()) return;
                if (replyTo) {
                  // Save reply to backend
                  const replyObj = {
                    id: Date.now().toString(),
                    userId: user?.uid || '',
                    userName: user?.displayName || 'User',
                    userAvatar: (currentAvatar && currentAvatar !== 'https://firebasestorage.googleapis.com/v0/b/travel-app-3da72.firebasestorage.app/o/default%2Fdefault-pic.jpg?alt=media&token=7177f487-a345-4e45-9a56-732f03dbf65d') ? currentAvatar : (user?.photoURL || 'https://firebasestorage.googleapis.com/v0/b/travel-app-3da72.firebasestorage.app/o/default%2Fdefault-pic.jpg?alt=media&token=7177f487-a345-4e45-9a56-732f03dbf65d'),
                    text: text.trim(),
                    createdAt: new Date(),
                    likes: [],
                    likesCount: 0
                  };
                  await addCommentReply(postId, replyTo, replyObj);
                  
                  // Update local state and cache
                  setComments(prev => prev.map(c => 
                    c.id === replyTo ? { ...c, replies: [...(c.replies || []), replyObj] } : c
                  ));
                  
                  // Update cache
                  setCommentsLoaded(prev => {
                    const cached = prev[postId];
                    if (cached) {
                      const updatedData = cached.data.map(c => 
                        c.id === replyTo ? { ...c, replies: [...(c.replies || []), replyObj] } : c
                      );
                      return { ...prev, [postId]: { ...cached, data: updatedData } };
                    }
                    return prev;
                  });
                  
                  setReplyText('');
                  setReplyTo(null);
                } else {
                  await addComment(
                    postId,
                    user?.uid || '',
                    user?.displayName || 'User',
                    (currentAvatar && currentAvatar !== 'https://firebasestorage.googleapis.com/v0/b/travel-app-3da72.firebasestorage.app/o/default%2Fdefault-pic.jpg?alt=media&token=7177f487-a345-4e45-9a56-732f03dbf65d') ? currentAvatar : (user?.photoURL || 'https://firebasestorage.googleapis.com/v0/b/travel-app-3da72.firebasestorage.app/o/default%2Fdefault-pic.jpg?alt=media&token=7177f487-a345-4e45-9a56-732f03dbf65d'),
                    text.trim()
                  );
                  
                  // For new comments, we need to refetch to get the server-generated ID
                  const res = await getPostComments(postId);
                  if (res.success && Array.isArray(res.data)) {
                    const commentsData = res.data as Comment[];
                    setComments(commentsData);
                    
                    // Update cache
                    const now = Date.now();
                    setCommentsLoaded(prev => ({ ...prev, [postId]: { data: commentsData, timestamp: now } }));
                    setLastFetchTime(prev => ({ ...prev, [postId]: now }));
                    
                    // Update liked status and likes count after adding comment
                    const likedMap = { ...likedComments };
                    const likesCountMap = { ...commentLikesCount };
                    
                    commentsData.forEach(comment => {
                      likedMap[comment.id] = Array.isArray(comment.likes) ? comment.likes.includes(user?.uid || '') : false;
                      likesCountMap[comment.id] = comment.likesCount || 0;
                      
                      if (comment.replies) {
                        comment.replies.forEach(reply => {
                          likedMap[reply.id] = Array.isArray(reply.likes) ? reply.likes.includes(user?.uid || '') : false;
                          likesCountMap[reply.id] = reply.likesCount || 0;
                        });
                      }
                    });
                    
                    setLikedComments(likedMap);
                    setCommentLikesCount(likesCountMap);
                  }
                  
                  setNewComment('');
                }
              }}
            />
          </View>
          <TouchableOpacity
            style={{ padding: 8, backgroundColor: '#007aff', borderRadius: 8 }}
            onPress={async () => {
              const text = replyTo ? replyText : newComment;
              if (!text.trim()) return;
              if (replyTo) {
                const replyObj = {
                  id: Date.now().toString(),
                  userId: user?.uid || '',
                  userName: user?.displayName || 'User',
                  userAvatar: (currentAvatar && currentAvatar !== 'https://firebasestorage.googleapis.com/v0/b/travel-app-3da72.firebasestorage.app/o/default%2Fdefault-pic.jpg?alt=media&token=7177f487-a345-4e45-9a56-732f03dbf65d') ? currentAvatar : (user?.photoURL || 'https://firebasestorage.googleapis.com/v0/b/travel-app-3da72.firebasestorage.app/o/default%2Fdefault-pic.jpg?alt=media&token=7177f487-a345-4e45-9a56-732f03dbf65d'),
                  text: text.trim(),
                  createdAt: new Date(),
                  likes: [],
                  likesCount: 0
                };
                await addCommentReply(postId, replyTo, replyObj);
                setReplyText('');
                setReplyTo(null);
              } else {
                await addComment(
                  postId,
                  user?.uid || '',
                  user?.displayName || 'User',
                  currentAvatar,
                  text.trim()
                );
                setNewComment('');
              }
              const res = await getPostComments(postId);
              if (res.success && Array.isArray(res.data)) {
                const commentsData = res.data as Comment[];
                setComments(commentsData);
                
                // Update liked status and likes count after adding comment
                const likedMap = { ...likedComments };
                const likesCountMap = { ...commentLikesCount };
                
                commentsData.forEach(comment => {
                  likedMap[comment.id] = Array.isArray(comment.likes) ? comment.likes.includes(user?.uid || '') : false;
                  likesCountMap[comment.id] = comment.likesCount || 0;
                  
                  if (comment.replies) {
                    comment.replies.forEach(reply => {
                      likedMap[reply.id] = Array.isArray(reply.likes) ? reply.likes.includes(user?.uid || '') : false;
                      likesCountMap[reply.id] = reply.likesCount || 0;
                    });
                  }
                });
                
                setLikedComments(likedMap);
                setCommentLikesCount(likesCountMap);
              }
            }}
          >
            <Feather name="send" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  addCommentRow: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 12,
    backgroundColor: "#fafafa",
    borderTopWidth: 1,
    borderTopColor: "#eee",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#eee",
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    color: "#222",
    borderWidth: 1,
    borderColor: "#eee",
  },
  sendBtn: {
    padding: 8,
    backgroundColor: "#007aff",
    borderRadius: 8,
  },
});

export default CommentSection;
