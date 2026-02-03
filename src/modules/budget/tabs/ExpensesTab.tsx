import { useEffect, useState } from 'react';
import { getExpenses, addExpense, updateExpense, deleteExpense, getCategories, addCategory } from '../../../services/budgetService';
import { Expense, ExpenseCategory } from '../../../types';
import { format } from 'date-fns';
import './ExpensesTab.css';

const COMMON_CATEGORIES = [
  'Food & Dining',
  'Transportation',
  'Bills & Utilities',
  'Shopping',
  'Entertainment',
  'Healthcare',
  'Education',
  'Travel',
  'Personal Care',
  'Subscriptions',
];

export default function ExpensesTab() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [showCategoryForm, setShowCategoryForm] = useState(false);

  const [formData, setFormData] = useState({
    amount: '',
    categoryId: '',
    description: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    isRecurring: false,
    recurringFrequency: 'monthly' as Expense['recurringFrequency'],
    nextDueDate: '',
    notes: '',
  });

  const [categoryFormData, setCategoryFormData] = useState({
    name: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [expensesData, categoriesData] = await Promise.all([
        getExpenses(),
        getCategories(),
      ]);
      setExpenses(expensesData);
      
      // Initialize categories if empty
      if (categoriesData.length === 0) {
        const commonCats: ExpenseCategory[] = COMMON_CATEGORIES.map(name => ({
          id: name,
          name,
          isCustom: false,
        }));
        setCategories(commonCats);
      } else {
        setCategories(categoriesData);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingExpense) {
        await updateExpense(editingExpense.id, {
          ...formData,
          amount: parseFloat(formData.amount),
          date: new Date(formData.date),
          nextDueDate: formData.isRecurring && formData.nextDueDate ? new Date(formData.nextDueDate) : undefined,
        });
      } else {
        await addExpense({
          amount: parseFloat(formData.amount),
          categoryId: formData.categoryId,
          description: formData.description,
          date: new Date(formData.date),
          isRecurring: formData.isRecurring,
          recurringFrequency: formData.isRecurring ? formData.recurringFrequency : undefined,
          nextDueDate: formData.isRecurring && formData.nextDueDate ? new Date(formData.nextDueDate) : undefined,
          notes: formData.notes || undefined,
        });
      }
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error saving expense:', error);
      alert('Failed to save expense');
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addCategory({
        name: categoryFormData.name,
        isCustom: true,
      });
      setCategoryFormData({ name: '' });
      setShowCategoryForm(false);
      loadData();
    } catch (error) {
      console.error('Error adding category:', error);
      alert('Failed to add category');
    }
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setFormData({
      amount: expense.amount.toString(),
      categoryId: expense.categoryId,
      description: expense.description,
      date: format(expense.date, 'yyyy-MM-dd'),
      isRecurring: expense.isRecurring,
      recurringFrequency: expense.recurringFrequency || 'monthly',
      nextDueDate: expense.nextDueDate ? format(expense.nextDueDate, 'yyyy-MM-dd') : '',
      notes: expense.notes || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;
    try {
      await deleteExpense(id);
      loadData();
    } catch (error) {
      console.error('Error deleting expense:', error);
      alert('Failed to delete expense');
    }
  };

  const resetForm = () => {
    setFormData({
      amount: '',
      categoryId: '',
      description: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      isRecurring: false,
      recurringFrequency: 'monthly',
      nextDueDate: '',
      notes: '',
    });
    setEditingExpense(null);
    setShowForm(false);
  };

  const getCategoryName = (categoryId: string) => {
    return categories.find(c => c.id === categoryId)?.name || categoryId;
  };

  if (loading) {
    return <div className="loading">Loading expenses...</div>;
  }

  return (
    <div className="expenses-tab">
      <div className="tab-header">
        <h2>Expense Management</h2>
        <div className="header-actions">
          <button className="btn-secondary" onClick={() => setShowCategoryForm(!showCategoryForm)}>
            {showCategoryForm ? 'Cancel' : '+ Category'}
          </button>
          <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancel' : '+ Add Expense'}
          </button>
        </div>
      </div>

      {showCategoryForm && (
        <form className="category-form" onSubmit={handleAddCategory}>
          <div className="form-group">
            <label>Category Name *</label>
            <input
              type="text"
              required
              value={categoryFormData.name}
              onChange={(e) => setCategoryFormData({ name: e.target.value })}
              placeholder="e.g., Gym Membership"
            />
          </div>
          <div className="form-actions">
            <button type="submit" className="btn-primary">Add Category</button>
            <button type="button" className="btn-secondary" onClick={() => setShowCategoryForm(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {showForm && (
        <form className="expense-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Amount *</label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Category *</label>
              <select
                required
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
              >
                <option value="">Select category</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Description *</label>
            <input
              type="text"
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="e.g., Grocery shopping"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Date *</label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={formData.isRecurring}
                  onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
                />
                Recurring Expense
              </label>
            </div>
          </div>

          {formData.isRecurring && (
            <div className="form-row">
              <div className="form-group">
                <label>Frequency</label>
                <select
                  value={formData.recurringFrequency}
                  onChange={(e) => setFormData({ ...formData, recurringFrequency: e.target.value as Expense['recurringFrequency'] })}
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>

              <div className="form-group">
                <label>Next Due Date</label>
                <input
                  type="date"
                  value={formData.nextDueDate}
                  onChange={(e) => setFormData({ ...formData, nextDueDate: e.target.value })}
                />
              </div>
            </div>
          )}

          <div className="form-group">
            <label>Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-primary">
              {editingExpense ? 'Update' : 'Add'} Expense
            </button>
            <button type="button" className="btn-secondary" onClick={resetForm}>
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="expense-list">
        {expenses.length === 0 ? (
          <p className="empty-state">No expenses yet. Add your first expense!</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Category</th>
                <th>Amount</th>
                <th>Recurring</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map(expense => (
                <tr key={expense.id}>
                  <td>{format(expense.date, 'MMM dd, yyyy')}</td>
                  <td>{expense.description}</td>
                  <td>{getCategoryName(expense.categoryId)}</td>
                  <td className="amount">${expense.amount.toFixed(2)}</td>
                  <td>
                    {expense.isRecurring ? (
                      <span className="recurring-badge">
                        {expense.recurringFrequency} {expense.nextDueDate && `(Next: ${format(expense.nextDueDate, 'MMM dd')})`}
                      </span>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="actions">
                    <button className="btn-edit" onClick={() => handleEdit(expense)}>Edit</button>
                    <button className="btn-delete" onClick={() => handleDelete(expense.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
