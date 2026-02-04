import { useState } from 'react';
import { calculateConsult } from '../services/budgetService';
import { ConsultInput, ConsultResult } from '../types';
import { HelpCircle, AlertTriangle, CheckCircle2, TrendingDown, DollarSign, Calendar } from 'lucide-react';

interface ConsultFormProps {
  compact?: boolean;
}

export default function ConsultForm({ compact = false }: ConsultFormProps) {
  const [type, setType] = useState<'expense' | 'debt' | 'subscription'>('expense');
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
    downPayment: '',
    // Subscription fields
    billingFrequency: 'monthly' as 'monthly' | 'yearly',
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
        } : type === 'debt' ? {
          minimumPayment: formData.minimumPayment ? parseFloat(formData.minimumPayment) : undefined,
          months: formData.months ? parseInt(formData.months) : undefined,
          interestRate: formData.interestRate ? parseFloat(formData.interestRate) : undefined,
          downPayment: formData.downPayment ? parseFloat(formData.downPayment) : undefined,
        } : {
          billingFrequency: formData.billingFrequency,
        }),
      };
      const consultResult = await calculateConsult(input);
      setResult(consultResult);
    } catch (error: any) {
      console.error('Error calculating consult:', error);
      const errorMessage = error?.message || 'Unknown error';
      alert(`Failed to calculate impact: ${errorMessage}`);
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
      downPayment: '',
      billingFrequency: 'monthly',
    });
    setResult(null);
  };

  if (compact) {
    return (
      <div className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Type *
              </label>
              <select
                required
                value={type}
                onChange={(e) => {
                  setType(e.target.value as 'expense' | 'debt' | 'subscription');
                  resetForm();
                }}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="expense">Expense</option>
                <option value="debt">Debt</option>
                <option value="subscription">Subscription</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Amount *
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="Enter amount"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>

          {type === 'expense' ? (
            <>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isRecurring-compact"
                  checked={formData.isRecurring}
                  onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
                  className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                />
                <label htmlFor="isRecurring-compact" className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  Recurring Expense
                </label>
              </div>

              {formData.isRecurring && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Frequency
                  </label>
                  <select
                    value={formData.recurringFrequency}
                    onChange={(e) => setFormData({ ...formData, recurringFrequency: e.target.value as ConsultInput['recurringFrequency'] })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              )}
            </>
          ) : type === 'debt' ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Min Payment
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.minimumPayment}
                  onChange={(e) => setFormData({ ...formData, minimumPayment: e.target.value })}
                  placeholder="Min payment"
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Down Payment
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.downPayment}
                  onChange={(e) => setFormData({ ...formData, downPayment: e.target.value })}
                  placeholder="Down payment"
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Months
                </label>
                <input
                  type="number"
                  value={formData.months}
                  onChange={(e) => setFormData({ ...formData, months: e.target.value })}
                  placeholder="Term"
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Interest (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.interestRate}
                  onChange={(e) => setFormData({ ...formData, interestRate: e.target.value })}
                  placeholder="Rate"
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Billing Frequency
              </label>
              <select
                value={formData.billingFrequency}
                onChange={(e) => setFormData({ ...formData, billingFrequency: e.target.value as 'monthly' | 'yearly' })}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          )}

          <div className="flex space-x-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Analyzing...' : 'Analyze'}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Reset
            </button>
          </div>
        </form>

        {result && (
          <div className="space-y-3">
            {/* Status */}
            <div className={`rounded-xl p-3 ${
              result.canAfford 
                ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
                : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
            }`}>
              <div className="flex items-center space-x-2">
                {result.canAfford ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                )}
                <span className={`text-sm font-semibold ${
                  result.canAfford 
                    ? 'text-green-700 dark:text-green-300' 
                    : 'text-red-700 dark:text-red-300'
                }`}>
                  {result.canAfford ? 'Affordable' : 'Not Affordable'}
                </span>
              </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2 border border-gray-200 dark:border-gray-600">
                <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Monthly</div>
                <div className="text-sm font-bold text-gray-900 dark:text-white">
                  ${result.monthlyPaymentImpact.toFixed(0)}
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2 border border-gray-200 dark:border-gray-600">
                <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Total</div>
                <div className="text-sm font-bold text-gray-900 dark:text-white">
                  ${result.totalCostOverTime.toFixed(0)}
                </div>
              </div>
              <div className={`rounded-lg p-2 border ${
                result.effectOnAvailableBudget < 0
                  ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                  : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600'
              }`}>
                <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Remaining</div>
                <div className={`text-sm font-bold ${
                  result.effectOnAvailableBudget < 0
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-gray-900 dark:text-white'
                }`}>
                  ${result.effectOnAvailableBudget.toFixed(0)}
                </div>
              </div>
            </div>

            {/* Warnings */}
            {result.warnings.length > 0 && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                  <h4 className="text-xs font-semibold text-yellow-800 dark:text-yellow-300">Warnings</h4>
                </div>
                <ul className="space-y-1">
                  {result.warnings.map((warning, index) => (
                    <li key={index} className="text-xs text-yellow-700 dark:text-yellow-300">
                      • {warning}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Full form (for ConsultTab)
  return (
    <div className="space-y-6 pb-20 md:pb-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center">
            <HelpCircle className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Financial Impact Analysis</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">Analyze the impact of adding a new expense or debt before committing</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form Section */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Type *
              </label>
              <select
                required
                value={type}
                onChange={(e) => {
                  setType(e.target.value as 'expense' | 'debt' | 'subscription');
                  resetForm();
                }}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="expense">Expense</option>
                <option value="debt">Debt</option>
                <option value="subscription">Subscription</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Amount *
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="Enter amount"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {type === 'expense' ? (
              <>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isRecurring"
                    checked={formData.isRecurring}
                    onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
                    className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  />
                  <label htmlFor="isRecurring" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Recurring Expense
                  </label>
                </div>

                {formData.isRecurring && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Recurring Frequency
                    </label>
                    <select
                      value={formData.recurringFrequency}
                      onChange={(e) => setFormData({ ...formData, recurringFrequency: e.target.value as ConsultInput['recurringFrequency'] })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>
                )}
              </>
            ) : type === 'debt' ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Minimum Payment
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.minimumPayment}
                      onChange={(e) => setFormData({ ...formData, minimumPayment: e.target.value })}
                      placeholder="Monthly minimum payment"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Down Payment
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.downPayment}
                      onChange={(e) => setFormData({ ...formData, downPayment: e.target.value })}
                      placeholder="Initial down payment"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Number of Months
                    </label>
                    <input
                      type="number"
                      value={formData.months}
                      onChange={(e) => setFormData({ ...formData, months: e.target.value })}
                      placeholder="Loan term in months"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                      placeholder="Annual interest rate"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Billing Frequency
                </label>
                <select
                  value={formData.billingFrequency}
                  onChange={(e) => setFormData({ ...formData, billingFrequency: e.target.value as 'monthly' | 'yearly' })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
            )}

            <div className="flex space-x-3 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Analyzing...' : 'Analyze Impact'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Reset
              </button>
            </div>
          </form>
        </div>

        {/* Results Section */}
        {result && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Impact Analysis Results</h3>
            
            {/* Status Card */}
            <div className={`rounded-xl p-4 mb-6 ${
              result.canAfford 
                ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
                : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
            }`}>
              <div className="flex items-center space-x-3">
                {result.canAfford ? (
                  <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                )}
                <span className={`text-lg font-semibold ${
                  result.canAfford 
                    ? 'text-green-700 dark:text-green-300' 
                    : 'text-red-700 dark:text-red-300'
                }`}>
                  {result.canAfford ? 'Affordable' : 'Not Affordable'}
                </span>
              </div>
            </div>

            {/* Metrics */}
            <div className="space-y-4 mb-6">
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 border border-gray-200 dark:border-gray-600">
                <div className="flex items-center space-x-2 mb-2">
                  <DollarSign className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Monthly Payment Impact</div>
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                  ${result.monthlyPaymentImpact.toFixed(2)}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  This is how much will be deducted from your monthly budget
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 border border-gray-200 dark:border-gray-600">
                <div className="flex items-center space-x-2 mb-2">
                  <TrendingDown className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Cost Over Time</div>
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                  ${result.totalCostOverTime.toFixed(2)}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Total amount you'll pay including interest (if applicable)
                </div>
              </div>

              <div className={`rounded-xl p-4 border ${
                result.effectOnAvailableBudget < 0
                  ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                  : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600'
              }`}>
                <div className="flex items-center space-x-2 mb-2">
                  <Calendar className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Effect on Available Budget</div>
                </div>
                <div className={`text-2xl font-bold mb-1 ${
                  result.effectOnAvailableBudget < 0
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-gray-900 dark:text-white'
                }`}>
                  ${result.effectOnAvailableBudget.toFixed(2)}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Your remaining budget after this commitment
                </div>
              </div>
            </div>

            {/* Warnings */}
            {result.warnings.length > 0 && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                  <h4 className="font-semibold text-yellow-800 dark:text-yellow-300">Warnings</h4>
                </div>
                <ul className="space-y-2">
                  {result.warnings.map((warning, index) => (
                    <li key={index} className="text-sm text-yellow-700 dark:text-yellow-300 flex items-start">
                      <span className="mr-2">•</span>
                      <span>{warning}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Success Message */}
            {result.canAfford && result.warnings.length === 0 && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <p className="text-sm text-green-700 dark:text-green-300">
                    This commitment appears to be within your budget. Proceed with caution and ensure you've considered all factors.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
