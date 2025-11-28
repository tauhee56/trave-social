import { doc, updateDoc } from "firebase/firestore";
import { db } from "../config/firebase";

export async function updateUserSectionsOrder(userId: string, sections: any[]) {
  const sectionOrder = sections.map(s => s.name); // or s.id if you use IDs
  const userDoc = doc(db, "users", userId);
  await updateDoc(userDoc, { sectionOrder });
}
