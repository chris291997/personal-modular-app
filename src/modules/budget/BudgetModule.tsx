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
    { id: 'dashboard', label: 'Dashboard', icon: <BarChart3 className="w-5 h-5" /> },
    { id: 'income', label: 'Income', icon: <TrendingUp className="w-5 h-5" /> },
    { id: 'expenses', label: 'Expenses', icon: <Wallet className="w-5 h-5" /> },
    { id: 'debts', label: 'Debts', icon: <CreditCard className="w-5 h-5" /> },
    { id: 'savings', label: 'Savings', icon: <Target className="w-5 h-5" /> },
    { id: 'consult', label: 'Consult', icon: <HelpCircle className="w-5 h-5" /> },
  ];

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 dark:from-purple-400 dark:to-indigo-400 bg-clip-text text-transparent">
          Budget Management
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Track your income, expenses, debts, and savings
        </p>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-2 shadow-lg border border-gray-200 dark:border-gray-700 overflow-x-auto">
        <div className="flex space-x-2 min-w-max md:justify-center">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'dashboard' && <DashboardTab />}
        {activeTab === 'income' && <IncomeTab />}
        {activeTab === 'expenses' && <ExpensesTab />}
        {activeTab === 'debts' && <DebtsTab />}
        {activeTab === 'savings' && <SavingsTab />}
        {activeTab === 'consult' && <ConsultTab />}
      </div>
    </div>
  );
}
