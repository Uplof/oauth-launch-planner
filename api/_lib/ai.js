// One entry point for the free AI providers: Groq first, Gemini when Groq's daily allowance is used up.
import { hasGroq, groqSearch, groqJson, AIError } from './groq.js';
import { hasGemini, geminiSearch, geminiJson } from './gemini.js';

export { AIError };
export const hasAI = () => hasGroq() || hasGemini();
const outOfAllowance = (e) => e instanceof AIError && e.status === 429;

async function withFallback(groqCall, geminiCall) {
  if (hasGroq()) {
    try { return await groqCall(); } catch (e) { if (!(hasGemini() && (outOfAllowance(e) || e.status >= 500))) throw e; console.log('[ai] groq unavailable, using gemini:', e.message); }
  }
  if (hasGemini()) return geminiCall();
  throw new AIError('No AI key is set. Add GROQ_API_KEY or GEMINI_API_KEY in Vercel.', 503);
}

export const aiSearch = (prompt, maxTokens) => withFallback(() => groqSearch(prompt, maxTokens), () => geminiSearch(prompt));
export const aiJson = (system, user, maxTokens) => withFallback(() => groqJson(system, user, maxTokens), () => geminiJson(system, user));
