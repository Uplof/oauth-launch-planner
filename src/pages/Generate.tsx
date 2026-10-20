import { useEffect, useRef, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { CheckCircle2, Loader2, ArrowRight, TriangleAlert, Search, FileText, RotateCcw } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import library from "@/data/library.json"
import { AppLogo } from "@/components/bits"
import { getApp, type AppGuide } from "@/data/apps"
import { saveGuide } from "@/lib/api"

type Line = { kind: "step" | "search" | "read"; text: string; phase?: string }

export default function Generate() {
  const { slug = "zoom" } = useParams()
  const lib = (library as { slug: string; name: string }[]).find((l) => l.slug === slug)
  const name = lib?.name ?? decodeURIComponent(slug).replace(/(^|[-\s])\w/g, (m) => m.toUpperCase()).replace(/-/g, " ")
  const existing = getApp(slug)
  const [lines, setLines] = useState<Line[]>([])
  const [guide, setGuide] = useState<AppGuide | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [limited, setLimited] = useState(false)
  const [run, setRun] = useState(0)
  const started = useRef(0)
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (existing) return
    setLines([]); setGuide(null); setError(null); setLimited(false)
    started.current = Date.now()
    const es = new EventSource(`/api/research?app=${encodeURIComponent(name)}`)
    const add = (l: Line) => setLines((x) => [...x, l])
    es.addEventListener("step", (e) => add({ kind: "step", text: JSON.parse((e as MessageEvent).data).text }))
    es.addEventListener("activity", (e) => {
      const d = JSON.parse((e as MessageEvent).data)
      add({ kind: d.kind, text: d.text, phase: d.phase })
    })
    es.addEventListener("done", (e) => {
      const g = JSON.parse((e as MessageEvent).data).guide as AppGuide
      saveGuide(g); setGuide(g); es.close()
    })
    es.addEventListener("error", (e) => {
      const data = (e as MessageEvent).data
      const d = data ? JSON.parse(data) : null
      setError(d?.message ?? "The connection dropped. Try again.")
      setLimited(d?.code === "limit")
      es.close()
    })
    const tick = setInterval(() => setElapsed(Math.round((Date.now() - started.current) / 1000)), 1000)
    return () => { es.close(); clearInterval(tick) }
  }, [name, run, existing])

  if (existing) {
    return (
      <div className="mx-auto grid max-w-3xl gap-3">
        <h1 className="text-2xl font-semibold">{existing.name} already has a guide</h1>
        <Button asChild className="w-fit"><Link to={`/apps/${existing.slug}`}>Open the guide <ArrowRight className="size-4" /></Link></Button>
      </div>
    )
  }

  const searches = lines.filter((l) => l.kind === "search").length
  const reads = lines.filter((l) => l.kind === "read").length
  const working = !guide && !error

  return (
    <div className="mx-auto grid max-w-3xl gap-6">
      <div className="flex items-center gap-3">
        <AppLogo slug={slug} name={name} size={36} />
        <div className="grid gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Researching {name}</h1>
          <span className="text-sm text-zinc-500">{working ? `Working · ${elapsed}s · usually 1-3 minutes` : guide ? `Done in ${elapsed}s` : "Stopped"}</span>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{guide ? "Guide ready" : error ? "Research stopped" : "The agent is working"}</CardTitle>
          <CardDescription>Searches and pages appear as each research step finishes. So far: {searches} searches · {reads} pages.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <ol className="grid max-h-[420px] gap-2 overflow-y-auto pr-1">
            {lines.length === 0 && working && <li className="flex items-center gap-2 text-sm text-zinc-500"><Loader2 className="size-4 animate-spin" /> Starting…</li>}
            {lines.map((l, i) => (
              <li key={i} className="flex gap-2 text-sm">
                {l.kind === "step" ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" /> : l.kind === "search" ? <Search className="mt-0.5 size-4 shrink-0 text-zinc-400" /> : <FileText className="mt-0.5 size-4 shrink-0 text-zinc-400" />}
                <span className={l.kind === "step" ? "font-medium" : "break-all text-zinc-600"}>
                  {l.kind === "search" ? `Searching: ${l.text}` : l.kind === "read" ? `${l.phase === "check" ? "Checking" : "Reading"}: ${l.text}` : l.text}
                </span>
              </li>
            ))}
            {working && lines.length > 0 && <li className="flex items-center gap-2 text-sm text-zinc-500"><Loader2 className="size-4 animate-spin" /> Working…</li>}
          </ol>

          {error && (
            <div className="grid gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <div className="flex items-start gap-2"><TriangleAlert className="mt-0.5 size-4" />{error}</div>
              {limited
                ? <Button asChild variant="outline" className="w-fit"><Link to="/library">Open the library <ArrowRight className="size-4" /></Link></Button>
                : <Button variant="outline" className="w-fit" onClick={() => setRun((r) => r + 1)}><RotateCcw className="size-4" /> Try again</Button>}
            </div>
          )}

          {guide && (
            <div className="grid gap-3 rounded-lg border bg-zinc-50 p-4">
              <p className="text-sm">{guide.headline}</p>
              <Button asChild className="w-fit"><Link to={`/apps/${guide.slug}`}>Open the guide <ArrowRight className="size-4" /></Link></Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
