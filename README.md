# OAuth Launch Planner

**Live:** https://oauth-launch-planner.vercel.app · **Source:** https://github.com/Uplof/oauth-launch-planner

A developer building an AI agent wants it to act in their users' Gmail, Slack or Notion. The code takes an afternoon. Getting the provider to let real users connect can take a day, a few weeks, or a yearly security audit, and nobody tells you which before you start. This site answers that first.

**What you get:** describe your agent (or pick an app) and see, for each app, the total time to your first real user and how it splits into your work and the review wait. Then a day-by-day timeline, the steps (each marked *you*, *an agent can do this*, or *wait for the provider*), where people get stuck, and which permissions trigger which review. On top of that: a check of your website the way a reviewer would look at it, and a real test sign-in. **20 guides are ready.** For any other app, a research agent writes a guide live and saves it with a shareable link.

## Scope, and why

I focused on the part developers can't see coming: **approval**, not the OAuth code. Three things decide the timeline, and the docs scatter them across many pages:

1. **Permissions decide difficulty, not the app.** Gmail send-only is a review of a few business days. Gmail read adds a yearly security audit.
2. **One slow step decides the launch date**, so it has to start on day one.
3. **Test mode has limits that bite.** Google allows 100 test users ever, and refresh tokens die after 7 days.

## Key decisions

- **Total time first, then the breakdown.** The first question is "can I launch this month?".
- **Describe your product, not pick scopes.** People think in features; the planner maps features to apps and permissions.
- **A proof label on every claim:** *tested* (I did it), *official docs* (linked), *community*, or *not confirmed*. Provider rules change, so you need to see what is proven.
- **Test the real path myself.** I registered my own test apps on Google, GitHub, Slack and Notion, signed in through each, and kept every app and screenshot.
- **Agents do the legwork, with guard rails.** Research agents wrote the 16 researched guides from official docs. A checker reopens each source. A script rejects any researched claim marked *tested*. Live research must find the exact app or stop.

## How my thinking changed

| I first thought | It turned out |
|---|---|
| The hard part is the setup steps. | Setup is minutes to hours. The **review** decides the date, and it depends on which permissions you ask for. |
| Each app has one difficulty. | Gmail is easy or very hard depending on a single permission. So the guide lets you untick features and watch the review get lighter. |
| Provider docs are reliable enough. | Testing corrected 3 claims. GitHub tokens now expire by default. Slack tokens never expire unless you opt in. Notion's form asked for none of the fields third-party guides listed. |
| One AI research pass is enough. | It drifted. Asked for "uplof.me", it researched a different product (Upland) and saved it. Now the agent must say "not found", and a name check stops look-alikes before saving. |
| More detail makes a better guide. | Readers wanted the answer first. I cut the copy to plain words and put total time, timeline and steps at the top. |

## What I checked

- **Tested by hand (4 apps):** Gmail, GitHub, Slack and Notion. I created the app, signed in through my own site, and recorded the permissions granted and the token lifetimes. The evidence page lists every test and correction: https://oauth-launch-planner.vercel.app/evidence
- **Researched (16 apps):** official docs first, every claim labelled, anything not confirmed listed per guide.
- **Live research runs:** Calendly, HighLevel, Canvas, Zoom and Trello. For Zoom, the checker downgraded all 4 key claims because their pages didn't support them.

## Limitations

- Only 4 of 20 guides are hands-on tested. LinkedIn and X would need partner approval or a paid tier to test.
- Review times are what providers publish, not measured. Timelines are planning estimates built from each guide's own step times.
- Live research runs on free AI tiers (Groq, then Gemini as backup). A new app takes 1–5 minutes. Each visitor gets 3 new runs a day, and saved guides are always free. If the free AI is slow, the fact check is skipped and the guide says so.
- The website check reads public pages. It can't judge whether a privacy policy is legally enough.

## Run it locally

```bash
npm install
npx vercel link && npx vercel env pull .env.local
npx vercel dev
```

Set one AI key: `GROQ_API_KEY` (free), with `GEMINI_API_KEY` as backup, or `ANTHROPIC_API_KEY`. `BLOB_READ_WRITE_TOKEN` saves researched guides. The test sign-ins need `client_id`/`client_secret` (Google), `github_secret`, `slack_secret`, and `notion_client_id`/`notion_secret`. No secrets are in the repo.

**Stack:** Vite, React, TypeScript, Tailwind and shadcn/ui on Vercel. Server functions are in `api/`. Guides are in `src/data/guides/*.json`, plus Vercel Blob for live research. Coding agents can fetch any plan as JSON (`/api/plan`) or over MCP (`/api/mcp`).
