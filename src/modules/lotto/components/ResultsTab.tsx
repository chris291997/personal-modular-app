import { useMemo, useState } from 'react';
import { DEFAULT_LOTTO_GAMES, getGameLabel, isKnownGame, SIX_NUMBER_GAMES } from '../../../services/lottoService';
import { LottoGame } from '../../../types';
import { useLottoStore } from '../../../stores/lottoStore';

/** Color accent per game for the latest-draw cards */
const GAME_ACCENT: Partial<Record<LottoGame, { border: string; badge: string; ball: string }>> = {
  ultra_6_58: { border: 'border-red-300 dark:border-red-800',    badge: 'bg-red-500',    ball: 'bg-red-500'    },
  grand_6_55: { border: 'border-orange-300 dark:border-orange-800', badge: 'bg-orange-500', ball: 'bg-orange-500' },
  super_6_49: { border: 'border-yellow-300 dark:border-yellow-800', badge: 'bg-yellow-500', ball: 'bg-yellow-500' },
  mega_6_45:  { border: 'border-green-300 dark:border-green-800',  badge: 'bg-green-500',  ball: 'bg-green-500'  },
  lotto_6_42: { border: 'border-blue-300 dark:border-blue-800',   badge: 'bg-blue-500',   ball: 'bg-blue-500'   },
};

function LatestDrawCard({ game, draws }: { game: LottoGame; draws: ReturnType<typeof useLottoStore>['draws'] }) {
  const latest = useMemo(
    () => draws
      .filter(d => d.game === game)
      .sort((a, b) => b.drawDate.getTime() - a.drawDate.getTime())[0],
    [draws, game]
  );

  const accent = GAME_ACCENT[game];

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl border ${accent?.border ?? 'border-gray-200 dark:border-gray-700'} p-3 flex-shrink-0 w-52 md:w-auto`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full text-white ${accent?.badge ?? 'bg-purple-500'}`}>
          {getGameLabel(game)}
        </span>
        {latest && (
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {latest.drawDate.toLocaleDateString()}
          </span>
        )}
      </div>

      {latest ? (
        <>
          <div className="flex flex-wrap gap-1.5 my-2">
            {latest.combination.map(n => (
              <div
                key={n}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm ${accent?.ball ?? 'bg-purple-500'}`}
              >
                {n}
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Jackpot: <span className="font-medium text-gray-700 dark:text-gray-300">
              {latest.jackpot != null ? `₱${latest.jackpot.toLocaleString()}` : 'N/A'}
            </span>
            {latest.winners != null && <> · {latest.winners} winner{latest.winners !== 1 ? 's' : ''}</>}
          </p>
        </>
      ) : (
        <p className="text-xs text-gray-400 dark:text-gray-500 py-4 text-center">No data yet</p>
      )}
    </div>
  );
}

export default function ResultsTab() {
  const [game, setGame] = useState<LottoGame | 'all'>('all');
  const { draws, loading, loadDraws } = useLottoStore();

  const filtered = useMemo(() => {
    const known = draws.filter(item => isKnownGame(item.game));
    return game === 'all' ? known : known.filter(item => item.game === game);
  }, [draws, game]);

  return (
    <div className="space-y-4">

      {/* ── Latest Draw per game (dashboard strip) ── */}
      <div>
        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 px-0.5">
          Latest Draw Results
        </h3>
        {/* Outer wrapper handles the horizontal scroll on mobile */}
        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 pb-2">
          {/* Inner: flex row on mobile (min-w-max prevents squishing), grid on md+ */}
          <div className="flex gap-3 min-w-max md:min-w-0 md:grid md:grid-cols-3 lg:grid-cols-5">
            {SIX_NUMBER_GAMES.map(g => (
              <LatestDrawCard key={g} game={g} draws={draws} />
            ))}
          </div>
        </div>
      </div>

      {/* ── Filter + sync bar ── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 md:p-4 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <label htmlFor="lotto-game-filter" className="text-sm text-gray-700 dark:text-gray-300">
            Filter
          </label>
          <select
            id="lotto-game-filter"
            value={game}
            onChange={event => setGame(event.target.value as LottoGame | 'all')}
            className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-sm"
          >
            <option value="all">All games</option>
            {DEFAULT_LOTTO_GAMES.map(item => (
              <option key={item} value={item}>{getGameLabel(item)}</option>
            ))}
          </select>
        </div>
        <button
          onClick={() => loadDraws(undefined, true)}
          className="px-3 py-2 rounded-lg bg-purple-600 text-white text-sm hover:bg-purple-700 transition-colors"
        >
          Sync Latest
        </button>
      </div>

      {/* ── Mobile card list ── */}
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
              Jackpot: {draw.jackpot != null ? `₱${draw.jackpot.toLocaleString()}` : 'N/A'} | Winners: {draw.winners ?? 'N/A'}
            </p>
          </div>
        ))}
        {!loading.draws && filtered.length === 0 && (
          <p className="text-sm text-gray-600 dark:text-gray-300 text-center py-6">No results found.</p>
        )}
      </div>

      {/* ── Desktop table ── */}
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
                  {draw.jackpot != null ? `₱${draw.jackpot.toLocaleString()}` : 'N/A'}
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
