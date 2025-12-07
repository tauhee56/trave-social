import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, orderBy, query, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';

// ============= COMMENTS CRUD =============

/**
 * Add a comment to a post
 */
export async function addComment(postId: string, userId: string, userName: string, userAvatar: string, text: string) {
  try {
    // Use Promise.all to run operations in parallel for better performance
    const [commentRef] = await Promise.all([
      addDoc(collection(db, 'posts', postId, 'comments'), {
        userId,
        userName,
        userAvatar,
        text,
        createdAt: serverTimestamp(),
        likes: [],
        likesCount: 0,
        replies: [],
        reactions: {}
      }),
      // Update post comment count in parallel
      (async () => {
        const postRef = doc(db, 'posts', postId);
        const postSnap = await getDoc(postRef);
        if (postSnap.exists()) {
          const postData = postSnap.data();
          await updateDoc(postRef, {
            commentsCount: (postData.commentsCount || 0) + 1
          });
        }
      })()
    ]);
    
    return { success: true, id: commentRef.id };
  } catch (error: any) {
    console.error('❌ addComment error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Edit a comment
 */
export async function editComment(postId: string, commentId: string, userId: string, newText: string) {
  try {
    const commentRef = doc(db, 'posts', postId, 'comments', commentId);
    const commentSnap = await getDoc(commentRef);
    
    if (!commentSnap.exists()) {
      return { success: false, error: 'Comment not found' };
    }
    
    const commentData = commentSnap.data();
    
    // Check if user owns the comment
    if (commentData.userId !== userId) {
      return { success: false, error: 'Unauthorized' };
    }
    
    await updateDoc(commentRef, {
      text: newText,
      editedAt: serverTimestamp()
    });
    
    return { success: true };
  } catch (error: any) {
    console.error('❌ editComment error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete a comment
 */
export async function deleteComment(postId: string, commentId: string, userId: string, postOwnerId: string) {
  try {
    const commentRef = doc(db, 'posts', postId, 'comments', commentId);
    const commentSnap = await getDoc(commentRef);
    
    if (!commentSnap.exists()) {
      return { success: false, error: 'Comment not found' };
    }
    
    const commentData = commentSnap.data();
    
    // Check if user owns the comment OR is the post owner
    if (commentData.userId !== userId && postOwnerId !== userId) {
      return { success: false, error: 'Unauthorized' };
    }
    
    await deleteDoc(commentRef);
    
    // Update post comment count
    const postRef = doc(db, 'posts', postId);
    const postSnap = await getDoc(postRef);
    if (postSnap.exists()) {
      const postData = postSnap.data();
      await updateDoc(postRef, {
        commentsCount: Math.max((postData.commentsCount || 1) - 1, 0)
      });
    }
    
    return { success: true };
  } catch (error: any) {
    console.error('❌ deleteComment error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Add a reply to a comment
 */
export async function addCommentReply(postId: string, parentCommentId: string, reply: any) {
  try {
    const parentRef = doc(db, 'posts', postId, 'comments', parentCommentId);
    const parentSnap = await getDoc(parentRef);

    if (!parentSnap.exists()) {
      return { success: false, error: 'Parent comment not found' };
    }

    const parentData = parentSnap.data();
    const replies = parentData.replies || [];
    const newReplies = [...replies, { ...reply, createdAt: Date.now() }];

    await updateDoc(parentRef, { replies: newReplies });

    return { success: true };
  } catch (error: any) {
    console.error('❌ addCommentReply error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Edit a reply
 */
export async function editCommentReply(postId: string, commentId: string, replyId: string, userId: string, newText: string) {
  try {
    const commentRef = doc(db, 'posts', postId, 'comments', commentId);
    const commentSnap = await getDoc(commentRef);

    if (!commentSnap.exists()) {
      return { success: false, error: 'Comment not found' };
    }

    const commentData = commentSnap.data();
    const replies = commentData.replies || [];

    const updatedReplies = replies.map((r: any) => {
      if (r.id === replyId) {
        if (r.userId !== userId) {
          throw new Error('Unauthorized');
        }
        return { ...r, text: newText, editedAt: Date.now() };
      }
      return r;
    });

    await updateDoc(commentRef, { replies: updatedReplies });

    return { success: true };
  } catch (error: any) {
    console.error('❌ editCommentReply error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete a reply
 */
export async function deleteCommentReply(postId: string, commentId: string, replyId: string, userId: string, postOwnerId: string) {
  try {
    const commentRef = doc(db, 'posts', postId, 'comments', commentId);
    const commentSnap = await getDoc(commentRef);

    if (!commentSnap.exists()) {
      return { success: false, error: 'Comment not found' };
    }

    const commentData = commentSnap.data();
    const replies = commentData.replies || [];

    const replyToDelete = replies.find((r: any) => r.id === replyId);
    if (!replyToDelete) {
      return { success: false, error: 'Reply not found' };
    }

    // Check if user owns the reply OR is the post owner
    if (replyToDelete.userId !== userId && postOwnerId !== userId) {
      return { success: false, error: 'Unauthorized' };
    }

    const updatedReplies = replies.filter((r: any) => r.id !== replyId);

    await updateDoc(commentRef, { replies: updatedReplies });

    return { success: true };
  } catch (error: any) {
    console.error('❌ deleteCommentReply error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Add reaction to comment (like, love, laugh, etc.)
 */
export async function addCommentReaction(postId: string, commentId: string, userId: string, reactionType: string) {
  try {
    const commentRef = doc(db, 'posts', postId, 'comments', commentId);
    const commentSnap = await getDoc(commentRef);

    if (!commentSnap.exists()) {
      return { success: false, error: 'Comment not found' };
    }

    const commentData = commentSnap.data();
    const reactions = commentData.reactions || {};

    // Toggle reaction
    if (reactions[userId] === reactionType) {
      // Remove reaction
      delete reactions[userId];
    } else {
      // Add/update reaction
      reactions[userId] = reactionType;
    }

    await updateDoc(commentRef, { reactions });

    return { success: true };
  } catch (error: any) {
    console.error('❌ addCommentReaction error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all comments for a post
 */
export async function getPostComments(postId: string) {
  try {
    const q = query(
      collection(db, 'posts', postId, 'comments'),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    const comments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    return { success: true, data: comments };
  } catch (error: any) {
    console.error('❌ getPostComments error:', error);
    return { success: false, error: error.message, data: [] };
  }
}

