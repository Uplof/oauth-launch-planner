// Starts a GitHub OAuth test with my own OAuth app "OAuth Planner Test" (owner: Uplof).
// The client ID is public by design (it appears in every authorize URL); the secret lives in Vercel.
import crypto from 'node:crypto';

export const GITHUB_CLIENT_ID = 'Ov23liGEwdiqMq3npGY9';

export default function handler(req, res) {
  const state = crypto.randomBytes(16).toString('hex');
  const params = new URLSearchParams({
    client_id: GITHUB_CLIENT_ID,
    redirect_uri: 'https://oauth-launch-planner.vercel.app/oauth/github/callback',
    scope: 'read:user public_repo',
    state,
  });
  res.setHeader('Set-Cookie', `gh_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`);
  res.writeHead(302, { Location: `https://github.com/login/oauth/authorize?${params}` });
  res.end();
}
