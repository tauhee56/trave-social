// Conversation and DM helpers
import { addDoc, collection, doc, getDoc, getDocs, onSnapshot, orderBy, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { db } from '../../config/firebase';

// Get or create a conversation between two users
export async function getOrCreateConversation(userId1: string, userId2: string) {
  try {
    // First check if conversation already exists
    const convRef = collection(db, 'conversations');
    const q = query(convRef, where('participants', 'array-contains', userId1));
    const snapshot = await getDocs(q);
    
    let existingConvId: string | null = null;
    
    snapshot.forEach((docSnap: any) => {
      const data = docSnap.data();
      if (Array.isArray(data.participants) && data.participants.includes(userId2)) {
        existingConvId = docSnap.id;
      }
    });
    
    if (existingConvId) {
      return { success: true, conversationId: existingConvId };
    }
    
    // Create new conversation
    const newConv = await addDoc(convRef, {
      participants: [userId1, userId2],
      lastMessage: '',
      lastMessageAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      unreadCount: {
        [userId1]: 0,
        [userId2]: 0
      }
    });
    
    return { success: true, conversationId: newConv.id };
  } catch (error: any) {
    console.error('Error in getOrCreateConversation:', error);
    return { success: false, conversationId: null, error: error.message };
  }
}

// Subscribe to user's conversations with real-time updates
export function subscribeToConversations(userId: string, callback: (convos: any[]) => void) {
  const convRef = collection(db, 'conversations');
  const q = query(
    convRef, 
    where('participants', 'array-contains', userId),
    orderBy('lastMessageAt', 'desc')
  );
  
  const unsub = onSnapshot(q, async (snapshot: any) => {
    const convosPromises = snapshot.docs.map(async (docSnap: any) => {
      const data = docSnap.data();
      
      // Get other user's data
      const otherUserId = data.participants?.find((p: string) => p !== userId);
      let otherUser = null;
      
      if (otherUserId) {
        try {
          const userDoc = await getDoc(doc(db, 'users', otherUserId));
          if (userDoc.exists()) {
            otherUser = { id: userDoc.id, ...userDoc.data() };
          }
        } catch (e) {
          console.error('Error fetching other user:', e);
        }
      }
      
      return { 
        id: docSnap.id, 
        ...data,
        otherUser,
        unread: data.unreadCount?.[userId] || 0
      };
    });
    
    const convos = await Promise.all(convosPromises);
    callback(convos);
  });
  
  return unsub;
}

// Get all conversations for a user
export async function getUserConversations(userId: string) {
  try {
    const q = query(
      collection(db, 'conversations'), 
      where('participants', 'array-contains', userId),
      orderBy('lastMessageAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
  } catch (error: any) {
    console.error('Error in getUserConversations:', error);
    return [];
  }
}

// Mark a conversation as read
export async function markConversationAsRead(conversationId: string, userId: string) {
  try {
    const convRef = doc(db, 'conversations', conversationId);
    await updateDoc(convRef, { [`unreadCount.${userId}`]: 0 });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Send a message in a conversation
export async function sendMessage(
  conversationId: string, 
  senderId: string, 
  text: string, 
  imageUrl?: string,
  replyTo?: { id: string; text: string; senderId: string } | null
) {
  try {
    const messageData: any = {
      conversationId,
      senderId,
      text,
      imageUrl: imageUrl || null,
      createdAt: serverTimestamp(),
      read: false
    };
    
    // Add replyTo if replying to a message
    if (replyTo) {
      messageData.replyTo = {
        id: replyTo.id,
        text: replyTo.text,
        senderId: replyTo.senderId
      };
    }
    
    // Add message to subcollection
    await addDoc(collection(db, 'conversations', conversationId, 'messages'), messageData);
    
    // Update conversation's last message
    const convRef = doc(db, 'conversations', conversationId);
    const convSnap = await getDoc(convRef);
    
    if (convSnap.exists()) {
      const convData = convSnap.data();
      const participants = convData.participants || [];
      const recipientId = participants.find((p: string) => p !== senderId);
      
      const unreadCount = convData.unreadCount || {};
      
      await updateDoc(convRef, {
        lastMessage: text || (imageUrl ? '📷 Image' : ''),
        lastMessageAt: serverTimestamp(),
        unreadCount: {
          ...unreadCount,
          [recipientId]: (unreadCount[recipientId] || 0) + 1
        }
      });
    }
    
    return { success: true };
  } catch (error: any) {
    console.error('Error in sendMessage:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Create or update a conversation for DM/message notifications
 */
export async function upsertConversation(recipientId: string, senderId: string, message: string) {
  const convRef = collection(db, 'conversations');
  const q = query(convRef, where('participants', 'array-contains', recipientId));
  const snapshot = await getDocs(q);
  let convDoc: any = null;
  snapshot.forEach((docSnap: any) => {
    const data = docSnap.data();
    if (Array.isArray(data.participants) && data.participants.includes(senderId)) {
      convDoc = docSnap;
    }
  });
  if (!convDoc) {
    await addDoc(convRef, {
      participants: [recipientId, senderId],
      lastMessage: message,
      lastMessageAt: serverTimestamp(),
      unreadCount: {
        [recipientId]: 1,
        [senderId]: 0
      }
    });
  } else if (convDoc && typeof convDoc.data === 'function' && typeof convDoc.ref === 'object') {
    const unreadCount = convDoc.data().unreadCount || {};
    await updateDoc(convDoc.ref, {
      lastMessage: message,
      lastMessageAt: serverTimestamp(),
      unreadCount: {
        [recipientId]: (unreadCount[recipientId] || 0) + 1,
        [senderId]: unreadCount[senderId] || 0
      }
    });
  }
}
