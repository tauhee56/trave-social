// Passport ticket helpers
import { addDoc, collection, deleteDoc, doc, getDocs, orderBy, query, updateDoc, where } from 'firebase/firestore';
import { db } from '../../config/firebase';

export async function addPassportTicket(userId: string, ticket: any) {
  try {
    const ticketRef = collection(db, 'users', userId, 'passportTickets');
    const q = query(ticketRef, where('countryCode', '==', ticket.countryCode));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      return { success: false, error: 'Ticket already exists for this country' };
    }
    await addDoc(ticketRef, {
      ...ticket,
      createdAt: new Date().toISOString(),
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getPassportTickets(userId: string) {
  try {
    // Get profile to check privacy
    const { getDoc } = require('firebase/firestore');
    const profileSnap = await getDoc(doc(db, 'users', userId));
    if (!profileSnap.exists()) return [];
    const profile = profileSnap.data();
    const isPrivate = !!profile.isPrivate;
    const approvedFollowers = Array.isArray(profile.approvedFollowers) ? profile.approvedFollowers : [];
    const currentUser = require('../firebaseHelpers').getCurrentUser?.() || {};
    const currentUserId = currentUser?.uid;
    const isOwner = currentUserId === userId;
    const isApproved = approvedFollowers.includes(currentUserId);
    if (isPrivate && !isOwner && !isApproved) {
      return [];
    }
    const ticketsRef = collection(db, 'users', userId, 'passportTickets');
    const q = query(ticketsRef, orderBy('visitDate', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
  } catch (error: any) {
    return [];
  }
}

export async function updatePassportTicket(userId: string, ticketId: string, updates: any) {
  try {
    const ticketRef = doc(db, 'users', userId, 'passportTickets', ticketId);
    await updateDoc(ticketRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deletePassportTicket(userId: string, ticketId: string) {
  try {
    const ticketRef = doc(db, 'users', userId, 'passportTickets', ticketId);
    await deleteDoc(ticketRef);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
