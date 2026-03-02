import { GeneratedTicket, LottoDrawResult, LottoGame, LottoGeneratorStrategy } from '../../../types';

interface GenerateOptions {
  game: LottoGame;
  strategy: LottoGeneratorStrategy;
  ticketCount: number;
}

const SIX_DIGIT_GAMES: Record<LottoGame, { poolMax: number; pickCount: number }> = {
  ultra_6_58: { poolMax: 58, pickCount: 6 },
  grand_6_55: { poolMax: 55, pickCount: 6 },
  super_6_49: { poolMax: 49, pickCount: 6 },
  mega_6_45: { poolMax: 45, pickCount: 6 },
  lotto_6_42: { poolMax: 42, pickCount: 6 },
  '6d': { poolMax: 9, pickCount: 6 },
  '4d': { poolMax: 9, pickCount: 4 },
  '3d_2pm': { poolMax: 9, pickCount: 3 },
  '3d_5pm': { poolMax: 9, pickCount: 3 },
  '3d_9pm': { poolMax: 9, pickCount: 3 },
  '2d_2pm': { poolMax: 9, pickCount: 2 },
  '2d_5pm': { poolMax: 9, pickCount: 2 },
  '2d_9pm': { poolMax: 9, pickCount: 2 },
};

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

const normalize = (value: number, min: number, max: number): number => {
  if (max === min) return 0.5;
  return (value - min) / (max - min);
};

const sampleWeighted = (weighted: { number: number; weight: number }[]): number => {
  const total = weighted.reduce((sum, item) => sum + item.weight, 0);
  if (total <= 0) {
    return weighted[Math.floor(Math.random() * weighted.length)].number;
  }
  let cursor = Math.random() * total;
  for (const item of weighted) {
    cursor -= item.weight;
    if (cursor <= 0) return item.number;
  }
  return weighted[weighted.length - 1].number;
};

const validateTicket = (numbers: number[], poolMax: number): boolean => {
  if (numbers.length === 6 && poolMax >= 42) {
    const sorted = [...numbers].sort((a, b) => a - b);
    const oddCount = sorted.filter(n => n % 2 !== 0).length;
    const lowCount = sorted.filter(n => n <= Math.floor(poolMax / 2)).length;

    // Statistically, the vast majority of real draws have 2–4 odds and 2–4 lows.
    if (oddCount < 2 || oddCount > 4) return false;
    if (lowCount < 2 || lowCount > 4) return false;

    // Reject runs of 3+ consecutive numbers (e.g. 5-6-7) — very rare in real draws.
    let maxRun = 1;
    let run = 1;
    for (let i = 1; i < sorted.length; i += 1) {
      run = sorted[i] === sorted[i - 1] + 1 ? run + 1 : 1;
      maxRun = Math.max(maxRun, run);
    }
    if (maxRun >= 3) return false;
  }
  return true;
};

/**
 * Derives a per-number score for each strategy.
 *
 * Two clean signals extracted from draw history (draws[0] = most recent):
 *
 *   freqScore   — normalised historical frequency (0 = rarest, 1 = most common)
 *   recencyScore — how recently the number appeared (1 = in the latest draw, 0 = never / long ago)
 *   overdueScore — inverse of recency (1 = not seen in a long time, 0 = just appeared)
 *
 * Strategy weights:
 *   hot      → high frequency + high recency  (numbers on a "hot streak")
 *   due      → high frequency + high overdue  (historically active but currently "cold")
 *   balanced → frequency-dominant, light recency bias (moderate, avoids extremes)
 *   random   → all weights equal → uniform random sampling (history is irrelevant)
 */
