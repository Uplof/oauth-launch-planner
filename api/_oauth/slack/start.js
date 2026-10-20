// Starts a Slack OAuth test with my own app "OAuth Planner Test" (workspace uplof.me, app A0CAQ98UQ9L).
// The client ID is public by design; the secret lives in Vercel as `slack_secret`.
import crypto from 'node:crypto';

export const SLACK_CLIENT_ID = '12364282446934.12364314976326';
export const SLACK_REDIRECT = 'https://oauth-launch-planner.vercel.app/oauth/slack/callback';
export const BOT_SCOPES = 'chat:write,channels:history,channels:read,groups:history,im:history,mpim:history,users:read,users:read.email';
export const USER_SCOPES = 'chat:write';

export default function handler(req, res) {
  const state = crypto.randomBytes(16).toString('hex');
  const params = new URLSearchParams({ client_id: SLACK_CLIENT_ID, scope: BOT_SCOPES, user_scope: USER_SCOPES, redirect_uri: SLACK_REDIRECT, state });
  res.setHeader('Set-Cookie', `slack_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`);
  res.writeHead(302, { Location: `https://slack.com/oauth/v2/authorize?${params}` });
  res.end();
}
