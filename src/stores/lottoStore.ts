import { create } from 'zustand';
import {
  GeneratedTicket,
  LottoBet,
  LottoDrawResult,
  LottoGame,
  LottoGeneratorStrategy,
  LottoReminder,
} from '../types';
import * as lottoService from '../services/lottoService';
import { generateTickets } from '../modules/lotto/utils/generator';

interface LottoState {
  draws: LottoDrawResult[];
  bets: LottoBet[];
  reminders: LottoReminder[];
  generatedTickets: GeneratedTicket[];
  loading: {
    draws: boolean;
    bets: boolean;
    reminders: boolean;
    generator: boolean;
  };
  errors: {
    draws: string | null;
    bets: string | null;
    reminders: string | null;
    generator: string | null;
  };
  lastFetched: {
    draws: number | null;
    bets: number | null;
    reminders: number | null;
  };
  loadDraws: (game?: LottoGame, force?: boolean) => Promise<void>;
  loadBets: (force?: boolean) => Promise<void>;
  loadReminders: (force?: boolean) => Promise<void>;
  addBet: (payload: Omit<LottoBet, 'id' | 'createdAt' | 'updatedAt' | 'resultStatus'>) => Promise<void>;
  updateBet: (id: string, payload: Partial<LottoBet>) => Promise<void>;
  deleteBet: (id: string) => Promise<void>;
  upsertReminder: (payload: Omit<LottoReminder, 'id' | 'createdAt' | 'updatedAt' | 'lastSentForDraw'>) => Promise<void>;
  runGenerator: (game: LottoGame, strategy: LottoGeneratorStrategy, ticketCount: number) => Promise<void>;
  clearGenerated: () => void;
  reset: () => void;
}

const CACHE_DURATION = 5 * 60 * 1000;

const emptyState = {
  draws: [],
  bets: [],
  reminders: [],
  generatedTickets: [],
  loading: {
    draws: false,
    bets: false,
    reminders: false,
    generator: false,
  },
  errors: {
    draws: null,
    bets: null,
    reminders: null,
    generator: null,
  },
  lastFetched: {
    draws: null,
    bets: null,
    reminders: null,
  },
};

export const useLottoStore = create<LottoState>((set, get) => ({
  ...emptyState,

  loadDraws: async (game?: LottoGame, force = false) => {
    const { lastFetched, draws } = get();
    const now = Date.now();
    if (!force && lastFetched.draws && now - lastFetched.draws < CACHE_DURATION && draws.length > 0) {
      return;
    }

    set(state => ({
      loading: { ...state.loading, draws: true },
      errors: { ...state.errors, draws: null },
    }));

    try {
      const data = await lottoService.getDrawResults(game);
      set(state => ({
        draws: data,
        loading: { ...state.loading, draws: false },
        errors: { ...state.errors, draws: null },
        lastFetched: { ...state.lastFetched, draws: now },
      }));
    } catch (error) {
      set(state => ({
        loading: { ...state.loading, draws: false },
        errors: {
          ...state.errors,
          draws: error instanceof Error ? error.message : 'Failed to load draw results',
        },
      }));
    }
  },

  loadBets: async (force = false) => {
    const { lastFetched, bets } = get();
    const now = Date.now();
    if (!force && lastFetched.bets && now - lastFetched.bets < CACHE_DURATION && bets.length > 0) {
      return;
    }

    set(state => ({
      loading: { ...state.loading, bets: true },
      errors: { ...state.errors, bets: null },
    }));

    try {
      const data = await lottoService.getBets();
      set(state => ({
        bets: data,
        loading: { ...state.loading, bets: false },
        errors: { ...state.errors, bets: null },
        lastFetched: { ...state.lastFetched, bets: now },
      }));
    } catch (error) {
      set(state => ({
        loading: { ...state.loading, bets: false },
        errors: {
          ...state.errors,
          bets: error instanceof Error ? error.message : 'Failed to load bets',
        },
      }));
    }
  },

  loadReminders: async (force = false) => {
    const { lastFetched, reminders } = get();
    const now = Date.now();
    if (!force && lastFetched.reminders && now - lastFetched.reminders < CACHE_DURATION && reminders.length > 0) {
      return;
    }

    set(state => ({
      loading: { ...state.loading, reminders: true },
      errors: { ...state.errors, reminders: null },
    }));

    try {
      const data = await lottoService.getReminders();
      set(state => ({
        reminders: data,
        loading: { ...state.loading, reminders: false },
        errors: { ...state.errors, reminders: null },
        lastFetched: { ...state.lastFetched, reminders: now },
      }));
    } catch (error) {
      set(state => ({
        loading: { ...state.loading, reminders: false },
        errors: {
          ...state.errors,
          reminders: error instanceof Error ? error.message : 'Failed to load reminders',
        },
      }));
    }
  },

  addBet: async payload => {
    await lottoService.addBet(payload);
    await get().loadBets(true);
  },

  updateBet: async (id, payload) => {
    await lottoService.updateBet(id, payload);
    await get().loadBets(true);
  },

  deleteBet: async id => {
    await lottoService.deleteBet(id);
    set(state => ({ bets: state.bets.filter(item => item.id !== id) }));
  },

  upsertReminder: async payload => {
    await lottoService.upsertReminder(payload);
    await get().loadReminders(true);
  },

  runGenerator: async (game, strategy, ticketCount) => {
    set(state => ({
      loading: { ...state.loading, generator: true },
      errors: { ...state.errors, generator: null },
    }));

    try {
      const draws = get().draws.length > 0 ? get().draws : await lottoService.getDrawResults(game, 300);
      const tickets = generateTickets(draws, { game, strategy, ticketCount });
      set(state => ({
        generatedTickets: tickets,
        loading: { ...state.loading, generator: false },
      }));
    } catch (error) {
      set(state => ({
        loading: { ...state.loading, generator: false },
        errors: {
          ...state.errors,
          generator: error instanceof Error ? error.message : 'Failed to generate tickets',
        },
      }));
    }
  },

  clearGenerated: () => {
    set({ generatedTickets: [] });
  },

  reset: () => {
    set(emptyState);
  },
}));
