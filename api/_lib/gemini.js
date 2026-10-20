// Google Gemini (free tier), used as the backup when Groq's daily allowance runs out.
// Grounding with Google Search gives it its own web search. Key: GEMINI_API_KEY (or `gemini`).
import { AIError } from './groq.js';

const KEY = () => process.env.GEMINI_API_KEY || process.env.gemini;
export const hasGemini = () => !!KEY();
// First model that answers wins; override with GEMINI_MODEL if Google renames them.
const MODELS = () => [process.env.GEMINI_MODEL, 'gemini-2.5-flash', 'gemini-3.5-flash-lite', 'gemini-2.5-flash-lite', 'gemini-3.6-flash', 'gemini-3.8-flash'].filter(Boolean);

async function generate(body) {
  let last;
  let quota = false;
  for (const model of MODELS()) {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': KEY() },
      body: JSON.stringify(body),
    });
    const data = await r.json().catch(() => ({}));
    console.log('[gemini]', r.status, model, data?.usageMetadata?.totalTokenCount ?? '', data?.error?.message?.slice(0, 120) ?? '');
    if (r.status === 404) { last = data; continue; } // model name not available on this key
    if (r.status === 400 && /API key/i.test(data?.error?.message || '')) throw new AIError('The Gemini key was rejected. Check GEMINI_API_KEY in Vercel.', 401);
    if (r.status === 429) { last = data; quota = true; continue; } // this model's free allowance is used up or zero; try the next
    if (r.status >= 500) { last = data; continue; } // overloaded right now; try the next
    if (!r.ok) throw new AIError(`Gemini request failed (${r.status}): ${data?.error?.message || 'unknown error'}`, r.status);
    const parts = data?.candidates?.[0]?.content?.parts || [];
    const text = parts.map((p) => p.text || '').join('');
    const meta = data?.candidates?.[0]?.groundingMetadata || {};
    return { text, meta };
  }
  if (quota) throw new AIError('Today’s free AI allowance is used up on both Groq and Gemini. It resets within 24 hours.', 429);
  throw new AIError(`No Gemini model available (${last?.error?.message || 'not found'}). Set GEMINI_MODEL in Vercel.`, 404);
}

async function realUrl(uri) {
  if (!/grounding-api-redirect/.test(uri)) return uri;
  try {
    const r = await fetch(uri, { method: 'HEAD', redirect: 'manual', signal: AbortSignal.timeout(4000) });
    return r.headers.get('location') || null;
  } catch { return null; }
}

// Web research with Google Search grounding. Same return shape as groqSearch.
export async function geminiSearch(prompt) {
  const { text, meta } = await generate({ contents: [{ role: 'user', parts: [{ text: prompt }] }], tools: [{ google_search: {} }] });
  // Grounding cites through Google redirect links; follow each one to the real page so the guide shows the real URL.
  const sources = (await Promise.all((meta.groundingChunks || []).map((c) => c.web?.uri).filter(Boolean).map(realUrl))).filter(Boolean);
  // Grounded answers cite through redirect links; list the queries and the source titles too.
  const tools = (meta.webSearchQueries || []).map((q) => ({ arguments: JSON.stringify({ query: q }) }));
  const titles = (meta.groundingChunks || []).map((c) => c.web?.title).filter(Boolean);
  return { text: titles.length ? `${text}\n\nSources searched: ${titles.join(', ')}\n${sources.join('\n')}` : text, tools };
}

// JSON-mode completion. Same return shape as groqJson.
export async function geminiJson(system, user) {
  const { text } = await generate({
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: 'user', parts: [{ text: user }] }],
    generationConfig: { responseMimeType: 'application/json' },
  });
  try { return JSON.parse(text); } catch { throw new AIError('The AI returned an unreadable answer. Try again.', 502); }
}
