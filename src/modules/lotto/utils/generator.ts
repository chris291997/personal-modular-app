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

const percentile = (sorted: number[], p: number): number => {
  const idx = Math.floor(sorted.length * p);
  return sorted[Math.min(idx, sorted.length - 1)];
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

/**
 * Computes the empirical sum range from real historical draws.
 * We use the 12th–88th percentile (a wide band but still cuts the extreme tails).
 * Falls back to a theory-based estimate when there's not enough history.
 */
const computeSumRange = (
  draws: LottoDrawResult[],
  poolMax: number,
  pickCount: number,
): { min: number; max: number } => {
  const MIN_DRAWS = 30;
  if (draws.length >= MIN_DRAWS) {
    const sums = draws
      .map(d => d.combination.reduce((a, b) => a + b, 0))
      .sort((a, b) => a - b);
    return {
      min: percentile(sums, 0.12),
      max: percentile(sums, 0.88),
    };
  }
  // Theory fallback: expected sum = pickCount * (poolMax + 1) / 2, ± ~30%
  const mean = (pickCount * (poolMax + 1)) / 2;
  return { min: Math.round(mean * 0.70), max: Math.round(mean * 1.30) };
};

/**
 * Validates a ticket against empirical and structural filters.
 * Only applied to 6-ball games — 2D/3D/4D digit games have different structure.
 *
 * Filters applied:
 *  1. Sum range     — combination must fall within the historical 12th–88th percentile
 *  2. Odd/Even      — 2 to 4 odd numbers (rejects pure all-odd or all-even)
 *  3. Low/High      — 2 to 4 "low" numbers (≤ mid-pool); rejects bunching at one end
 *  4. No 3+ runs    — rejects sequences like 5-6-7 (very rare in real draws)
 *  5. Group spread  — divides pool into 6 equal bands; no band contributes > 2 numbers
 *                     (prevents all 6 numbers bunching in one section of the pool)
 */
const validateTicket = (
  numbers: number[],
  poolMax: number,
  sumRange: { min: number; max: number },
): boolean => {
  if (numbers.length === 6 && poolMax >= 42) {
    const sorted = [...numbers].sort((a, b) => a - b);

    // 1. Sum range
    const sum = sorted.reduce((a, b) => a + b, 0);
    if (sum < sumRange.min || sum > sumRange.max) return false;

    // 2. Odd/Even balance
    const oddCount = sorted.filter(n => n % 2 !== 0).length;
    if (oddCount < 2 || oddCount > 4) return false;

    // 3. Low/High balance
    const mid = Math.floor(poolMax / 2);
    const lowCount = sorted.filter(n => n <= mid).length;
    if (lowCount < 2 || lowCount > 4) return false;

    // 4. No 3+ consecutive runs
    let maxRun = 1;
    let run = 1;
    for (let i = 1; i < sorted.length; i += 1) {
      run = sorted[i] === sorted[i - 1] + 1 ? run + 1 : 1;
      maxRun = Math.max(maxRun, run);
    }
    if (maxRun >= 3) return false;

    // 5. Group spread: split pool into 6 bands, at most 2 numbers per band
    const bandSize = Math.ceil(poolMax / 6);
    const bandCounts = new Array<number>(6).fill(0);
    for (const n of sorted) {
      const band = Math.min(5, Math.floor((n - 1) / bandSize));
      bandCounts[band] += 1;
    }
    if (bandCounts.some(c => c > 2)) return false;
  }
  return true;
};

/**
 * Derives a per-number score for each strategy.
 *
 * Two clean signals extracted from draw history (draws[0] = most recent):
 *
 *   freqScore    — normalised historical frequency (0 = rarest, 1 = most common)
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
  const horizon = Math.max(1, draws.length);

  const scores = new Map<number, number>();

  for (let num = 1; num <= poolMax; num += 1) {
    const freq      = frequency.get(num)  ?? 0;
    const lastSeen  = lastSeenAt.get(num) ?? draws.length;

    // freqScore: 0 = least frequent, 1 = most frequent.
    const freqScore = normalize(freq, minFreq, maxFreq);

    // recencyScore: 1 = appeared in the most recent draw, 0 = never / oldest.
    const recencyScore = 1 - lastSeen / horizon;

    // overdueScore is the exact inverse.
    const overdueScore = 1 - recencyScore;

    let score: number;

    switch (strategy) {
      case 'hot':
        score = 0.5 * freqScore + 0.5 * recencyScore;
        break;

      case 'due':
        score = 0.35 * freqScore + 0.65 * overdueScore;
        break;

      case 'balanced':
        score = 0.65 * freqScore + 0.35 * recencyScore;
        break;

      case 'random':
      default:
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

  const relevantDraws = draws
    .filter(draw => draw.game === options.game)
    .sort((a, b) => b.drawDate.getTime() - a.drawDate.getTime())
    .slice(0, 300);

  const sumRange = computeSumRange(relevantDraws, config.poolMax, config.pickCount);
  const scores = deriveScores(relevantDraws, config.poolMax, options.strategy);
  const tickets: GeneratedTicket[] = [];
  const usedSignatures = new Set<string>();
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
    if (!validateTicket(numbers, config.poolMax, sumRange)) continue;
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

/** Returns display statistics for a generated ticket — used by the UI. */
export const getTicketStats = (
  numbers: number[],
  poolMax: number,
): {
  sum: number;
  oddCount: number;
  evenCount: number;
  lowCount: number;
  highCount: number;
} => {
  const sum = numbers.reduce((a, b) => a + b, 0);
  const oddCount = numbers.filter(n => n % 2 !== 0).length;
  const mid = Math.floor(poolMax / 2);
  const lowCount = numbers.filter(n => n <= mid).length;
  return {
    sum,
    oddCount,
    evenCount: numbers.length - oddCount,
    lowCount,
    highCount: numbers.length - lowCount,
  };
};

export const getGameConfig = (game: LottoGame): { poolMax: number; pickCount: number } => SIX_DIGIT_GAMES[game];
