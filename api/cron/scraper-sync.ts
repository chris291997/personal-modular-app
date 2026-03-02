import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as https from 'node:https';
import * as zlib from 'node:zlib';
import admin from 'firebase-admin';

type FirebaseServices = {
  db: admin.firestore.Firestore;
  auth: admin.auth.Auth;
  messaging: admin.messaging.Messaging;
};

type LottoGame =
  | 'ultra_6_58'
  | 'grand_6_55'
  | 'lucky_6_50'
  | 'super_6_49'
  | 'mega_6_45'
  | 'lotto_6_42'
  | '6d'
  | '4d'
  | '3d_2pm'
  | '3d_5pm'
  | '3d_9pm'
  | '2d_2pm'
  | '2d_5pm'
  | '2d_9pm';

type ScrapedDraw = {
  game: LottoGame;
  drawDate: Date;
  combination: number[];
  jackpot: number | null;
  winners: number | null;
};

let services: FirebaseServices | null = null;

const parseServiceAccount = (): admin.ServiceAccount => {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT environment variable is not set.');
  }

  let parsed: admin.ServiceAccount;
  try {
    parsed = JSON.parse(raw) as admin.ServiceAccount;
  } catch (error) {
    throw new Error(`FIREBASE_SERVICE_ACCOUNT is invalid JSON: ${error instanceof Error ? error.message : 'unknown error'}`);
  }

  if (!parsed.projectId && !(parsed as Record<string, unknown>).project_id) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT JSON is missing project_id/projectId.');
  }
  if (!parsed.clientEmail && !(parsed as Record<string, unknown>).client_email) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT JSON is missing client_email/clientEmail.');
  }
  if (!parsed.privateKey && !(parsed as Record<string, unknown>).private_key) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT JSON is missing private_key/privateKey.');
  }

  return parsed;
};

const getFirebaseAdminServices = (): FirebaseServices => {
  if (services) return services;

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(parseServiceAccount()),
    });
  }

  services = {
    db: admin.firestore(),
    auth: admin.auth(),
    messaging: admin.messaging(),
  };
  return services;
};

const getErrorMessage = (err: unknown): string => {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  try {
    return JSON.stringify(err);
  } catch {
    return 'Unknown error';
  }
};


const sanitizeHtml = (value: string): string =>
  value.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

const parseMoney = (value: string): number | null => {
  const numeric = value.replace(/[^0-9.]/g, '');
  if (!numeric) return null;
  const parsed = Number(numeric);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseWinners = (value: string): number | null => {
  const numeric = value.replace(/[^0-9]/g, '');
  if (!numeric) return null;
  const parsed = Number(numeric);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseDate = (value: string): Date | null => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
};

const toGame = (name: string): LottoGame | null => {
  const normalized = name.toLowerCase().replace(/\s+/g, ' ').trim();
  if (normalized.includes('ultra lotto 6/58')) return 'ultra_6_58';
  if (normalized.includes('grand lotto 6/55')) return 'grand_6_55';
  if (normalized.includes('lotto 6/50')) return 'lucky_6_50';
  if (normalized.includes('superlotto 6/49') || normalized.includes('super lotto 6/49')) return 'super_6_49';
  if (normalized.includes('megalotto 6/45') || normalized.includes('mega lotto 6/45')) return 'mega_6_45';
  if (normalized.includes('lotto 6/42')) return 'lotto_6_42';
  if (normalized.includes('6d lotto')) return '6d';
  if (normalized.includes('4d lotto')) return '4d';
  if (normalized.includes('3d lotto 2pm')) return '3d_2pm';
  if (normalized.includes('3d lotto 5pm')) return '3d_5pm';
  if (normalized.includes('3d lotto 9pm')) return '3d_9pm';
  if (normalized.includes('2d lotto 2pm')) return '2d_2pm';
  if (normalized.includes('2d lotto 5pm')) return '2d_5pm';
  if (normalized.includes('2d lotto 9pm')) return '2d_9pm';
  return null;
};

const parseCombination = (raw: string): number[] =>
  raw
    .split(/[-\s]+/)
    .map(item => Number(item.trim()))
    .filter(item => Number.isFinite(item));

const PCSO_URL = 'https://www.pcso.gov.ph/SearchLottoResult.aspx';
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

// Full Chrome browser headers — required to bypass Akamai WAF on pcso.gov.ph
const BROWSER_HEADERS: Record<string, string> = {
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
  'sec-fetch-site': 'none',
  'sec-fetch-user': '?1',
  'upgrade-insecure-requests': '1',
};

type HttpResult = { status: number; headers: Record<string, string | string[] | undefined>; body: string };

// Decompress gzip/deflate/br response into a plain string
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

// Low-level HTTPS request with immediate socket destroy on timeout.
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
      done(() => reject(new Error(`PCSO request timed out after ${timeoutMs}ms`)));
    }, timeoutMs);

    req.on('close', () => clearTimeout(timer));

    if (body) req.write(body);
    req.end();
  });

