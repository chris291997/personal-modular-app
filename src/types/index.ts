// Common types
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

// Budget Module Types
export interface Income extends BaseEntity {
  amount: number;
  source: string;
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly';
  date: Date;
  notes?: string;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  isCustom: boolean;
  color?: string;
  icon?: string;
}

export interface Expense extends BaseEntity {
  amount: number;
  categoryId: string;
  description: string;
  date: Date;
  isRecurring: boolean;
  recurringFrequency?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  nextDueDate?: Date;
  notes?: string;
}

export interface Debt extends BaseEntity {
  type: 'credit_card' | 'loan' | 'other';
  creditor: string;
  totalAmount: number;
  remainingAmount: number;
  minimumPayment: number;
  interestRate?: number;
  dueDate: number; // Day of month (1-31)
  notes?: string;
}

export interface SavingsGoal extends BaseEntity {
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: Date;
  notes?: string;
}

export interface ConsultInput {
  type: 'expense' | 'debt';
  amount: number;
  // For expenses
  isRecurring?: boolean;
  recurringFrequency?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  // For debts
  minimumPayment?: number;
  months?: number;
  interestRate?: number;
}

export interface ConsultResult {
  monthlyPaymentImpact: number;
  totalCostOverTime: number;
  effectOnAvailableBudget: number;
  warnings: string[];
  canAfford: boolean;
}

// Task Module Types
export interface JiraTicket {
  id: string;
  key: string;
  title: string;
  status: string;
  url: string;
  assignee?: string;
  created: Date;
  updated: Date;
}

export interface TaskFilter {
  startDate: Date;
  endDate: Date;
  includeMentions: boolean;
  includeAssigned: boolean;
  includeComments: boolean;
}

// Module System
export interface Module {
  id: string;
  name: string;
  icon: string;
  path: string;
  component: React.ComponentType;
  enabled: boolean;
}
