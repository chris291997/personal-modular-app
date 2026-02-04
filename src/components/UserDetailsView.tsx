import { useEffect, useState } from 'react';
import { getUserById } from '../services/userService';
import { getIncomes, getExpenses, getDebts, getSavingsGoals } from '../services/budgetService';
import { User } from '../types/user';
import { Income, Expense, Debt, SavingsGoal } from '../types';
import { format } from 'date-fns';
import { X, User as UserIcon, DollarSign, CreditCard, Target, Wallet } from 'lucide-react';
import { useCurrency } from '../hooks/useCurrency';

interface UserDetailsViewProps {
  userId: string;
  onClose: () => void;
}

export default function UserDetailsView({ userId, onClose }: UserDetailsViewProps) {
  const { formatCurrency } = useCurrency();
  const [user, setUser] = useState<User | null>(null);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [savings, setSavings] = useState<SavingsGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'profile' | 'budget'>('profile');

  useEffect(() => {
    loadData();
  }, [userId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [userData, incomesData, expensesData, debtsData, savingsData] = await Promise.all([
        getUserById(userId),
        getIncomes(), // TODO: Filter by userId
        getExpenses(), // TODO: Filter by userId
        getDebts(), // TODO: Filter by userId
        getSavingsGoals(), // TODO: Filter by userId
      ]);
      setUser(userData);
      setIncomes(incomesData);
      setExpenses(expensesData);
      setDebts(debtsData);
      setSavings(savingsData);
    } catch (error) {
      console.error('Error loading user details:', error);
      alert('Failed to load user details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-4xl w-full">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const totalIncome = incomes.reduce((sum, income) => sum + income.amount, 0);
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const totalDebts = debts.reduce((sum, debt) => sum + debt.remainingAmount, 0);
  const totalSavings = savings.reduce((sum, goal) => sum + goal.currentAmount, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-5xl w-full my-8 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            {user.profilePicture ? (
              <img
                src={user.profilePicture}
                alt={user.name}
                className="w-12 h-12 rounded-full"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                <UserIcon className="w-6 h-6 text-white" />
              </div>
            )}
            <div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{user.name}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">{user.email}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex space-x-2 mb-6 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'profile'
                ? 'text-purple-600 dark:text-purple-400 border-b-2 border-purple-600 dark:border-purple-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            Profile
          </button>
          <button
            onClick={() => setActiveTab('budget')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'budget'
                ? 'text-purple-600 dark:text-purple-400 border-b-2 border-purple-600 dark:border-purple-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            Budget Details
          </button>
        </div>

        {activeTab === 'profile' ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                <p className="text-gray-900 dark:text-white">{user.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                <p className="text-gray-900 dark:text-white">{user.email}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
                <p className="text-gray-900 dark:text-white capitalize">{user.role}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                <p className={`${user.isActive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {user.isActive ? 'Active' : 'Inactive'}
                </p>
              </div>
              {user.gender && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Gender</label>
                  <p className="text-gray-900 dark:text-white">{user.gender}</p>
                </div>
              )}
              {user.birthdate && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Birthdate</label>
                  <p className="text-gray-900 dark:text-white">{format(user.birthdate, 'MMM dd, yyyy')}</p>
                </div>
              )}
              {user.phone && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
                  <p className="text-gray-900 dark:text-white">{user.phone}</p>
                </div>
              )}
              {user.address && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address</label>
                  <p className="text-gray-900 dark:text-white">{user.address}</p>
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Enabled Modules</label>
              <div className="flex flex-wrap gap-2">
                {user.enabledModules.length > 0 ? (
                  user.enabledModules.map(moduleId => (
                    <span key={moduleId} className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-sm">
                      {moduleId}
                    </span>
                  ))
                ) : (
                  <p className="text-gray-500 dark:text-gray-400">No modules enabled</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
                <div className="flex items-center space-x-2 mb-2">
                  <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Income</span>
                </div>
                <p className="text-2xl font-bold text-green-700 dark:text-green-300">${totalIncome.toFixed(2)}</p>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 border border-red-200 dark:border-red-800">
                <div className="flex items-center space-x-2 mb-2">
                  <Wallet className="w-5 h-5 text-red-600 dark:text-red-400" />
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Expenses</span>
                </div>
                <p className="text-2xl font-bold text-red-700 dark:text-red-300">{formatCurrency(totalExpenses)}</p>
              </div>
              <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-4 border border-orange-200 dark:border-orange-800">
                <div className="flex items-center space-x-2 mb-2">
                  <CreditCard className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Debts</span>
                </div>
                <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">{formatCurrency(totalDebts)}</p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center space-x-2 mb-2">
                  <Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Savings</span>
                </div>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{formatCurrency(totalSavings)}</p>
              </div>
            </div>

            {/* Detailed Lists */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Incomes ({incomes.length})</h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {incomes.map(income => (
                    <div key={income.id} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-900 dark:text-white">{income.source}</span>
                        <span className="text-sm font-semibold text-green-600 dark:text-green-400">{formatCurrency(income.amount)}</span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{format(income.date, 'MMM dd, yyyy')}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Expenses ({expenses.length})</h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {expenses.map(expense => (
                    <div key={expense.id} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-900 dark:text-white">{expense.description}</span>
                        <span className="text-sm font-semibold text-red-600 dark:text-red-400">{formatCurrency(expense.amount)}</span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{format(expense.date, 'MMM dd, yyyy')}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
