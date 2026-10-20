import { ArrowDown, ArrowRight } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"

type Status = "live" | "dummy" | "todo"
interface Piece { id: string; name: string; what: string; status: Status; next: string; depends?: string }

const STATUS: Record<Status, { label: string; cls: string }> = {
  live: { label: "Live", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  dummy: { label: "UI with sample data", cls: "bg-amber-50 text-amber-800 border-amber-200" },
  todo: { label: "To build", cls: "bg-zinc-50 text-zinc-600 border-zinc-200" },
}

const LAYERS: { title: string; note: string; pieces: Piece[] }[] = [
  {
    title: "1 · Screens", note: "React + shadcn/ui on Vercel",
    pieces: [
      { id: "S1", name: "Home", what: "Describe your product, or look up one app", status: "live", next: "Done" },
      { id: "S2", name: "Launch plan", what: "Combined verdict and timeline for all apps in a product", status: "live", next: "Example plan plus live plans from A1", depends: "A1" },
      { id: "S3", name: "App guide", what: "Verdict, permissions, plan, blockers, drafts, readiness, test, evidence", status: "live", next: "Add screenshots for GitHub, Slack, Notion", depends: "D1" },
      { id: "S4", name: "Library", what: "120 OAuth apps, pain first", status: "live", next: "Link the remaining apps to live research" },
      { id: "S5", name: "Live research", what: "Watch the agent build a guide", status: "live", next: "Done; needs K1 to run", depends: "A3" },
      { id: "S6", name: "How we check", what: "Proof labels, setup attempts, corrections", status: "live", next: "Add GitHub, Slack, Notion attempts", depends: "D3" },
      { id: "S7", name: "For coding agents", what: "API and MCP docs", status: "live", next: "Done", depends: "A5, A6" },
    ],
  },
  {
    title: "2 · Server endpoints", note: "Vercel functions",
    pieces: [
      { id: "A1", name: "/api/plan-from-description", what: "Product description → apps, actions, permissions", status: "live", next: "Runs once K1 is set", depends: "K1" },
      { id: "A2", name: "/api/guide/:app", what: "Returns a saved guide", status: "live", next: "Done", depends: "D1" },
      { id: "A3", name: "/api/research", what: "Streams the research agent's progress and final guide", status: "live", next: "Runs once K1 is set", depends: "P1-P4" },
      { id: "A4", name: "/api/readiness", what: "Checks a developer's site like a reviewer", status: "live", next: "Done", depends: "K1" },
      { id: "A5", name: "/api/plan", what: "JSON plan for coding agents", status: "live", next: "Done", depends: "A2" },
      { id: "A6", name: "/api/mcp", what: "MCP server: get_oauth_plan, research_app, check_readiness", status: "live", next: "Done", depends: "A2-A4" },
      { id: "A7", name: "/oauth/start + /oauth/callback", what: "Real Google sign-in test with our own app", status: "live", next: "Add GitHub, Slack, Notion test apps" },
    ],
  },
  {
    title: "3 · Agent pipeline", note: "Groq gpt-oss-120b with built-in web search (free); Claude as a drop-in",
    pieces: [
      { id: "P1", name: "App finder", what: "Matches a name or website to the provider and its developer portal", status: "live", next: "Claude finds the portal during research", depends: "K1" },
      { id: "P2", name: "Researcher", what: "Searches and reads the provider’s docs, notes each fact with its source", status: "live", next: "Runs once K1 is set", depends: "K1" },
      { id: "P3", name: "Writer", what: "Fills the guide format, one source per claim", status: "live", next: "Runs once K1 is set", depends: "P2" },
      { id: "P4", name: "Checker", what: "Opens every source, downgrades what it can't confirm", status: "live", next: "Runs once K1 is set", depends: "P3" },
    ],
  },
  {
    title: "4 · Data", note: "In the repo first, a store for generated guides",
    pieces: [
      { id: "D1", name: "Guides", what: "One JSON per app in the guide format", status: "live", next: "Gmail tested; 5 researched from docs" },
      { id: "D2", name: "App list", what: "Popular OAuth apps shown in the library", status: "live", next: "Grow to 100 with guides" },
      { id: "D3", name: "Evidence", what: "Screenshots, timings, corrections from real setup attempts", status: "live", next: "Add GitHub, Slack, Notion attempts" },
      { id: "D4", name: "Generated guide store", what: "Cache for live research results and shareable links", status: "todo", next: "Generated guides are kept in the browser session for now; add Vercel Blob for shareable links" },
    ],
  },
  {
    title: "5 · Outside services", note: "Keys live in Vercel settings, never in the code",
    pieces: [
      { id: "K1", name: "AI model (Groq)", what: "Free gpt-oss-120b with web search for planner, researcher, writer, checker", status: "todo", next: "Abhishek adds GROQ_API_KEY in Vercel" },
      { id: "K2", name: "Google OAuth test app", what: "OAuth Planner Test, testing mode", status: "live", next: "Keep as proof" },
      { id: "K4", name: "GitHub / Slack / Notion test apps", what: "Real setup attempts for evidence", status: "todo", next: "Abhishek signs in, we create and screenshot" },
    ],
  },
]

const ALL = LAYERS.flatMap((l) => l.pieces)

function Node({ p }: { p: Piece }) {
  return (
    <div className="grid content-start gap-1.5 rounded-lg border bg-white p-3">
      <div className="flex items-center gap-2">
        <span className="rounded bg-zinc-900 px-1.5 py-0.5 font-mono text-[10px] text-white">{p.id}</span>
        <span className="truncate text-sm font-medium">{p.name}</span>
      </div>
      <p className="text-xs text-zinc-600">{p.what}</p>
      <Badge variant="outline" className={cn("w-fit font-normal", STATUS[p.status].cls)}>{STATUS[p.status].label}</Badge>
    </div>
  )
}

export default function Architecture() {
  const counts = (s: Status) => ALL.filter((p) => p.status === s).length
  return (
    <div className="grid gap-6">
      <div className="grid max-w-3xl gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Architecture</h1>
        <p className="text-zinc-600">Every part of the system as a numbered piece. Each one can be built and tested on its own.</p>
        <div className="flex flex-wrap gap-2 pt-1">
          {(["live", "dummy", "todo"] as Status[]).map((s) => <Badge key={s} variant="outline" className={cn("font-normal", STATUS[s].cls)}>{STATUS[s].label}: {counts(s)}</Badge>)}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Live research, end to end</CardTitle>
          <CardDescription>What happens when a developer types an app the library doesn't have.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2 text-sm">
          {["S5 Live research", "A3 /api/research", "P1 App finder", "P2 Researcher", "P3 Writer", "P4 Checker", "D4 Saved guide", "S3 App guide"].map((t, i, a) => (
            <span key={t} className="flex items-center gap-2">
              <span className="rounded-md border bg-zinc-50 px-2 py-1">{t}</span>
              {i < a.length - 1 && <ArrowRight className="size-4 text-zinc-400" />}
            </span>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-3">
        {LAYERS.map((l, i) => (
          <div key={l.title} className="grid gap-3">
            <div className="flex items-baseline gap-3"><h2 className="font-semibold">{l.title}</h2><span className="text-sm text-zinc-500">{l.note}</span></div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{l.pieces.map((p) => <Node key={p.id} p={p} />)}</div>
            {i < LAYERS.length - 1 && <ArrowDown className="mx-auto size-5 text-zinc-300" />}
          </div>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>Work pieces</CardTitle><CardDescription>Pick one, build it, mark it live.</CardDescription></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Piece</TableHead><TableHead>Status</TableHead><TableHead>Needs</TableHead><TableHead>Next action</TableHead></TableRow></TableHeader>
            <TableBody>
              {ALL.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs">{p.id}</TableCell>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell><Badge variant="outline" className={cn("font-normal", STATUS[p.status].cls)}>{STATUS[p.status].label}</Badge></TableCell>
                  <TableCell className="font-mono text-xs text-zinc-500">{p.depends ?? "—"}</TableCell>
                  <TableCell className="text-sm text-zinc-600">{p.next}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
