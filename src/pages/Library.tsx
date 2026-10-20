import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { Search, Sparkles } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { APPS } from "@/data/apps"
import library from "@/data/library.json"
import { AppLogo, DifficultyBadge } from "@/components/bits"

type Lib = { slug: string; name: string; modes: string[]; tools: number }

export default function Library() {
  const [q, setQ] = useState("")
  const [f, setF] = useState("all")
  const rows = useMemo(() => {
    const all = library as Lib[]
    return all
      .filter((l) => l.name.toLowerCase().includes(q.toLowerCase()))
      .filter((l) => f === "all" || (f === "guide" && APPS.some((a) => a.slug === l.slug)) || (f === "live" && !APPS.some((a) => a.slug === l.slug)))
      .sort((a, b) => Number(!!APPS.find((x) => x.slug === b.slug)) - Number(!!APPS.find((x) => x.slug === a.slug)) || b.tools - a.tools)
  }, [q, f])

  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Library</h1>
        <p className="max-w-3xl text-zinc-600">
          Popular apps that use OAuth. Apps with a guide come first; any other app can be researched live.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-2.5 top-2.5 size-4 text-zinc-400" />
          <Input id="q" className="pl-8" placeholder="Search apps" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <ToggleGroup type="single" value={f} onValueChange={(v) => v && setF(v)} variant="outline">
          <ToggleGroupItem value="all">All</ToggleGroupItem>
          <ToggleGroupItem value="guide">Has a guide</ToggleGroupItem>
                    <ToggleGroupItem value="live">Research live</ToggleGroupItem>
        </ToggleGroup>
        <span className="ml-auto text-sm text-zinc-500">{rows.length} apps</span>
      </div>
      <div className="overflow-x-auto rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>App</TableHead>
                                                        <TableHead>Guide</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((l) => {
              const g = APPS.find((a) => a.slug === l.slug)
              return (
                <TableRow key={l.slug}>
                  <TableCell><span className="flex items-center gap-2 font-medium"><AppLogo slug={l.slug} name={l.name} size={18} />{l.name}</span></TableCell>
                                    <TableCell>
                    {g ? (
                      <Button size="sm" variant="outline" asChild><Link to={`/apps/${g.slug}`}><DifficultyBadge d={g.difficulty} /> Open</Link></Button>
                    ) : (
                      <Button size="sm" variant="ghost" asChild><Link to={`/generate/${l.slug}`}><Sparkles className="size-3.5" /> Research live</Link></Button>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
