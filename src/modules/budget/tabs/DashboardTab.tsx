import { useEffect, useState } from 'react';
import { getIncomes, getExpenses, getDebts, getSavingsGoals } from '../../../services/budgetService';
import { Income, Expense, Debt, SavingsGoal } from '../../../types';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import './DashboardTab.css';

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
    return <div className="loading">Loading dashboard...</div>;
  }

  const monthlyIncome = calculateMonthlyIncome();
  const monthlyExpenses = calculateMonthlyExpenses();
  const monthlyDebtPayments = calculateMonthlyDebtPayments();
  const availableBudget = monthlyIncome - monthlyExpenses - monthlyDebtPayments;
  const totalDebt = debts.reduce((sum, debt) => sum + debt.remainingAmount, 0);
  const totalSavings = savingsGoals.reduce((sum, goal) => sum + goal.currentAmount, 0);

  return (
    <div className="dashboard-tab">
      <h2>Financial Overview - {format(new Date(), 'MMMM yyyy')}</h2>
      
      <div className="stats-grid">
        <div className="stat-card income">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <div className="stat-label">Monthly Income</div>
            <div className="stat-value">${monthlyIncome.toFixed(2)}</div>
          </div>
        </div>

        <div className="stat-card expense">
          <div className="stat-icon">💸</div>
          <div className="stat-content">
            <div className="stat-label">Monthly Expenses</div>
            <div className="stat-value">${monthlyExpenses.toFixed(2)}</div>
          </div>
        </div>

        <div className="stat-card debt">
          <div className="stat-icon">💳</div>
          <div className="stat-content">
            <div className="stat-label">Debt Payments</div>
            <div className="stat-value">${monthlyDebtPayments.toFixed(2)}</div>
          </div>
        </div>

        <div className={`stat-card ${availableBudget >= 0 ? 'available' : 'negative'}`}>
          <div className="stat-icon">{availableBudget >= 0 ? '✅' : '⚠️'}</div>
          <div className="stat-content">
            <div className="stat-label">Available Budget</div>
            <div className="stat-value">${availableBudget.toFixed(2)}</div>
          </div>
        </div>

        <div className="stat-card total-debt">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <div className="stat-label">Total Debt</div>
            <div className="stat-value">${totalDebt.toFixed(2)}</div>
          </div>
        </div>

        <div className="stat-card savings">
          <div className="stat-icon">🎯</div>
          <div className="stat-content">
            <div className="stat-label">Total Savings</div>
            <div className="stat-value">${totalSavings.toFixed(2)}</div>
          </div>
        </div>
      </div>

      <div className="dashboard-sections">
        <div className="dashboard-section">
          <h3>Recent Expenses</h3>
          {expenses.slice(0, 5).length > 0 ? (
            <ul className="expense-list">
              {expenses.slice(0, 5).map(expense => (
                <li key={expense.id}>
                  <span className="expense-amount">${expense.amount.toFixed(2)}</span>
                  <span className="expense-desc">{expense.description}</span>
                  <span className="expense-date">{format(expense.date, 'MMM dd')}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-state">No expenses this month</p>
          )}
        </div>

        <div className="dashboard-section">
          <h3>Active Debts</h3>
          {debts.length > 0 ? (
            <ul className="debt-list">
              {debts.map(debt => (
                <li key={debt.id}>
                  <div className="debt-info">
                    <span className="debt-creditor">{debt.creditor}</span>
                    <span className="debt-amount">${debt.remainingAmount.toFixed(2)}</span>
                  </div>
                  <div className="debt-details">
                    Min: ${debt.minimumPayment.toFixed(2)} | Due: Day {debt.dueDate.toString()}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-state">No active debts</p>
          )}
        </div>
      </div>
    </div>
  );
}
