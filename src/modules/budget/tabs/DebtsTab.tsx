import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Debt, DebtFrequency } from '../../../types';
import { Plus, Edit2, Trash2, CreditCard, CheckCircle2 } from 'lucide-react';
import { useCurrency } from '../../../hooks/useCurrency';
import { useBudgetStore } from '../../../stores/budgetStore';
import ConfirmModal from '../../../components/ConfirmModal';
import {
  getCutoffKey,
  getDebtCutoffs,
  isCutoffPaidThisMonth,
  type CutoffId,
} from '../../../utils/debtCutoff';

const FREQUENCY_LABELS: Record<DebtFrequency, string> = {
  one_time: 'One-time',
  weekly: 'Weekly',
  monthly: 'Monthly',
  bi_monthly: 'Bi-Monthly (2×/month)',
};

const FREQUENCY_BADGE: Record<DebtFrequency, string> = {
  one_time: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  weekly: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
  monthly: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
  bi_monthly: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300',
};

type LoanTermUnit = 'months' | 'years' | 'weeks';

const TERM_UNIT_LABELS: Record<LoanTermUnit, string> = {
  months: 'Months',
  years: 'Years',
  weeks: 'Weeks',
};

/**
 * Converts a loan term (value + unit) into the total number of payment schedules
 * based on the selected payment frequency.
 * Examples:
 *   12 months × monthly   = 12 payments
 *   12 months × bi_monthly = 24 payments
 *    1 year   × monthly   = 12 payments
 *   52 weeks  × weekly    = 52 payments
 */
const computeSchedules = (
  termValue: string,
  termUnit: LoanTermUnit,
  frequency: DebtFrequency,
): number => {
  const n = parseFloat(termValue);
  if (!n || n <= 0 || frequency === 'one_time') return 0;
  const inMonths = termUnit === 'years' ? n * 12 : termUnit === 'weeks' ? n / 4.33 : n;
  const inWeeks  = termUnit === 'weeks' ? n : termUnit === 'years' ? n * 52 : n * 4.33;
  switch (frequency) {
    case 'monthly':    return Math.round(inMonths);
    case 'bi_monthly': return Math.round(inMonths * 2);
    case 'weekly':     return Math.round(inWeeks);
    default:           return 0;
  }
};

const defaultForm = () => ({
  type: 'credit_card' as Debt['type'],
  creditor: '',
  totalAmount: '',
  remainingAmount: '',
  minimumPayment: '',
  interestRate: '',
  frequency: 'monthly' as DebtFrequency,
  loanTermValue: '',
  loanTermUnit: 'months' as LoanTermUnit,
  totalSchedules: '',
  paidSchedules: '0',
  dueDate: '1',
  secondDueDate: '15',
  oneTimeDueDate: '',
  downPayment: '',
  isPaid: false,
  totalAmountDue: '',
  notes: '',
});

/** Format day of month with ordinal suffix */
const ordinal = (n: number): string => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
};

/** Render the due date/schedule summary string for a debt */
const dueDateLabel = (debt: Debt): string => {
  const freq = debt.frequency ?? 'monthly';
  if (freq === 'one_time') {
    if (debt.oneTimeDueDate) {
      return new Date(debt.oneTimeDueDate + 'T00:00:00').toLocaleDateString(undefined, {
        month: 'short', day: 'numeric', year: 'numeric',
      });
    }
    return 'One-time';
  }
  if (freq === 'bi_monthly' && debt.dueDate && debt.secondDueDate) {
    return `${ordinal(debt.dueDate)} & ${ordinal(debt.secondDueDate)} of month`;
  }
  if (debt.dueDate) return `${ordinal(debt.dueDate)} of month`;
  return '—';
};

