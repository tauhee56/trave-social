
/**
 * React to a message with an emoji (Instagram-style)
 */
export async function reactToMessage(conversationId: string, messageId: string, userId: string, emoji: string) {
  try {
    const res = await fetch(`/api/conversations/${conversationId}/messages/${messageId}/reactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, emoji })
    });
    const data = await res.json();
    return data;
  } catch (error: any) {
    console.error('❌ reactToMessage error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Subscribe to real-time messages in a conversation
 */
export function subscribeToMessages(conversationId: string, callback: (messages: any[]) => void) {
  // Use polling for messages
  const pollInterval = setInterval(async () => {
    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages`);
      const data = await res.json();
      if (data.success) {
        callback(data.data || []);
      }
    } catch (error) {
      console.error('Error polling messages:', error);
    }
  }, 5000);

  return () => clearInterval(pollInterval);
}

/**
 * Edit a message
 */
export async function editMessage(conversationId: string, messageId: string, userId: string, newText: string) {
  try {
    const res = await fetch(`/api/conversations/${conversationId}/messages/${messageId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, text: newText })
    });
    const data = await res.json();
    return data;
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
    const res = await fetch(`/api/conversations/${conversationId}/messages/${messageId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });
    const data = await res.json();
    return data;
  } catch (error: any) {
    console.error('❌ deleteMessage error:', error);
    return { success: false, error: error.message };
  }
}

