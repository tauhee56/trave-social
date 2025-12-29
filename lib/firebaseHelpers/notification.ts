// Get notifications for a user
export async function getUserNotifications(userId: string) {
  try {
    const res = await fetch(`/api/users/${userId}/notifications`);
    const data = await res.json();
    if (data.success) {
      return data.data;
    } else {
      return [];
    }
  } catch (error: any) {
    return [];
  }
}
// Notification-related Firestore helpers


/**
 * Add notification to user's notifications subcollection
 */
export async function addNotification(recipientId: string, senderId: string, type: string, message: string, createdAt: any) {
  try {
    const res = await fetch(`/api/notifications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipientId, senderId, type, message, createdAt })
    });
    const data = await res.json();
    return data;
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
