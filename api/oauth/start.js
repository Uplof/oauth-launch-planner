// Starts a Google OAuth test with our own OAuth app ("OAuth Planner Test").
// Asks for sign-in plus two Gmail permissions so the consent screen shows both review levels.
import crypto from 'node:crypto';

const SCOPES = [
  'openid',
  'email',
  'https://www.googleapis.com/auth/gmail.send',      // sensitive
  'https://www.googleapis.com/auth/gmail.readonly',  // restricted
];

export default function handler(req, res) {
  const clientId = process.env.client_id;
  if (!clientId) {
    res.status(500).send('Missing client_id environment variable.');
    return;
  }
  const state = crypto.randomBytes(16).toString('hex');
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const proto = host.startsWith('localhost') ? 'http' : 'https';
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${proto}://${host}/oauth/callback`,
    response_type: 'code',
    scope: SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'false',
    state,
  });
  res.setHeader('Set-Cookie', `oauth_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`);
  res.writeHead(302, { Location: `https://accounts.google.com/o/oauth2/v2/auth?${params}` });
  res.end();
}
