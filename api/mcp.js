// POST /api/mcp  — a small MCP server (JSON-RPC over HTTP, stateless) so coding agents can use the planner.
// Tools: list_guides, get_oauth_plan, check_readiness, research_app (returns where to run live research).
import { getGuide, listGuides, planFor } from './_lib/guides.js';

const BASE = 'https://oauth-launch-planner.vercel.app';

const TOOLS = [
  { name: 'list_guides', description: 'List the apps that have an OAuth setup and approval guide.', inputSchema: { type: 'object', properties: {} } },
  {
    name: 'get_oauth_plan',
    description: 'Get the OAuth setup and approval plan for one app: verdict, review path for the permissions you need, steps marked agent/you/provider, blockers and proof labels.',
    inputSchema: { type: 'object', properties: { app: { type: 'string', description: 'App slug, e.g. gmail, slack, github' }, needs: { type: 'array', items: { type: 'string' }, description: 'Action ids, e.g. ["send","read"]. Omit for all.' } }, required: ['app'] },
  },
  {
    name: 'check_readiness',
    description: 'Check a product website the way OAuth reviewers do: homepage, HTTPS, privacy policy (same domain, Limited Use, deletion), terms, support contact.',
    inputSchema: { type: 'object', properties: { url: { type: 'string' }, app: { type: 'string' } }, required: ['url'] },
  },
  {
    name: 'research_app',
    description: 'Start live research for an app without a guide. Returns the URL that streams progress and the final guide.',
    inputSchema: { type: 'object', properties: { app: { type: 'string', description: 'App name or website' } }, required: ['app'] },
  },
];

const ok = (id, result) => ({ jsonrpc: '2.0', id, result });
const fail = (id, code, message) => ({ jsonrpc: '2.0', id, error: { code, message } });
const text = (obj) => ({ content: [{ type: 'text', text: typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2) }] });

async function call(name, args = {}) {
  if (name === 'list_guides') return text(listGuides().map((g) => ({ app: g.slug, name: g.name, difficulty: g.difficulty, headline: g.headline })));
  if (name === 'get_oauth_plan') {
    const g = getGuide(args.app);
    if (!g) return { ...text(`No guide for "${args.app}". Call research_app first.`), isError: true };
    return text(planFor(g, Array.isArray(args.needs) ? args.needs : []));
  }
  if (name === 'check_readiness') {
    const r = await fetch(`${BASE}/api/readiness?url=${encodeURIComponent(args.url)}&app=${encodeURIComponent(args.app || '')}`);
    return text(await r.json());
  }
  if (name === 'research_app') {
    return text({ stream: `${BASE}/api/research?app=${encodeURIComponent(args.app)}`, watch: `${BASE}/generate/${encodeURIComponent(String(args.app).toLowerCase())}`, note: 'Server-sent events; the final "done" event carries the guide. Takes 1-3 minutes.' });
  }
  return null;
}

async function handle(msg) {
  const { id, method, params } = msg || {};
  if (method === 'initialize') {
    return ok(id, { protocolVersion: params?.protocolVersion || '2025-06-18', capabilities: { tools: {} }, serverInfo: { name: 'greenlight', version: '1.0.0' } });
  }
  if (method === 'notifications/initialized' || method?.startsWith('notifications/')) return null;
  if (method === 'ping') return ok(id, {});
  if (method === 'tools/list') return ok(id, { tools: TOOLS });
  if (method === 'tools/call') {
    const result = await call(params?.name, params?.arguments);
    return result ? ok(id, result) : fail(id, -32602, `Unknown tool: ${params?.name}`);
  }
  return fail(id, -32601, `Method not found: ${method}`);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'GET') {
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).send(JSON.stringify({ name: 'greenlight', transport: 'POST JSON-RPC to this URL', tools: TOOLS.map((t) => t.name) }));
  }
  if (req.method !== 'POST') return res.status(405).end();
  const body = req.body && typeof req.body === 'object' ? req.body : JSON.parse(req.body || '{}');
  const out = Array.isArray(body) ? (await Promise.all(body.map(handle))).filter(Boolean) : await handle(body);
  if (!out || (Array.isArray(out) && !out.length)) return res.status(202).end();
  res.setHeader('Content-Type', 'application/json');
  return res.status(200).send(JSON.stringify(out));
}
