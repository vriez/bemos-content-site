/**
 * Shared, dependency-light content helpers for the CI/CD scripts (feed +
 * sitemap generation, outbound syndication). Mirrors the visibility rules in
 * `lib/posts.ts` (isLive) and the URL rules in `lib/site.ts` so the scripts
 * agree with what the site actually renders — without a TypeScript toolchain.
 */
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

const CONTENT_DIR = path.join(process.cwd(), 'content');

const ORIGIN = (process.env.NEXT_PUBLIC_SITE_ORIGIN || 'https://vriez.github.io').replace(/\/+$/, '');
const BASE_PATH = (process.env.NEXT_PUBLIC_BASE_PATH || '').replace(/\/+$/, '');

export const site = {
  name: 'BemOS Plantoes',
  description:
    'Notes on what we’re building as we scale a content business — from the BemOS Plantoes team.',
  origin: ORIGIN,
  basePath: BASE_PATH,
  baseUrl: `${ORIGIN}${BASE_PATH}`,
  ogImagePath: '/og-default.svg',
};

export function absoluteUrl(pathname) {
  if (/^https?:\/\//i.test(pathname)) return pathname;
  const clean = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return `${site.baseUrl}${clean}`;
}

export function postUrl(slug) {
  return absoluteUrl(`/posts/${slug}/`);
}

export function referenceNow() {
  if (process.env.CONTENT_NOW) {
    const d = new Date(process.env.CONTENT_NOW);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return new Date();
}

function toIso(v) {
  if (v instanceof Date) return v.toISOString();
  return String(v ?? '');
}

/** Parse every markdown file in content/ into a normalized post object. */
export function getAllPosts() {
  if (!fs.existsSync(CONTENT_DIR)) return [];
  return fs
    .readdirSync(CONTENT_DIR)
    .filter((f) => f.endsWith('.md'))
    .map((f) => {
      const { data, content } = matter(fs.readFileSync(path.join(CONTENT_DIR, f), 'utf8'));
      return {
        file: f,
        title: String(data.title ?? 'Untitled'),
        slug: String(data.slug ?? f.replace(/\.md$/, '')),
        publishDate: toIso(data.publishDate),
        tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
        status: String(data.status ?? 'draft'),
        excerpt: String(data.excerpt ?? ''),
        body: content.trim(),
      };
    })
    .sort((a, b) => (a.publishDate < b.publishDate ? 1 : -1));
}

/** A post is LIVE when published AND its publishDate is at/after now. */
export function isLive(post, now = referenceNow()) {
  if (post.status !== 'published' || !post.publishDate) return false;
  const when = new Date(post.publishDate);
  if (Number.isNaN(when.getTime())) return false;
  return when.getTime() <= now.getTime();
}

/** The posts the public site renders — the syndication + feed universe. */
export function getLivePosts(now = referenceNow()) {
  return getAllPosts().filter((p) => isLive(p, now));
}

/** XML-escape a text node / attribute value. */
export function xmlEscape(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
