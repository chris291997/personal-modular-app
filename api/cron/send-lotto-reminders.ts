import type { VercelRequest, VercelResponse } from '@vercel/node';
import admin from 'firebase-admin';
import { assertCronSecret, getErrorMessage, getFirebaseAdminServices } from '../_lib/firebaseAdmin.js';
import { getNextDrawDateForGame } from '../_lib/lottoSchedule.js';

type ReminderDoc = {
  userId: string;
  game: string;
  enabled: boolean;
  remindDaysBefore: number;
  notifyTime: string;
  channels: string[];
  lastSentForDraw?: string | null;
};

const getDrawKey = (game: string, drawDate: Date): string => `${game}_${drawDate.toISOString().slice(0, 10)}`;

const parseNotifyTime = (value: string): { hour: number; minute: number } => {
  const [hour, minute] = value.split(':').map(Number);
  return {
    hour: Number.isFinite(hour) ? hour : 20,
    minute: Number.isFinite(minute) ? minute : 0,
  };
};

const buildReminderTime = (drawDate: Date, remindDaysBefore: number, notifyTime: string): Date => {
  const reminder = new Date(drawDate);
  reminder.setUTCDate(reminder.getUTCDate() - remindDaysBefore);
  const time = parseNotifyTime(notifyTime);
  reminder.setUTCHours(time.hour - 8, time.minute, 0, 0); // Manila UTC+8
  return reminder;
};

export default async function handler(request: VercelRequest, response: VercelResponse) {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  if (request.method !== 'GET') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  try {
    assertCronSecret(request.headers.authorization);
    const { db, messaging } = getFirebaseAdminServices();
    const now = new Date();
    const remindersSnap = await db.collection('lotto_reminders').where('enabled', '==', true).get();

    let sentCount = 0;
    let skippedCount = 0;

    for (const reminderDoc of remindersSnap.docs) {
      const reminder = reminderDoc.data() as ReminderDoc;
      if (!reminder.userId || !reminder.game) {
        skippedCount += 1;
        continue;
      }

      const nextDraw = getNextDrawDateForGame(reminder.game as Parameters<typeof getNextDrawDateForGame>[0], now);
      const drawKey = getDrawKey(reminder.game, nextDraw);
      if (reminder.lastSentForDraw === drawKey) {
        skippedCount += 1;
        continue;
      }

      const reminderTime = buildReminderTime(nextDraw, Math.max(1, reminder.remindDaysBefore || 1), reminder.notifyTime || '20:00');
      const diffMs = Math.abs(now.getTime() - reminderTime.getTime());
      if (diffMs > 30 * 60 * 1000) {
        skippedCount += 1;
        continue;
      }

      const gameLabel = reminder.game.replace(/_/g, ' ').toUpperCase();
      const title = 'Lotto Bet Reminder';
      const body = `${gameLabel} draw is tomorrow. Prepare your numbers now.`;

      await db.collection('notifications').add({
        userId: reminder.userId,
        title,
        body,
        type: 'lotto_reminder',
        read: false,
        createdAt: admin.firestore.Timestamp.now(),
        metadata: {
          game: reminder.game,
          drawDate: nextDraw.toISOString(),
          drawKey,
        },
      });

      if (Array.isArray(reminder.channels) && reminder.channels.includes('push')) {
        const devices = await db.collection('user_devices').where('userId', '==', reminder.userId).get();
        const tokens = devices.docs
          .map(doc => (doc.data().token as string) || '')
          .filter(Boolean);

        if (tokens.length > 0) {
          await messaging.sendEachForMulticast({
            tokens,
            notification: { title, body },
            data: {
              type: 'lotto_reminder',
              game: reminder.game,
              drawDate: nextDraw.toISOString(),
            },
          });
        }
      }

      await reminderDoc.ref.set(
        {
          lastSentForDraw: drawKey,
          updatedAt: admin.firestore.Timestamp.now(),
        },
        { merge: true }
      );
      sentCount += 1;
    }

    return response.status(200).json({
      success: true,
      processed: remindersSnap.size,
      sentCount,
      skippedCount,
    });
  } catch (error) {
    return response.status(500).json({
      error: 'Failed to send reminders',
      message: getErrorMessage(error),
    });
  }
}
