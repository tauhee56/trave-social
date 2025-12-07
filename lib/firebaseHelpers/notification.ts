// Get notifications for a user
export async function getUserNotifications(userId: string) {
  try {
    const notificationsRef = collection(db, 'users', userId, 'notifications');
    const q = query(notificationsRef, where('read', '==', false));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
  } catch (error: any) {
    return [];
  }
}
// Notification-related Firestore helpers
import { addDoc, collection, doc, getDoc, getDocs, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { db } from '../../config/firebase';

/**
 * Add notification to user's notifications subcollection
 */
export async function addNotification({ recipientId, senderId, type, message, createdAt }: any) {
  try {
    const notificationsRef = collection(db, 'users', recipientId, 'notifications');
    let senderName = '';
    let senderAvatar = '';
      try {
        const senderDoc = await getDoc(doc(db, 'users', senderId));
        if (senderDoc.exists()) {
          const senderData = senderDoc.data();
          senderName = senderData.displayName || senderData.name || 'User';
          senderAvatar = senderData.avatar || senderData.photoURL || 'https://firebasestorage.googleapis.com/v0/b/travel-app-3da72.firebasestorage.app/o/default%2Fdefault-pic.jpg?alt=media&token=7177f487-a345-4e45-9a56-732f03dbf65d';
        }
      } catch (err) {
        // Silent catch for senderDoc fetch
      }
      // Debug log for notification creation
      console.log('[NOTIFICATION DEBUG]', {
        recipientId,
        senderId,
        type,
        message,
        createdAt,
        postId: arguments[0].postId,
        commentId: arguments[0].commentId,
        extra: arguments[0]
      });
    const notifData = {
      ...arguments[0],
      senderName,
      senderAvatar,
      createdAt: serverTimestamp(),
      read: false,
    };
    await addDoc(notificationsRef, notifData);
    // Auto-create conversation for DM/message notifications
    if (type === 'dm' || type === 'message') {
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
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
