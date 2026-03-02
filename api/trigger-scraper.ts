import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getFirebaseAdminServices } from './_lib/firebaseAdmin';

/**
 * POST /api/trigger-scraper
 * Triggers the PCSO scraper GitHub Actions workflow via workflow_dispatch.
 *
 * Required env vars (set in Vercel dashboard):
 *   GITHUB_TOKEN      — Personal Access Token with "repo" + "actions:write" scope
 *   GITHUB_OWNER      — GitHub username or org (e.g. "johndoe")
 *   GITHUB_REPO       — Repository name (e.g. "personal-management-app")
 *
 * Optional body: { months_back: "1" }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo  = process.env.GITHUB_REPO;

  if (!token || !owner || !repo) {
    return res.status(500).json({
      error: 'Missing GITHUB_TOKEN, GITHUB_OWNER, or GITHUB_REPO environment variables.',
      hint: 'Add them in Vercel Dashboard → Settings → Environment Variables.',
    });
  }

  const months_back: string = (req.body as { months_back?: string })?.months_back ?? '1';
  const { db } = getFirebaseAdminServices();

  // Resolve current PHT date/hour on the server to enforce a global slot lock.
  const nowPHT = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  const dateStr = `${nowPHT.find(p => p.type === 'year')?.value}-${nowPHT.find(p => p.type === 'month')?.value}-${nowPHT.find(p => p.type === 'day')?.value}`;
  const hour = Number(nowPHT.find(p => p.type === 'hour')?.value ?? '0');

  const slot: 'day' | 'night' | null =
    hour >= 8 && hour < 17 ? 'day' :
    hour >= 17 || hour === 0 ? 'night' :
    null;

  const settingsRef = db.collection('settings').doc('site-settings');
  const settingsSnap = await settingsRef.get();
  const settings = settingsSnap.exists ? settingsSnap.data() : {};
  const scraperMode = settings?.scraperMode === 'always' ? 'always' : 'timed';

  if (scraperMode === 'timed') {
    if (!slot) {
      return res.status(429).json({
        error: 'Scraper button is outside allowed time window.',
        detail: 'Allowed windows are 8:00 AM–4:59 PM (day) and 5:00 PM–12:59 AM (night), PHT.',
      });
    }

    const field = slot === 'day' ? 'scraperDayLastRunDate' : 'scraperNightLastRunDate';
    if (settings?.[field] === dateStr) {
      return res.status(429).json({
        error: `Scraper already triggered for the current ${slot} slot.`,
        detail: `Only one trigger is allowed per ${slot} slot in timed mode.`,
      });
    }
  }

  const githubUrl = `https://api.github.com/repos/${owner}/${repo}/actions/workflows/pcso-scraper.yml/dispatches`;

  const response = await fetch(githubUrl, {
    method: 'POST',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ref: 'main',
      inputs: { months_back },
    }),
  });

  // GitHub returns 204 No Content on success
  if (response.status === 204) {
    if (scraperMode === 'timed' && slot) {
      const field = slot === 'day' ? 'scraperDayLastRunDate' : 'scraperNightLastRunDate';
      await settingsRef.set(
        {
          [field]: dateStr,
          scraperLastTriggeredAt: new Date().toISOString(),
        },
        { merge: true }
      );
    }

    return res.status(200).json({ ok: true, message: 'Scraper workflow triggered successfully.' });
  }

  const text = await response.text();
  let detail: unknown = text;
  try { detail = JSON.parse(text); } catch { /* leave as text */ }

  console.error('[trigger-scraper] GitHub API error', response.status, detail);
  return res.status(response.status).json({
    error: `GitHub API returned ${response.status}`,
    detail,
  });
}
