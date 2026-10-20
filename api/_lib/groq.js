// Groq (free tier, OpenAI-compatible API). Used when GROQ_API_KEY is set.
// openai/gpt-oss-120b has a built-in, server-side web search tool ("browser_search").
const URL_ = 'https://api.groq.com/openai/v1/chat/completions';
export const GROQ_MODEL = 'openai/gpt-oss-120b';
// Free tier: each model has its own daily token allowance, so we fall back to the other one when one runs out.
const SEARCH_MODELS = ['openai/gpt-oss-20b', 'openai/gpt-oss-120b'];
const WRITE_MODELS = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'qwen/qwen3.8-27b'];

// Accepts GROQ_API_KEY or the shorter name `groq` (as set in Vercel).
const KEY = () => process.env.GROQ_API_KEY || process.env.groq;
export const hasGroq = () => !!KEY();

export class AIError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// One chat completion. Retries once on a rate limit, honouring retry-after.
export async function groqChat(body, attempt = 0, models = WRITE_MODELS) {
  const model = body.model || models[0];
  const r = await fetch(URL_, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, model }),
  });
  if (r.status === 429) {
    const peek = await r.clone().json().catch(() => ({}));
    const daily = /per day/i.test(peek?.error?.message || '');
    const next = models[models.indexOf(model) + 1];
    if (daily && next) return groqChat({ ...body, model: next }, 0, models);
    if (daily) throw new AIError('Today’s free Groq allowance is used up. It resets within 24 hours.', 429);
  }
  if (r.status === 429 && attempt < 2) {
    const after = Math.min(30, Number(r.headers.get('retry-after')) || 10);
    await wait(after * 1000);
    return groqChat({ ...body, model }, attempt + 1, models);
  }
  const data = await r.json().catch(() => ({}));
  console.log('[groq]', r.status, model, body.tools ? 'search' : 'json', data?.usage?.total_tokens ?? '', data?.error?.message ?? '');
  if (r.status === 401) throw new AIError('The Groq key was rejected. Check GROQ_API_KEY in Vercel.', 401);
  if (r.status === 429) throw new AIError('Groq’s free tier is busy right now. Try again in a minute.', 429);
  if (!r.ok) throw new AIError(`AI request failed (${r.status}): ${data?.error?.message || 'unknown error'}`, r.status);
  return data.choices?.[0]?.message ?? {};
}

// Web research with Groq's built-in browser search. Returns the answer text.
export async function groqSearch(prompt, maxTokens = 3000) {
  const msg = await groqChat({
    model: SEARCH_MODELS[0],
    messages: [{ role: 'user', content: prompt }],
    tools: [{ type: 'browser_search' }],
    tool_choice: 'required',
    reasoning_effort: 'low',
    max_completion_tokens: maxTokens,
  }, 0, SEARCH_MODELS);
  return { text: msg.content || '', tools: msg.executed_tools || [] };
}

// JSON-mode completion (no tools). Returns the parsed object.
export async function groqJson(system, user, maxTokens = 6000) {
  const msg = await groqChat({
    messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
    response_format: { type: 'json_object' },
    reasoning_effort: 'low',
    max_completion_tokens: maxTokens,
  });
  try { return JSON.parse(msg.content || '{}'); } catch { throw new AIError('The AI returned an unreadable answer. Try again.', 502); }
}
