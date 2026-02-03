import { useEffect, useState } from 'react';
import { getSavingsGoals, addSavingsGoal, updateSavingsGoal, deleteSavingsGoal } from '../../../services/budgetService';
import { SavingsGoal } from '../../../types';
import { format } from 'date-fns';
import './SavingsTab.css';

export default function SavingsTab() {
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);

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
      alert('Failed to load savings goals');
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
    } catch (error) {
      console.error('Error saving savings goal:', error);
      alert('Failed to save savings goal');
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

  if (loading) {
    return <div className="loading">Loading savings goals...</div>;
  }

  return (
    <div className="savings-tab">
      <div className="tab-header">
        <h2>Savings Goals</h2>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ Add Goal'}
        </button>
      </div>

      {showForm && (
        <form className="savings-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Goal Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Emergency Fund, Vacation, etc."
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Target Amount *</label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.targetAmount}
                onChange={(e) => setFormData({ ...formData, targetAmount: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Current Amount *</label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.currentAmount}
                onChange={(e) => setFormData({ ...formData, currentAmount: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Target Date</label>
            <input
              type="date"
              value={formData.targetDate}
              onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
            />
          </div>

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
              {editingGoal ? 'Update' : 'Add'} Goal
            </button>
            <button type="button" className="btn-secondary" onClick={resetForm}>
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="goals-list">
        {goals.length === 0 ? (
          <p className="empty-state">No savings goals yet. Create your first goal!</p>
        ) : (
          <div className="goals-grid">
            {goals.map(goal => {
              const progress = calculateProgress(goal);
              const remaining = goal.targetAmount - goal.currentAmount;
              return (
                <div key={goal.id} className="goal-card">
                  <div className="goal-header">
                    <h3>{goal.name}</h3>
                    {goal.targetDate && (
                      <span className="goal-date">
                        Target: {format(goal.targetDate, 'MMM dd, yyyy')}
                      </span>
                    )}
                  </div>
                  <div className="goal-amounts">
                    <div className="amount-current">
                      <span className="label">Current</span>
                      <span className="value">${goal.currentAmount.toFixed(2)}</span>
                    </div>
                    <div className="amount-target">
                      <span className="label">Target</span>
                      <span className="value">${goal.targetAmount.toFixed(2)}</span>
                    </div>
                    <div className="amount-remaining">
                      <span className="label">Remaining</span>
                      <span className="value">${remaining.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="progress-bar-container">
                    <div className="progress-bar" style={{ width: `${progress}%` }}>
                      <span className="progress-text">{progress.toFixed(1)}%</span>
                    </div>
                  </div>
                  {goal.notes && (
                    <div className="goal-notes">
                      <strong>Notes:</strong> {goal.notes}
                    </div>
                  )}
                  <div className="goal-actions">
                    <button className="btn-edit" onClick={() => handleEdit(goal)}>Edit</button>
                    <button className="btn-delete" onClick={() => handleDelete(goal.id)}>Delete</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
