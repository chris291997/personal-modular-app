import { useMemo, useState } from 'react';
import { SIX_NUMBER_GAMES, getGameLabel } from '../../../services/lottoService';
import { GeneratedTicket, LottoGame, LottoGeneratorStrategy } from '../../../types';
import { useLottoStore } from '../../../stores/lottoStore';
import { generateTickets } from '../utils/generator';

const STRATEGIES: LottoGeneratorStrategy[] = ['balanced', 'hot', 'due', 'random'];
const DEFAULT_GAME: LottoGame = 'ultra_6_58';

export default function GeneratorTab() {
  const [game, setGame] = useState<LottoGame>(DEFAULT_GAME);
  const [strategy, setStrategy] = useState<LottoGeneratorStrategy>('balanced');
  const [ticketCount, setTicketCount] = useState(5);
  const [generating, setGenerating] = useState(false);
  const [generatedByGame, setGeneratedByGame] = useState<Partial<Record<LottoGame, GeneratedTicket[]>>>({});

  const { draws, loading, addBet, loadDraws } = useLottoStore();

  const visibleGames = useMemo(() => SIX_NUMBER_GAMES, []);

  const ensureDrawData = async () => {
    if (draws.length === 0) {
      await loadDraws(undefined, true);
    }
  };

  const handleGenerateOne = async (selectedGame: LottoGame) => {
    setGenerating(true);
    await ensureDrawData();
    const baseDraws = draws.length > 0 ? draws : useLottoStore.getState().draws;
    const generated = generateTickets(baseDraws, {
      game: selectedGame,
      strategy,
      ticketCount,
    });

    setGeneratedByGame(prev => ({
      ...prev,
      [selectedGame]: generated,
    }));
    setGenerating(false);
  };

  const handleGenerateAll = async () => {
    setGenerating(true);
    await ensureDrawData();
    const baseDraws = draws.length > 0 ? draws : useLottoStore.getState().draws;
    const nextGenerated: Partial<Record<LottoGame, GeneratedTicket[]>> = {};

    visibleGames.forEach(selectedGame => {
      nextGenerated[selectedGame] = generateTickets(baseDraws, {
        game: selectedGame,
        strategy,
        ticketCount,
      });
    });

    setGeneratedByGame(nextGenerated);
    setGenerating(false);
  };

  const handleSaveTicket = async (selectedGame: LottoGame, numbers: number[]) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    await addBet({
      game: selectedGame,
      drawDate: tomorrow,
      pickedNumbers: numbers,
      amount: undefined,
      source: 'generated',
      strategyUsed: strategy,
    });
    alert('Generated ticket saved to My Bets.');
  };

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 md:p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        <div>
          <label htmlFor="generator-game" className="block text-sm mb-1 text-gray-700 dark:text-gray-300">
            Game
          </label>
          <select
            id="generator-game"
            value={game}
            onChange={event => setGame(event.target.value as LottoGame)}
            className="w-full px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-sm"
          >
            {visibleGames.map(item => (
              <option key={item} value={item}>
                {getGameLabel(item)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="generator-strategy" className="block text-sm mb-1 text-gray-700 dark:text-gray-300">
            Strategy
          </label>
          <select
            id="generator-strategy"
            value={strategy}
            onChange={event => setStrategy(event.target.value as LottoGeneratorStrategy)}
            className="w-full px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-sm"
          >
            {STRATEGIES.map(item => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="generator-ticket-count" className="block text-sm mb-1 text-gray-700 dark:text-gray-300">
            Ticket Count
          </label>
          <input
            id="generator-ticket-count"
            type="number"
            min={1}
            max={20}
            value={ticketCount}
            onChange={event => setTicketCount(Math.max(1, Math.min(20, Number(event.target.value) || 1)))}
            className="w-full px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-sm"
          />
        </div>

        <div className="flex items-end gap-2">
          <button
            onClick={() => handleGenerateOne(game)}
            disabled={generating}
            className="flex-1 px-3 py-2 rounded-lg bg-purple-600 text-white text-sm disabled:bg-gray-500"
          >
            {generating ? 'Generating...' : 'Generate Selected Game'}
          </button>
          <button
            onClick={handleGenerateAll}
            disabled={generating}
            className="flex-1 px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm disabled:bg-gray-500"
          >
            Generate All Games
          </button>
          <button
            onClick={() => setGeneratedByGame({})}
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-200"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {visibleGames.map(selectedGame => {
          const tickets = generatedByGame[selectedGame] || [];
          return (
            <div
              key={selectedGame}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 md:p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm md:text-base font-semibold text-gray-900 dark:text-gray-100">
                  {getGameLabel(selectedGame)}
                </h3>
                <button
                  onClick={() => handleGenerateOne(selectedGame)}
                  disabled={generating}
                  className="px-3 py-1.5 rounded-lg bg-purple-600 text-white text-xs hover:bg-purple-700 disabled:bg-gray-500"
                >
                  Regenerate
                </button>
              </div>

              {tickets.length === 0 ? (
                <p className="text-sm text-gray-600 dark:text-gray-300">No generated numbers yet for this game.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {tickets.map((ticket, index) => (
                    <div
                      key={`${selectedGame}-${ticket.numbers.join('-')}-${index}`}
                      className="rounded-lg border border-gray-200 dark:border-gray-700 p-3"
                    >
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Ticket #{index + 1} · score {ticket.score}
                      </p>
                      <p className="font-mono text-lg text-gray-900 dark:text-gray-100 mt-2">
                        {ticket.numbers.join(' - ')}
                      </p>
                      <button
                        onClick={() => handleSaveTicket(selectedGame, ticket.numbers)}
                        className="mt-3 px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700"
                      >
                        Save to My Bets
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {Object.keys(generatedByGame).length === 0 && !loading.draws && (
        <p className="text-sm text-gray-600 dark:text-gray-300 text-center py-6">
          No generated tickets yet. Generate selected game or all game types.
        </p>
      )}
      {loading.draws && (
        <p className="text-sm text-gray-600 dark:text-gray-300 text-center py-6">
          Loading draw data...
        </p>
      )}
    </div>
  );
}
