/**
 * Mentions & Hashtags System
 * Support for @mentions and #hashtags in posts and comments
 */

import {
    arrayUnion,
    collection,
    doc,
    getDocs,
    query,
    serverTimestamp,
    updateDoc,
    where,
} from 'firebase/firestore';
import { db } from '../config/firebase';

export interface Mention {
  userId: string;
  username: string;
  index: number; // Position in text where mention occurs
}

export interface Hashtag {
  tag: string;
  index: number;
  postCount?: number;
  trendingRank?: number;
}

export interface ContentMetadata {
  mentions: Mention[];
  hashtags: Hashtag[];
  rawText: string;
  displayText: string; // Text with formatted mentions
}

/**
 * Extract mentions from text (@username)
 * Returns array of found mentions
 */
export function extractMentions(text: string): Mention[] {
  const mentions: Mention[] = [];
  const mentionRegex = /@(\w+)/g;
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    mentions.push({
      userId: '', // Will be populated during validation
      username: match[1],
      index: match.index,
    });
  }

  return mentions;
}

/**
 * Extract hashtags from text (#tag)
 * Returns array of found hashtags
 */
export function extractHashtags(text: string): Hashtag[] {
  const hashtags: Hashtag[] = [];
  const hashtagRegex = /#(\w+)/g;
  const seen = new Set<string>();
  let match;

  while ((match = hashtagRegex.exec(text)) !== null) {
    const tag = match[1];
    const lower = tag.toLowerCase();

    // Avoid duplicates
    if (!seen.has(lower)) {
      hashtags.push({
        tag,
        index: match.index,
      });
      seen.add(lower);
    }
  }

  return hashtags;
}

/**
 * Validate mentions - check if users exist
 * Returns validated mentions with userIds
 */
export async function validateMentions(mentions: Mention[]): Promise<Mention[]> {
  try {
    const validated: Mention[] = [];

    for (const mention of mentions) {
      // Search for user by username
      const usersQuery = query(
        collection(db, 'users'),
        where('userName', '==', mention.username)
      );

      const snapshot = await getDocs(usersQuery);

      if (!snapshot.empty) {
        const userId = snapshot.docs[0].id;
        validated.push({
          ...mention,
          userId,
        });
      }
    }

    return validated;
  } catch (error) {
    console.error('Validate mentions error:', error);
    return [];
  }
}

/**
 * Send mention notification to user
 */
export async function sendMentionNotification(
  userId: string,
  mentionedBy: string,
  contentId: string,
  contentType: 'post' | 'comment',
  contentText?: string
): Promise<boolean> {
  try {
    // Get mentioner's profile
    const { getDoc, doc: firestoreDoc } = await import('firebase/firestore');
    const mentionerSnapshot = await getDoc(firestoreDoc(db, 'users', mentionedBy));
    const mentionerDoc = mentionerSnapshot.data();

    // Create notification
    await updateDoc(doc(db, 'users', userId), {
      notifications: arrayUnion({
        type: 'mention',
        senderId: mentionedBy,
        senderName: mentionerDoc?.displayName || 'Unknown',
        senderAvatar: mentionerDoc?.avatar,
        contentId,
        contentType,
        contentPreview: contentText?.substring(0, 100),
        createdAt: serverTimestamp(),
        read: false,
      }),
    });

    return true;
  } catch (error) {
    console.error('Send mention notification error:', error);
    return false;
  }
}

/**
 * Track hashtag usage
 */
export async function trackHashtag(hashtag: string): Promise<boolean> {
  try {
    const hashtagRef = doc(db, 'hashtags', hashtag.toLowerCase());

    await updateDoc(hashtagRef, {
      usageCount: arrayUnion(1),
      lastUsed: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }).catch(async () => {
      // Create if doesn't exist
      await (
        await import('firebase/firestore').then(({ setDoc }) =>
          setDoc(hashtagRef, {
            tag: hashtag,
            usageCount: 1,
            createdAt: serverTimestamp(),
            lastUsed: serverTimestamp(),
          })
        )
      );
    });

    return true;
  } catch (error) {
    console.error('Track hashtag error:', error);
    return false;
  }
}

/**
 * Get trending hashtags
 */
export async function getTrendingHashtags(limit: number = 10): Promise<Hashtag[]> {
  try {
    const hashtagsQuery = query(
      collection(db, 'hashtags'),
      ...[
        // Add orderBy('usageCount', 'desc') when available
      ]
    );

    const snapshot = await getDocs(hashtagsQuery);
    const hashtags = snapshot.docs.map((doc) => ({
      tag: doc.data().tag,
      index: 0,
      postCount: doc.data().usageCount || 0,
    }));

    return hashtags.slice(0, limit);
  } catch (error) {
    console.error('Get trending hashtags error:', error);
    return [];
  }
}

/**
 * Process content text - validate mentions, track hashtags
 */
export async function processContentMetadata(
  text: string
): Promise<ContentMetadata> {
  try {
    // Extract mentions and hashtags
    const mentions = extractMentions(text);
    const hashtags = extractHashtags(text);

    // Validate mentions
    const validatedMentions = await validateMentions(mentions);

    // Track hashtags
    for (const hashtag of hashtags) {
      await trackHashtag(hashtag.tag);
    }

    // Create display text with links (for rendering)
    let displayText = text;

    // Replace mentions with formatted version
    validatedMentions.forEach((mention) => {
      displayText = displayText.replace(
        new RegExp(`@${mention.username}`, 'g'),
        `[@${mention.username}]`
      );
    });

    // Replace hashtags with formatted version
    hashtags.forEach((hashtag) => {
      displayText = displayText.replace(
        new RegExp(`#${hashtag.tag}`, 'g'),
        `[#${hashtag.tag}]`
      );
    });

    return {
      mentions: validatedMentions,
      hashtags,
      rawText: text,
      displayText,
    };
  } catch (error) {
    console.error('Process metadata error:', error);
    return {
      mentions: [],
      hashtags: [],
      rawText: text,
      displayText: text,
    };
  }
}

/**
 * Get all posts with specific hashtag
 */
export async function getPostsByHashtag(hashtag: string): Promise<any[]> {
  try {
    const postsQuery = query(
      collection(db, 'posts'),
      where('hashtags', 'array-contains', hashtag.toLowerCase())
    );

    const snapshot = await getDocs(postsQuery);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error('Get posts by hashtag error:', error);
    return [];
  }
}

/**
 * Get user mentions (posts where user is mentioned)
 */
export async function getUserMentions(userId: string): Promise<any[]> {
  try {
    const postsQuery = query(
      collection(db, 'posts'),
      where('mentions.userId', 'array-contains', userId)
    );

    const snapshot = await getDocs(postsQuery);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error('Get mentions error:', error);
    return [];
  }
}

export default {
  extractMentions,
  extractHashtags,
  validateMentions,
  sendMentionNotification,
  trackHashtag,
  getTrendingHashtags,
  processContentMetadata,
  getPostsByHashtag,
  getUserMentions,
};
