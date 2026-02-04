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
import { getCurrentUser } from './authService';

// Income
export const addIncome = async (income: Omit<Income, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  const user = getCurrentUser();
  if (!user) {
    throw new Error('User must be authenticated to add income');
  }

  const now = new Date();
  const incomeData: any = {
    userId: user.id,
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
  const user = getCurrentUser();
  if (!user) {
    throw new Error('User must be authenticated to get incomes');
  }

  let q = query(
    collection(db, 'incomes'),
    where('userId', '==', user.id),
    orderBy('date', 'desc')
  );
  
  if (startDate && endDate) {
    q = query(
      collection(db, 'incomes'),
      where('userId', '==', user.id),
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
  const user = getCurrentUser();
  if (!user) {
    throw new Error('User must be authenticated to update income');
  }

  // Verify the income belongs to the user
  const incomeRef = doc(db, 'incomes', id);
  const incomeSnap = await getDocs(query(collection(db, 'incomes'), where('userId', '==', user.id)));
  const incomeDoc = incomeSnap.docs.find(d => d.id === id);
  if (!incomeDoc) {
    throw new Error('Income not found or access denied');
  }

  const updateData: any = {
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
  const user = getCurrentUser();
  if (!user) {
    throw new Error('User must be authenticated to delete income');
  }

  // Verify the income belongs to the user
  const incomeSnap = await getDocs(query(collection(db, 'incomes'), where('userId', '==', user.id)));
  const incomeDoc = incomeSnap.docs.find(d => d.id === id);
  if (!incomeDoc) {
    throw new Error('Income not found or access denied');
  }

  await deleteDoc(doc(db, 'incomes', id));
};

// Expenses
export const addExpense = async (expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  const user = getCurrentUser();
  if (!user) {
    throw new Error('User must be authenticated to add expense');
  }

  const now = new Date();
  const expenseData: any = {
    userId: user.id,
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
  const user = getCurrentUser();
  if (!user) {
    throw new Error('User must be authenticated to get expenses');
  }

  let q = query(
    collection(db, 'expenses'),
    where('userId', '==', user.id),
    orderBy('date', 'desc')
  );
  
  if (startDate && endDate) {
    q = query(
      collection(db, 'expenses'),
      where('userId', '==', user.id),
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
  if (updates.notes !== undefined && updates.notes !== '') updateData.notes = updates.notes;
  
  await updateDoc(expenseRef, updateData);
};

export const deleteExpense = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, 'expenses', id));
};

// Categories (user-specific)
export const getCategories = async (): Promise<ExpenseCategory[]> => {
  const user = getCurrentUser();
  if (!user) {
    throw new Error('User must be authenticated to get categories');
  }

  const snapshot = await getDocs(
    query(collection(db, 'categories'), where('userId', '==', user.id))
  );
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as ExpenseCategory[];
};

export const addCategory = async (category: Omit<ExpenseCategory, 'id'>): Promise<string> => {
  const user = getCurrentUser();
  if (!user) {
    throw new Error('User must be authenticated to add category');
  }

  const categoryData = {
    ...category,
    userId: user.id,
  };
  const docRef = await addDoc(collection(db, 'categories'), categoryData);
  return docRef.id;
};

// Debts
export const addDebt = async (debt: Omit<Debt, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  const user = getCurrentUser();
  if (!user) {
    throw new Error('User must be authenticated to add debt');
  }

  const now = new Date();
  const debtData: any = {
    userId: user.id,
    type: debt.type,
    creditor: debt.creditor,
    totalAmount: debt.totalAmount,
    remainingAmount: debt.remainingAmount,
    minimumPayment: debt.minimumPayment,
    dueDate: debt.dueDate,
    createdAt: Timestamp.fromDate(now),
    updatedAt: Timestamp.fromDate(now),
  };
  
  if (debt.interestRate !== undefined) {
    debtData.interestRate = debt.interestRate;
  }
  if (debt.downPayment !== undefined) {
    debtData.downPayment = debt.downPayment;
  }
  if (debt.isPaid !== undefined) {
    debtData.isPaid = debt.isPaid;
  }
  if (debt.totalAmountDue !== undefined) {
    debtData.totalAmountDue = debt.totalAmountDue;
  }
  if (debt.notes !== undefined && debt.notes !== '') {
    debtData.notes = debt.notes;
  }
  
  const docRef = await addDoc(collection(db, 'debts'), debtData);
  return docRef.id;
};

export const getDebts = async (): Promise<Debt[]> => {
  const user = getCurrentUser();
  if (!user) {
    throw new Error('User must be authenticated to get debts');
  }

  const snapshot = await getDocs(
    query(
      collection(db, 'debts'),
      where('userId', '==', user.id),
      orderBy('createdAt', 'desc')
    )
  );
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt.toDate(),
    updatedAt: doc.data().updatedAt.toDate(),
  })) as Debt[];
};

export const updateDebt = async (id: string, updates: Partial<Debt>): Promise<void> => {
  const user = getCurrentUser();
  if (!user) {
    throw new Error('User must be authenticated to update debt');
  }

  // Verify the debt belongs to the user
  const debtSnap = await getDocs(query(collection(db, 'debts'), where('userId', '==', user.id)));
  const debtDoc = debtSnap.docs.find(d => d.id === id);
  if (!debtDoc) {
    throw new Error('Debt not found or access denied');
  }

  const debtRef = doc(db, 'debts', id);
  const updateData: any = {
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
  
  await updateDoc(debtRef, updateData);
};

export const deleteDebt = async (id: string): Promise<void> => {
  const user = getCurrentUser();
  if (!user) {
    throw new Error('User must be authenticated to delete debt');
  }

  // Verify the debt belongs to the user
  const debtSnap = await getDocs(query(collection(db, 'debts'), where('userId', '==', user.id)));
  const debtDoc = debtSnap.docs.find(d => d.id === id);
  if (!debtDoc) {
    throw new Error('Debt not found or access denied');
  }

  await deleteDoc(doc(db, 'debts', id));
};

// Savings Goals
export const addSavingsGoal = async (goal: Omit<SavingsGoal, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  const user = getCurrentUser();
  if (!user) {
    throw new Error('User must be authenticated to add savings goal');
  }

  const now = new Date();
  const goalData: any = {
    userId: user.id,
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
  const user = getCurrentUser();
  if (!user) {
    throw new Error('User must be authenticated to get savings goals');
  }

  const snapshot = await getDocs(
    query(
      collection(db, 'savingsGoals'),
      where('userId', '==', user.id),
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
};

export const updateSavingsGoal = async (id: string, updates: Partial<SavingsGoal>): Promise<void> => {
  const user = getCurrentUser();
  if (!user) {
    throw new Error('User must be authenticated to update savings goal');
  }

  // Verify the goal belongs to the user
  const goalSnap = await getDocs(query(collection(db, 'savingsGoals'), where('userId', '==', user.id)));
  const goalDoc = goalSnap.docs.find(d => d.id === id);
  if (!goalDoc) {
    throw new Error('Savings goal not found or access denied');
  }

  const goalRef = doc(db, 'savingsGoals', id);
  const updateData: any = {
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
  const user = getCurrentUser();
  if (!user) {
    throw new Error('User must be authenticated to delete savings goal');
  }

  // Verify the goal belongs to the user
  const goalSnap = await getDocs(query(collection(db, 'savingsGoals'), where('userId', '==', user.id)));
  const goalDoc = goalSnap.docs.find(d => d.id === id);
  if (!goalDoc) {
    throw new Error('Savings goal not found or access denied');
  }

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
      const principal = input.downPayment ? input.amount - input.downPayment : input.amount;
      totalCostOverTime = principal;
      if (input.interestRate) {
        // Simple interest calculation
        const monthlyRate = input.interestRate / 100 / 12;
        totalCostOverTime = principal * (1 + monthlyRate * input.months);
      }
      if (input.downPayment) {
        totalCostOverTime += input.downPayment;
      }
    }
  } else if (input.type === 'subscription') {
    if (input.billingFrequency === 'monthly') {
      monthlyPaymentImpact = input.amount;
      totalCostOverTime = input.amount * 12; // Annual cost
    } else if (input.billingFrequency === 'yearly') {
      monthlyPaymentImpact = input.amount / 12;
      totalCostOverTime = input.amount;
    } else {
      // Default to monthly
      monthlyPaymentImpact = input.amount;
      totalCostOverTime = input.amount * 12;
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
