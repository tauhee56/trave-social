// Conversation and DM helpers

// Get or create a conversation between two users
export async function getOrCreateConversation(userId1: string, userId2: string) {
  try {
    const res = await fetch(`/api/conversations/get-or-create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId1, userId2 })
    });
    const data = await res.json();
    return { success: data.success, conversationId: data.id };
  } catch (error: any) {
    console.error('Error in getOrCreateConversation:', error);
    return { success: false, conversationId: null, error: error.message };
  }
}

// Subscribe to user's conversations with real-time updates
export function subscribeToConversations(userId: string, callback: (convos: any[]) => void) {
  // Use polling for conversations
  const pollInterval = setInterval(async () => {
    try {
      const res = await fetch(`/api/users/${userId}/conversations`);
      const data = await res.json();
      if (data.success) {
        callback(data.data || []);
      }
    } catch (error) {
      console.error('Error polling conversations:', error);
    }
  }, 10000);

  return () => clearInterval(pollInterval);
}

// Get all conversations for a user
export async function getUserConversations(userId: string) {
  try {
    const res = await fetch(`/api/users/${userId}/conversations`);
    const data = await res.json();
    return data.data || [];
  } catch (error: any) {
    console.error('Error in getUserConversations:', error);
    return [];
  }
}

// Mark a conversation as read
export async function markConversationAsRead(conversationId: string, userId: string) {
  try {
    const res = await fetch(`/api/conversations/${conversationId}/read`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });
    const data = await res.json();
    return data;
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
    
    const res = await fetch(`/api/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messageData)
    });
    const data = await res.json();
    return data;
  } catch (error: any) {
    console.error('Error in sendMessage:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Create or update a conversation for DM/message notifications
 */
export async function upsertConversation(recipientId: string, senderId: string, message: string) {
  try {
    const res = await fetch(`/api/conversations/get-or-create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId1: recipientId, userId2: senderId })
    });
    const data = await res.json();
    if (data.success) {
      // Send the message
      await sendMessage(data.id, senderId, message);
    }
    return data;
  } catch (error: any) {
    console.error('Error in upsertConversation:', error);
    return { success: false, error: error.message };
  }
}
