import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../config/firebase";

export async function updateUserSectionsOrder(userId: string, sections: any[]) {
  try {
    const sectionOrder = sections.map(s => s.name); // or s.id if you use IDs
    console.log('📝 Updating section order for user:', userId);
    console.log('   New order:', sectionOrder);

    const userDoc = doc(db, "users", userId);
    await updateDoc(userDoc, { sectionOrder });

    console.log('✅ Section order saved to database');
    return { success: true };
  } catch (error: any) {
    console.error('❌ Error updating section order:', error);
    return { success: false, error: error.message };
  }
}
