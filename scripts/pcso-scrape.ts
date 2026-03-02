/**
 * PCSO Lotto Scraper — runs in GitHub Actions (or locally).
 * Scrapes https://www.pcso.gov.ph/SearchLottoResult.aspx and writes results to Firestore.
 *
 * Usage:
 *   node --loader ts-node/esm scripts/pcso-scrape.ts
 *
 * Required env vars:
 *   FIREBASE_SERVICE_ACCOUNT  — JSON string of the Firebase service account key
 *   PCSO_BACKFILL_MONTHS      — (optional) how many months back to scrape, default 1
 */

import * as https from 'node:https';
import * as zlib from 'node:zlib';
import admin from 'firebase-admin';

// ── Types ────────────────────────────────────────────────────────────────────

type LottoGame =
  | 'lotto_6_42' | 'mega_6_45' | 'super_6_49'
  | 'grand_6_55' | 'ultra_6_58' | 'lucky_6_50';

type ScrapedDraw = {
  game: LottoGame;
  drawDate: Date;
  combination: number[];
  jackpot: number;
  winners: number;
};

// ── Constants ─────────────────────────────────────────────────────────────────

const PCSO_URL = 'https://www.pcso.gov.ph/SearchLottoResult.aspx';
const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const CHROME_HEADERS: Record<string, string> = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
  'Accept-Language': 'en-US,en;q=0.9,fil;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
  'Cache-Control': 'max-age=0',
  'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Windows"',
  'sec-fetch-dest': 'document',
  'sec-fetch-mode': 'navigate',
  'sec-fetch-user': '?1',
  'upgrade-insecure-requests': '1',
};

// ── HTTP helpers ─────────────────────────────────────────────────────────────

type HttpResult = { status: number; headers: Record<string, string | string[] | undefined>; body: string };

const decompressBody = (res: import('http').IncomingMessage, rawChunks: Buffer[]): Promise<string> =>
  new Promise((resolve, reject) => {
    const raw = Buffer.concat(rawChunks);
    const enc = res.headers['content-encoding'];
    if (enc === 'gzip') {
      zlib.gunzip(raw, (e, b) => e ? reject(e) : resolve(b.toString('utf8')));
    } else if (enc === 'deflate') {
      zlib.inflate(raw, (e, b) => e ? reject(e) : resolve(b.toString('utf8')));
    } else if (enc === 'br') {
      zlib.brotliDecompress(raw, (e, b) => e ? reject(e) : resolve(b.toString('utf8')));
    } else {
      resolve(raw.toString('utf8'));
    }
  });

const httpsRequest = (
  options: https.RequestOptions,
  body: string | null,
  timeoutMs: number,
): Promise<HttpResult> =>
  new Promise((resolve, reject) => {
    let settled = false;
    const done = (fn: () => void) => { if (!settled) { settled = true; fn(); } };

    const req = https.request(options, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (c: Buffer) => chunks.push(c));
      res.on('end', () => {
        decompressBody(res, chunks)
          .then(text => done(() => resolve({
            status: res.statusCode ?? 0,
            headers: res.headers as Record<string, string | string[] | undefined>,
            body: text,
          })))
          .catch(e => done(() => reject(e)));
      });
      res.on('error', (e: Error) => done(() => reject(e)));
    });

    req.on('error', (e: Error) => done(() => reject(e)));

    const timer = setTimeout(() => {
      req.destroy();
      done(() => reject(new Error(`Request timed out after ${timeoutMs}ms`)));
    }, timeoutMs);

    req.on('close', () => clearTimeout(timer));

    if (body) req.write(body);
    req.end();
  });

// ── HTML helpers ──────────────────────────────────────────────────────────────

const parseCookies = (setCookieHeader: string | string[] | undefined): string => {
  if (!setCookieHeader) return '';
  const list = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
  return list.map(c => c.split(';')[0]).join('; ');
};

