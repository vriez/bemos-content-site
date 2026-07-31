---
title: "Scheduling test: this post published itself"
slug: "scheduled-publishing-is-live"
publishDate: "2026-08-01T09:00:00Z"
tags: ["announcement", "platform"]
status: "published"
excerpt: "A scheduled test post. It was committed ahead of time and went live on its own — no push, no deploy."
---

# This post scheduled itself

If you're reading this on the live site, the scheduling pipeline works. This
post was authored and committed **before** its publish time, marked
`status: published` with a **future** `publishDate`. It stayed invisible until
that moment passed — then the next automated rebuild put it live.

## What happened behind the scenes

- The post sat in the repo, `published` but **scheduled** for a future time.
- Every build compares `publishDate` against the current time (see `isLive`),
  so the post rendered to *nobody* until its moment arrived.
- A timed CI job rebuilds and redeploys production on a schedule. The first
  rebuild after the publish time swept this post live — **no human, no push,
  no code deploy.**

That's the whole promise of BEMA-4: author once, schedule, and let the
platform publish on time by itself.