/** Progress bar + text for schedule tracking */
function ScheduleProgress({ debt }: { debt: Debt }) {
  const freq = debt.frequency ?? 'monthly';
  if (freq === 'one_time') {
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
        debt.isPaid
          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
          : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
      }`}>
        {debt.isPaid ? 'Paid' : 'Due'}
      </span>
    );
  }

  const total = debt.totalSchedules ?? 0;
  const paid = Math.min(debt.paidSchedules ?? 0, total);
  const remaining = Math.max(0, total - paid);
  const pct = total > 0 ? (paid / total) * 100 : 0;

  return (
    <div className="space-y-1 w-full">
      <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
        <span><span className="font-semibold text-green-600 dark:text-green-400">{paid} paid</span> · {remaining} left · {total} total</span>
        <span className="font-medium">{Math.round(pct)}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
        <div
          className="h-full rounded-full bg-green-500 transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

type DebtFilter = 'unpaid' | 'paid' | 'all';

function isDebtPaid(debt: Debt): boolean {
  const freq = debt.frequency ?? 'monthly';
  if (freq === 'one_time') return debt.isPaid === true;
  const total = debt.totalSchedules ?? 0;
  const paid = debt.paidSchedules ?? 0;
  return total > 0 && paid >= total;
}

export default function DebtsTab() {
  const { formatCurrency } = useCurrency();
  const {
    debts,
    categories,
    loading,
    loadDebts,
    loadCategories,
    loadExpenses,
    addDebt,
    addExpense,
    updateDebt,
    deleteDebt,
    addCategory,
  } = useBudgetStore();
  const [showForm, setShowForm] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [formData, setFormData] = useState(defaultForm());
  const [markingPayment, setMarkingPayment] = useState<string | null>(null);
  const [debtFilter, setDebtFilter] = useState<DebtFilter>('unpaid');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmMarkAsPaid, setConfirmMarkAsPaid] = useState<Debt | null>(null);
  const [confirmMarkPayment, setConfirmMarkPayment] = useState<Debt | null>(null);
  const [biMonthlyCutoffDebt, setBiMonthlyCutoffDebt] = useState<Debt | null>(null);

  useEffect(() => {
    loadDebts();
    loadCategories();
  }, [loadDebts, loadCategories]);

  const filteredDebts = useMemo(() => {
    if (debtFilter === 'all') return debts;
    return debts.filter(d => {
      const paid = isDebtPaid(d);
      return debtFilter === 'unpaid' ? !paid : paid;
    });
  }, [debts, debtFilter]);

  const freq = formData.frequency as DebtFrequency;
  const isOneTime = freq === 'one_time';
  const isBiMonthly = freq === 'bi_monthly';

  // Auto-compute totalSchedules from the loan term fields whenever they change.
  const computedSchedules = useMemo(
    () => computeSchedules(formData.loanTermValue, formData.loanTermUnit, freq),
    [formData.loanTermValue, formData.loanTermUnit, freq],
  );

  // When loan term changes, push the computed value into totalSchedules.
  const handleLoanTermChange = (field: 'loanTermValue' | 'loanTermUnit', value: string) => {
    const next = { ...formData, [field]: value };
    const computed = computeSchedules(
      next.loanTermValue,
      next.loanTermUnit as LoanTermUnit,
      freq,
    );
    setFormData({ ...next, totalSchedules: computed > 0 ? computed.toString() : next.totalSchedules });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const remaining = parseFloat(formData.remainingAmount);
      const totalSchedulesVal = isOneTime ? 1 : (formData.totalSchedules ? parseInt(formData.totalSchedules) : 0);
      const base = {
        type: formData.type,
        creditor: formData.creditor,
        totalAmount: parseFloat(formData.totalAmount),
        remainingAmount: formData.isPaid ? 0 : remaining,
        minimumPayment: parseFloat(formData.minimumPayment),
        frequency: freq,
        paidSchedules: formData.isPaid ? totalSchedulesVal : (parseInt(formData.paidSchedules) || 0),
        interestRate: formData.interestRate ? parseFloat(formData.interestRate) : undefined,
        downPayment: formData.downPayment ? parseFloat(formData.downPayment) : undefined,
        isPaid: formData.isPaid,
        totalAmountDue: formData.totalAmountDue ? parseFloat(formData.totalAmountDue) : undefined,
        notes: formData.notes || undefined,
        totalSchedules: isOneTime ? 1 : (formData.totalSchedules ? parseInt(formData.totalSchedules) : undefined),
        dueDate: isOneTime ? undefined : parseInt(formData.dueDate),
        secondDueDate: isBiMonthly ? parseInt(formData.secondDueDate) : undefined,
        oneTimeDueDate: isOneTime ? formData.oneTimeDueDate : undefined,
      };

      if (formData.isPaid && remaining > 0) {
        const debtForExpense: Pick<Debt, 'creditor'> = { creditor: formData.creditor };
        const amountPaid = editingDebt ? editingDebt.remainingAmount : remaining;
        await recordDebtPaymentExpense(debtForExpense as Debt, amountPaid);
      }

      if (editingDebt) {
        await updateDebt(editingDebt.id, base);
      } else {
        await addDebt(base);
      }
      resetForm();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      if (msg.includes('authenticated')) {
        alert('Please wait for authentication to complete and try again.');
        return;
      }
      alert(`Failed to save debt: ${msg}`);
    }
  };

  const handleEdit = (debt: Debt) => {
    setEditingDebt(debt);
    const debtFreq = (debt.frequency ?? 'monthly') as DebtFrequency;
    setFormData({
      type: debt.type,
      creditor: debt.creditor,
      totalAmount: debt.totalAmount.toString(),
      remainingAmount: debt.remainingAmount.toString(),
      minimumPayment: debt.minimumPayment.toString(),
      interestRate: debt.interestRate?.toString() || '',
      frequency: debtFreq,
      loanTermValue: '',  // Not stored — user re-enters if needed
      loanTermUnit: 'months',
      totalSchedules: debt.totalSchedules?.toString() || '',
      paidSchedules: (debt.paidSchedules ?? 0).toString(),
      dueDate: debt.dueDate?.toString() || '1',
      secondDueDate: debt.secondDueDate?.toString() || '15',
      oneTimeDueDate: debt.oneTimeDueDate || '',
      downPayment: debt.downPayment?.toString() || '',
      isPaid: debt.isPaid || false,
      totalAmountDue: debt.totalAmountDue?.toString() || '',
      notes: debt.notes || '',
    });
    setShowForm(true);
  };

  const getDebtPaymentCategoryId = async (): Promise<string> => {
    let cat = categories.find(c => c.name === 'Debt Payment');
    if (cat) return cat.id;
    await addCategory({ name: 'Debt Payment', isCustom: false });
    await loadCategories(true);
    cat = useBudgetStore.getState().categories.find(c => c.name === 'Debt Payment');
    if (!cat) throw new Error('Could not create Debt Payment category');
    return cat.id;
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDebt(id);
      setConfirmDelete(null);
    } catch (error) {
      alert(`Failed to delete debt: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const recordDebtPaymentExpense = async (debt: Debt, amount: number, cutoffLabel?: string) => {
    const categoryId = await getDebtPaymentCategoryId();
    const desc = cutoffLabel
      ? `Debt: ${debt.creditor} (${cutoffLabel})`
      : `Debt: ${debt.creditor}`;
    await addExpense({
      amount,
      categoryId,
      description: desc,
      date: new Date(),
      isRecurring: false,
    });
    await loadExpenses(undefined, undefined, true);
  };

  const handleMarkPayment = async (debt: Debt, cutoff?: CutoffId) => {
    const total = debt.totalSchedules ?? 0;
    const paid = debt.paidSchedules ?? 0;
    if (total > 0 && paid >= total) return;
    const termPayment = getTermPaymentAmount(debt);
    const debtFreq = (debt.frequency ?? 'monthly') as DebtFrequency;
    const cutoffs = getDebtCutoffs(debt);
    const resolvedCutoff: CutoffId =
      cutoff ?? (cutoffs.length === 1 ? cutoffs[0] : '1');
    setMarkingPayment(debt.id);
    setBiMonthlyCutoffDebt(null);
    try {
      await recordDebtPaymentExpense(
        debt,
        termPayment,
        debtFreq === 'bi_monthly' ? `Cutoff ${resolvedCutoff} (${resolvedCutoff === '1' ? '1-15' : '16-30'})` : undefined
      );
      const now = new Date();
      const key = getCutoffKey(now.getFullYear(), now.getMonth(), resolvedCutoff);
      const newKeys = [...(debt.paidCutoffKeys ?? []), key];
      const newPaid = paid + 1;
      const newRemaining = Math.max(0, debt.remainingAmount - termPayment);
      await updateDebt(debt.id, {
        paidSchedules: newPaid,
        remainingAmount: newRemaining,
        isPaid: total > 0 && newPaid >= total ? true : debt.isPaid,
        paidCutoffKeys: newKeys,
      });
    } catch (error) {
      alert(`Failed to mark payment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setMarkingPayment(null);
    }
  };

  const handleMarkAsPaid = async (debt: Debt) => {
    setMarkingPayment(debt.id);
    setConfirmMarkAsPaid(null);
    try {
      await recordDebtPaymentExpense(debt, debt.minimumPayment);
      await updateDebt(debt.id, {
        isPaid: true,
        remainingAmount: 0,
      });
    } catch (error) {
      alert(`Failed to mark as paid: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setMarkingPayment(null);
    }
  };

  /** Amount to deduct per scheduled payment. Uses totalAmount/totalSchedules for equal instalments when available. */
  const getTermPaymentAmount = (debt: Debt): number => {
    const total = debt.totalSchedules ?? 0;
    if (total > 0 && debt.totalAmount > 0) {
      return Math.round((debt.totalAmount / total) * 100) / 100;
    }
    return debt.minimumPayment;
  };

  const openMarkPayment = (debt: Debt) => {
    const cutoffs = getDebtCutoffs(debt);
    if (cutoffs.length > 1) {
      setBiMonthlyCutoffDebt(debt);
    } else {
      setConfirmMarkPayment(debt);
    }
  };

  const resetForm = () => {
    setFormData(defaultForm());
    setEditingDebt(null);
    setShowForm(false);
  };

  const inputCls = 'w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent';
  const labelCls = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2';

  if (loading.debts) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600" />
      </div>
    );
  }

  return (
    <div className="w-full space-y-4 md:space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
        <div className="flex items-center space-x-2 md:space-x-3">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg md:rounded-xl flex items-center justify-center">
            <CreditCard className="w-5 h-5 md:w-6 md:h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Debt Management</h2>
            <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Track your debts and payment schedules</p>
          </div>
        </div>
        <button
          onClick={() => { if (showForm && !editingDebt) { resetForm(); } else { setShowForm(!showForm); setEditingDebt(null); } }}
          className="flex items-center space-x-2 px-3 md:px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg md:rounded-xl text-sm md:text-base font-medium hover:shadow-lg transition-all w-full sm:w-auto justify-center"
        >
          <Plus className="w-4 h-4 md:w-5 md:h-5" />
          <span>{showForm ? 'Cancel' : 'Add Debt'}</span>
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="w-full bg-white dark:bg-gray-800 rounded-xl md:rounded-2xl p-4 md:p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
            {editingDebt ? 'Edit Debt' : 'New Debt'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Row 1: Type, Creditor */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Debt Type *</label>
                <select required value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value as Debt['type'] })} className={inputCls}>
                  <option value="credit_card">Credit Card</option>
                  <option value="loan">Loan</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Creditor *</label>
                <input type="text" required value={formData.creditor} onChange={e => setFormData({ ...formData, creditor: e.target.value })} placeholder="e.g., Bank Name" className={inputCls} />
              </div>
            </div>

            {/* Row 2: Payment Frequency */}
            <div>
              <label className={labelCls}>Payment Frequency *</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {(Object.keys(FREQUENCY_LABELS) as DebtFrequency[]).map(f => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFormData({ ...formData, frequency: f })}
                    className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      formData.frequency === f
                        ? 'bg-purple-600 border-purple-600 text-white'
                        : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-purple-400'
                    }`}
                  >
                    {FREQUENCY_LABELS[f]}
                  </button>
                ))}
              </div>
            </div>

            {/* Row 3: Amounts */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={labelCls}>Total Amount *</label>
                <input type="number" step="0.01" required value={formData.totalAmount} onChange={e => setFormData({ ...formData, totalAmount: e.target.value })} placeholder="0.00" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Remaining Amount *</label>
                <input type="number" step="0.01" required value={formData.remainingAmount} onChange={e => setFormData({ ...formData, remainingAmount: e.target.value })} placeholder="0.00" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>{isOneTime ? 'Payment Amount *' : 'Payment per Schedule *'}</label>
                <input type="number" step="0.01" required value={formData.minimumPayment} onChange={e => setFormData({ ...formData, minimumPayment: e.target.value })} placeholder="0.00" className={inputCls} />
              </div>
            </div>

            {/* Row 4: Schedule tracking (hidden for one-time) */}
            {!isOneTime && (
              <div className="space-y-3 bg-purple-50 dark:bg-purple-900/10 rounded-lg p-3 border border-purple-100 dark:border-purple-800/30">
                <p className="text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wide">Payment Schedule</p>

                {/* Loan term → auto-computes total schedules */}
                <div>
                  <label className={labelCls}>
                    Loan Term <span className="font-normal text-gray-500">(optional — auto-fills total payments)</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="1"
                      value={formData.loanTermValue}
                      onChange={e => handleLoanTermChange('loanTermValue', e.target.value)}
                      placeholder="e.g., 12"
                      className={`${inputCls} flex-1`}
                    />
                    <select
                      value={formData.loanTermUnit}
                      onChange={e => handleLoanTermChange('loanTermUnit', e.target.value)}
                      className={`${inputCls} w-32`}
                    >
                      {(Object.keys(TERM_UNIT_LABELS) as LoanTermUnit[]).map(u => (
                        <option key={u} value={u}>{TERM_UNIT_LABELS[u]}</option>
                      ))}
                    </select>
                  </div>
                  {computedSchedules > 0 && (
                    <p className="mt-1 text-xs text-purple-600 dark:text-purple-400 font-medium">
                      = <strong>{computedSchedules} payments</strong> ({FREQUENCY_LABELS[freq]})
                    </p>
                  )}
                </div>

                {/* Total schedules (auto-filled, but user can override) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>
                      Total Payments <span className="font-normal text-gray-500">(auto-filled or enter manually)</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.totalSchedules}
                      onChange={e => setFormData({ ...formData, totalSchedules: e.target.value })}
                      placeholder="e.g., 24"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Payments Already Made</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.paidSchedules}
                      onChange={e => setFormData({ ...formData, paidSchedules: e.target.value })}
                      placeholder="0"
                      className={inputCls}
                    />
                  </div>
                </div>

                {/* Live summary */}
                {formData.totalSchedules && (
                  <div className="flex gap-4 text-xs text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800/50 rounded-md px-3 py-2">
                    <span>Paid: <strong className="text-green-600 dark:text-green-400">{formData.paidSchedules || 0}</strong></span>
                    <span>·</span>
                    <span>Remaining: <strong className="text-orange-600 dark:text-orange-400">{Math.max(0, parseInt(formData.totalSchedules || '0') - parseInt(formData.paidSchedules || '0'))}</strong></span>
                    <span>·</span>
                    <span>Total: <strong className="text-gray-800 dark:text-gray-200">{formData.totalSchedules}</strong></span>
                  </div>
                )}
              </div>
            )}

            {/* Row 5: Due Date — conditional on frequency */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {isOneTime ? (
                <div className="md:col-span-2">
                  <label className={labelCls}>Due Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.oneTimeDueDate}
                    onChange={e => setFormData({ ...formData, oneTimeDueDate: e.target.value })}
                    className={inputCls}
                  />
                </div>
              ) : (
                <>
                  <div>
                    <label className={labelCls}>{isBiMonthly ? 'First Due Day (of month) *' : 'Due Day (of month) *'}</label>
                    <input type="number" min="1" max="31" required value={formData.dueDate} onChange={e => setFormData({ ...formData, dueDate: e.target.value })} className={inputCls} />
                  </div>
                  {isBiMonthly && (
                    <div>
                      <label className={labelCls}>Second Due Day (of month) *</label>
                      <input type="number" min="1" max="31" required value={formData.secondDueDate} onChange={e => setFormData({ ...formData, secondDueDate: e.target.value })} className={inputCls} />
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Row 6: Optional fields */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={labelCls}>Interest Rate (%)</label>
                <input type="number" step="0.01" value={formData.interestRate} onChange={e => setFormData({ ...formData, interestRate: e.target.value })} placeholder="0.00" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Down Payment</label>
                <input type="number" step="0.01" value={formData.downPayment} onChange={e => setFormData({ ...formData, downPayment: e.target.value })} placeholder="0.00" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Total Amount Due (incl. interest)</label>
                <input type="number" step="0.01" value={formData.totalAmountDue} onChange={e => setFormData({ ...formData, totalAmountDue: e.target.value })} placeholder="0.00" className={inputCls} />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <input type="checkbox" id="isPaid" checked={formData.isPaid} onChange={e => setFormData({ ...formData, isPaid: e.target.checked })} className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500" />
              <label htmlFor="isPaid" className="text-sm font-medium text-gray-700 dark:text-gray-300">Mark as Fully Paid</label>
            </div>

            <div>
              <label className={labelCls}>Notes</label>
              <textarea value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} rows={2} className={inputCls} placeholder="Optional notes..." />
            </div>

            <div className="flex space-x-3">
              <button type="submit" className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg font-medium hover:shadow-lg transition-all">
                {editingDebt ? 'Update Debt' : 'Add Debt'}
              </button>
              <button type="button" onClick={resetForm} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter Toggle */}
      {debts.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Show:</span>
          {(['unpaid', 'paid', 'all'] as const).map(f => (
            <button
              key={f}
              onClick={() => setDebtFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                debtFilter === f
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              {f === 'unpaid' ? 'Unpaid' : f === 'paid' ? 'Paid' : 'All'}
            </button>
          ))}
        </div>
      )}

      {/* List */}
      <div className="w-full bg-white dark:bg-gray-800 rounded-xl md:rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {filteredDebts.length === 0 ? (
          <div className="p-8 md:p-12 text-center">
            <CreditCard className="w-12 h-12 md:w-16 md:h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-sm md:text-base text-gray-600 dark:text-gray-400">
              {debts.length === 0 ? 'No debts recorded. Add your first debt!' : `No ${debtFilter} debts. Try another filter.`}
            </p>
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="md:hidden space-y-3 p-3">
              {filteredDebts.map(debt => {
                const debtFreq = (debt.frequency ?? 'monthly') as DebtFrequency;
                const total = debt.totalSchedules ?? 0;
                const paid = debt.paidSchedules ?? 0;
                const canMarkPayment = debtFreq !== 'one_time' && total > 0 && paid < total;
                return (
                  <div key={debt.id} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
                    {/* Top row */}
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate">{debt.creditor}</h3>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">{debt.type.replace('_', ' ')}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${FREQUENCY_BADGE[debtFreq]}`}>
                            {FREQUENCY_LABELS[debtFreq]}
                          </span>
                        </div>
                      </div>
                      <div className="text-right ml-2 shrink-0">
                        <p className="text-base font-bold text-red-600 dark:text-red-400">{formatCurrency(debt.remainingAmount)}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">of {formatCurrency(debt.totalAmount)}</p>
                      </div>
                    </div>

                    {/* Schedule progress */}
                    <div className="mb-2">
                      <ScheduleProgress debt={debt} />
                    </div>

                    {/* Details */}
                    <div className="space-y-1 text-xs border-t border-gray-200 dark:border-gray-600 pt-2 mb-2">
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Payment:</span>
                        <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(debt.minimumPayment)}</span>
                      </div>
                      {debt.totalAmountDue && (
                        <div className="flex justify-between">
                          <span className="text-gray-500 dark:text-gray-400">Total Due:</span>
                          <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(debt.totalAmountDue)}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Due:</span>
                        <span className="font-medium text-gray-900 dark:text-white">{dueDateLabel(debt)}</span>
                      </div>
                      {debt.interestRate ? (
                        <div className="flex justify-between">
                          <span className="text-gray-500 dark:text-gray-400">Interest:</span>
                          <span className="font-medium text-gray-900 dark:text-white">{debt.interestRate.toFixed(2)}%</span>
                        </div>
                      ) : null}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-1">
                      {canMarkPayment ? (
                        <button
                          onClick={() => openMarkPayment(debt)}
                          disabled={markingPayment === debt.id}
                          className="flex items-center gap-1 px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg text-xs font-medium hover:bg-green-200 dark:hover:bg-green-900/50 disabled:opacity-50 transition-colors"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {markingPayment === debt.id ? 'Saving...' : 'Mark Payment'}
                        </button>
                      ) : debtFreq === 'one_time' && !debt.isPaid ? (
                        <button
                          onClick={() => setConfirmMarkAsPaid(debt)}
                          disabled={markingPayment === debt.id}
                          className="flex items-center gap-1 px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg text-xs font-medium hover:bg-green-200 dark:hover:bg-green-900/50 disabled:opacity-50 transition-colors"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {markingPayment === debt.id ? 'Saving...' : 'Mark as Paid'}
                        </button>
                      ) : (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          debt.isPaid || isDebtPaid(debt)
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                            : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                        }`}>
                          {debt.isPaid || isDebtPaid(debt) ? 'Fully Paid' : 'Active'}
                        </span>
                      )}
                      <div className="flex gap-2">
                        <button onClick={() => handleEdit(debt)} className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => setConfirmDelete(debt.id)} className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
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
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Creditor</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type / Frequency</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total / Remaining</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Payment</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider min-w-[200px]">Schedule Progress</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Due Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredDebts.map(debt => {
                    const debtFreq = (debt.frequency ?? 'monthly') as DebtFrequency;
                    const total = debt.totalSchedules ?? 0;
                    const paid = debt.paidSchedules ?? 0;
                    const canMarkPayment = debtFreq !== 'one_time' && total > 0 && paid < total;
                    return (
                      <tr key={debt.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                        <td className="px-4 py-4">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">{debt.creditor}</p>
                          {debt.interestRate ? <p className="text-xs text-gray-500 mt-0.5">{debt.interestRate.toFixed(2)}% interest</p> : null}
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">{debt.type.replace('_', ' ')}</p>
                          <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${FREQUENCY_BADGE[debtFreq]}`}>
                            {FREQUENCY_LABELS[debtFreq]}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-sm font-bold text-red-600 dark:text-red-400">{formatCurrency(debt.remainingAmount)}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">of {formatCurrency(debt.totalAmount)}</p>
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(debt.minimumPayment)}</p>
                          {debt.totalAmountDue ? <p className="text-xs text-gray-500 mt-0.5">Total due: {formatCurrency(debt.totalAmountDue)}</p> : null}
                        </td>
                        <td className="px-4 py-4 min-w-[200px]">
                          <ScheduleProgress debt={debt} />
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                          {dueDateLabel(debt)}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-1">
                            {canMarkPayment && (
                              <button
                                onClick={() => openMarkPayment(debt)}
                                disabled={markingPayment === debt.id}
                                title="Mark one payment as paid"
                                className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors disabled:opacity-50"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                            )}
                            {debtFreq === 'one_time' && !debt.isPaid && (
                              <button
                                onClick={() => setConfirmMarkAsPaid(debt)}
                                disabled={markingPayment === debt.id}
                                title="Mark as fully paid"
                                className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors disabled:opacity-50"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                            )}
                            <button onClick={() => handleEdit(debt)} className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => setConfirmDelete(debt.id)} className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
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

      {/* Delete confirmation */}
      <ConfirmModal
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
        title="Delete debt"
        message="Are you sure you want to delete this debt? This cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
      />

      {/* Mark payment (recurring) confirmation */}
      <ConfirmModal
        isOpen={!!confirmMarkPayment}
        onClose={() => setConfirmMarkPayment(null)}
        onConfirm={() => confirmMarkPayment && handleMarkPayment(confirmMarkPayment)}
        title="Mark payment"
        message={
          confirmMarkPayment
            ? `Record payment of ${formatCurrency(getTermPaymentAmount(confirmMarkPayment))} for ${confirmMarkPayment.creditor}? This will be added to your expenses and reduce your balance.`
            : ''
        }
        confirmLabel="Mark paid"
        cancelLabel="Cancel"
        variant="success"
      />

      {/* Mark as paid (one-time) confirmation */}
      <ConfirmModal
        isOpen={!!confirmMarkAsPaid}
        onClose={() => setConfirmMarkAsPaid(null)}
        onConfirm={() => confirmMarkAsPaid && handleMarkAsPaid(confirmMarkAsPaid)}
        title="Mark as paid"
        message={
          confirmMarkAsPaid
            ? `Record full payment of ${formatCurrency(confirmMarkAsPaid.minimumPayment)} for ${confirmMarkAsPaid.creditor}? This will be added to your expenses and reduce your balance.`
            : ''
        }
        confirmLabel="Mark paid"
        cancelLabel="Cancel"
        variant="success"
      />

      {/* Bi-monthly: which cutoff are you paying? */}
      {biMonthlyCutoffDebt && (() => {
        const now = new Date();
        const paid1 = isCutoffPaidThisMonth(biMonthlyCutoffDebt, now.getFullYear(), now.getMonth(), '1');
        const paid2 = isCutoffPaidThisMonth(biMonthlyCutoffDebt, now.getFullYear(), now.getMonth(), '2');
        return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setBiMonthlyCutoffDebt(null)} aria-hidden />
          <div className="relative w-full max-w-sm rounded-xl bg-white dark:bg-gray-800 p-4 shadow-xl border border-gray-200 dark:border-gray-700">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">Which due date did you pay?</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {biMonthlyCutoffDebt.creditor} — {formatCurrency(biMonthlyCutoffDebt.minimumPayment)} per payment
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handleMarkPayment(biMonthlyCutoffDebt, '1')}
                disabled={markingPayment === biMonthlyCutoffDebt.id || paid1}
                className={`flex-1 px-3 py-2 rounded-lg font-medium text-sm disabled:opacity-50 ${
                  paid1 ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 line-through' : 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-900/50'
                }`}
              >
                {ordinal(biMonthlyCutoffDebt.dueDate ?? 1)} (1–15) {paid1 ? '✓' : ''}
              </button>
              <button
                onClick={() => handleMarkPayment(biMonthlyCutoffDebt, '2')}
                disabled={markingPayment === biMonthlyCutoffDebt.id || paid2}
                className={`flex-1 px-3 py-2 rounded-lg font-medium text-sm disabled:opacity-50 ${
                  paid2 ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 line-through' : 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-900/50'
                }`}
              >
                {ordinal(biMonthlyCutoffDebt.secondDueDate ?? 15)} (16–30) {paid2 ? '✓' : ''}
              </button>
            </div>
            <button
              onClick={() => setBiMonthlyCutoffDebt(null)}
              className="mt-3 w-full py-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-400"
            >
              Cancel
            </button>
          </div>
        </div>
        );
      })()}
    </div>
  );
}
