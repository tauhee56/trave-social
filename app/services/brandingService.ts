import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';

// Fetches the logo URL from Firestore (branding/logoUrl)
export async function fetchLogoUrl(): Promise<string | null> {
  try {
    const docRef = doc(db, 'branding', 'logo');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data && data.url) {
        return data.url;
      }
    }
    return null;
  } catch (error) {
    console.error('Error fetching logo URL:', error);
    return null;
  }
}
