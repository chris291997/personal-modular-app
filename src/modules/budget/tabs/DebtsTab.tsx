import { useEffect, useState } from 'react';
import { getDebts, addDebt, updateDebt, deleteDebt } from '../../../services/budgetService';
import { Debt } from '../../../types';
import { Plus, Edit2, Trash2, CreditCard } from 'lucide-react';

export default function DebtsTab() {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);

  const [formData, setFormData] = useState({
    type: 'credit_card' as Debt['type'],
    creditor: '',
    totalAmount: '',
    remainingAmount: '',
    minimumPayment: '',
    interestRate: '',
    dueDate: '1',
    notes: '',
  });

  useEffect(() => {
    loadDebts();
  }, []);

  const loadDebts = async () => {
    try {
      setLoading(true);
      const data = await getDebts();
      setDebts(data);
    } catch (error) {
      console.error('Error loading debts:', error);
      alert('Failed to load debts');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingDebt) {
        await updateDebt(editingDebt.id, {
          ...formData,
          totalAmount: parseFloat(formData.totalAmount),
          remainingAmount: parseFloat(formData.remainingAmount),
          minimumPayment: parseFloat(formData.minimumPayment),
          interestRate: formData.interestRate ? parseFloat(formData.interestRate) : undefined,
          dueDate: parseInt(formData.dueDate),
        });
      } else {
        await addDebt({
          type: formData.type,
          creditor: formData.creditor,
          totalAmount: parseFloat(formData.totalAmount),
          remainingAmount: parseFloat(formData.remainingAmount),
          minimumPayment: parseFloat(formData.minimumPayment),
          interestRate: formData.interestRate ? parseFloat(formData.interestRate) : undefined,
          dueDate: parseInt(formData.dueDate),
          notes: formData.notes || undefined,
        });
      }
      resetForm();
      loadDebts();
    } catch (error: any) {
      console.error('Error saving debt:', error);
      const errorMessage = error?.message || 'Unknown error';
      alert(`Failed to save debt: ${errorMessage}`);
    }
  };

  const handleEdit = (debt: Debt) => {
    setEditingDebt(debt);
    setFormData({
      type: debt.type,
      creditor: debt.creditor,
      totalAmount: debt.totalAmount.toString(),
      remainingAmount: debt.remainingAmount.toString(),
      minimumPayment: debt.minimumPayment.toString(),
      interestRate: debt.interestRate?.toString() || '',
      dueDate: debt.dueDate.toString(),
      notes: debt.notes || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this debt?')) return;
    try {
      await deleteDebt(id);
      loadDebts();
    } catch (error) {
      console.error('Error deleting debt:', error);
      alert('Failed to delete debt');
    }
  };

  const resetForm = () => {
    setFormData({
      type: 'credit_card',
      creditor: '',
      totalAmount: '',
      remainingAmount: '',
      minimumPayment: '',
      interestRate: '',
      dueDate: '1',
      notes: '',
    });
    setEditingDebt(null);
    setShowForm(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center">
            <CreditCard className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Debt Management</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">Track your debts and payments</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-xl font-medium hover:shadow-lg transition-all"
        >
          <Plus className="w-5 h-5" />
          <span>{showForm ? 'Cancel' : 'Add Debt'}</span>
        </button>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Debt Type *
                </label>
                <select
                  required
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as Debt['type'] })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="credit_card">Credit Card</option>
                  <option value="loan">Loan</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Creditor *
                </label>
                <input
                  type="text"
                  required
                  value={formData.creditor}
                  onChange={(e) => setFormData({ ...formData, creditor: e.target.value })}
                  placeholder="e.g., Bank Name, Credit Card Company"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Total Amount *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.totalAmount}
                  onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Remaining Amount *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.remainingAmount}
                  onChange={(e) => setFormData({ ...formData, remainingAmount: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Minimum Payment *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.minimumPayment}
                  onChange={(e) => setFormData({ ...formData, minimumPayment: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Interest Rate (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.interestRate}
                  onChange={(e) => setFormData({ ...formData, interestRate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Due Date (Day of Month) *
                </label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  required
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Optional notes..."
              />
            </div>

            <div className="flex space-x-3">
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg font-medium hover:shadow-lg transition-all"
              >
                {editingDebt ? 'Update' : 'Add'} Debt
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {debts.length === 0 ? (
          <div className="p-12 text-center">
            <CreditCard className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">No debts recorded. Add your first debt!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Creditor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Remaining</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Min Payment</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Due Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {debts.map(debt => (
                  <tr key={debt.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {debt.creditor}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400 capitalize">
                      {debt.type.replace('_', ' ')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      ${debt.totalAmount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-red-600 dark:text-red-400">
                      ${debt.remainingAmount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      ${debt.minimumPayment.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      Day {debt.dueDate}
                      {debt.interestRate && ` (${debt.interestRate.toFixed(2)}%)`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(debt)}
                          className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(debt.id)}
                          className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
