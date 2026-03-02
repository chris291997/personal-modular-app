import { useMemo, useState } from 'react';
import { DEFAULT_LOTTO_GAMES, getGameLabel, isKnownGame, SIX_NUMBER_GAMES } from '../../../services/lottoService';
import { LottoDrawResult, LottoGame } from '../../../types';
import { useLottoStore } from '../../../stores/lottoStore';
import { useTriggerScraper } from '../../../hooks/useTriggerScraper';

const GAME_ACCENT: Partial<Record<LottoGame, { border: string; badge: string; ball: string }>> = {
  ultra_6_58: { border: 'border-red-300 dark:border-red-800',    badge: 'bg-red-500',    ball: 'bg-red-500'    },
  grand_6_55: { border: 'border-orange-300 dark:border-orange-800', badge: 'bg-orange-500', ball: 'bg-orange-500' },
  super_6_49: { border: 'border-yellow-300 dark:border-yellow-800', badge: 'bg-yellow-500', ball: 'bg-yellow-500' },
  mega_6_45:  { border: 'border-green-300 dark:border-green-800',  badge: 'bg-green-500',  ball: 'bg-green-500'  },
  lotto_6_42: { border: 'border-blue-300 dark:border-blue-800',   badge: 'bg-blue-500',   ball: 'bg-blue-500'   },
};

function LatestDrawCard({ game, draws }: { game: LottoGame; draws: LottoDrawResult[] }) {
  const latest = useMemo(
    () => draws
      .filter((d: LottoDrawResult) => d.game === game)
      .sort((a: LottoDrawResult, b: LottoDrawResult) => b.drawDate.getTime() - a.drawDate.getTime())[0],
    [draws, game]
  );
  const accent = GAME_ACCENT[game];

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl border ${accent?.border ?? 'border-gray-200 dark:border-gray-700'} p-3`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full text-white ${accent?.badge ?? 'bg-purple-500'}`}>
          {getGameLabel(game)}
        </span>
        {latest && (
          <span className="text-xs text-gray-400 dark:text-gray-500">{latest.drawDate.toLocaleDateString()}</span>
        )}
      </div>
      {latest ? (
        <>
          <div className="flex flex-wrap gap-1.5 my-2">
            {latest.combination.map((n: number) => (
              <div key={n} className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shadow-sm ${accent?.ball ?? 'bg-purple-500'}`}>
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
  const { trigger, feedbackMsg, isDisabled, buttonLabel, buttonClass } = useTriggerScraper();

  const filtered = useMemo(() => {
    const known = draws.filter(item => isKnownGame(item.game));
    return game === 'all' ? known : known.filter(item => item.game === game);
  }, [draws, game]);

  return (
    <div className="space-y-4">
      {/* ── SECTION 1: Latest Draws ──
          Mobile: this div scrolls horizontally on its own. The page does NOT scroll sideways
          because html/body have overflow-x: hidden. Only this element scrolls horizontally.
          Desktop: grid layout, no scroll needed.
      */}
      <section>
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Latest Draws</h2>

        {/* Mobile horizontal scroll strip */}
        <div
          className="md:hidden overflow-x-auto pb-2"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {/* w-max makes this wider than the container → triggers horizontal scroll on parent */}
          <div className="flex gap-3 w-max">
            {SIX_NUMBER_GAMES.map(g => (
              <div key={g} className="w-56 flex-none">
                <LatestDrawCard game={g} draws={draws} />
              </div>
            ))}
          </div>
        </div>

        {/* Desktop grid */}
        <div className="hidden md:grid md:grid-cols-3 lg:grid-cols-5 gap-3">
          {SIX_NUMBER_GAMES.map(g => (
            <LatestDrawCard key={g} game={g} draws={draws} />
          ))}
        </div>
      </section>

      {/* ── SECTION 2: Draw History ──
          Normal block flow. Page scrolls vertically. Fixed footer always visible
          because Layout's <main> has pb-24 on mobile.
      */}
      <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Filter bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 md:p-4 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            Draw History <span className="text-gray-400 font-normal">({filtered.length})</span>
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            <select
              id="lotto-game-filter"
              value={game}
              onChange={e => setGame(e.target.value as LottoGame | 'all')}
              className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-sm"
            >
              <option value="all">All games</option>
              {DEFAULT_LOTTO_GAMES.map(item => (
                <option key={item} value={item}>{getGameLabel(item)}</option>
              ))}
            </select>
            {/* Reload from Firestore (already-scraped data) */}
            <button
              onClick={() => loadDraws(undefined, true)}
              className="px-3 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              Reload
            </button>
            {/* Trigger GitHub Actions scraper — limited to once per morning/evening slot */}
            <button
              onClick={() => trigger('1')}
              disabled={isDisabled}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${buttonClass}`}
            >
              {buttonLabel}
            </button>
          </div>
        </div>
        {feedbackMsg && (
          <p className="px-3 py-2 text-xs text-green-600 dark:text-green-400">{feedbackMsg}</p>
        )}

        {/* Mobile card list — flows in page, footer padding keeps it clear */}
        <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-700">
          {filtered.map(draw => (
            <div key={draw.id} className="p-3">
              <div className="flex justify-between mb-1">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{getGameLabel(draw.game)}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">{draw.drawDate.toLocaleDateString()}</span>
              </div>
              <p className="text-sm font-mono text-gray-900 dark:text-white">{draw.combination.join(' · ')}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Jackpot {draw.jackpot != null ? `₱${draw.jackpot.toLocaleString()}` : 'N/A'}
                {draw.winners != null && ` · ${draw.winners} winner${draw.winners !== 1 ? 's' : ''}`}
              </p>
            </div>
          ))}
          {!loading.draws && filtered.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">No results. Tap Sync.</p>
          )}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700/60">
              <tr>
                <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-300 font-medium">Game</th>
                <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-300 font-medium">Date</th>
                <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-300 font-medium">Combination</th>
                <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-300 font-medium">Jackpot</th>
                <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-300 font-medium">Winners</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(draw => (
                <tr key={draw.id} className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                  <td className="px-4 py-3 text-gray-900 dark:text-gray-100">{getGameLabel(draw.game)}</td>
                  <td className="px-4 py-3 text-gray-900 dark:text-gray-100">{draw.drawDate.toLocaleDateString()}</td>
                  <td className="px-4 py-3 font-mono text-gray-900 dark:text-gray-100">{draw.combination.join(' · ')}</td>
                  <td className="px-4 py-3 text-gray-900 dark:text-gray-100">{draw.jackpot != null ? `₱${draw.jackpot.toLocaleString()}` : 'N/A'}</td>
                  <td className="px-4 py-3 text-gray-900 dark:text-gray-100">{draw.winners ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading.draws && filtered.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-12">No results. Click Sync.</p>
          )}
        </div>
      </section>
    </div>
  );
}
