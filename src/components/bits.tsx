import { Link, NavLink } from "react-router-dom"
import { DemoGuide } from "@/components/DemoGuide"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { type Difficulty, type Owner, type Proof } from "@/data/apps"
import { Bot, CircleDashed, FlaskConical, BookOpen, Users, User, Building2 } from "lucide-react"

const PROOF: Record<Proof, { label: string; tip: string; cls: string; Icon: typeof FlaskConical }> = {
  tested: { label: "Tested", tip: "We did this ourselves and recorded it", cls: "bg-emerald-50 text-emerald-700 border-emerald-200", Icon: FlaskConical },
  docs: { label: "Official docs", tip: "An official provider page says so", cls: "bg-sky-50 text-sky-700 border-sky-200", Icon: BookOpen },
  community: { label: "Community", tip: "Forums, vendors or reports from other developers", cls: "bg-amber-50 text-amber-800 border-amber-200", Icon: Users },
  unconfirmed: { label: "Not confirmed", tip: "Best estimate we could not confirm", cls: "bg-zinc-50 text-zinc-600 border-zinc-200", Icon: CircleDashed },
}

export function ProofBadge({ proof, source }: { proof: Proof; source?: string }) {
  const p = PROOF[proof]
  const badge = (
    <Badge variant="outline" className={cn("gap-1 font-normal", p.cls)}>
      <p.Icon className="size-3" />
      {p.label}
    </Badge>
  )
  return (
    <Tooltip>
      <TooltipTrigger asChild>{source ? <a href={source} target="_blank" rel="noreferrer">{badge}</a> : <span>{badge}</span>}</TooltipTrigger>
      <TooltipContent>{p.tip}{source ? " · opens source" : ""}</TooltipContent>
    </Tooltip>
  )
}

const DIFF: Record<Difficulty, { label: string; cls: string }> = {
  easy: { label: "Easy", cls: "bg-emerald-600 text-white" },
  moderate: { label: "Moderate", cls: "bg-sky-600 text-white" },
  hard: { label: "Hard", cls: "bg-amber-500 text-white" },
  gated: { label: "Partners only", cls: "bg-rose-600 text-white" },
}

export function DifficultyBadge({ d, className }: { d: Difficulty; className?: string }) {
  return <Badge className={cn("border-transparent", DIFF[d].cls, className)}>{DIFF[d].label}</Badge>
}

export function LevelBadge({ level }: { level: string }) {
  const cls: Record<string, string> = {
    basic: "bg-zinc-100 text-zinc-700",
    sensitive: "bg-amber-100 text-amber-800",
    restricted: "bg-rose-100 text-rose-700",
    partner: "bg-violet-100 text-violet-700",
  }
  return <Badge variant="outline" className={cn("border-transparent capitalize", cls[level])}>{level}</Badge>
}

export function OwnerChip({ owner }: { owner: Owner }) {
  const map = {
    agent: { label: "Agent can do", Icon: Bot, cls: "bg-violet-50 text-violet-700 border-violet-200" },
    you: { label: "You do", Icon: User, cls: "bg-zinc-50 text-zinc-700 border-zinc-200" },
    provider: { label: "Provider reviews", Icon: Building2, cls: "bg-orange-50 text-orange-700 border-orange-200" },
  }[owner]
  return (
    <Badge variant="outline" className={cn("gap-1 font-normal", map.cls)}>
      <map.Icon className="size-3" />
      {map.label}
    </Badge>
  )
}

const TINTS = ["bg-rose-100 text-rose-700", "bg-sky-100 text-sky-700", "bg-emerald-100 text-emerald-700", "bg-amber-100 text-amber-800", "bg-violet-100 text-violet-700", "bg-zinc-100 text-zinc-700"]

export function AppLogo({ slug, name, size = 28 }: { slug: string; name: string; size?: number }) {
  const tint = TINTS[[...slug].reduce((n, c) => n + c.charCodeAt(0), 0) % TINTS.length]
  return (
    <span aria-hidden className={cn("inline-flex shrink-0 items-center justify-center rounded-md font-semibold", tint)} style={{ width: size + 8, height: size + 8, fontSize: Math.max(10, size * 0.5) }}>
      {name.replace(/[^A-Za-z0-9]/g, "").slice(0, 1).toUpperCase()}
    </span>
  )
}

export function SampleNote() {
  return (
    <div className="rounded-md border border-dashed border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
      Sample guide. The layout is final; the content is a placeholder until this app is researched and tested.
    </div>
  )
}

export function Shell({ children }: { children: React.ReactNode }) {
  const nav = [
    { to: "/", label: "Plan" },
    { to: "/library", label: "Library" },
    { to: "/evidence", label: "How we check" },
    { to: "/agents", label: "For coding agents" },
    { to: "/architecture", label: "Architecture" },
  ]
  return (
    <div className="min-h-svh bg-zinc-50/60">
      <header className="sticky top-0 z-30 border-b bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <span className="grid size-7 place-items-center rounded-md bg-zinc-900 text-xs text-white">OL</span>
            OAuth Launch Planner
          </Link>
          <nav className="hidden items-center gap-1 text-sm sm:flex">
            {nav.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.to === "/"} className={({ isActive }) => cn("rounded-md px-3 py-1.5 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900", isActive && "bg-zinc-100 text-zinc-900")}>
                {n.label}
              </NavLink>
            ))}
          </nav>
          <Badge variant="outline" className="ml-auto border-dashed font-normal text-zinc-500">Preview · sample data</Badge>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8"><DemoGuide />{children}</main>
      <footer className="mx-auto max-w-6xl px-4 pb-10 text-xs text-zinc-500">
        Every fact carries a proof label. Checked dates shown per guide.
      </footer>
    </div>
  )
}
