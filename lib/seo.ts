/**
 * SEO metadata generation — derives full search + social metadata from a Post,
 * automatically, at build time. Because the site is a static export, "build
 * time" IS publish time: when a post goes live (a push or the scheduled sweep),
 * its SEO metadata and OpenGraph/Twitter tags are produced without any manual
 * step. This is the "auto-generate SEO metadata on publish" deliverable.
 */
import type { Metadata } from 'next';
import type { Post } from './posts';
import { absoluteUrl, postUrl, site } from './site';

/** Clamp a description to a search-friendly length without cutting mid-word. */
export function seoDescription(text: string, max = 160): string {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > 40 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/** A concise, keyword-bearing <title> for a post. */
export function seoTitle(post: Post): string {
  return `${post.title} · ${site.name}`;
}

/**
 * Full Next.js Metadata for a post page: canonical URL, OpenGraph (article),
 * Twitter summary-large-image card, keywords from tags, and article dates.
 */
export function buildPostMetadata(post: Post): Metadata {
  const url = postUrl(post.slug);
  const description = seoDescription(post.excerpt);
  const image = absoluteUrl(site.ogImagePath);

  return {
    title: seoTitle(post),
    description,
    keywords: post.tags,
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      url,
      siteName: site.name,
      title: post.title,
      description,
      publishedTime: post.publishDate,
      tags: post.tags,
      images: [{ url: image, alt: post.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description,
      images: [image],
    },
  };
}

/**
 * schema.org Article JSON-LD for a post — the structured-data block search
 * engines use for rich results. Serialize into a <script type="application/ld+json">.
 */
export function articleJsonLd(post: Post): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: seoDescription(post.excerpt),
    datePublished: post.publishDate,
    dateModified: post.publishDate,
    url: postUrl(post.slug),
    mainEntityOfPage: postUrl(post.slug),
    keywords: post.tags.join(', '),
    image: absoluteUrl(site.ogImagePath),
    author: { '@type': 'Organization', name: site.name },
    publisher: { '@type': 'Organization', name: site.name },
  };
}
