import { useRef, useState } from 'react';
import { X } from 'lucide-react';
import { SIX_NUMBER_GAMES, getGameLabel } from '../../../services/lottoService';
import { LottoGame, LottoGeneratorStrategy } from '../../../types';
import { useLottoStore } from '../../../stores/lottoStore';
import { generateTickets, getGameConfig, getTicketStats } from '../utils/generator';
import { getNextDrawDate } from '../utils/schedule';

const STRATEGIES: {
  value: LottoGeneratorStrategy;
  label: string;
  description: string;
  best?: boolean;
  caveat?: string;
}[] = [
  {
    value: 'balanced',
    label: 'Balanced',
    best: true,
    description: 'Picks numbers with the highest long-run frequency, with a light recency tiebreaker.',
    caveat: 'Most mathematically defensible — frequency over 300 draws is the most stable signal.',
  },
  {
    value: 'hot',
    label: 'Hot',
    description: 'Favours numbers appearing both frequently AND in the most recent draws.',
    caveat: 'Useful if you believe in streaks, but recency alone can be noise.',
  },
  {
    value: 'due',
    label: 'Due',
    description: 'Favours historically active numbers that have recently gone "cold".',
    caveat: 'Based on the idea that overdue numbers will return — a soft form of the gambler\'s fallacy.',
  },
  {
    value: 'random',
    label: 'Random',
    description: 'All numbers treated equally — pure random selection.',
    caveat: 'Ignores history entirely. Still passes all structural filters (sum, odd/even, etc.).',
  },
];

const BALL_COLORS: Record<LottoGame, string> = {
  ultra_6_58: 'bg-red-500',
  grand_6_55: 'bg-orange-500',
  super_6_49: 'bg-yellow-500',
  mega_6_45: 'bg-green-500',
  lotto_6_42: 'bg-blue-500',
  '6d': 'bg-purple-500',
  '4d': 'bg-pink-500',
  '3d_2pm': 'bg-teal-500',
  '3d_5pm': 'bg-teal-600',
  '3d_9pm': 'bg-teal-700',
  '2d_2pm': 'bg-indigo-400',
  '2d_5pm': 'bg-indigo-500',
  '2d_9pm': 'bg-indigo-600',
};

interface TicketResult {
  game: LottoGame;
  numbers: number[];
  lockedNumbers?: number[];
  score: number;
  strategy: LottoGeneratorStrategy;
}

