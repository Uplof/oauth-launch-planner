// One Claude client for all AI endpoints. The key comes from Vercel's ANTHROPIC_API_KEY setting.
import Anthropic from '@anthropic-ai/sdk';

export const MODEL = 'claude-opus-5-5';
// Server-side fallback: if a request is declined, the API re-runs it on a suitable model in the same call.
export const FALLBACK = { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' };

export function client() {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  return new Anthropic();
}

export const KEY_MISSING = 'The AI key is not set yet. Add GROQ_API_KEY (free) or ANTHROPIC_API_KEY in the Vercel project settings, then redeploy.';

export function textOf(message) {
  return message.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
}

// Pull the last JSON object out of a text answer (inside ```json fences or bare).
export function lastJson(text) {
  const fenced = [...text.matchAll(/```(?:json)?\s*([\s\S]*?)```/g)].map((m) => m[1]);
  const candidates = fenced.length ? fenced.reverse() : [text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)];
  for (const c of candidates) {
    try { return JSON.parse(c); } catch { /* try the next one */ }
  }
  return null;
}
