import { Debt, DebtFrequency } from '../types';

export type CutoffId = '1' | '2';
/** Cutoff 1 = days 1-15, Cutoff 2 = days 16-30 */
export const CUTOFF_RANGES: Record<CutoffId, [number, number]> = {
  '1': [1, 15],
  '2': [16, 31],
};

export function getCutoffForDay(day: number): CutoffId {
  return day <= 15 ? '1' : '2';
}

export function getCutoffKey(year: number, month: number, cutoff: CutoffId): string {
  const m = String(month + 1).padStart(2, '0');
  return `${year}-${m}-${cutoff}`;
}

export function getCurrentCutoffKey(): string {
  const now = new Date();
  const day = now.getDate();
  const cutoff = getCutoffForDay(day);
  return getCutoffKey(now.getFullYear(), now.getMonth(), cutoff);
}

/** Which cutoffs does this debt have dues in? (1, 2, or both for bi_monthly/weekly) */
export function getDebtCutoffs(debt: Debt): CutoffId[] {
  const freq = (debt.frequency ?? 'monthly') as DebtFrequency;
  if (freq === 'one_time') {
    if (debt.oneTimeDueDate) {
      const d = new Date(debt.oneTimeDueDate + 'T00:00:00');
      return [getCutoffForDay(d.getDate())];
    }
    return [];
  }
  if (freq === 'weekly') return ['1', '2']; // Weekly pays in both cutoffs
  if (freq === 'bi_monthly' && debt.dueDate != null && debt.secondDueDate != null) {
    const c1 = getCutoffForDay(debt.dueDate);
    const c2 = getCutoffForDay(debt.secondDueDate);
    return c1 === c2 ? [c1] : ['1', '2'];
  }
  if (debt.dueDate != null) {
    return [getCutoffForDay(debt.dueDate)];
  }
  return [];
}

/** Amount due per cutoff for this debt. Bi-monthly/weekly: full payment in each cutoff. */
export function getDebtAmountPerCutoff(debt: Debt): Partial<Record<CutoffId, number>> {
  const freq = (debt.frequency ?? 'monthly') as DebtFrequency;
  const cutoffs = getDebtCutoffs(debt);
  const amount = debt.minimumPayment;
  if (cutoffs.length === 0) return {};
  if (cutoffs.length === 1) return { [cutoffs[0]]: amount };
  // Weekly: ~2 payments per cutoff (4.33/2)
  if (freq === 'weekly') {
    const perCutoff = amount * 2.17;
    return { '1': perCutoff, '2': perCutoff };
  }
  // Bi-monthly: full payment due in each cutoff
  return { '1': amount, '2': amount };
}

/** Total payable for cutoff 1 (1-15) and cutoff 2 (16-30) from active debts.
 * Only for the current month: one_time debts only if due in year/month,
 * and excludes cutoffs already paid (shows remaining amounts).
 */
export function getDebtPaymentsByCutoff(
  debts: Debt[],
  year: number,
  month: number
): { cutoff1: number; cutoff2: number } {
  const active = debts.filter(d => (d.remainingAmount ?? 0) > 0);
  const key1 = getCutoffKey(year, month, '1');
  const key2 = getCutoffKey(year, month, '2');
  let cutoff1 = 0;
  let cutoff2 = 0;
  for (const debt of active) {
    const freq = (debt.frequency ?? 'monthly') as DebtFrequency;
    // one_time: only include if due in this year/month
    if (freq === 'one_time') {
      if (!debt.oneTimeDueDate) continue;
      const d = new Date(debt.oneTimeDueDate + 'T00:00:00');
      if (d.getFullYear() !== year || d.getMonth() !== month) continue;
    }
    const amts = getDebtAmountPerCutoff(debt);
    const paid1 = (debt.paidCutoffKeys ?? []).includes(key1);
    const paid2 = (debt.paidCutoffKeys ?? []).includes(key2);
    if (amts['1'] && !paid1) cutoff1 += amts['1'];
    if (amts['2'] && !paid2) cutoff2 += amts['2'];
  }
  return { cutoff1, cutoff2 };
}

/** Has this cutoff been paid for this debt this month? */
export function isCutoffPaidThisMonth(
  debt: Debt,
  year: number,
  month: number,
  cutoff: CutoffId
): boolean {
  const key = getCutoffKey(year, month, cutoff);
  return (debt.paidCutoffKeys ?? []).includes(key);
}
