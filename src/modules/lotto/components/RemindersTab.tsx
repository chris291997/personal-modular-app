import { DEFAULT_LOTTO_GAMES, getGameLabel } from '../../../services/lottoService';
import { LottoGame } from '../../../types';
import { useLottoStore } from '../../../stores/lottoStore';
import { getNextDrawDate } from '../utils/schedule';

export default function RemindersTab() {
  const { reminders, upsertReminder } = useLottoStore();

  const getReminder = (game: LottoGame) =>
    reminders.find(item => item.game === game) || {
      game,
      enabled: false,
      remindDaysBefore: 1,
      notifyTime: '20:00',
      channels: ['in_app', 'push'] as const,
    };

  return (
    <div className="space-y-3">
      {DEFAULT_LOTTO_GAMES.map(game => {
        const current = getReminder(game);
        const nextDraw = getNextDrawDate(game);

        return (
          <div
            key={game}
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 md:p-4"
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{getGameLabel(game)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Next draw: {nextDraw.toLocaleString()} (local time)
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:items-end">
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={current.enabled}
                    onChange={event =>
                      upsertReminder({
                        game,
                        enabled: event.target.checked,
                        remindDaysBefore: current.remindDaysBefore,
                        notifyTime: current.notifyTime,
                        channels: [...current.channels],
                      })
                    }
                  />
                  Enabled
                </label>

                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Days before</label>
                  <input
                    type="number"
                    min={1}
                    max={7}
                    value={current.remindDaysBefore}
                    onChange={event =>
                      upsertReminder({
                        game,
                        enabled: current.enabled,
                        remindDaysBefore: Number(event.target.value) || 1,
                        notifyTime: current.notifyTime,
                        channels: [...current.channels],
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Time</label>
                  <input
                    type="time"
                    value={current.notifyTime}
                    onChange={event =>
                      upsertReminder({
                        game,
                        enabled: current.enabled,
                        remindDaysBefore: current.remindDaysBefore,
                        notifyTime: event.target.value,
                        channels: [...current.channels],
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-sm"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-500 dark:text-gray-400">Push</label>
                  <input
                    type="checkbox"
                    checked={current.channels.includes('push')}
                    onChange={event => {
                      const channels = event.target.checked
                        ? Array.from(new Set([...current.channels, 'push']))
                        : current.channels.filter(item => item !== 'push');
                      upsertReminder({
                        game,
                        enabled: current.enabled,
                        remindDaysBefore: current.remindDaysBefore,
                        notifyTime: current.notifyTime,
                        channels,
                      });
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
