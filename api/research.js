// GET /api/research?app=Zoom   (server-sent events)
// Live research for an app the library doesn't have:
//   1. Researcher: Claude with web search + web fetch reads the provider's own docs and writes a guide.
//   2. Checker: a second pass opens the cited pages and downgrades claims it cannot confirm.
// Every search, page read and correction is streamed to the screen as it happens.
import Anthropic from '@anthropic-ai/sdk';
import { client, MODEL, FALLBACK, KEY_MISSING, textOf, lastJson } from './_lib/claude.js';
import { GUIDE_FORMAT } from './_lib/format.js';
import { getGuide } from './_lib/guides.js';
import { hasAI, aiSearch, aiJson, AIError } from './_lib/ai.js';
import { loadSaved, saveGuide } from './_lib/store.js';
import { takeRun, DAILY_RUNS } from './_lib/limit.js';

const TOOLS = [
  { type: 'web_search_20260209', name: 'web_search', max_uses: 8 },
  { type: 'web_fetch_20260209', name: 'web_fetch', max_uses: 10 },
];

// Without these the guide is useless; the lists below them may come back missing and default to empty.
const REQUIRED = ['difficulty', 'headline', 'firstTest', 'production', 'approvalWait', 'testMode', 'actions', 'steps'];
const LISTS = ['blockers', 'agentCan', 'youDo', 'drafts', 'sources', 'unconfirmed'];

function sse(res, event, data) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

// Runs one Claude turn with the web tools, streaming tool activity, and resumes on pause_turn.
async function runWithTools(c, res, params, label) {
  let messages = params.messages;
  for (let round = 0; round < 5; round++) {
    const stream = c.beta.messages.stream({ ...params, messages });
    const inputs = {};
    for await (const ev of stream) {
      if (ev.type === 'content_block_start' && ev.content_block.type === 'server_tool_use') inputs[ev.index] = { name: ev.content_block.name, json: '' };
      if (ev.type === 'content_block_delta' && ev.delta.type === 'input_json_delta' && inputs[ev.index]) inputs[ev.index].json += ev.delta.partial_json;
      if (ev.type === 'content_block_stop' && inputs[ev.index]) {
        let input = {};
        try { input = JSON.parse(inputs[ev.index].json || '{}'); } catch { /* partial input */ }
        const { name } = inputs[ev.index];
        if (name === 'web_search' && input.query) sse(res, 'activity', { phase: label, kind: 'search', text: input.query });
        if (name === 'web_fetch' && input.url) sse(res, 'activity', { phase: label, kind: 'read', text: input.url });
        delete inputs[ev.index];
      }
    }
    const msg = await stream.finalMessage();
    if (msg.stop_reason === 'refusal') throw Object.assign(new Error('refused'), { refusal: true });
    if (msg.stop_reason !== 'pause_turn') return msg;
    messages = [...messages, { role: 'assistant', content: msg.content }];
  }
  throw new Error('research took too many rounds');
}

