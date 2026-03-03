import { useEffect, useMemo, useState } from 'react';
import { DEFAULT_LOTTO_GAMES, getGameLabel, isKnownGame, SIX_NUMBER_GAMES } from '../../../services/lottoService';
import { LottoDrawResult, LottoGame } from '../../../types';
import { useLottoStore } from '../../../stores/lottoStore';
import { useTriggerScraper } from '../../../hooks/useTriggerScraper';
import { getMatchingBets } from '../utils/prizes';
import { Trophy } from 'lucide-react';

const GAME_ACCENT: Partial<Record<LottoGame, { border: string; badge: string; ball: string }>> = {
  ultra_6_58: { border: 'border-red-300 dark:border-red-800',    badge: 'bg-red-500',    ball: 'bg-red-500'    },
  grand_6_55: { border: 'border-orange-300 dark:border-orange-800', badge: 'bg-orange-500', ball: 'bg-orange-500' },
  super_6_49: { border: 'border-yellow-300 dark:border-yellow-800', badge: 'bg-yellow-500', ball: 'bg-yellow-500' },
  mega_6_45:  { border: 'border-green-300 dark:border-green-800',  badge: 'bg-green-500',  ball: 'bg-green-500'  },
  lotto_6_42: { border: 'border-blue-300 dark:border-blue-800',   badge: 'bg-blue-500',   ball: 'bg-blue-500'   },
};

