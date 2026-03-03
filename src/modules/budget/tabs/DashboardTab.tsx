import { useEffect } from 'react';
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { 
  TrendingUp, TrendingDown, Wallet, CreditCard, Target, 
  DollarSign, ArrowUpRight, ArrowDownRight, HelpCircle
} from 'lucide-react';
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { BarChart3 } from 'lucide-react';
import ConsultForm from '../../../components/ConsultForm';
import { useCurrency } from '../../../hooks/useCurrency';
import { useBudgetStore } from '../../../stores/budgetStore';
import {
  calculateMonthlyIncome,
  calculateMonthlyExpenses,
  calculateCurrentCutoffDebtPayments,
  calculateOnHandBalance,
  getFrequencyMultiplier,
} from '../../../utils/budgetCalculations';
import { getDebtPaymentsByCutoff } from '../../../utils/debtCutoff';

export default function DashboardTab() {
  const { formatCurrency } = useCurrency();
  
  // Use store instead of local state
  const {
    incomes,
    expenses,
    debts,
    savingsGoals,
    categories,
    loading,
    loadIncomes,
    loadExpenses,
    loadDebts,
    loadSavingsGoals,
    loadCategories,
  } = useBudgetStore();

  useEffect(() => {
    // Load ALL incomes/expenses (no date filter) so recurring items from any month are included in monthly calc
    loadIncomes(undefined, undefined, true);
    loadExpenses(undefined, undefined, true);
    loadDebts(true);
    loadSavingsGoals(true);
    loadCategories(true);
  }, [loadIncomes, loadExpenses, loadDebts, loadSavingsGoals, loadCategories]);

  const isLoading = loading.incomes || loading.expenses || loading.debts || loading.savingsGoals || loading.categories;

  const getCategoryName = (categoryId: string) =>
    categories.find((c) => c.id === categoryId)?.name ?? 'Other';
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const monthlyIncome = calculateMonthlyIncome(incomes, now);
  const monthlyExpenses = calculateMonthlyExpenses(expenses, now);
  const { cutoff1, cutoff2 } = getDebtPaymentsByCutoff(debts, now.getFullYear(), now.getMonth());
  const onHandBalance = calculateOnHandBalance(incomes, expenses, now);
  const currentCutoffDue = calculateCurrentCutoffDebtPayments(debts);
  const availableBudget = onHandBalance - currentCutoffDue;
  const totalDebt = debts.reduce((sum, debt) => sum + debt.remainingAmount, 0);
  const totalSavings = savingsGoals.reduce((sum, goal) => sum + goal.currentAmount, 0);

  // Chart data — monthly contribution per category (recurring + one-time this month)
  const expenseByCategory = expenses.reduce((acc, expense) => {
    const categoryId = expense.categoryId || 'Other';
    let amount = 0;
    if (expense.isRecurring && expense.recurringFrequency) {
      amount = expense.amount * getFrequencyMultiplier(expense.recurringFrequency);
    } else if (isWithinInterval(expense.date, { start: monthStart, end: monthEnd })) {
      amount = expense.amount;
    }
    if (amount > 0) {
      acc[categoryId] = (acc[categoryId] || 0) + amount;
    }
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.entries(expenseByCategory).map(([categoryId, value]) => ({
    name: getCategoryName(categoryId),
    value: Number(value.toFixed(2)),
  }));

  const COLORS = ['#8b5cf6', '#6366f1', '#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

  const monthlyData = [
    { name: 'Balance', amount: onHandBalance, color: '#10b981' },
    { name: 'Expenses', amount: monthlyExpenses, color: '#ef4444' },
    { name: 'Debts', amount: cutoff1 + cutoff2, color: '#f59e0b' },
  ];

  return (
    <div className="w-full space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
            Financial Overview
          </h2>
          <p className="text-xs md:text-sm lg:text-base text-gray-600 dark:text-gray-400 mt-1">
            {format(new Date(), 'MMMM yyyy')}
          </p>
        </div>
      </div>

      {/* Financial Overview Layout: Consult Form on Left, Stats Grid on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Financial Impact Analysis - Left Side */}
        <div className="lg:col-span-1">
          <div className="w-full bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl md:rounded-2xl p-3 md:p-4 lg:p-6 shadow-xl text-white h-full">
            <div className="flex items-center space-x-2 md:space-x-3 mb-2 md:mb-3 lg:mb-4">
              <div className="w-8 h-8 md:w-10 md:h-10 lg:w-12 lg:h-12 bg-white/20 rounded-lg md:rounded-xl flex items-center justify-center backdrop-blur-sm flex-shrink-0">
                <HelpCircle className="w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm md:text-base lg:text-lg font-bold leading-tight">Financial Impact Analysis</h3>
                <p className="text-purple-100 text-[10px] md:text-xs lg:text-sm leading-tight mt-0.5">Analyze expenses and debts</p>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg md:rounded-xl p-2 md:p-3 lg:p-4">
              <ConsultForm compact={true} />
            </div>
          </div>
        </div>

        {/* Financial Overview Stats - 2x2 Grid - Right Side */}
        <div className="lg:col-span-2">
          <div className="grid grid-cols-2 gap-2 md:gap-3 lg:gap-4 h-full">
            <div className="w-full bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl md:rounded-2xl p-2 md:p-3 lg:p-4 text-white shadow-xl">
              <div className="flex items-center justify-between mb-2 md:mb-3">
                <div className="w-7 h-7 md:w-8 md:h-8 lg:w-10 lg:h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm flex-shrink-0">
                  <Wallet className="w-3 h-3 md:w-4 md:h-4 lg:w-5 lg:h-5" />
                </div>
                <ArrowUpRight className="w-3 h-3 md:w-4 md:h-4 lg:w-5 lg:h-5 opacity-70 flex-shrink-0" />
              </div>
              <p className="text-purple-100 text-[10px] md:text-xs mb-1">Balance (On-hand)</p>
              <p className="text-sm md:text-base lg:text-xl font-bold leading-tight truncate">{formatCurrency(onHandBalance)}</p>
              <p className="text-purple-200/80 text-[9px] mt-0.5">Before debt payments</p>
            </div>

            <div className="w-full bg-gradient-to-br from-red-500 to-pink-600 rounded-xl md:rounded-2xl p-2 md:p-3 lg:p-4 text-white shadow-xl">
              <div className="flex items-center justify-between mb-2 md:mb-3">
                <div className="w-7 h-7 md:w-8 md:h-8 lg:w-10 lg:h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm flex-shrink-0">
                  <TrendingDown className="w-3 h-3 md:w-4 md:h-4 lg:w-5 lg:h-5" />
                </div>
                <ArrowDownRight className="w-3 h-3 md:w-4 md:h-4 lg:w-5 lg:h-5 opacity-70 flex-shrink-0" />
              </div>
              <p className="text-red-100 text-[10px] md:text-xs mb-1">Monthly Expenses</p>
              <p className="text-sm md:text-base lg:text-xl font-bold leading-tight truncate">{formatCurrency(monthlyExpenses)}</p>
            </div>

            <div className={`w-full rounded-xl md:rounded-2xl p-2 md:p-3 lg:p-4 text-white shadow-xl ${
              availableBudget >= 0 
                ? 'bg-gradient-to-br from-green-500 to-emerald-600' 
                : 'bg-gradient-to-br from-orange-500 to-red-600'
            }`}>
              <div className="flex items-center justify-between mb-2 md:mb-3">
                <div className="w-7 h-7 md:w-8 md:h-8 lg:w-10 lg:h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm flex-shrink-0">
                  <Wallet className="w-3 h-3 md:w-4 md:h-4 lg:w-5 lg:h-5" />
                </div>
                {availableBudget >= 0 ? (
                  <ArrowUpRight className="w-3 h-3 md:w-4 md:h-4 lg:w-5 lg:h-5 opacity-70 flex-shrink-0" />
                ) : (
                  <ArrowDownRight className="w-3 h-3 md:w-4 md:h-4 lg:w-5 lg:h-5 opacity-70 flex-shrink-0" />
                )}
              </div>
              <p className="text-white/80 text-[10px] md:text-xs mb-1">Available Budget</p>
              <p className="text-sm md:text-base lg:text-xl font-bold leading-tight truncate">{formatCurrency(availableBudget)}</p>
            </div>

            <div className="w-full bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl md:rounded-2xl p-2 md:p-3 lg:p-4 text-white shadow-xl">
              <div className="flex items-center justify-between mb-2 md:mb-3">
                <div className="w-7 h-7 md:w-8 md:h-8 lg:w-10 lg:h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm flex-shrink-0">
                  <Target className="w-3 h-3 md:w-4 md:h-4 lg:w-5 lg:h-5" />
                </div>
                <ArrowUpRight className="w-3 h-3 md:w-4 md:h-4 lg:w-5 lg:h-5 opacity-70 flex-shrink-0" />
              </div>
              <p className="text-blue-100 text-[10px] md:text-xs mb-1">Total Savings</p>
              <p className="text-sm md:text-base lg:text-xl font-bold leading-tight truncate">{formatCurrency(totalSavings)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Expense Distribution Pie Chart */}
        <div className="w-full bg-white dark:bg-gray-800 rounded-xl md:rounded-2xl p-3 md:p-4 lg:p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2 mb-3 md:mb-4 lg:mb-6">
            <BarChart3 className="w-4 h-4 md:w-5 md:h-5 text-purple-600 dark:text-purple-400 flex-shrink-0" />
            <h3 className="text-sm md:text-base lg:text-xl font-bold text-gray-900 dark:text-white">Expense Distribution</h3>
          </div>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <RechartsPieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => {
                const pct = percent * 100;
                return `${name} ${pct < 0.5 && pct > 0 ? '<1' : pct.toFixed(1)}%`;
              }}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
              </RechartsPieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-gray-500 dark:text-gray-400 text-xs md:text-sm">
              No expense data available
            </div>
          )}
        </div>

        {/* Monthly Overview Bar Chart */}
        <div className="w-full bg-white dark:bg-gray-800 rounded-xl md:rounded-2xl p-3 md:p-4 lg:p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2 mb-3 md:mb-4 lg:mb-6">
            <BarChart3 className="w-4 h-4 md:w-5 md:h-5 text-purple-600 dark:text-purple-400 flex-shrink-0" />
            <h3 className="text-sm md:text-base lg:text-xl font-bold text-gray-900 dark:text-white">Monthly Overview</h3>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
                {monthlyData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl md:rounded-2xl p-4 md:p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2 md:space-x-3 mb-3 md:mb-4">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-orange-500 to-amber-600 rounded-lg md:rounded-xl flex items-center justify-center">
              <CreditCard className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>
            <div>
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Total Debt</p>
              <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(totalDebt)}</p>
            </div>
          </div>
          <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Cutoff 1 (1–15): {formatCurrency(cutoff1)} · Cutoff 2 (16–30): {formatCurrency(cutoff2)}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl md:rounded-2xl p-4 md:p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2 md:space-x-3 mb-3 md:mb-4">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg md:rounded-xl flex items-center justify-center">
              <DollarSign className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>
            <div>
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Debt Payments (per cutoff)</p>
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                <span className="text-base font-semibold text-gray-800 dark:text-gray-200">Cutoff 1 (1–15): {formatCurrency(cutoff1)}</span>
                <span className="text-base font-semibold text-gray-800 dark:text-gray-200">Cutoff 2 (16–30): {formatCurrency(cutoff2)}</span>
              </div>
            </div>
          </div>
          <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Active Debts: {debts.length}</p>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl md:rounded-2xl p-4 md:p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-3 md:mb-4">Recent Expenses</h3>
          {(() => {
            const thisMonthExpenses = expenses
              .filter(e => isWithinInterval(e.date, { start: monthStart, end: monthEnd }))
              .sort((a, b) => b.date.getTime() - a.date.getTime())
              .slice(0, 5);
            return thisMonthExpenses.length > 0 ? (
            <div className="space-y-3">
              {thisMonthExpenses.map(expense => (
                <div key={expense.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white">{expense.description}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{format(expense.date, 'MMM dd, yyyy')}</p>
                  </div>
                  <p className="text-lg font-bold text-red-600 dark:text-red-400">-{formatCurrency(expense.amount)}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 dark:text-gray-400 py-8">No expenses this month</p>
          );
          })()}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl md:rounded-2xl p-4 md:p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-3 md:mb-4">Active Debts</h3>
          {debts.length > 0 ? (
            <div className="space-y-3">
              {debts.map(debt => (
                <div key={debt.id} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-gray-900 dark:text-white">{debt.creditor}</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(debt.remainingAmount)}</p>
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                    <span>Min: {formatCurrency(debt.minimumPayment)}</span>
                    <span>Due: Day {debt.dueDate}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 dark:text-gray-400 py-8">No active debts</p>
          )}
        </div>
      </div>
    </div>
  );
}
