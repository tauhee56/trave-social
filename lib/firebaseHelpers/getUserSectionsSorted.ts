import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { db } from "../../config/firebase";

export async function getUserSectionsSorted(userId: string) {
  try {
    console.log('🔍 getUserSectionsSorted called for user:', userId);

    // Safety check: userId must be valid
    if (!userId || userId.trim() === '') {
      console.warn('⚠️ getUserSectionsSorted: Invalid userId, returning empty array');
      return { success: true, data: [] };
    }

    // Fetch all sections for the user
    const sectionsSnap = await getDocs(collection(db, "users", userId, "sections"));
    console.log('📋 Found sections:', sectionsSnap.docs.length);

    const sections = sectionsSnap.docs.map(doc => {
      const data = doc.data();
      console.log('  - Section:', doc.id, data);
      return { ...data, name: doc.id };
    });

    // Fetch sectionOrder from user doc
    const userDocSnap = await getDoc(doc(db, "users", userId));
    const userData = userDocSnap.exists() ? userDocSnap.data() : {};
    const order = userData.sectionOrder || [];
    console.log('📌 Section order from user doc:', order);

    // Sort sections by order, but include ALL sections (even ones not in order)
    let sortedSections: any[] = [];

    if (order.length > 0) {
      // First add sections in the specified order
      const orderedSections = order
        .map((name: string) => sections.find((s) => s.name === name))
        .filter(Boolean);

      // Then add any sections not in the order (new sections)
      const unorderedSections = sections.filter(
        (s) => !order.includes(s.name)
      );

      sortedSections = [...orderedSections, ...unorderedSections];
    } else {
      sortedSections = sections;
    }

    console.log('✅ Returning sorted sections:', sortedSections.length, sortedSections.map(s => s.name));
    return { success: true, data: sortedSections };
  } catch (error) {
    console.error('❌ getUserSectionsSorted error:', error);
    return { success: false, error };
  }
}
