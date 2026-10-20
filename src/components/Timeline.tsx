import { Link } from "react-router-dom"
import { Flag, Hourglass } from "lucide-react"
import { type AppGuide, type Phase } from "@/data/apps"
import { AppLogo, OwnerChip } from "@/components/bits"
import { cn } from "@/lib/utils"

// One guide's plan, left to right on wide screens and top to bottom on phones.
export function GuideTimeline({ phases }: { phases: Phase[] }) {
  return (
    <ol className="grid gap-2 sm:grid-flow-col sm:auto-cols-fr">
      {phases.map((p, i) => (
        <li key={p.label + i} className={cn(
          "relative grid content-start gap-1.5 rounded-lg border p-3",
          p.milestone ? "border-emerald-300 bg-emerald-50" : p.wait ? "border-dashed border-amber-300 bg-amber-50/60" : "bg-white",
        )}>
          <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{p.when}</span>
          <span className="flex items-start gap-1.5 font-medium leading-snug">
            {p.milestone && <Flag className="mt-0.5 size-4 shrink-0 text-emerald-600" />}
            {p.wait && !p.milestone && <Hourglass className="mt-0.5 size-4 shrink-0 text-amber-600" />}
            {p.label}
          </span>
          {!p.milestone && <span className="text-sm text-zinc-600">{p.duration}</span>}
          {!p.milestone && <OwnerChip owner={p.owner} />}
        </li>
      ))}
    </ol>
  )
}

// Days on a log scale, so a 2-hour setup and a 3-month review both stay readable.
const MAX_DAYS = 120
const pos = (days: number) => (Math.log10(Math.max(days, 0.05) / 0.05) / Math.log10(MAX_DAYS / 0.05)) * 100
const TICKS: [number, string][] = [[0.125, "1 hr"], [1, "1 day"], [7, "1 week"], [30, "1 month"], [90, "3 months"]]

// Every guide's typical time to real users, fastest first.
export function TimeChart({ apps }: { apps: AppGuide[] }) {
  const rows = apps.filter((a) => a.typical).map((a) => {
    const t = a.typical!
    const setup: [number, number] = [t.setupHours[0] / 8, t.setupHours[1] / 8] // 8-hour working days
    const wait = t.waitDays
    return { a, setup, wait, total: setup[1] + (wait ? wait[1] : 60) }
  }).sort((x, y) => x.total - y.total)
  if (!rows.length) return null
  return (
    <div className="grid gap-3 overflow-x-auto">
      <div className="flex flex-wrap gap-4 text-xs text-zinc-600">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-5 rounded-sm bg-violet-500" /> Your setup work</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-5 rounded-sm bg-amber-400" /> Waiting for review</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-5 rounded-sm border border-dashed border-amber-500 bg-amber-100" /> Wait not published</span>
      </div>
      <div className="grid min-w-[640px] gap-1.5">
        <div className="relative ml-[180px] h-4 text-[11px] text-zinc-400">
          {TICKS.map(([d, l]) => <span key={l} className="absolute -translate-x-1/2" style={{ left: `${pos(d)}%` }}>{l}</span>)}
        </div>
        {rows.map(({ a, setup, wait }) => (
          <Link key={a.slug} to={`/apps/${a.slug}`} className="group grid grid-cols-[170px_minmax(0,1fr)] items-center gap-2.5 rounded-md py-1 hover:bg-zinc-50">
            <span className="flex min-w-0 items-center gap-2 text-sm font-medium"><AppLogo slug={a.slug} name={a.name} size={14} /><span className="truncate">{a.name}</span></span>
            <span className="relative h-7">
              {TICKS.map(([d, l]) => <span key={l} className="absolute inset-y-0 w-px bg-zinc-100" style={{ left: `${pos(d)}%` }} />)}
              <span className="absolute top-1.5 h-4 rounded-sm bg-violet-500" style={{ left: 0, width: `${pos(setup[1])}%` }} title={`Setup: ${a.typical!.setupHours[0]}-${a.typical!.setupHours[1]} hours`} />
              {wait && wait[1] > 0 && (
                <span className="absolute top-1.5 h-4 rounded-sm bg-amber-400" style={{ left: `${pos(setup[1])}%`, width: `${Math.max(pos(setup[1] + wait[1]) - pos(setup[1]), 1)}%` }} title={`Review: ${wait[0]}-${wait[1]} days`} />
              )}
              {!wait && <span className="absolute top-1.5 h-4 rounded-sm border border-dashed border-amber-500 bg-amber-100" style={{ left: `${pos(setup[1])}%`, width: `${pos(MAX_DAYS) - pos(setup[1])}%` }} title="Review wait not published" />}
              <span className="absolute right-0 top-1 rounded bg-white/90 px-1.5 text-xs text-zinc-700 group-hover:text-zinc-950">{a.typical!.toRealUsers}</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
