import { useState } from 'react';
import './BudgetModule.css';
import IncomeTab from './tabs/IncomeTab';
import ExpensesTab from './tabs/ExpensesTab';
import DebtsTab from './tabs/DebtsTab';
import SavingsTab from './tabs/SavingsTab';
import ConsultTab from './tabs/ConsultTab';
import DashboardTab from './tabs/DashboardTab';

type Tab = 'dashboard' | 'income' | 'expenses' | 'debts' | 'savings' | 'consult';

export default function BudgetModule() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'income', label: 'Income', icon: '💰' },
    { id: 'expenses', label: 'Expenses', icon: '💸' },
    { id: 'debts', label: 'Debts', icon: '💳' },
    { id: 'savings', label: 'Savings', icon: '🎯' },
    { id: 'consult', label: 'Consult', icon: '🤔' },
  ];

  return (
    <div className="budget-module">
      <div className="budget-header">
        <h1>Budget Management</h1>
        <p>Track your income, expenses, debts, and savings</p>
      </div>
      <div className="budget-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="tab-icon">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>
      <div className="budget-content">
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
