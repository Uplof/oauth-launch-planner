// Guide types. The guides themselves live in ./guides/*.json (Gmail includes our 20 Oct 2026 tests).

export type Proof = "tested" | "docs" | "community" | "unconfirmed"
export type Difficulty = "easy" | "moderate" | "hard" | "gated"
export type Owner = "agent" | "you" | "provider"

export interface Claim {
  text: string
  proof: Proof
  source?: string
}

export interface Action {
  id: string
  label: string
  scope: string
  level: "basic" | "sensitive" | "restricted" | "partner"
  review: string
  proof: Proof
  timeToLive: string
}

export interface Step {
  title: string
  detail: string
  owner: Owner
  time: string
  proof: Proof
  link?: string
  slow?: boolean
}

export interface Blocker {
  title: string
  fix: string
  proof: Proof
}

export interface Draft {
  title: string
  body: string
}

// A day-by-day plan: what happens when, and who it waits on.
export interface Phase {
  label: string
  owner: Owner
  when: string // e.g. "Day 1", "Days 2-12"
  duration: string // e.g. "about 2 hours", "3-5 business days"
  wait?: boolean // waiting on the provider or a customer, not your own work
  milestone?: boolean // a point in time, e.g. "Real users can connect"
}

// Typical time for the cross-app chart. waitDays is [0, 0] when there is no review; null when nobody publishes it.
export interface Typical {
  setupHours: [number, number]
  waitDays: [number, number] | null
  toRealUsers: string
}

export interface AppGuide {
  slug: string
  name: string
  category: string
  blurb?: string // what the app lets an agent do, in a few words
  sample: boolean
  difficulty: Difficulty
  headline: string
  firstTest: Claim
  production: Claim
  approvalWait: Claim
  whoCanRegister: Claim
  testMode: Claim
  actions: Action[]
  steps: Step[]
  blockers: Blocker[]
  agentCan: string[]
  youDo: string[]
  drafts: Draft[]
  sources: { title: string; url: string }[]
  unconfirmed: string[]
  screenshots: { src: string; caption: string }[]
  checked: string
  timeline?: Phase[]
  typical?: Typical
}


// One JSON file per app in ./guides (same files the server endpoints read).
const files = import.meta.glob("./guides/*.json", { eager: true, import: "default" }) as Record<string, AppGuide>
const ORDER = ["gmail", "github", "slack", "notion", "linkedin", "twitter"]

export const APPS: AppGuide[] = Object.values(files).sort((a, b) => {
  const ia = ORDER.indexOf(a.slug), ib = ORDER.indexOf(b.slug)
  return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.name.localeCompare(b.name)
})

export const getApp = (slug: string) => APPS.find((a) => a.slug === slug)

// A guide counts as tested once any key claim comes from our own hands-on test.
export const isTested = (g: AppGuide) => [g.firstTest, g.production, g.approvalWait, g.whoCanRegister, g.testMode].some((c) => c.proof === "tested")