const extractHiddenFields = (html: string): Record<string, string> => {
  const fields: Record<string, string> = {};
  const re = /<input[^>]+type="hidden"[^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const nm = m[0].match(/name="([^"]*)"/i);
    const vm = m[0].match(/value="([^"]*)"/i);
    if (nm) fields[nm[1]] = vm ? vm[1] : '';
  }
  return fields;
};

const extractSelectNames = (html: string): string[] => {
  const names: string[] = [];
  const re = /<select[^>]+name="([^"]*)"/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) names.push(m[1]);
  return names;
};

const extractSubmitName = (html: string): string => {
  const m = html.match(/<input[^>]+type="submit"[^>]*name="([^"]*)"/i)
            ?? html.match(/<input[^>]+name="([^"]*)"[^>]*type="submit"/i);
  return m ? m[1] : 'btnSearch';
};

const sanitizeHtml = (raw: string): string =>
  raw.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').trim();

const parseMoney = (raw: string): number => {
  const n = parseFloat(raw.replace(/[^\d.]/g, ''));
  return Number.isFinite(n) ? n : 0;
};

const parseWinners = (raw: string): number => {
  const n = parseInt(raw.replace(/[^\d]/g, ''), 10);
  return Number.isFinite(n) ? n : 0;
};

const parseDate = (raw: string): Date | null => {
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
};

const toGame = (name: string): LottoGame | null => {
  const n = name.toLowerCase();
  if (n.includes('6/58') || n.includes('ultra')) return 'ultra_6_58';
  if (n.includes('6/55') || n.includes('grand')) return 'grand_6_55';
  if (n.includes('6/49') || n.includes('super')) return 'super_6_49';
  if (n.includes('6/45') || n.includes('mega'))  return 'mega_6_45';
  if (n.includes('6/50') || n.includes('lucky 6/50')) return 'lucky_6_50';
  if (n.includes('6/42') || n.includes('lotto 6/42')) return 'lotto_6_42';
  return null;
};

const parseCombination = (raw: string): number[] =>
  raw.split(/[-\s]+/)
    .map(item => Number(item.trim()))
    .filter(item => Number.isFinite(item) && item > 0);

// ── PCSO Scraper ──────────────────────────────────────────────────────────────

const scrapePcsoResults = async (monthsBack: number): Promise<ScrapedDraw[]> => {
  const parsed = new URL(PCSO_URL);
  const baseOpts: https.RequestOptions = {
    hostname: parsed.hostname,
    path: parsed.pathname,
    port: 443,
  };

  // Step 1: GET the search page (get cookies + ViewState)
  console.log('  GET search page...');
  const getRes = await httpsRequest({
    ...baseOpts,
    method: 'GET',
    headers: { ...CHROME_HEADERS, 'Referer': 'https://www.pcso.gov.ph/', 'sec-fetch-site': 'none' },
  }, null, 10000);

  if (getRes.status >= 400) throw new Error(`PCSO GET returned HTTP ${getRes.status}`);

  const cookies     = parseCookies(getRes.headers['set-cookie']);
  const hidden      = extractHiddenFields(getRes.body);
  const selectNames = extractSelectNames(getRes.body);
  const submitName  = extractSubmitName(getRes.body);
  console.log(`  Got ${Object.keys(hidden).length} hidden fields, ${selectNames.length} selects`);

  // Step 2: Build date range
  const today = new Date();
  const start = new Date(today);
  start.setMonth(start.getMonth() - monthsBack);

  const dateValues = [
    MONTH_NAMES[start.getMonth()], String(start.getDate()), String(start.getFullYear()),
    MONTH_NAMES[today.getMonth()], String(today.getDate()), String(today.getFullYear()),
    '0', // All Games
  ];

  const formFields: Record<string, string> = { ...hidden };
  selectNames.forEach((name, i) => { if (i < dateValues.length) formFields[name] = dateValues[i]; });
  formFields[submitName] = 'Search Lotto Result';

  const formBody = Object.entries(formFields)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');

  // Step 3: POST the search form
  console.log(`  POST form (${formBody.length} bytes)...`);
  const postRes = await httpsRequest({
    ...baseOpts,
    method: 'POST',
    headers: {
      ...CHROME_HEADERS,
      'Referer': PCSO_URL,
      'sec-fetch-site': 'same-origin',
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': String(Buffer.byteLength(formBody)),
      ...(cookies ? { 'Cookie': cookies } : {}),
    },
  }, formBody, 15000);

  console.log(`  POST returned ${postRes.status}, body ${postRes.body.length} chars`);
  if (postRes.status >= 400) throw new Error(`PCSO POST returned HTTP ${postRes.status}`);

  // Step 4: Parse results table
  const rowMatches = postRes.body.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
  const draws: ScrapedDraw[] = [];

  rowMatches.forEach(row => {
    const columns = row.match(/<td[^>]*>[\s\S]*?<\/td>/gi);
    if (!columns || columns.length < 5) return;

    const gameName       = sanitizeHtml(columns[0]);
    const combinationRaw = sanitizeHtml(columns[1]);
    const drawDateRaw    = sanitizeHtml(columns[2]);
    const jackpotRaw     = sanitizeHtml(columns[3]);
    const winnersRaw     = sanitizeHtml(columns[4]);

    const game     = toGame(gameName);
    const drawDate = parseDate(drawDateRaw);
    if (!game || !drawDate) return;

    const combination = parseCombination(combinationRaw);
    if (!combination.length) return;

    draws.push({ game, drawDate, combination, jackpot: parseMoney(jackpotRaw), winners: parseWinners(winnersRaw) });
  });

  return draws;
};

