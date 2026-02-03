import { useEffect, useState } from 'react';
import { getDebts, addDebt, updateDebt, deleteDebt } from '../../../services/budgetService';
import { Debt } from '../../../types';
import './DebtsTab.css';

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
    } catch (error) {
      console.error('Error saving debt:', error);
      alert('Failed to save debt');
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
    return <div className="loading">Loading debts...</div>;
  }

  return (
    <div className="debts-tab">
      <div className="tab-header">
        <h2>Debt Management</h2>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ Add Debt'}
        </button>
      </div>

      {showForm && (
        <form className="debt-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Debt Type *</label>
              <select
                required
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as Debt['type'] })}
              >
                <option value="credit_card">Credit Card</option>
                <option value="loan">Loan</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="form-group">
              <label>Creditor *</label>
              <input
                type="text"
                required
                value={formData.creditor}
                onChange={(e) => setFormData({ ...formData, creditor: e.target.value })}
                placeholder="e.g., Bank Name, Credit Card Company"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Total Amount *</label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.totalAmount}
                onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Remaining Amount *</label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.remainingAmount}
                onChange={(e) => setFormData({ ...formData, remainingAmount: e.target.value })}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Minimum Payment *</label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.minimumPayment}
                onChange={(e) => setFormData({ ...formData, minimumPayment: e.target.value })}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Interest Rate (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.interestRate}
                  onChange={(e) => setFormData({ ...formData, interestRate: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Due Date (Day of Month) *</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  required
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                />
              </div>
            </div>
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
              {editingDebt ? 'Update' : 'Add'} Debt
            </button>
            <button type="button" className="btn-secondary" onClick={resetForm}>
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="debt-list">
        {debts.length === 0 ? (
          <p className="empty-state">No debts recorded. Add your first debt!</p>
        ) : (
          <div className="debts-grid">
            {debts.map(debt => (
              <div key={debt.id} className="debt-card">
                <div className="debt-header">
                  <h3>{debt.creditor}</h3>
                  <span className="debt-type">{debt.type.replace('_', ' ')}</span>
                </div>
                <div className="debt-details">
                  <div className="debt-detail-item">
                    <span className="label">Total:</span>
                    <span className="value">${debt.totalAmount.toFixed(2)}</span>
                  </div>
                  <div className="debt-detail-item">
                    <span className="label">Remaining:</span>
                    <span className="value warning">${debt.remainingAmount.toFixed(2)}</span>
                  </div>
                  <div className="debt-detail-item">
                    <span className="label">Min Payment:</span>
                    <span className="value">${debt.minimumPayment.toFixed(2)}</span>
                  </div>
                  {debt.interestRate && (
                    <div className="debt-detail-item">
                      <span className="label">Interest:</span>
                      <span className="value">{debt.interestRate.toFixed(2)}%</span>
                    </div>
                  )}
                  <div className="debt-detail-item">
                    <span className="label">Due Date:</span>
                    <span className="value">Day {debt.dueDate.toString()}</span>
                  </div>
                </div>
                {debt.notes && (
                  <div className="debt-notes">
                    <strong>Notes:</strong> {debt.notes}
                  </div>
                )}
                <div className="debt-actions">
                  <button className="btn-edit" onClick={() => handleEdit(debt)}>Edit</button>
                  <button className="btn-delete" onClick={() => handleDelete(debt.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
