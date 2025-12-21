/**
 * Group Chat Database Schema & Utilities
 * Firestore structure for group conversations
 */

import {
    addDoc,
    arrayRemove,
    arrayUnion,
    collection,
    doc,
    getDoc,
    getDocs,
    limit,
    orderBy,
    query,
    serverTimestamp,
    Timestamp,
    updateDoc,
    where,
} from 'firebase/firestore';
import {
    db,
} from '../config/firebase';

/**
 * Firestore Collection Structure:
 * 
 * /groupChats/{groupId}
 *   - name: string
 *   - description: string
 *   - avatar: string
 *   - members: string[] (user IDs)
 *   - admins: string[] (admin user IDs)
 *   - createdBy: string (creator user ID)
 *   - createdAt: timestamp
 *   - updatedAt: timestamp
 *   - lastMessage: string
 *   - lastMessageAt: timestamp
 *   - isPublic: boolean
 *   - maxMembers: number (0 = unlimited)
 *   - currentMemberCount: number
 *
 * /groupChats/{groupId}/messages/{messageId}
 *   - senderId: string
 *   - text: string
 *   - media?: { type: 'image'|'video'|'file', url: string, size: number }
 *   - reactions: { emoji: string, userIds: string[] }[]
 *   - createdAt: timestamp
 *   - editedAt?: timestamp
 *   - deletedAt?: timestamp
 *   - replyTo?: messageId
 *
 * /groupChats/{groupId}/members/{userId}
 *   - joinedAt: timestamp
 *   - role: 'member'|'moderator'|'admin'
 *   - isMuted: boolean
 *   - notifications: 'all'|'mentions'|'none'
 */

export interface GroupChat {
  id?: string;
  name: string;
  description: string;
  avatar?: string;
  members: string[];
  admins: string[];
  createdBy: string;
  createdAt?: Date;
  updatedAt?: Date;
  lastMessage?: string;
  lastMessageAt?: Date;
  isPublic: boolean;
  maxMembers: number;
  currentMemberCount: number;
}

export interface GroupMessage {
  id?: string;
  senderId: string;
  text: string;
  media?: {
    type: 'image' | 'video' | 'file';
    url: string;
    size: number;
  };
  reactions?: Array<{ emoji: string; userIds: string[] }>;
  createdAt?: Date;
  editedAt?: Date;
  deletedAt?: Date;
  replyTo?: string;
}

export interface GroupMember {
  userId: string;
  joinedAt?: Date;
  role: 'member' | 'moderator' | 'admin';
  isMuted: boolean;
  notifications: 'all' | 'mentions' | 'none';
}

/**
 * Create a new group chat
 */
export async function createGroupChat(
  creatorId: string,
  groupData: Partial<GroupChat>
): Promise<string> {
  try {
    const newGroup: GroupChat = {
      name: groupData.name || 'New Group',
      description: groupData.description || '',
      avatar: groupData.avatar,
      members: [creatorId, ...(groupData.members || [])],
      admins: [creatorId],
      createdBy: creatorId,
      createdAt: new Date(),
      updatedAt: new Date(),
      isPublic: groupData.isPublic ?? false,
      maxMembers: groupData.maxMembers ?? 100,
      currentMemberCount: 1 + (groupData.members?.length || 0),
    };

    const docRef = await addDoc(collection(db, 'groupChats'), newGroup);
    
    // Create member entries for all initial members
    for (const memberId of newGroup.members) {
      await updateDoc(
        doc(db, 'groupChats', docRef.id, 'members', memberId),
        {
          userId: memberId,
          joinedAt: new Date(),
          role: memberId === creatorId ? 'admin' : 'member',
          isMuted: false,
          notifications: 'all',
        }
      );
    }

    return docRef.id;
  } catch (error) {
    console.error('Create group chat error:', error);
    throw error;
  }
}

/**
 * Add member to group
 */
export async function addGroupMember(
  groupId: string,
  userId: string,
  role: 'member' | 'moderator' | 'admin' = 'member'
): Promise<boolean> {
  try {
    const groupRef = doc(db, 'groupChats', groupId);
    const groupSnapshot = await getDoc(groupRef);

    if (!groupSnapshot.exists()) {
      throw new Error('Group not found');
    }

    const group = groupSnapshot.data() as GroupChat;

    // Check if already member
    if (group.members.includes(userId)) {
      return false;
    }

    // Check max members limit
    if (group.maxMembers > 0 && group.currentMemberCount >= group.maxMembers) {
      throw new Error('Group is full');
    }

    // Add to members array
    await updateDoc(groupRef, {
      members: arrayUnion(userId),
      currentMemberCount: group.currentMemberCount + 1,
      updatedAt: serverTimestamp(),
    });

    // Create member entry
    await updateDoc(
      doc(db, 'groupChats', groupId, 'members', userId),
      {
        userId,
        joinedAt: new Date(),
        role,
        isMuted: false,
        notifications: 'all',
      }
    );

    return true;
  } catch (error) {
    console.error('Add member error:', error);
    throw error;
  }
}

