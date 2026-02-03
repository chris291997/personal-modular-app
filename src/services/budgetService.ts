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
import { db } from '../firebase/config';
import { Income, Expense, Debt, SavingsGoal, ExpenseCategory, ConsultInput, ConsultResult } from '../types';

// Income
export const addIncome = async (income: Omit<Income, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  const now = new Date();
  const docRef = await addDoc(collection(db, 'incomes'), {
    ...income,
    date: Timestamp.fromDate(income.date),
    createdAt: Timestamp.fromDate(now),
    updatedAt: Timestamp.fromDate(now),
  });
  return docRef.id;
};

export const getIncomes = async (startDate?: Date, endDate?: Date): Promise<Income[]> => {
  let q = query(collection(db, 'incomes'), orderBy('date', 'desc'));
  
  if (startDate && endDate) {
    q = query(
      collection(db, 'incomes'),
      where('date', '>=', Timestamp.fromDate(startDate)),
      where('date', '<=', Timestamp.fromDate(endDate)),
      orderBy('date', 'desc')
    );
  }
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    date: doc.data().date.toDate(),
    createdAt: doc.data().createdAt.toDate(),
    updatedAt: doc.data().updatedAt.toDate(),
  })) as Income[];
};

export const updateIncome = async (id: string, updates: Partial<Income>): Promise<void> => {
  const incomeRef = doc(db, 'incomes', id);
  const updateData: any = {
    ...updates,
    updatedAt: Timestamp.fromDate(new Date()),
  };
  
  if (updates.date) {
    updateData.date = Timestamp.fromDate(updates.date);
  }
  
  await updateDoc(incomeRef, updateData);
};

export const deleteIncome = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, 'incomes', id));
};

// Expenses
export const addExpense = async (expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  const now = new Date();
  const docRef = await addDoc(collection(db, 'expenses'), {
    ...expense,
    date: Timestamp.fromDate(expense.date),
    nextDueDate: expense.nextDueDate ? Timestamp.fromDate(expense.nextDueDate) : null,
    createdAt: Timestamp.fromDate(now),
    updatedAt: Timestamp.fromDate(now),
  });
  return docRef.id;
};

export const getExpenses = async (startDate?: Date, endDate?: Date): Promise<Expense[]> => {
  let q = query(collection(db, 'expenses'), orderBy('date', 'desc'));
  
  if (startDate && endDate) {
    q = query(
      collection(db, 'expenses'),
      where('date', '>=', Timestamp.fromDate(startDate)),
      where('date', '<=', Timestamp.fromDate(endDate)),
      orderBy('date', 'desc')
    );
  }
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    date: doc.data().date.toDate(),
    nextDueDate: doc.data().nextDueDate?.toDate(),
    createdAt: doc.data().createdAt.toDate(),
    updatedAt: doc.data().updatedAt.toDate(),
  })) as Expense[];
};

export const updateExpense = async (id: string, updates: Partial<Expense>): Promise<void> => {
  const expenseRef = doc(db, 'expenses', id);
  const updateData: any = {
    ...updates,
    updatedAt: Timestamp.fromDate(new Date()),
  };
  
  if (updates.date) {
    updateData.date = Timestamp.fromDate(updates.date);
  }
  if (updates.nextDueDate) {
    updateData.nextDueDate = Timestamp.fromDate(updates.nextDueDate);
  }
  
  await updateDoc(expenseRef, updateData);
};

export const deleteExpense = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, 'expenses', id));
};

// Categories
export const getCategories = async (): Promise<ExpenseCategory[]> => {
  const snapshot = await getDocs(collection(db, 'categories'));
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as ExpenseCategory[];
};

export const addCategory = async (category: Omit<ExpenseCategory, 'id'>): Promise<string> => {
  const docRef = await addDoc(collection(db, 'categories'), category);
  return docRef.id;
};

// Debts
export const addDebt = async (debt: Omit<Debt, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  const now = new Date();
  const docRef = await addDoc(collection(db, 'debts'), {
    ...debt,
    createdAt: Timestamp.fromDate(now),
    updatedAt: Timestamp.fromDate(now),
  });
  return docRef.id;
};

export const getDebts = async (): Promise<Debt[]> => {
  const snapshot = await getDocs(query(collection(db, 'debts'), orderBy('createdAt', 'desc')));
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt.toDate(),
    updatedAt: doc.data().updatedAt.toDate(),
  })) as Debt[];
};

export const updateDebt = async (id: string, updates: Partial<Debt>): Promise<void> => {
  const debtRef = doc(db, 'debts', id);
  await updateDoc(debtRef, {
    ...updates,
    updatedAt: Timestamp.fromDate(new Date()),
  });
};

