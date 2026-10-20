// GET /api/plan?app=gmail&needs=send,read  -> a plan for coding agents: verdict, steps, proof labels.
import { getGuide, planFor, send } from './_lib/guides.js';

export default function handler(req, res) {
  const { app, needs = '' } = req.query;
  if (!app) return send(res, 400, { error: 'Pass ?app=<slug>, e.g. ?app=gmail&needs=send' });
  const g = getGuide(app);
  if (!g) return send(res, 404, { error: `No guide for "${app}" yet. Use /api/research?app=${app}.` });
  return send(res, 200, planFor(g, String(needs).split(',').map((s) => s.trim()).filter(Boolean)));
}