/**
 * Remove member from group
 */
export async function removeGroupMember(
  groupId: string,
  userId: string
): Promise<boolean> {
  try {
    const groupRef = doc(db, 'groupChats', groupId);
    const groupSnapshot = await getDoc(groupRef);

    if (!groupSnapshot.exists()) {
      throw new Error('Group not found');
    }

    const group = groupSnapshot.data() as GroupChat;

    if (!group.members.includes(userId)) {
      return false;
    }

    // Remove from members
    await updateDoc(groupRef, {
      members: arrayRemove(userId),
      currentMemberCount: Math.max(0, group.currentMemberCount - 1),
      updatedAt: serverTimestamp(),
    });

    // Remove member entry
    await updateDoc(
      doc(db, 'groupChats', groupId, 'members', userId),
      {
        leftAt: new Date(),
      }
    );

    return true;
  } catch (error) {
    console.error('Remove member error:', error);
    throw error;
  }
}

/**
 * Promote member to admin/moderator
 */
export async function promoteGroupMember(
  groupId: string,
  userId: string,
  role: 'admin' | 'moderator'
): Promise<boolean> {
  try {
    const groupRef = doc(db, 'groupChats', groupId);
    const groupSnapshot = await getDoc(groupRef);

    if (!groupSnapshot.exists()) {
      throw new Error('Group not found');
    }

    if (role === 'admin') {
      await updateDoc(groupRef, {
        admins: arrayUnion(userId),
        updatedAt: serverTimestamp(),
      });
    }

    // Update member role
    await updateDoc(
      doc(db, 'groupChats', groupId, 'members', userId),
      { role }
    );

    return true;
  } catch (error) {
    console.error('Promote member error:', error);
    throw error;
  }
}

/**
 * Send message to group
 */
export async function sendGroupMessage(
  groupId: string,
  message: GroupMessage
): Promise<string> {
  try {
    const docRef = await addDoc(
      collection(db, 'groupChats', groupId, 'messages'),
      {
        ...message,
        createdAt: serverTimestamp(),
      }
    );

    // Update group's last message
    await updateDoc(doc(db, 'groupChats', groupId), {
      lastMessage: message.text,
      lastMessageAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return docRef.id;
  } catch (error) {
    console.error('Send message error:', error);
    throw error;
  }
}

/**
 * Get group chat by ID
 */
export async function getGroupChat(groupId: string): Promise<GroupChat | null> {
  try {
    const snapshot = await getDoc(doc(db, 'groupChats', groupId));
    if (snapshot.exists()) {
      return { id: snapshot.id, ...snapshot.data() } as GroupChat;
    }
    return null;
  } catch (error) {
    console.error('Get group error:', error);
    throw error;
  }
}

/**
 * Get all groups for a user
 */
export async function getUserGroupChats(userId: string): Promise<GroupChat[]> {
  try {
    const q = query(
      collection(db, 'groupChats'),
      where('members', 'array-contains', userId),
      orderBy('updatedAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as GroupChat[];
  } catch (error) {
    console.error('Get user groups error:', error);
    return [];
  }
}

/**
 * Get group messages with pagination
 */
export async function getGroupMessages(
  groupId: string,
  pageLimit: number = 50,
  startAfter?: Timestamp
): Promise<GroupMessage[]> {
  try {
    let q = query(
      collection(db, 'groupChats', groupId, 'messages'),
      orderBy('createdAt', 'desc'),
      limit(pageLimit)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as GroupMessage[];
  } catch (error) {
    console.error('Get messages error:', error);
    return [];
  }
}

/**
 * Mute/Unmute notifications for group
 */
export async function muteGroupNotifications(
  groupId: string,
  userId: string,
  mute: boolean
): Promise<boolean> {
  try {
    await updateDoc(
      doc(db, 'groupChats', groupId, 'members', userId),
      { isMuted: mute }
    );
    return true;
  } catch (error) {
    console.error('Mute error:', error);
    return false;
  }
}

/**
 * Delete group (admin only)
 */
export async function deleteGroupChat(
  groupId: string,
  userId: string
): Promise<boolean> {
  try {
    const groupRef = doc(db, 'groupChats', groupId);
    const snapshot = await getDoc(groupRef);

    if (!snapshot.exists()) {
      throw new Error('Group not found');
    }

    const group = snapshot.data() as GroupChat;

    // Check if user is admin
    if (!group.admins.includes(userId)) {
      throw new Error('Only admins can delete groups');
    }

    // Soft delete by marking as deleted
    await updateDoc(groupRef, {
      deletedAt: new Date(),
      active: false,
    });

    return true;
  } catch (error) {
    console.error('Delete group error:', error);
    throw error;
  }
}

export default {
  createGroupChat,
  addGroupMember,
  removeGroupMember,
  promoteGroupMember,
  sendGroupMessage,
  getGroupChat,
  getUserGroupChats,
  getGroupMessages,
  muteGroupNotifications,
  deleteGroupChat,
};
