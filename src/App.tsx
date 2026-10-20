import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom"
import { useEffect } from "react"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/sonner"
import { Analytics } from "@vercel/analytics/react"
import { Shell } from "@/components/bits"
import { isOwner, readParams, trackPage } from "@/lib/track"
import Home from "@/pages/Home"
import Plan from "@/pages/Plan"
import Guide from "@/pages/Guide"
import Library from "@/pages/Library"
import Generate from "@/pages/Generate"
import Evidence from "@/pages/Evidence"
import Agents from "@/pages/Agents"

function PageTracker() {
  const { pathname } = useLocation()
  useEffect(() => { readParams() }, [])
  useEffect(() => { trackPage(pathname) }, [pathname])
  return null
}

function ScrollTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0) // newer browsers return a Promise here; never hand it to React as a cleanup
  }, [pathname])
  return null
}

export default function App() {
  return (
    <BrowserRouter>
      <TooltipProvider delayDuration={200}>
        <ScrollTop />
        <PageTracker />
        <Shell>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/plan/:id" element={<Plan />} />
            <Route path="/apps/:slug" element={<Guide />} />
            <Route path="/library" element={<Library />} />
            <Route path="/generate/:slug" element={<Generate />} />
            <Route path="/evidence" element={<Evidence />} />
            <Route path="/agents" element={<Agents />} />
            <Route path="*" element={<Home />} />
          </Routes>
        </Shell>
        <Toaster />
        <Analytics beforeSend={(e) => (isOwner() ? null : e)} />
      </TooltipProvider>
    </BrowserRouter>
  )
}
