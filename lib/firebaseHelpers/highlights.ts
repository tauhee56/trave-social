// Highlight-related Firestore helpers
import { addDoc, collection, deleteDoc, doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';

/**
 * Create a new highlight
 */
export async function createHighlight(
  userId: string, 
  name: string, 
  coverImage: string, 
  storyIds: string[] = []
) {
  try {
    const highlightData = {
      userId,
      name,
      coverImage,
      storyIds,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    
    const docRef = await addDoc(collection(db, 'highlights'), highlightData);
    
    return { success: true, highlightId: docRef.id };
  } catch (error: any) {
    console.error('❌ createHighlight error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Add a story to an existing highlight
 */
export async function addStoryToHighlight(highlightId: string, storyId: string) {
  try {
    const highlightRef = doc(db, 'highlights', highlightId);
    const highlightSnap = await getDoc(highlightRef);
    
    if (!highlightSnap.exists()) {
      return { success: false, error: 'Highlight not found' };
    }
    
    const highlightData = highlightSnap.data();
    const storyIds = highlightData.storyIds || [];
    
    // Check if story already exists in highlight
    if (storyIds.includes(storyId)) {
      return { success: false, error: 'Story already in highlight' };
    }
    
    // Add story to highlight
    await updateDoc(highlightRef, {
      storyIds: [...storyIds, storyId],
      updatedAt: serverTimestamp(),
    });
    
    return { success: true };
  } catch (error: any) {
    console.error('❌ addStoryToHighlight error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Remove a story from a highlight
 */
export async function removeStoryFromHighlight(highlightId: string, storyId: string) {
  try {
    const highlightRef = doc(db, 'highlights', highlightId);
    const highlightSnap = await getDoc(highlightRef);
    
    if (!highlightSnap.exists()) {
      return { success: false, error: 'Highlight not found' };
    }
    
    const highlightData = highlightSnap.data();
    const storyIds = highlightData.storyIds || [];
    
    // Remove story from highlight
    const updatedStoryIds = storyIds.filter((id: string) => id !== storyId);
    
    await updateDoc(highlightRef, {
      storyIds: updatedStoryIds,
      updatedAt: serverTimestamp(),
    });
    
    return { success: true };
  } catch (error: any) {
    console.error('❌ removeStoryFromHighlight error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update highlight details (name, cover image)
 */
export async function updateHighlight(
  highlightId: string, 
  updates: { name?: string; coverImage?: string }
) {
  try {
    const highlightRef = doc(db, 'highlights', highlightId);
    const highlightSnap = await getDoc(highlightRef);
    
    if (!highlightSnap.exists()) {
      return { success: false, error: 'Highlight not found' };
    }
    
    await updateDoc(highlightRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
    
    return { success: true };
  } catch (error: any) {
    console.error('❌ updateHighlight error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete a highlight
 */
export async function deleteHighlight(highlightId: string, userId: string) {
  try {
    const highlightRef = doc(db, 'highlights', highlightId);
    const highlightSnap = await getDoc(highlightRef);
    
    if (!highlightSnap.exists()) {
      return { success: false, error: 'Highlight not found' };
    }
    
    const highlightData = highlightSnap.data();
    
    // Check if user owns the highlight
    if (highlightData.userId !== userId) {
      return { success: false, error: 'Unauthorized' };
    }
    
    // Delete the highlight
    await deleteDoc(highlightRef);
    
    return { success: true };
  } catch (error: any) {
    console.error('❌ deleteHighlight error:', error);
    return { success: false, error: error.message };
  }
}

