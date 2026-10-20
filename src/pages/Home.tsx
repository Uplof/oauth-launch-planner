import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { ArrowRight, BadgeCheck, BookOpen, Clock, Search, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { APPS, isTested } from "@/data/apps"
import { TimeChart } from "@/components/Timeline"
import { totalText } from "@/lib/time"
import library from "@/data/library.json"
import { AppLogo, DifficultyBadge } from "@/components/bits"
import { planFromDescription, savePlan } from "@/lib/api"

const EXAMPLES = [
  "An AI assistant that reads support emails in Gmail, drafts replies and logs tickets in Notion",
  "A sales agent that posts deal updates to Slack and creates follow-ups in HubSpot",
  "A coding agent that opens GitHub issues from customer feedback",
]

export default function Home() {
  const nav = useNavigate()
  const [desc, setDesc] = useState(EXAMPLES[0])
  const [found, setFound] = useState<string[] | null>(null)
  const [query, setQuery] = useState("")
  const [error, setError] = useState<string | null>(null)

  // A1: Claude reads the sentence, finds the apps and actions, and the plan opens.
  async function build() {
    setError(null)
    setFound([])
    try {
      const plan = await planFromDescription(desc)
      savePlan(plan)
      const lines = plan.apps.flatMap((a) => (a.actions.length ? a.actions : [{ label: "connects", why: "" }]).map((x) => `${a.name} · ${x.label}`))
      lines.forEach((l, i) => setTimeout(() => setFound((f) => [...(f ?? []), l]), 350 * (i + 1)))
      setTimeout(() => nav("/plan/live"), 350 * (lines.length + 1) + 400)
    } catch (e) {
      setFound(null)
      setError(e instanceof Error ? e.message : "The planner did not answer.")
    }
  }

  return (
    <div className="grid gap-12">
      <section className="mx-auto grid w-full max-w-3xl gap-8 pt-6 text-center">
        <div className="grid gap-3">
          <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">Know your OAuth path before you build.</h1>
          <p className="text-lg text-zinc-600">Describe your AI agent. See how long each app takes to approve, and what to do first.</p>
        </div>

        <Card className="border-zinc-300 text-left shadow-[0_24px_60px_-20px_rgba(24,24,27,0.35)] ring-1 ring-zinc-900/5" data-tour="describe">
          <CardContent className="p-4 sm:p-6">
            <Tabs defaultValue="describe" className="gap-4">
              <TabsList className="grid h-11 w-full grid-cols-2">
                <TabsTrigger value="describe" className="h-full text-sm"><Sparkles className="size-4" /> Describe your agent</TabsTrigger>
                <TabsTrigger value="lookup" className="h-full text-sm"><Search className="size-4" /> Look up one app</TabsTrigger>
              </TabsList>
              <TabsContent value="describe" className="grid gap-4">
                <Textarea id="desc" rows={4} value={desc} onChange={(e) => setDesc(e.target.value)} className="min-h-32 resize-none p-4 text-lg leading-relaxed md:text-lg" placeholder="What does your agent do, and which apps does it use?" />
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-zinc-500">Try:</span>
                  {EXAMPLES.map((ex) => (
                    <button key={ex} type="button" onClick={() => setDesc(ex)} className="rounded-sm border bg-zinc-50 px-3 py-1 text-left text-xs text-zinc-700 hover:border-zinc-400 hover:bg-white">
                      {ex.length > 48 ? ex.slice(0, 46) + "…" : ex}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                  <p className="text-sm text-zinc-500">The planner finds the apps, the permissions and the reviews.</p>
                  <Button size="lg" onClick={build} disabled={found !== null}>{found ? (found.length ? "Building your plan…" : "Reading your agent…") : "Build my launch plan"} <ArrowRight className="size-4" /></Button>
                </div>
                {error && (
                  <div className="grid gap-2 rounded-sm border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                    <span>{error}</span>
                    <Link to="/plan/demo" className="w-fit font-medium underline">See the example plan instead</Link>
                  </div>
                )}
                {found && (
                  <div className="grid gap-1.5 rounded-sm border bg-zinc-50 p-3 text-sm">
                    <span className="text-xs font-medium text-zinc-500">Found in your description</span>
                    {found.map((f) => <span key={f} className="flex items-center gap-2"><Sparkles className="size-3.5 text-violet-600" />{f}</span>)}
                  </div>
                )}
              </TabsContent>
              <TabsContent value="lookup">
                <Command className="rounded-sm border [&_[data-slot=command-input-wrapper]]:h-14 [&_[data-slot=command-input-wrapper]]:px-4">
                  <CommandInput value={query} onValueChange={setQuery} className="text-base" placeholder="Type an app name or website, e.g. Trello or trello.com" />
                  <CommandList className="max-h-80">
                    <CommandEmpty>
                      <div className="grid gap-3 py-4">
                        <span>{query.trim() ? `No guide for “${query.trim()}” yet.` : "No guide for that app yet."}</span>
                        <Button size="sm" onClick={() => nav(`/generate/${encodeURIComponent(query.trim() || "trello")}`)} className="mx-auto">Research {query.trim() ? `“${query.trim()}”` : "it"} live <Sparkles className="size-3.5" /></Button>
                        <span className="text-xs text-zinc-500">The research agent writes a guide in 1-5 minutes.</span>
                      </div>
                    </CommandEmpty>
                    <CommandGroup heading={`Ready guides (${APPS.length})`}>
                      {APPS.map((a) => (
                        <CommandItem key={a.slug} value={a.name} onSelect={() => nav(`/apps/${a.slug}`)} className="gap-3 py-2.5">
                          <AppLogo slug={a.slug} name={a.name} size={18} />
                          <span className="flex flex-1 items-center gap-2"><span className="font-medium">{a.name}</span>{isTested(a) && <span className="text-xs text-emerald-700">tested</span>}</span>
                          <span className="ml-auto flex items-center gap-3 text-xs text-zinc-500">{totalText(a)} <DifficultyBadge d={a.difficulty} /></span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                    <CommandGroup heading="No guide yet: research live">
                      {(library as { slug: string; name: string }[]).filter((l) => !APPS.some((a) => a.slug === l.slug)).slice(0, 40).map((l) => (
                        <CommandItem key={l.slug} value={l.name} onSelect={() => nav(`/generate/${l.slug}`)} className="gap-3 py-2.5">
                          <AppLogo slug={l.slug} name={l.name} size={18} /> <span className="flex-1">{l.name}</span>
                          <span className="text-xs text-zinc-500">research live</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </section>

      <section className="mx-auto grid w-full max-w-5xl gap-3">
        <Tabs defaultValue="guides" className="gap-4" data-tour="guides">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <TabsList className="h-10">
              <TabsTrigger value="guides" className="h-full px-4"><BookOpen className="size-4" /> Guides ({APPS.length})</TabsTrigger>
              <TabsTrigger value="time" className="h-full px-4" data-tour="chart"><Clock className="size-4" /> How long each takes</TabsTrigger>
            </TabsList>
            <Button variant="ghost" size="sm" asChild><Link to="/library">Full library <ArrowRight className="size-4" /></Link></Button>
          </div>

          <TabsContent value="guides">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {APPS.map((a) => (
                <Link key={a.slug} to={`/apps/${a.slug}`} className="group grid gap-2 rounded-sm border bg-white p-3 transition hover:border-zinc-400 hover:shadow-md">
                  <span className="flex items-center gap-2.5">
                    <AppLogo slug={a.slug} name={a.name} size={18} />
                    <span className="min-w-0 flex-1 truncate font-medium">{a.name}</span>
                    {isTested(a) && <BadgeCheck className="size-4 shrink-0 text-emerald-600" aria-label="Tested by me" />}
                  </span>
                  <span className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-zinc-600">{totalText(a)}</span>
                    <DifficultyBadge d={a.difficulty} />
                  </span>
                </Link>
              ))}
            </div>
            <p className="pt-3 text-xs text-zinc-500"><BadgeCheck className="mr-1 inline size-3.5 text-emerald-600" />Tested by me with a real test app. The rest are researched from official docs.</p>
          </TabsContent>

          <TabsContent value="time">
            <div className="rounded-sm border bg-white p-4">
              <p className="pb-3 text-sm text-zinc-600">From a blank form to your first real user, fastest first. Your work in violet, the review wait in amber.</p>
              <TimeChart apps={APPS} />
            </div>
          </TabsContent>
        </Tabs>
      </section>
    </div>
  )
}
