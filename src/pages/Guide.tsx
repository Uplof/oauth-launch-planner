import { useEffect, useMemo, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { toast } from "sonner"
import { Copy, ExternalLink, Share2, Terminal, Hourglass, Rocket, TestTube2, KeyRound, ShieldAlert, Check, Globe, PlugZap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { getApp, type Action, type Claim } from "@/data/apps"
import { AppLogo, DifficultyBadge, LevelBadge, OwnerChip, ProofBadge, SampleNote } from "@/components/bits"
import { checkReadiness, loadGuide, type ReadinessResult } from "@/lib/api"
import { Loader2, Sparkles } from "lucide-react"

const RANK = { basic: 0, sensitive: 1, restricted: 2, partner: 3 } as const

function copy(text: string) {
  navigator.clipboard.writeText(text).then(() => toast.success("Copied"), () => toast.error("Could not copy. Select the text instead."))
}

function Tile({ icon: Icon, label, claim }: { icon: typeof Rocket; label: string; claim: Claim }) {
  return (
    <div className="grid content-start gap-2 rounded-lg border bg-white p-4">
      <div className="flex items-center gap-2 text-sm text-zinc-500"><Icon className="size-4" />{label}</div>
      <p className="text-sm font-medium leading-snug">{claim.text}</p>
      <div><ProofBadge proof={claim.proof} source={claim.source} /></div>
    </div>
  )
}

// Real test apps we registered and kept as proof; each start link runs a live OAuth sign-in.
const SIGN_IN_TESTS: Record<string, { start: string; note: string; result?: string }> = {
  gmail: { start: "/oauth/start", result: "/evidence/gmail-granted.webp", note: "Runs against our test app “OAuth Planner Test” (testing mode). Only listed test users get through; everyone else sees Google's Error 403." },
  github: { start: "/oauth/github/start", result: "/evidence/github-granted.webp", note: "Runs against our OAuth app “OAuth Planner Test”. Any GitHub account can sign in; nothing is stored." },
  slack: { start: "/oauth/slack/start", note: "Runs against our Slack app “OAuth Planner Test”, publicly distributed, so any workspace can install it. You need to be allowed to install apps in your workspace." },
  notion: { start: "/oauth/notion/start", result: "/evidence/notion-granted.webp", note: "Runs against our public Notion connection “OAuth Planner Test”. You pick which pages it may see; nothing is stored." },
}

export default function Guide() {
  const { slug = "" } = useParams()
  const [remote, setRemote] = useState<ReturnType<typeof loadGuide>>(null)
  const [lookedUp, setLookedUp] = useState(false)
  const local = getApp(slug) ?? loadGuide(slug)
  // Guides made by live research are saved on the server; fetch them for shared links.
  useEffect(() => {
    if (local) return
    let alive = true
    fetch(`/api/guide?app=${encodeURIComponent(slug)}`).then((r) => (r.ok ? r.json() : null)).then((g) => { if (alive) { setRemote(g); setLookedUp(true) } }).catch(() => alive && setLookedUp(true))
    return () => { alive = false }
  }, [slug, local])
  const app = local ?? remote
  const generated = app && "generated" in app ? (app as ReturnType<typeof loadGuide>) : null
  const [picked, setPicked] = useState<string[]>(() => (app ? app.actions.filter((a) => a.id !== "modify").map((a) => a.id) : []))
  useEffect(() => { if (remote) setPicked(remote.actions.map((a) => a.id)) }, [remote])
  const [site, setSite] = useState("")
  const [ready, setReady] = useState<ReadinessResult | null>(null)
  const [checking, setChecking] = useState(false)
  const [readyError, setReadyError] = useState<string | null>(null)

  async function runCheck() {
    if (!site.trim() || !app) return
    setChecking(true); setReadyError(null); setReady(null)
    try { setReady(await checkReadiness(site.trim(), app.slug)) } catch (e) { setReadyError(e instanceof Error ? e.message : "The check failed.") }
    setChecking(false)
  }

  const worst = useMemo<Action | undefined>(() => {
    if (!app) return undefined
    return app.actions.filter((a) => picked.includes(a.id)).sort((a, b) => RANK[b.level] - RANK[a.level])[0]
  }, [app, picked])

  if (!app && !lookedUp) return <p className="text-sm text-zinc-500">Loading the guide…</p>
  if (!app) {
    return (
      <div className="grid gap-3">
        <h1 className="text-2xl font-semibold">No guide for “{slug}” yet</h1>
        <Button asChild className="w-fit"><Link to={`/generate/${slug}`}>Research it live</Link></Button>
      </div>
    )
  }

  const steps = [...app.steps].sort((a, b) => Number(!!b.slow) - Number(!!a.slow))
  const agentSteps = app.steps.filter((s) => s.owner === "agent").length

  return (
    <div className="grid gap-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem><BreadcrumbLink asChild><Link to="/library">Library</Link></BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbPage>{app.name}</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <header className="flex flex-wrap items-center gap-4">
        <AppLogo slug={app.slug} name={app.name} size={40} />
        <div className="grid gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-semibold tracking-tight">{app.name}</h1>
            <DifficultyBadge d={app.difficulty} />
          </div>
          <p className="text-sm text-zinc-500">OAuth app setup and approval · checked {app.checked}</p>
        </div>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" onClick={() => copy(window.location.href)}><Share2 className="size-4" /> Share</Button>
          <Dialog>
            <DialogTrigger asChild><Button variant="outline"><Terminal className="size-4" /> Send to coding agent</Button></DialogTrigger>
            <DialogContent className="sm:max-w-xl">
              <DialogHeader>
                <DialogTitle>Hand this plan to your coding agent</DialogTitle>
                <DialogDescription>Claude Code, Cursor or any MCP client can fetch the same plan as data.</DialogDescription>
              </DialogHeader>
              <pre className="overflow-x-auto rounded-md bg-zinc-950 p-3 text-xs text-zinc-100">{`GET https://oauth-launch-planner.vercel.app/api/plan?app=${app.slug}&needs=${picked.join(",")}

# or as an MCP tool
get_oauth_plan({ app: "${app.slug}", needs: [${picked.map((p) => `"${p}"`).join(", ")}] })`}</pre>
              <Button variant="outline" onClick={() => copy(`get_oauth_plan({ app: "${app.slug}", needs: [${picked.map((p) => `"${p}"`).join(", ")}] })`)}><Copy className="size-4" /> Copy</Button>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {app.sample && <SampleNote />}
      {generated && (
        <div className="flex items-start gap-2 rounded-md border border-violet-200 bg-violet-50 px-3 py-2 text-sm text-violet-900">
          <Sparkles className="mt-0.5 size-4" />
          Generated live by the research agent on {app.checked}.{" "}
          {generated.factCheck === "skipped" ? "The fact check did not run (the free AI allowance ran out), so the key claims are unchecked. Research again later to check them."
            : generated.factCheck === "none" ? "No key claim had a source page, so there was nothing to check."
            : generated.corrections?.length ? `The checker downgraded ${generated.corrections.length} claim(s) to “not confirmed”.`
            : "The checker confirmed the key claims against their source pages."}
        </div>
      )}

      <Card className="border-zinc-900/10 shadow-sm">
        <CardHeader>
          <CardDescription className="text-xs font-medium uppercase tracking-wider">Verdict</CardDescription>
          <CardTitle className="text-balance text-2xl leading-snug">{app.headline}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Tile icon={TestTube2} label="First test" claim={app.firstTest} />
          <Tile icon={Rocket} label="Real users can connect" claim={app.production} />
          <Tile icon={Hourglass} label="Approval wait" claim={app.approvalWait} />
          <Tile icon={KeyRound} label="Who can register" claim={app.whoCanRegister} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>What will your agent do in {app.name}?</CardTitle>
          <CardDescription>The permissions you ask for decide how hard approval is. Tick what you need.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10" />
                <TableHead>Action</TableHead>
                <TableHead>Permission</TableHead>
                <TableHead>Review level</TableHead>
                <TableHead>To go live</TableHead>
                <TableHead>Proof</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {app.actions.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>
                    <Checkbox id={`act-${a.id}`} checked={picked.includes(a.id)} onCheckedChange={(v) => setPicked((p) => (v ? [...p, a.id] : p.filter((x) => x !== a.id)))} />
                  </TableCell>
                  <TableCell><label htmlFor={`act-${a.id}`} className="font-medium">{a.label}</label></TableCell>
                  <TableCell><code className="text-xs">{a.scope}</code></TableCell>
                  <TableCell><LevelBadge level={a.level} /></TableCell>
                  <TableCell className="text-sm text-zinc-600">{a.review}</TableCell>
                  <TableCell><ProofBadge proof={a.proof} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Alert className={worst?.level === "restricted" ? "border-rose-200 bg-rose-50" : "border-emerald-200 bg-emerald-50"}>
            <ShieldAlert className="size-4" />
            <AlertTitle>{worst ? `Your path: ${worst.level} · about ${worst.timeToLive} to go live` : "Pick at least one action"}</AlertTitle>
            <AlertDescription>
              {worst?.level === "restricted"
                ? "Reading email puts you in Google's strictest review, with a yearly paid security assessment. If you can do without it, untick Read email: send-only takes about 1-2 weeks."
                : worst ? `${worst.review}. No security assessment needed.` : "Your verdict updates as you tick."}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Tabs defaultValue="plan">
        <TabsList className="flex-wrap">
          <TabsTrigger value="plan">Launch plan</TabsTrigger>
          <TabsTrigger value="blockers">Blockers</TabsTrigger>
          <TabsTrigger value="paperwork">Paperwork drafts</TabsTrigger>
          <TabsTrigger value="readiness">Readiness check</TabsTrigger>
          <TabsTrigger value="test">Test sign-in</TabsTrigger>
          <TabsTrigger value="evidence">Evidence</TabsTrigger>
        </TabsList>

        <TabsContent value="plan" className="grid gap-4 pt-2 lg:grid-cols-[1fr_320px]">
          <Card>
            <CardHeader>
              <CardTitle>Launch plan</CardTitle>
              <CardDescription>Slowest step first. {agentSteps} of {app.steps.length} steps an agent can do for you.</CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="relative grid gap-5 border-l pl-6">
                {steps.map((s, i) => (
                  <li key={s.title} className="relative grid gap-1.5">
                    <span className={`absolute -left-[33px] grid size-5 place-items-center rounded-full border bg-white text-[10px] font-medium ${s.slow ? "border-rose-300 text-rose-600" : "text-zinc-500"}`}>{i + 1}</span>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{s.title}</span>
                      {s.slow && <span className="rounded bg-rose-50 px-1.5 py-0.5 text-[11px] font-medium text-rose-700">Start today</span>}
                    </div>
                    <p className="text-sm text-zinc-600">{s.detail}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <OwnerChip owner={s.owner} />
                      <span className="text-xs text-zinc-500">{s.time}</span>
                      <ProofBadge proof={s.proof} />
                      {s.link && <a className="inline-flex items-center gap-1 text-xs text-sky-700 hover:underline" href={s.link} target="_blank" rel="noreferrer">Open <ExternalLink className="size-3" /></a>}
                    </div>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
          <div className="grid content-start gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">An agent can</CardTitle></CardHeader>
              <CardContent><ul className="grid gap-2 text-sm">{app.agentCan.map((t) => <li key={t} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-violet-600" />{t}</li>)}</ul></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">You take over</CardTitle></CardHeader>
              <CardContent><ul className="grid gap-2 text-sm">{app.youDo.map((t) => <li key={t} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-zinc-500" />{t}</li>)}</ul></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Testing mode</CardTitle></CardHeader>
              <CardContent className="grid gap-2 text-sm"><p>{app.testMode.text}</p><div><ProofBadge proof={app.testMode.proof} /></div></CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="blockers" className="grid gap-3 pt-2">
          {app.blockers.map((b) => (
            <Card key={b.title}>
              <CardHeader className="flex flex-row items-start gap-3">
                <div className="grid flex-1 gap-1">
                  <CardTitle className="text-base">{b.title}</CardTitle>
                  <CardDescription className="text-zinc-700">{b.fix}</CardDescription>
                </div>
                <ProofBadge proof={b.proof} />
              </CardHeader>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="paperwork" className="grid gap-3 pt-2">
          <p className="text-sm text-zinc-600">Drafts an agent writes from your product description. Edit before you submit.</p>
          {app.drafts.map((d) => (
            <Card key={d.title}>
              <CardHeader className="flex flex-row items-center gap-2">
                <CardTitle className="flex-1 text-base">{d.title}</CardTitle>
                <Button size="sm" variant="outline" onClick={() => copy(d.body)}><Copy className="size-3.5" /> Copy</Button>
              </CardHeader>
              <CardContent><p className="whitespace-pre-line rounded-md bg-zinc-50 p-3 text-sm">{d.body}</p></CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="readiness" className="pt-2">
          <Card>
            <CardHeader>
              <CardTitle>Would a reviewer approve your site today?</CardTitle>
              <CardDescription>The agent checks your site the way {app.name}'s reviewers do.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); runCheck() }}>
                <div className="relative flex-1">
                  <Globe className="absolute left-2.5 top-2.5 size-4 text-zinc-400" />
                  <Input id="site" className="pl-8" placeholder="yourproduct.com" value={site} onChange={(e) => setSite(e.target.value)} />
                </div>
                <Button type="submit" disabled={checking}>{checking ? <><Loader2 className="size-4 animate-spin" /> Checking</> : "Check"}</Button>
              </form>
              {readyError && <p className="text-sm text-rose-700">{readyError}</p>}
              {ready && (
                <div className="grid gap-3">
                  <div className="flex items-center gap-3"><span className="text-3xl font-semibold tabular-nums">{ready.score}/{ready.total}</span><Progress value={(ready.score / ready.total) * 100} className="flex-1" /><span className="text-xs text-zinc-500">{new URL(ready.url).hostname}</span></div>
                  {ready.checks.map((c) => (
                    <div key={c.id} className="grid gap-1 rounded-md border bg-white px-3 py-2 text-sm">
                      <div className="flex items-center justify-between gap-3"><span className="font-medium">{c.label}</span><span className={c.ok ? "text-emerald-700" : "text-rose-700"}>{c.ok ? "Ready" : "Fix before you submit"}</span></div>
                      <span className="break-all text-xs text-zinc-500">{c.detail}</span>
                      {c.fix && <span className="text-xs text-zinc-700">{c.fix}</span>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="test" className="pt-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><PlugZap className="size-5" /> Test the sign-in with a real OAuth app</CardTitle>
              <CardDescription>See exactly what your users see and what {app.name} gives back: permissions granted, token lifetime, refresh token expiry.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {SIGN_IN_TESTS[app.slug] ? (
                <>
                  <p className="text-sm text-zinc-600">{SIGN_IN_TESTS[app.slug].note}</p>
                  <Button asChild className="w-fit"><a href={SIGN_IN_TESTS[app.slug].start}>Start test sign-in <ExternalLink className="size-4" /></a></Button>
                  {SIGN_IN_TESTS[app.slug].result && <img src={SIGN_IN_TESTS[app.slug].result} alt={`Result of our ${app.name} test sign-in`} className="max-w-xl rounded-md border" />}
                </>
              ) : (
                <p className="text-sm text-zinc-600">No test app for {app.name}. This guide is from research only, so its claims carry docs, community or not-confirmed labels.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="evidence" className="grid gap-4 pt-2">
          {app.screenshots.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {app.screenshots.map((s) => (
                <figure key={s.src} className="overflow-hidden rounded-lg border bg-white">
                  <a href={s.src} target="_blank" rel="noreferrer"><img src={s.src} alt={s.caption} className="aspect-[16/10] w-full object-cover object-top" /></a>
                  <figcaption className="flex items-start gap-2 p-3 text-sm"><ProofBadge proof="tested" /><span>{s.caption}</span></figcaption>
                </figure>
              ))}
            </div>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-base">Sources</CardTitle></CardHeader>
              <CardContent className="grid gap-2 text-sm">
                {app.sources.length === 0 && <p className="text-zinc-500">None yet.</p>}
                {app.sources.map((s) => <a key={s.url} href={s.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sky-700 hover:underline">{s.title} <ExternalLink className="size-3" /></a>)}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Not confirmed</CardTitle></CardHeader>
              <CardContent><ul className="grid gap-2 text-sm text-zinc-700">{app.unconfirmed.map((u) => <li key={u}>· {u}</li>)}</ul></CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
