import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { JiraTicket } from '../types';

// Save ticket to Firestore
export const saveTicket = async (ticket: Omit<JiraTicket, 'id' | 'created' | 'updated'>): Promise<string> => {
  const now = new Date();
  const docRef = await addDoc(collection(db, 'tickets'), {
    ...ticket,
    created: Timestamp.fromDate(now),
    updated: Timestamp.fromDate(now),
    isManual: true, // Flag to identify manually added tickets
  });
  return docRef.id;
};

// Get all saved tickets
export const getSavedTickets = async (): Promise<JiraTicket[]> => {
  const snapshot = await getDocs(query(collection(db, 'tickets'), orderBy('updated', 'desc')));
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    created: doc.data().created.toDate(),
    updated: doc.data().updated.toDate(),
  })) as JiraTicket[];
};

// Update ticket
export const updateTicket = async (id: string, updates: Partial<JiraTicket>): Promise<void> => {
  const ticketRef = doc(db, 'tickets', id);
  await updateDoc(ticketRef, {
    ...updates,
    updated: Timestamp.fromDate(new Date()),
  });
};

// Delete ticket
export const deleteTicket = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, 'tickets', id));
};
