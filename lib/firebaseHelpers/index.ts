// Post feed helper for search
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { db } from '../../config/firebase';

/**
 * Get all posts with pagination
 * OPTIMIZATION: Added limit to prevent fetching all posts (expensive!)
 */
export async function getAllPosts(limitCount: number = 100) {
	   try {
		   const postsRef = collection(db, 'posts');
		   const q = query(postsRef, orderBy('createdAt', 'desc'), limit(limitCount));
		   const snapshot = await getDocs(q);
		   console.log('getAllPosts: snapshot.docs.length =', snapshot.docs.length);
		   const posts = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
		   console.log('getAllPosts: mapped posts =', posts);
		   return { success: true, data: posts };
	   } catch (error: any) {
		   console.log('getAllPosts: error =', error);
		   return { success: false, error: error.message, data: [] };
	   }
}

// Get regions for search modal from Firebase
export async function getRegions() {
	try {
		const regionsRef = collection(db, 'regions');
		const q = query(regionsRef, orderBy('order', 'asc'));
		const snapshot = await getDocs(q);
		const regions = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
		return { success: true, data: regions };
	} catch (error: any) {
		console.error('Error fetching regions:', error);
		return { success: false, error: error.message, data: [] };
	}
}

// Export all functions from main firebaseHelpers
export {
    createPost,
    createStory, deleteImage, getCurrentUser, signInUser,
    signOutUser, signUpUser, uploadImage
} from '../firebaseHelpers';

export { getOrCreateConversation, getUserConversations, markConversationAsRead, sendMessage, subscribeToConversations } from './conversation';
export { followUser, isApprovedFollower, rejectFollowRequest, sendFollowRequest, unfollowUser } from './follow';
export { addStoryToHighlight, createHighlight, deleteHighlight, removeStoryFromHighlight, updateHighlight } from './highlights';
export { deleteMessage, editMessage, reactToMessage, subscribeToMessages } from './messages';
export { addNotification, getUserNotifications } from './notification';
export { addPassportTicket, deletePassportTicket, getPassportTickets, updatePassportTicket } from './passport';
export { getAllStoriesForFeed, getHighlightStories, getUserHighlights, getUserPosts, getUserProfile, getUserSections, getUserStories, searchUsers, updateUserProfile, updateUserSection } from './user';
// Export sorted sections helper
export { getUserSectionsSorted } from './getUserSectionsSorted';
// Already exported above
export * from './conversation';
export * from './follow';
export * from './live';
export * from './notification';
export * from './passport';
export * from './post';
// Section helpers for EditSectionsModal
export async function addUserSection(userId: string, section: { name: string, postIds: string[], coverImage?: string }) {
	try {
		console.log('🔥 addUserSection called:', { userId, sectionName: section.name });

		const { setDoc, doc } = await import('firebase/firestore');
		const { db } = await import('../../config/firebase');

		const sectionRef = doc(db, 'users', userId, 'sections', section.name);
		console.log('📍 Section path:', `users/${userId}/sections/${section.name}`);

		await setDoc(sectionRef, {
			postIds: section.postIds || [],
			coverImage: section.coverImage || '',
			createdAt: new Date()
		});

		console.log('✅ Section created successfully in Firestore');
		return { success: true };
	} catch (error: any) {
		console.error('❌ addUserSection error:', error);
		return { success: false, error: error.message };
	}
}
export async function deleteUserSection(userId: string, sectionName: string) {
	try {
		const { deleteDoc, doc } = await import('firebase/firestore');
		const { db } = await import('../../config/firebase');
		await deleteDoc(doc(db, 'users', userId, 'sections', sectionName));
		return { success: true };
	} catch (error: any) {
		return { success: false, error: error.message };
	}
}
export async function updateUserSectionsOrder(userId: string, sections: any[]) {
	// Implement actual logic as needed
	return { success: true };
}
// Comment reply helper for StoriesViewer
export async function addCommentReply(storyId: string, commentId: string, reply: any) {
	// Implement actual logic as needed
	return { success: true };
}
// Export category functions from main firebaseHelpers
export { DEFAULT_CATEGORIES, ensureDefaultCategories, getCategories } from '../firebaseHelpers';
