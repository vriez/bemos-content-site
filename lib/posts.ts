import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

/**
 * The content data model. A Post is the atomic unit the whole platform is
 * built around. Editorial workflow lives in `status`: draft → review →
 * published. A post goes LIVE only when it is `published` AND its
 * `publishDate` has arrived — that's how scheduling works (see `isLive`).
 */
export type PostStatus = 'draft' | 'review' | 'published';

export interface PostMeta {
  title: string;
  slug: string;
  publishDate: string; // ISO 8601 — date ("YYYY-MM-DD") or datetime with time
  tags: string[];
  status: PostStatus;
  excerpt: string;
}

export interface Post extends PostMeta {
  body: string; // markdown source
}

const CONTENT_DIR = path.join(process.cwd(), 'content');

/**
 * The reference "now" the build compares publish dates against. Normally the
 * real wall clock at build time — a scheduled post flips live on the first
 * rebuild after its date. `CONTENT_NOW` overrides it (ISO string) so we can
 * preview a future state or test scheduling deterministically.
 */
export function referenceNow(): Date {
  const override = process.env.CONTENT_NOW;
  if (override) {
    const d = new Date(override);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return new Date();
}

function parseFile(filename: string): Post {
  const raw = fs.readFileSync(path.join(CONTENT_DIR, filename), 'utf8');
  const { data, content } = matter(raw);
  const slug = (data.slug as string) || filename.replace(/\.md$/, '');
  // gray-matter turns a bare `YYYY-MM-DD` into a JS Date; normalize back to a
  // stable ISO string so downstream date math and formatting are predictable.
  const rawDate = data.publishDate;
  const publishDate =
    rawDate instanceof Date ? rawDate.toISOString() : String(rawDate ?? '');
  return {
    title: String(data.title ?? 'Untitled'),
    slug,
    publishDate,
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    status: (data.status as PostStatus) ?? 'draft',
    excerpt: String(data.excerpt ?? ''),
    body: content.trim(),
  };
}

/**
 * A post is LIVE (publicly visible) only when it is `published` and its
 * scheduled `publishDate` is at or before `now`. Future-dated published posts
 * are "scheduled" — they exist in the repo but stay invisible until their
 * moment arrives and the next rebuild picks them up.
 */
export function isLive(post: Post, now: Date = referenceNow()): boolean {
  if (post.status !== 'published') return false;
  if (!post.publishDate) return false;
  const when = new Date(post.publishDate);
  if (Number.isNaN(when.getTime())) return false;
  return when.getTime() <= now.getTime();
}

/** True for a published post whose publish time is still in the future. */
export function isScheduled(post: Post, now: Date = referenceNow()): boolean {
  return post.status === 'published' && !isLive(post, now);
}

/** All posts, newest first, regardless of status. */
export function getAllPosts(): Post[] {
  if (!fs.existsSync(CONTENT_DIR)) return [];
  return fs
    .readdirSync(CONTENT_DIR)
    .filter((f) => f.endsWith('.md'))
    .map(parseFile)
    .sort((a, b) => (a.publishDate < b.publishDate ? 1 : -1));
}

/**
 * The posts the live site renders: published AND past their scheduled date.
 * This is the single source of truth for public visibility.
 */
export function getLivePosts(now: Date = referenceNow()): Post[] {
  return getAllPosts().filter((p) => isLive(p, now));
}

/** Published posts still waiting for their scheduled date (for tooling/reports). */
export function getScheduledPosts(now: Date = referenceNow()): Post[] {
  return getAllPosts().filter((p) => isScheduled(p, now));
}

/**
 * Back-compat alias. "Published" now means "live" — published in state AND
 * past its scheduled date — so existing callers get correct scheduling for free.
 */
export function getPublishedPosts(): Post[] {
  return getLivePosts();
}

export function getPostBySlug(slug: string): Post | undefined {
  return getAllPosts().find((p) => p.slug === slug);
}
