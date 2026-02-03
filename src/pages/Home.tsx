import { Link } from 'react-router-dom';
import { getEnabledModules } from '../modules';
import { Wallet, CheckSquare, TrendingUp, BarChart3, ArrowRight, HelpCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getIncomes, getExpenses } from '../services/budgetService';
import { getSavedTickets } from '../services/taskService';
import ConsultForm from '../components/ConsultForm';

export default function Home() {
  const modules = getEnabledModules();
  const [totalBalance, setTotalBalance] = useState(0);
  const [activeTasks, setActiveTasks] = useState(0);
  const [savingsGoals] = useState(0);

  useEffect(() => {
    // Calculate total balance
    const calculateBalance = async () => {
      try {
        const incomes = await getIncomes();
        const expenses = await getExpenses();
        const totalIncome = incomes.reduce((sum, inc) => sum + (inc.amount || 0), 0);
        const totalExpense = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
        setTotalBalance(totalIncome - totalExpense);
      } catch (error) {
        console.error('Error calculating balance:', error);
      }
    };

    // Get active tasks
    const getTasks = async () => {
      try {
        const tickets = await getSavedTickets();
        setActiveTasks(tickets.length);
      } catch (error) {
        console.error('Error getting tasks:', error);
      }
    };

    calculateBalance();
    getTasks();
  }, []);

  return (
    <div className="w-full pb-20 md:pb-8 space-y-6">
      {/* Header with greeting */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Hello, Chris
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Welcome back to your dashboard
          </p>
        </div>
        <div className="w-10 h-10 rounded-full overflow-hidden shadow-lg ring-2 ring-purple-500/50">
          <img 
            src="/caveman4-01.png" 
            alt="Profile" 
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* Total Balance and Modules - Side by Side */}
      <div className="grid grid-cols-2 gap-4 w-full">
        {/* Total Balance Card */}
        <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-2xl p-4 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] cursor-pointer flex flex-col justify-between">
          <div>
            <p className="text-purple-100 text-xs mb-1">Total Balance</p>
            <p className="text-2xl font-bold text-white">${totalBalance.toLocaleString()}</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mt-4">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
        </div>

        {/* Modules Widget */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-lg border border-gray-200 dark:border-gray-700 flex flex-col">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">MODULES</h2>
          <div className="grid grid-cols-2 gap-3">
            {modules.map(module => (
              <Link
                key={module.id}
                to={module.path}
                className="group flex flex-col items-center justify-center hover:opacity-80 transition-opacity py-2"
              >
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${
                  module.id === 'budget' 
                    ? 'from-purple-500 to-indigo-600' 
                    : 'from-blue-500 to-cyan-600'
                } flex items-center justify-center shadow-md mb-1 group-hover:scale-110 transition-transform duration-300`}>
                  {module.id === 'budget' ? (
                    <Wallet className="w-5 h-5 text-white" />
                  ) : (
                    <CheckSquare className="w-5 h-5 text-white" />
                  )}
                </div>
                <span className="text-xs font-medium text-gray-900 dark:text-white text-center">
                  {module.name}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Consult Access */}
      <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl p-6 shadow-lg text-white">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
            <HelpCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold">Financial Impact Analysis</h3>
            <p className="text-purple-100 text-sm">Analyze expenses and debts before committing</p>
          </div>
        </div>
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
          <ConsultForm compact={true} />
        </div>
      </div>

      {/* Quick Stats - Interactive Cards */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">QUICK STATS</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-md hover:shadow-xl border border-gray-200 dark:border-gray-700 transition-all duration-300 transform hover:scale-105 cursor-pointer group">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">${totalBalance.toLocaleString()}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Balance</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-md hover:shadow-xl border border-gray-200 dark:border-gray-700 transition-all duration-300 transform hover:scale-105 cursor-pointer group">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{activeTasks}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Tasks</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-md hover:shadow-xl border border-gray-200 dark:border-gray-700 transition-all duration-300 transform hover:scale-105 cursor-pointer group">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <CheckSquare className="w-5 h-5 text-white" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{savingsGoals}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Goals</p>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">RECENT ACTIVITY</h2>
          <Link 
            to="/budget" 
            className="text-purple-600 dark:text-purple-400 text-sm font-medium hover:opacity-80 transition-opacity flex items-center space-x-1"
          >
            <span>See all</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-md border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400 text-center py-4">
            No recent activity
          </p>
        </div>
      </div>
    </div>
  );
}
