import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

/**
 * The content data model. A Post is the atomic unit the whole platform is
 * built around. Editorial workflow lives in `status`: draft → review →
 * published. Only `published` posts are rendered to the live site.
 */
export type PostStatus = 'draft' | 'review' | 'published';

export interface PostMeta {
  title: string;
  slug: string;
  publishDate: string; // ISO 8601 (YYYY-MM-DD)
  tags: string[];
  status: PostStatus;
  excerpt: string;
}

export interface Post extends PostMeta {
  body: string; // markdown source
}

const CONTENT_DIR = path.join(process.cwd(), 'content');

function parseFile(filename: string): Post {
  const raw = fs.readFileSync(path.join(CONTENT_DIR, filename), 'utf8');
  const { data, content } = matter(raw);
  const slug = (data.slug as string) || filename.replace(/\.md$/, '');
  return {
    title: String(data.title ?? 'Untitled'),
    slug,
    publishDate: String(data.publishDate ?? ''),
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    status: (data.status as PostStatus) ?? 'draft',
    excerpt: String(data.excerpt ?? ''),
    body: content.trim(),
  };
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

/** Only published posts — this is what the live site shows. */
export function getPublishedPosts(): Post[] {
  return getAllPosts().filter((p) => p.status === 'published');
}

export function getPostBySlug(slug: string): Post | undefined {
  return getAllPosts().find((p) => p.slug === slug);
}
