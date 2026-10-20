// Receives Slack's redirect, swaps the code for tokens, and reports what Slack granted.
// Tokens are never shown or stored.
import { SLACK_CLIENT_ID, SLACK_REDIRECT, BOT_SCOPES, USER_SCOPES } from './start.js';
import { esc, page, cookie, human, rows } from '../_page.js';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  const { code, state, error } = req.query;
  if (error) return res.status(200).send(page('Cancelled', `<h1>Slack returned an error</h1><p><code>${esc(error)}</code></p>`));
  if (!code) return res.status(200).send(page('Slack callback', '<h1>Slack callback</h1><p><a href="/oauth/slack/start">Start a test sign-in</a>.</p>'));
  if (!state || state !== cookie(req, 'slack_state')) return res.status(400).send(page('State mismatch', '<h1>State check failed</h1><p><a href="/oauth/slack/start">Try again</a>.</p>'));
  const secret = process.env.slack_secret || process.env.SLACK_CLIENT_SECRET;
  if (!secret) return res.status(500).send(page('Missing secret', '<h1>Client secret not set</h1><p>Add <code>slack_secret</code> in Vercel settings.</p>'));

  const r = await fetch('https://slack.com/api/oauth.v2.access', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: SLACK_CLIENT_ID, client_secret: secret, code, redirect_uri: SLACK_REDIRECT }),
  });
  const t = await r.json();
  res.setHeader('Set-Cookie', 'slack_state=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0');
  if (!t.ok) return res.status(200).send(page('Token exchange failed', `<h1>Token exchange failed</h1><p><code>${esc(t.error || 'unknown')}</code></p>`));
  const u = t.authed_user || {};
  res.status(200).send(page('What Slack granted', `<h1>What Slack granted my test app</h1>${rows([
    ['Workspace', t.team?.name || '(not stated)'],
    ['Bot permissions asked', BOT_SCOPES],
    ['Bot permissions granted', t.scope || '(none)'],
    ['Bot token type', t.token_type ? `${t.token_type} (${String(t.access_token || '').slice(0, 5)}…)` : '(none)'],
    ['Bot token lifetime', human(t.expires_in)],
    ['Bot refresh token returned', t.refresh_token ? 'Yes' : 'No'],
    ['User permissions asked', USER_SCOPES],
    ['User permissions granted', u.scope || '(none)'],
    ['User token lifetime', u.access_token ? human(u.expires_in) : '(no user token)'],
    ['Checked at', new Date().toISOString()],
  ])}<p class="note">Tokens were used only to read this report and were not shown or stored. The token type shows only its first five characters (xoxb = bot, xoxp = user).</p>`));
}