function clean(g, name) {
  const slug = String(g.slug || name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const claim = (x) => ({ text: String(x?.text ?? 'Not found'), proof: ['docs', 'community'].includes(x?.proof) && x?.source ? x.proof : 'unconfirmed', ...(x?.source ? { source: x.source } : {}) });
  for (const k of LISTS) if (!Array.isArray(g[k])) g[k] = [];
  return {
    ...g,
    slug, name: g.name || name, category: g.category || 'Other', sample: false, generated: true,
    difficulty: ['easy', 'moderate', 'hard', 'gated'].includes(g.difficulty) ? g.difficulty : 'moderate',
    firstTest: claim(g.firstTest), production: claim(g.production), approvalWait: claim(g.approvalWait), whoCanRegister: claim(g.whoCanRegister), testMode: claim(g.testMode),
    actions: (g.actions || []).map((a) => ({ ...a, proof: a.proof === 'tested' ? 'docs' : a.proof || 'unconfirmed' })),
    steps: (g.steps || []).map((s) => ({ ...s, proof: s.proof === 'tested' ? 'docs' : s.proof || 'unconfirmed' })),
    blockers: (g.blockers || []).map((b) => ({ ...b, proof: b.proof === 'tested' ? 'docs' : b.proof || 'unconfirmed' })),
    screenshots: [],
    checked: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
  };
}

const urlsIn = (text) => [...new Set((text.match(/https?:\/\/[^\s)\]】>"']+/g) || []).map((u) => u.replace(/[.,;]+$/, '')))];

// Free path: Groq's gpt-oss-120b with built-in browser search. Search → write → check.
async function researchFree(res, name) {
  // Two focused searches give better sources than one broad one.
  const RULES = 'Use the provider\'s official developer docs first. Write compact bullet notes. After every fact put the source URL in parentheses, ' +
    'and only use URLs of pages you actually opened in your search results; never guess a URL. Write "not found" for anything you could not find.';
  sse(res, 'step', { id: 'research', text: `Searching ${name}'s developer docs: app setup and permissions` });
  const a = await aiSearch(
    `How does a developer register an OAuth app with ${name} so other people's accounts can connect (for an AI agent product)? ` +
    'Cover: where to create the app, who can register, required fields (homepage, privacy policy, redirect URL), the permissions/scopes an agent typically needs, and token lifetimes. ' + RULES, 3000);
  sse(res, 'step', { id: 'research2', text: `Searching ${name}'s review and publishing rules` });
  const b = await aiSearch(
    `For ${name} OAuth apps: what review, verification or marketplace approval is needed before any user can connect, published review wait times, ` +
    'limits that apply before approval (test users, development mode, rate limits), and common rejection reasons. ' + RULES, 3000);
  // The search model often leaves URLs out of its answer; the raw search results still carry them.
  const found = urlsIn(JSON.stringify([...a.tools, ...b.tools])).filter((u) => !/groq\.com|google\.com\/search|vertexaisearch/.test(u)).slice(0, 20);
  const notes = { text: `${a.text}\n\n${b.text}${found.length ? `\n\nPages the search opened:\n${found.join('\n')}` : ''}`, tools: [...a.tools, ...b.tools] };
  for (const u of urlsIn(notes.text).slice(0, 14)) sse(res, 'activity', { phase: 'research', kind: 'read', text: u });
  for (const t of notes.tools) if (t?.arguments) {
    try { const x = JSON.parse(t.arguments); if (x.query) sse(res, 'activity', { phase: 'research', kind: 'search', text: x.query }); } catch { /* not JSON */ }
  }

  sse(res, 'step', { id: 'write', text: 'Writing the guide from the notes' });
  console.log('[research] notes chars', notes.text.length);
  const raw = await aiJson(
    'You turn research notes into a guide. Use ONLY facts in the notes; copy their source URLs into "source" fields and into "sources". ' +
    'Anything the notes do not support gets proof "unconfirmed" and a line in "unconfirmed". Reply with the guide as JSON only.\n\nGuide format:\n' + GUIDE_FORMAT,
    `App: ${name}\n\nResearch notes:\n${notes.text}`,
    7000);
  console.log('[research] guide keys', Object.keys(raw || {}).join(','));
  if (REQUIRED.some((k) => !(k in raw))) throw new AIError('The guide came back incomplete. Try again.', 502);
  const guide = clean(raw, name);
  guide.sources = (guide.sources || []).filter((x) => /^https?:\/\//.test(x?.url || ''));
  if (!guide.sources.length) guide.sources = urlsIn(notes.text).slice(0, 8).map((url) => ({ title: new URL(url).hostname, url }));
  sse(res, 'step', { id: 'draft', text: `Draft guide: ${guide.actions.length} permissions, ${guide.steps.length} steps, ${guide.sources.length} sources` });

  const claims = ['production', 'approvalWait', 'testMode', 'whoCanRegister'].filter((k) => guide[k].source && guide[k].proof !== 'unconfirmed')
    .map((k) => ({ path: k, text: guide[k].text, source: guide[k].source }));
  const corrections = [];
  guide.factCheck = 'none';
  if (claims.length) {
    sse(res, 'step', { id: 'check', text: `Checking ${claims.length} key claims against their sources` });
    for (const c of claims) sse(res, 'activity', { phase: 'check', kind: 'read', text: c.source });
    try {
      // Free tier: tokens per minute are tight after two searches, so pause before checking.
      sse(res, 'step', { id: 'pause', text: 'Waiting 30 seconds for the free AI allowance to refill' });
      await new Promise((r) => setTimeout(r, 30000));
      const check = await aiSearch(
        'You are a strict fact checker. For each claim, look at its source page and decide whether the page supports the claim. ' +
        'Reply with ONLY JSON: {"results":[{"path":"...","supported":true|false,"note":"short reason"}]}\n\n' + JSON.stringify(claims), 2000);
      const results = lastJson(check.text)?.results || [];
      for (const r of results) {
        if (r && r.supported === false && guide[r.path]) {
          corrections.push({ path: r.path, from: guide[r.path].proof, to: 'unconfirmed', note: r.note });
          guide[r.path] = { ...guide[r.path], proof: 'unconfirmed' };
          guide.unconfirmed = [...(guide.unconfirmed || []), `${r.path}: ${r.note}`];
        }
      }
      guide.factCheck = 'done';
      sse(res, 'step', { id: 'checked', text: `${results.length - corrections.length} confirmed, ${corrections.length} downgraded to “not confirmed”` });
    } catch (e) {
      guide.factCheck = 'skipped';
      sse(res, 'step', { id: 'checked', text: `Checker skipped (${e.message}). Claims keep the label from the notes.` });
    }
  }
  guide.corrections = corrections;
  // A guide with no sources is not worth sharing; show it, but let the next visitor research again.
  if (!guide.sources.length) sse(res, 'step', { id: 'saved', text: 'Not saved: the research found no source pages' });
  else try { await saveGuide(guide); sse(res, 'step', { id: 'saved', text: 'Saved: this guide now has a shareable link' }); } catch (e) { console.log('[research] save failed', e?.message); }
  sse(res, 'done', { guide });
}

export default async function handler(req, res) {
  const name = String(req.query.app || '').trim().slice(0, 80);
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  if (!name) { sse(res, 'error', { message: 'Pass ?app=<name or website>' }); return res.end(); }
  const existing = getGuide(name);
  if (existing) { sse(res, 'done', { guide: existing, fromLibrary: true }); return res.end(); }
  const fresh = String(req.query.fresh || '') === '1';
  const saved = fresh ? null : await loadSaved(name.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
  if (saved) { sse(res, 'step', { id: 'saved', text: `Found a saved guide from ${saved.checked}` }); sse(res, 'done', { guide: saved, fromStore: true }); return res.end(); }
  const c = hasAI() ? null : client();
  if (!hasAI() && !c) { sse(res, 'error', { message: KEY_MISSING }); return res.end(); }
  const left = await takeRun(req);
  if (left < 0) { sse(res, 'error', { message: `You have used today’s ${DAILY_RUNS} new research runs. Saved guides in the library still open instantly; try a new app tomorrow.`, code: 'limit' }); return res.end(); }

  const keepAlive = setInterval(() => res.write(': ping\n\n'), 15000);
  try {
    if (hasAI()) { await researchFree(res, name); return; }
    sse(res, 'step', { id: 'research', text: `Reading ${name}'s developer docs` });
    const research = await runWithTools(c, res, {
      model: MODEL,
      max_tokens: 32000,
      ...FALLBACK,
      output_config: { effort: 'medium' },
      tools: TOOLS,
      system:
        'You research how a developer registers an OAuth app with a provider and gets it approved, for developers building AI agents whose users connect that app. ' +
        'Use the provider\'s own developer documentation first; open the pages you cite. Be honest about evidence: mark anything you could not confirm as "unconfirmed" and list it. ' +
        'When done, reply with ONLY the guide as one JSON object in a ```json fence.\n\nGuide format:\n' + GUIDE_FORMAT,
      messages: [{ role: 'user', content: `Write the guide for: ${name}` }],
    }, 'research');

    let guide = lastJson(textOf(research));
    if (!guide || REQUIRED.some((k) => !(k in guide))) throw new Error('the research did not return a complete guide');
    guide = clean(guide, name);
    sse(res, 'step', { id: 'draft', text: `Draft guide: ${guide.actions.length} permissions, ${guide.steps.length} steps, ${guide.sources.length} sources` });

    // Checker: confirm the claims that carry a source.
    const claims = [
      ...['firstTest', 'production', 'approvalWait', 'whoCanRegister', 'testMode'].filter((k) => guide[k].source).map((k) => ({ path: k, text: guide[k].text, source: guide[k].source, proof: guide[k].proof })),
    ].slice(0, 6);
    let corrections = [];
    if (claims.length) {
      sse(res, 'step', { id: 'check', text: `Checking ${claims.length} key claims against their sources` });
      const check = await runWithTools(c, res, {
        model: MODEL,
        max_tokens: 8000,
        ...FALLBACK,
        output_config: { effort: 'low' },
        tools: [{ type: 'web_fetch_20260209', name: 'web_fetch', max_uses: 8 }],
        system:
          'You are a strict fact checker. For each claim, open its source and decide whether the source supports it. ' +
          'Reply with ONLY a ```json fence: {"results":[{"path":"...","supported":true|false,"note":"short reason"}]}',
        messages: [{ role: 'user', content: JSON.stringify(claims) }],
      }, 'check');
      const results = lastJson(textOf(check))?.results || [];
      for (const r of results) {
        if (r && r.supported === false && guide[r.path]) {
          corrections.push({ path: r.path, from: guide[r.path].proof, to: 'unconfirmed', note: r.note });
          guide[r.path] = { ...guide[r.path], proof: 'unconfirmed' };
          guide.unconfirmed = [...(guide.unconfirmed || []), `${r.path}: ${r.note}`];
        }
      }
      sse(res, 'step', { id: 'checked', text: `${results.length - corrections.length} confirmed, ${corrections.length} downgraded to “not confirmed”` });
    }
    guide.corrections = corrections;
    sse(res, 'done', { guide });
  } catch (e) {
    const message = e instanceof AIError ? e.message
      : e.refusal ? 'The research was declined for this app.'
      : e instanceof Anthropic.AuthenticationError ? 'The AI key was rejected. Check ANTHROPIC_API_KEY in Vercel.'
      : e instanceof Anthropic.RateLimitError ? 'Too many requests right now. Try again in a minute.'
      : e instanceof Anthropic.APIError ? `AI request failed (${e.status}).`
      : `Research failed: ${e.message}`;
    console.log('[research] failed', e?.status, e?.message);
    sse(res, 'error', { message });
  } finally {
    clearInterval(keepAlive);
    res.end();
  }
}
