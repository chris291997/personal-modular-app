import { Link } from 'react-router-dom';
import { getEnabledModules } from '../modules';
import { Wallet, CheckSquare, TrendingUp, BarChart3, ArrowRight, HelpCircle, Users, Settings as SettingsIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import ConsultForm from '../components/ConsultForm';
import { useCurrency } from '../hooks/useCurrency';
import { getCurrentUser, subscribeToAuthState } from '../services/authService';
import { User } from '../types/user';
import { useBudgetStore } from '../stores/budgetStore';
import { useTaskStore } from '../stores/taskStore';

export default function Home() {
  const modules = getEnabledModules();
  const [user, setUser] = useState<User | null>(getCurrentUser());
  const { formatCurrency } = useCurrency();
  
  // Use stores
  const { incomes, expenses, loadIncomes, loadExpenses } = useBudgetStore();
  const { tickets, loadTickets } = useTaskStore();

  useEffect(() => {
    // Subscribe to auth state changes instead of polling
    const unsubscribe = subscribeToAuthState((currentUser: User | null) => {
      setUser(currentUser);
    });
    
    // Set initial user
    setUser(getCurrentUser());
    
    return unsubscribe;
  }, []);

  useEffect(() => {
    // Load data from stores (will use cache if available)
    loadIncomes();
    loadExpenses();
    loadTickets();
  }, [loadIncomes, loadExpenses, loadTickets]);

  // Calculate derived values from store data
  const totalBalance = incomes.reduce((sum, inc) => sum + (inc.amount || 0), 0) - 
                       expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
  const activeTasks = tickets.length;
  const savingsGoals = 0; // Will be calculated from store when needed

  return (
    <div className="w-full pb-20 md:pb-8 space-y-4 md:space-y-6">
      {/* Header with greeting */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
          Hello, {user?.name || 'User'}
        </h1>
        <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
          Welcome back to your dashboard
        </p>
      </div>

      {/* Total Balance and Modules - Side by Side */}
      <div className="grid grid-cols-2 gap-3 md:gap-4 w-full">
        {/* Total Balance Card */}
        <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-xl md:rounded-2xl p-3 md:p-4 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] cursor-pointer flex flex-col justify-between min-h-[120px] md:min-h-0">
          <div>
            <p className="text-purple-100 text-[10px] md:text-xs mb-1">Total Balance</p>
            <p className="text-lg md:text-2xl font-bold text-white leading-tight">{formatCurrency(totalBalance)}</p>
          </div>
          <div className="w-8 h-8 md:w-12 md:h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mt-2 md:mt-4">
            <TrendingUp className="w-4 h-4 md:w-6 md:h-6 text-white" />
          </div>
        </div>

        {/* Modules Widget */}
        <div className="bg-white dark:bg-gray-800 rounded-xl md:rounded-2xl p-3 md:p-4 shadow-lg border border-gray-200 dark:border-gray-700 flex flex-col">
          <h2 className="text-[10px] md:text-sm font-semibold text-gray-900 dark:text-white mb-2 md:mb-3">MODULES</h2>
          <div className="grid grid-cols-2 gap-2 md:gap-3">
            {modules.map(module => {
              const getModuleIcon = (moduleId: string) => {
                switch (moduleId) {
                  case 'budget':
                    return <Wallet className="w-4 h-4 md:w-5 md:h-5 text-white" />;
                  case 'task':
                    return <CheckSquare className="w-4 h-4 md:w-5 md:h-5 text-white" />;
                  case 'users':
                    return <Users className="w-4 h-4 md:w-5 md:h-5 text-white" />;
                  case 'settings':
                    return <SettingsIcon className="w-4 h-4 md:w-5 md:h-5 text-white" />;
                  default:
                    return null;
                }
              };

              return (
                <Link
                  key={module.id}
                  to={module.path}
                  className="group flex flex-col items-center justify-center hover:opacity-80 transition-opacity py-1 md:py-2 min-h-[60px] md:min-h-0"
                >
                  <div className={`w-8 h-8 md:w-10 md:h-10 rounded-lg bg-gradient-to-br ${
                    module.id === 'budget' 
                      ? 'from-purple-500 to-indigo-600' 
                      : module.id === 'task'
                      ? 'from-blue-500 to-cyan-600'
                      : module.id === 'users'
                      ? 'from-orange-500 to-red-600'
                      : 'from-gray-500 to-gray-700'
                  } flex items-center justify-center shadow-md mb-1 group-hover:scale-110 transition-transform duration-300`}>
                    {getModuleIcon(module.id)}
                  </div>
                  <span className="text-[10px] md:text-xs font-medium text-gray-900 dark:text-white text-center leading-tight">
                    {module.name}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Quick Consult Access */}
      <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl md:rounded-2xl p-4 md:p-6 shadow-lg text-white">
        <div className="flex items-center space-x-2 md:space-x-3 mb-3 md:mb-4">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-white/20 rounded-lg md:rounded-xl flex items-center justify-center backdrop-blur-sm flex-shrink-0">
            <HelpCircle className="w-5 h-5 md:w-6 md:h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base md:text-lg font-bold leading-tight">Financial Impact Analysis</h3>
            <p className="text-purple-100 text-xs md:text-sm leading-tight mt-0.5">Analyze expenses and debts before committing</p>
          </div>
        </div>
        <div className="bg-white/10 backdrop-blur-sm rounded-lg md:rounded-xl p-3 md:p-4">
          <ConsultForm compact={true} />
        </div>
      </div>

      {/* Quick Stats - Interactive Cards */}
      <div>
        <h2 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white mb-3 md:mb-4">QUICK STATS</h2>
        <div className="grid grid-cols-3 gap-2 md:gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg md:rounded-xl p-3 md:p-4 shadow-md hover:shadow-xl border border-gray-200 dark:border-gray-700 transition-all duration-300 transform hover:scale-105 cursor-pointer group">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center mb-2 md:mb-3 group-hover:scale-110 transition-transform">
              <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-white" />
            </div>
            <p className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white mb-0.5 md:mb-1 leading-tight">{formatCurrency(totalBalance)}</p>
            <p className="text-[10px] md:text-xs text-gray-600 dark:text-gray-400">Balance</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg md:rounded-xl p-3 md:p-4 shadow-md hover:shadow-xl border border-gray-200 dark:border-gray-700 transition-all duration-300 transform hover:scale-105 cursor-pointer group">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center mb-2 md:mb-3 group-hover:scale-110 transition-transform">
              <BarChart3 className="w-4 h-4 md:w-5 md:h-5 text-white" />
            </div>
            <p className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white mb-0.5 md:mb-1 leading-tight">{activeTasks}</p>
            <p className="text-[10px] md:text-xs text-gray-600 dark:text-gray-400">Tasks</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg md:rounded-xl p-3 md:p-4 shadow-md hover:shadow-xl border border-gray-200 dark:border-gray-700 transition-all duration-300 transform hover:scale-105 cursor-pointer group">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-2 md:mb-3 group-hover:scale-110 transition-transform">
              <CheckSquare className="w-4 h-4 md:w-5 md:h-5 text-white" />
            </div>
            <p className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white mb-0.5 md:mb-1 leading-tight">{savingsGoals}</p>
            <p className="text-[10px] md:text-xs text-gray-600 dark:text-gray-400">Goals</p>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <div className="flex items-center justify-between mb-3 md:mb-4">
          <h2 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white">RECENT ACTIVITY</h2>
          <Link 
            to="/budget" 
            className="text-purple-600 dark:text-purple-400 text-xs md:text-sm font-medium hover:opacity-80 transition-opacity flex items-center space-x-1 min-h-[44px] min-w-[44px] items-center justify-center"
          >
            <span className="hidden sm:inline">See all</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg md:rounded-xl p-3 md:p-4 shadow-md border border-gray-200 dark:border-gray-700">
          <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 text-center py-3 md:py-4">
            No recent activity
          </p>
        </div>
      </div>
    </div>
  );
}
