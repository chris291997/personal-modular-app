import { create } from 'zustand';
import { Income, Expense, Debt, SavingsGoal, ExpenseCategory } from '../types';
import * as budgetService from '../services/budgetService';

interface BudgetState {
  // Data
  incomes: Income[];
  expenses: Expense[];
  debts: Debt[];
  savingsGoals: SavingsGoal[];
  categories: ExpenseCategory[];
  
  // Loading states
  loading: {
    incomes: boolean;
    expenses: boolean;
    debts: boolean;
    savingsGoals: boolean;
    categories: boolean;
  };
  
  // Error states
  errors: {
    incomes: string | null;
    expenses: string | null;
    debts: string | null;
    savingsGoals: string | null;
    categories: string | null;
  };
  
  // Last fetch timestamps (for cache invalidation)
  lastFetched: {
    incomes: number | null;
    expenses: number | null;
    debts: number | null;
    savingsGoals: number | null;
    categories: number | null;
  };
  
  // Actions
  loadIncomes: (startDate?: Date, endDate?: Date, force?: boolean) => Promise<void>;
  loadExpenses: (startDate?: Date, endDate?: Date, force?: boolean) => Promise<void>;
  loadDebts: (force?: boolean) => Promise<void>;
  loadSavingsGoals: (force?: boolean) => Promise<void>;
  loadCategories: (force?: boolean) => Promise<void>;
  
