import { useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { ArrowLeft, ArrowRight, CircleHelp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface Stop {
  path: string
  match: (p: string) => boolean
  title: string
  line: string
}

// One plain sentence per screen. The walk-through goes Back and Next through them in order.
const TOUR: Stop[] = [
  { path: "/", match: (p) => p === "/", title: "Start here", line: "Describe your AI agent in one sentence, or look up one app. You get a plan for every app it connects to." },
  { path: "/plan/demo", match: (p) => p.startsWith("/plan"), title: "Your launch plan", line: "Every app your agent needs, how hard each one is to get approved, and what to start first." },
  { path: "/apps/gmail", match: (p) => p.startsWith("/apps/"), title: "One app's guide", line: "The steps to get your app approved, how long each takes, where people get stuck, and our proof." },
  { path: "/library", match: (p) => p.startsWith("/library"), title: "The library", line: "All 20 ready guides, plus 100+ more apps our agent can research for you on the spot." },
  { path: "/generate/zoom", match: (p) => p.startsWith("/generate"), title: "Live research", line: "For an app without a guide, our agent reads the provider's docs and writes one in a minute or two." },
  { path: "/evidence", match: (p) => p.startsWith("/evidence"), title: "How we check", line: "The real test apps we built, the screenshots, and what testing proved wrong in the docs." },
  { path: "/agents", match: (p) => p.startsWith("/agents"), title: "For coding agents", line: "The same plans as data, so tools like Claude Code or Cursor can read them and do the steps." },
  { path: "/architecture", match: (p) => p.startsWith("/architecture"), title: "How it's built", line: "The parts of the system and how they fit together." },
]

// A small "What's this page?" button; the tour opens as a pop-up instead of a banner.
export function DemoGuide() {
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const i = TOUR.findIndex((s) => s.match(pathname))
  if (i < 0) return null
  const s = TOUR[i]
  const prev = TOUR[i - 1]
  const next = TOUR[i + 1]
  return (
    <>
      <div className="mb-4 flex justify-end">
        <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 rounded-full border bg-white px-3 py-1 text-xs text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900">
          <CircleHelp className="size-3.5" /> What's this page?
        </button>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <span className="text-xs font-medium text-violet-700">Walk-through · {i + 1} of {TOUR.length}</span>
            <DialogTitle>{s.title}</DialogTitle>
            <DialogDescription className="text-base text-zinc-700">{s.line}</DialogDescription>
          </DialogHeader>
          <div className="flex justify-between gap-2 pt-2">
            {prev ? <Button size="sm" variant="outline" asChild><Link to={prev.path} onClick={() => setOpen(true)}><ArrowLeft className="size-3.5" /> {prev.title}</Link></Button> : <span />}
            {next ? <Button size="sm" asChild><Link to={next.path} onClick={() => setOpen(true)}>{next.title} <ArrowRight className="size-3.5" /></Link></Button>
              : <Button size="sm" variant="outline" onClick={() => setOpen(false)}>Done</Button>}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
