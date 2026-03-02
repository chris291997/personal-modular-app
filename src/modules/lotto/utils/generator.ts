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

    // Keep a balanced distribution for 6-number games.
    if (oddCount < 2 || oddCount > 4) return false;
    if (lowCount < 2 || lowCount > 4) return false;

    let consecutivePairs = 0;
    for (let i = 1; i < sorted.length; i += 1) {
      if (sorted[i] === sorted[i - 1] + 1) consecutivePairs += 1;
    }
    if (consecutivePairs > 2) return false;
  }
  return true;
};

const deriveScores = (draws: LottoDrawResult[], poolMax: number, strategy: LottoGeneratorStrategy): Map<number, number> => {
  const frequency = new Map<number, number>();
  const recency = new Map<number, number>();
  const lastSeen = new Map<number, number>();

  for (let i = 1; i <= poolMax; i += 1) {
    frequency.set(i, 0);
    recency.set(i, 0);
    lastSeen.set(i, Number.POSITIVE_INFINITY);
  }

  draws.forEach((draw, drawIndex) => {
    const recencyWeight = Math.max(1, draws.length - drawIndex);
    draw.combination.forEach(number => {
      if (!frequency.has(number)) return;
      frequency.set(number, (frequency.get(number) || 0) + 1);
      recency.set(number, (recency.get(number) || 0) + recencyWeight);
      if (drawIndex < (lastSeen.get(number) || Number.POSITIVE_INFINITY)) {
        lastSeen.set(number, drawIndex);
      }
    });
  });

  const frequencies = Array.from(frequency.values());
  const recencies = Array.from(recency.values());
  const gaps = Array.from(lastSeen.values()).map(value =>
    Number.isFinite(value) ? value : draws.length + 10
  );

  const minFreq = Math.min(...frequencies);
  const maxFreq = Math.max(...frequencies);
  const minRecency = Math.min(...recencies);
  const maxRecency = Math.max(...recencies);
  const minGap = Math.min(...gaps);
  const maxGap = Math.max(...gaps);

  const scoreWeights: Record<LottoGeneratorStrategy, { freq: number; recency: number; gap: number }> = {
    balanced: { freq: 0.45, recency: 0.35, gap: 0.2 },
    hot: { freq: 0.55, recency: 0.4, gap: 0.05 },
    due: { freq: 0.2, recency: 0.1, gap: 0.7 },
    random: { freq: 0.34, recency: 0.33, gap: 0.33 },
  };

  const weights = scoreWeights[strategy];
  const scores = new Map<number, number>();

  for (let number = 1; number <= poolMax; number += 1) {
    const freqNorm = normalize(frequency.get(number) || 0, minFreq, maxFreq);
    const recencyNorm = normalize(recency.get(number) || 0, minRecency, maxRecency);
    const gapValue = Number.isFinite(lastSeen.get(number) || 0) ? (lastSeen.get(number) || 0) : draws.length + 10;
    const gapNorm = normalize(gapValue, minGap, maxGap);
    const randomNoise = strategy === 'random' ? Math.random() : 0;
    const score = weights.freq * freqNorm + weights.recency * recencyNorm + weights.gap * gapNorm + randomNoise * 0.15;
    scores.set(number, clamp(score, 0.01, 1));
  }

  return scores;
};

const isRecentDuplicate = (candidate: number[], recentDraws: LottoDrawResult[]): boolean => {
  const key = [...candidate].sort((a, b) => a - b).join('-');
  return recentDraws.some(draw => [...draw.combination].sort((a, b) => a - b).join('-') === key);
};

export const generateTickets = (
  draws: LottoDrawResult[],
  options: GenerateOptions
): GeneratedTicket[] => {
  const config = SIX_DIGIT_GAMES[options.game];
  const relevantDraws = draws
    .filter(draw => draw.game === options.game)
    .sort((a, b) => b.drawDate.getTime() - a.drawDate.getTime())
    .slice(0, 200);

  const scores = deriveScores(relevantDraws, config.poolMax, options.strategy);
  const tickets: GeneratedTicket[] = [];
  const usedSignatures = new Set<string>();
  const maxAttempts = Math.max(200, options.ticketCount * 60);
  let attempts = 0;

  while (tickets.length < options.ticketCount && attempts < maxAttempts) {
    attempts += 1;
    const selected = new Set<number>();

    while (selected.size < config.pickCount) {
      const weighted = Array.from({ length: config.poolMax }, (_, index) => index + 1)
        .filter(number => !selected.has(number))
        .map(number => ({ number, weight: scores.get(number) || 0.1 }));
      selected.add(sampleWeighted(weighted));
    }

    const numbers = Array.from(selected).sort((a, b) => a - b);
    const signature = numbers.join('-');
    const score = numbers.reduce((sum, number) => sum + (scores.get(number) || 0), 0) / numbers.length;

    if (usedSignatures.has(signature)) continue;
    if (!validateTicket(numbers, config.poolMax)) continue;
    if (isRecentDuplicate(numbers, relevantDraws.slice(0, 40))) continue;

    usedSignatures.add(signature);
    tickets.push({
      numbers,
      score: Number(score.toFixed(4)),
      strategy: options.strategy,
    });
  }

  return tickets;
};

export const getGameConfig = (game: LottoGame): { poolMax: number; pickCount: number } => SIX_DIGIT_GAMES[game];
