import { useState } from 'react';
import { SIX_NUMBER_GAMES, getGameLabel } from '../../../services/lottoService';
import { LottoGame, LottoGeneratorStrategy } from '../../../types';
import { useLottoStore } from '../../../stores/lottoStore';
import { generateTickets, getGameConfig, getTicketStats } from '../utils/generator';

const STRATEGIES: { value: LottoGeneratorStrategy; label: string; description: string }[] = [
  {
    value: 'balanced',
    label: 'Balanced',
    description: 'Frequency-weighted with a light recency tiebreaker. Best all-around pick.',
  },
  {
    value: 'hot',
    label: 'Hot',
    description: 'Numbers appearing frequently AND recently. Riding the current streak.',
  },
  {
    value: 'due',
    label: 'Due',
    description: 'Historically active numbers that have gone cold. Statistically "owed" a return.',
  },
  {
    value: 'random',
    label: 'Random',
    description: 'All numbers equally weighted. Pure random — history ignored.',
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
  score: number;
  strategy: LottoGeneratorStrategy;
}

export default function GeneratorTab() {
  const [game, setGame] = useState<LottoGame>('super_6_49');
  const [strategy, setStrategy] = useState<LottoGeneratorStrategy>('balanced');
  const [ticket, setTicket] = useState<TicketResult | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saved, setSaved] = useState(false);

  const { draws, loading, addBet, loadDraws } = useLottoStore();

  const handleGenerate = async () => {
    setGenerating(true);
    setSaved(false);
    setTicket(null);

    let baseDraws = draws;
    if (baseDraws.length === 0) {
      await loadDraws(undefined, true);
      baseDraws = useLottoStore.getState().draws;
    }

    const results = generateTickets(baseDraws, { game, strategy, ticketCount: 1 });

    if (results.length > 0) {
      setTicket({ game, numbers: results[0].numbers, score: results[0].score, strategy });
    }
    setGenerating(false);
  };

  const handleSave = async () => {
    if (!ticket) return;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    await addBet({
      game: ticket.game,
      drawDate: tomorrow,
      pickedNumbers: ticket.numbers,
      amount: undefined,
      source: 'generated',
      strategyUsed: ticket.strategy,
    });
    setSaved(true);
  };

  const selectedStrategy = STRATEGIES.find(s => s.value === strategy)!;
  const ballColor = BALL_COLORS[game] ?? 'bg-purple-500';
  const config = getGameConfig(game);
  const stats = ticket ? getTicketStats(ticket.numbers, config.poolMax) : null;

  // Score visual: 0–1 mapped to Low / Medium / High
  const scoreLabel = (score: number) => {
    if (score >= 0.65) return { text: 'High confidence', color: 'text-green-600 dark:text-green-400' };
    if (score >= 0.40) return { text: 'Medium confidence', color: 'text-yellow-600 dark:text-yellow-400' };
    return { text: 'Low confidence', color: 'text-gray-500 dark:text-gray-400' };
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto">

      {/* Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-4">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Number Generator</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Game</label>
            <select
              value={game}
              onChange={e => { setGame(e.target.value as LottoGame); setTicket(null); setSaved(false); }}
              className="w-full px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-sm"
            >
              {SIX_NUMBER_GAMES.map(g => (
                <option key={g} value={g}>{getGameLabel(g)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Strategy</label>
            <select
              value={strategy}
              onChange={e => { setStrategy(e.target.value as LottoGeneratorStrategy); setTicket(null); setSaved(false); }}
              className="w-full px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-sm"
            >
              {STRATEGIES.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Strategy description */}
        <p className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2">
          <span className="font-medium text-gray-700 dark:text-gray-300">{selectedStrategy.label}:</span>{' '}
          {selectedStrategy.description}
        </p>

        <button
          onClick={handleGenerate}
          disabled={generating || loading.draws}
          className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white font-semibold text-sm disabled:bg-gray-400 dark:disabled:bg-gray-600 transition-colors"
        >
          {generating || loading.draws ? 'Generating...' : ticket ? 'Generate Another' : 'Generate Ticket'}
        </button>
      </div>

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

          {/* Lottery balls */}
          <div className="flex flex-wrap justify-center gap-3 py-2">
            {ticket.numbers.map(n => (
              <div
                key={n}
                className={`${ballColor} w-12 h-12 rounded-full flex items-center justify-center shadow-md`}
              >
                <span className="text-white font-bold text-sm select-none">{n}</span>
              </div>
            ))}
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

          {/* Score */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500 dark:text-gray-400">
              Score: <span className="font-mono text-gray-700 dark:text-gray-300">{ticket.score}</span>
            </span>
            <span className={`font-medium ${scoreLabel(ticket.score).color}`}>
              {scoreLabel(ticket.score).text}
            </span>
          </div>

          {/* Disclaimer */}
          <p className="text-xs text-gray-400 dark:text-gray-500 text-center leading-relaxed">
            This ticket passed sum range, odd/even, low/high, consecutive, and group spread filters
            based on {game} historical data. Every combination is equally random — filters reduce
            statistical outliers, not predict the future.
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
      {!ticket && !generating && !loading.draws && (
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
