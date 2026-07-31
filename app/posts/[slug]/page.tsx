import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getLivePosts, getPostBySlug, isLive } from '@/lib/posts';
import { renderMarkdown } from '@/lib/markdown';
import { articleJsonLd, buildPostMetadata } from '@/lib/seo';

/** Pre-render one static page per LIVE post at build time (published + past its schedule). */
export function generateStaticParams() {
  return getLivePosts().map((p) => ({ slug: p.slug }));
}

/**
 * SEO metadata is auto-generated from the post at build (= publish) time:
 * canonical URL, OpenGraph article tags, and a Twitter card. See `lib/seo.ts`.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return { title: 'Not found' };
  return buildPostMetadata(post);
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  // Guard: never serve a post that isn't live — not published, or still
  // waiting for its scheduled publish date — even by direct slug.
  if (!post || !isLive(post)) notFound();

  return (
    <article className="post">
      {/* Structured data for search rich-results — generated from the post. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd(post)) }}
      />
      <Link href="/" className="back-link">
        ← All posts
      </Link>
      <h1>{post.title}</h1>
      <p className="post-meta">
        {formatDate(post.publishDate)}
        {post.tags.length > 0 && ' · '}
        {post.tags.map((t) => (
          <span key={t} className="tag">
            {t}
          </span>
        ))}
      </p>
      <div dangerouslySetInnerHTML={{ __html: renderMarkdown(post.body) }} />
    </article>
  );
}

function formatDate(iso: string): string {
  if (!iso) return '';
  // Accept a bare date ("2026-07-31") or a full ISO datetime (scheduled posts).
  const d = new Date(iso.includes('T') ? iso : iso + 'T00:00:00Z');
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}
