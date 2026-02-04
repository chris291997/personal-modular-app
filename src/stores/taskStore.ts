import { create } from 'zustand';
import { JiraTicket } from '../types';
import * as taskService from '../services/taskService';

interface TaskState {
  // Data
  tickets: JiraTicket[];
  
  // Loading state
  loading: boolean;
  
  // Error state
  error: string | null;
  
  // Last fetch timestamp
  lastFetched: number | null;
  
  // Actions
  loadTickets: (force?: boolean) => Promise<void>;
  addTicket: (ticket: Omit<JiraTicket, 'id' | 'created' | 'updated'>) => Promise<void>;
  updateTicket: (id: string, updates: Partial<JiraTicket>) => Promise<void>;
  deleteTicket: (id: string) => Promise<void>;
  
  // Reset store
  reset: () => void;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const useTaskStore = create<TaskState>((set, get) => ({
  // Initial state
  tickets: [],
  loading: false,
  error: null,
  lastFetched: null,
  
  // Load tickets
  loadTickets: async (force = false) => {
    const state = get();
    const lastFetched = state.lastFetched;
    const now = Date.now();
    
    // Use cache if available and not forcing refresh
    if (!force && lastFetched && (now - lastFetched) < CACHE_DURATION && state.tickets.length > 0) {
      return;
    }
    
    set({ loading: true, error: null });
    
    try {
      const data = await taskService.getSavedTickets();
      set({
        tickets: data,
        loading: false,
        error: null,
        lastFetched: now,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load tickets';
      set({
        loading: false,
        error: errorMessage,
      });
      throw error;
    }
  },
  
  // Add ticket
  addTicket: async (ticket) => {
    const id = await taskService.saveTicket(ticket);
    const newTicket: JiraTicket = {
      ...ticket,
      id,
      created: new Date(),
      updated: new Date(),
    };
    set({ tickets: [newTicket, ...get().tickets] });
  },
  
  // Update ticket
  updateTicket: async (id, updates) => {
    await taskService.updateTicket(id, updates);
    await get().loadTickets(true); // Force refresh
  },
  
  // Delete ticket
  deleteTicket: async (id) => {
    await taskService.deleteTicket(id);
    set({ tickets: get().tickets.filter(t => t.id !== id) });
  },
  
  // Reset store
  reset: () => {
    set({
      tickets: [],
      loading: false,
      error: null,
      lastFetched: null,
    });
  },
}));