const deriveScores = (
  draws: LottoDrawResult[],
  poolMax: number,
  strategy: LottoGeneratorStrategy,
): Map<number, number> => {
  const frequency = new Map<number, number>();
  // lastSeenAt stores the draw-index (0 = most recent) of each number's most recent appearance.
  // Default is draws.length (sentinel for "never appeared").
  const lastSeenAt = new Map<number, number>();

  for (let i = 1; i <= poolMax; i += 1) {
    frequency.set(i, 0);
    lastSeenAt.set(i, draws.length);
  }

  // draws is sorted most-recent-first (index 0 = latest draw).
  draws.forEach((draw, idx) => {
    draw.combination.forEach(num => {
      if (!frequency.has(num)) return;
      frequency.set(num, (frequency.get(num) ?? 0) + 1);
      // Keep the smallest (most recent) index.
      if (idx < (lastSeenAt.get(num) ?? draws.length)) {
        lastSeenAt.set(num, idx);
      }
    });
  });

  const freqValues = Array.from(frequency.values());
  const minFreq = Math.min(...freqValues);
  const maxFreq = Math.max(...freqValues);
  // horizon = the furthest back we look; used to normalise lastSeenAt.
  const horizon = Math.max(1, draws.length);

  const scores = new Map<number, number>();

  for (let num = 1; num <= poolMax; num += 1) {
    const freq      = frequency.get(num)  ?? 0;
    const lastSeen  = lastSeenAt.get(num) ?? draws.length;

    // freqScore: 0 = least frequent, 1 = most frequent.
    const freqScore = normalize(freq, minFreq, maxFreq);

    // recencyScore: 1 = appeared in the most recent draw, 0 = never / oldest.
    //   lastSeen=0  → 1 - 0/horizon = 1.0  (very recent)
    //   lastSeen=horizon → 1 - 1 = 0.0     (never seen)
    const recencyScore = 1 - lastSeen / horizon;

    // overdueScore is the exact inverse — numbers not seen in a long time score high.
    const overdueScore = 1 - recencyScore;

    let score: number;

    switch (strategy) {
      case 'hot':
        // Favour numbers appearing frequently AND recently.
        // Both signals point in the same direction — no internal contradiction.
        score = 0.5 * freqScore + 0.5 * recencyScore;
        break;

      case 'due':
        // Favour historically active numbers that have recently gone cold.
        // freqScore ensures the number has a genuine history; overdueScore measures its absence.
        score = 0.35 * freqScore + 0.65 * overdueScore;
        break;

      case 'balanced':
        // Frequency-dominant with a light recency tiebreaker.
        // Avoids the extremes of hot/due while still using real historical signal.
        score = 0.65 * freqScore + 0.35 * recencyScore;
        break;

      case 'random':
      default:
        // All numbers get the same base weight → uniform random selection.
        // We add a tiny per-call noise so that multiple tickets don't all pick
        // the same "tied" numbers, without biasing toward any historical pattern.
        score = 1.0 + Math.random() * 0.001;
        break;
    }

    scores.set(num, clamp(score, 0.01, 1));
  }

  return scores;
};

const isRecentDuplicate = (candidate: number[], recentDraws: LottoDrawResult[]): boolean => {
  const key = [...candidate].sort((a, b) => a - b).join('-');
  return recentDraws.some(draw => [...draw.combination].sort((a, b) => a - b).join('-') === key);
};

export const generateTickets = (
  draws: LottoDrawResult[],
  options: GenerateOptions,
): GeneratedTicket[] => {
  const config = SIX_DIGIT_GAMES[options.game];

  // Use up to 2 years of draws for the strategy. More history = more stable frequency counts.
  const relevantDraws = draws
    .filter(draw => draw.game === options.game)
    .sort((a, b) => b.drawDate.getTime() - a.drawDate.getTime())
    .slice(0, 300);

  const scores = deriveScores(relevantDraws, config.poolMax, options.strategy);
  const tickets: GeneratedTicket[] = [];
  const usedSignatures = new Set<string>();
  // Give the generator plenty of breathing room; validateTicket can reject a lot.
  const maxAttempts = Math.max(500, options.ticketCount * 100);
  let attempts = 0;

  while (tickets.length < options.ticketCount && attempts < maxAttempts) {
    attempts += 1;
    const selected = new Set<number>();

    while (selected.size < config.pickCount) {
      const candidates = Array.from({ length: config.poolMax }, (_, i) => i + 1)
        .filter(n => !selected.has(n))
        .map(n => ({ number: n, weight: scores.get(n) ?? 0.1 }));
      selected.add(sampleWeighted(candidates));
    }

    const numbers = Array.from(selected).sort((a, b) => a - b);
    const signature = numbers.join('-');

    if (usedSignatures.has(signature)) continue;
    if (!validateTicket(numbers, config.poolMax)) continue;
    // Don't suggest a combination that already won in the last 30 draws.
    if (isRecentDuplicate(numbers, relevantDraws.slice(0, 30))) continue;

    const avgScore = numbers.reduce((sum, n) => sum + (scores.get(n) ?? 0), 0) / numbers.length;

    usedSignatures.add(signature);
    tickets.push({
      numbers,
      score: Number(avgScore.toFixed(4)),
      strategy: options.strategy,
    });
  }

  return tickets;
};

export const getGameConfig = (game: LottoGame): { poolMax: number; pickCount: number } => SIX_DIGIT_GAMES[game];
