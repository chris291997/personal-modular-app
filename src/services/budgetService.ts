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
import { Income, Expense, Debt, SavingsGoal, ExpenseCategory, ConsultInput, ConsultResult } from '../types';
import {
  calculateMonthlyIncome,
  calculateMonthlyExpenses,
  calculateMonthlyDebtPayments,
  calculateAvailableBudget,
} from '../utils/budgetCalculations';

// Helper function to get current user ID from Firebase Auth
// Note: App.tsx ensures user is authenticated before rendering components
const getCurrentUserId = (): string => {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) {
    throw new Error('User must be authenticated. Please log in.');
  }
  return firebaseUser.uid;
};

// Income
export const addIncome = async (income: Omit<Income, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  const userId = getCurrentUserId();

  const now = new Date();
  const incomeData: Record<string, unknown> = {
    userId: userId,
    amount: income.amount,
    source: income.source,
    frequency: income.frequency,
    date: Timestamp.fromDate(income.date),
    createdAt: Timestamp.fromDate(now),
    updatedAt: Timestamp.fromDate(now),
  };
  
  // Only include notes if it's not undefined
  if (income.notes !== undefined && income.notes !== '') {
    incomeData.notes = income.notes;
  }
  
  const docRef = await addDoc(collection(db, 'incomes'), incomeData);
  return docRef.id;
};

export const getIncomes = async (startDate?: Date, endDate?: Date): Promise<Income[]> => {
  const userId = getCurrentUserId();

  try {
    let q = query(
      collection(db, 'incomes'),
      where('userId', '==', userId),
      orderBy('date', 'desc')
    );
    
    if (startDate && endDate) {
      q = query(
        collection(db, 'incomes'),
        where('userId', '==', userId),
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
  } catch (error: unknown) {
    // If orderBy fails (missing index), try without orderBy
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('index') || errorMessage.includes('indexes')) {
      console.warn('Composite index missing, fetching without orderBy:', errorMessage);
      let q = query(
        collection(db, 'incomes'),
        where('userId', '==', userId)
      );
      
      if (startDate && endDate) {
        q = query(
          collection(db, 'incomes'),
          where('userId', '==', userId),
          where('date', '>=', Timestamp.fromDate(startDate)),
          where('date', '<=', Timestamp.fromDate(endDate))
        );
      }
      
      const snapshot = await getDocs(q);
      const incomes = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date.toDate(),
        createdAt: doc.data().createdAt.toDate(),
        updatedAt: doc.data().updatedAt.toDate(),
      })) as Income[];
      // Sort manually by date
      return incomes.sort((a, b) => b.date.getTime() - a.date.getTime());
    }
    throw error;
  }
};

export const updateIncome = async (id: string, updates: Partial<Income>): Promise<void> => {
  const userId = getCurrentUserId();

  // Verify the income belongs to the user
  const incomeRef = doc(db, 'incomes', id);
  const incomeSnap = await getDocs(query(collection(db, 'incomes'), where('userId', '==', userId)));
  const incomeDoc = incomeSnap.docs.find(d => d.id === id);
  if (!incomeDoc) {
    throw new Error('Income not found or access denied');
  }

  const updateData: Record<string, unknown> = {
    updatedAt: Timestamp.fromDate(new Date()),
  };
  
  // Only include defined fields
  if (updates.amount !== undefined) updateData.amount = updates.amount;
  if (updates.source !== undefined) updateData.source = updates.source;
  if (updates.frequency !== undefined) updateData.frequency = updates.frequency;
  if (updates.date !== undefined) updateData.date = Timestamp.fromDate(updates.date);
  if (updates.notes !== undefined && updates.notes !== '') updateData.notes = updates.notes;
  
  await updateDoc(incomeRef, updateData);
};

export const deleteIncome = async (id: string): Promise<void> => {
  const userId = getCurrentUserId();

  // Verify the income belongs to the user
  const incomeSnap = await getDocs(query(collection(db, 'incomes'), where('userId', '==', userId)));
  const incomeDoc = incomeSnap.docs.find(d => d.id === id);
  if (!incomeDoc) {
    throw new Error('Income not found or access denied');
  }

  await deleteDoc(doc(db, 'incomes', id));
};

