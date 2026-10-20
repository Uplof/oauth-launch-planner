import { useEffect, useMemo, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { toast } from "sonner"
import { Copy, ExternalLink, Share2, Terminal, Hourglass, Rocket, TestTube2, ShieldAlert, Check, Globe, PlugZap, Clock, TriangleAlert, BadgeCheck, BookOpen, Bot, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { getApp, isTested, type Action, type Claim } from "@/data/apps"
import { AppLogo, DifficultyBadge, LevelBadge, OwnerChip, ProofBadge, SampleNote } from "@/components/bits"
import { checkReadiness, loadGuide, type ReadinessResult } from "@/lib/api"
import { GuideTimeline } from "@/components/Timeline"
import { setupText, totalText, waitText } from "@/lib/time"
import { Loader2, Sparkles } from "lucide-react"

const RANK = { basic: 0, sensitive: 1, restricted: 2, partner: 3 } as const

function copy(text: string) {
  navigator.clipboard.writeText(text).then(() => toast.success("Copied"), () => toast.error("Could not copy. Select the text instead."))
}

function Fact({ icon: Icon, label, claim }: { icon: typeof Rocket; label: string; claim: Claim }) {
  return (
    <div className="grid content-start gap-1.5 rounded-lg bg-zinc-50 p-3">
      <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-500"><Icon className="size-3.5" />{label}</div>
      <p className="text-sm leading-snug text-zinc-800">{claim.text}</p>
      <ProofDot proof={claim.proof} source={claim.source} />
    </div>
  )
}

// Small proof label for dense lists; the full badge with tooltip.
function ProofDot({ proof, source }: { proof: Claim["proof"]; source?: string }) {
  return <span className="w-fit scale-90 origin-left"><ProofBadge proof={proof} source={source} /></span>
}

// Real test apps I registered and kept as proof; each start link runs a live OAuth sign-in.
const SIGN_IN_TESTS: Record<string, { start: string; note: string; result?: string }> = {
  gmail: { start: "/oauth/start", result: "/evidence/gmail-granted.webp", note: "Runs against my test app “OAuth Planner Test” (testing mode). Only listed test users get through; everyone else sees Google's Error 403." },
  github: { start: "/oauth/github/start", result: "/evidence/github-granted.webp", note: "Runs against my OAuth app “OAuth Planner Test”. Any GitHub account can sign in; nothing is stored." },
  slack: { start: "/oauth/slack/start", note: "Runs against my Slack app “OAuth Planner Test”, publicly distributed, so any workspace can install it. You need to be allowed to install apps in your workspace." },
  notion: { start: "/oauth/notion/start", result: "/evidence/notion-granted.webp", note: "Runs against my public Notion connection “OAuth Planner Test”. You pick which pages it may see; nothing is stored." },
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
  const [tab, setTab] = useState("proof")
  const [showReady, setShowReady] = useState(false)

  async function runCheck() {
    if (!site.trim() || !app) return
    setChecking(true); setReadyError(null); setReady(null)
    try { setReady(await checkReadiness(site.trim(), app.slug)); setShowReady(true) } catch (e) { setReadyError(e instanceof Error ? e.message : "The check failed.") }
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

  const agentSteps = app.steps.filter((s) => s.owner === "agent").length
  const tested = isTested(app)
  const showProof = () => { setTab("proof"); document.getElementById("more")?.scrollIntoView({ behavior: "smooth" }) }

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
          <p className="text-sm text-zinc-500">{tested ? "Tested by me" : "Researched"} · checked {app.checked}</p>
        </div>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={() => copy(window.location.href)}><Share2 className="size-4" /> Share</Button>
          <Dialog>
            <DialogTrigger asChild><Button variant="outline" size="sm"><Terminal className="size-4" /> Send to coding agent</Button></DialogTrigger>
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
          Written live by the research agent on {app.checked}.{" "}
          {generated.factCheck === "skipped" ? "The fact check didn't run (the free AI allowance ran out), so the key claims are unchecked."
            : generated.factCheck === "none" ? "No key claim had a source page, so there was nothing to check."
            : generated.corrections?.length ? `The checker marked ${generated.corrections.length} claim(s) as not confirmed.`
            : "The checker confirmed the key claims against their sources."}
        </div>
      )}

      <section className="grid gap-5 rounded-xl border bg-white p-5 shadow-sm" data-tour="total">
        <div className="grid gap-1">
          <span className="text-sm text-zinc-500">Total time, from start to your first real user</span>
          <span className="text-4xl font-semibold tracking-tight">{totalText(app)}</span>
          {app.typical && (
            <span className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-sm text-zinc-600">
              <span><b className="font-medium text-zinc-900">{setupText(app.typical.setupHours)}</b> of your work</span>
              <span><b className="font-medium text-zinc-900">{waitText(app)}</b>{app.typical.waitDays && app.typical.waitDays[1] > 0 ? " waiting for review" : ""}</span>
              {agentSteps > 0 && <span>an agent can do <b className="font-medium text-zinc-900">{agentSteps} of {app.steps.length}</b> steps</span>}
            </span>
          )}
        </div>
        <p className="max-w-3xl text-base leading-relaxed text-zinc-700">{app.headline}</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <Fact icon={TestTube2} label="Try it yourself" claim={app.firstTest} />
          <Fact icon={Rocket} label="Real users can connect" claim={app.production} />
          <Fact icon={Hourglass} label="Review" claim={app.approvalWait} />
        </div>
      </section>

      {app.timeline && app.timeline.length > 0 && (
        <section className="grid gap-3" data-tour="timeline">
          <div>
            <h2 className="text-lg font-semibold">Your timeline</h2>
            <p className="text-sm text-zinc-500">What happens when, and who you wait on.</p>
          </div>
          <GuideTimeline phases={app.timeline} />
        </section>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="grid min-w-0 gap-6">
          <section className="grid gap-4" data-tour="steps">
            <div>
              <h2 className="text-lg font-semibold">How to do it</h2>
              <p className="text-sm text-zinc-500">{app.steps.length} steps{agentSteps ? ` · an agent can do ${agentSteps} of them` : ""}</p>
            </div>
            <ol className="grid gap-3">
              {app.steps.map((s, i) => (
                <li key={s.title} className={`grid grid-cols-[28px_minmax(0,1fr)] gap-3 rounded-lg border bg-white p-4 ${s.slow ? "border-rose-200" : ""}`}>
                  <span className={`grid size-7 place-items-center rounded-sm text-sm font-semibold tabular-nums ${s.slow ? "bg-rose-100 text-rose-700" : "bg-zinc-100 text-zinc-700"}`}>{i + 1}</span>
                  <div className="grid min-w-0 gap-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{s.title}</span>
                      {s.slow && <span className="rounded bg-rose-50 px-1.5 py-0.5 text-[11px] font-medium text-rose-700">Slowest step: start it early</span>}
                    </div>
                    <p className="text-sm leading-relaxed text-zinc-600">{s.detail}</p>
                    <div className="flex flex-wrap items-center gap-2 pt-0.5">
                      <OwnerChip owner={s.owner} />
                      <span className="inline-flex items-center gap-1 text-xs text-zinc-500"><Clock className="size-3" />{s.time}</span>
                      <ProofDot proof={s.proof} />
                      {s.link && <a className="inline-flex items-center gap-1 text-xs text-sky-700 hover:underline" href={s.link} target="_blank" rel="noreferrer">Open page <ExternalLink className="size-3" /></a>}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section className="grid gap-3" data-tour="blockers">
            <h2 className="text-lg font-semibold">Where people get stuck</h2>
            <div className="grid gap-2">
              {app.blockers.map((b) => (
                <div key={b.title} className="grid gap-1 rounded-lg border bg-white p-4">
                  <div className="flex items-start gap-2">
                    <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" />
                    <span className="flex-1 font-medium">{b.title}</span>
                    <ProofDot proof={b.proof} />
                  </div>
                  <p className="pl-6 text-sm leading-relaxed text-zinc-600">{b.fix}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-3" data-tour="permissions">
            <div>
              <h2 className="text-lg font-semibold">What will your agent do?</h2>
              <p className="text-sm text-zinc-500">What you ask for decides how strict the review is. Untick what you don't need.</p>
            </div>
            <div className="overflow-x-auto rounded-lg border bg-white">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10" />
                    <TableHead>Your agent can</TableHead>
                    <TableHead>Review</TableHead>
                    <TableHead>What it means</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {app.actions.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="align-top">
                        <Checkbox id={`act-${a.id}`} checked={picked.includes(a.id)} onCheckedChange={(v) => setPicked((p) => (v ? [...p, a.id] : p.filter((x) => x !== a.id)))} />
                      </TableCell>
                      <TableCell className="align-top">
                        <label htmlFor={`act-${a.id}`} className="font-medium">{a.label}</label>
                        <div><code className="text-[11px] text-zinc-500">{a.scope}</code></div>
                      </TableCell>
                      <TableCell className="align-top"><LevelBadge level={a.level} /></TableCell>
                      <TableCell className="min-w-56 whitespace-normal align-top text-sm text-zinc-600">{a.review}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <Alert className={worst?.level === "restricted" || worst?.level === "partner" ? "border-rose-200 bg-rose-50" : "border-emerald-200 bg-emerald-50"}>
              <ShieldAlert className="size-4" />
              <AlertTitle>{worst ? `Your review level: ${worst.level} · about ${worst.timeToLive} to go live` : "Pick at least one"}</AlertTitle>
              <AlertDescription>{worst ? worst.review : "The review level updates as you tick."}</AlertDescription>
            </Alert>
          </section>

          <section className="grid gap-3 sm:grid-cols-2">
            <div className="grid content-start gap-2 rounded-lg border bg-white p-4 text-sm">
              <span className="flex items-center gap-1.5 font-semibold text-violet-700"><Bot className="size-4" /> An agent can</span>
              <ul className="grid gap-1.5">{app.agentCan.map((t) => <li key={t} className="flex gap-2"><Check className="mt-0.5 size-3.5 shrink-0 text-violet-600" />{t}</li>)}</ul>
            </div>
            <div className="grid content-start gap-2 rounded-lg border bg-white p-4 text-sm">
              <span className="flex items-center gap-1.5 font-semibold"><User className="size-4" /> Only you can</span>
              <ul className="grid gap-1.5">{app.youDo.map((t) => <li key={t} className="flex gap-2"><Check className="mt-0.5 size-3.5 shrink-0 text-zinc-400" />{t}</li>)}</ul>
            </div>
            <div className="grid content-start gap-2 rounded-lg border bg-white p-4 text-sm sm:col-span-2">
              <span className="font-semibold">Before you're approved</span>
              <p className="text-zinc-600">{app.testMode.text}</p>
              <ProofDot proof={app.testMode.proof} />
              <span className="pt-1 text-xs font-medium text-zinc-500">Who can set it up</span>
              <p className="text-zinc-600">{app.whoCanRegister.text}</p>
            </div>
          </section>

          <section id="more" className="scroll-mt-20">
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="flex-wrap">
                <TabsTrigger value="proof">{tested ? "Evidence and sources" : "Sources"}</TabsTrigger>
                {app.drafts.length > 0 && <TabsTrigger value="paste">Text to paste</TabsTrigger>}
              </TabsList>

              <TabsContent value="paste" className="grid gap-3 pt-2">
                <p className="text-sm text-zinc-600">Review forms ask you to explain your app in writing. Start from these and make them yours.</p>
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

        <TabsContent value="proof" className="grid gap-4 pt-2">
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
          </section>
        </div>

        <aside className="grid gap-4 lg:sticky lg:top-20">
          <div data-tour="proof" className={`grid gap-3 rounded-xl border p-4 ${tested ? "border-emerald-200 bg-emerald-50/60" : "bg-white"}`}>
            <div className="flex items-center gap-2 font-semibold">
              {tested ? <BadgeCheck className="size-5 text-emerald-600" /> : <BookOpen className="size-5 text-sky-600" />}
              {tested ? "I tested this myself" : "Researched from official docs"}
            </div>
            <p className="text-sm text-zinc-600">
              {tested ? "I built a real test app, signed in through it and kept every screenshot." : `${app.sources.length} sources, every claim labelled. Not tested hands-on yet.`}
            </p>
            {tested && app.screenshots.length > 0 && (
              <div className="grid grid-cols-3 gap-1.5">
                {app.screenshots.slice(0, 3).map((x) => (
                  <a key={x.src} href={x.src} target="_blank" rel="noreferrer" title={x.caption}><img src={x.src} alt={x.caption} className="aspect-square w-full rounded-md border object-cover object-top" /></a>
                ))}
              </div>
            )}
            <Button size="sm" variant={tested ? "default" : "outline"} onClick={showProof}>{tested ? `See all ${app.screenshots.length} screenshots` : "See the sources"}</Button>
          </div>

          <div className="grid gap-2.5 rounded-xl border bg-white p-4" data-tour="check-site">
            <span className="flex items-center gap-2 font-semibold"><Globe className="size-4 text-sky-600" /> Check your site</span>
            <p className="text-sm text-zinc-600">Would {app.name}'s reviewers approve it today? It checks your home page, privacy policy, terms and contact.</p>
            <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); runCheck() }}>
              <Input id="site" aria-label="Your website" placeholder="yourproduct.com" value={site} onChange={(e) => setSite(e.target.value)} />
              <Button type="submit" size="sm" disabled={checking}>{checking ? <Loader2 className="size-4 animate-spin" /> : "Check"}</Button>
            </form>
            {readyError && <p className="text-sm text-rose-700">{readyError}</p>}
            {ready && (
              <button type="button" onClick={() => setShowReady(true)} className="grid gap-1.5 rounded-md bg-zinc-50 p-2.5 text-left hover:bg-zinc-100">
                <span className="flex items-center gap-2"><span className="text-xl font-semibold tabular-nums">{ready.score}/{ready.total}</span><Progress value={(ready.score / ready.total) * 100} className="flex-1" /></span>
                <span className="text-xs text-zinc-600">{ready.total - ready.score ? `${ready.total - ready.score} to fix before you submit` : "Ready to submit"} · see the report</span>
              </button>
            )}
          </div>

          <div className="grid gap-2.5 rounded-xl border bg-white p-4" data-tour="sign-in">
            <span className="flex items-center gap-2 font-semibold"><PlugZap className="size-4 text-violet-600" /> Try a real sign-in</span>
            {SIGN_IN_TESTS[app.slug] ? (
              <>
                <p className="text-sm text-zinc-600">Sign in through my own {app.name} test app. You'll see exactly what your users see, and what access {app.name} gives back.</p>
                <Button asChild size="sm" variant="outline"><a href={SIGN_IN_TESTS[app.slug].start}>Start the sign-in <ExternalLink className="size-3.5" /></a></Button>
                <span className="text-xs text-zinc-500">{SIGN_IN_TESTS[app.slug].note}</span>
              </>
            ) : (
              <p className="text-sm text-zinc-600">Not available for {app.name} yet. I have real test apps for Gmail, GitHub, Slack and Notion.</p>
            )}
          </div>
        </aside>
      </div>

      <Dialog open={showReady} onOpenChange={setShowReady}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Readiness report{ready ? ` for ${new URL(ready.url).hostname}` : ""}</DialogTitle>
            <DialogDescription>What {app.name}'s reviewers look at, checked on your live site.</DialogDescription>
          </DialogHeader>
          {ready && (
            <div className="grid gap-2">
              <div className="flex items-center gap-3"><span className="text-3xl font-semibold tabular-nums">{ready.score}/{ready.total}</span><Progress value={(ready.score / ready.total) * 100} className="flex-1" /></div>
              {ready.checks.map((c) => (
                <div key={c.id} className="grid gap-1 rounded-md border bg-white px-3 py-2 text-sm">
                  <div className="flex items-center justify-between gap-3"><span className="font-medium">{c.label}</span><span className={c.ok ? "text-emerald-700" : "text-rose-700"}>{c.ok ? "Ready" : "Fix this"}</span></div>
                  <span className="break-all text-xs text-zinc-500">{c.detail}</span>
                  {c.fix && <span className="text-xs text-zinc-700">{c.fix}</span>}
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
