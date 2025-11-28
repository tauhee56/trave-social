import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { db } from "../../config/firebase";

export async function getUserSectionsSorted(userId: string) {
  try {
    // Fetch all sections for the user
    const sectionsSnap = await getDocs(collection(db, "users", userId, "sections"));
    const sections = sectionsSnap.docs.map(doc => ({ ...doc.data(), name: doc.id }));

    // Fetch sectionOrder from user doc
    const userDocSnap = await getDoc(doc(db, "users", userId));
    const userData = userDocSnap.exists() ? userDocSnap.data() : {};
    const order = userData.sectionOrder || [];

    // Sort sections by order
    const sortedSections = order.length
      ? order.map((name: string) => sections.find((s) => s.name === name)).filter(Boolean)
      : sections;

    return { success: true, data: sortedSections };
  } catch (error) {
    return { success: false, error };
  }
}