  // CRUD actions
  addIncome: (income: Omit<Income, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateIncome: (id: string, updates: Partial<Income>) => Promise<void>;
  deleteIncome: (id: string) => Promise<void>;
  
  addExpense: (expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateExpense: (id: string, updates: Partial<Expense>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  
  addDebt: (debt: Omit<Debt, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateDebt: (id: string, updates: Partial<Debt>) => Promise<void>;
  deleteDebt: (id: string) => Promise<void>;
  
  addSavingsGoal: (goal: Omit<SavingsGoal, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateSavingsGoal: (id: string, updates: Partial<SavingsGoal>) => Promise<void>;
  deleteSavingsGoal: (id: string) => Promise<void>;
  
  addCategory: (category: Omit<ExpenseCategory, 'id'>) => Promise<void>;
  
  // Reset store (useful for logout)
  reset: () => void;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const useBudgetStore = create<BudgetState>((set, get) => ({
  // Initial state
  incomes: [],
  expenses: [],
  debts: [],
  savingsGoals: [],
  categories: [],
  
  loading: {
    incomes: false,
    expenses: false,
    debts: false,
    savingsGoals: false,
    categories: false,
  },
  
  errors: {
    incomes: null,
    expenses: null,
    debts: null,
    savingsGoals: null,
    categories: null,
  },
  
  lastFetched: {
    incomes: null,
    expenses: null,
    debts: null,
    savingsGoals: null,
    categories: null,
  },
  
  // Load incomes
  loadIncomes: async (startDate?: Date, endDate?: Date, force = false) => {
    const state = get();
    const cacheKey = startDate && endDate 
      ? `incomes_${startDate.getTime()}_${endDate.getTime()}`
      : 'incomes_all';
    const lastFetched = state.lastFetched.incomes;
    const now = Date.now();
    
    // Use cache if available and not forcing refresh
    if (!force && lastFetched && (now - lastFetched) < CACHE_DURATION && state.incomes.length > 0) {
      return;
    }
    
    set(state => ({ loading: { ...state.loading, incomes: true }, errors: { ...state.errors, incomes: null } }));
    
    try {
      const data = await budgetService.getIncomes(startDate, endDate);
      set({
        incomes: data,
        loading: { ...get().loading, incomes: false },
        errors: { ...get().errors, incomes: null },
        lastFetched: { ...get().lastFetched, incomes: now },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load incomes';
      set({
        loading: { ...get().loading, incomes: false },
        errors: { ...get().errors, incomes: errorMessage },
      });
      throw error;
    }
  },
  
  // Load expenses
  loadExpenses: async (startDate?: Date, endDate?: Date, force = false) => {
    const state = get();
    const lastFetched = state.lastFetched.expenses;
    const now = Date.now();
    
    if (!force && lastFetched && (now - lastFetched) < CACHE_DURATION && state.expenses.length > 0) {
      return;
    }
    
    set(state => ({ loading: { ...state.loading, expenses: true }, errors: { ...state.errors, expenses: null } }));
    
    try {
      const data = await budgetService.getExpenses(startDate, endDate);
      set({
        expenses: data,
        loading: { ...get().loading, expenses: false },
        errors: { ...get().errors, expenses: null },
        lastFetched: { ...get().lastFetched, expenses: now },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load expenses';
      set({
        loading: { ...get().loading, expenses: false },
        errors: { ...get().errors, expenses: errorMessage },
      });
      throw error;
    }
  },
  
  // Load debts
  loadDebts: async (force = false) => {
    const state = get();
    const lastFetched = state.lastFetched.debts;
    const now = Date.now();
    
    if (!force && lastFetched && (now - lastFetched) < CACHE_DURATION && state.debts.length > 0) {
      return;
    }
    
    set(state => ({ loading: { ...state.loading, debts: true }, errors: { ...state.errors, debts: null } }));
    
    try {
      const data = await budgetService.getDebts();
      set({
        debts: data,
        loading: { ...get().loading, debts: false },
        errors: { ...get().errors, debts: null },
        lastFetched: { ...get().lastFetched, debts: now },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load debts';
      set({
        loading: { ...get().loading, debts: false },
        errors: { ...get().errors, debts: errorMessage },
      });
      throw error;
    }
  },
  
  // Load savings goals
  loadSavingsGoals: async (force = false) => {
    const state = get();
    const lastFetched = state.lastFetched.savingsGoals;
    const now = Date.now();
    
    if (!force && lastFetched && (now - lastFetched) < CACHE_DURATION && state.savingsGoals.length > 0) {
      return;
    }
    
    set(state => ({ loading: { ...state.loading, savingsGoals: true }, errors: { ...state.errors, savingsGoals: null } }));
    
    try {
      const data = await budgetService.getSavingsGoals();
      set({
        savingsGoals: data,
        loading: { ...get().loading, savingsGoals: false },
        errors: { ...get().errors, savingsGoals: null },
        lastFetched: { ...get().lastFetched, savingsGoals: now },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load savings goals';
      set({
        loading: { ...get().loading, savingsGoals: false },
        errors: { ...get().errors, savingsGoals: errorMessage },
      });
      throw error;
    }
  },
  
  // Load categories
  loadCategories: async (force = false) => {
    const state = get();
    const lastFetched = state.lastFetched.categories;
    const now = Date.now();
    
    if (!force && lastFetched && (now - lastFetched) < CACHE_DURATION && state.categories.length > 0) {
      return;
    }
    
    set(state => ({ loading: { ...state.loading, categories: true }, errors: { ...state.errors, categories: null } }));
    
    try {
      const data = await budgetService.getCategories();
      set({
        categories: data,
        loading: { ...get().loading, categories: false },
        errors: { ...get().errors, categories: null },
        lastFetched: { ...get().lastFetched, categories: now },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load categories';
      set({
        loading: { ...get().loading, categories: false },
        errors: { ...get().errors, categories: errorMessage },
      });
      throw error;
    }
  },
  
  // Income CRUD
  addIncome: async (income) => {
    await budgetService.addIncome(income);
    // Try to refresh, but don't fail if refresh fails
    try {
      await get().loadIncomes(undefined, undefined, true); // Force refresh
    } catch (refreshError) {
      console.warn('Failed to refresh incomes after add, but add succeeded:', refreshError);
    }
  },
  
  updateIncome: async (id, updates) => {
    await budgetService.updateIncome(id, updates);
    // Update local state optimistically
    const currentIncomes = get().incomes;
    const updatedIncomes = currentIncomes.map(income => 
      income.id === id ? { ...income, ...updates, date: updates.date || income.date } : income
    );
    set({ incomes: updatedIncomes });
    
    // Try to refresh in background, but don't fail if refresh fails
    try {
      await get().loadIncomes(undefined, undefined, true); // Force refresh to get latest from server
    } catch (refreshError) {
      console.warn('Failed to refresh incomes after update, but update succeeded:', refreshError);
    }
  },
  
  deleteIncome: async (id) => {
    await budgetService.deleteIncome(id);
    set({ incomes: get().incomes.filter(i => i.id !== id) });
  },
  
  // Expense CRUD
  addExpense: async (expense) => {
    await budgetService.addExpense(expense);
    // Try to refresh, but don't fail if refresh fails
    try {
      await get().loadExpenses(undefined, undefined, true); // Force refresh
    } catch (refreshError) {
      console.warn('Failed to refresh expenses after add, but add succeeded:', refreshError);
    }
  },
  
  updateExpense: async (id, updates) => {
    await budgetService.updateExpense(id, updates);
    // Update local state optimistically
    const currentExpenses = get().expenses;
    const updatedExpenses = currentExpenses.map(expense => 
      expense.id === id ? { ...expense, ...updates, date: updates.date || expense.date } : expense
    );
    set({ expenses: updatedExpenses });
    
    // Try to refresh in background, but don't fail if refresh fails
    try {
      await get().loadExpenses(undefined, undefined, true); // Force refresh to get latest from server
    } catch (refreshError) {
      console.warn('Failed to refresh expenses after update, but update succeeded:', refreshError);
    }
  },
  
  deleteExpense: async (id) => {
    await budgetService.deleteExpense(id);
    set({ expenses: get().expenses.filter(e => e.id !== id) });
  },
  
  // Debt CRUD
  addDebt: async (debt) => {
    await budgetService.addDebt(debt);
    // Try to refresh, but don't fail if refresh fails
    try {
      await get().loadDebts(true); // Force refresh
    } catch (refreshError) {
      console.warn('Failed to refresh debts after add, but add succeeded:', refreshError);
    }
  },
  
  updateDebt: async (id, updates) => {
    await budgetService.updateDebt(id, updates);
    // Update local state optimistically
    const currentDebts = get().debts;
    const updatedDebts = currentDebts.map(debt => 
      debt.id === id ? { ...debt, ...updates } : debt
    );
    set({ debts: updatedDebts });
    
    // Try to refresh in background, but don't fail if refresh fails
    try {
      await get().loadDebts(true); // Force refresh to get latest from server
    } catch (refreshError) {
      console.warn('Failed to refresh debts after update, but update succeeded:', refreshError);
    }
  },
  
  deleteDebt: async (id) => {
    await budgetService.deleteDebt(id);
    set({ debts: get().debts.filter(d => d.id !== id) });
  },
  
  // Savings Goal CRUD
  addSavingsGoal: async (goal) => {
    await budgetService.addSavingsGoal(goal);
    // Try to refresh, but don't fail if refresh fails
    try {
      await get().loadSavingsGoals(true); // Force refresh
    } catch (refreshError) {
      console.warn('Failed to refresh savings goals after add, but add succeeded:', refreshError);
    }
  },
  
  updateSavingsGoal: async (id, updates) => {
    await budgetService.updateSavingsGoal(id, updates);
    // Update local state optimistically
    const currentGoals = get().savingsGoals;
    const updatedGoals = currentGoals.map(goal => 
      goal.id === id ? { ...goal, ...updates } : goal
    );
    set({ savingsGoals: updatedGoals });
    
    // Try to refresh in background, but don't fail if refresh fails
    try {
      await get().loadSavingsGoals(true); // Force refresh to get latest from server
    } catch (refreshError) {
      console.warn('Failed to refresh savings goals after update, but update succeeded:', refreshError);
    }
  },
  
  deleteSavingsGoal: async (id) => {
    await budgetService.deleteSavingsGoal(id);
    set({ savingsGoals: get().savingsGoals.filter(g => g.id !== id) });
  },
  
  // Category CRUD
  addCategory: async (category) => {
    await budgetService.addCategory(category);
    await get().loadCategories(true); // Force refresh
  },
  
  // Reset store
  reset: () => {
    set({
      incomes: [],
      expenses: [],
      debts: [],
      savingsGoals: [],
      categories: [],
      loading: {
        incomes: false,
        expenses: false,
        debts: false,
        savingsGoals: false,
        categories: false,
      },
      errors: {
        incomes: null,
        expenses: null,
        debts: null,
        savingsGoals: null,
        categories: null,
      },
      lastFetched: {
        incomes: null,
        expenses: null,
        debts: null,
        savingsGoals: null,
        categories: null,
      },
    });
  },
}));
