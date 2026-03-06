import { LottoBet, LottoDrawResult, LottoGame } from '../../../types';
import { SIX_NUMBER_GAMES } from '../../../services/lottoService';

/** Safely get a Date (handles Firestore Timestamp or Date) */
function toDate(val: Date | { toDate?: () => Date }): Date {
  if (val instanceof Date) return val;
  if (val && typeof (val as { toDate?: () => Date }).toDate === 'function') {
    return (val as { toDate: () => Date }).toDate();
  }
  return new Date(val as unknown as string | number);
}

/** Format date as YYYY-MM-DD in local timezone (avoids time/timezone edge cases) */
function toDateKey(date: Date | { toDate?: () => Date }): string {
  const d = toDate(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Same calendar day (local timezone) */
export function isSameDrawDate(d: Date, b: Date): boolean {
  return toDateKey(d) === toDateKey(b);
}

/** Draw date within ±1 day of bet (for reconciling timezone/scraper date quirks) */
function isDrawDateWithinOneDay(d: Date, b: Date): boolean {
  const dTime = new Date(toDateKey(d)).getTime();
  const bTime = new Date(toDateKey(b)).getTime();
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.abs(dTime - bTime) <= oneDay;
}

/** Draw date is same day OR day after bet */
export function isDrawDateSameOrNextDay(d: Date, b: Date): boolean {
  const dDay = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const bDay = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  const oneDay = 24 * 60 * 60 * 1000;
  return dDay >= bDay && dDay <= bDay + oneDay;
}

/** Count how many of bet's picked numbers match the draw combination */
export function countMatches(draw: LottoDrawResult, bet: LottoBet): number {
  const drawnSet = new Set(draw.combination);
  return bet.pickedNumbers.filter(n => drawnSet.has(n)).length;
}

/** Which of bet's numbers hit the draw (for UI highlighting) */
export function getHitNumbers(draw: LottoDrawResult, bet: LottoBet): Set<number> {
  const drawnSet = new Set(draw.combination);
  return new Set(bet.pickedNumbers.filter(n => drawnSet.has(n)));
}

/**
 * PCSO prize structure per 6-number game.
 * - 6/6 = 1st Prize (Jackpot) — from draw, shared among jackpot winners
 * - 5/6 = 2nd Prize — pool amount, shared among 5/6 winners (actual amount varies)
 * - 4/6 = 3rd Prize — pool amount, shared among 4/6 winners (actual amount varies)
 * - 3/6 = Consolation — fixed amount
 * Source: PCSO Official Prize Payout
 */
const PRIZES_BY_GAME: Record<string, Record<number, { label: string; amount: number; shared: boolean }>> = {
  lotto_6_42: {
    3: { label: 'Consolation (3/6)', amount: 25, shared: false },
    4: { label: '3rd Prize (4/6)', amount: 1_000_000, shared: true },
    5: { label: '2nd Prize (5/6)', amount: 1_100_000, shared: true },
    6: { label: '1st Prize (Jackpot)', amount: 0, shared: true },
  },
  mega_6_45: {
    3: { label: 'Consolation (3/6)', amount: 30, shared: false },
    4: { label: '3rd Prize (4/6)', amount: 1_100_000, shared: true },
    5: { label: '2nd Prize (5/6)', amount: 1_200_000, shared: true },
    6: { label: '1st Prize (Jackpot)', amount: 0, shared: true },
  },
  super_6_49: {
    3: { label: 'Consolation (3/6)', amount: 50, shared: false },
    4: { label: '3rd Prize (4/6)', amount: 1_200_000, shared: true },
    5: { label: '2nd Prize (5/6)', amount: 1_300_000, shared: true },
    6: { label: '1st Prize (Jackpot)', amount: 0, shared: true },
  },
  grand_6_55: {
    3: { label: 'Consolation (3/6)', amount: 60, shared: false },
    4: { label: '3rd Prize (4/6)', amount: 1_300_000, shared: true },
    5: { label: '2nd Prize (5/6)', amount: 1_400_000, shared: true },
    6: { label: '1st Prize (Jackpot)', amount: 0, shared: true },
  },
  ultra_6_58: {
    3: { label: 'Consolation (3/6)', amount: 100, shared: false },
    4: { label: '3rd Prize (4/6)', amount: 1_400_000, shared: true },
    5: { label: '2nd Prize (5/6)', amount: 1_500_000, shared: true },
    6: { label: '1st Prize (Jackpot)', amount: 0, shared: true },
  },
};

export interface BetMatchResult {
  bet: LottoBet;
  draw: LottoDrawResult;
  matchedCount: number;
  hitNumbers: Set<number>;
  isWin: boolean;
  prizeLabel: string;
  prizeAmount: number;
  /** True for 2nd, 3rd, Jackpot — amount is pool, shared among winners. Actual prize varies. */
  prizeShared: boolean;
}

function getPrizeForMatch(draw: LottoDrawResult, matchedCount: number): { label: string; amount: number; shared: boolean } | null {
  const gamePrizes = PRIZES_BY_GAME[draw.game];
  if (!gamePrizes) return null;
  const tier = gamePrizes[matchedCount];
  if (!tier) return null;
  const amount = matchedCount === 6 ? (draw.jackpot ?? 0) : tier.amount;
  const jackpotWinners = Math.max(1, draw.winners ?? 1);
  const effectiveAmount = matchedCount === 6 ? amount / jackpotWinners : amount;
  return { label: tier.label, amount: effectiveAmount, shared: tier.shared };
}

/** Find bets that match this draw (same game, same date) */
export function getMatchingBets(
  draw: LottoDrawResult,
  bets: LottoBet[]
): BetMatchResult[] {
  if (!SIX_NUMBER_GAMES.includes(draw.game as LottoGame)) return [];

  return bets
    .filter(b => b.game === draw.game && isSameDrawDate(draw.drawDate, b.drawDate))
    .map(bet => {
      const matchedCount = countMatches(draw, bet);
      const hitNumbers = getHitNumbers(draw, bet);
      const prize = getPrizeForMatch(draw, matchedCount);
      const isWin = matchedCount >= 3;
      const prizeLabel = prize?.label ?? `${matchedCount}/6 matches`;
      const prizeAmount = prize?.amount ?? 0;
      const prizeShared = prize?.shared ?? false;
      return { bet, draw, matchedCount, hitNumbers, isWin, prizeLabel, prizeAmount, prizeShared };
    });
}

/**
 * For pending bets: find a matching draw using relaxed date (±1 day).
 * Handles timezone/scraper date mismatches (e.g. bet 3/4, draw stored as 3/3).
 * When multiple draws match, picks exact date first, else closest by date.
 */
export function findRelaxedMatch(
  bet: LottoBet,
  draws: LottoDrawResult[]
): BetMatchResult | null {
  if (!SIX_NUMBER_GAMES.includes(bet.game as LottoGame)) return null;

  const candidates = draws
    .filter(d => d.game === bet.game && isDrawDateWithinOneDay(d.drawDate, bet.drawDate))
    .map(draw => {
      const matchedCount = countMatches(draw, bet);
      const hitNumbers = getHitNumbers(draw, bet);
      const prize = getPrizeForMatch(draw, matchedCount);
      const isWin = matchedCount >= 3;
      const prizeLabel = prize?.label ?? `${matchedCount}/6 matches`;
      const prizeAmount = prize?.amount ?? 0;
      const prizeShared = prize?.shared ?? false;
      const dateDiff = Math.abs(
        new Date(toDateKey(draw.drawDate)).getTime() - new Date(toDateKey(bet.drawDate)).getTime()
      );
      return { bet, draw, matchedCount, hitNumbers, isWin, prizeLabel, prizeAmount, prizeShared, dateDiff };
    });

  if (candidates.length === 0) return null;
  const best = candidates.sort((a, b) => a.dateDiff - b.dateDiff)[0];
  const { dateDiff, ...result } = best;
  return result;
}

/** All wins across draws for congratulations banner */
export function getAllWins(draws: LottoDrawResult[], bets: LottoBet[]): BetMatchResult[] {
  const wins: BetMatchResult[] = [];
  for (const draw of draws) {
    const matches = getMatchingBets(draw, bets);
    wins.push(...matches.filter(m => m.isWin));
  }
  return wins;
}