// Expenses
export const addExpense = async (expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  const userId = getCurrentUserId();

  const now = new Date();
  const expenseData: Record<string, unknown> = {
    userId: userId,
    amount: expense.amount,
    categoryId: expense.categoryId,
    description: expense.description,
    date: Timestamp.fromDate(expense.date),
    isRecurring: expense.isRecurring,
    createdAt: Timestamp.fromDate(now),
    updatedAt: Timestamp.fromDate(now),
  };
  
  if (expense.recurringFrequency !== undefined) {
    expenseData.recurringFrequency = expense.recurringFrequency;
  }
  if (expense.nextDueDate !== undefined) {
    expenseData.nextDueDate = Timestamp.fromDate(expense.nextDueDate);
  }
  if (expense.notes !== undefined && expense.notes !== '') {
    expenseData.notes = expense.notes;
  }
  
  const docRef = await addDoc(collection(db, 'expenses'), expenseData);
  return docRef.id;
};

export const getExpenses = async (startDate?: Date, endDate?: Date): Promise<Expense[]> => {
  const userId = getCurrentUserId();

  try {
    let q = query(
      collection(db, 'expenses'),
      where('userId', '==', userId),
      orderBy('date', 'desc')
    );
    
    if (startDate && endDate) {
      q = query(
        collection(db, 'expenses'),
        where('userId', '==', userId),
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
  } catch (error: unknown) {
    // If orderBy fails (missing index), try without orderBy
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('index') || errorMessage.includes('indexes')) {
      console.warn('Composite index missing, fetching without orderBy:', errorMessage);
      let q = query(
        collection(db, 'expenses'),
        where('userId', '==', userId)
      );
      
      if (startDate && endDate) {
        q = query(
          collection(db, 'expenses'),
          where('userId', '==', userId),
          where('date', '>=', Timestamp.fromDate(startDate)),
          where('date', '<=', Timestamp.fromDate(endDate))
        );
      }
      
      const snapshot = await getDocs(q);
      const expenses = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date.toDate(),
        nextDueDate: doc.data().nextDueDate?.toDate(),
        createdAt: doc.data().createdAt.toDate(),
        updatedAt: doc.data().updatedAt.toDate(),
      })) as Expense[];
      // Sort manually by date
      return expenses.sort((a, b) => b.date.getTime() - a.date.getTime());
    }
    throw error;
  }
};

export const updateExpense = async (id: string, updates: Partial<Expense>): Promise<void> => {
  const userId = getCurrentUserId();
  
  // Verify the expense belongs to the user
  const expenseSnap = await getDocs(query(collection(db, 'expenses'), where('userId', '==', userId)));
  const expenseDoc = expenseSnap.docs.find(d => d.id === id);
  if (!expenseDoc) {
    throw new Error('Expense not found or access denied');
  }
  
  const expenseRef = doc(db, 'expenses', id);
  const updateData: Record<string, unknown> = {
    updatedAt: Timestamp.fromDate(new Date()),
  };
  
  // Only include defined fields
  if (updates.amount !== undefined) updateData.amount = updates.amount;
  if (updates.categoryId !== undefined) updateData.categoryId = updates.categoryId;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.date !== undefined) updateData.date = Timestamp.fromDate(updates.date);
  if (updates.isRecurring !== undefined) updateData.isRecurring = updates.isRecurring;
  if (updates.recurringFrequency !== undefined) updateData.recurringFrequency = updates.recurringFrequency;
  if (updates.nextDueDate !== undefined) updateData.nextDueDate = Timestamp.fromDate(updates.nextDueDate);
  if (updates.lastPaidMonth !== undefined) updateData.lastPaidMonth = updates.lastPaidMonth;
  if (updates.notes !== undefined && updates.notes !== '') updateData.notes = updates.notes;

  await updateDoc(expenseRef, updateData);
};

export const deleteExpense = async (id: string): Promise<void> => {
  const userId = getCurrentUserId();
  
  // Verify the expense belongs to the user
  const expenseSnap = await getDocs(query(collection(db, 'expenses'), where('userId', '==', userId)));
  const expenseDoc = expenseSnap.docs.find(d => d.id === id);
  if (!expenseDoc) {
    throw new Error('Expense not found or access denied');
  }
  
  await deleteDoc(doc(db, 'expenses', id));
};

