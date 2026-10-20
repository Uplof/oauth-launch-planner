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

export interface AppGuide {
  slug: string
  name: string
  category: string
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
}


// One JSON file per app in ./guides (same files the server endpoints read).
const files = import.meta.glob("./guides/*.json", { eager: true, import: "default" }) as Record<string, AppGuide>
const ORDER = ["gmail", "github", "slack", "notion", "linkedin", "twitter"]

export const APPS: AppGuide[] = Object.values(files).sort((a, b) => {
  const ia = ORDER.indexOf(a.slug), ib = ORDER.indexOf(b.slug)
  return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.name.localeCompare(b.name)
})

export const getApp = (slug: string) => APPS.find((a) => a.slug === slug)
