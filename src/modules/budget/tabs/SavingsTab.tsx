import { useEffect, useState } from 'react';
import { getSavingsGoals, addSavingsGoal, updateSavingsGoal, deleteSavingsGoal } from '../../../services/budgetService';
import { SavingsGoal } from '../../../types';
import { format } from 'date-fns';
import { Plus, Edit2, Trash2, Target, DollarSign } from 'lucide-react';
import { useCurrency } from '../../../hooks/useCurrency';

export default function SavingsTab() {
  const { formatCurrency } = useCurrency();
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [contributingGoalId, setContributingGoalId] = useState<string | null>(null);
  const [contributionAmount, setContributionAmount] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    targetAmount: '',
    currentAmount: '',
    targetDate: '',
    notes: '',
  });

  useEffect(() => {
    loadGoals();
  }, []);

  const loadGoals = async () => {
    try {
      setLoading(true);
      const data = await getSavingsGoals();
      setGoals(data);
    } catch (error) {
      console.error('Error loading savings goals:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      alert(`Failed to load savings goals: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingGoal) {
        await updateSavingsGoal(editingGoal.id, {
          ...formData,
          targetAmount: parseFloat(formData.targetAmount),
          currentAmount: parseFloat(formData.currentAmount),
          targetDate: formData.targetDate ? new Date(formData.targetDate) : undefined,
          notes: formData.notes || undefined,
        });
      } else {
        await addSavingsGoal({
          name: formData.name,
          targetAmount: parseFloat(formData.targetAmount),
          currentAmount: parseFloat(formData.currentAmount),
          targetDate: formData.targetDate ? new Date(formData.targetDate) : undefined,
          notes: formData.notes || undefined,
        });
      }
      resetForm();
      loadGoals();
    } catch (error: unknown) {
      console.error('Error saving savings goal:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage.includes('authenticated')) {
        alert('Please wait for authentication to complete and try again.');
        // Retry after a delay
        setTimeout(() => {
          handleSubmit(e);
        }, 1000);
        return;
      }
      alert(`Failed to save savings goal: ${errorMessage}\n\nCheck browser console for details.`);
    }
  };

  const handleEdit = (goal: SavingsGoal) => {
    setEditingGoal(goal);
    setFormData({
      name: goal.name,
      targetAmount: goal.targetAmount.toString(),
      currentAmount: goal.currentAmount.toString(),
      targetDate: goal.targetDate ? format(goal.targetDate, 'yyyy-MM-dd') : '',
      notes: goal.notes || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this savings goal?')) return;
    try {
      await deleteSavingsGoal(id);
      loadGoals();
    } catch (error) {
      console.error('Error deleting savings goal:', error);
      alert('Failed to delete savings goal');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      targetAmount: '',
      currentAmount: '',
      targetDate: '',
      notes: '',
    });
    setEditingGoal(null);
    setShowForm(false);
  };

  const calculateProgress = (goal: SavingsGoal) => {
    return Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
  };

  const handleAddContribution = async (goalId: string) => {
    if (!contributionAmount || parseFloat(contributionAmount) <= 0) {
      alert('Please enter a valid contribution amount');
      return;
    }
    try {
      const goal = goals.find(g => g.id === goalId);
      if (!goal) return;
      
      const newAmount = goal.currentAmount + parseFloat(contributionAmount);
      await updateSavingsGoal(goalId, {
        currentAmount: newAmount,
      });
      setContributionAmount('');
      setContributingGoalId(null);
      loadGoals();
    } catch (error) {
      console.error('Error adding contribution:', error);
      alert('Failed to add contribution');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 pb-20 md:pb-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
        <div className="flex items-center space-x-2 md:space-x-3">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg md:rounded-xl flex items-center justify-center">
            <Target className="w-5 h-5 md:w-6 md:h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Savings Goals</h2>
            <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Set and track your savings goals</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center space-x-2 px-3 md:px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg md:rounded-xl text-sm md:text-base font-medium hover:shadow-lg transition-all w-full sm:w-auto justify-center"
        >
          <Plus className="w-4 h-4 md:w-5 md:h-5" />
          <span>{showForm ? 'Cancel' : 'Add Goal'}</span>
        </button>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-xl md:rounded-2xl p-4 md:p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Goal Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Emergency Fund, Vacation, etc."
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Target Amount *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.targetAmount}
                  onChange={(e) => setFormData({ ...formData, targetAmount: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Current Amount *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.currentAmount}
                  onChange={(e) => setFormData({ ...formData, currentAmount: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Target Date
                </label>
                <input
                  type="date"
                  value={formData.targetDate}
                  onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
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
                {editingGoal ? 'Update' : 'Add'} Goal
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
        {goals.length === 0 ? (
          <div className="p-12 text-center">
            <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">No savings goals yet. Create your first goal!</p>
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="md:hidden p-4 space-y-4">
              {goals.map(goal => {
                const progress = calculateProgress(goal);
                const isContributing = contributingGoalId === goal.id;
                return (
                  <div key={goal.id} className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 border border-gray-200 dark:border-gray-600">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{goal.name}</h3>
                        {goal.targetDate && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Target: {format(goal.targetDate, 'MMM dd, yyyy')}
                          </p>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setContributingGoalId(isContributing ? null : goal.id);
                            setContributionAmount('');
                          }}
                          className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                          title="Add contribution"
                        >
                          <DollarSign className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(goal)}
                          className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(goal.id)}
                          className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    {isContributing && (
                      <div className="mb-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600">
                        <div className="flex gap-2">
                          <input
                            type="number"
                            step="0.01"
                            value={contributionAmount}
                            onChange={(e) => setContributionAmount(e.target.value)}
                            placeholder="Amount"
                            className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                          <button
                            onClick={() => handleAddContribution(goal.id)}
                            className="px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg text-sm font-medium"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Current</span>
                        <span className="font-semibold text-gray-900 dark:text-white">${goal.currentAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Target</span>
                        <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(goal.targetAmount)}</span>
                      </div>
                      <div className="mt-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-600 dark:text-gray-400">Progress</span>
                          <span className="text-xs font-medium text-gray-900 dark:text-white">{progress.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                          <div
                            className="bg-gradient-to-r from-purple-500 to-indigo-600 h-3 rounded-full transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Goal Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Current</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Target</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Progress</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Target Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {goals.map(goal => {
                    const progress = calculateProgress(goal);
                    const isContributing = contributingGoalId === goal.id;
                    return (
                      <tr key={goal.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                          {goal.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {formatCurrency(goal.currentAmount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {formatCurrency(goal.targetAmount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <div
                                className="bg-gradient-to-r from-purple-500 to-indigo-600 h-2 rounded-full"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <span className="text-sm text-gray-600 dark:text-gray-400">{progress.toFixed(1)}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                          {goal.targetDate ? format(goal.targetDate, 'MMM dd, yyyy') : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex space-x-2">
                            {isContributing ? (
                              <div className="flex items-center space-x-2">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={contributionAmount}
                                  onChange={(e) => setContributionAmount(e.target.value)}
                                  placeholder="Amount"
                                  className="w-24 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                                <button
                                  onClick={() => handleAddContribution(goal.id)}
                                  className="px-3 py-1 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded text-xs font-medium"
                                >
                                  Add
                                </button>
                                <button
                                  onClick={() => {
                                    setContributingGoalId(null);
                                    setContributionAmount('');
                                  }}
                                  className="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <>
                                <button
                                  onClick={() => {
                                    setContributingGoalId(goal.id);
                                    setContributionAmount('');
                                  }}
                                  className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                                  title="Add contribution"
                                >
                                  <DollarSign className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleEdit(goal)}
                                  className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDelete(goal.id)}
                                  className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
