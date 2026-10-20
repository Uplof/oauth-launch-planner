// Page views for my own dashboard (the share-link tracker on my portfolio).
// No cookies and nothing personal: only which page, after a few seconds on it.
// ?r=<token> picks the share link; ?owner=1 marks this browser as mine so it isn't counted.

const ENDPOINT = "https://portfolio-uplof.vercel.app/api/track"
const DEFAULT_TOKEN = "r-composio-planner-q8n3"
const DWELL_MS = 3000

function read(key: string, store: "local" | "session") {
  try { return (store === "local" ? localStorage : sessionStorage).getItem(key) } catch { return null }
}
function write(key: string, value: string | null, store: "local" | "session") {
  try {
    const s = store === "local" ? localStorage : sessionStorage
    if (value === null) s.removeItem(key)
    else s.setItem(key, value)
  } catch { /* storage blocked */ }
}

export function readParams() {
  const q = new URLSearchParams(window.location.search)
  // Friendly tags for links I hand out, e.g. the submission PDF: ?from=pdf.
  const FROM: Record<string, string> = { pdf: "r-composio-pdf-h2m7" }
  const from = q.get("from")
  if (from && FROM[from]) write("planner-ref", FROM[from], "local")
  const r = q.get("r")
  if (r && /^[a-z0-9-]{1,64}$/.test(r)) write("planner-ref", r, "local")
  if (q.get("owner") === "1") write("planner-owner", "1", "local")
  if (q.get("owner") === "0") write("planner-owner", null, "local")
}

let timer: ReturnType<typeof setTimeout> | undefined

export function trackPage(path: string) {
  clearTimeout(timer)
  timer = setTimeout(() => {
    const first = !read("planner-visit", "session")
    write("planner-visit", "1", "session")
    const body = JSON.stringify({
      site: "planner",
      token: read("planner-ref", "local") ?? DEFAULT_TOKEN,
      path: path.slice(0, 120),
      first,
      owner: read("planner-owner", "local") === "1",
    })
    // A simple text/plain request: no preflight, and the reply is not needed.
    fetch(ENDPOINT, { method: "POST", mode: "no-cors", keepalive: true, headers: { "Content-Type": "text/plain" }, body }).catch(() => {})
  }, DWELL_MS)
}

// My own browsers (marked once with ?owner=1) are left out of every count, here and in Vercel Analytics.
export const isOwner = () => read("planner-owner", "local") === "1"
