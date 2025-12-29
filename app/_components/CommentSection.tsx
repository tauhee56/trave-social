import { Feather, Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Image, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { addComment, addCommentReaction, addCommentReply, deleteComment, deleteCommentReply, editComment, editCommentReply, getPostComments } from "../../lib/firebaseHelpers/comments";
import CommentAvatar from "./CommentAvatar";
import { useUser } from "./UserContext";

export type Comment = {
  id: string;
  text: string;
  userAvatar: string;
  userName: string;
  userId: string;
  createdAt?: any;
  editedAt?: any;
  replies?: Comment[];
  reactions?: { [userId: string]: string };
};

export interface CommentSectionProps {
  postId: string;
  postOwnerId: string;
  currentAvatar: string;
  maxHeight?: number;
  showInput?: boolean;
  highlightedCommentId?: string;
}

const REACTIONS = ['❤️', '😂', '😮', '😢', '👏', '🔥'];

export const CommentSection: React.FC<CommentSectionProps> = ({ 
  postId, 
  postOwnerId,
  currentAvatar, 
  maxHeight = 400, 
  showInput = true,
  highlightedCommentId 
}) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<{ id: string; userName: string } | null>(null);
  const [replyText, setReplyText] = useState("");
  const [editingComment, setEditingComment] = useState<{ id: string; text: string; isReply: boolean; parentId?: string } | null>(null);
  const [showMenu, setShowMenu] = useState<{ commentId: string; isReply: boolean; parentId?: string; replyId?: string } | null>(null);
  const [showReactions, setShowReactions] = useState<string | null>(null);
  
  const scrollRef = useRef<ScrollView>(null);
  const currentUser = useUser();

  useEffect(() => {
    loadComments();
  }, [postId]);

  const loadComments = async () => {
    setLoading(true);
    const res = await getPostComments(postId);
    if (res.success && Array.isArray(res.data)) {
      // Map Firestore data to Comment type
      const mappedComments = res.data.map((c: any) => ({
        id: c.id,
        text: c.text || '',
        userAvatar: c.userAvatar || '',
        userName: c.userName || '',
        userId: c.userId || '',
        createdAt: c.createdAt,
        editedAt: c.editedAt,
        replies: c.replies || [],
        reactions: c.reactions || {}
      }));
      setComments(mappedComments);
    }
    setLoading(false);
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !currentUser) return;
    
    const commentText = newComment.trim();
    setNewComment(''); // Clear input immediately for better UX
    
    // Optimistic UI update - add comment immediately
    const tempComment: Comment = {
      id: `temp-${Date.now()}`,
      text: commentText,
      userAvatar: currentAvatar,
      userName: currentUser.displayName || 'User',
      userId: currentUser.uid,
      createdAt: Date.now(),
      replies: [],
      reactions: {}
    };
    
    setComments(prev => [tempComment, ...prev]);
    
    // Then save to Firebase in background
    const result = await addComment(
      postId,
      currentUser.uid,
      currentUser.displayName || 'User',
      currentAvatar,
      commentText
    );
    
    if (!result.success) {
      // If failed, remove the temp comment and show error
      setComments(prev => prev.filter(c => c.id !== tempComment.id));
      setNewComment(commentText); // Restore the text
      Alert.alert('Error', 'Failed to post comment');
    } else {
      // Reload to get the real comment with correct ID
      await loadComments();
    }
  };

  const handleAddReply = async () => {
    if (!replyText.trim() || !replyTo || !currentUser) return;
    
    const reply = {
      id: Date.now().toString(),
      userId: currentUser.uid,
      userName: currentUser.displayName || 'User',
      userAvatar: currentAvatar,
      text: replyText.trim(),
      createdAt: Date.now()
    };
    
    const result = await addCommentReply(postId, replyTo.id, reply);
    
    if (result.success) {
      setReplyText('');
      setReplyTo(null);
      await loadComments();
    }
  };

  const handleEditComment = async () => {
    if (!editingComment || !currentUser) return;
    
    if (editingComment.isReply && editingComment.parentId) {
      const result = await editCommentReply(
        postId,
        editingComment.parentId,
        editingComment.id,
        currentUser.uid,
        editingComment.text
      );
      if (result.success) {
        setEditingComment(null);
        await loadComments();
      }
    } else {
      const result = await editComment(
        postId,
        editingComment.id,
        currentUser.uid,
        editingComment.text
      );
      if (result.success) {
        setEditingComment(null);
        await loadComments();
      }
    }
  };

  const handleDeleteComment = async (commentId: string, isReply: boolean, parentId?: string, replyId?: string) => {
    if (!currentUser) return;

    Alert.alert(
      'Delete Comment',
      'Are you sure you want to delete this comment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (isReply && parentId && replyId) {
              const result = await deleteCommentReply(postId, parentId, replyId, currentUser.uid, postOwnerId);
              if (result.success) await loadComments();
            } else {
              const result = await deleteComment(postId, commentId, currentUser.uid, postOwnerId);
              if (result.success) await loadComments();
            }
            setShowMenu(null);
          }
        }
      ]
    );
  };

  const handleReaction = async (commentId: string, reaction: string) => {
    if (!currentUser) return;

    await addCommentReaction(postId, commentId, currentUser.uid, reaction);
    setShowReactions(null);
    await loadComments();
  };

  const getTimeAgo = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
    return `${Math.floor(seconds / 604800)}w`;
  };

  const renderComment = (comment: Comment, isReply: boolean = false, parentId?: string) => {
    const isOwner = currentUser?.uid === comment.userId;
    const isPostOwner = currentUser?.uid === postOwnerId;
    const canDelete = isOwner || isPostOwner;

    const reactionCounts: { [key: string]: number } = {};
    if (comment.reactions) {
      Object.values(comment.reactions).forEach(reaction => {
        reactionCounts[reaction] = (reactionCounts[reaction] || 0) + 1;
      });
    }

    const userReaction = comment.reactions?.[currentUser?.uid || ''];

    return (
      <View key={comment.id} style={[styles.commentRow, isReply && styles.replyRow]}>
        <CommentAvatar userId={comment.userId} userAvatar={comment.userAvatar} size={isReply ? 28 : 32} />

        <View style={styles.commentContent}>
          <View style={styles.commentBubble}>
            <View style={styles.commentHeader}>
              <Text style={styles.userName}>{comment.userName}</Text>
              <Text style={styles.timeAgo}>{getTimeAgo(comment.createdAt)}</Text>
            </View>

            <Text style={styles.commentText}>{comment.text}</Text>

            {comment.editedAt && (
              <Text style={styles.editedLabel}>(edited)</Text>
            )}

            {/* Reactions Display */}
            {Object.keys(reactionCounts).length > 0 && (
              <View style={styles.reactionsDisplay}>
                {Object.entries(reactionCounts).map(([reaction, count]) => (
                  <View key={reaction} style={styles.reactionBadge}>
                    <Text style={styles.reactionEmoji}>{reaction}</Text>
                    <Text style={styles.reactionCount}>{count}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.commentActions}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => setShowReactions(comment.id)}
            >
              <Text style={[styles.actionText, userReaction && styles.actionTextActive]}>
                {userReaction || 'React'}
              </Text>
            </TouchableOpacity>

            {!isReply && (
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => setReplyTo({ id: comment.id, userName: comment.userName })}
              >
                <Text style={styles.actionText}>Reply</Text>
              </TouchableOpacity>
            )}

            {isOwner && (
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => setEditingComment({
                  id: comment.id,
                  text: comment.text,
                  isReply,
                  parentId
                })}
              >
                <Text style={styles.actionText}>Edit</Text>
              </TouchableOpacity>
            )}

            {canDelete && (
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => handleDeleteComment(comment.id, isReply, parentId, comment.id)}
              >
                <Text style={[styles.actionText, styles.deleteText]}>Delete</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Replies */}
          {!isReply && comment.replies && comment.replies.length > 0 && (
            <View style={styles.repliesContainer}>
              {comment.replies.map(reply => renderComment(reply, true, comment.id))}
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Comments List */}
      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#999" />
          </View>
        ) : comments.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Feather name="message-circle" size={48} color="#ddd" />
            <Text style={styles.emptyText}>No comments yet</Text>
            <Text style={styles.emptySubtext}>Be the first to comment!</Text>
          </View>
        ) : (
          comments.map(comment => renderComment(comment))
        )}
      </ScrollView>

      {/* Input Section - Fixed at Bottom */}
      {showInput && (
        <View style={styles.inputContainer}>
            {replyTo && (
              <View style={styles.replyingTo}>
                <Text style={styles.replyingToText}>
                  Replying to <Text style={styles.replyingToName}>{replyTo.userName}</Text>
                </Text>
                <TouchableOpacity onPress={() => { setReplyTo(null); setReplyText(''); }}>
                  <Feather name="x" size={16} color="#666" />
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.inputRow}>
              <Image
                source={{ uri: currentAvatar }}
                style={styles.inputAvatar}
              />
              <TextInput
                style={styles.input}
                placeholder={replyTo ? "Write a reply..." : "Add a comment..."}
                placeholderTextColor="#999"
                value={replyTo ? replyText : newComment}
                onChangeText={replyTo ? setReplyText : setNewComment}
                multiline
                maxLength={500}
              />
              <TouchableOpacity
                style={[styles.sendBtn, !(replyTo ? replyText : newComment).trim() && styles.sendBtnDisabled]}
                onPress={replyTo ? handleAddReply : handleAddComment}
                disabled={!(replyTo ? replyText : newComment).trim()}
              >
                <Ionicons name="send" size={20} color={(replyTo ? replyText : newComment).trim() ? '#007aff' : '#ccc'} />
              </TouchableOpacity>
            </View>
          </View>
      )}

      {/* Edit Modal */}
      {editingComment && (
        <Modal visible transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.editModal}>
              <View style={styles.editHeader}>
                <Text style={styles.editTitle}>Edit Comment</Text>
                <TouchableOpacity onPress={() => setEditingComment(null)}>
                  <Feather name="x" size={24} color="#222" />
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.editInput}
                value={editingComment.text}
                onChangeText={(text) => setEditingComment({ ...editingComment, text })}
                multiline
                autoFocus
                maxLength={500}
              />

              <View style={styles.editActions}>
                <TouchableOpacity
                  style={[styles.editBtn, styles.cancelBtn]}
                  onPress={() => setEditingComment(null)}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.editBtn, styles.saveBtn]}
                  onPress={handleEditComment}
                >
                  <Text style={styles.saveBtnText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Reactions Picker */}
      {showReactions && (
        <Modal visible transparent animationType="fade">
          <TouchableOpacity
            style={styles.reactionsOverlay}
            activeOpacity={1}
            onPress={() => setShowReactions(null)}
          >
            <View style={styles.reactionsPicker}>
              {REACTIONS.map(reaction => (
                <TouchableOpacity
                  key={reaction}
                  style={styles.reactionBtn}
                  onPress={() => handleReaction(showReactions, reaction)}
                >
                  <Text style={styles.reactionBtnText}>{reaction}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </View>
  );
};

export default CommentSection;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#999',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#bbb',
    marginTop: 4,
  },
  commentRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'flex-start',
  },
  replyRow: {
    marginLeft: 40,
    paddingVertical: 6,
  },
  commentContent: {
    flex: 1,
    marginLeft: 8,
  },
  commentBubble: {
    backgroundColor: '#f5f5f5',
    borderRadius: 18,
    padding: 12,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#222',
    flex: 1,
  },
  timeAgo: {
    fontSize: 11,
    color: '#999',
  },
  commentText: {
    fontSize: 14,
    color: '#222',
    lineHeight: 18,
  },
  editedLabel: {
    fontSize: 11,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 4,
  },
  reactionsDisplay: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 6,
  },
  reactionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  reactionEmoji: {
    fontSize: 14,
  },
  reactionCount: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
  },
  commentActions: {
    flexDirection: 'row',
    marginTop: 6,
    marginLeft: 12,
    gap: 16,
  },
  actionBtn: {
    paddingVertical: 2,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  actionTextActive: {
    color: '#007aff',
  },
  deleteText: {
    color: '#e74c3c',
  },
  repliesContainer: {
    marginTop: 8,
  },
  inputContainer: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 12,
    // Increased bottom padding for more space
    paddingBottom: Platform.OS === 'ios' ? 48 : 56,
  },
  replyingTo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginBottom: 8,
  },
  replyingToText: {
    fontSize: 13,
    color: '#666',
  },
  replyingToName: {
    fontWeight: '700',
    color: '#007aff',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inputAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  input: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
    maxHeight: 100,
  },
  sendBtn: {
    padding: 8,
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  editModal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  editHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  editTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222',
  },
  editInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  editActions: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 12,
  },
  editBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: '#f5f5f5',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },
  saveBtn: {
    backgroundColor: '#007aff',
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  reactionsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reactionsPicker: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 30,
    padding: 8,
    gap: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  reactionBtn: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 24,
  },
  reactionBtnText: {
    fontSize: 28,
  },
});