function Ball({ n, hit, accent }: { n: number; hit?: boolean; accent?: string }) {
  return (
    <div
      className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shadow-sm relative ${
        hit ? 'ring-2 ring-green-400 ring-offset-1 dark:ring-offset-gray-800' : ''
      } ${accent ?? 'bg-purple-500'}`}
      title={hit ? 'Your number!' : undefined}
    >
      {n}
    </div>
  );
}

function LatestDrawCard({
  game,
  draws,
  matchResults,
}: {
  game: LottoGame;
  draws: LottoDrawResult[];
  matchResults: Map<string, { hitNumbers: Set<number>; matchedCount: number; isWin: boolean; prizeLabel: string; prizeAmount: number; prizeShared: boolean }[]>;
}) {
  const latest = useMemo(
    () => draws
      .filter((d: LottoDrawResult) => d.game === game)
      .sort((a: LottoDrawResult, b: LottoDrawResult) => b.drawDate.getTime() - a.drawDate.getTime())[0],
    [draws, game]
  );
  const accent = GAME_ACCENT[game];
  const results = latest ? matchResults.get(latest.id) ?? [] : [];

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
            {latest.combination.map((n: number) => {
              const hitByAny = results.some(r => r.hitNumbers.has(n));
              return (
                <div key={n} className="relative">
                  <Ball n={n} hit={hitByAny} accent={accent?.ball} />
                </div>
              );
            })}
          </div>
          {results.length > 0 && (
            <p className="text-xs font-medium text-green-600 dark:text-green-400 mb-1">
              Your bet{results.length > 1 ? 's' : ''}: {results.map(r => `${r.matchedCount}/6 hit`).join(', ')}
              {results.some(r => r.isWin) && ' 🎉'}
            </p>
          )}
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
  const { draws, bets, loading, loadDraws, loadBets, updateBet } = useLottoStore();
  const { trigger, feedbackMsg, isDisabled, buttonLabel, buttonClass } = useTriggerScraper();

  useEffect(() => {
    loadBets(true);
  }, [loadBets]);

  const filtered = useMemo(() => {
    const known = draws.filter(item => isKnownGame(item.game));
    return game === 'all' ? known : known.filter(item => item.game === game);
  }, [draws, game]);

  const matchResultsByDrawId = useMemo(() => {
    const map = new Map<string, { hitNumbers: Set<number>; matchedCount: number; isWin: boolean; prizeLabel: string; prizeAmount: number; prizeShared: boolean }[]>();
    for (const draw of draws) {
      const results = getMatchingBets(draw, bets);
      if (results.length > 0) {
        map.set(draw.id, results.map(r => ({
          hitNumbers: r.hitNumbers,
          matchedCount: r.matchedCount,
          isWin: r.isWin,
          prizeLabel: r.prizeLabel,
          prizeAmount: r.prizeAmount,
          prizeShared: r.prizeShared,
        })));
      }
    }
    return map;
  }, [draws, bets]);

  const allWins = useMemo(() => {
    const wins: { draw: LottoDrawResult; matchedCount: number; prizeLabel: string; prizeAmount: number; prizeShared: boolean; betNumbers: number[] }[] = [];
    for (const draw of draws) {
      const results = getMatchingBets(draw, bets).filter(r => r.isWin);
      for (const r of results) {
        wins.push({
          draw,
          matchedCount: r.matchedCount,
          prizeLabel: r.prizeLabel,
          prizeAmount: r.prizeAmount,
          prizeShared: r.prizeShared,
          betNumbers: r.bet.pickedNumbers,
        });
      }
    }
    return wins;
  }, [draws, bets]);

  useEffect(() => {
    for (const draw of draws) {
      const results = getMatchingBets(draw, bets);
      for (const r of results) {
        if (r.bet.resultStatus === 'pending' && (r.bet.matchedCount !== r.matchedCount || r.bet.winnings !== r.prizeAmount)) {
          updateBet(r.bet.id, {
            resultStatus: r.isWin ? 'won' : 'lost',
            matchedCount: r.matchedCount,
            winnings: r.isWin ? r.prizeAmount : undefined,
          });
        }
      }
    }
  }, [draws, bets, updateBet]);

  return (
    <div className="space-y-4">
      {/* ── Congratulations Banner (wins) ── */}
      {allWins.length > 0 && (
        <div className="bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-500 dark:from-amber-600 dark:via-yellow-600 dark:to-amber-600 rounded-xl p-4 md:p-6 shadow-lg border border-amber-300 dark:border-amber-700">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-full bg-white/30 flex items-center justify-center flex-shrink-0">
              <Trophy className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg md:text-xl font-bold text-white drop-shadow-sm">
                Congratulations! 🎉
              </h3>
              <p className="text-sm text-amber-50 mt-1">
                You won on {allWins.length} bet{allWins.length > 1 ? 's' : ''}!
              </p>
              <ul className="mt-3 space-y-2">
                {allWins.map((w, i) => (
                  <li key={i} className="text-sm bg-white/20 rounded-lg px-3 py-2 text-white">
                    <span className="font-semibold">{getGameLabel(w.draw.game)}</span>
                    {' '}({w.draw.drawDate.toLocaleDateString()}) — {w.prizeLabel}
                    <span className="font-bold ml-1">₱{w.prizeAmount.toLocaleString()}</span>
                    {w.prizeShared && (
                      <span className="text-amber-100 text-xs ml-1">(shared among winners)</span>
                    )}
                    <span className="text-amber-100 text-xs ml-2">
                      Your numbers: {w.betNumbers.join('-')}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="text-sm font-semibold text-white mt-2">
                Total winnings: ₱{allWins.reduce((s, w) => s + w.prizeAmount, 0).toLocaleString()}
                {allWins.some(w => w.prizeShared) && (
                  <span className="text-amber-100 text-xs font-normal ml-1">(2nd/3rd/Jackpot prizes shared among winners)</span>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

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
                <LatestDrawCard game={g} draws={draws} matchResults={matchResultsByDrawId} />
              </div>
            ))}
          </div>
        </div>

        {/* Desktop grid */}
        <div className="hidden md:grid md:grid-cols-3 lg:grid-cols-5 gap-3">
          {SIX_NUMBER_GAMES.map(g => (
            <LatestDrawCard key={g} game={g} draws={draws} matchResults={matchResultsByDrawId} />
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
          {filtered.map(draw => {
            const results = matchResultsByDrawId.get(draw.id) ?? [];
            const accent = GAME_ACCENT[draw.game as LottoGame];
            return (
              <div key={draw.id} className="p-3">
                <div className="flex justify-between mb-1">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{getGameLabel(draw.game)}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{draw.drawDate.toLocaleDateString()}</span>
                </div>
                <div className="flex flex-wrap gap-1.5 my-2">
                  {draw.combination.map((n: number) => {
                    const hit = results.some(r => r.hitNumbers.has(n));
                    return (
                      <Ball key={n} n={n} hit={hit} accent={accent?.ball} />
                    );
                  })}
                </div>
                {results.length > 0 && (
                  <p className="text-xs font-medium text-green-600 dark:text-green-400 mb-1">
                    Your bet{results.length > 1 ? 's' : ''}: {results.map(r => `${r.matchedCount}/6 hit`).join(', ')}
                    {results.some(r => r.isWin) && (
                      <> — Won ₱{results.filter(r => r.isWin).reduce((s, r) => s + r.prizeAmount, 0).toLocaleString()}!</>
                    )}
                  </p>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Jackpot {draw.jackpot != null ? `₱${draw.jackpot.toLocaleString()}` : 'N/A'}
                  {draw.winners != null && ` · ${draw.winners} winner${draw.winners !== 1 ? 's' : ''}`}
                </p>
              </div>
            );
          })}
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
                <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-300 font-medium">Your Bet</th>
                <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-300 font-medium">Jackpot</th>
                <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-300 font-medium">Winners</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(draw => {
                const results = matchResultsByDrawId.get(draw.id) ?? [];
                const accent = GAME_ACCENT[draw.game as LottoGame];
                return (
                  <tr key={draw.id} className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                    <td className="px-4 py-3 text-gray-900 dark:text-gray-100">{getGameLabel(draw.game)}</td>
                    <td className="px-4 py-3 text-gray-900 dark:text-gray-100">{draw.drawDate.toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {draw.combination.map((n: number) => {
                          const hit = results.some(r => r.hitNumbers.has(n));
                          return (
                            <Ball key={n} n={n} hit={hit} accent={accent?.ball} />
                          );
                        })}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {results.length > 0 ? (
                        <span className={results.some(r => r.isWin) ? 'font-semibold text-green-600 dark:text-green-400' : 'text-gray-700 dark:text-gray-300'}>
                          {results.map(r => `${r.matchedCount}/6 hit`).join(', ')}
                          {results.some(r => r.isWin) && (
                            <> — Won ₱{results.filter(r => r.isWin).reduce((s, r) => s + r.prizeAmount, 0).toLocaleString()}</>
                          )}
                        </span>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-900 dark:text-gray-100">{draw.jackpot != null ? `₱${draw.jackpot.toLocaleString()}` : 'N/A'}</td>
                    <td className="px-4 py-3 text-gray-900 dark:text-gray-100">{draw.winners ?? '—'}</td>
                  </tr>
                );
              })}
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
