import { useEffect, useMemo, useState } from 'react';
import { Expense } from '../../../types';
import { format } from 'date-fns';
import { Plus, Edit2, Trash2, Repeat, CheckCircle2 } from 'lucide-react';
import ConfirmModal from '../../../components/ConfirmModal';
import { useCurrency } from '../../../hooks/useCurrency';
import { useBudgetStore } from '../../../stores/budgetStore';

export default function SubscriptionsTab() {
  const { formatCurrency } = useCurrency();
  const { expenses, categories, loading, loadExpenses, loadCategories, addExpense, updateExpense, deleteExpense } = useBudgetStore();
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const [formData, setFormData] = useState({
    amount: '',
    categoryId: '',
    description: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    recurringFrequency: 'monthly' as Expense['recurringFrequency'],
    nextDueDate: '',
    notes: '',
  });

  const subscriptions = useMemo(
    () => expenses.filter(e => e.isRecurring),
    [expenses]
  );

  useEffect(() => {
    loadExpenses();
    loadCategories();
  }, [loadExpenses, loadCategories]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingExpense) {
        await updateExpense(editingExpense.id, {
          amount: parseFloat(formData.amount),
          categoryId: formData.categoryId,
          description: formData.description,
          date: new Date(formData.date),
          isRecurring: true,
          recurringFrequency: formData.recurringFrequency,
          nextDueDate: formData.nextDueDate ? new Date(formData.nextDueDate) : undefined,
          notes: formData.notes || undefined,
        });
      } else {
        await addExpense({
          amount: parseFloat(formData.amount),
          categoryId: formData.categoryId,
          description: formData.description,
          date: new Date(formData.date),
          isRecurring: true,
          recurringFrequency: formData.recurringFrequency,
          nextDueDate: formData.nextDueDate ? new Date(formData.nextDueDate) : undefined,
          notes: formData.notes || undefined,
        });
      }
      resetForm();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to save subscription: ${msg}`);
    }
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setFormData({
      amount: expense.amount.toString(),
      categoryId: expense.categoryId,
      description: expense.description,
      date: format(expense.date, 'yyyy-MM-dd'),
      recurringFrequency: expense.recurringFrequency || 'monthly',
      nextDueDate: expense.nextDueDate ? format(expense.nextDueDate, 'yyyy-MM-dd') : '',
      notes: expense.notes || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (exp: Expense) => {
    try {
      await deleteExpense(exp.id);
      setConfirmDelete(null);
    } catch (error) {
      alert(`Failed to delete: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const currentMonth = format(new Date(), 'yyyy-MM');
  const [markingPaid, setMarkingPaid] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Expense | null>(null);

  const handleMarkPaid = async (exp: Expense) => {
    setMarkingPaid(exp.id);
    try {
      await updateExpense(exp.id, { lastPaidMonth: currentMonth });
    } catch (error) {
      alert(`Failed to mark as paid: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setMarkingPaid(null);
    }
  };

  const resetForm = () => {
    setFormData({
      amount: '',
      categoryId: '',
      description: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      recurringFrequency: 'monthly',
      nextDueDate: '',
      notes: '',
    });
    setEditingExpense(null);
    setShowForm(false);
  };

  const getCategoryName = (categoryId: string) =>
    categories.find(c => c.id === categoryId)?.name ?? categoryId;

  const inputCls = 'w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent';
  const labelCls = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2';

  if (loading.expenses || loading.categories) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600" />
      </div>
    );
  }

  return (
    <div className="w-full space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
        <div className="flex items-center space-x-2 md:space-x-3">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg md:rounded-xl flex items-center justify-center">
            <Repeat className="w-5 h-5 md:w-6 md:h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Subscriptions</h2>
            <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Recurring expenses (bills, memberships, etc.)</p>
          </div>
        </div>
        <button
          onClick={() => { if (showForm) resetForm(); else setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg transition-all w-full sm:w-auto justify-center"
        >
          <Plus className="w-5 h-5" />
          <span>{showForm ? 'Cancel' : 'Add Subscription'}</span>
        </button>
      </div>

      {showForm && (
        <div className="w-full bg-white dark:bg-gray-800 rounded-xl md:rounded-2xl p-4 md:p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
            {editingExpense ? 'Edit Subscription' : 'New Subscription'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Amount *</label>
                <input type="number" step="0.01" required value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} placeholder="0.00" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Category *</label>
                <select required value={formData.categoryId} onChange={e => setFormData({ ...formData, categoryId: e.target.value })} className={inputCls}>
                  <option value="">Select category</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Description *</label>
                <input type="text" required value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="e.g., Netflix, Spotify" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Billing Frequency *</label>
                <select value={formData.recurringFrequency} onChange={e => setFormData({ ...formData, recurringFrequency: e.target.value as Expense['recurringFrequency'] })} className={inputCls}>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Start Date *</label>
                <input type="date" required value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Next Due Date</label>
                <input type="date" value={formData.nextDueDate} onChange={e => setFormData({ ...formData, nextDueDate: e.target.value })} className={inputCls} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Notes</label>
              <textarea value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} rows={2} className={inputCls} placeholder="Optional..." />
            </div>
            <div className="flex gap-3">
              <button type="submit" className="flex-1 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg font-medium hover:shadow-lg transition-all">
                {editingExpense ? 'Update' : 'Add'} Subscription
              </button>
              <button type="button" onClick={resetForm} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="w-full bg-white dark:bg-gray-800 rounded-xl md:rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {subscriptions.length === 0 ? (
          <div className="p-8 md:p-12 text-center">
            <Repeat className="w-12 h-12 md:w-16 md:h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-sm md:text-base text-gray-600 dark:text-gray-400">No subscriptions yet. Add recurring expenses from here or the Expenses tab.</p>
          </div>
        ) : (
          <>
            <div className="md:hidden space-y-3 p-3">
              {subscriptions.map(exp => (
                <div key={exp.id} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="text-base font-semibold text-gray-900 dark:text-white">{exp.description}</h3>
                      <p className="text-xs text-gray-600 dark:text-gray-400">{getCategoryName(exp.categoryId)} • {exp.recurringFrequency}</p>
                    </div>
                    <p className="text-base font-bold text-red-600 dark:text-red-400">{formatCurrency(exp.amount)}</p>
                  </div>
                  {exp.nextDueDate && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Next: {format(exp.nextDueDate, 'MMM dd, yyyy')}</p>
                  )}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                    {exp.lastPaidMonth === currentMonth ? (
                      <span className="text-xs text-green-600 dark:text-green-400 font-medium">Paid</span>
                    ) : (
                      <button
                        onClick={() => handleMarkPaid(exp)}
                        disabled={markingPaid === exp.id}
                        className="flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg text-xs font-medium hover:bg-green-200 dark:hover:bg-green-900/50 disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {markingPaid === exp.id ? 'Saving...' : 'Mark Paid'}
                      </button>
                    )}
                    <div className="flex gap-2">
                      <button onClick={() => handleEdit(exp)} className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => setConfirmDelete(exp)} className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Description</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Frequency</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Next Due</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {subscriptions.map(exp => (
                    <tr key={exp.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{exp.description}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{getCategoryName(exp.categoryId)}</td>
                      <td className="px-6 py-4 font-bold text-red-600 dark:text-red-400">{formatCurrency(exp.amount)}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full text-xs font-medium">
                          {exp.recurringFrequency}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{exp.nextDueDate ? format(exp.nextDueDate, 'MMM dd, yyyy') : '—'}</td>
                      <td className="px-6 py-4">
                        {exp.lastPaidMonth === currentMonth ? (
                          <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-xs font-medium">Paid</span>
                        ) : (
                          <button
                            onClick={() => handleMarkPaid(exp)}
                            disabled={markingPaid === exp.id}
                            className="flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg text-xs font-medium hover:bg-green-200 dark:hover:bg-green-900/50 disabled:opacity-50"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {markingPaid === exp.id ? 'Saving...' : 'Mark Paid'}
                          </button>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button onClick={() => handleEdit(exp)} className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => setConfirmDelete(exp)} className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <ConfirmModal
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
        title="Delete subscription"
        message={confirmDelete ? `Delete "${confirmDelete.description}"?` : ''}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
      />
    </div>
  );
}
