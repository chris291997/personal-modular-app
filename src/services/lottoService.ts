import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  LottoBet,
  LottoDrawResult,
  LottoGame,
  LottoReminder,
} from '../types';
import { auth, db } from '../firebase/config';

const getCurrentUserId = (): string => {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) {
    throw new Error('User must be authenticated. Please log in.');
  }
  return firebaseUser.uid;
};

const mapDraw = (id: string, data: Record<string, unknown>): LottoDrawResult => ({
  id,
  game: data.game as LottoGame,
  drawDate: (data.drawDate as Timestamp).toDate(),
  combination: (data.combination as number[]) || [],
  jackpot: typeof data.jackpot === 'number' ? data.jackpot : null,
  winners: typeof data.winners === 'number' ? data.winners : null,
  source: 'pcso_scraper',
  createdAt: (data.createdAt as Timestamp)?.toDate?.() || new Date(),
  updatedAt: (data.updatedAt as Timestamp)?.toDate?.() || new Date(),
});

const mapBet = (id: string, data: Record<string, unknown>): LottoBet => ({
  id,
  game: data.game as LottoGame,
  drawDate: (data.drawDate as Timestamp).toDate(),
  pickedNumbers: (data.pickedNumbers as number[]) || [],
  amount: typeof data.amount === 'number' ? data.amount : undefined,
  source: (data.source as LottoBet['source']) || 'manual',
  strategyUsed: data.strategyUsed as LottoBet['strategyUsed'],
  resultStatus: (data.resultStatus as LottoBet['resultStatus']) || 'pending',
  matchedCount: typeof data.matchedCount === 'number' ? data.matchedCount : undefined,
  winnings: typeof data.winnings === 'number' ? data.winnings : undefined,
  createdAt: (data.createdAt as Timestamp)?.toDate?.() || new Date(),
  updatedAt: (data.updatedAt as Timestamp)?.toDate?.() || new Date(),
});

const mapReminder = (id: string, data: Record<string, unknown>): LottoReminder => ({
  id,
  game: data.game as LottoGame,
  enabled: Boolean(data.enabled),
  remindDaysBefore: Number.isFinite(data.remindDaysBefore) ? Number(data.remindDaysBefore) : 1,
  notifyTime: typeof data.notifyTime === 'string' ? data.notifyTime : '20:00',
  channels: Array.isArray(data.channels) ? (data.channels as LottoReminder['channels']) : ['in_app', 'push'],
  lastSentForDraw: typeof data.lastSentForDraw === 'string' ? data.lastSentForDraw : undefined,
  createdAt: (data.createdAt as Timestamp)?.toDate?.() || new Date(),
  updatedAt: (data.updatedAt as Timestamp)?.toDate?.() || new Date(),
});

export const getDrawResults = async (game?: LottoGame, limitCount = 200): Promise<LottoDrawResult[]> => {
  try {
    // Avoid composite index requirement by ordering first, then filtering in memory.
    const snapshot = await getDocs(query(collection(db, 'lotto_results'), orderBy('drawDate', 'desc')));
    const rows = snapshot.docs.map(item => mapDraw(item.id, item.data() as Record<string, unknown>));
    const filtered = game ? rows.filter(item => item.game === game) : rows;
    return filtered.slice(0, limitCount);
  } catch (error: unknown) {
    // Fallback without orderBy (if index/rules prevent sort query), then sort locally.
    const snapshot = await getDocs(query(collection(db, 'lotto_results')));
    const rows = snapshot.docs
      .map(item => mapDraw(item.id, item.data() as Record<string, unknown>))
      .sort((a, b) => b.drawDate.getTime() - a.drawDate.getTime());
    const filtered = game ? rows.filter(item => item.game === game) : rows;
    return filtered.slice(0, limitCount);
  }
};

export const getBets = async (): Promise<LottoBet[]> => {
  const userId = getCurrentUserId();

  try {
    const snapshot = await getDocs(
      query(collection(db, 'lotto_bets'), where('userId', '==', userId), orderBy('drawDate', 'desc'))
    );
    return snapshot.docs.map(item => mapBet(item.id, item.data() as Record<string, unknown>));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes('index')) throw error;

    const snapshot = await getDocs(query(collection(db, 'lotto_bets'), where('userId', '==', userId)));
    return snapshot.docs
      .map(item => mapBet(item.id, item.data() as Record<string, unknown>))
      .sort((a, b) => b.drawDate.getTime() - a.drawDate.getTime());
  }
};

export const addBet = async (
  payload: Omit<LottoBet, 'id' | 'createdAt' | 'updatedAt' | 'resultStatus'>
): Promise<string> => {
  const userId = getCurrentUserId();
  const now = Timestamp.fromDate(new Date());

  const ref = await addDoc(collection(db, 'lotto_bets'), {
    userId,
    game: payload.game,
    drawDate: Timestamp.fromDate(payload.drawDate),
    pickedNumbers: payload.pickedNumbers,
    amount: payload.amount ?? null,
    source: payload.source,
    strategyUsed: payload.strategyUsed ?? null,
    resultStatus: 'pending',
    matchedCount: null,
    winnings: null,
    createdAt: now,
    updatedAt: now,
  });

  return ref.id;
};

