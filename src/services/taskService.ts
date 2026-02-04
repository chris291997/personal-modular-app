import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { JiraTicket } from '../types';

// Helper function to get current user ID from Firebase Auth
// Note: App.tsx ensures user is authenticated before rendering components
const getCurrentUserId = (): string => {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) {
    throw new Error('User must be authenticated. Please log in.');
  }
  return firebaseUser.uid;
};

// Save ticket to Firestore
export const saveTicket = async (ticket: Omit<JiraTicket, 'id' | 'created' | 'updated'>): Promise<string> => {
  const userId = getCurrentUserId();
  const now = new Date();
  const docRef = await addDoc(collection(db, 'tickets'), {
    ...ticket,
    userId: userId,
    created: Timestamp.fromDate(now),
    updated: Timestamp.fromDate(now),
    isManual: true, // Flag to identify manually added tickets
  });
  return docRef.id;
};

// Get all saved tickets
export const getSavedTickets = async (): Promise<JiraTicket[]> => {
  const userId = getCurrentUserId();
  
  try {
    const snapshot = await getDocs(
      query(
        collection(db, 'tickets'),
        where('userId', '==', userId),
        orderBy('updated', 'desc')
      )
    );
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      created: doc.data().created.toDate(),
      updated: doc.data().updated.toDate(),
    })) as JiraTicket[];
  } catch (error: unknown) {
    // If orderBy fails (missing index), try without orderBy
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('index') || errorMessage.includes('indexes')) {
      console.warn('Composite index missing, fetching without orderBy:', errorMessage);
      const snapshot = await getDocs(
        query(
          collection(db, 'tickets'),
          where('userId', '==', userId)
        )
      );
      const tickets = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        created: doc.data().created.toDate(),
        updated: doc.data().updated.toDate(),
      })) as JiraTicket[];
      // Sort manually by updated date
      return tickets.sort((a, b) => b.updated.getTime() - a.updated.getTime());
    }
    throw error;
  }
};

// Update ticket
export const updateTicket = async (id: string, updates: Partial<JiraTicket>): Promise<void> => {
  const userId = getCurrentUserId();
  
  // Verify the ticket belongs to the user
  const ticketSnap = await getDocs(query(collection(db, 'tickets'), where('userId', '==', userId)));
  const ticketDoc = ticketSnap.docs.find(d => d.id === id);
  if (!ticketDoc) {
    throw new Error('Ticket not found or access denied');
  }
  
  const ticketRef = doc(db, 'tickets', id);
  await updateDoc(ticketRef, {
    ...updates,
    updated: Timestamp.fromDate(new Date()),
  });
};

// Delete ticket
export const deleteTicket = async (id: string): Promise<void> => {
  const userId = getCurrentUserId();
  
  // Verify the ticket belongs to the user
  const ticketSnap = await getDocs(query(collection(db, 'tickets'), where('userId', '==', userId)));
  const ticketDoc = ticketSnap.docs.find(d => d.id === id);
  if (!ticketDoc) {
    throw new Error('Ticket not found or access denied');
  }
  
  await deleteDoc(doc(db, 'tickets', id));
};
