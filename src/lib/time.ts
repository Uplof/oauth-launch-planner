import { type AppGuide } from "@/data/apps"

// Plain wording for the typical times in a guide, shared by the guide page and the library.

export function setupText([lo, hi]: [number, number]) {
  if (hi <= 1) return "about 1 hour"
  if (hi < 8) return `${lo === hi ? hi : `${lo}-${hi}`} hours`
  const d = (h: number) => Math.max(1, Math.round(h / 8))
  return d(lo) === d(hi) ? `about ${d(hi)} day${d(hi) > 1 ? "s" : ""}` : `${d(lo)}-${d(hi)} days`
}

export function waitText(g: AppGuide) {
  const w = g.typical?.waitDays
  if (w === undefined) return "-"
  if (w === null) return "not published"
  if (w[1] === 0) return "no review"
  return w[0] === w[1] ? `about ${w[1]} days` : `${w[0]}-${w[1]} days`
}

// The headline answer: "Same day", "1-2 weeks", or "Not published" when nobody knows.
export function totalText(g: AppGuide) {
  const t = g.typical?.toRealUsers
  if (!t || t === "unknown") return "Not published"
  return t.charAt(0).toUpperCase() + t.slice(1)
}
