import { Link, useLocation } from "react-router-dom"
import { ArrowLeft, ArrowRight, PlayCircle, Cog, MousePointerClick } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Stop {
  path: string
  match: (p: string) => boolean
  title: string
  seeing: string
  behind: string
  pieces: string
  tryThis: string
}

// The demo journey: one stop per screen, in the order a developer would meet them.
export const TOUR: Stop[] = [
  {
    path: "/", match: (p) => p === "/", title: "1. A developer describes their agent",
    seeing: "A developer building an AI agent writes one sentence about their product, or looks up a single app.",
    behind: "The planner (an AI model) reads the sentence and works out which apps the agent connects to and what it does in each one.",
    pieces: "S1 → A1 → K1",
    tryThis: "Keep the example sentence and click “Build my launch plan”, or switch to “Look up one app”.",
  },
  {
    path: "/plan/demo", match: (p) => p.startsWith("/plan"), title: "2. The launch plan for the whole product",
    seeing: "One verdict for the product: when they can pilot, when real users can connect, and which app sets the date.",
    behind: "Each app's guide is loaded, the developer's actions are mapped to permissions, and the slowest review becomes the critical path.",
    pieces: "S2 ← A1 + A2 + D1",
    tryThis: "Flip “My agent needs to read the inbox” off and watch launch move from week 10 to week 2.",
  },
  {
    path: "/apps/gmail", match: (p) => p.startsWith("/apps/"), title: "3. One app's guide: verdict first",
    seeing: "Gmail's verdict, then what the agent will do, then the launch plan, blockers, paperwork drafts, a readiness check, a real test sign-in and the evidence.",
    behind: "The guide comes from saved research (Gmail is real, tested on 20 Oct). Every fact carries a proof label: tested, official docs, community or not confirmed.",
    pieces: "S3 ← A2 ← D1 + D3",
    tryThis: "Untick “Read email” in the permissions table, then open the Readiness check tab and click Check.",
  },
  {
    path: "/library", match: (p) => p.startsWith("/library"), title: "4. The library",
    seeing: "Popular apps that use OAuth. Apps with a guide come first; any other app can be researched live.",
    behind: "Researched guides are stored per app; the rest open the live research flow.",
    pieces: "S4 ← D1 + D2",
    tryThis: "Filter “Has a guide”, then try “Research live” on any other app.",
  },
  {
    path: "/generate/zoom", match: (p) => p.startsWith("/generate"), title: "5. Live research for an unknown app",
    seeing: "The agent researching an app the library doesn't have, step by step, ending in a new guide.",
    behind: "App finder → researcher reads the provider's docs → writer fills the guide → checker opens every source and downgrades what it can't confirm → the guide is saved and shareable.",
    pieces: "S5 → A3 → P1 → P2 → P3 → P4 → D4",
    tryThis: "Watch every search and page read appear live (1-3 minutes), then open the guide. Reviewers will try this with an app of their choice.",
  },
  {
    path: "/evidence", match: (p) => p.startsWith("/evidence"), title: "6. How we check",
    seeing: "The four proof labels, every real setup attempt, and the claims whose label changed after testing.",
    behind: "Real test OAuth apps on our own accounts, with screenshots and timings kept as proof.",
    pieces: "S6 ← D3 + K2 + K4",
    tryThis: "Read “What testing changed”: the 7-day refresh token moved from docs to tested.",
  },
  {
    path: "/agents", match: (p) => p.startsWith("/agents"), title: "7. For coding agents",
    seeing: "The same plan as data, so Claude Code or Cursor can read it and do the steps an agent can do.",
    behind: "A JSON endpoint and an MCP server expose the plan, live research and the readiness check as tools.",
    pieces: "S7 ← A5 + A6",
    tryThis: "Compare the JSON with the Gmail guide: same verdict, same proof labels.",
  },
  {
    path: "/architecture", match: (p) => p.startsWith("/architecture"), title: "8. How it's built",
    seeing: "Every part of the system as a numbered piece with its status.",
    behind: "Screens, server endpoints, the agent pipeline, data and outside services. Each piece can be built and tested on its own.",
    pieces: "Each piece with its status",
    tryThis: "Use the work-pieces table to pick what to build next.",
  },
]

export function DemoGuide() {
  const { pathname } = useLocation()
  const i = TOUR.findIndex((s) => s.match(pathname))
  if (i < 0) return null
  const s = TOUR[i]
  const prev = TOUR[i - 1]
  const next = TOUR[i + 1]
  return (
    <section aria-label="Demo guide" className="mb-6 rounded-xl border border-violet-200 bg-violet-50/70 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <PlayCircle className="size-5 text-violet-700" />
        <span className="text-xs font-medium uppercase tracking-wider text-violet-700">Demo · step {i + 1} of {TOUR.length}</span>
        <h2 className="font-semibold text-zinc-900">{s.title.replace(/^\d+\.\s/, "")}</h2>
        <div className="ml-auto flex gap-2">
          {prev && <Button size="sm" variant="outline" asChild><Link to={prev.path}><ArrowLeft className="size-3.5" /> Back</Link></Button>}
          {next ? <Button size="sm" asChild><Link to={next.path}>Next: {next.title.replace(/^\d+\.\s/, "")} <ArrowRight className="size-3.5" /></Link></Button>
            : <Button size="sm" asChild><Link to={TOUR[0].path}>Start over</Link></Button>}
        </div>
      </div>
      <div className="mt-3 grid gap-3 text-sm md:grid-cols-3">
        <div className="grid content-start gap-1">
          <span className="text-xs font-medium text-zinc-500">What you're seeing</span>
          <p className="text-zinc-800">{s.seeing}</p>
        </div>
        <div className="grid content-start gap-1">
          <span className="flex items-center gap-1 text-xs font-medium text-zinc-500"><Cog className="size-3.5" /> What runs behind it</span>
          <p className="text-zinc-800">{s.behind}</p>
          <Link to="/architecture" className="w-fit rounded bg-white px-1.5 py-0.5 font-mono text-[11px] text-violet-700 ring-1 ring-violet-200 hover:bg-violet-100">{s.pieces}</Link>
        </div>
        <div className="grid content-start gap-1">
          <span className="flex items-center gap-1 text-xs font-medium text-zinc-500"><MousePointerClick className="size-3.5" /> Try this</span>
          <p className="text-zinc-800">{s.tryThis}</p>
        </div>
      </div>
    </section>
  )
}
