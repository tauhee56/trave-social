import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';

export async function createOrUpdateUserFromSocial({ uid, name, avatar, provider }: { uid: string; name: string; avatar: string; provider: string }) {
  if (!uid) throw new Error('No UID provided');
  await setDoc(doc(db, 'users', uid), {
    displayName: name,
    avatar,
    provider,
    updatedAt: new Date().toISOString(),
  }, { merge: true });
}
