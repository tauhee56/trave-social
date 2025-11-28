import { deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../config/firebase';

export async function deleteStory(storyId: string) {
  try {
    await deleteDoc(doc(db, 'stories', storyId));
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
