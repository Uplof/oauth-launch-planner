// Saved guides from live research, in Vercel Blob, so a researched app never costs tokens twice
// and every generated guide has a shareable link.
import { put, head } from '@vercel/blob';

const key = (slug) => `guides/${String(slug).toLowerCase().replace(/[^a-z0-9-]/g, '')}.json`;
const enabled = () => !!process.env.BLOB_READ_WRITE_TOKEN;

export async function loadSaved(slug) {
  if (!enabled()) return null;
  try {
    const meta = await head(key(slug));
    const r = await fetch(meta.url, { cache: 'no-store' });
    return r.ok ? await r.json() : null;
  } catch {
    return null; // not saved yet
  }
}

export async function saveGuide(guide) {
  if (!enabled()) return null;
  const blob = await put(key(guide.slug), JSON.stringify(guide), { access: 'public', contentType: 'application/json', addRandomSuffix: false, allowOverwrite: true });
  return blob.url;
}
