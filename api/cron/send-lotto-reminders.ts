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

      // Skip if we already sent for this draw.
      if (reminder.lastSentForDraw === drawKey) {
        skippedCount += 1;
        continue;
      }

      // Send reminder if the draw is within the configured lead time (e.g. 1 day before).
      // Add a 1-day buffer so the cron doesn't miss a draw due to minor timing drift.
      const daysUntilDraw = (nextDraw.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      const leadDays = Math.max(1, reminder.remindDaysBefore || 1);
      if (daysUntilDraw <= 0 || daysUntilDraw > leadDays + 1) {
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
