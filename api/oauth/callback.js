// Receives Google's redirect, swaps the one-time code for tokens, and reports what Google granted.
// Tokens are never shown or stored: the page only reports which permissions came back and when they expire.

const LABELS = {
  'https://www.googleapis.com/auth/gmail.send': 'Send email (sensitive)',
  'https://www.googleapis.com/auth/gmail.readonly': 'Read email (restricted)',
  'https://www.googleapis.com/auth/userinfo.email': 'Email address (basic)',
  openid: 'Sign-in (basic)',
};

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function page(title, body) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><style>
body{font:16px/1.55 system-ui,sans-serif;max-width:680px;margin:8vh auto;padding:0 16px;color:#16191f;background:#f4f5f7}
h1{font-size:24px;margin:0 0 12px} table{border-collapse:collapse;width:100%;background:#fff;border:1px solid #dde0e6;border-radius:8px}
td,th{padding:10px 12px;border-bottom:1px solid #dde0e6;text-align:left;vertical-align:top} th{font-weight:600;width:44%}
.ok{color:#1f7a4d}.no{color:#9a5b00} code{font-size:13px} .note{color:#5b6270;font-size:14px}
</style></head><body>${body}</body></html>`;
}

function cookie(req, name) {
  const m = (req.headers.cookie || '').match(new RegExp(`(?:^|; )${name}=([^;]+)`));
  return m ? m[1] : null;
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  const { code, state, error, scope } = req.query;

  if (error) {
    res.status(200).send(page('Sign-in cancelled', `<h1>Google returned an error</h1><p><code>${esc(error)}</code></p>
<p class="note">This is what your app receives when a user clicks Cancel or Google blocks the request.</p>`));
    return;
  }
  if (!code) {
    res.status(200).send(page('OAuth callback', '<h1>OAuth callback</h1><p>Nothing to do here. <a href="/oauth/start">Start a test sign-in</a>.</p>'));
    return;
  }
  if (!state || state !== cookie(req, 'oauth_state')) {
    res.status(400).send(page('State mismatch', '<h1>State check failed</h1><p>The sign-in did not start here, or took longer than 10 minutes. <a href="/oauth/start">Try again</a>.</p>'));
    return;
  }

  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const proto = host.startsWith('localhost') ? 'http' : 'https';
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.client_id,
      client_secret: process.env.client_secret,
      redirect_uri: `${proto}://${host}/oauth/callback`,
      grant_type: 'authorization_code',
    }),
  });
  const t = await r.json();
  res.setHeader('Set-Cookie', 'oauth_state=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0');

  if (!r.ok) {
    res.status(200).send(page('Token exchange failed', `<h1>Token exchange failed</h1><p><code>${esc(t.error || r.status)}</code> ${esc(t.error_description || '')}</p>`));
    return;
  }

  const granted = new Set((t.scope || scope || '').split(' ').filter(Boolean));
  const asked = ['openid', 'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/gmail.send', 'https://www.googleapis.com/auth/gmail.readonly'];
  const rows = asked.map((s) => `<tr><th>${esc(LABELS[s] || s)}</th><td class="${granted.has(s) ? 'ok' : 'no'}">${granted.has(s) ? 'Granted' : 'Not granted'}</td></tr>`).join('');
  const days = (sec) => (sec ? `${Math.round(sec / 86400 * 10) / 10} days (${sec} s)` : 'not stated');

  res.status(200).send(page('What Google granted', `<h1>What Google granted our test app</h1>
<table>${rows}
<tr><th>Access token lifetime</th><td>${t.expires_in ? Math.round(t.expires_in / 60) + ' minutes' : 'not stated'}</td></tr>
<tr><th>Refresh token returned</th><td>${t.refresh_token ? 'Yes' : 'No'}</td></tr>
<tr><th>Refresh token expires in</th><td>${days(t.refresh_token_expires_in)}</td></tr>
<tr><th>Checked at</th><td>${new Date().toISOString()}</td></tr></table>
<p class="note">Tokens were used only to read this report and were not shown or stored.</p>`));
}
