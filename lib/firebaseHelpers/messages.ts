
import { apiService } from '../../app/_services/apiService';

/**
 * React to a message with an emoji (Instagram-style)
 */
export async function reactToMessage(conversationId: string, messageId: string, userId: string, emoji: string) {
  try {
    const res = await apiService.post(`/conversations/${conversationId}/messages/${messageId}/reactions`, { userId, emoji });
    return res;
  } catch (error: any) {
    console.error('❌ reactToMessage error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Subscribe to real-time messages in a conversation
 */
export function subscribeToMessages(conversationId: string, callback: (messages: any[]) => void) {
  // Use polling for messages with proper API service
  const pollInterval = setInterval(async () => {
    try {
      const res = await apiService.get(`/conversations/${conversationId}/messages`);
      console.log('[subscribeToMessages] Got response:', { success: res?.success, hasMessages: !!res?.messages, messageCount: res?.messages?.length });
      if (res.success && res.messages) {
        callback(res.messages);
      } else {
        console.warn('[subscribeToMessages] Invalid response:', res);
        callback([]);
      }
    } catch (error) {
      console.error('Error polling messages:', error);
      callback([]); // Return empty array on error
    }
  }, 5000);

  return () => clearInterval(pollInterval);
}

/**
 * Edit a message
 */
export async function editMessage(conversationId: string, messageId: string, userId: string, newText: string) {
  try {
    const res = await apiService.patch(`/conversations/${conversationId}/messages/${messageId}`, { userId, text: newText });
    return res;
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
    const res = await apiService.delete(`/conversations/${conversationId}/messages/${messageId}`, { userId });
    return res;
  } catch (error: any) {
    console.error('❌ deleteMessage error:', error);
    return { success: false, error: error.message };
  }
}

