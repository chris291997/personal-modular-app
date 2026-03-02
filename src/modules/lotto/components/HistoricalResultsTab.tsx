import { useMemo, useState } from 'react';
import { getGameLabel, SIX_NUMBER_GAMES } from '../../../services/lottoService';
import { LottoGame } from '../../../types';
import { useLottoStore } from '../../../stores/lottoStore';
import { useTriggerScraper } from '../../../hooks/useTriggerScraper';

const GAME_SHORT_LABELS: Record<LottoGame, string> = {
  lotto_6_42: '6/42',
  mega_6_45: '6/45',
  super_6_49: '6/49',
  grand_6_55: '6/55',
  ultra_6_58: '6/58',
  '6d': '6D',
  '4d': '4D',
  '3d_2pm': '3D 2PM',
  '3d_5pm': '3D 5PM',
  '3d_9pm': '3D 9PM',
  '2d_2pm': '2D 2PM',
  '2d_5pm': '2D 5PM',
  '2d_9pm': '2D 9PM',
};

export default function HistoricalResultsTab() {
  const { draws, loading, loadDraws } = useLottoStore();
  const [selectedGame, setSelectedGame] = useState<LottoGame>('lotto_6_42');
  const { trigger, feedbackMsg, isDisabled, buttonLabel, buttonClass } = useTriggerScraper();

  const grouped = useMemo(
    () =>
      SIX_NUMBER_GAMES.map(game => ({
        game,
        label: getGameLabel(game),
        rows: draws
          .filter(draw => draw.game === game)
          .sort((a, b) => b.drawDate.getTime() - a.drawDate.getTime())
          .slice(0, 50),
      })),
    [draws]
  );

  const selectedGroup = grouped.find(group => group.game === selectedGame) || grouped[0];

  return (
    <div className="space-y-4">
      {/* Game switcher */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 md:p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
          <h3 className="text-sm md:text-base font-semibold text-gray-900 dark:text-white">Quick Game Switcher</h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => loadDraws(undefined, true)}
              className="px-3 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              Reload
            </button>
            <button
              onClick={() => trigger('3')}
              disabled={isDisabled}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${buttonClass}`}
            >
              {buttonLabel}
            </button>
          </div>
        </div>
        {feedbackMsg && (
          <p className="text-xs mb-2 text-green-600 dark:text-green-400">{feedbackMsg}</p>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 md:gap-3">
          {SIX_NUMBER_GAMES.map(game => {
            const isActive = selectedGame === game;
            return (
              <button
                key={game}
                onClick={() => setSelectedGame(game)}
                className={`min-h-[48px] md:min-h-[56px] rounded-xl border text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white border-transparent shadow-md'
                    : 'bg-gray-50 dark:bg-gray-700/40 text-gray-800 dark:text-gray-100 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {GAME_SHORT_LABELS[game]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Results — normal page flow, footer stays visible via pb-24 in Layout */}
      <div>
        {selectedGroup && (
          <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/40 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-sm md:text-base font-semibold text-gray-900 dark:text-white">
                {selectedGroup.label} Historical Results
              </h3>
            </div>

            {selectedGroup.rows.length === 0 ? (
              <p className="px-4 py-6 text-sm text-gray-600 dark:text-gray-300">
                No historical results synced yet for this game.
              </p>
            ) : (
              /* max-h caps the table so only IT scrolls — the page itself never overflows,
                 which keeps the footer always visible without any flex height tricks. */
              <div className="overflow-x-auto overflow-y-auto max-h-[45vh]" style={{ WebkitOverflowScrolling: 'touch' }}>
                <table className="w-full text-sm min-w-[380px]">
                  <thead className="sticky top-0 bg-gray-50 dark:bg-gray-700 z-10">
                    <tr>
                      <th className="text-left px-4 py-2 text-gray-600 dark:text-gray-300">Draw Date</th>
                      <th className="text-left px-4 py-2 text-gray-600 dark:text-gray-300">Combination</th>
                      <th className="text-left px-4 py-2 text-gray-600 dark:text-gray-300">Jackpot</th>
                      <th className="text-left px-4 py-2 text-gray-600 dark:text-gray-300">Winners</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedGroup.rows.map(row => (
                      <tr key={row.id} className="border-t border-gray-100 dark:border-gray-700">
                        <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{row.drawDate.toLocaleDateString()}</td>
                        <td className="px-4 py-2 font-mono text-gray-900 dark:text-gray-100">{row.combination.join(' - ')}</td>
                        <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{row.jackpot?.toLocaleString() || 'N/A'}</td>
                        <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{row.winners ?? 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {loading.draws && (
          <p className="text-sm text-gray-600 dark:text-gray-300 text-center py-4">Loading...</p>
        )}
      </div>
    </div>
  );
}