export const deleteDebt = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, 'debts', id));
};

// Savings Goals
export const addSavingsGoal = async (goal: Omit<SavingsGoal, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  const now = new Date();
  const docRef = await addDoc(collection(db, 'savingsGoals'), {
    ...goal,
    targetDate: goal.targetDate ? Timestamp.fromDate(goal.targetDate) : null,
    createdAt: Timestamp.fromDate(now),
    updatedAt: Timestamp.fromDate(now),
  });
  return docRef.id;
};

export const getSavingsGoals = async (): Promise<SavingsGoal[]> => {
  const snapshot = await getDocs(query(collection(db, 'savingsGoals'), orderBy('createdAt', 'desc')));
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    targetDate: doc.data().targetDate?.toDate(),
    createdAt: doc.data().createdAt.toDate(),
    updatedAt: doc.data().updatedAt.toDate(),
  })) as SavingsGoal[];
};

export const updateSavingsGoal = async (id: string, updates: Partial<SavingsGoal>): Promise<void> => {
  const goalRef = doc(db, 'savingsGoals', id);
  const updateData: any = {
    ...updates,
    updatedAt: Timestamp.fromDate(new Date()),
  };
  
  if (updates.targetDate) {
    updateData.targetDate = Timestamp.fromDate(updates.targetDate);
  }
  
  await updateDoc(goalRef, updateData);
};

export const deleteSavingsGoal = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, 'savingsGoals', id));
};

// Consult Feature
export const calculateConsult = async (input: ConsultInput): Promise<ConsultResult> => {
  // Get current financial state
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  
  const [incomes, expenses, debts] = await Promise.all([
    getIncomes(startOfMonth, endOfMonth),
    getExpenses(startOfMonth, endOfMonth),
    getDebts(),
  ]);
  
  // Calculate monthly income
  const monthlyIncome = incomes.reduce((sum, income) => {
    const multiplier = getFrequencyMultiplier(income.frequency);
    return sum + (income.amount * multiplier);
  }, 0);
  
  // Calculate monthly expenses
  const monthlyExpenses = expenses.reduce((sum, expense) => {
    if (expense.isRecurring) {
      const multiplier = expense.recurringFrequency ? getFrequencyMultiplier(expense.recurringFrequency) : 1;
      return sum + (expense.amount * multiplier);
    }
    return sum;
  }, 0);
  
  // Calculate monthly debt payments
  const monthlyDebtPayments = debts.reduce((sum, debt) => sum + debt.minimumPayment, 0);
  
  const currentAvailableBudget = monthlyIncome - monthlyExpenses - monthlyDebtPayments;
  
  // Calculate impact of new input
  let monthlyPaymentImpact = 0;
  let totalCostOverTime = 0;
  const warnings: string[] = [];
  
  if (input.type === 'expense') {
    if (input.isRecurring && input.recurringFrequency) {
      const multiplier = getFrequencyMultiplier(input.recurringFrequency);
      monthlyPaymentImpact = input.amount * multiplier;
    } else {
      monthlyPaymentImpact = input.amount;
    }
    totalCostOverTime = monthlyPaymentImpact;
  } else if (input.type === 'debt') {
    if (input.minimumPayment) {
      monthlyPaymentImpact = input.minimumPayment;
    }
    if (input.amount && input.months) {
      totalCostOverTime = input.amount;
      if (input.interestRate) {
        // Simple interest calculation
        const monthlyRate = input.interestRate / 100 / 12;
        totalCostOverTime = input.amount * (1 + monthlyRate * input.months);
      }
    }
  }
  
  const effectOnAvailableBudget = currentAvailableBudget - monthlyPaymentImpact;
  const canAfford = effectOnAvailableBudget >= 0;
  
  if (!canAfford) {
    warnings.push('This will exceed your available budget');
  }
  
  if (monthlyPaymentImpact > monthlyIncome * 0.3) {
    warnings.push('This payment represents more than 30% of your monthly income');
  }
  
  if (input.type === 'debt' && input.interestRate && input.interestRate > 20) {
    warnings.push('High interest rate detected. Consider alternatives if possible.');
  }
  
  return {
    monthlyPaymentImpact,
    totalCostOverTime,
    effectOnAvailableBudget,
    warnings,
    canAfford,
  };
};

const getFrequencyMultiplier = (frequency: string): number => {
  switch (frequency) {
    case 'daily':
      return 30;
    case 'weekly':
      return 4.33;
    case 'biweekly':
      return 2.17;
    case 'monthly':
      return 1;
    case 'yearly':
      return 1 / 12;
    default:
      return 1;
  }
};
