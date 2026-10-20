// Receives Notion's redirect, swaps the code for tokens, and reports what Notion granted.
// Tokens are never shown or stored.
import { NOTION_REDIRECT, notionClientId } from './start.js';
import { esc, page, cookie, human, rows } from '../_page.js';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  const { code, state, error } = req.query;
  if (error) return res.status(200).send(page('Cancelled', `<h1>Notion returned an error</h1><p><code>${esc(error)}</code></p>`));
  if (!code) return res.status(200).send(page('Notion callback', '<h1>Notion callback</h1><p><a href="/oauth/notion/start">Start a test sign-in</a>.</p>'));
  if (!state || state !== cookie(req, 'notion_state')) return res.status(400).send(page('State mismatch', '<h1>State check failed</h1><p><a href="/oauth/notion/start">Try again</a>.</p>'));
  const secret = process.env.notion_secret || process.env.NOTION_CLIENT_SECRET;
  if (!secret || !notionClientId()) return res.status(500).send(page('Missing secret', '<h1>Client ID or secret not set</h1><p>Add <code>notion_client_id</code> and <code>notion_secret</code> in Vercel settings.</p>'));

  const r = await fetch('https://api.notion.com/v1/oauth/token', {
    method: 'POST',
    headers: { Authorization: `Basic ${Buffer.from(`${notionClientId()}:${secret}`).toString('base64')}`, 'Content-Type': 'application/json', 'Notion-Version': '2022-06-28' },
    body: JSON.stringify({ grant_type: 'authorization_code', code, redirect_uri: NOTION_REDIRECT }),
  });
  const t = await r.json();
  res.setHeader('Set-Cookie', 'notion_state=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0');
  if (!r.ok) return res.status(200).send(page('Token exchange failed', `<h1>Token exchange failed</h1><p><code>${esc(t.error || r.status)}</code> ${esc(t.error_description || t.message || '')}</p>`));
  // Notion has no scopes: the user picks which pages the connection can see on the consent screen.
  let pages = '(could not check)';
  try {
    const s = await fetch('https://api.notion.com/v1/search', { method: 'POST', headers: { Authorization: `Bearer ${t.access_token}`, 'Notion-Version': '2022-06-28', 'Content-Type': 'application/json' }, body: JSON.stringify({ page_size: 100 }) });
    const d = await s.json();
    if (s.ok) pages = `${d.results?.length ?? 0}${d.has_more ? '+' : ''} pages or databases shared`;
  } catch { /* report without the count */ }
  res.status(200).send(page('What Notion granted', `<h1>What Notion granted my test connection</h1>${rows([
    ['Workspace', t.workspace_name || '(not stated)'],
    ['Owner type', t.owner?.type || '(not stated)'],
    ['Access granted', pages],
    ['Access token lifetime', human(t.expires_in)],
    ['Refresh token returned', t.refresh_token ? 'Yes' : 'No'],
    ['Checked at', new Date().toISOString()],
  ])}<p class="note">Notion has no permission scopes to ask for: on the consent screen the user chooses which pages the connection may see. Tokens were used only to read this report and were not shown or stored.</p>`));
}
