/**
 * Outbound syndication — the "push to an external channel on publish" half of
 * multi-channel distribution. On every publish sweep this finds posts that are
 * now LIVE but have never been syndicated, and POSTs each to an approved
 * connector webhook. A committed ledger (content/.syndicated.json) records what
 * has already gone out, so each post is pushed exactly once — this is what
 * removes the manual reposting toil.
 *
 * CONNECTOR MODEL (account-linked/paid integrations need CEO sign-off):
 *   SYNDICATION_WEBHOOK_URL   the connector endpoint. Works with any webhook-
 *                             ingesting channel the CEO approves, e.g.:
 *                               • a newsletter provider's RSS/webhook trigger
 *                               • Zapier / Make webhook → email or social
 *                               • a Slack/Discord incoming webhook (chat channel)
 *   SYNDICATION_WEBHOOK_SECRET  optional; sent as `X-Webhook-Secret` header.
 *   SYNDICATION_CHANNEL         label recorded in the ledger (default: "webhook").
 *
 * SAFE BY DEFAULT: with no SYNDICATION_WEBHOOK_URL set, the script runs in
 * DRY-RUN — it prints the exact JSON payload it *would* send and does NOT write
 * the ledger, so the end-to-end flow is demonstrable before any secret or paid
 * connector is wired. Force it with `--dry-run`; force a real send by setting
 * the URL. `--all` re-sends every live post (ignores the ledger) for backfills.
 *
 * Usage:
 *   node scripts/syndicate.mjs                 # dry-run unless URL is set
 *   SYNDICATION_WEBHOOK_URL=https://… node scripts/syndicate.mjs
 *   node scripts/syndicate.mjs --dry-run       # never sends, never writes ledger
 *   node scripts/syndicate.mjs --all --dry-run # preview payloads for all posts
 */
import fs from 'node:fs';
import path from 'node:path';
import { getLivePosts, postUrl, referenceNow, site } from './lib-content.mjs';

const LEDGER_PATH = path.join(process.cwd(), 'content', '.syndicated.json');
const argv = new Set(process.argv.slice(2));
const webhookUrl = process.env.SYNDICATION_WEBHOOK_URL || '';
const dryRun = argv.has('--dry-run') || !webhookUrl;
const resendAll = argv.has('--all');
const channel = process.env.SYNDICATION_CHANNEL || 'webhook';

function loadLedger() {
  try {
    const raw = JSON.parse(fs.readFileSync(LEDGER_PATH, 'utf8'));
    return { sent: raw.sent && typeof raw.sent === 'object' ? raw.sent : {} };
  } catch {
    return { sent: {} };
  }
}

/** The message we hand the connector. Channel-agnostic; the connector maps it. */
function buildPayload(post) {
  const url = postUrl(post.slug);
  return {
    event: 'post.published',
    channel,
    site: site.name,
    post: {
      title: post.title,
      slug: post.slug,
      url,
      excerpt: post.excerpt,
      tags: post.tags,
      publishDate: post.publishDate,
    },
    // Ready-to-post text for chat/social connectors that want a single string.
    text: `📣 New post: ${post.title}\n${post.excerpt}\n${url}`,
  };
}

async function send(post) {
  const payload = buildPayload(post);
  if (dryRun) {
    console.log(`  DRY-RUN would POST → ${webhookUrl || '(no SYNDICATION_WEBHOOK_URL set)'}`);
    console.log(
      JSON.stringify(payload, null, 2)
        .split('\n')
        .map((l) => `    ${l}`)
        .join('\n'),
    );
    return true;
  }
  const headers = { 'Content-Type': 'application/json' };
  if (process.env.SYNDICATION_WEBHOOK_SECRET) {
    headers['X-Webhook-Secret'] = process.env.SYNDICATION_WEBHOOK_SECRET;
  }
  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`connector responded ${res.status} ${res.statusText}: ${body.slice(0, 300)}`);
  }
  console.log(`  ✓ syndicated "${post.title}" → ${channel} (${res.status})`);
  return true;
}

async function main() {
  const now = referenceNow();
  const live = getLivePosts(now);
  const ledger = loadLedger();

  const pending = resendAll ? live : live.filter((p) => !ledger.sent[p.slug]);

  console.log(`Syndication @ ${now.toISOString()}`);
  console.log(`  channel=${channel}  mode=${dryRun ? 'DRY-RUN' : 'LIVE'}  live=${live.length}  pending=${pending.length}`);
  console.log('─'.repeat(64));

  if (pending.length === 0) {
    console.log('  Nothing new to syndicate. ✓');
    return;
  }

  let failures = 0;
  for (const post of pending) {
    try {
      await send(post);
      if (!dryRun) {
        ledger.sent[post.slug] = { channel, url: postUrl(post.slug), at: now.toISOString() };
      }
    } catch (err) {
      failures += 1;
      console.error(`  ✗ failed "${post.title}": ${err.message}`);
    }
  }

  // Persist the ledger only on a real send, so re-running dry-run never marks
  // posts as sent. A changed ledger is committed back by CI (see workflow).
  if (!dryRun) {
    fs.writeFileSync(LEDGER_PATH, `${JSON.stringify(ledger, null, 2)}\n`);
    console.log('─'.repeat(64));
    console.log(`  Ledger updated: ${path.relative(process.cwd(), LEDGER_PATH)}`);
  } else {
    console.log('─'.repeat(64));
    console.log('  DRY-RUN — no requests sent, ledger not written.');
    console.log('  Set SYNDICATION_WEBHOOK_URL (CEO-approved connector) to go live.');
  }

  if (failures > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