// Categories (user-specific)
export const getCategories = async (): Promise<ExpenseCategory[]> => {
  const userId = getCurrentUserId();

  const snapshot = await getDocs(
    query(collection(db, 'categories'), where('userId', '==', userId))
  );
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as ExpenseCategory[];
};

export const addCategory = async (category: Omit<ExpenseCategory, 'id'>): Promise<string> => {
  const userId = getCurrentUserId();

  const categoryData = {
    ...category,
    userId: userId,
  };
  const docRef = await addDoc(collection(db, 'categories'), categoryData);
  return docRef.id;
};

// Debts
export const addDebt = async (debt: Omit<Debt, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  const userId = getCurrentUserId();

  const now = new Date();
  const debtData: Record<string, unknown> = {
    userId: userId,
    type: debt.type,
    creditor: debt.creditor,
    totalAmount: debt.totalAmount,
    remainingAmount: debt.remainingAmount,
    minimumPayment: debt.minimumPayment,
    frequency: debt.frequency ?? 'monthly',
    paidSchedules: debt.paidSchedules ?? 0,
    createdAt: Timestamp.fromDate(now),
    updatedAt: Timestamp.fromDate(now),
  };

  if (debt.dueDate !== undefined) debtData.dueDate = debt.dueDate;
  if (debt.interestRate !== undefined) debtData.interestRate = debt.interestRate;
  if (debt.downPayment !== undefined) debtData.downPayment = debt.downPayment;
  if (debt.isPaid !== undefined) debtData.isPaid = debt.isPaid;
  if (debt.totalAmountDue !== undefined) debtData.totalAmountDue = debt.totalAmountDue;
  if (debt.notes !== undefined && debt.notes !== '') debtData.notes = debt.notes;
  if (debt.totalSchedules !== undefined) debtData.totalSchedules = debt.totalSchedules;
  if (debt.oneTimeDueDate !== undefined) debtData.oneTimeDueDate = debt.oneTimeDueDate;
  if (debt.secondDueDate !== undefined) debtData.secondDueDate = debt.secondDueDate;

  const docRef = await addDoc(collection(db, 'debts'), debtData);
  return docRef.id;
};

export const getDebts = async (): Promise<Debt[]> => {
  const userId = getCurrentUserId();

  try {
    const snapshot = await getDocs(
      query(
        collection(db, 'debts'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      )
    );
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt.toDate(),
      updatedAt: doc.data().updatedAt.toDate(),
    })) as Debt[];
  } catch (error: unknown) {
    // If orderBy fails (missing index), try without orderBy
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('index') || errorMessage.includes('indexes')) {
      console.warn('Composite index missing, fetching without orderBy:', errorMessage);
      const snapshot = await getDocs(
        query(
          collection(db, 'debts'),
          where('userId', '==', userId)
        )
      );
      const debts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate(),
        updatedAt: doc.data().updatedAt.toDate(),
      })) as Debt[];
      // Sort manually by createdAt
      return debts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }
    throw error;
  }
};

