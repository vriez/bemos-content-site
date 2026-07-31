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