export default function GeneratorTab() {
  const [game, setGame] = useState<LottoGame>('super_6_49');
  const [strategy, setStrategy] = useState<LottoGeneratorStrategy>('balanced');
  const [luckyInput, setLuckyInput] = useState('');
  const [luckyNumbers, setLuckyNumbers] = useState<number[]>([]);
  const [luckyError, setLuckyError] = useState('');
  const [ticket, setTicket] = useState<TicketResult | null>(null);
  const [generating, setGenerating] = useState(false);
  const [noResult, setNoResult] = useState(false);
  const [saved, setSaved] = useState(false);
  const luckyInputRef = useRef<HTMLInputElement>(null);

  const { draws, loading, addBet, loadDraws } = useLottoStore();
  const config = getGameConfig(game);
  const maxLucky = config.pickCount - 1;

  const handleGameChange = (g: LottoGame) => {
    setGame(g);
    setTicket(null);
    setSaved(false);
    setNoResult(false);
    // Clear lucky numbers that fall outside the new game's pool
    const newConfig = getGameConfig(g);
    setLuckyNumbers(prev => prev.filter(n => n >= 1 && n <= newConfig.poolMax).slice(0, newConfig.pickCount - 1));
    setLuckyError('');
  };

  const addLuckyNumber = (raw: string) => {
    const n = parseInt(raw.trim(), 10);
    setLuckyError('');
    if (!raw.trim()) return;
    if (Number.isNaN(n) || n < 1 || n > config.poolMax) {
      setLuckyError(`Must be between 1 and ${config.poolMax}.`);
      return;
    }
    if (luckyNumbers.includes(n)) {
      setLuckyError(`${n} is already added.`);
      return;
    }
    if (luckyNumbers.length >= maxLucky) {
      setLuckyError(`Max ${maxLucky} lucky numbers for ${getGameLabel(game)}.`);
      return;
    }
    setLuckyNumbers(prev => [...prev, n]);
    setLuckyInput('');
    setTicket(null);
    setSaved(false);
  };

  const handleLuckyKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === ',') {
      e.preventDefault();
      addLuckyNumber(luckyInput);
    }
    if (e.key === 'Backspace' && luckyInput === '' && luckyNumbers.length > 0) {
      setLuckyNumbers(prev => prev.slice(0, -1));
    }
  };

  const removeLucky = (n: number) => {
    setLuckyNumbers(prev => prev.filter(x => x !== n));
    setLuckyError('');
    setTicket(null);
    setSaved(false);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setSaved(false);
    setNoResult(false);
    setTicket(null);

    let baseDraws = draws;
    if (baseDraws.length === 0) {
      await loadDraws(undefined, true);
      baseDraws = useLottoStore.getState().draws;
    }

    const results = generateTickets(baseDraws, {
      game,
      strategy,
      ticketCount: 1,
      lockedNumbers: luckyNumbers,
    });

    if (results.length > 0) {
      setTicket({
        game,
        numbers: results[0].numbers,
        lockedNumbers: results[0].lockedNumbers,
        score: results[0].score,
        strategy,
      });
    } else {
      setNoResult(true);
    }
    setGenerating(false);
  };

  const handleSave = async () => {
    if (!ticket) return;
    const nextDraw = getNextDrawDate(ticket.game);
    await addBet({
      game: ticket.game,
      drawDate: nextDraw,
      pickedNumbers: ticket.numbers,
      amount: undefined,
      source: 'generated',
      strategyUsed: ticket.strategy,
    });
    setSaved(true);
  };

  const ballColor = BALL_COLORS[game] ?? 'bg-purple-500';
  const stats = ticket ? getTicketStats(ticket.numbers, config.poolMax) : null;

  // All generated tickets are guaranteed ≥ 0.65 (high confidence).
  // Score is still shown so the user can compare across "Try Another" runs.
  const scoreBar = (score: number) => {
    const pct = Math.round(Math.min(score / 1, 1) * 100);
    return { pct, label: `${pct}%` };
  };

  const isLocked = (n: number) => ticket?.lockedNumbers?.includes(n) ?? false;

  return (
    <div className="space-y-4 max-w-2xl mx-auto">

      {/* Controls card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-5">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Number Generator</h2>

        {/* Game selector */}
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Game</label>
          <select
            value={game}
            onChange={e => handleGameChange(e.target.value as LottoGame)}
            className="w-full px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-sm"
          >
            {SIX_NUMBER_GAMES.map(g => (
              <option key={g} value={g}>{getGameLabel(g)}</option>
            ))}
          </select>
        </div>

        {/* Strategy cards */}
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Strategy</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {STRATEGIES.map(s => (
              <button
                key={s.value}
                type="button"
                onClick={() => { setStrategy(s.value); setTicket(null); setSaved(false); }}
                className={`relative text-left p-3 rounded-xl border transition-all ${
                  strategy === s.value
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700'
                }`}
              >
                {s.best && (
                  <span className="absolute top-2 right-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-400 text-amber-900">
                    ★ Best
                  </span>
                )}
                <p className={`text-sm font-semibold mb-0.5 ${strategy === s.value ? 'text-purple-700 dark:text-purple-300' : 'text-gray-800 dark:text-gray-200'}`}>
                  {s.label}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{s.description}</p>
                {strategy === s.value && s.caveat && (
                  <p className="text-xs text-purple-600 dark:text-purple-400 mt-1 italic">{s.caveat}</p>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Lucky numbers */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
              Lucky Numbers <span className="text-gray-400">(optional — guaranteed in your ticket)</span>
            </label>
            {luckyNumbers.length > 0 && (
              <button
                type="button"
                onClick={() => { setLuckyNumbers([]); setLuckyError(''); setTicket(null); }}
                className="text-xs text-red-500 hover:text-red-700"
              >
                Clear all
              </button>
            )}
          </div>

          {/* Chip input */}
          <div
            className="min-h-[42px] flex flex-wrap gap-1.5 items-center px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 cursor-text"
            onClick={() => luckyInputRef.current?.focus()}
          >
            {luckyNumbers.map(n => (
              <span
                key={n}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-400 text-amber-900 text-xs font-bold"
              >
                ★ {n}
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); removeLucky(n); }}
                  className="hover:text-amber-700"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            {luckyNumbers.length < maxLucky && (
              <input
                ref={luckyInputRef}
                type="number"
                min={1}
                max={config.poolMax}
                value={luckyInput}
                onChange={e => { setLuckyInput(e.target.value); setLuckyError(''); }}
                onKeyDown={handleLuckyKeyDown}
                onBlur={() => { if (luckyInput) addLuckyNumber(luckyInput); }}
                placeholder={luckyNumbers.length === 0 ? `Type a number (1–${config.poolMax}) and press Enter` : `Add more…`}
                className="flex-1 min-w-[120px] bg-transparent outline-none text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400"
              />
            )}
          </div>

          {luckyError && (
            <p className="text-xs text-red-500 mt-1">{luckyError}</p>
          )}
          {luckyNumbers.length >= maxLucky && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Max {maxLucky} lucky numbers reached. Remove one to add another.
            </p>
          )}
          {luckyNumbers.length > 0 && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
              {luckyNumbers.length} locked · the remaining {config.pickCount - luckyNumbers.length} will be generated using <strong>{strategy}</strong> strategy.
            </p>
          )}
        </div>

        {/* Generate button */}
        <button
          onClick={handleGenerate}
          disabled={generating || loading.draws}
          className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white font-semibold text-sm disabled:bg-gray-400 dark:disabled:bg-gray-600 transition-colors"
        >
          {generating || loading.draws ? 'Generating...' : ticket ? 'Generate Another' : 'Generate Ticket'}
        </button>
      </div>

      {/* No-result warning */}
      {noResult && !generating && (
        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-4 text-sm text-orange-700 dark:text-orange-300 space-y-1">
          <p><strong>No high-confidence ticket found.</strong></p>
          <p className="text-xs leading-relaxed">
            The generator only returns tickets with a score ≥ 65%. This can happen when:
            {' '}
            {luckyNumbers.length > 0
              ? 'your lucky numbers are pulling the score down — try removing one and generating again, or switch to Balanced strategy.'
              : 'there isn\'t enough historical data yet for this game, or the current strategy is very restrictive. Try Balanced or Random strategy.'}
          </p>
        </div>
      )}

      {/* Ticket card */}
      {ticket && stats && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-5">

          {/* Game + strategy badge */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {getGameLabel(ticket.game)}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 font-medium capitalize">
              {ticket.strategy}
            </span>
          </div>

          {/* Lottery balls — gold for locked, game-color for generated */}
          <div>
            <div className="flex flex-wrap justify-center gap-3 py-2">
              {ticket.numbers.map(n => (
                <div
                  key={n}
                  className={`relative w-12 h-12 rounded-full flex items-center justify-center shadow-md ${
                    isLocked(n) ? 'bg-amber-400' : ballColor
                  }`}
                >
                  <span className={`font-bold text-sm select-none ${isLocked(n) ? 'text-amber-900' : 'text-white'}`}>
                    {n}
                  </span>
                  {isLocked(n) && (
                    <span className="absolute -top-1 -right-1 text-[8px] leading-none">★</span>
                  )}
                </div>
              ))}
            </div>
            {ticket.lockedNumbers && ticket.lockedNumbers.length > 0 && (
              <p className="text-center text-xs text-amber-600 dark:text-amber-400 mt-1">
                ★ = your lucky number
              </p>
            )}
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg py-2 px-1">
              <p className="text-xs text-gray-500 dark:text-gray-400">Sum</p>
              <p className="text-base font-bold text-gray-900 dark:text-gray-100">{stats.sum}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg py-2 px-1">
              <p className="text-xs text-gray-500 dark:text-gray-400">Odd / Even</p>
              <p className="text-base font-bold text-gray-900 dark:text-gray-100">
                {stats.oddCount} / {stats.evenCount}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg py-2 px-1">
              <p className="text-xs text-gray-500 dark:text-gray-400">Low / High</p>
              <p className="text-base font-bold text-gray-900 dark:text-gray-100">
                {stats.lowCount} / {stats.highCount}
              </p>
            </div>
          </div>

          {/* Score bar — always high confidence */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500 dark:text-gray-400">
                Confidence score: <span className="font-mono font-semibold text-green-600 dark:text-green-400">{scoreBar(ticket.score).label}</span>
              </span>
              <span className="text-xs font-semibold text-green-600 dark:text-green-400">
                ✓ High confidence
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
              <div
                className="h-full rounded-full bg-green-500 transition-all duration-500"
                style={{ width: `${scoreBar(ticket.score).pct}%` }}
              />
            </div>
          </div>

          {/* Disclaimer */}
          <p className="text-xs text-gray-400 dark:text-gray-500 text-center leading-relaxed">
            Passed sum range, odd/even, low/high, consecutive, and group spread filters.
            Every combination is equally random — filters reduce statistical outliers only.
          </p>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="flex-1 py-2.5 rounded-xl border border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 text-sm font-medium hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors disabled:opacity-50"
            >
              Try Another
            </button>
            <button
              onClick={handleSave}
              disabled={saved}
              className={`flex-1 py-2.5 rounded-xl text-white text-sm font-medium transition-colors ${
                saved
                  ? 'bg-green-500 cursor-default'
                  : 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800'
              }`}
            >
              {saved ? 'Saved to My Bets ✓' : 'Save to My Bets'}
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!ticket && !generating && !loading.draws && !noResult && (
        <div className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm">
          Pick a game and strategy, then hit <strong>Generate Ticket</strong>.
        </div>
      )}

      {loading.draws && (
        <div className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm">
          Loading draw history...
        </div>
      )}
    </div>
  );
}
