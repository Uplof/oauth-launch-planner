// Per-visitor cap on new research runs, so a few visitors cannot spend the whole free AI allowance.
// Saved and library guides are free; only runs that call the AI count. Counts live in Vercel Blob.
import { createHash } from 'node:crypto';
import { put, head } from '@vercel/blob';

export const DAILY_RUNS = Number(process.env.RESEARCH_RUNS_PER_DAY || 3);

const visitor = (req) => {
  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  return createHash('sha256').update(ip).digest('hex').slice(0, 16); // never store the raw IP
};
const key = (req) => `limits/${new Date().toISOString().slice(0, 10)}/${visitor(req)}.json`;

// Returns the runs left after counting this one, or -1 when the visitor is over the cap.
export async function takeRun(req) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return DAILY_RUNS;
  let used = 0;
  try {
    const meta = await head(key(req));
    used = (await (await fetch(meta.url, { cache: 'no-store' })).json()).used || 0;
  } catch { /* first run today */ }
  if (used >= DAILY_RUNS) return -1;
  try {
    await put(key(req), JSON.stringify({ used: used + 1 }), { access: 'public', contentType: 'application/json', addRandomSuffix: false, allowOverwrite: true, cacheControlMaxAge: 60 });
  } catch (e) { console.log('[limit] count failed', e?.message); }
  return DAILY_RUNS - used - 1;
}
