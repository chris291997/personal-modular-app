import { Income, Expense, Debt } from '../types';
import { startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import {
  getDebtAmountPerCutoff,
  getCutoffForDay,
  getCutoffKey,
  type CutoffId,
} from './debtCutoff';

export function getFrequencyMultiplier(frequency: string): number {
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
    case 'one_time':
      return 0; // Handled separately
    default:
      return 1;
  }
}

/**
 * Monthly income: sum of (amount × frequency multiplier) for recurring incomes;
 * one_time income only counts in the month of its date.
 */
export function calculateMonthlyIncome(
  incomes: Income[],
  referenceMonth = new Date()
): number {
  const start = startOfMonth(referenceMonth);
  const end = endOfMonth(referenceMonth);

  return incomes.reduce((sum, income) => {
    if (income.frequency === 'one_time') {
      return isWithinInterval(income.date, { start, end }) ? sum + income.amount : sum;
    }
    const multiplier = getFrequencyMultiplier(income.frequency);
    return sum + income.amount * multiplier;
  }, 0);
}

/**
 * On-hand / Balance = income - expenses (before paying debts).
 * What you have available before debt payments.
 */
export function calculateOnHandBalance(
  incomes: Income[],
  expenses: Expense[],
  referenceMonth = new Date()
): number {
  return (
    calculateMonthlyIncome(incomes, referenceMonth) -
    calculateMonthlyExpenses(expenses, referenceMonth)
  );
}

/**
 * Monthly expenses: recurring = amount × freq multiplier; one-time = amount only if date in current month.
 * Recurring expenses (subscriptions, etc.) contribute every month regardless of when they were added.
 */
export function calculateMonthlyExpenses(
  expenses: Expense[],
  referenceMonth = new Date()
): number {
  const start = startOfMonth(referenceMonth);
  const end = endOfMonth(referenceMonth);

  return expenses.reduce((sum, expense) => {
    if (expense.isRecurring && expense.recurringFrequency) {
      const multiplier = getFrequencyMultiplier(expense.recurringFrequency);
      return sum + expense.amount * multiplier;
    }
    // One-time: only count if within current month
    if (isWithinInterval(expense.date, { start, end })) {
      return sum + expense.amount;
    }
    return sum;
  }, 0);
}

/**
 * Total monthly debt payments (minimum payments across active debts only).
 * Excludes fully paid debts (remainingAmount <= 0).
 */
export function calculateMonthlyDebtPayments(debts: Debt[]): number {
  return debts
    .filter(d => (d.remainingAmount ?? 0) > 0)
    .reduce((sum, debt) => sum + debt.minimumPayment, 0);
}

/**
 * Debt payments due for the current cutoff (1-15 or 16-30).
 * Excludes cutoffs already paid this month (paidCutoffKeys).
 */
export function calculateCurrentCutoffDebtPayments(debts: Debt[]): number {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const day = now.getDate();
  const cutoff: CutoffId = day <= 15 ? '1' : '2';
  const key = getCutoffKey(year, month, cutoff);

  return debts
    .filter(d => (d.remainingAmount ?? 0) > 0)
    .filter(d => !(d.paidCutoffKeys ?? []).includes(key))
    .reduce((sum, debt) => {
      const amts = getDebtAmountPerCutoff(debt);
      return sum + (amts[cutoff] ?? 0);
    }, 0);
}

/**
 * Available budget = balance - current cutoff debt payments (unpaid).
 * Debt payments made are recorded as expenses (reduces balance).
 */
export function calculateAvailableBudget(
  incomes: Income[],
  expenses: Expense[],
  debts: Debt[],
  referenceMonth = new Date()
): number {
  const income = calculateMonthlyIncome(incomes, referenceMonth);
  const expenseTotal = calculateMonthlyExpenses(expenses, referenceMonth);
  const balance = income - expenseTotal;
  const currentCutoffDue = calculateCurrentCutoffDebtPayments(debts);
  return balance - currentCutoffDue;
}
