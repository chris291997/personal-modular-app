import { FormEvent, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Ticket, Trash2 } from 'lucide-react';
import { DEFAULT_LOTTO_GAMES, getGameLabel, SIX_NUMBER_GAMES } from '../../../services/lottoService';
import { LottoBet, LottoGame } from '../../../types';
import { useLottoStore } from '../../../stores/lottoStore';
import { useBudgetStore } from '../../../stores/budgetStore';
import { getGameConfig } from '../utils/generator';

const normalizePick = (input: string, pickCount: number): number[] => {
  const parsed = input
    .split(/[,\s-]+/)
    .map(item => Number(item.trim()))
    .filter(item => Number.isFinite(item));
  return Array.from(new Set(parsed)).slice(0, pickCount);
};

const STATUS_STYLE: Record<string, string> = {
  pending: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
  won: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
  lost: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
};

/** Inline confirmation panel shown when user clicks "Mark as Betted" */
function PlaceConfirm({
  bet,
  onConfirm,
  onCancel,
}: {
  bet: LottoBet;
  onConfirm: (amount: number, categoryId: string) => Promise<void>;
  onCancel: () => void;
}) {
  const { categories, loadCategories } = useBudgetStore();
  const [amount, setAmount] = useState(bet.amount?.toString() ?? '');
  const [categoryId, setCategoryId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    if (categories.length > 0 && !categoryId) {
      // Prefer a category named "Entertainment", "Lotto", or "Miscellaneous" / "Other"
      const preferred = categories.find(c =>
        /lotto|entertainment|miscellaneous|other|leisure/i.test(c.name)
      ) ?? categories[0];
      setCategoryId(preferred.id);
    }
  }, [categories, categoryId]);

  const handleConfirm = async () => {
    const parsed = parseFloat(amount);
    if (!parsed || parsed <= 0) { setError('Enter a valid amount.'); return; }
    if (!categoryId) { setError('Select a category.'); return; }
    setSaving(true);
    setError('');
    try {
      await onConfirm(parsed, categoryId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save.');
      setSaving(false);
    }
  };

  return (
    <div className="mt-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-3 space-y-3">
      <p className="text-xs font-semibold text-green-700 dark:text-green-300">
        Confirm bet placement — this will log an expense in your budget.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Amount spent (₱)</label>
          <input
            type="number"
            min="1"
            step="0.01"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-sm"
            placeholder="e.g., 20"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Budget category</label>
          <select
            value={categoryId}
            onChange={e => setCategoryId(e.target.value)}
            className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-sm"
          >
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={handleConfirm}
          disabled={saving}
          className="flex-1 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving…' : 'Confirm & Log Expense'}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function BetsTab() {
  const { bets, loading, addBet, updateBet, deleteBet } = useLottoStore();
  const { addExpense } = useBudgetStore();

  const [game, setGame] = useState<LottoGame>('ultra_6_58');
  const [drawDate, setDrawDate] = useState(new Date().toISOString().slice(0, 10));
  const [numbersText, setNumbersText] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const config = useMemo(() => getGameConfig(game), [game]);
  const helpText = useMemo(
    () => `Enter ${config.pickCount} unique numbers between 1 and ${config.poolMax}`,
    [config]
  );

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const picks = normalizePick(numbersText, config.pickCount);
    if (picks.length !== config.pickCount || picks.some(n => n < 1 || n > config.poolMax)) {
      alert(helpText);
      return;
    }
    await addBet({
      game,
      drawDate: new Date(drawDate),
      pickedNumbers: picks.sort((a, b) => a - b),
      amount: amount.trim() ? Number(amount) : undefined,
      source: 'manual',
      strategyUsed: undefined,
    });
    setNumbersText('');
    setAmount('');
  };

  const handleMarkPlaced = async (bet: LottoBet, spentAmount: number, categoryId: string) => {
    const expenseId = await addExpense({
      amount: spentAmount,
      categoryId,
      description: `Lotto bet — ${getGameLabel(bet.game)} (${bet.pickedNumbers.join('-')})`,
      date: new Date(),
      isRecurring: false,
      notes: `Draw date: ${bet.drawDate.toLocaleDateString()}`,
    });

    await updateBet(bet.id, {
      isPlaced: true,
      placedAt: new Date(),
      amount: spentAmount,
      expenseId,
    });

    setConfirmingId(null);
  };

  const sortedBets = useMemo(
    () => [...bets].sort((a, b) => {
      // Unplaced bets first, then by draw date descending
      if (a.isPlaced !== b.isPlaced) return a.isPlaced ? 1 : -1;
      return b.drawDate.getTime() - a.drawDate.getTime();
    }),
    [bets]
  );

  return (
    <div className="space-y-4">
      {/* Add bet form */}
      <form
        onSubmit={onSubmit}
        className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 md:p-4 grid grid-cols-1 md:grid-cols-5 gap-3"
      >
        <div>
          <label htmlFor="bet-game" className="block text-sm mb-1 text-gray-700 dark:text-gray-300">Game</label>
          <select
            id="bet-game"
            value={game}
            onChange={event => setGame(event.target.value as LottoGame)}
            className="w-full px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-sm"
          >
            {DEFAULT_LOTTO_GAMES.map(item => (
              <option key={item} value={item}>{getGameLabel(item)}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="bet-date" className="block text-sm mb-1 text-gray-700 dark:text-gray-300">Draw Date</label>
          <input
            id="bet-date"
            type="date"
            value={drawDate}
            onChange={event => setDrawDate(event.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-sm"
          />
        </div>
        <div className="md:col-span-2">
          <label htmlFor="bet-numbers" className="block text-sm mb-1 text-gray-700 dark:text-gray-300">Numbers</label>
          <input
            id="bet-numbers"
            type="text"
            value={numbersText}
            onChange={event => setNumbersText(event.target.value)}
            placeholder={helpText}
            className="w-full px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-sm"
          />
        </div>
        <div>
          <label htmlFor="bet-amount" className="block text-sm mb-1 text-gray-700 dark:text-gray-300">Amount (optional)</label>
          <input
            id="bet-amount"
            type="number"
            min={0}
            step={0.01}
            value={amount}
            onChange={event => setAmount(event.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-sm"
          />
        </div>
        <div className="md:col-span-5 flex items-center justify-between">
          <p className="text-xs text-gray-500 dark:text-gray-400">{helpText}</p>
          <button className="px-4 py-2 rounded-lg bg-purple-600 text-white text-sm hover:bg-purple-700 transition-colors">
            Save Bet
          </button>
        </div>
      </form>

      {/* Bet list */}
      <div className="space-y-3">
        {sortedBets.map(bet => (
          <div
            key={bet.id}
            className={`bg-white dark:bg-gray-800 rounded-xl border p-3 md:p-4 transition-colors ${
              bet.isPlaced
                ? 'border-green-200 dark:border-green-800'
                : 'border-gray-200 dark:border-gray-700'
            }`}
          >
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">

              {/* Left: info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {getGameLabel(bet.game)}
                  </p>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLE[bet.resultStatus] ?? STATUS_STYLE.pending}`}>
                    {bet.resultStatus}
                  </span>
                  {bet.isPlaced && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                      <CheckCircle2 className="w-3 h-3" />
                      Betted
                    </span>
                  )}
                  {bet.strategyUsed && (
                    <span className="px-2 py-0.5 rounded-full text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 capitalize">
                      {bet.strategyUsed}
                    </span>
                  )}
                </div>

                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Draw: {bet.drawDate.toLocaleDateString()}
                  {bet.isPlaced && bet.placedAt && (
                    <> · Placed: {bet.placedAt.toLocaleDateString()}</>
                  )}
                </p>

                <p className="mt-2 font-mono text-sm text-gray-900 dark:text-gray-100">
                  {bet.pickedNumbers.join(' - ')}
                </p>

                {bet.amount != null && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Amount: ₱{bet.amount.toFixed(2)}
                    {bet.expenseId && (
                      <span className="ml-2 text-green-600 dark:text-green-400">· logged to budget</span>
                    )}
                  </p>
                )}
              </div>

              {/* Right: actions */}
              <div className="flex items-center gap-2 shrink-0">
                {!bet.isPlaced && (
                  <button
                    onClick={() => setConfirmingId(confirmingId === bet.id ? null : bet.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-medium transition-colors"
                  >
                    <Ticket className="w-3.5 h-3.5" />
                    Mark as Betted
                  </button>
                )}
                <button
                  onClick={() => deleteBet(bet.id)}
                  className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Inline confirmation */}
            {confirmingId === bet.id && !bet.isPlaced && (
              <PlaceConfirm
                bet={bet}
                onConfirm={(amt, catId) => handleMarkPlaced(bet, amt, catId)}
                onCancel={() => setConfirmingId(null)}
              />
            )}
          </div>
        ))}

        {!loading.bets && bets.length === 0 && (
          <p className="text-sm text-gray-600 dark:text-gray-300 text-center py-6">No bets saved yet.</p>
        )}
      </div>

      {!SIX_NUMBER_GAMES.includes(game) && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Digit games (2D/3D/4D/6D) use 0–9 style values; enter them as plain numbers.
        </p>
      )}
    </div>
  );
}
