import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { BadgeCheck, ChevronRight, Search, Sparkles } from "lucide-react"
import { Input } from "@/components/ui/input"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { APPS, isTested, type AppGuide } from "@/data/apps"
import library from "@/data/library.json"
import { AppLogo, DifficultyBadge } from "@/components/bits"
import { setupText, totalText, waitText } from "@/lib/time"

type Lib = { slug: string; name: string; modes: string[]; tools: number }

// Rough days to real users, for sorting fastest first; unknown waits sort last.
const total = (g: AppGuide) => (g.typical ? g.typical.setupHours[1] / 8 + (g.typical.waitDays ? g.typical.waitDays[1] : 999) : 9999)

export default function Library() {
  const nav = useNavigate()
  const [q, setQ] = useState("")
  const [f, setF] = useState("all")
  const rows = useMemo(() => {
    const guide = (slug: string) => APPS.find((a) => a.slug === slug)
    return (library as Lib[])
      .map((l) => ({ l, g: guide(l.slug) }))
      .filter(({ l, g }) => (g?.name ?? l.name).toLowerCase().includes(q.toLowerCase()))
      .filter(({ g }) => f === "all" || (f === "guide" && g) || (f === "tested" && g && isTested(g)) || (f === "live" && !g))
      .sort((a, b) => {
        if (!!a.g !== !!b.g) return a.g ? -1 : 1
        if (a.g && b.g) return Number(isTested(b.g)) - Number(isTested(a.g)) || total(a.g) - total(b.g)
        return b.l.tools - a.l.tools
      })
  }, [q, f])
  const guides = rows.filter((r) => r.g).length

  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Library</h1>
        <p className="max-w-3xl text-zinc-600">
          {APPS.length} apps with a ready guide, fastest first. Any other app: click it and the research agent looks it up live.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-2.5 top-2.5 size-4 text-zinc-400" />
          <Input id="q" className="pl-8" placeholder="Search apps" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <ToggleGroup data-tour="library-filters" type="single" value={f} onValueChange={(v) => v && setF(v)} variant="outline">
          <ToggleGroupItem value="all">All</ToggleGroupItem>
          <ToggleGroupItem value="guide">Has a guide</ToggleGroupItem>
          <ToggleGroupItem value="tested">Tested by me</ToggleGroupItem>
          <ToggleGroupItem value="live">Research live</ToggleGroupItem>
        </ToggleGroup>
        <span className="ml-auto text-sm text-zinc-500">{rows.length} apps · {guides} with a guide</span>
      </div>
      <div className="overflow-x-auto rounded-lg border bg-white" data-tour="library-table">
        <Table className="min-w-[980px]">
          <TableHeader>
            <TableRow>
              <TableHead>App</TableHead>
              <TableHead>How hard</TableHead>
              <TableHead>Total time</TableHead>
              <TableHead>Your work</TableHead>
              <TableHead>Review wait</TableHead>
              <TableHead>Agent does</TableHead>
              <TableHead>Main blocker</TableHead>
              <TableHead>Proof</TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ l, g }) => {
              const to = g ? `/apps/${g.slug}` : `/generate/${l.slug}`
              return (
                <TableRow
                  key={l.slug}
                  tabIndex={0}
                  role="link"
                  aria-label={g ? `Open the ${g.name} guide` : `Research ${l.name} live`}
                  onClick={() => nav(to)}
                  onKeyDown={(e) => { if (e.key === "Enter") nav(to) }}
                  className="group cursor-pointer align-top hover:bg-zinc-50 focus-visible:bg-zinc-50 focus-visible:outline-none"
                >
                  <TableCell>
                    <span className="flex items-center gap-2.5">
                      <AppLogo slug={l.slug} name={g?.name ?? l.name} size={18} />
                      <span className="grid">
                        <span className="font-medium">{g?.name ?? l.name}</span>
                        {g && <span className="text-xs text-zinc-500">{g.blurb ?? g.category}</span>}
                      </span>
                    </span>
                  </TableCell>
                  {g ? (
                    <>
                      <TableCell><DifficultyBadge d={g.difficulty} /></TableCell>
                      <TableCell className="max-w-32 whitespace-normal text-sm font-semibold">{totalText(g)}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm">{g.typical ? setupText(g.typical.setupHours) : "-"}</TableCell>
                      <TableCell className={`whitespace-nowrap text-sm ${g.typical?.waitDays === null ? "text-zinc-500" : ""}`}>{waitText(g)}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        <span className="font-medium text-violet-700">{g.steps.filter((x) => x.owner === "agent").length}</span>
                        <span className="text-zinc-500"> of {g.steps.length} steps</span>
                      </TableCell>
                      <TableCell className="max-w-56 whitespace-normal text-sm text-zinc-700">{g.blockers[0]?.title ?? "-"}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {isTested(g)
                          ? <span className="inline-flex items-center gap-1 font-medium text-emerald-700"><BadgeCheck className="size-4" /> Tested</span>
                          : <span className="text-zinc-500">{g.sources.length} sources</span>}
                      </TableCell>
                    </>
                  ) : (
                    <TableCell colSpan={7} className="text-sm text-zinc-500">
                      <span className="inline-flex items-center gap-1.5"><Sparkles className="size-3.5 text-violet-500" /> No guide yet. Click to research it live, in about a minute.</span>
                    </TableCell>
                  )}
                  <TableCell><ChevronRight className="size-4 text-zinc-300 group-hover:text-zinc-600" /></TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