const verifyBetOwnership = async (id: string): Promise<void> => {
  const userId = getCurrentUserId();
  const snap = await getDoc(doc(db, 'lotto_bets', id));
  if (!snap.exists()) throw new Error('Bet not found.');
  if (snap.data().userId !== userId) throw new Error('Access denied.');
};

export const updateBet = async (id: string, updates: Partial<LottoBet>): Promise<void> => {
  await verifyBetOwnership(id);
  const updatePayload: Record<string, unknown> = {
    updatedAt: Timestamp.fromDate(new Date()),
  };

  if (updates.game !== undefined) updatePayload.game = updates.game;
  if (updates.drawDate !== undefined) updatePayload.drawDate = Timestamp.fromDate(updates.drawDate);
  if (updates.pickedNumbers !== undefined) updatePayload.pickedNumbers = updates.pickedNumbers;
  if (updates.amount !== undefined) updatePayload.amount = updates.amount;
  if (updates.source !== undefined) updatePayload.source = updates.source;
  if (updates.strategyUsed !== undefined) updatePayload.strategyUsed = updates.strategyUsed;
  if (updates.resultStatus !== undefined) updatePayload.resultStatus = updates.resultStatus;
  if (updates.matchedCount !== undefined) updatePayload.matchedCount = updates.matchedCount;
  if (updates.winnings !== undefined) updatePayload.winnings = updates.winnings;

  await updateDoc(doc(db, 'lotto_bets', id), updatePayload);
};

export const deleteBet = async (id: string): Promise<void> => {
  await verifyBetOwnership(id);
  await deleteDoc(doc(db, 'lotto_bets', id));
};

export const getReminders = async (): Promise<LottoReminder[]> => {
  const userId = getCurrentUserId();
  // Use single-field where to avoid requiring a composite index; sort in memory.
  const snapshot = await getDocs(
    query(collection(db, 'lotto_reminders'), where('userId', '==', userId))
  );
  return snapshot.docs
    .map(item => mapReminder(item.id, item.data() as Record<string, unknown>))
    .sort((a, b) => a.game.localeCompare(b.game));
};

export const upsertReminder = async (
  payload: Omit<LottoReminder, 'id' | 'createdAt' | 'updatedAt' | 'lastSentForDraw'>
): Promise<void> => {
  const userId = getCurrentUserId();
  // Use single-field where to avoid requiring a composite index; find matching game in memory.
  const snapshot = await getDocs(
    query(collection(db, 'lotto_reminders'), where('userId', '==', userId))
  );
  const existing = snapshot.docs.find(d => d.data().game === payload.game);
  const now = Timestamp.fromDate(new Date());
  const basePayload = {
    userId,
    game: payload.game,
    enabled: payload.enabled,
    remindDaysBefore: payload.remindDaysBefore,
    notifyTime: payload.notifyTime,
    channels: payload.channels,
    updatedAt: now,
  };

  if (!existing) {
    await addDoc(collection(db, 'lotto_reminders'), {
      ...basePayload,
      createdAt: now,
      lastSentForDraw: null,
    });
    return;
  }

  await updateDoc(doc(db, 'lotto_reminders', existing.id), basePayload);
};

const GAME_LABELS: Record<string, string> = {
  ultra_6_58: 'Ultra Lotto 6/58',
  grand_6_55: 'Grand Lotto 6/55',
  super_6_49: 'Super Lotto 6/49',
  mega_6_45: 'Mega Lotto 6/45',
  lotto_6_42: 'Lotto 6/42',
  '6d': '6D Lotto',
  '4d': '4D Lotto',
  '3d_2pm': '3D Lotto 2PM',
  '3d_5pm': '3D Lotto 5PM',
  '3d_9pm': '3D Lotto 9PM',
  '2d_2pm': '2D Lotto 2PM',
  '2d_5pm': '2D Lotto 5PM',
  '2d_9pm': '2D Lotto 9PM',
};

export const getGameLabel = (game: LottoGame | string): string =>
  GAME_LABELS[game] ?? game.replace(/_/g, ' ').toUpperCase();

export const isKnownGame = (game: string): game is LottoGame => game in GAME_LABELS;

export const SIX_NUMBER_GAMES: LottoGame[] = [
  'ultra_6_58',
  'grand_6_55',
  'super_6_49',
  'mega_6_45',
  'lotto_6_42',
];

export const DEFAULT_LOTTO_GAMES: LottoGame[] = [
  'ultra_6_58',
  'grand_6_55',
  'super_6_49',
  'mega_6_45',
  'lotto_6_42',
  '6d',
  '4d',
  '3d_2pm',
  '3d_5pm',
  '3d_9pm',
  '2d_2pm',
  '2d_5pm',
  '2d_9pm',
];
