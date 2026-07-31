import Link from 'next/link';
import { getPublishedPosts } from '@/lib/posts';

export default function HomePage() {
  const posts = getPublishedPosts();

  return (
    <>
      <section className="hero">
        <h1>The BemOS Plantoes Blog</h1>
        <p>Notes on what we&apos;re building as we scale a content business.</p>
      </section>

      <ul className="post-list">
        {posts.map((post) => (
          <li key={post.slug} className="post-card">
            <h2>
              <Link href={`/posts/${post.slug}/`}>{post.title}</Link>
            </h2>
            <p className="post-meta">
              {formatDate(post.publishDate)}
              {post.tags.length > 0 && ' · '}
              {post.tags.map((t) => (
                <span key={t} className="tag">
                  {t}
                </span>
              ))}
            </p>
            <p>{post.excerpt}</p>
          </li>
        ))}
        {posts.length === 0 && <p>No published posts yet.</p>}
      </ul>
    </>
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
