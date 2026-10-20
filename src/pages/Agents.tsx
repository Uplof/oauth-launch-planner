import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const API = `curl "https://oauth-launch-planner.vercel.app/api/plan?app=gmail&needs=send"

{
  "app": "gmail",
  "verdict": { "difficulty": "hard", "path": "sensitive", "review": "Brand check + scope review + demo video", "to_live": "about 1-2 weeks" },
  "actions": [{ "id": "send", "label": "Send email", "scope": "gmail.send", "level": "sensitive", "proof": "tested" }],
  "start_today": ["Book a security assessment lab"],
  "steps": [{ "title": "Add Gmail permissions", "owner": "agent", "proof": "tested" }, ...],
  "unconfirmed": ["Security assessment price (no official number)"]
}

# also: /api/guide?app=slack   /api/readiness?url=yourproduct.com&app=gmail`

const MCP = `// Claude Code: claude mcp add --transport http oauth-planner https://oauth-launch-planner.vercel.app/api/mcp
{
  "mcpServers": {
    "oauth-planner": { "type": "http", "url": "https://oauth-launch-planner.vercel.app/api/mcp" }
  }
}

# tools
list_guides()                        -> apps with a guide
get_oauth_plan(app, needs[])         -> verdict + steps + proof labels
check_readiness(url, app)            -> reviewer-style site checklist
research_app(app)                    -> live research stream for a new app`

export default function Agents() {
  return (
    <div className="grid gap-6">
      <div className="grid max-w-3xl gap-2">
        <div className="flex items-center gap-2"><h1 className="text-3xl font-semibold tracking-tight">For coding agents</h1><Badge variant="outline" className="border-emerald-200 bg-emerald-50 font-normal text-emerald-700">live</Badge></div>
        <p className="text-zinc-600">The same plan as data, so Claude Code, Cursor or your own agent can read it and do the agent-doable steps.</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card><CardHeader><CardTitle>JSON API</CardTitle><CardDescription>One call per app.</CardDescription></CardHeader><CardContent><pre className="overflow-x-auto rounded-md bg-zinc-950 p-4 text-xs text-zinc-100">{API}</pre></CardContent></Card>
        <Card><CardHeader><CardTitle>MCP server</CardTitle><CardDescription>Add once; your agent gets three tools.</CardDescription></CardHeader><CardContent><pre className="overflow-x-auto rounded-md bg-zinc-950 p-4 text-xs text-zinc-100">{MCP}</pre></CardContent></Card>
      </div>
    </div>
  )
}
