# Publishing workflow: authoring, review & scheduling

This is the operator's guide to BEMA-4 — how a post gets authored, reviewed,
scheduled, and auto-published **without a code deploy**.

## The three editorial states

Every post carries a `status` in its frontmatter:

| status      | meaning                          | visible on site? |
| ----------- | -------------------------------- | ---------------- |
| `draft`     | being written                    | no               |
| `review`    | ready for an editor's eyes       | no               |
| `published` | approved to go out               | **only once its `publishDate` has passed** |

`draft` and `review` never render publicly. `published` renders **only when its
scheduled time has arrived** — that's scheduling (below).

## Scheduling: publish in the future, automatically

Set `status: published` and a **future** `publishDate`. The post sits in the
repo, invisible, until that moment — then it goes live on its own.

```yaml
---
title: "My scheduled post"
slug: "my-scheduled-post"
publishDate: "2026-08-01T09:00:00Z"   # future time = scheduled
status: "published"
tags: ["announcement"]
excerpt: "One-line summary."
---
Body…
```

**How it publishes itself:** the site is a static build, so "now" is frozen at
build time. Every build compares each post's `publishDate` against the current
time (`isLive` in `lib/posts.ts`) and only renders posts whose time has passed.
The **Scheduled Publish** workflow (`.github/workflows/scheduled-publish.yml`)
rebuilds and redeploys production every ~15 minutes. The first rebuild after a
post's `publishDate` sweeps it live — **no push, no code deploy, no human.**

- Need it out *right now* instead of waiting for the next tick? Run the
  **Scheduled Publish** workflow manually (Actions tab → Run workflow), or just
  set `publishDate` to a past time and push.
- GitHub may delay scheduled runs a few minutes under load. Fine for editorial
  scheduling; don't rely on it for to-the-second timing.

Check what's live vs. queued at any time:

```bash
node scripts/publish-status.mjs                          # state right now
CONTENT_NOW=2026-08-01T12:00:00Z node scripts/publish-status.mjs   # preview a future moment
```

## Authoring without touching code — the Content Studio (`/admin`)

[Decap CMS](https://decapcms.org) is mounted at **`/admin/`** on the site
(e.g. `https://vriez.github.io/bemos-content-site/admin/`). Editors sign in with
GitHub and get a form-based editor: title, slug, status, publish date/time,
tags, excerpt, and a rich markdown body. Saving commits the markdown to
`content/` via the GitHub API; CI deploys. **No local setup, no code.**

The editor also has a **draft → in review → ready** board (Decap "editorial
workflow"), which pairs with the per-post `status`/`publishDate` above: use the
board to move a piece through review, then set `status: published` + a future
`publishDate` to schedule it.

### One-time setup (owner action — needs the CEO's GitHub account)

GitHub Pages can't run server code, so Decap's GitHub login needs a small hosted
**OAuth relay**. Until it's provisioned, `/admin/` loads but GitHub sign-in
won't complete. Two low-ops options:

1. **Hosted relay (recommended, ~free):** deploy the community
   [`decap-server`/`netlify-cms-oauth` relay](https://decapcms.org/docs/external-oauth-clients/)
   to Vercel/Cloudflare Workers, register a GitHub OAuth App, and set its URL as
   `base_url` in `public/admin/config.yml` (currently the placeholder
   `https://bemos-decap-oauth.example.com`).
2. **Local editing (works today, no OAuth):** run `npx decap-server` and open
   `/admin/` locally — `local_backend: true` is already set. Good for testing
   the authoring flow before the relay is live.

> **Owner / unblock:** registering the GitHub OAuth App and picking where the
> relay is hosted is a CEO decision (touches the GitHub org + a hosting account).
> Everything else — the CMS UI, fields, workflow, and the config — is done.
> Flag me once you've picked a host and I'll wire `base_url` and verify login.

## Recap: the BEMA-4 definition of done

- **Authored** without code: `/admin/` Content Studio commits markdown for you.
- **Scheduled:** future `publishDate` on a `published` post.
- **Auto-published without a deploy:** the timed Scheduled Publish workflow
  rebuilds prod and the post goes live on its own.
- **Demonstrated:** `content/scheduled-publishing-is-live.md` was committed
  scheduled; builds prove it's hidden before its time and live after.
