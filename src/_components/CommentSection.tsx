import React, { useEffect, useRef, useState } from "react";
import { ScrollView } from "react-native";
import { getPostComments } from "../../lib/firebaseHelpers/comments";

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
  // const currentUser = getCurrentUser();
  // TODO: Use user from context or props

  useEffect(() => {
    loadComments();
  }, [postId]);

  const loadComments = async () => {
    setLoading(true);
    const res = await getPostComments(postId);
    if (res.success && Array.isArray(res.data)) {
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

  // ...rest of the full implementation from app/_components/CommentSection.tsx...

  return null;
};

export default CommentSection;
