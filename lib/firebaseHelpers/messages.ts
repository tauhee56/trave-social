import { collection, deleteDoc, doc, getDoc, getDocs, onSnapshot, orderBy, query, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';

/**
 * React to a message with an emoji (Instagram-style)
 */
export async function reactToMessage(conversationId: string, messageId: string, userId: string, emoji: string) {
  try {
    const messageRef = doc(db, 'conversations', conversationId, 'messages', messageId);
    const messageSnap = await getDoc(messageRef);
    
    if (!messageSnap.exists()) {
      return { success: false, error: 'Message not found' };
    }
    
    const messageData = messageSnap.data();
    const reactions = messageData.reactions || {};
    
    // Toggle reaction - if same emoji exists from this user, remove it
    if (reactions[userId] === emoji) {
      delete reactions[userId];
    } else {
      reactions[userId] = emoji;
    }
    
    await updateDoc(messageRef, { reactions });
    
    return { success: true };
  } catch (error: any) {
    console.error('❌ reactToMessage error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Subscribe to real-time messages in a conversation
 * Fixed: Prevent duplicate messages by getting fresh snapshot each time
 */
export function subscribeToMessages(conversationId: string, callback: (messages: any[]) => void) {
  const messagesRef = collection(db, 'conversations', conversationId, 'messages');
  const q = query(messagesRef, orderBy('createdAt', 'desc'));

  const unsub = onSnapshot(q, (snapshot) => {
    // Get all messages from snapshot (fresh data each time)
    const messages = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    }));

    // Remove duplicates by ID (just in case)
    const uniqueMessages = Array.from(
      new Map(messages.map(msg => [msg.id, msg])).values()
    );

    callback(uniqueMessages);
  }, (error) => {
    console.error('❌ subscribeToMessages error:', error);
  });

  return unsub;
}

/**
 * Edit a message
 */
export async function editMessage(conversationId: string, messageId: string, userId: string, newText: string) {
  try {
    const messageRef = doc(db, 'conversations', conversationId, 'messages', messageId);
    const messageSnap = await getDoc(messageRef);
    
    if (!messageSnap.exists()) {
      return { success: false, error: 'Message not found' };
    }
    
    const messageData = messageSnap.data();
    
    // Check if user owns the message
    if (messageData.senderId !== userId) {
      return { success: false, error: 'Unauthorized' };
    }
    
    await updateDoc(messageRef, {
      text: newText,
      editedAt: serverTimestamp()
    });
    
    // Update last message in conversation if this was the last message
    const conversationRef = doc(db, 'conversations', conversationId);
    const conversationSnap = await getDoc(conversationRef);
    
    if (conversationSnap.exists()) {
      const conversationData = conversationSnap.data();
      
      // Get all messages to find the latest one
      const messagesQuery = query(
        collection(db, 'conversations', conversationId, 'messages'),
        orderBy('createdAt', 'desc')
      );
      const messagesSnap = await getDocs(messagesQuery);
      
      if (!messagesSnap.empty) {
        const latestMessage = messagesSnap.docs[0].data();
        
        // If the edited message is the latest, update conversation
        if (messagesSnap.docs[0].id === messageId) {
          await updateDoc(conversationRef, {
            lastMessage: newText
          });
        }
      }
    }
    
    return { success: true };
  } catch (error: any) {
    console.error('❌ editMessage error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete a message
 */
export async function deleteMessage(conversationId: string, messageId: string, userId: string) {
  try {
    const messageRef = doc(db, 'conversations', conversationId, 'messages', messageId);
    const messageSnap = await getDoc(messageRef);
    
    if (!messageSnap.exists()) {
      return { success: false, error: 'Message not found' };
    }
    
    const messageData = messageSnap.data();
    
    // Check if user owns the message
    if (messageData.senderId !== userId) {
      return { success: false, error: 'Unauthorized' };
    }
    
    await deleteDoc(messageRef);
    
    // Update last message in conversation
    const conversationRef = doc(db, 'conversations', conversationId);
    const conversationSnap = await getDoc(conversationRef);
    
    if (conversationSnap.exists()) {
      // Get all remaining messages to find the new latest one
      const messagesQuery = query(
        collection(db, 'conversations', conversationId, 'messages'),
        orderBy('createdAt', 'desc')
      );
      const messagesSnap = await getDocs(messagesQuery);
      
      if (!messagesSnap.empty) {
        const latestMessage = messagesSnap.docs[0].data();
        await updateDoc(conversationRef, {
          lastMessage: latestMessage.text || '',
          lastMessageAt: latestMessage.createdAt
        });
      } else {
        // No messages left
        await updateDoc(conversationRef, {
          lastMessage: '',
          lastMessageAt: serverTimestamp()
        });
      }
    }
    
    return { success: true };
  } catch (error: any) {
    console.error('❌ deleteMessage error:', error);
    return { success: false, error: error.message };
  }
}

