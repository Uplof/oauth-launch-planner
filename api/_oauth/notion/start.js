// Starts a Notion OAuth test with our own public connection "OAuth Planner Test".
// The client ID is public by design; it and the secret live in Vercel as `notion_client_id` and `notion_secret`.
import crypto from 'node:crypto';

export const NOTION_REDIRECT = 'https://oauth-launch-planner.vercel.app/oauth/notion/callback';
export const notionClientId = () => process.env.notion_client_id || process.env.NOTION_CLIENT_ID;

export default function handler(req, res) {
  if (!notionClientId()) { res.status(500).send('Add notion_client_id in Vercel settings.'); return; }
  const state = crypto.randomBytes(16).toString('hex');
  const params = new URLSearchParams({ client_id: notionClientId(), response_type: 'code', owner: 'user', redirect_uri: NOTION_REDIRECT, state });
  res.setHeader('Set-Cookie', `notion_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`);
  res.writeHead(302, { Location: `https://api.notion.com/v1/oauth/authorize?${params}` });
  res.end();
}
