import { useEffect, useState } from 'react';
import { getIncomes, addIncome, updateIncome, deleteIncome } from '../../../services/budgetService';
import { Income } from '../../../types';
import { format } from 'date-fns';
import './IncomeTab.css';

export default function IncomeTab() {
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);

  const [formData, setFormData] = useState({
    amount: '',
    source: '',
    frequency: 'monthly' as Income['frequency'],
    date: format(new Date(), 'yyyy-MM-dd'),
    notes: '',
  });

  useEffect(() => {
    loadIncomes();
  }, []);

  const loadIncomes = async () => {
    try {
      setLoading(true);
      const data = await getIncomes();
      setIncomes(data);
    } catch (error) {
      console.error('Error loading incomes:', error);
      alert('Failed to load incomes');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingIncome) {
        await updateIncome(editingIncome.id, {
          ...formData,
          amount: parseFloat(formData.amount),
          date: new Date(formData.date),
        });
      } else {
        await addIncome({
          amount: parseFloat(formData.amount),
          source: formData.source,
          frequency: formData.frequency,
          date: new Date(formData.date),
          notes: formData.notes || undefined,
        });
      }
      resetForm();
      loadIncomes();
    } catch (error) {
      console.error('Error saving income:', error);
      alert('Failed to save income');
    }
  };

  const handleEdit = (income: Income) => {
    setEditingIncome(income);
    setFormData({
      amount: income.amount.toString(),
      source: income.source,
      frequency: income.frequency,
      date: format(income.date, 'yyyy-MM-dd'),
      notes: income.notes || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this income?')) return;
    try {
      await deleteIncome(id);
      loadIncomes();
    } catch (error) {
      console.error('Error deleting income:', error);
      alert('Failed to delete income');
    }
  };

  const resetForm = () => {
    setFormData({
      amount: '',
      source: '',
      frequency: 'monthly',
      date: format(new Date(), 'yyyy-MM-dd'),
      notes: '',
    });
    setEditingIncome(null);
    setShowForm(false);
  };

  if (loading) {
    return <div className="loading">Loading incomes...</div>;
  }

  return (
    <div className="income-tab">
      <div className="tab-header">
        <h2>Income Management</h2>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ Add Income'}
        </button>
      </div>

      {showForm && (
        <form className="income-form" onSubmit={handleSubmit}>
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
            <label>Source *</label>
            <input
              type="text"
              required
              value={formData.source}
              onChange={(e) => setFormData({ ...formData, source: e.target.value })}
              placeholder="e.g., Salary, Freelance, etc."
            />
          </div>

          <div className="form-group">
            <label>Frequency *</label>
            <select
              required
              value={formData.frequency}
              onChange={(e) => setFormData({ ...formData, frequency: e.target.value as Income['frequency'] })}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="biweekly">Biweekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>

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
            <label>Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-primary">
              {editingIncome ? 'Update' : 'Add'} Income
            </button>
            <button type="button" className="btn-secondary" onClick={resetForm}>
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="income-list">
        {incomes.length === 0 ? (
          <p className="empty-state">No income records yet. Add your first income!</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Source</th>
                <th>Amount</th>
                <th>Frequency</th>
                <th>Notes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {incomes.map(income => (
                <tr key={income.id}>
                  <td>{format(income.date, 'MMM dd, yyyy')}</td>
                  <td>{income.source}</td>
                  <td className="amount">${income.amount.toFixed(2)}</td>
                  <td>{income.frequency}</td>
                  <td>{income.notes || '-'}</td>
                  <td className="actions">
                    <button className="btn-edit" onClick={() => handleEdit(income)}>Edit</button>
                    <button className="btn-delete" onClick={() => handleDelete(income.id)}>Delete</button>
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
