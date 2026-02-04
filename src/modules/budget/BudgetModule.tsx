import { useState, useEffect } from 'react';
import IncomeTab from './tabs/IncomeTab';
import ExpensesTab from './tabs/ExpensesTab';
import DebtsTab from './tabs/DebtsTab';
import SavingsTab from './tabs/SavingsTab';
import ConsultTab from './tabs/ConsultTab';
import DashboardTab from './tabs/DashboardTab';
import { BarChart3, Wallet, CreditCard, Target, TrendingUp, HelpCircle } from 'lucide-react';

type Tab = 'dashboard' | 'income' | 'expenses' | 'debts' | 'savings' | 'consult';

export default function BudgetModule() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');

  // Check for tab navigation from Home page
  useEffect(() => {
    const tabFromStorage = sessionStorage.getItem('budgetTab');
    if (tabFromStorage && ['dashboard', 'income', 'expenses', 'debts', 'savings', 'consult'].includes(tabFromStorage)) {
      setActiveTab(tabFromStorage as Tab);
      sessionStorage.removeItem('budgetTab');
    }
  }, []);

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <BarChart3 className="w-full h-full" /> },
    { id: 'income', label: 'Income', icon: <TrendingUp className="w-full h-full" /> },
    { id: 'expenses', label: 'Expenses', icon: <Wallet className="w-full h-full" /> },
    { id: 'debts', label: 'Debts', icon: <CreditCard className="w-full h-full" /> },
    { id: 'savings', label: 'Savings', icon: <Target className="w-full h-full" /> },
    { id: 'consult', label: 'Consult', icon: <HelpCircle className="w-full h-full" /> },
  ];

  return (
    <div className="w-full space-y-4 md:space-y-6 pb-20 md:pb-8">
      <div className="text-center space-y-2">
        <h1 className="text-xl md:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 dark:from-purple-400 dark:to-indigo-400 bg-clip-text text-transparent">
          Budget Management
        </h1>
        <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
          Track your income, expenses, debts, and savings
        </p>
      </div>

      {/* Tabs */}
      <div className="w-full bg-white dark:bg-gray-800 rounded-xl md:rounded-2xl p-1 md:p-2 shadow-lg border border-gray-200 dark:border-gray-700 overflow-x-auto">
        <div className="flex space-x-1 md:space-x-2 min-w-max md:justify-center md:min-w-0">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center justify-center sm:justify-start space-x-1 md:space-x-2 px-2 sm:px-3 md:px-4 py-2 md:py-2.5 rounded-lg md:rounded-xl text-xs md:text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 min-w-[2.5rem] sm:min-w-0 ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <span className="flex items-center justify-center w-4 h-4 md:w-5 md:h-5 flex-shrink-0 [&>svg]:w-full [&>svg]:h-full">
                {tab.icon}
              </span>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'dashboard' && <DashboardTab key="dashboard" />}
        {activeTab === 'income' && <IncomeTab key="income" />}
        {activeTab === 'expenses' && <ExpensesTab key="expenses" />}
        {activeTab === 'debts' && <DebtsTab key="debts" />}
        {activeTab === 'savings' && <SavingsTab key="savings" />}
        {activeTab === 'consult' && <ConsultTab key="consult" />}
      </div>
    </div>
  );
}
