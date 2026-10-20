import { useMemo, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { ArrowRight, CalendarClock, Flag, Pencil, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { AppLogo, DifficultyBadge, LevelBadge, ProofBadge } from "@/components/bits"
import { getApp, type Difficulty, type Proof } from "@/data/apps"
import { loadPlan, WEEKS } from "@/lib/api"

interface Row {
  slug: string
  name: string
  known: boolean
  difficulty?: Difficulty
  actions: { label: string; level?: string }[]
  weeks: number | null
  summary: string
  proof?: Proof
  agentSteps: number
  totalSteps: number
}

const DEMO_TEXT = "An AI assistant that reads support emails in Gmail, drafts replies and logs tickets in Notion"

function demoRows(readEmail: boolean): Row[] {
  const gmail = getApp("gmail")!
  const notion = getApp("notion")!
  const count = (slug: string) => {
    const s = getApp(slug)!.steps
    return { agentSteps: s.filter((x) => x.owner === "agent").length, totalSteps: s.length }
  }
  return [
    {
      slug: "gmail", name: "Gmail", known: true, difficulty: readEmail ? "hard" : "moderate",
      actions: readEmail ? [{ label: "Read support emails", level: "restricted" }, { label: "Send approved replies", level: "sensitive" }] : [{ label: "Send approved replies", level: "sensitive" }],
      weeks: readEmail ? WEEKS.restricted : WEEKS.sensitive,
      summary: readEmail ? "Restricted review + yearly security assessment. The long pole of your launch." : "Sensitive review + demo video. About 1-2 weeks.",
      proof: gmail.production.proof, ...count("gmail"),
    },
    { slug: "notion", name: "Notion", known: true, difficulty: notion.difficulty, actions: [{ label: "Create ticket pages", level: "basic" }], weeks: WEEKS.basic, summary: notion.headline, proof: notion.production.proof, ...count("notion") },
  ]
}

export default function Plan() {
  const { id = "demo" } = useParams()
  const [readEmail, setReadEmail] = useState(true)
  const live = id === "live" ? loadPlan() : null

  const rows: Row[] = useMemo(() => {
    if (!live) return demoRows(readEmail)
    return live.apps.map((a): Row => {
      if (!a.plan) return { slug: a.slug, name: a.name, known: false, actions: a.actions.map((x) => ({ label: x.label })), weeks: null, summary: "No guide yet. Research it live to get its review path.", agentSteps: 0, totalSteps: 0 }
      return {
        slug: a.slug, name: a.name, known: true, difficulty: a.plan.verdict.difficulty,
        actions: a.plan.actions.map((x) => ({ label: x.label, level: x.level })),
        weeks: WEEKS[a.plan.verdict.path] ?? 2, summary: `${a.plan.verdict.review}. ${a.plan.verdict.to_live} to go live.`,
        proof: getApp(a.slug)?.production.proof, agentSteps: a.plan.steps.filter((s) => s.owner === "agent").length, totalSteps: a.plan.steps.length,
      }
    })
  }, [live, readEmail])

  if (id === "live" && !live) {
    return (
      <div className="grid gap-3">
        <h1 className="text-2xl font-semibold">No plan yet</h1>
        <p className="text-zinc-600">Describe your product on the home page to build one.</p>
        <Button asChild className="w-fit"><Link to="/">Describe your product</Link></Button>
      </div>
    )
  }

  const known = rows.filter((r) => r.weeks !== null)
  const total = known.length ? Math.max(...known.map((r) => r.weeks!)) : 0
  const scale = Math.max(total, 4)
  const critical = known.find((r) => r.weeks === total)
  const agentSteps = rows.reduce((n, r) => n + r.agentSteps, 0)
  const totalSteps = rows.reduce((n, r) => n + r.totalSteps, 0)
  const unknown = rows.filter((r) => !r.known)
  const headline = total <= 1
    ? "You can pilot this week, and real users can connect within about a week."
    : `You can pilot this week. Real users in about ${total <= 2 ? "2" : `${Math.max(2, total - 4)}-${total}`} weeks, set by ${critical?.name}'s review.`

  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">Your launch plan{live ? "" : " · example"}</span>
        <div className="flex flex-wrap items-start gap-3">
          <p className="max-w-3xl flex-1 text-lg">“{live?.description ?? DEMO_TEXT}”</p>
          <Button variant="outline" size="sm" asChild><Link to="/"><Pencil className="size-3.5" /> Edit</Link></Button>
        </div>
        {live?.summary && <p className="text-sm text-zinc-600">{live.summary}</p>}
      </div>

      <Card className="border-zinc-900/10 shadow-sm" data-tour="plan-verdict">
        <CardHeader>
          <CardDescription className="text-xs font-medium uppercase tracking-wider">Verdict</CardDescription>
          <CardTitle className="text-balance text-2xl leading-snug">{headline}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          {!live && (
            <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-zinc-50 p-3">
              <Switch id="read" checked={readEmail} onCheckedChange={setReadEmail} />
              <Label htmlFor="read" className="text-sm">My agent needs to read the inbox</Label>
              <span className="text-xs text-zinc-500">Turn off to see the send-only path</span>
            </div>
          )}
          {unknown.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              No guide yet for {unknown.map((u) => u.name).join(", ")}, so the dates leave {unknown.length === 1 ? "it" : "them"} out. Research {unknown.length === 1 ? "it" : "them"} live below.
            </div>
          )}
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="rounded-lg border bg-white p-3"><div className="text-xs text-zinc-500">Apps</div><div className="text-xl font-semibold">{rows.length}</div></div>
            <div className="rounded-lg border bg-white p-3"><div className="text-xs text-zinc-500">Slowest review</div><div className="text-xl font-semibold">{critical ? `${critical.name} · ${total} wk` : "—"}</div></div>
            <div className="rounded-lg border bg-white p-3"><div className="text-xs text-zinc-500">Steps an agent can do</div><div className="text-xl font-semibold">{agentSteps} of {totalSteps}</div></div>
          </div>
        </CardContent>
      </Card>

      <Card data-tour="plan-timeline">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><CalendarClock className="size-5" /> Timeline</CardTitle>
          <CardDescription>Bars show the wait for each provider's review, starting today. Build and pilot in parallel.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 overflow-x-auto">
          <div className="grid min-w-[520px] grid-cols-[140px_1fr] items-center gap-3 text-xs text-zinc-500">
            <span />
            <div className="flex justify-between">{Array.from({ length: scale + 1 }, (_, w) => <span key={w}>{w === 0 ? "Today" : `W${w}`}</span>)}</div>
          </div>
          <div className="grid min-w-[520px] grid-cols-[140px_1fr] items-center gap-3">
            <span className="text-sm font-medium">Pilot (test users)</span>
            <div className="relative h-7 rounded bg-zinc-100"><div className="absolute inset-y-0 left-0 rounded bg-emerald-200" style={{ width: `${(1 / scale) * 100}%` }} /><span className="absolute inset-y-0 left-2 flex items-center text-xs">this week</span></div>
          </div>
          {rows.map((r) => (
            <div key={r.slug} className="grid min-w-[520px] grid-cols-[140px_1fr] items-center gap-3">
              <span className="flex items-center gap-2 text-sm font-medium"><AppLogo slug={r.slug} name={r.name} size={14} />{r.name}</span>
              <div className="relative h-7 rounded bg-zinc-100">
                {r.weeks !== null ? (
                  <>
                    <div className={`absolute inset-y-0 left-0 rounded ${r.weeks === total && total > 1 ? "bg-rose-300" : "bg-sky-200"}`} style={{ width: `${(r.weeks / scale) * 100}%` }} />
                    <span className="absolute inset-y-0 left-2 flex items-center text-xs">{r.weeks === total && total > 1 ? "Critical path · start today" : "Review"}</span>
                  </>
                ) : <span className="absolute inset-y-0 left-2 flex items-center text-xs text-zinc-500">unknown until researched</span>}
              </div>
            </div>
          ))}
          <div className="grid min-w-[520px] grid-cols-[140px_1fr] items-center gap-3">
            <span className="flex items-center gap-1.5 text-sm font-medium"><Flag className="size-3.5" /> Launch</span>
            <div className="relative h-7"><div className="absolute inset-y-0 w-0.5 bg-zinc-900" style={{ left: `${(total / scale) * 100}%` }} /><span className="absolute inset-y-0 flex items-center pl-2 text-xs" style={{ left: `${(total / scale) * 100}%` }}>week {total}</span></div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        <h2 className="text-xl font-semibold" data-tour="plan-apps">Per app</h2>
        {rows.map((r) => (
          <Card key={r.slug}>
            <CardHeader className="flex flex-row flex-wrap items-center gap-3">
              <AppLogo slug={r.slug} name={r.name} />
              <div className="grid gap-1">
                <div className="flex items-center gap-2"><CardTitle>{r.name}</CardTitle>{r.difficulty ? <DifficultyBadge d={r.difficulty} /> : <Badge variant="outline" className="border-dashed font-normal">no guide yet</Badge>}</div>
                <CardDescription>{r.summary}</CardDescription>
              </div>
              {r.proof && <div className="ml-auto"><ProofBadge proof={r.proof} /></div>}
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-2">
              {r.actions.map((a) => <span key={a.label} className="flex items-center gap-1.5 rounded-md border bg-white px-2 py-1 text-sm">{a.label} {a.level && <LevelBadge level={a.level} />}</span>)}
              {r.known
                ? <Button variant="ghost" className="ml-auto" asChild><Link to={`/apps/${r.slug}`}>Open guide <ArrowRight className="size-4" /></Link></Button>
                : <Button variant="outline" className="ml-auto" asChild><Link to={`/generate/${encodeURIComponent(r.slug)}`}><Sparkles className="size-4" /> Research live</Link></Button>}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
