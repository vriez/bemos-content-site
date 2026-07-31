/**
 * Post-build: emit the syndication + discovery artifacts into ./out so they
 * ship with every deploy. Because the build runs on every publish (push or the
 * scheduled sweep), these regenerate automatically the moment content goes live
 * — no manual step:
 *
 *   out/feed.xml     RSS 2.0  — the pull-based distribution channel. Newsletter
 *                              tools (Mailchimp RSS-to-email), social auto-
 *                              posters (Buffer/Zapier) and readers subscribe here.
 *   out/atom.xml     Atom 1.0 — same content, Atom-consuming clients.
 *   out/sitemap.xml  Search-engine crawl map of every live URL.
 *   out/robots.txt   Points crawlers at the sitemap.
 *   out/og-default.svg  Fallback social share image referenced by OG/Twitter tags.
 *
 * Run standalone with:  node scripts/generate-feeds.mjs   (after `next build`)
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  absoluteUrl,
  getLivePosts,
  postUrl,
  referenceNow,
  site,
  xmlEscape,
} from './lib-content.mjs';

const OUT_DIR = path.join(process.cwd(), 'out');
if (!fs.existsSync(OUT_DIR)) {
  console.error(`✗ ${OUT_DIR} not found — run \`next build\` first.`);
  process.exit(1);
}

const now = referenceNow();
const posts = getLivePosts(now);
const homeUrl = absoluteUrl('/');
const feedUrl = absoluteUrl('/feed.xml');
const rfc822 = (iso) => new Date(iso || now).toUTCString();
const rfc3339 = (iso) => new Date(iso || now).toISOString();

// ── RSS 2.0 ────────────────────────────────────────────────────────────────
const rssItems = posts
  .map((p) => {
    const url = postUrl(p.slug);
    return `    <item>
      <title>${xmlEscape(p.title)}</title>
      <link>${xmlEscape(url)}</link>
      <guid isPermaLink="true">${xmlEscape(url)}</guid>
      <pubDate>${rfc822(p.publishDate)}</pubDate>
      <description>${xmlEscape(p.excerpt)}</description>
${p.tags.map((t) => `      <category>${xmlEscape(t)}</category>`).join('\n')}
    </item>`;
  })
  .join('\n');

const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${xmlEscape(site.name)}</title>
    <link>${xmlEscape(homeUrl)}</link>
    <atom:link href="${xmlEscape(feedUrl)}" rel="self" type="application/rss+xml"/>
    <description>${xmlEscape(site.description)}</description>
    <language>en-us</language>
    <lastBuildDate>${rfc822(posts[0]?.publishDate)}</lastBuildDate>
${rssItems}
  </channel>
</rss>
`;

// ── Atom 1.0 ─────────────────────────────────────────────────────────────────
const atomEntries = posts
  .map((p) => {
    const url = postUrl(p.slug);
    return `  <entry>
    <title>${xmlEscape(p.title)}</title>
    <link href="${xmlEscape(url)}"/>
    <id>${xmlEscape(url)}</id>
    <updated>${rfc3339(p.publishDate)}</updated>
    <summary>${xmlEscape(p.excerpt)}</summary>
${p.tags.map((t) => `    <category term="${xmlEscape(t)}"/>`).join('\n')}
  </entry>`;
  })
  .join('\n');

const atom = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${xmlEscape(site.name)}</title>
  <link href="${xmlEscape(homeUrl)}"/>
  <link href="${xmlEscape(absoluteUrl('/atom.xml'))}" rel="self"/>
  <id>${xmlEscape(homeUrl)}</id>
  <updated>${rfc3339(posts[0]?.publishDate)}</updated>
  <subtitle>${xmlEscape(site.description)}</subtitle>
${atomEntries}
</feed>
`;

// ── sitemap.xml ──────────────────────────────────────────────────────────────
const urls = [
  { loc: homeUrl, lastmod: posts[0]?.publishDate },
  ...posts.map((p) => ({ loc: postUrl(p.slug), lastmod: p.publishDate })),
];
const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) =>
      `  <url><loc>${xmlEscape(u.loc)}</loc><lastmod>${rfc3339(u.lastmod)}</lastmod></url>`,
  )
  .join('\n')}
</urlset>
`;

// ── robots.txt ───────────────────────────────────────────────────────────────
const robots = `User-agent: *
Allow: /
Sitemap: ${absoluteUrl('/sitemap.xml')}
`;

// ── default OG image (SVG, no binary deps) ───────────────────────────────────
const ogImage = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#0b0f14"/>
  <rect x="0" y="0" width="1200" height="8" fill="#4f9cf9"/>
  <text x="80" y="300" fill="#ffffff" font-family="Georgia, serif" font-size="76" font-weight="700">Bem<tspan fill="#4f9cf9">OS</tspan> Plantoes</text>
  <text x="80" y="380" fill="#9fb3c8" font-family="system-ui, sans-serif" font-size="34">Scaling a content business, in public.</text>
</svg>
`;

const writes = [
  ['feed.xml', rss],
  ['rss.xml', rss], // common alias some tools expect
  ['atom.xml', atom],
  ['sitemap.xml', sitemapXml],
  ['robots.txt', robots],
  ['og-default.svg', ogImage],
];

for (const [name, contents] of writes) {
  fs.writeFileSync(path.join(OUT_DIR, name), contents);
}

console.log(`✓ Generated distribution artifacts for ${posts.length} live post(s):`);
for (const [name] of writes) console.log(`  out/${name}`);
console.log(`  feed self-URL: ${feedUrl}`);
