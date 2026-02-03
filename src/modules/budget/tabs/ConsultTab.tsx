import { useState } from 'react';
import { calculateConsult } from '../../../services/budgetService';
import { ConsultInput, ConsultResult } from '../../../types';
import './ConsultTab.css';

export default function ConsultTab() {
  const [type, setType] = useState<'expense' | 'debt'>('expense');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ConsultResult | null>(null);

  const [formData, setFormData] = useState({
    amount: '',
    // Expense fields
    isRecurring: false,
    recurringFrequency: 'monthly' as ConsultInput['recurringFrequency'],
    // Debt fields
    minimumPayment: '',
    months: '',
    interestRate: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const input: ConsultInput = {
        type,
        amount: parseFloat(formData.amount),
        ...(type === 'expense' ? {
          isRecurring: formData.isRecurring,
          recurringFrequency: formData.isRecurring ? formData.recurringFrequency : undefined,
        } : {
          minimumPayment: formData.minimumPayment ? parseFloat(formData.minimumPayment) : undefined,
          months: formData.months ? parseInt(formData.months) : undefined,
          interestRate: formData.interestRate ? parseFloat(formData.interestRate) : undefined,
        }),
      };
      const consultResult = await calculateConsult(input);
      setResult(consultResult);
    } catch (error) {
      console.error('Error calculating consult:', error);
      alert('Failed to calculate impact');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      amount: '',
      isRecurring: false,
      recurringFrequency: 'monthly',
      minimumPayment: '',
      months: '',
      interestRate: '',
    });
    setResult(null);
  };

  return (
    <div className="consult-tab">
      <div className="consult-header">
        <h2>Financial Impact Analysis</h2>
        <p>Analyze the impact of adding a new expense or debt before committing</p>
      </div>

      <div className="consult-container">
        <form className="consult-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Type *</label>
            <select
              required
              value={type}
              onChange={(e) => {
                setType(e.target.value as 'expense' | 'debt');
                resetForm();
              }}
            >
              <option value="expense">Expense</option>
              <option value="debt">Debt</option>
            </select>
          </div>

          <div className="form-group">
            <label>Amount *</label>
            <input
              type="number"
              step="0.01"
              required
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder="Enter amount"
            />
          </div>

          {type === 'expense' ? (
            <>
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

              {formData.isRecurring && (
                <div className="form-group">
                  <label>Recurring Frequency</label>
                  <select
                    value={formData.recurringFrequency}
                    onChange={(e) => setFormData({ ...formData, recurringFrequency: e.target.value as ConsultInput['recurringFrequency'] })}
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="form-group">
                <label>Minimum Payment</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.minimumPayment}
                  onChange={(e) => setFormData({ ...formData, minimumPayment: e.target.value })}
                  placeholder="Monthly minimum payment"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Number of Months</label>
                  <input
                    type="number"
                    value={formData.months}
                    onChange={(e) => setFormData({ ...formData, months: e.target.value })}
                    placeholder="Loan term in months"
                  />
                </div>

                <div className="form-group">
                  <label>Interest Rate (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.interestRate}
                    onChange={(e) => setFormData({ ...formData, interestRate: e.target.value })}
                    placeholder="Annual interest rate"
                  />
                </div>
              </div>
            </>
          )}

          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Analyzing...' : 'Analyze Impact'}
            </button>
            <button type="button" className="btn-secondary" onClick={resetForm}>
              Reset
            </button>
          </div>
        </form>

        {result && (
          <div className="consult-result">
            <h3>Impact Analysis Results</h3>
            
            <div className={`result-card ${result.canAfford ? 'affordable' : 'unaffordable'}`}>
              <div className="result-header">
                <span className="result-icon">{result.canAfford ? '✅' : '⚠️'}</span>
                <span className="result-status">
                  {result.canAfford ? 'Affordable' : 'Not Affordable'}
                </span>
              </div>
            </div>

            <div className="result-metrics">
              <div className="metric-card">
                <div className="metric-label">Monthly Payment Impact</div>
                <div className="metric-value">${result.monthlyPaymentImpact.toFixed(2)}</div>
                <div className="metric-description">
                  This is how much will be deducted from your monthly budget
                </div>
              </div>

              <div className="metric-card">
                <div className="metric-label">Total Cost Over Time</div>
                <div className="metric-value">${result.totalCostOverTime.toFixed(2)}</div>
                <div className="metric-description">
                  Total amount you'll pay including interest (if applicable)
                </div>
              </div>

              <div className={`metric-card ${result.effectOnAvailableBudget < 0 ? 'negative' : ''}`}>
                <div className="metric-label">Effect on Available Budget</div>
                <div className="metric-value">${result.effectOnAvailableBudget.toFixed(2)}</div>
                <div className="metric-description">
                  Your remaining budget after this commitment
                </div>
              </div>
            </div>

            {result.warnings.length > 0 && (
              <div className="warnings-section">
                <h4>⚠️ Warnings</h4>
                <ul className="warnings-list">
                  {result.warnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}

            {result.canAfford && result.warnings.length === 0 && (
              <div className="success-message">
                ✅ This commitment appears to be within your budget. Proceed with caution and ensure you've considered all factors.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