// ── Firebase ──────────────────────────────────────────────────────────────────

const initFirebase = (): admin.firestore.Firestore => {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT env var is not set');

  let serviceAccount: admin.ServiceAccount;
  try {
    serviceAccount = JSON.parse(raw);
  } catch {
    throw new Error('FIREBASE_SERVICE_ACCOUNT is not valid JSON');
  }

  if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }
  return admin.firestore();
};

const toDrawKey = (game: string, drawDate: Date, combination: number[]): string => {
  const yyyyMmDd = drawDate.toISOString().slice(0, 10);
  return `${game}_${yyyyMmDd}_${combination.join('-')}`;
};

// ── Main ──────────────────────────────────────────────────────────────────────

const main = async () => {
  const monthsBack = Number(process.env.PCSO_BACKFILL_MONTHS ?? '1');
  console.log(`\n=== PCSO Scraper — last ${monthsBack} month(s) ===\n`);

  // 1. Scrape
  console.log('Scraping PCSO...');
  const draws = await scrapePcsoResults(monthsBack);
  console.log(`Scraped ${draws.length} draws\n`);

  if (!draws.length) {
    console.log('No draws found. Exiting.');
    process.exit(0);
  }

  // 2. Write to Firestore
  console.log('Writing to Firestore...');
  const db = initFirebase();
  const now = admin.firestore.Timestamp.now();
  const earliest = new Date();
  earliest.setMonth(earliest.getMonth() - monthsBack);

  const BATCH_SIZE = 450; // Firestore batch limit is 500
  let total = 0;
  let skipped = 0;

  for (let i = 0; i < draws.length; i += BATCH_SIZE) {
    const batch = db.batch();
    const chunk = draws.slice(i, i + BATCH_SIZE);

    chunk.forEach(row => {
      if (row.drawDate < earliest) { skipped++; return; }
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
      total++;
    });

    await batch.commit();
    console.log(`  Wrote batch ${Math.floor(i / BATCH_SIZE) + 1} (${chunk.length} records)`);
  }

  console.log(`\nDone. Written=${total} Skipped=${skipped}`);
  process.exit(0);
};

main().catch(err => {
  console.error('Scraper failed:', err);
  process.exit(1);
});
