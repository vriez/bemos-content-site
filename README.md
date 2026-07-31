# BemOS Plantoes — Content Platform

The publish-to-live foundation for the BemOS Plantoes content business. Write a
post as markdown, push it, and it deploys automatically.

## Live

- **Production:** https://vriez.github.io/bemos-content-site/ (auto-deploys from `main`)
- **Staging:** https://vriez.github.io/bemos-content-site/staging/ (auto-deploys from `staging`)

## Stack

- **Next.js** (App Router) with static export (`output: 'export'`) — portable to any managed host.
- **Content model:** markdown files in `content/` with frontmatter. See `lib/posts.ts`.
- **CI/CD:** GitHub Actions (`.github/workflows/deploy.yml`) → GitHub Pages.

## The content model

Each post is a markdown file in `content/` with frontmatter:

```yaml
---
title: "Post title"
slug: "post-slug"
publishDate: "2026-07-31"   # ISO date
tags: ["announcement"]
status: "published"          # draft | review | published
excerpt: "One-line summary."
---
Body in markdown…
```

Editorial workflow lives in `status`: **draft → review → published**. Only
`published` posts render to the live site — and only once their `publishDate`
has passed, which is how **scheduling** works. Work-in-progress stays private.

## Authoring, scheduling & auto-publish

The full operator guide is **[docs/CMS.md](docs/CMS.md)**. In short:

- **Author without code:** the **Content Studio** at `/admin/` (Decap CMS) lets
  an editor create/edit posts in a browser; it commits markdown for you.
  (One-time OAuth setup — see docs.)
- **Schedule:** set `status: published` with a **future** `publishDate`. The
  post stays hidden until then.
- **Auto-publish:** the timed **Scheduled Publish** workflow rebuilds production
  every ~15 min, so a scheduled post goes live on its own — no push, no deploy.
- **See what's live vs. queued:** `npm run status`.

## Analytics & the CEO dashboard

Every piece of content is tied to its performance. See the live dashboard at
**`/dashboard/`** ([production](https://vriez.github.io/bemos-content-site/dashboard/)):
top content, per-post views, traffic sources, engagement, and a 14-day trend.

- **Tracker** (`app/analytics-tracker.tsx`): a privacy-friendly client script
  (no cookies, no PII) mounted site-wide. Per view it attributes a traffic
  **source** (referrer + UTM) and measures **engagement** (max scroll depth +
  active dwell time), then beacons one event to a collector.
- **Data model** (`lib/analytics/schema.ts`): `AnalyticsEvent` → aggregated
  into `AnalyticsSnapshot` (`totals`, per-post `PostPerformance`, `sourceBreakdown`,
  `trend`). The join key to editorial is `contentId` (the post `slug`).
- **Dashboard** (`app/dashboard/page.tsx`): reads a snapshot and renders it.
  New posts appear automatically — nothing to wire per post.

### Connecting real traffic (one decision, needs a collector)

The dashboard ships **seed data** derived from live content so it's populated
on day one (clearly badged "Sample data"). To show real numbers, point the
tracker at an ingestion endpoint and feed the dashboard a real snapshot:

```bash
# Where the tracker sends events (a serverless fn, GoatCounter, Plausible, …)
NEXT_PUBLIC_ANALYTICS_ENDPOINT="https://<collector>/collect"
```

The tracker and dashboard are vendor-neutral: swap the collector without
touching either. Recommended zero-cost path: **GoatCounter** (free, privacy-
friendly, JSON API). Choosing/creating the collector account is the one step
that needs CEO sign-off — flagged on BEMA-5.

## Distribution & SEO (multi-channel reach)

Every published post automatically gets **SEO metadata** (canonical, OpenGraph,
Twitter card, JSON-LD) and is **syndicated** to external channels — no manual
reposting. Full guide: **[docs/DISTRIBUTION.md](docs/DISTRIBUTION.md)**.

- **RSS/Atom feed** at `/feed.xml` — a live, zero-secret channel newsletter tools
  (Mailchimp/Substack RSS-to-email) and social auto-posters (Buffer/Zapier)
  subscribe to. Plus `/sitemap.xml` + `/robots.txt` for search.
- **Webhook push** (`scripts/syndicate.mjs`): on each publish sweep, every
  newly-live post is POSTed once to a CEO-approved connector (Slack/Discord/
  Zapier/newsletter). A committed ledger (`content/.syndicated.json`) guarantees
  exactly-once. **Safe by default:** with no `SYNDICATION_WEBHOOK_URL` secret it
  **dry-runs** (logs the payload, sends nothing) — try it with `npm run syndicate`.

## Publishing a post (by hand)

1. Add/edit a `.md` file in `content/` (set `status: published`).
2. Commit to `staging` to preview, then merge to `main` to go live.
3. CI builds and deploys automatically — no manual steps.

## Local development

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # static export to ./out
```

## Environments

| Environment | Branch    | URL                                              |
| ----------- | --------- | ------------------------------------------------ |
| Production  | `main`    | https://vriez.github.io/bemos-content-site/         |
| Staging     | `staging` | https://vriez.github.io/bemos-content-site/staging/ |