export const updateDebt = async (id: string, updates: Partial<Debt>): Promise<void> => {
  const userId = getCurrentUserId();

  // Verify the debt belongs to the user
  const debtSnap = await getDocs(query(collection(db, 'debts'), where('userId', '==', userId)));
  const debtDoc = debtSnap.docs.find(d => d.id === id);
  if (!debtDoc) {
    throw new Error('Debt not found or access denied');
  }

  const debtRef = doc(db, 'debts', id);
  const updateData: Record<string, unknown> = {
    updatedAt: Timestamp.fromDate(new Date()),
  };
  
  // Only include defined fields
  if (updates.type !== undefined) updateData.type = updates.type;
  if (updates.creditor !== undefined) updateData.creditor = updates.creditor;
  if (updates.totalAmount !== undefined) updateData.totalAmount = updates.totalAmount;
  if (updates.remainingAmount !== undefined) updateData.remainingAmount = updates.remainingAmount;
  if (updates.minimumPayment !== undefined) updateData.minimumPayment = updates.minimumPayment;
  if (updates.dueDate !== undefined) updateData.dueDate = updates.dueDate;
  if (updates.interestRate !== undefined) updateData.interestRate = updates.interestRate;
  if (updates.downPayment !== undefined) updateData.downPayment = updates.downPayment;
  if (updates.isPaid !== undefined) updateData.isPaid = updates.isPaid;
  if (updates.totalAmountDue !== undefined) updateData.totalAmountDue = updates.totalAmountDue;
  if (updates.notes !== undefined && updates.notes !== '') updateData.notes = updates.notes;
  if (updates.frequency !== undefined) updateData.frequency = updates.frequency;
  if (updates.totalSchedules !== undefined) updateData.totalSchedules = updates.totalSchedules;
  if (updates.paidSchedules !== undefined) updateData.paidSchedules = updates.paidSchedules;
  if (updates.oneTimeDueDate !== undefined) updateData.oneTimeDueDate = updates.oneTimeDueDate;
  if (updates.secondDueDate !== undefined) updateData.secondDueDate = updates.secondDueDate;
  if (updates.paidCutoffKeys !== undefined) updateData.paidCutoffKeys = updates.paidCutoffKeys;

  await updateDoc(debtRef, updateData);
};

export const deleteDebt = async (id: string): Promise<void> => {
  const userId = getCurrentUserId();

  // Verify the debt belongs to the user
  const debtSnap = await getDocs(query(collection(db, 'debts'), where('userId', '==', userId)));
  const debtDoc = debtSnap.docs.find(d => d.id === id);
  if (!debtDoc) {
    throw new Error('Debt not found or access denied');
  }

  await deleteDoc(doc(db, 'debts', id));
};

// Savings Goals
export const addSavingsGoal = async (goal: Omit<SavingsGoal, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  const userId = getCurrentUserId();

  const now = new Date();
  const goalData: Record<string, unknown> = {
    userId: userId,
    name: goal.name,
    targetAmount: goal.targetAmount,
    currentAmount: goal.currentAmount,
    createdAt: Timestamp.fromDate(now),
    updatedAt: Timestamp.fromDate(now),
  };
  
  if (goal.targetDate !== undefined) {
    goalData.targetDate = goal.targetDate ? Timestamp.fromDate(goal.targetDate) : null;
  }
  if (goal.notes !== undefined && goal.notes !== '') {
    goalData.notes = goal.notes;
  }
  
  const docRef = await addDoc(collection(db, 'savingsGoals'), goalData);
  return docRef.id;
};

export const getSavingsGoals = async (): Promise<SavingsGoal[]> => {
  const userId = getCurrentUserId();

  try {
    const snapshot = await getDocs(
      query(
        collection(db, 'savingsGoals'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      )
    );
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      targetDate: doc.data().targetDate?.toDate(),
      createdAt: doc.data().createdAt.toDate(),
      updatedAt: doc.data().updatedAt.toDate(),
    })) as SavingsGoal[];
  } catch (error: unknown) {
    // If orderBy fails (missing index), try without orderBy
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('index') || errorMessage.includes('indexes')) {
      console.warn('Composite index missing, fetching without orderBy:', errorMessage);
      const snapshot = await getDocs(
        query(
          collection(db, 'savingsGoals'),
          where('userId', '==', userId)
        )
      );
      const goals = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        targetDate: doc.data().targetDate?.toDate(),
        createdAt: doc.data().createdAt.toDate(),
        updatedAt: doc.data().updatedAt.toDate(),
      })) as SavingsGoal[];
      // Sort manually by createdAt
      return goals.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }
    throw error;
  }
};

