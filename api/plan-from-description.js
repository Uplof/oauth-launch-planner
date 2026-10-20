// POST /api/plan-from-description  { "description": "An AI assistant that reads support emails in Gmail..." }
// Claude reads the product description and returns the apps it connects to and what it does in each,
// matched to my guides where I have them. The screen then builds the launch plan from those guides.
import Anthropic from '@anthropic-ai/sdk';
import { client, MODEL, FALLBACK, KEY_MISSING, textOf } from './_lib/claude.js';
import { listGuides, planFor, send } from './_lib/guides.js';
import { hasAI, aiJson, AIError } from './_lib/ai.js';

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['summary', 'apps'],
  properties: {
    summary: { type: 'string', description: 'One sentence restating what the product does.' },
    apps: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['slug', 'name', 'known', 'needs', 'actions'],
        properties: {
          slug: { type: 'string', description: 'Guide slug when known, else a lowercase name like "zoom".' },
          name: { type: 'string' },
          known: { type: 'boolean', description: 'True only if the slug is in the list of guides.' },
          needs: { type: 'array', items: { type: 'string' }, description: 'Action ids from that guide the product needs. Empty when not known.' },
          actions: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['label', 'why'],
              properties: { label: { type: 'string' }, why: { type: 'string', description: 'The words in the description that imply it.' } },
            },
          },
        },
      },
    },
  },
};

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  const chunks = [];
  for await (const c of req) chunks.push(c);
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch { return {}; }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Use POST with {"description": "..."}' });
  const { description = '' } = await readBody(req);
  const text = String(description).trim().slice(0, 2000);
  if (text.length < 10) return send(res, 400, { error: 'Describe the product in a sentence or two.' });
  const guides = listGuides();
  const catalogue = guides.map((g) => ({ slug: g.slug, name: g.name, actions: g.actions.map((a) => ({ id: a.id, label: a.label })) }));
  const finish = (out) => {
    const apps = (out.apps || []).map((a) => {
      const g = a.known ? guides.find((x) => x.slug === a.slug) : null;
      return g ? { ...a, known: true, plan: planFor(g, a.needs || []) } : { ...a, known: false, needs: [], plan: null };
    });
    return send(res, 200, { description: text, summary: out.summary || '', apps });
  };

  // Free path: Groq.
  if (hasAI()) {
    try {
      const out = await aiJson(
        'You read a short product description for an AI agent and list every third-party app its users would connect with OAuth, and what the agent does in each. ' +
        'Use the guide catalogue when an app is in it: set known=true and pick the matching action ids in needs (only actions the description implies). ' +
        'For apps not in the catalogue set known=false and needs=[]. Do not invent apps the description does not imply. ' +
        'Reply with JSON only, shaped exactly: {"summary": string, "apps": [{"slug": string, "name": string, "known": boolean, "needs": string[], "actions": [{"label": string, "why": string}]}]}\n\nGuide catalogue:\n' + JSON.stringify(catalogue),
        text, 3000);
      return finish(out);
    } catch (e) {
      return send(res, e instanceof AIError ? (e.status === 401 ? 503 : e.status) : 500, { error: e.message || 'Could not build the plan.' });
    }
  }

  const c = client();
  if (!c) return send(res, 503, { error: KEY_MISSING });

  try {
    const msg = await c.beta.messages.create({
      model: MODEL,
      max_tokens: 4000,
      ...FALLBACK,
      output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
      system:
        'You read a short product description for an AI agent and list every third-party app its users would connect with OAuth, and what the agent does in each. ' +
        'Use the guide catalogue when an app is in it: set known=true and pick the matching action ids in needs (only actions the description implies). ' +
        'For apps not in the catalogue set known=false and needs=[]. Do not invent apps the description does not imply.\n\nGuide catalogue:\n' +
        JSON.stringify(catalogue),
      messages: [{ role: 'user', content: text }],
    });
    if (msg.stop_reason === 'refusal') return send(res, 422, { error: 'The planner declined this description. Try rewording it.' });
    return finish(JSON.parse(textOf(msg)));
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) return send(res, 503, { error: 'The AI key was rejected. Check ANTHROPIC_API_KEY in Vercel.' });
    if (e instanceof Anthropic.RateLimitError) return send(res, 429, { error: 'Too many requests right now. Try again in a minute.' });
    if (e instanceof Anthropic.APIError) return send(res, 502, { error: `AI request failed (${e.status}).` });
    return send(res, 500, { error: 'Could not build the plan.' });
  }
}
