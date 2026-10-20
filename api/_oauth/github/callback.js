// Receives GitHub's redirect, swaps the code for tokens, and reports what GitHub granted.
// Tokens are never shown or stored.
import { GITHUB_CLIENT_ID } from './start.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const page = (title, body) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><style>
body{font:16px/1.55 system-ui,sans-serif;max-width:680px;margin:8vh auto;padding:0 16px;color:#16191f;background:#f4f5f7}
h1{font-size:24px;margin:0 0 12px} table{border-collapse:collapse;width:100%;background:#fff;border:1px solid #dde0e6}
td,th{padding:10px 12px;border-bottom:1px solid #dde0e6;text-align:left} th{width:44%} .note{color:#5b6270;font-size:14px}</style></head><body>${body}</body></html>`;
const cookie = (req, n) => (req.headers.cookie || '').match(new RegExp(`(?:^|; )${n}=([^;]+)`))?.[1];
const human = (sec) => (!sec ? 'not stated' : sec >= 86400 ? `${Math.round((sec / 86400) * 10) / 10} days (${sec} s)` : `${Math.round((sec / 3600) * 10) / 10} hours (${sec} s)`);

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  const { code, state, error, error_description } = req.query;
  if (error) return res.status(200).send(page('Cancelled', `<h1>GitHub returned an error</h1><p><code>${esc(error)}</code> ${esc(error_description || '')}</p>`));
  if (!code) return res.status(200).send(page('GitHub callback', '<h1>GitHub callback</h1><p><a href="/oauth/github/start">Start a test sign-in</a>.</p>'));
  if (!state || state !== cookie(req, 'gh_state')) return res.status(400).send(page('State mismatch', '<h1>State check failed</h1><p><a href="/oauth/github/start">Try again</a>.</p>'));
  const secret = process.env.github_secret || process.env.GITHUB_CLIENT_SECRET;
  if (!secret) return res.status(500).send(page('Missing secret', '<h1>Client secret not set</h1><p>Add <code>github_secret</code> in Vercel settings.</p>'));

  const r = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: GITHUB_CLIENT_ID, client_secret: secret, code, redirect_uri: 'https://oauth-launch-planner.vercel.app/oauth/github/callback' }),
  });
  const t = await r.json();
  res.setHeader('Set-Cookie', 'gh_state=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0');
  if (t.error) return res.status(200).send(page('Token exchange failed', `<h1>Token exchange failed</h1><p><code>${esc(t.error)}</code> ${esc(t.error_description || '')}</p>`));
  res.status(200).send(page('What GitHub granted', `<h1>What GitHub granted our test app</h1><table>
<tr><th>Permissions asked</th><td>read:user, public_repo</td></tr>
<tr><th>Permissions granted</th><td>${esc(t.scope || '(none listed)')}</td></tr>
<tr><th>Access token lifetime</th><td>${human(t.expires_in)}</td></tr>
<tr><th>Refresh token returned</th><td>${t.refresh_token ? 'Yes' : 'No'}</td></tr>
<tr><th>Refresh token expires in</th><td>${human(t.refresh_token_expires_in)}</td></tr>
<tr><th>Checked at</th><td>${new Date().toISOString()}</td></tr></table>
<p class="note">Tokens were used only to read this report and were not shown or stored.</p>`));
}
