// Shared bits for the test sign-in callbacks: a plain report page, cookie read, readable lifetimes.
export const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const page = (title, body) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><style>
body{font:16px/1.55 system-ui,sans-serif;max-width:680px;margin:8vh auto;padding:0 16px;color:#16191f;background:#f4f5f7}
h1{font-size:24px;margin:0 0 12px} table{border-collapse:collapse;width:100%;background:#fff;border:1px solid #dde0e6}
td,th{padding:10px 12px;border-bottom:1px solid #dde0e6;text-align:left;vertical-align:top} th{width:44%} .note{color:#5b6270;font-size:14px}</style></head><body>${body}</body></html>`;
export const cookie = (req, n) => (req.headers.cookie || '').match(new RegExp(`(?:^|; )${n}=([^;]+)`))?.[1];
export const human = (sec) => (!sec ? 'does not expire (none stated)' : sec >= 86400 ? `${Math.round((sec / 86400) * 10) / 10} days (${sec} s)` : `${Math.round((sec / 3600) * 10) / 10} hours (${sec} s)`);
export const rows = (pairs) => `<table>${pairs.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join('')}</table>`;
