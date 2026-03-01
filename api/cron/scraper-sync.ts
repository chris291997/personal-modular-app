import type { VercelRequest, VercelResponse } from '@vercel/node';
import admin from 'firebase-admin';
import { assertCronSecret, getErrorMessage, getFirebaseAdminServices } from '../_lib/firebaseAdmin.js';
import { scrapeLatestPcsoResults } from '../_lib/pcsoScraper.js';

const toDrawKey = (game: string, drawDate: Date, combination: number[]): string => {
  const yyyyMmDd = drawDate.toISOString().slice(0, 10);
  return `${game}_${yyyyMmDd}_${combination.join('-')}`;
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
    const { db } = getFirebaseAdminServices();
    const rows = await scrapeLatestPcsoResults();

    const now = admin.firestore.Timestamp.now();
    const batch = db.batch();
    let skippedByBackfill = 0;

    const monthsBack = Number(process.env.PCSO_BACKFILL_MONTHS || '12');
    const earliest = new Date();
    earliest.setMonth(earliest.getMonth() - monthsBack);

    rows.forEach(row => {
      if (row.drawDate < earliest) {
        skippedByBackfill += 1;
        return;
      }

      const id = toDrawKey(row.game, row.drawDate, row.combination);
      batch.set(db.collection('lotto_results').doc(id), {
        game: row.game,
        drawDate: admin.firestore.Timestamp.fromDate(row.drawDate),
        combination: row.combination,
        jackpot: row.jackpot,
        winners: row.winners,
        source: 'pcso_scraper',
        createdAt: now,
        updatedAt: now,
      }, { merge: true });
    });

    await batch.commit();

    return response.status(200).json({
      success: true,
      fetchedRows: rows.length,
      skippedByBackfill,
      windowMonths: monthsBack,
    });
  } catch (error) {
    return response.status(500).json({
      error: 'Failed to sync PCSO results',
      message: getErrorMessage(error),
    });
  }
}
