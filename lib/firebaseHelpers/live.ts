// Live streaming helpers
import { collection, deleteDoc, doc, getDocs, increment, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';
import { db } from '../../config/firebase';

export async function getActiveLiveStreams() {
  try {
    const streamsRef = collection(db, 'liveStreams');
    const q = query(streamsRef, where('isLive', '==', true), orderBy('startedAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
  } catch (error: any) {
    return [];
  }
}

export async function joinLiveStream(streamId: string, userId: string) {
  try {
    const streamRef = doc(db, 'liveStreams', streamId);
    const viewerRef = doc(db, 'liveStreams', streamId, 'viewers', userId);
    await setDoc(viewerRef, { userId, joinedAt: serverTimestamp() });
    await updateDoc(streamRef, { viewerCount: increment(1) });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function leaveLiveStream(streamId: string, userId: string) {
  try {
    const streamRef = doc(db, 'liveStreams', streamId);
    const viewerRef = doc(db, 'liveStreams', streamId, 'viewers', userId);
    await deleteDoc(viewerRef);
    await updateDoc(streamRef, { viewerCount: increment(-1) });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export function subscribeToLiveStream(streamId: string, callback: (stream: any) => void) {
  const streamRef = doc(db, 'liveStreams', streamId);
  return onSnapshot(streamRef, (snapshot: any) => {
    if (snapshot.exists()) {
      callback({ id: snapshot.id, ...snapshot.data() });
    }
  });
}

export function subscribeToLiveComments(streamId: string, callback: (comments: any[]) => void) {
  const commentsRef = collection(db, 'liveStreams', streamId, 'comments');
  const q = query(commentsRef, orderBy('createdAt', 'asc'));
  return onSnapshot(q, (snapshot: any) => {
    const comments = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
    callback(comments);
  });
}
