// Archive conversation helpers

export async function archiveConversation(conversationId: string, userId: string) {
  try {
    const res = await fetch(`/api/conversations/${conversationId}/archive`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });
    const data = await res.json();
    return data;
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function unarchiveConversation(conversationId: string, userId: string) {
  try {
    const res = await fetch(`/api/conversations/${conversationId}/unarchive`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });
    const data = await res.json();
    return data;
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getArchivedConversations(userId: string) {
  try {
    const res = await fetch(`/api/users/${userId}/conversations/archived`);
    const data = await res.json();
    return { success: data.success !== false, data: data.data || [] };
  } catch (error: any) {
    return { success: false, error: error.message, data: [] };
  }
}
