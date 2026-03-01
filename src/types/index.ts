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
  downPayment?: number;
  isPaid?: boolean;
  totalAmountDue?: number; // Total amount due including interest
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
  type: 'expense' | 'debt' | 'subscription';
  amount: number;
  // For expenses
  isRecurring?: boolean;
  recurringFrequency?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  // For debts
  minimumPayment?: number;
  months?: number;
  interestRate?: number;
  downPayment?: number;
  // For subscriptions
  billingFrequency?: 'monthly' | 'yearly';
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

// Lotto Module Types
export type LottoGame =
  | 'ultra_6_58'
  | 'grand_6_55'
  | 'lucky_6_50'
  | 'super_6_49'
  | 'mega_6_45'
  | 'lotto_6_42'
  | '6d'
  | '4d'
  | '3d_2pm'
  | '3d_5pm'
  | '3d_9pm'
  | '2d_2pm'
  | '2d_5pm'
  | '2d_9pm';

export type LottoBetSource = 'manual' | 'generated';
export type LottoBetResultStatus = 'pending' | 'won' | 'lost';
export type LottoNotificationChannel = 'in_app' | 'push';
export type LottoGeneratorStrategy = 'balanced' | 'hot' | 'due' | 'random';

export interface LottoDrawResult extends BaseEntity {
  game: LottoGame;
  drawDate: Date;
  combination: number[];
  jackpot: number | null;
  winners: number | null;
  source: 'pcso_scraper';
}

export interface LottoBet extends BaseEntity {
  game: LottoGame;
  drawDate: Date;
  pickedNumbers: number[];
  amount?: number;
  source: LottoBetSource;
  strategyUsed?: LottoGeneratorStrategy;
  resultStatus: LottoBetResultStatus;
  matchedCount?: number;
  winnings?: number;
}

export interface LottoReminder extends BaseEntity {
  game: LottoGame;
  enabled: boolean;
  remindDaysBefore: number;
  notifyTime: string; // HH:mm in Asia/Manila
  channels: LottoNotificationChannel[];
  lastSentForDraw?: string;
}

export interface GeneratedTicket {
  numbers: number[];
  score: number;
  strategy: LottoGeneratorStrategy;
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
