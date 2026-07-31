import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPublishedPosts, getPostBySlug } from '@/lib/posts';
import { renderMarkdown } from '@/lib/markdown';

/** Pre-render one static page per published post at build time. */
export function generateStaticParams() {
  return getPublishedPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  return {
    title: post ? `${post.title} · BemOS Plantoes` : 'Not found',
    description: post?.excerpt,
  };
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  // Guard: never serve a non-published post, even by direct slug.
  if (!post || post.status !== 'published') notFound();

  return (
    <article className="post">
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
  const d = new Date(iso + 'T00:00:00Z');
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}
