import { useCallback, useEffect, useLayoutEffect, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { ArrowLeft, ArrowRight, Compass, X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Stop {
  path: string
  target: string // matches a data-tour="..." on the page
  title: string
  line: string
}

// The walk-through: one stop per part of the product, in reading order across the pages.
const TOUR: Stop[] = [
  { path: "/", target: "describe", title: "Start here", line: "Describe your AI agent in one sentence, or look up a single app." },
  { path: "/", target: "guides", title: "20 ready guides", line: "Each card says how hard approval is. Tested ones I signed into myself." },
  { path: "/", target: "chart", title: "How long each app takes", line: "From a blank form to your first real user. Your work in violet, the review wait in amber." },
  { path: "/plan/demo", target: "plan-verdict", title: "Your launch plan", line: "One verdict for every app your agent needs." },
  { path: "/plan/demo", target: "plan-timeline", title: "What to start first", line: "The slowest review starts on day one, so nothing waits on it later." },
  { path: "/apps/gmail", target: "total", title: "One app's guide", line: "Total time first, then how it splits into your work and the review wait." },
  { path: "/apps/gmail", target: "timeline", title: "Day by day", line: "What happens when, and who you are waiting on." },
  { path: "/apps/gmail", target: "steps", title: "The steps", line: "In order, with the time each takes and whether an agent can do it for you." },
  { path: "/apps/gmail", target: "blockers", title: "Where people get stuck", line: "The common blockers, each with a fix." },
  { path: "/apps/gmail", target: "permissions", title: "What your agent will do", line: "Untick what you don't need. Fewer permissions often means a lighter review." },
  { path: "/apps/gmail", target: "proof", title: "The proof", line: "I built a real test app for this one and kept every screenshot." },
  { path: "/apps/gmail", target: "check-site", title: "Check your site", line: "Type your website. It checks what the reviewers look at: privacy policy, terms, contact." },
  { path: "/apps/gmail", target: "sign-in", title: "Try a real sign-in", line: "Sign in through my test app and see exactly what your users will see." },
  { path: "/library", target: "library-table", title: "The library", line: "Every app with its total time, review wait and main blocker. Click any row." },
  { path: "/library", target: "library-filters", title: "Apps without a guide", line: "Pick Research live, click an app, and the research agent writes its guide in a minute or two." },
  { path: "/evidence", target: "tests", title: "How I check", line: "Every setup I tried by hand, with what happened." },
  { path: "/evidence", target: "corrections", title: "What testing changed", line: "Where my tests proved the docs or forums wrong." },
  { path: "/agents", target: "agents", title: "For coding agents", line: "The same plans as data, so Claude Code or Cursor can read them and do the steps." },
]

const PAD = 8

function useTarget(stop: Stop | null, pathname: string) {
  const [rect, setRect] = useState<DOMRect | null>(null)
  const measure = useCallback(() => {
    const el = stop && pathname === stop.path ? document.querySelector(`[data-tour="${stop.target}"]`) : null
    setRect(el ? el.getBoundingClientRect() : null)
  }, [stop, pathname])
  // Wait for the page to render the target, bring it into view, then follow scroll and resize.
  useEffect(() => {
    if (!stop || pathname !== stop.path) return
    let tries = 0
    const t = setInterval(() => {
      const el = document.querySelector(`[data-tour="${stop.target}"]`)
      if (el || ++tries > 30) {
        clearInterval(t)
        el?.scrollIntoView({ block: "center", behavior: "smooth" })
        setTimeout(measure, 350)
      }
    }, 100)
    return () => clearInterval(t)
  }, [stop, pathname, measure])
  useLayoutEffect(() => {
    window.addEventListener("scroll", measure, true)
    window.addEventListener("resize", measure)
    return () => { window.removeEventListener("scroll", measure, true); window.removeEventListener("resize", measure) }
  }, [measure])
  return rect
}

// A "Take the tour" button; the tour highlights each part of the page and explains it in one line.
export function DemoGuide() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [i, setI] = useState<number | null>(null)
  const stop = i === null ? null : TOUR[i]
  const rect = useTarget(stop, pathname)

  const go = (n: number) => {
    if (n < 0 || n >= TOUR.length) { setI(null); return }
    setI(n)
    if (TOUR[n].path !== pathname) navigate(TOUR[n].path)
  }
  const start = () => {
    const here = TOUR.findIndex((s) => s.path === pathname)
    go(here >= 0 ? here : 0)
  }
  useEffect(() => {
    if (i === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setI(null)
      if (e.key === "ArrowRight") go(i + 1)
      if (e.key === "ArrowLeft") go(i - 1)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })

  const box = rect && { top: rect.top - PAD, left: rect.left - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 }
  // Note card below the highlight when there is room, otherwise above it; kept inside the screen.
  const cardW = Math.min(340, window.innerWidth - 32)
  const below = box ? box.top + box.height + 180 < window.innerHeight : true
  const cardTop = box ? (below ? box.top + box.height + 12 : Math.max(12, box.top - 172)) : window.innerHeight / 2 - 80
  const cardLeft = box ? Math.min(Math.max(16, box.left), window.innerWidth - cardW - 16) : window.innerWidth / 2 - cardW / 2

  return (
    <>
      <div className="mb-4 flex justify-end">
        <button onClick={start} className="inline-flex items-center gap-1.5 rounded-sm border bg-white px-3 py-1 text-xs text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900">
          <Compass className="size-3.5" /> Take the tour
        </button>
      </div>
      {stop && (
        <div className="fixed inset-0 z-50" role="dialog" aria-label="Walk-through">
          {box ? (
            <>
              {/* Four dark panels around the highlighted part; the part itself stays clear. */}
              <div className="absolute inset-x-0 top-0 bg-zinc-950/65" style={{ height: Math.max(0, box.top) }} />
              <div className="absolute inset-x-0 bottom-0 bg-zinc-950/65" style={{ top: box.top + box.height }} />
              <div className="absolute left-0 bg-zinc-950/65" style={{ top: box.top, height: box.height, width: Math.max(0, box.left) }} />
              <div className="absolute right-0 bg-zinc-950/65" style={{ top: box.top, height: box.height, left: box.left + box.width }} />
              <div className="pointer-events-none absolute rounded-sm outline outline-2 outline-violet-500" style={box} />
            </>
          ) : (
            <div className="absolute inset-0 bg-zinc-950/65" />
          )}
          <div className="absolute grid gap-2 rounded-sm border bg-white p-4 shadow-xl transition-all duration-300" style={{ top: cardTop, left: cardLeft, width: cardW }}>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-violet-700">{i! + 1} of {TOUR.length}</span>
              <button onClick={() => setI(null)} aria-label="Close the tour" className="ml-auto text-zinc-400 hover:text-zinc-900"><X className="size-4" /></button>
            </div>
            <span className="font-semibold">{stop.title}</span>
            <p className="text-sm text-zinc-600">{stop.line}</p>
            <div className="flex justify-between gap-2 pt-1">
              <Button size="sm" variant="outline" disabled={i === 0} onClick={() => go(i! - 1)}><ArrowLeft className="size-3.5" /> Back</Button>
              <Button size="sm" onClick={() => go(i! + 1)}>{i === TOUR.length - 1 ? "Done" : <>Next <ArrowRight className="size-3.5" /></>}</Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
