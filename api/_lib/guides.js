// Shared helpers for the server endpoints: read the guide files and build plans from them.
import fs from 'node:fs';
import path from 'node:path';

const DIR = path.join(process.cwd(), 'src', 'data', 'guides');
const RANK = { basic: 0, sensitive: 1, restricted: 2, partner: 3 };

export function listGuides() {
  return fs.readdirSync(DIR).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')));
}

export function getGuide(slug) {
  const safe = String(slug || '').toLowerCase().replace(/[^a-z0-9-]/g, '');
  const file = path.join(DIR, `${safe}.json`);
  return safe && fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
}

// A plan for one app, narrowed to the actions the agent needs (all actions when none given).
export function planFor(guide, needs = []) {
  const picked = needs.length ? guide.actions.filter((a) => needs.includes(a.id)) : guide.actions;
  const worst = [...picked].sort((a, b) => RANK[b.level] - RANK[a.level])[0];
  return {
    app: guide.slug,
    name: guide.name,
    checked: guide.checked,
    verdict: {
      difficulty: guide.difficulty,
      headline: guide.headline,
      path: worst?.level ?? 'basic',
      review: worst?.review ?? 'None',
      to_live: worst?.timeToLive ?? guide.production.text,
      first_test: guide.firstTest,
      approval_wait: guide.approvalWait,
      test_mode: guide.testMode,
    },
    actions: picked.map(({ id, label, scope, level, review, proof }) => ({ id, label, scope, level, review, proof })),
    start_today: guide.steps.filter((s) => s.slow).map((s) => s.title),
    steps: guide.steps.map(({ title, detail, owner, time, proof, link }) => ({ title, detail, owner, time, proof, link })),
    blockers: guide.blockers,
    agent_can: guide.agentCan,
    you_do: guide.youDo,
    unconfirmed: guide.unconfirmed,
    sources: guide.sources,
    guide_url: `https://oauth-launch-planner.vercel.app/apps/${guide.slug}`,
  };
}

export function send(res, status, body) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(status).send(JSON.stringify(body, null, 2));
}
