# Multi-channel distribution & SEO automation

Every published post automatically produces search/social metadata and gets
pushed to external channels — no manual reposting. This is the BEMA-6 layer on
top of the publish-to-live foundation.

## What happens on publish

A post goes live via a push to `main` or the ~15-min **Scheduled Publish**
sweep. On that build, automatically:

1. **SEO metadata** is generated from the post (`lib/seo.ts`) into the page HTML:
   - `<title>`, meta description (clamped to ~160 chars)
   - canonical URL
   - **OpenGraph** article tags (title, description, url, published time, tags, image)
   - **Twitter** `summary_large_image` card
   - **JSON-LD** `BlogPosting` structured data for search rich-results
2. **Discovery + syndication artifacts** are written to the deployed site
   (`scripts/generate-feeds.mjs`):
   - `/feed.xml` (RSS 2.0) and `/atom.xml` — the pull-based distribution channel
   - `/sitemap.xml` + `/robots.txt` — search-engine crawl map
   - `/og-default.svg` — fallback social share image
3. **Outbound push** to an approved connector (`scripts/syndicate.mjs`): each
   newly-live post is POSTed once to an external channel, recorded in a ledger.

## Channels

### RSS / Atom (live now, zero secrets)

`https://vriez.github.io/bemos-content-site/feed.xml` is a real syndication
channel. Point any of these at it to fan a post out with no further work:

- **Email newsletter:** Mailchimp / Substack / Beehiiv "RSS-to-email" campaigns.
- **Social auto-posting:** Buffer / Zapier / Make "new item in RSS feed" triggers.
- **Readers & aggregators:** any feed reader.

It's advertised to tools via `<link rel="alternate" type="application/rss+xml">`
in the site `<head>`.

### Webhook push connector (needs a CEO-approved secret to go live)

`scripts/syndicate.mjs` POSTs a channel-agnostic payload to one webhook. It
works with any webhook-ingesting channel:

- a newsletter provider's inbound webhook,
- a Zapier/Make webhook → email or social,
- a Slack/Discord incoming webhook (team/community channel).

**Configuration** (GitHub → repo Settings → Secrets/Variables → Actions):

| Name | Kind | Purpose |
| --- | --- | --- |
| `SYNDICATION_WEBHOOK_URL` | secret | connector endpoint; **unset ⇒ safe dry-run** |
| `SYNDICATION_WEBHOOK_SECRET` | secret | optional; sent as `X-Webhook-Secret` |
| `SYNDICATION_CHANNEL` | variable | label recorded in the ledger (e.g. `slack`) |

**Payload** (`event: post.published`) carries `post.{title,slug,url,excerpt,tags,publishDate}`
plus a ready-to-post `text` string for chat/social connectors.

**Safe by default:** with no `SYNDICATION_WEBHOOK_URL`, the CI step **dry-runs** —
it logs the exact payload and writes nothing. Set the secret to a CEO-approved
connector and it starts sending for real.

**Exactly once:** `content/.syndicated.json` is a committed ledger of what has
been sent. The sweep only pushes posts not already in it, then commits the
ledger back to `main` — so a post is never reposted. That's the manual-toil
removal.

## Local usage

```bash
npm run build              # next build + generate feed.xml/sitemap/robots/og image into out/
npm run feeds              # regenerate just the feeds/sitemap (after a build)
npm run syndicate          # DRY-RUN: print the payload that would be pushed
npm run syndicate -- --all # preview payloads for every live post (backfill)

# Real send (what CI does when the secret is set):
SYNDICATION_WEBHOOK_URL=https://… SYNDICATION_CHANNEL=slack npm run syndicate
```

Use `CONTENT_NOW=<iso>` to preview a future publish state (same override the
scheduling logic uses).

## Going live checklist (CEO)

1. Decide the first push channel (recommended low-risk start: a Slack/Discord
   incoming webhook, or a Zapier/Make hook into the newsletter tool).
2. Provide the webhook URL (+ optional secret); it's stored as a repo secret.
3. Next scheduled sweep syndicates live posts and starts the ledger.

RSS-based fan-out (newsletter/social) needs no secret — just subscribe the tool
to `/feed.xml`.
