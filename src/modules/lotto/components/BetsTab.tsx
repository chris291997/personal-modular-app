import { FormEvent, useMemo, useState } from 'react';
import { DEFAULT_LOTTO_GAMES, getGameLabel, SIX_NUMBER_GAMES } from '../../../services/lottoService';
import { LottoGame } from '../../../types';
import { useLottoStore } from '../../../stores/lottoStore';
import { getGameConfig } from '../utils/generator';

const normalizePick = (input: string, pickCount: number): number[] => {
  const parsed = input
    .split(/[,\s-]+/)
    .map(item => Number(item.trim()))
    .filter(item => Number.isFinite(item));
  return Array.from(new Set(parsed)).slice(0, pickCount);
};

export default function BetsTab() {
  const { bets, loading, addBet, deleteBet } = useLottoStore();
  const [game, setGame] = useState<LottoGame>('ultra_6_58');
  const [drawDate, setDrawDate] = useState(new Date().toISOString().slice(0, 10));
  const [numbersText, setNumbersText] = useState('');
  const [amount, setAmount] = useState<string>('');

  const config = useMemo(() => getGameConfig(game), [game]);
  const helpText = useMemo(
    () => `Enter ${config.pickCount} unique numbers between 1 and ${config.poolMax}`,
    [config]
  );

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const picks = normalizePick(numbersText, config.pickCount);
    if (picks.length !== config.pickCount) {
      alert(helpText);
      return;
    }
    if (picks.some(number => number < 1 || number > config.poolMax)) {
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

  return (
    <div className="space-y-4">
      <form
        onSubmit={onSubmit}
        className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 md:p-4 grid grid-cols-1 md:grid-cols-5 gap-3"
      >
        <div>
          <label htmlFor="bet-game" className="block text-sm mb-1 text-gray-700 dark:text-gray-300">
            Game
          </label>
          <select
            id="bet-game"
            value={game}
            onChange={event => setGame(event.target.value as LottoGame)}
            className="w-full px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-sm"
          >
            {DEFAULT_LOTTO_GAMES.map(item => (
              <option key={item} value={item}>
                {getGameLabel(item)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="bet-date" className="block text-sm mb-1 text-gray-700 dark:text-gray-300">
            Draw Date
          </label>
          <input
            id="bet-date"
            type="date"
            value={drawDate}
            onChange={event => setDrawDate(event.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-sm"
          />
        </div>
        <div className="md:col-span-2">
          <label htmlFor="bet-numbers" className="block text-sm mb-1 text-gray-700 dark:text-gray-300">
            Numbers
          </label>
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
          <label htmlFor="bet-amount" className="block text-sm mb-1 text-gray-700 dark:text-gray-300">
            Amount (optional)
          </label>
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
          <button className="px-4 py-2 rounded-lg bg-purple-600 text-white text-sm hover:bg-purple-700">
            Save Bet
          </button>
        </div>
      </form>

      <div className="space-y-3">
        {bets.map(bet => (
          <div
            key={bet.id}
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 md:p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
          >
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{getGameLabel(bet.game)}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Draw: {bet.drawDate.toLocaleDateString()} · Status: {bet.resultStatus}
              </p>
              <p className="mt-2 font-mono text-gray-900 dark:text-gray-100">{bet.pickedNumbers.join(' - ')}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {bet.amount ? `Amount: ${bet.amount.toFixed(2)}` : 'No amount'}
              </span>
              <button
                onClick={() => deleteBet(bet.id)}
                className="px-3 py-2 rounded-lg border border-red-300 text-red-600 text-sm hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
        {!loading.bets && bets.length === 0 && (
          <p className="text-sm text-gray-600 dark:text-gray-300 text-center py-6">No bets saved yet.</p>
        )}
      </div>

      {!SIX_NUMBER_GAMES.includes(game) && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Digit games (2D/3D/4D/6D) use 0-9 style values; enter them as plain numbers.
        </p>
      )}
    </div>
  );
}
