import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ProofBadge } from "@/components/bits"

const TESTS = [
  { when: "20 Oct, 13:04", app: "Gmail", what: "Own Google OAuth app: project and consent setup", result: "4-step setup; External audience starts in testing mode", status: "Done" },
  { when: "20 Oct, 13:07", app: "Gmail", what: "Own Google OAuth app: scope levels", result: "gmail.send labelled sensitive, gmail.readonly restricted", status: "Done" },
  { when: "20 Oct, 13:08", app: "Gmail", what: "Testing mode limits", result: "No verification needed; 100 users over the app's lifetime", status: "Done" },
  { when: "20 Oct, 13:24", app: "Gmail", what: "Sign-in through our own app", result: "Refresh token expires in 7 days (604,799 s)", status: "Done" },
  { when: "20 Oct, 13:27", app: "Gmail", what: "Non-test user", result: "Blocked: Error 403 access_denied before any permission screen", status: "Done" },
  { when: "20 Oct, 14:33", app: "GitHub", what: "Create an OAuth app", result: "Created in about a minute, no review; client ID shown at once", status: "Done" },
  { when: "20 Oct, 16:05", app: "GitHub", what: "Sign in through our own OAuth app", result: "8-hour access token, 182-day refresh token; consent shows app age and user count", status: "Done" },
  { when: "21 Oct, 00:58", app: "Slack", what: "Create an app in a new free workspace", result: "4-step wizard, about 10 minutes to an installed app including making the workspace; no review; only signed-in workspaces are offered", status: "Done" },
  { when: "21 Oct, 02:59", app: "Slack", what: "Activate public distribution", result: "4-item checklist, one self-check box; any workspace can install at once, no review", status: "Done" },
  { when: "21 Oct, 03:14", app: "Slack", what: "Sign in through our own Slack app", result: "All 8 bot scopes and 1 user scope granted; bot and user tokens have no expiry and no refresh token", status: "Done" },
  { when: "21 Oct, 02:44", app: "Notion", what: "Create a public OAuth connection", result: "Greyed out until the new account had a workspace; then created at once, installable in any workspace", status: "Done" },
  { when: "21 Oct, 02:54", app: "Notion", what: "Sign in through our own connection", result: "User picks pages (3 shared); refresh token returned; no review or warning", status: "Done" },
]

const CORRECTIONS = [
  { claim: "Refresh tokens expire after 7 days in testing", from: "docs", to: "tested", note: "Google returned refresh_token_expires_in = 604,799 s" },
  { claim: "gmail.send is a sensitive scope", from: "docs", to: "tested", note: "Google's console filed it under sensitive scopes" },
  { claim: "GitHub OAuth app tokens are long-lived by default", from: "docs", to: "tested", note: "Corrected: token expiry is now on by default; our token lasted 8 hours with a 182-day refresh token" },
  { claim: "Slack tokens expire after 12 hours", from: "docs", to: "tested", note: "Only if you opt in to token rotation. Our bot and user tokens came back with no expiry and no refresh token" },
  { claim: "Notion's form asks for website, privacy policy, terms and support email", from: "community", to: "tested", note: "Corrected: creating an OAuth connection asked only for a name, auth method, installable-in and redirect URIs" },
  { claim: "Notion public connections may need review before other workspaces install", from: "unconfirmed", to: "tested", note: "No review: installable in any workspace from creation; our sign-in worked minutes later" },
  { claim: "Google Cloud click paths", from: "unconfirmed", to: "tested", note: "Walked live; Gmail scopes hidden until the Gmail API is enabled" },
] as const

export default function Evidence() {
  return (
    <div className="grid gap-6">
      <div className="grid max-w-3xl gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">How we check</h1>
        <p className="text-zinc-600">Every fact in a guide carries one of four labels. We try things ourselves where we can, cite official pages where we can't, and say plainly what we could not confirm.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        {([["tested", "We did it and recorded it"], ["docs", "An official provider page says so"], ["community", "Forums, vendors, other developers"], ["unconfirmed", "Best estimate, not confirmed"]] as const).map(([p, d]) => (
          <Card key={p}><CardHeader className="gap-2"><ProofBadge proof={p} /><CardDescription>{d}</CardDescription></CardHeader></Card>
        ))}
      </div>
      <Card>
        <CardHeader><CardTitle>Setup attempts</CardTitle><CardDescription>Real test apps on our own accounts, kept as proof.</CardDescription></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>When</TableHead><TableHead>App</TableHead><TableHead>What we tried</TableHead><TableHead>What happened</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {TESTS.map((t) => (
                <TableRow key={t.when + t.what}>
                  <TableCell className="whitespace-nowrap text-zinc-500">{t.when}</TableCell>
                  <TableCell className="font-medium">{t.app}</TableCell>
                  <TableCell>{t.what}</TableCell>
                  <TableCell className="text-zinc-600">{t.result}</TableCell>
                  <TableCell className={t.status === "Done" ? "text-emerald-700" : "text-zinc-500"}>{t.status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>What testing changed</CardTitle><CardDescription>Claims whose label moved after we tried them.</CardDescription></CardHeader>
        <CardContent className="grid gap-3">
          {CORRECTIONS.map((c) => (
            <div key={c.claim} className="flex flex-wrap items-center gap-2 rounded-md border bg-white p-3 text-sm">
              <span className="font-medium">{c.claim}</span>
              <span className="ml-auto flex items-center gap-1"><ProofBadge proof={c.from} /> → <ProofBadge proof={c.to} /></span>
              <span className="w-full text-zinc-600">{c.note}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
