// Post feed helper for search
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../../config/firebase';

export async function getAllPosts() {
	   try {
		   const postsRef = collection(db, 'posts');
		   const snapshot = await getDocs(postsRef);
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
		const { setDoc, doc } = await import('firebase/firestore');
		const { db } = await import('../../config/firebase');
		await setDoc(doc(db, 'users', userId, 'sections', section.name), {
			postIds: section.postIds || [],
			coverImage: section.coverImage || ''
		});
		return { success: true };
	} catch (error: any) {
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
