// One function for every test sign-in (the free hosting plan caps the number of functions).
// /oauth/<provider>/<start|callback> is rewritten here as ?p=<provider>&s=<step>; Google keeps /oauth/start and /oauth/callback.
import googleStart from './_oauth/google/start.js';
import googleCallback from './_oauth/google/callback.js';
import githubStart from './_oauth/github/start.js';
import githubCallback from './_oauth/github/callback.js';
import slackStart from './_oauth/slack/start.js';
import slackCallback from './_oauth/slack/callback.js';
import notionStart from './_oauth/notion/start.js';
import notionCallback from './_oauth/notion/callback.js';

const ROUTES = {
  google: { start: googleStart, callback: googleCallback },
  github: { start: githubStart, callback: githubCallback },
  slack: { start: slackStart, callback: slackCallback },
  notion: { start: notionStart, callback: notionCallback },
};

export default function handler(req, res) {
  const route = ROUTES[String(req.query.p || '')]?.[String(req.query.s || '')];
  if (!route) { res.status(404).send('Unknown sign-in test'); return; }
  return route(req, res);
}
