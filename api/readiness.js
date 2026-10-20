// GET /api/readiness?url=yourproduct.com&app=gmail
// Checks a developer's site the way OAuth reviewers do: homepage, privacy policy, terms, contact, HTTPS.
// Plain fetches and text checks; no AI needed.
import { send } from './_lib/guides.js';

const BLOCKED = /^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.|\[?::1\]?$|172\.(1[6-9]|2\d|3[01])\.)/i;

async function get(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    const r = await fetch(url, { redirect: 'follow', signal: ctrl.signal, headers: { 'User-Agent': 'OAuthLaunchPlanner/1.0 (+readiness check)' } });
    const text = (await r.text()).slice(0, 600000);
    return { ok: r.ok, status: r.status, url: r.url, text };
  } catch (e) {
    return { ok: false, status: 0, url, text: '', error: e.name === 'AbortError' ? 'timed out' : 'could not connect' };
  } finally {
    clearTimeout(t);
  }
}

const strip = (html) => html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

function findLink(html, base, words) {
  const re = /<a\b[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(html))) {
    const label = strip(m[2]).toLowerCase();
    const href = m[1].toLowerCase();
    if (words.some((w) => label.includes(w) || href.includes(w))) {
      try { return new URL(m[1], base).toString(); } catch { /* ignore bad href */ }
    }
  }
  return null;
}

export default async function handler(req, res) {
  let raw = String(req.query.url || '').trim();
  const app = String(req.query.app || '').toLowerCase();
  if (!raw) return send(res, 400, { error: 'Pass ?url=yourproduct.com' });
  if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`;
  let u;
  try { u = new URL(raw); } catch { return send(res, 400, { error: 'That is not a valid web address.' }); }
  if (!/^https?:$/.test(u.protocol) || BLOCKED.test(u.hostname)) return send(res, 400, { error: 'Only public websites can be checked.' });

  const home = await get(u.toString());
  const checks = [];
  const add = (id, label, ok, detail, fix) => checks.push({ id, label, ok, detail, fix: ok ? null : fix });

  add('reachable', 'Homepage loads', home.ok, home.ok ? `${home.status} from ${home.url}` : `Could not load the homepage (${home.error || home.status}).`, 'Reviewers open your homepage first. Make sure it loads without a login.');
  if (!home.ok) return send(res, 200, { url: u.toString(), score: 0, total: 1, checks, checked_at: new Date().toISOString() });

  const homeText = strip(home.text);
  const title = (home.text.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '').trim();
  add('https', 'Served over HTTPS', home.url.startsWith('https://'), home.url.startsWith('https://') ? 'Yes' : 'The final address is not HTTPS.', 'Providers require HTTPS for homepages and callback addresses.');
  add('explains', 'Homepage explains the product', homeText.length > 400 && !!title, title ? `Title: “${title.slice(0, 80)}”, ${homeText.length} characters of text` : 'No page title found.', 'Say plainly what the product does and why it connects to the user’s account.');

  const privacyUrl = findLink(home.text, home.url, ['privacy']);
  const termsUrl = findLink(home.text, home.url, ['terms', 'tos', 'conditions']);
  const contactFound = /mailto:|contact|support@|help@/i.test(home.text);

  let privacy = null;
  if (privacyUrl) privacy = await get(privacyUrl);
  const privacyOk = !!privacy?.ok;
  const sameDomain = privacyOk && new URL(privacy.url).hostname.replace(/^www\./, '') === new URL(home.url).hostname.replace(/^www\./, '');
  add('privacy', 'Privacy policy linked from the homepage', privacyOk, privacyOk ? privacy.url : privacyUrl ? `Linked, but it did not load (${privacy?.status || privacy?.error}).` : 'No privacy link found on the homepage.', 'Link a privacy policy from your homepage. Every OAuth review asks for it.');
  add('privacy-domain', 'Privacy policy on the same domain', sameDomain, sameDomain ? 'Yes' : 'The policy is on another domain or missing.', 'Host the policy on the same domain as the homepage; Google checks this.');

  const pText = privacyOk ? strip(privacy.text).toLowerCase() : '';
  const google = ['gmail', 'google', 'googlecalendar', 'googledrive'].includes(app) || !app;
  if (google) {
    add('limited-use', 'Policy covers Google user data (Limited Use)', /limited use|google api services user data policy/.test(pText), /limited use/.test(pText) ? 'Mentions Limited Use.' : 'No mention of Google’s Limited Use requirements.', 'Add a section on how you use Google user data and that you follow the Google API Services User Data Policy, including Limited Use.');
  }
  add('deletion', 'Policy explains data deletion', /delet/.test(pText), /delet/.test(pText) ? 'Mentions deletion.' : 'No mention of how users delete their data.', 'Explain how a user can disconnect and have their data deleted.');
  add('terms', 'Terms of service linked', !!termsUrl, termsUrl || 'No terms link found.', 'Link your terms of service; Notion, Slack and Google review forms ask for it.');
  add('contact', 'Support contact visible', contactFound, contactFound ? 'Found a contact or support link.' : 'No contact or support link found.', 'Show a support email or contact page; reviewers and users need a way to reach you.');

  const score = checks.filter((c) => c.ok).length;
  return send(res, 200, { url: home.url, score, total: checks.length, checks, checked_at: new Date().toISOString() });
}