export const updateSavingsGoal = async (id: string, updates: Partial<SavingsGoal>): Promise<void> => {
  const userId = getCurrentUserId();

  // Verify the goal belongs to the user
  const goalSnap = await getDocs(query(collection(db, 'savingsGoals'), where('userId', '==', userId)));
  const goalDoc = goalSnap.docs.find(d => d.id === id);
  if (!goalDoc) {
    throw new Error('Savings goal not found or access denied');
  }

  const goalRef = doc(db, 'savingsGoals', id);
  const updateData: Record<string, unknown> = {
    updatedAt: Timestamp.fromDate(new Date()),
  };
  
  // Only include defined fields
  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.targetAmount !== undefined) updateData.targetAmount = updates.targetAmount;
  if (updates.currentAmount !== undefined) updateData.currentAmount = updates.currentAmount;
  if (updates.targetDate !== undefined) {
    updateData.targetDate = updates.targetDate ? Timestamp.fromDate(updates.targetDate) : null;
  }
  if (updates.notes !== undefined && updates.notes !== '') updateData.notes = updates.notes;
  
  await updateDoc(goalRef, updateData);
};

export const deleteSavingsGoal = async (id: string): Promise<void> => {
  const userId = getCurrentUserId();

  // Verify the goal belongs to the user
  const goalSnap = await getDocs(query(collection(db, 'savingsGoals'), where('userId', '==', userId)));
  const goalDoc = goalSnap.docs.find(d => d.id === id);
  if (!goalDoc) {
    throw new Error('Savings goal not found or access denied');
  }

  await deleteDoc(doc(db, 'savingsGoals', id));
};

// Consult Feature
export const calculateConsult = async (input: ConsultInput): Promise<ConsultResult> => {
  // Fetch ALL incomes/expenses (no date filter) so recurring items are included in monthly calc
  const [incomes, expenses, debts, savingsGoals] = await Promise.all([
    getIncomes(undefined, undefined),
    getExpenses(undefined, undefined),
    getDebts(),
    getSavingsGoals(),
  ]);

  const monthlyIncome = calculateMonthlyIncome(incomes);
  const monthlyExpenses = calculateMonthlyExpenses(expenses);
  const monthlyDebtPayments = calculateMonthlyDebtPayments(debts);
  const currentAvailableBudget = calculateAvailableBudget(incomes, expenses, debts, new Date(), savingsGoals);

  // Calculate impact of new input
  let monthlyPaymentImpact = 0;
  let totalCostOverTime = 0;
  const warnings: string[] = [];

  const amount = (input.amount != null && !isNaN(input.amount)) ? input.amount : 0;
  const months = (input.months != null && !isNaN(input.months)) ? input.months : 0;

  if (input.type === 'expense') {
    if (input.isRecurring && input.recurringFrequency) {
      const multiplier = getFrequencyMultiplier(input.recurringFrequency);
      monthlyPaymentImpact = amount * multiplier;
    } else {
      monthlyPaymentImpact = amount;
    }
    totalCostOverTime = monthlyPaymentImpact;
  } else if (input.type === 'debt') {
    if (input.minimumPayment != null && input.minimumPayment > 0) {
      monthlyPaymentImpact = input.minimumPayment;
    } else if (amount > 0 && months > 0) {
      monthlyPaymentImpact = amount / months;
    }
    if (amount > 0 && months > 0) {
      const principal = input.downPayment ? amount - input.downPayment : amount;
      totalCostOverTime = principal;
      if (input.interestRate && input.interestRate > 0) {
        const monthlyRate = input.interestRate / 100 / 12;
        totalCostOverTime = principal * (1 + monthlyRate * months);
      }
      if (input.downPayment) {
        totalCostOverTime += input.downPayment;
      }
    } else if (amount > 0) {
      totalCostOverTime = amount;
    }
  } else if (input.type === 'subscription') {
    if (input.billingFrequency === 'monthly') {
      monthlyPaymentImpact = amount;
      totalCostOverTime = amount * 12;
    } else if (input.billingFrequency === 'yearly') {
      monthlyPaymentImpact = amount / 12;
      totalCostOverTime = amount;
    } else {
      monthlyPaymentImpact = amount;
      totalCostOverTime = amount * 12;
    }
  }

  const effectOnAvailableBudget = currentAvailableBudget - monthlyPaymentImpact;
  const canAfford = effectOnAvailableBudget >= 0;

  if (!canAfford) {
    warnings.push('This will exceed your available budget');
  }

  if (monthlyIncome > 0 && monthlyPaymentImpact > monthlyIncome * 0.3) {
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
    case 'one_time':
      return 1; // Counts when in date range
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
