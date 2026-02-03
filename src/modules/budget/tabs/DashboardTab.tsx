import { useEffect, useState } from 'react';
import { getIncomes, getExpenses, getDebts, getSavingsGoals } from '../../../services/budgetService';
import { Income, Expense, Debt, SavingsGoal } from '../../../types';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { 
  TrendingUp, TrendingDown, Wallet, CreditCard, Target, 
  DollarSign, ArrowUpRight, ArrowDownRight, HelpCircle
} from 'lucide-react';
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { BarChart3 } from 'lucide-react';
import ConsultForm from '../../../components/ConsultForm';

export default function DashboardTab() {
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const now = new Date();
      const start = startOfMonth(now);
      const end = endOfMonth(now);

      const [incomesData, expensesData, debtsData, goalsData] = await Promise.all([
        getIncomes(start, end),
        getExpenses(start, end),
        getDebts(),
        getSavingsGoals(),
      ]);

      setIncomes(incomesData);
      setExpenses(expensesData);
      setDebts(debtsData);
      setSavingsGoals(goalsData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateMonthlyIncome = () => {
    return incomes.reduce((sum, income) => {
      const multiplier = getFrequencyMultiplier(income.frequency);
      return sum + (income.amount * multiplier);
    }, 0);
  };

  const calculateMonthlyExpenses = () => {
    return expenses.reduce((sum, expense) => {
      if (expense.isRecurring && expense.recurringFrequency) {
        const multiplier = getFrequencyMultiplier(expense.recurringFrequency);
        return sum + (expense.amount * multiplier);
      }
      return sum;
    }, 0);
  };

  const calculateMonthlyDebtPayments = () => {
    return debts.reduce((sum, debt) => sum + debt.minimumPayment, 0);
  };

  const getFrequencyMultiplier = (frequency: string): number => {
    switch (frequency) {
      case 'daily': return 30;
      case 'weekly': return 4.33;
      case 'biweekly': return 2.17;
      case 'monthly': return 1;
      case 'yearly': return 1 / 12;
      default: return 1;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  const monthlyIncome = calculateMonthlyIncome();
  const monthlyExpenses = calculateMonthlyExpenses();
  const monthlyDebtPayments = calculateMonthlyDebtPayments();
  const availableBudget = monthlyIncome - monthlyExpenses - monthlyDebtPayments;
  const totalDebt = debts.reduce((sum, debt) => sum + debt.remainingAmount, 0);
  const totalSavings = savingsGoals.reduce((sum, goal) => sum + goal.currentAmount, 0);

  // Chart data
  const expenseByCategory = expenses.reduce((acc, expense) => {
    const category = expense.categoryId || 'Other';
    acc[category] = (acc[category] || 0) + expense.amount;
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.entries(expenseByCategory).map(([name, value]) => ({
    name,
    value: Number(value.toFixed(2)),
  }));

  const COLORS = ['#8b5cf6', '#6366f1', '#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

  const monthlyData = [
    { name: 'Income', amount: monthlyIncome, color: '#10b981' },
    { name: 'Expenses', amount: monthlyExpenses, color: '#ef4444' },
    { name: 'Debts', amount: monthlyDebtPayments, color: '#f59e0b' },
  ];

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
            Financial Overview
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {format(new Date(), 'MMMM yyyy')}
          </p>
        </div>
      </div>

      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl p-6 text-white shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <TrendingUp className="w-6 h-6" />
            </div>
            <ArrowUpRight className="w-5 h-5 opacity-80" />
          </div>
          <p className="text-purple-100 text-sm mb-1">Monthly Income</p>
          <p className="text-3xl font-bold">${monthlyIncome.toFixed(2)}</p>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-pink-600 rounded-2xl p-6 text-white shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <TrendingDown className="w-6 h-6" />
            </div>
            <ArrowDownRight className="w-5 h-5 opacity-80" />
          </div>
          <p className="text-red-100 text-sm mb-1">Monthly Expenses</p>
          <p className="text-3xl font-bold">${monthlyExpenses.toFixed(2)}</p>
        </div>

        <div className={`rounded-2xl p-6 text-white shadow-xl ${
          availableBudget >= 0 
            ? 'bg-gradient-to-br from-green-500 to-emerald-600' 
            : 'bg-gradient-to-br from-orange-500 to-red-600'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <Wallet className="w-6 h-6" />
            </div>
            {availableBudget >= 0 ? (
              <ArrowUpRight className="w-5 h-5 opacity-80" />
            ) : (
              <ArrowDownRight className="w-5 h-5 opacity-80" />
            )}
          </div>
          <p className="text-white/80 text-sm mb-1">Available Budget</p>
          <p className="text-3xl font-bold">${availableBudget.toFixed(2)}</p>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl p-6 text-white shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <Target className="w-6 h-6" />
            </div>
            <ArrowUpRight className="w-5 h-5 opacity-80" />
          </div>
          <p className="text-blue-100 text-sm mb-1">Total Savings</p>
          <p className="text-3xl font-bold">${totalSavings.toFixed(2)}</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expense Distribution Pie Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2 mb-6">
            <BarChart3 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Expense Distribution</h3>
          </div>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
              </RechartsPieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-500 dark:text-gray-400">
              No expense data available
            </div>
          )}
        </div>

        {/* Monthly Overview Bar Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2 mb-6">
            <BarChart3 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Monthly Overview</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
              <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
                {monthlyData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Quick Consult Card */}
      <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl p-6 shadow-xl text-white">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
            <HelpCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold">Financial Impact Analysis</h3>
            <p className="text-purple-100 text-sm">Analyze expenses and debts before committing</p>
          </div>
        </div>
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
          <ConsultForm compact={true} />
        </div>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Debt</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">${totalDebt.toFixed(2)}</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Monthly Payments: ${monthlyDebtPayments.toFixed(2)}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Debt Payments</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">${monthlyDebtPayments.toFixed(2)}</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Active Debts: {debts.length}</p>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Recent Expenses</h3>
          {expenses.slice(0, 5).length > 0 ? (
            <div className="space-y-3">
              {expenses.slice(0, 5).map(expense => (
                <div key={expense.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white">{expense.description}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{format(expense.date, 'MMM dd, yyyy')}</p>
                  </div>
                  <p className="text-lg font-bold text-red-600 dark:text-red-400">-${expense.amount.toFixed(2)}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 dark:text-gray-400 py-8">No expenses this month</p>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Active Debts</h3>
          {debts.length > 0 ? (
            <div className="space-y-3">
              {debts.map(debt => (
                <div key={debt.id} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-gray-900 dark:text-white">{debt.creditor}</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">${debt.remainingAmount.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                    <span>Min: ${debt.minimumPayment.toFixed(2)}</span>
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
