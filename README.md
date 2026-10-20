# OAuth Launch Planner

**Live:** https://oauth-launch-planner.vercel.app
**Source:** https://github.com/Satyamknown/oauth-launch-planner

A developer building an AI agent wants it to act in their users' Gmail, GitHub, Slack or Notion. The code takes an afternoon. Getting the provider to let real users connect can take a week, three months, or never, and nobody tells you which before you start.

This tool answers that question first. Describe your product (or name one app) and you get:

- **A verdict:** how hard approval is, how long until real users can connect, and whether a review stands in the way.
- **A launch plan:** the slowest step first, every step marked *agent does this*, *you do this* or *wait for the provider*.
- **The permissions your agent needs**, and the review level each one triggers. Untick "read email" and watch a 10-week security audit drop to a 2-week review.
- **Blockers and fixes**, **paperwork drafts** (scope justifications, form values, demo video script), a **readiness check** of your website the way a reviewer would look at it, a **test sign-in**, and the **evidence**.
- **A proof label on every claim:** *tested* (we did it), *official docs* (linked), *community* (forum or blog), or *not confirmed*.

For an app without a guide, a **live research agent** searches the provider's docs, writes the guide, fact-checks the key claims against their source pages, and saves it with a shareable link.

## The problem, in the developer's words

A typical story: *"I built the Gmail integration in a day. Then Google said my app needs verification, and the `gmail.readonly` scope needs a security assessment. Nobody told me that before I picked the scope."*

The pain is not the OAuth code. It is three things the provider docs spread across a dozen pages:

1. **Which permissions trigger which review.** Gmail send-only is a scope review of about 3–5 business days. Gmail read is a restricted scope: yearly third-party security audit.
2. **How long each step takes**, and which step is slow enough to start on day one.
3. **What blocks you in the meantime.** Google testing mode caps you at 100 users over the app's lifetime, and refresh tokens die after 7 days.

## Key decisions

| Decision | Why |
|---|---|
| Entry is "describe your product", not a list of apps | Developers think in product features ("reads support emails, logs tickets"), not in OAuth scopes. The planner maps features to apps, actions and permissions. |
| Verdict first | The first question is "can I launch this month?". Everything else is detail under it. |
| Actions decide difficulty, not the app | Gmail is easy or very hard depending on one scope. The permissions picker makes that visible and lets you trade a feature for weeks. |
| Proof label on every line | Provider rules change. A guide is only useful if you can see which parts were tried, which are cited, and which are guesses. |
| Six deep guides, one per kind of path | GitHub (instant), Slack (self-serve, optional marketplace review), Notion (public integration), Gmail (security review), LinkedIn (approved partners only), X (paid access tiers). Together they cover the shapes most providers take. |
| Real setup attempts, kept | Gmail and GitHub test apps were created and signed in through, every step screenshotted. The apps are kept as proof. |
| A checker after the writer | The research agent's first draft is a claim, not a fact. A second pass reopens each source and downgrades what it cannot confirm. |
| Built for coding agents too | Every guide is JSON at `/api/plan`, and an MCP endpoint at `/api/mcp` lets Claude Code or Cursor fetch a plan inside the editor. |

## What we checked

**Hands-on (tested):**

- **Gmail, own Google OAuth app.**
  - `gmail.send` is filed as sensitive and `gmail.readonly` as restricted.
  - Testing mode needs no verification and allows 100 users over the app's lifetime.
  - Our sign-in got a refresh token that expires in 604,799 s (7 days).
  - A non-test user is blocked with `Error 403: access_denied` before any consent screen.
- **GitHub, own OAuth app.**
  - Registered in about a minute with no review; the client ID shows at once.
  - Our sign-in got an 8-hour access token and a 182-day refresh token.
  - The consent screen shows users the app's age and user count.

**What testing corrected:** the research said GitHub OAuth tokens are long-lived by default. Testing showed token expiry is now on by default. The guide and the evidence page record the correction.

**Live research runs (20 Oct):**

| App | Time | Result |
|---|---|---|
| Calendly | 75 s | Guide saved |
| HighLevel | 92 s | 10 official sources; checker confirmed 4 of 4 key claims |
| Canvas | 122 s | Rated *gated* (an admin must issue your key); checker skipped (free AI allowance ran out), page says so |
| Zoom | – | Checker downgraded all 4 key claims to *not confirmed*: their cited pages did not support them |

The evidence page (`/evidence`) lists every test, timing and correction.

## Limits

- **Two of six guides are hands-on tested** (Gmail, GitHub). Slack and Notion are next; LinkedIn and X stay docs-only (partner and paid access).
- **Review times are what providers publish**, not measured. Real waits vary.
- **Live research runs on free AI tiers** (Groq, with Gemini as backup). A run uses roughly 150–200K tokens across its searches, so the free daily allowance covers only a handful of new runs; saved guides cost nothing. Each visitor gets 3 new research runs a day; saved and library guides are always free.
- **The readiness check reads your public pages**; it cannot judge branding or whether your privacy policy is legally sufficient.
- **Generated guides are first drafts.** They carry their proof labels and a banner, and say whether the fact check ran.

## Roadmap

1. **Measured approval times.** Record when an app is registered and when its first non-test user connects. Real waits replace published ones.
2. **Developer reports.** "It took 9 days" / "rejected because…", stored per provider and scope.
3. **Weekly re-check.** Re-run the checker on every saved guide and alert developers when a provider changes its rules.
4. **The guide at the moment of pain.** Show it inside the screen where developers paste a client ID and secret.
5. **Paperwork help.** Fill provider forms through the browser and draft the security-assessment answers.

**Success measures:** time from first visit to first real-user connection; share of developers who reach production; OAuth-related support tickets per new integration.

## How it works

```
Browser (React)  ──>  /api/plan-from-description   features → apps, actions, permissions
                 ──>  /api/guide, /api/plan        saved guides (bundled + Vercel Blob)
                 ──>  /api/research  (SSE)         search ×2 → write → wait → check → save
                 ──>  /api/readiness               fetches your site like a reviewer
                 ──>  /oauth/start, /oauth/github  real test sign-ins (tokens never shown)
Coding agents    ──>  /api/mcp                     list_guides, get_oauth_plan, check_readiness, research_app
```

- **Frontend:** Vite, React, TypeScript, Tailwind, shadcn/ui.
- **Server:** Vercel Node functions in `api/`.
- **Guides:** `src/data/guides/*.json` (bundled) and Vercel Blob (researched).
- **AI:** Groq `gpt-oss` with built-in browser search, falling back to Gemini with Google Search grounding. If `ANTHROPIC_API_KEY` is set, Claude with web search and web fetch is used instead.

The architecture page (`/architecture`) maps every piece.

## Run it locally

```bash
npm install
npx vercel link                # or create .env.local yourself
npx vercel env pull .env.local
npx vercel dev                 # site + api on http://localhost:3000
```

Environment variables (all optional except one AI key for live research):

| Name | Used for |
|---|---|
| `GROQ_API_KEY` (or `groq`) | Live research and the planner, free tier |
| `GEMINI_API_KEY` | Backup AI when Groq's daily allowance runs out |
| `ANTHROPIC_API_KEY` | Uses Claude instead of the free tiers |
| `BLOB_READ_WRITE_TOKEN` | Saves researched guides and visitor run counts |
| `RESEARCH_RUNS_PER_DAY` | Per-visitor cap on new research runs (default 3) |
| `client_id`, `client_secret` | Google test sign-in |
| `github_secret` | GitHub test sign-in |

Deploy: `npx vercel deploy --prod`.
