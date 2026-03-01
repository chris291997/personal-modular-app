import { useMemo, useState } from 'react';
import { DEFAULT_LOTTO_GAMES, getGameLabel } from '../../../services/lottoService';
import { LottoGame } from '../../../types';
import { useLottoStore } from '../../../stores/lottoStore';

export default function ResultsTab() {
  const [game, setGame] = useState<LottoGame | 'all'>('all');
  const { draws, loading, loadDraws } = useLottoStore();

  const filtered = useMemo(
    () => (game === 'all' ? draws : draws.filter(item => item.game === game)),
    [draws, game]
  );

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 md:p-4 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <label htmlFor="lotto-game-filter" className="text-sm text-gray-700 dark:text-gray-300">
            Game
          </label>
          <select
            id="lotto-game-filter"
            value={game}
            onChange={event => setGame(event.target.value as LottoGame | 'all')}
            className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-sm"
          >
            <option value="all">All games</option>
            {DEFAULT_LOTTO_GAMES.map(item => (
              <option key={item} value={item}>
                {getGameLabel(item)}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={() => loadDraws(game === 'all' ? undefined : game, true)}
          className="px-3 py-2 rounded-lg bg-purple-600 text-white text-sm hover:bg-purple-700 transition-colors"
        >
          Refresh Results
        </button>
      </div>

      <div className="md:hidden space-y-3">
        {filtered.map(draw => (
          <div
            key={draw.id}
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3"
          >
            <p className="text-xs text-gray-500 dark:text-gray-400">{getGameLabel(draw.game)}</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {draw.drawDate.toLocaleDateString()}
            </p>
            <p className="text-sm mt-2 text-gray-800 dark:text-gray-100 font-mono">
              {draw.combination.join(' - ')}
            </p>
            <p className="text-xs mt-2 text-gray-600 dark:text-gray-300">
              Jackpot: {draw.jackpot?.toLocaleString() || 'N/A'} | Winners: {draw.winners ?? 'N/A'}
            </p>
          </div>
        ))}
        {!loading.draws && filtered.length === 0 && (
          <p className="text-sm text-gray-600 dark:text-gray-300 text-center py-6">No results found.</p>
        )}
      </div>

      <div className="hidden md:block bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700/50">
            <tr>
              <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-300">Game</th>
              <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-300">Draw Date</th>
              <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-300">Combination</th>
              <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-300">Jackpot</th>
              <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-300">Winners</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(draw => (
              <tr key={draw.id} className="border-t border-gray-100 dark:border-gray-700">
                <td className="px-4 py-3 text-gray-900 dark:text-gray-100">{getGameLabel(draw.game)}</td>
                <td className="px-4 py-3 text-gray-900 dark:text-gray-100">{draw.drawDate.toLocaleDateString()}</td>
                <td className="px-4 py-3 font-mono text-gray-900 dark:text-gray-100">{draw.combination.join(' - ')}</td>
                <td className="px-4 py-3 text-gray-900 dark:text-gray-100">
                  {draw.jackpot?.toLocaleString() || 'N/A'}
                </td>
                <td className="px-4 py-3 text-gray-900 dark:text-gray-100">{draw.winners ?? 'N/A'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading.draws && filtered.length === 0 && (
          <p className="text-sm text-gray-600 dark:text-gray-300 text-center py-6">No results found.</p>
        )}
      </div>
    </div>
  );
}
