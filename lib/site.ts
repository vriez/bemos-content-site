/**
 * Canonical site identity — the single source of truth for absolute URLs used
 * by SEO metadata, the RSS/Atom feed, the sitemap, and outbound syndication.
 *
 * The public site can live at a domain root (Vercel: origin only) or under a
 * project subpath (GitHub Pages: origin + "/bemos-content-site"). Both are
 * driven by env so the SAME build produces correct absolute links everywhere:
 *   NEXT_PUBLIC_SITE_ORIGIN  — scheme + host, no trailing slash (default: Pages)
 *   NEXT_PUBLIC_BASE_PATH    — subpath the app is served under (default: "")
 */
const ORIGIN = (
  process.env.NEXT_PUBLIC_SITE_ORIGIN || 'https://vriez.github.io'
).replace(/\/+$/, '');

const BASE_PATH = (process.env.NEXT_PUBLIC_BASE_PATH || '').replace(/\/+$/, '');

export const site = {
  name: 'BemOS Plantoes',
  title: 'BemOS Plantoes',
  description:
    'Notes on what we’re building as we scale a content business — from the BemOS Plantoes team.',
  locale: 'en_US',
  origin: ORIGIN,
  basePath: BASE_PATH,
  /** Where the site actually lives: origin + basePath (no trailing slash). */
  baseUrl: `${ORIGIN}${BASE_PATH}`,
  /** Default social share image (absolute). Swap for a branded asset later. */
  ogImagePath: '/og-default.svg',
} as const;

/**
 * Turn an app-relative path ("/posts/foo/") into a fully-qualified URL under
 * the current environment's origin + basePath. Idempotent for absolute inputs.
 */
export function absoluteUrl(pathname: string): string {
  if (/^https?:\/\//i.test(pathname)) return pathname;
  const clean = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return `${site.baseUrl}${clean}`;
}

/** Canonical, trailing-slashed URL for a post slug (matches `trailingSlash`). */
export function postUrl(slug: string): string {
  return absoluteUrl(`/posts/${slug}/`);
}
