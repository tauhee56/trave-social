import { collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';

export async function fetchBlockedUserIds(uid: string): Promise<Set<string>> {
  const blocked = new Set<string>();
  try {
    const ref = collection(db, 'users', uid, 'blocked');
    const snap = await getDocs(ref);
    snap.forEach(doc => blocked.add(doc.id));
  } catch (e) {
    console.warn('Failed to load blocked users:', e);
  }
  return blocked;
}

export function filterOutBlocked<T extends Record<string, any>>(items: T[], blocked: Set<string>): T[] {
  return items.filter(i => {
    const uid = i.userId || i.ownerId || i.authorId;
    return uid ? !blocked.has(uid) : true;
  });
}
