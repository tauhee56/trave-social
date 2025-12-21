/**
 * User Presence & Activity Status Management
 * Tracks when users are online, typing, active in DM, etc.
 */

import { doc, getDoc, onSnapshot, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

export interface UserPresence {
  userId: string;
  isOnline: boolean;
  lastSeen: Date;
  activeInConversation?: string; // conversationId if currently in DM
  typing?: boolean;
}

/**
 * Update user presence when they open app or start messaging
 */
export async function updateUserPresence(userId: string, conversationId?: string) {
  try {
    const userRef = doc(db, 'users', userId);
    const presenceRef = doc(db, 'presence', userId);

    // Update main user doc
    await updateDoc(userRef, {
      lastSeen: serverTimestamp(),
      isOnline: true,
      activeInConversation: conversationId || null,
    }).catch(async () => {
      // If doc doesn't exist, create it
      await setDoc(userRef, {
        lastSeen: serverTimestamp(),
        isOnline: true,
        activeInConversation: conversationId || null,
      }, { merge: true });
    });

    // Also update presence collection for faster queries
    await setDoc(presenceRef, {
      userId,
      isOnline: true,
      lastSeen: serverTimestamp(),
      activeInConversation: conversationId || null,
    }, { merge: true });
  } catch (error) {
    console.error('Error updating presence:', error);
  }
}

/**
 * Mark user as offline when they close app or leave conversation
 */
export async function updateUserOffline(userId: string) {
  try {
    const userRef = doc(db, 'users', userId);
    const presenceRef = doc(db, 'presence', userId);

    await updateDoc(userRef, {
      isOnline: false,
      lastSeen: serverTimestamp(),
      activeInConversation: null,
    });

    await updateDoc(presenceRef, {
      isOnline: false,
      lastSeen: serverTimestamp(),
      activeInConversation: null,
    });
  } catch (error) {
    console.error('Error updating offline status:', error);
  }
}

/**
 * Subscribe to user's online status - returns real-time updates
 */
export function subscribeToUserPresence(userId: string, callback: (presence: UserPresence | null) => void) {
  try {
    const presenceRef = doc(db, 'presence', userId);
    
    return onSnapshot(presenceRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        callback({
          userId,
          isOnline: data.isOnline || false,
          lastSeen: data.lastSeen?.toDate?.() || new Date(),
          activeInConversation: data.activeInConversation,
          typing: data.typing || false,
        });
      } else {
        callback(null);
      }
    });
  } catch (error) {
    console.error('Error subscribing to presence:', error);
    return () => {};
  }
}

/**
 * Get user's online status (one-time read)
 */
export async function getUserPresence(userId: string): Promise<UserPresence | null> {
  try {
    const presenceRef = doc(db, 'presence', userId);
    const snapshot = await getDoc(presenceRef);
    
    if (snapshot.exists()) {
      const data = snapshot.data();
      return {
        userId,
        isOnline: data.isOnline || false,
        lastSeen: data.lastSeen?.toDate?.() || new Date(),
        activeInConversation: data.activeInConversation,
        typing: data.typing || false,
      };
    }
    return null;
  } catch (error) {
    console.error('Error getting presence:', error);
    return null;
  }
}

/**
 * Get formatted active status text for display
 * e.g., "Active now", "Active 5m ago", "Active yesterday"
 */
export function getFormattedActiveStatus(presence: UserPresence | null): string {
  if (!presence) return 'Offline';
  
  if (presence.isOnline) {
    return 'Active now';
  }

  const now = new Date();
  const lastSeen = new Date(presence.lastSeen);
  const diffMs = now.getTime() - lastSeen.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) {
    return 'Active now';
  } else if (diffMins < 60) {
    return `Active ${diffMins}m ago`;
  } else if (diffHours < 24) {
    return `Active ${diffHours}h ago`;
  } else if (diffDays === 1) {
    return 'Active yesterday';
  } else if (diffDays < 30) {
    return `Active ${diffDays}d ago`;
  } else {
    return 'Offline';
  }
}

/**
 * Update typing status in conversation
 */
export async function updateTypingStatus(userId: string, conversationId: string, isTyping: boolean) {
  try {
    const presenceRef = doc(db, 'presence', userId);
    await updateDoc(presenceRef, {
      typing: isTyping,
      activeInConversation: conversationId,
    });
  } catch (error) {
    console.error('Error updating typing status:', error);
  }
}
