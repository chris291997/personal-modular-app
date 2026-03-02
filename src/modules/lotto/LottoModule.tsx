import { useEffect, useState } from 'react';
import { Dice6, History, Bell, BarChart3, ListChecks } from 'lucide-react';
import { useLottoStore } from '../../stores/lottoStore';
import ResultsTab from './components/ResultsTab';
import GeneratorTab from './components/GeneratorTab';
import BetsTab from './components/BetsTab';
import RemindersTab from './components/RemindersTab';
import HistoricalResultsTab from './components/HistoricalResultsTab';

type TabId = 'results' | 'history' | 'generator' | 'bets' | 'reminders';

export default function LottoModule() {
  const [activeTab, setActiveTab] = useState<TabId>('results');
  const { loadDraws, loadBets, loadReminders } = useLottoStore();

  useEffect(() => {
    loadDraws();
    loadBets();
    loadReminders();
  }, [loadDraws, loadBets, loadReminders]);

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'results', label: 'Results', icon: <BarChart3 className="w-full h-full" /> },
    { id: 'history', label: 'Historical', icon: <ListChecks className="w-full h-full" /> },
    { id: 'generator', label: 'Generator', icon: <Dice6 className="w-full h-full" /> },
    { id: 'bets', label: 'My Bets', icon: <History className="w-full h-full" /> },
    { id: 'reminders', label: 'Reminders', icon: <Bell className="w-full h-full" /> },
  ];

  return (
    <div className="w-full space-y-4 md:space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-xl md:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 dark:from-purple-400 dark:to-indigo-400 bg-clip-text text-transparent">
          Lotto Insights
        </h1>
        <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
          Track official draw results, generate picks, store your bets, and set reminders.
        </p>
      </div>

      <div className="w-full bg-white dark:bg-gray-800 rounded-xl md:rounded-2xl p-1 md:p-2 shadow-lg border border-gray-200 dark:border-gray-700 overflow-x-auto">
        <div className="flex space-x-1 md:space-x-2 min-w-max md:justify-center md:min-w-0">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center justify-center sm:justify-start space-x-1 md:space-x-2 px-2 sm:px-3 md:px-4 py-2 md:py-2.5 rounded-lg md:rounded-xl text-xs md:text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 min-w-[2.5rem] sm:min-w-0 ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <span className="flex items-center justify-center w-4 h-4 md:w-5 md:h-5 flex-shrink-0 [&>svg]:w-full [&>svg]:h-full">
                {tab.icon}
              </span>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="w-full">
        {activeTab === 'results' && <ResultsTab />}
        {activeTab === 'history' && <HistoricalResultsTab />}
        {activeTab === 'generator' && <GeneratorTab />}
        {activeTab === 'bets' && <BetsTab />}
        {activeTab === 'reminders' && <RemindersTab />}
      </div>
    </div>
  );
}