// Extract hidden input field values from HTML (ViewState, EventValidation, etc.)
const extractHiddenFields = (html: string): Record<string, string> => {
  const fields: Record<string, string> = {};
  let m: RegExpExecArray | null;
  const re = /<input[^>]+type=["']?hidden["']?[^>]*>/gi;
  while ((m = re.exec(html)) !== null) {
    const nameM = m[0].match(/name=["']([^"']*)["']/i);
    const valM  = m[0].match(/value=["']([^"']*)["']/i);
    if (nameM) fields[nameM[1]] = valM ? valM[1] : '';
  }
  return fields;
};

// Extract select (dropdown) field names and their option values from the HTML
const extractSelectNames = (html: string): string[] => {
  const names: string[] = [];
  const re = /<select[^>]+name=["']([^"']*)["'][^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) names.push(m[1]);
  return names;
};

// Find submit button name
const extractSubmitName = (html: string): string => {
  const m = html.match(/<input[^>]+type=["']submit["'][^>]*name=["']([^"']*)["']/i)
            ?? html.match(/<input[^>]+name=["']([^"']*)["'][^>]*type=["']submit["']/i);
  return m ? m[1] : 'btnSearch';
};

// Parse Set-Cookie headers into a single cookie string for reuse
const parseCookies = (setCookieHeader: string | string[] | undefined): string => {
  if (!setCookieHeader) return '';
  const list = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
  return list.map(c => c.split(';')[0]).join('; ');
};

const scrapeLatestPcsoResults = async (): Promise<ScrapedDraw[]> => {
  const parsed = new URL(PCSO_URL);
  const baseRequestOpts: https.RequestOptions = {
    hostname: parsed.hostname,
    path: parsed.pathname,
    port: 443,
  };

  // ── Step 1: GET the search page to get session cookies + ViewState ──────
  console.log('[scraper-sync] GET search page for ViewState');
  const getRes = await httpsRequest({
    ...baseRequestOpts,
    method: 'GET',
    headers: {
      ...BROWSER_HEADERS,
      'Referer': 'https://www.pcso.gov.ph/',
      'sec-fetch-site': 'none',
    },
  }, null, 7000);

  if (getRes.status >= 400) {
    throw new Error(`PCSO GET returned HTTP ${getRes.status}`);
  }

  const cookies     = parseCookies(getRes.headers['set-cookie']);
  const hidden      = extractHiddenFields(getRes.body);
  const selectNames = extractSelectNames(getRes.body);
  const submitName  = extractSubmitName(getRes.body);

  console.log(`[scraper-sync] Got ${Object.keys(hidden).length} hidden, ${selectNames.length} selects, cookie len=${cookies.length}`);

  // ── Step 2: Build date range (last 1 month → today) ─────────────────────
  // Month values on PCSO are full English names (e.g. "February"), days/years are numeric strings.
  const today = new Date();
  const start = new Date(today);
  start.setMonth(start.getMonth() - 1);

  // selectNames order: ddlStartMonth, ddlStartDate, ddlStartYear, ddlEndMonth, ddlEndDay, ddlEndYear, ddlSelectGame
  const dateValues = [
    MONTH_NAMES[start.getMonth()],    // start month → "January"
    String(start.getDate()),          // start day   → "1"
    String(start.getFullYear()),      // start year  → "2026"
    MONTH_NAMES[today.getMonth()],    // end month   → "March"
    String(today.getDate()),          // end day     → "1"
    String(today.getFullYear()),      // end year    → "2026"
    '0',                              // game filter → "0" = All Games
  ];

  const formFields: Record<string, string> = { ...hidden };
  selectNames.forEach((name, i) => {
    if (i < dateValues.length) formFields[name] = dateValues[i];
  });
  formFields[submitName] = 'Search Lotto Result';

  const formBody = Object.entries(formFields)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');

  // ── Step 3: POST the search form ─────────────────────────────────────────
  console.log('[scraper-sync] POST search form, body length=%d', formBody.length);
  const postRes = await httpsRequest({
    ...baseRequestOpts,
    method: 'POST',
    headers: {
      ...BROWSER_HEADERS,
      'Referer': PCSO_URL,
      'sec-fetch-site': 'same-origin',
      'sec-fetch-dest': 'document',
      'sec-fetch-mode': 'navigate',
      'sec-fetch-user': '?1',
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': String(Buffer.byteLength(formBody)),
      ...(cookies ? { 'Cookie': cookies } : {}),
    },
  }, formBody, 7000);

  console.log('[scraper-sync] POST returned status=%d, body length=%d', postRes.status, postRes.body.length);

  if (postRes.status >= 400) {
    throw new Error(`PCSO POST returned HTTP ${postRes.status}`);
  }

  // ── Step 4: Parse the HTML results table ─────────────────────────────────
  const html = postRes.body;
  const rowMatches = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
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

const toDrawKey = (game: string, drawDate: Date, combination: number[]): string => {
  const yyyyMmDd = drawDate.toISOString().slice(0, 10);
  return `${game}_${yyyyMmDd}_${combination.join('-')}`;
};

export default async function handler(request: VercelRequest, response: VercelResponse) {
  console.log('[scraper-sync] invoked method=%s query=%s', request.method, JSON.stringify(request.query));

  response.setHeader('Access-Control-Allow-Origin', '*');

  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }
  if (request.method !== 'GET') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  // Step 1: auth
  const cronSecret = process.env.CRON_SECRET ?? '';
  if (!cronSecret) {
    console.error('[scraper-sync] CRON_SECRET not set');
    return response.status(500).json({ error: 'CRON_SECRET is not configured' });
  }
  if (request.headers.authorization !== `Bearer ${cronSecret}`) {
    console.error('[scraper-sync] unauthorized');
    return response.status(401).json({ error: 'Unauthorized' });
  }

  // Step 2: ping mode
  if (request.query?.ping === '1') {
    console.log('[scraper-sync] ping mode');
    try {
      const { db } = getFirebaseAdminServices();
      await db.collection('_ping').doc('test').set({ ts: new Date().toISOString() });
      return response.status(200).json({ ok: true, ping: true, ts: new Date().toISOString() });
    } catch (pingErr) {
      console.error('[scraper-sync] ping error:', pingErr);
      return response.status(500).json({ error: 'Ping failed', message: getErrorMessage(pingErr) });
    }
  }

  // Step 3: scrape PCSO
  // NOTE: pcso.gov.ph is protected by Akamai WAF which blocks known cloud/data-center IPs.
  // Vercel's US-East servers are blocked. Scraping is now handled by the GitHub Actions
  // workflow (.github/workflows/pcso-scraper.yml) which runs from GitHub's IPs.
  // This endpoint is kept for manual/ad-hoc use only. If called from Vercel it will likely
  // return a 403 from PCSO — run the script locally or via GitHub Actions instead.
  console.log('[scraper-sync] starting PCSO scrape (note: may fail on Vercel due to Akamai IP blocking)');
  let rows: ScrapedDraw[];
  try {
    rows = await scrapeLatestPcsoResults();
    console.log(`[scraper-sync] scraped ${rows.length} rows`);
  } catch (scrapeErr) {
    const msg = getErrorMessage(scrapeErr);
    console.error('[scraper-sync] scrape error:', msg);
    return response.status(503).json({
      error: 'PCSO scraping failed',
      message: msg,
      hint: 'pcso.gov.ph (Akamai WAF) blocks Vercel server IPs. Run the scraper via GitHub Actions (.github/workflows/pcso-scraper.yml) instead.',
    });
  }

  // Step 4: write to Firestore
  console.log('[scraper-sync] writing to Firestore');
  try {
    const { db } = getFirebaseAdminServices();
    const now = admin.firestore.Timestamp.now();
    const batch = db.batch();
    let skippedByBackfill = 0;

    const monthsBack = Number(process.env.PCSO_BACKFILL_MONTHS || '12');
    const earliest = new Date();
    earliest.setMonth(earliest.getMonth() - monthsBack);

    rows.forEach(row => {
      if (row.drawDate < earliest) { skippedByBackfill += 1; return; }
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
    console.log(`[scraper-sync] done. rows=${rows.length} skipped=${skippedByBackfill}`);

    return response.status(200).json({
      success: true,
      fetchedRows: rows.length,
      skippedByBackfill,
      windowMonths: monthsBack,
    });
  } catch (dbErr) {
    console.error('[scraper-sync] firestore error:', String(dbErr));
    return response.status(500).json({ error: 'Failed to write to Firestore', message: getErrorMessage(dbErr) });
  }
}
