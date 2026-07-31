/**
 * Reports the editorial state of the content library at "now":
 *   LIVE      — published and past its publishDate (renders to the site)
 *   SCHEDULED — published but publishDate is still in the future (waiting)
 *   DRAFT     — draft
 *   REVIEW    — in review
 *
 * Runs in CI on every scheduled-publish sweep so the Actions log shows exactly
 * what went live and what's still queued. Run locally with:
 *   node scripts/publish-status.mjs
 *   CONTENT_NOW=2026-08-01T12:00:00Z node scripts/publish-status.mjs   # preview a future state
 *
 * Kept dependency-light (only gray-matter, already a project dep) so it stays
 * runnable in a bare `npm ci` CI step without a TypeScript toolchain.
 */
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

const CONTENT_DIR = path.join(process.cwd(), 'content');
const now = process.env.CONTENT_NOW ? new Date(process.env.CONTENT_NOW) : new Date();
if (Number.isNaN(now.getTime())) {
  console.error(`Invalid CONTENT_NOW: ${process.env.CONTENT_NOW}`);
  process.exit(1);
}

function toIso(v) {
  if (v instanceof Date) return v.toISOString();
  return String(v ?? '');
}

function classify(post) {
  if (post.status !== 'published') return post.status === 'review' ? 'REVIEW' : 'DRAFT';
  const when = new Date(post.publishDate);
  if (Number.isNaN(when.getTime())) return 'DRAFT';
  return when.getTime() <= now.getTime() ? 'LIVE' : 'SCHEDULED';
}

const posts = fs.existsSync(CONTENT_DIR)
  ? fs
      .readdirSync(CONTENT_DIR)
      .filter((f) => f.endsWith('.md'))
      .map((f) => {
        const { data } = matter(fs.readFileSync(path.join(CONTENT_DIR, f), 'utf8'));
        return {
          file: f,
          title: String(data.title ?? 'Untitled'),
          status: String(data.status ?? 'draft'),
          publishDate: toIso(data.publishDate),
        };
      })
  : [];

console.log(`Content status @ ${now.toISOString()}`);
console.log('─'.repeat(64));
const counts = { LIVE: 0, SCHEDULED: 0, REVIEW: 0, DRAFT: 0 };
for (const p of posts.sort((a, b) => (a.publishDate < b.publishDate ? 1 : -1))) {
  const state = classify(p);
  counts[state] = (counts[state] ?? 0) + 1;
  console.log(`  ${state.padEnd(9)} ${p.publishDate.padEnd(26)} ${p.title}`);
}
console.log('─'.repeat(64));
console.log(
  `LIVE ${counts.LIVE} · SCHEDULED ${counts.SCHEDULED} · REVIEW ${counts.REVIEW} · DRAFT ${counts.DRAFT}`,
);
