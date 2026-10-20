// Client helpers for the planner's server endpoints, plus the session cache for live results.
import type { AppGuide } from "@/data/apps"

export interface PlanApp {
  slug: string
  name: string
  known: boolean
  needs: string[]
  actions: { label: string; why: string }[]
  plan: {
    verdict: { difficulty: AppGuide["difficulty"]; headline: string; path: string; review: string; to_live: string }
    actions: { id: string; label: string; level: string; proof: string }[]
    start_today: string[]
    steps: { owner: string }[]
  } | null
}

export interface PlanResult {
  description: string
  summary: string
  apps: PlanApp[]
}

export async function planFromDescription(description: string): Promise<PlanResult> {
  const r = await fetch("/api/plan-from-description", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ description }),
  })
  const body = await r.json().catch(() => ({ error: "The planner did not answer." }))
  if (!r.ok) throw new Error(body.error || `Planner failed (${r.status})`)
  return body
}

export interface ReadinessResult {
  url: string
  score: number
  total: number
  checks: { id: string; label: string; ok: boolean; detail: string; fix: string | null }[]
  error?: string
}

export async function checkReadiness(url: string, app: string): Promise<ReadinessResult> {
  const r = await fetch(`/api/readiness?url=${encodeURIComponent(url)}&app=${encodeURIComponent(app)}`)
  const body = await r.json()
  if (!r.ok) throw new Error(body.error || "The check failed.")
  return body
}

function store(key: string, value: unknown) {
  try { sessionStorage.setItem(key, JSON.stringify(value)) } catch { /* storage unavailable */ }
}
function load<T>(key: string): T | null {
  try { const v = sessionStorage.getItem(key); return v ? (JSON.parse(v) as T) : null } catch { return null }
}

export const savePlan = (p: PlanResult) => store("planner:plan", p)
export const loadPlan = () => load<PlanResult>("planner:plan")
export const saveGuide = (g: AppGuide) => store(`planner:guide:${g.slug}`, g)
export const loadGuide = (slug: string) => load<AppGuide & { generated?: boolean; corrections?: { path: string; from: string; to: string; note: string }[]; factCheck?: "done" | "skipped" | "none" }>(`planner:guide:${slug}`)

// Rough weeks until real users can connect, by the strictest review in play.
export const WEEKS: Record<string, number> = { basic: 1, sensitive: 2, restricted: 10, partner: 12 }
