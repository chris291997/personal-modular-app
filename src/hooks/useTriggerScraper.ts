import { useState, useEffect } from 'react';
import { getSiteSettings, ScraperMode } from '../services/siteSettingsService';

type TriggerStatus = 'idle' | 'loading' | 'success' | 'error';

interface SlotUsage {
  day:   string; // PHT date string (YYYY-MM-DD) when day slot was last used
  night: string; // PHT date string when night slot was last used
}

const STORAGE_KEY = 'lotto_scraper_slot_usage';

/** Returns current date/hour in PHT (UTC+8). */
function getPHT(): { dateStr: string; hour: number } {
  const now = new Date();
  // Shift to PHT by adding 8h worth of ms, then read as if it were UTC
  const pht = new Date(now.getTime() + (8 * 60 - now.getTimezoneOffset()) * 60_000);
  const dateStr = pht.toISOString().slice(0, 10); // YYYY-MM-DD
  return { dateStr, hour: pht.getUTCHours() };
}

/**
 * Day slot:   08:00–16:59 PHT
 * Night slot: 17:00–23:59 PHT + 00:00–00:59 PHT (midnight carry-over)
 * Outside:    01:00–07:59 PHT — no slot, button disabled
 */
function getCurrentSlot(): 'day' | 'night' | null {
  const { hour } = getPHT();
  if (hour >= 8 && hour < 17)  return 'day';
  if (hour >= 17 || hour === 0) return 'night';
  return null; // 1:00 AM – 7:59 AM, outside allowed windows
}

function loadUsage(): SlotUsage {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as SlotUsage;
  } catch {
    return { morning: '', evening: '' };
  }
}

function saveUsage(usage: SlotUsage) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(usage));
}

export function useTriggerScraper() {
  const [status, setStatus] = useState<TriggerStatus>('idle');
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [slotUsed, setSlotUsed] = useState(false);
  const [slotLabel, setSlotLabel] = useState('');
  const [scraperMode, setScraperMode] = useState<ScraperMode>('timed');

  // Load scraper mode from site settings once on mount
  useEffect(() => {
    getSiteSettings().then(s => setScraperMode(s.scraperMode)).catch(() => {});
  }, []);

  // Evaluate whether current slot was already triggered today (only relevant in 'timed' mode)
  useEffect(() => {
    function evaluate() {
      const { dateStr } = getPHT();
      const slot = getCurrentSlot();
      const usage = loadUsage();
      const used = slot !== null && usage[slot] === dateStr;
      setSlotUsed(used);
      setSlotLabel(
        slot === 'day'   ? 'today (day)'   :
        slot === 'night' ? 'tonight'        :
        'outside hours'
      );
    }
    evaluate();
    // Re-evaluate every minute so slot switches automatically
    const interval = setInterval(evaluate, 60_000);
    return () => clearInterval(interval);
  }, []);

  async function trigger(months_back = '1') {
    const slot = getCurrentSlot();
    if (scraperMode === 'timed' && (slotUsed || slot === null)) return; // guard
    if (status === 'loading') return;

    setStatus('loading');
    setFeedbackMsg('');
    try {
      const res = await fetch('/api/trigger-scraper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ months_back }),
      });
      const data = await res.json() as { ok?: boolean; message?: string; error?: string };

      if (res.ok && data.ok) {
        // In timed mode, mark this slot as used for today
        if (scraperMode === 'timed' && slot) {
          const { dateStr } = getPHT();
          const usage = loadUsage();
          usage[slot] = dateStr;
          saveUsage(usage);
          setSlotUsed(true);
        }
        setStatus('success');
        setFeedbackMsg(
          scraperMode === 'always'
            ? 'Scraper triggered! Results will appear in ~2 minutes. Tap Reload to refresh.'
            : 'Scraper triggered! Results will appear in ~2 minutes. This slot is now locked until next window.'
        );
      } else {
        setStatus('error');
        setFeedbackMsg(data.error ?? 'Failed to trigger scraper.');
      }
    } catch {
      setStatus('error');
      setFeedbackMsg('Network error — could not reach the server.');
    }
    // Reset button appearance after 5 s (slot lock persists independently)
    setTimeout(() => {
      setStatus('idle');
      setFeedbackMsg('');
    }, 5000);
  }

  const outsideHours = scraperMode === 'timed' && getCurrentSlot() === null;
  const slotAlreadyUsed = scraperMode === 'timed' && slotUsed;
  const isDisabled = slotAlreadyUsed || outsideHours || status === 'loading';

  const buttonLabel =
    status === 'loading'  ? 'Triggering…' :
    status === 'success'  ? '✓ Triggered' :
    status === 'error'    ? '✗ Failed' :
    outsideHours          ? 'Available 8AM–5PM / 5PM–1AM' :
    slotAlreadyUsed       ? `Already run ${slotLabel}` :
                            'Run Scraper';

  const buttonClass =
    isDisabled            ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed' :
    status === 'success'  ? 'bg-green-600 hover:bg-green-700 text-white' :
    status === 'error'    ? 'bg-red-600 hover:bg-red-700 text-white' :
                            'bg-purple-600 hover:bg-purple-700 text-white';

  return { trigger, status, feedbackMsg, isDisabled, buttonLabel, buttonClass };
}
