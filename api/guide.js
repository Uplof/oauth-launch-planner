// GET /api/guide?app=gmail  -> the full guide, or the list of guides when no app is given.
import { getGuide, listGuides, send } from './_lib/guides.js';
import { loadSaved } from './_lib/store.js';

export default async function handler(req, res) {
  const { app } = req.query;
  if (!app) return send(res, 200, listGuides().map((g) => ({ slug: g.slug, name: g.name, difficulty: g.difficulty, headline: g.headline })));
  const g = getGuide(app) || (await loadSaved(app));
  return g ? send(res, 200, g) : send(res, 404, { error: `No guide for "${app}" yet. Use /api/research?app=${app}.` });
}
