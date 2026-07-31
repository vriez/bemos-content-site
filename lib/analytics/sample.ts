/**
 * Deterministic seed analytics snapshot.
 *
 * Until a live collector is wired to `NEXT_PUBLIC_ANALYTICS_ENDPOINT`, the
 * dashboard renders this seed so the CEO has a working, populated view on day
 * one. It is generated from the REAL content in `content/` (via `lib/posts.ts`),
 * so every post the team publishes automatically appears here with plausible
 * numbers. Everything is derived from a seeded PRNG keyed off each slug, so the
 * output is stable across builds (no `Math.random`, no wall-clock) — the same
 * commit always produces the same snapshot.
 *
 * This is clearly flagged `isSample: true`. Swap it for real data by pointing
 * the dashboard at a collector that publishes an `AnalyticsSnapshot` JSON.
 */
import { getAllPosts } from '@/lib/posts';
import {
  AnalyticsSnapshot,
  PostPerformance,
  TrafficSource,
  TrendPoint,
} from './schema';

/** Anchor the trend window to a fixed date so builds are reproducible. */
const ANCHOR_DATE = '2026-07-31';
const WINDOW_DAYS = 14;

/** Small deterministic PRNG (mulberry32) so seed data never shifts per build. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function addDays(iso: string, delta: number): string {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

/** Baseline daily-view "weight" per source, before per-post scaling. */
const SOURCE_WEIGHTS: Record<TrafficSource, number> = {
  search: 0.34,
  social: 0.24,
  referral: 0.16,
  direct: 0.14,
  email: 0.1,
  internal: 0.02,
};

const EMPTY_SOURCES: Record<TrafficSource, number> = {
  direct: 0,
  search: 0,
  social: 0,
  email: 0,
  referral: 0,
  internal: 0,
};

/**
 * Build the seed snapshot from the live content set. Published posts get real
 * traffic; review/draft posts are not on the public site, so they get ~0 views
 * (an honest reflection of the editorial workflow).
 */
export function buildSampleSnapshot(): AnalyticsSnapshot {
  const posts = getAllPosts();

  // A synthetic "home" entry so the index page shows up in performance too.
  const entries = [
    {
      contentId: 'home',
      title: 'Home — Blog index',
      path: '/',
      status: 'published',
      publishDate: ANCHOR_DATE,
    },
    ...posts.map((p) => ({
      contentId: p.slug,
      title: p.title,
      path: `/posts/${p.slug}/`,
      status: p.status,
      publishDate: p.publishDate || ANCHOR_DATE,
    })),
  ];

  const dates = Array.from({ length: WINDOW_DAYS }, (_, i) =>
    addDays(ANCHOR_DATE, -(WINDOW_DAYS - 1 - i)),
  );

  const perPost: PostPerformance[] = [];
  // date -> {views, visitors} accumulator for the site-wide trend.
  const trendAcc = new Map<string, { views: number; visitors: number }>();
  dates.forEach((d) => trendAcc.set(d, { views: 0, visitors: 0 }));
  const sourceBreakdown: Record<TrafficSource, number> = { ...EMPTY_SOURCES };

  for (const e of entries) {
    const rng = mulberry32(hashString(e.contentId));
    const live = e.status === 'published';
    // Popularity baseline: home is the busiest; published posts vary; non-live
    // content gets a trickle (direct hits / preview links) but no promotion.
    const base = e.contentId === 'home' ? 42 : live ? 14 + rng() * 26 : 0.4;

    const sources: Record<TrafficSource, number> = { ...EMPTY_SOURCES };
    let views = 0;
    let scrollSum = 0;
    let dwellSum = 0;
    let engagedSum = 0;

    for (let di = 0; di < dates.length; di++) {
      const date = dates[di];
      // Illustrative seed: simulate the trailing window with a gentle upward
      // ramp + daily noise. (A real collector reports only post-publish days;
      // here the sample content's publish date is "today", so we backfill the
      // window so the CEO sees a populated trend.)
      const ramp = 0.6 + (di / dates.length) * 0.8;
      const dayViews = Math.max(0, Math.round(base * ramp * (0.7 + rng() * 0.6)));
      if (dayViews === 0) continue;

      // Split the day's views across sources by weight (+ jitter).
      let assigned = 0;
      (Object.keys(SOURCE_WEIGHTS) as TrafficSource[]).forEach((src, idx, arr) => {
        const isLast = idx === arr.length - 1;
        const share = isLast
          ? dayViews - assigned
          : Math.round(dayViews * SOURCE_WEIGHTS[src] * (0.8 + rng() * 0.4));
        const v = Math.max(0, share);
        sources[src] += v;
        sourceBreakdown[src] += v;
        assigned += v;
      });

      views += dayViews;
      // Engagement: posts read deeper than the index page.
      const isPost = e.contentId !== 'home';
      for (let v = 0; v < dayViews; v++) {
        const scroll = isPost
          ? 35 + rng() * 60
          : 20 + rng() * 45;
        const dwell = isPost ? 25 + rng() * 120 : 8 + rng() * 30;
        scrollSum += scroll;
        dwellSum += dwell;
        if (dwell >= 15 || scroll >= 50) engagedSum += 1;
      }

      const t = trendAcc.get(date)!;
      t.views += dayViews;
      t.visitors += Math.round(dayViews * (0.72 + rng() * 0.12));
    }

    if (views === 0 && !live) {
      // Non-live content with no traffic still shows, so the CEO can see the
      // pipeline is watching it — just with zeros.
      perPost.push({
        contentId: e.contentId,
        title: e.title,
        path: e.path,
        status: e.status,
        views: 0,
        visitors: 0,
        engagementRate: 0,
        avgScrollDepth: 0,
        avgDwellSeconds: 0,
        sources: { ...EMPTY_SOURCES },
      });
      continue;
    }

    perPost.push({
      contentId: e.contentId,
      title: e.title,
      path: e.path,
      status: e.status,
      views,
      visitors: Math.round(views * 0.78),
      engagementRate: views ? Math.round((engagedSum / views) * 100) : 0,
      avgScrollDepth: views ? Math.round(scrollSum / views) : 0,
      avgDwellSeconds: views ? Math.round(dwellSum / views) : 0,
      sources,
    });
  }

  perPost.sort((a, b) => b.views - a.views);

  const trend: TrendPoint[] = dates.map((date) => {
    const t = trendAcc.get(date)!;
    return { date, views: t.views, visitors: t.visitors };
  });

  const totalViews = perPost.reduce((s, p) => s + p.views, 0);
  const totalVisitors = perPost.reduce((s, p) => s + p.visitors, 0);
  const engagedWeighted = perPost.reduce(
    (s, p) => s + (p.engagementRate / 100) * p.views,
    0,
  );
  const dwellWeighted = perPost.reduce(
    (s, p) => s + p.avgDwellSeconds * p.views,
    0,
  );

  return {
    generatedAt: `${ANCHOR_DATE}T12:00:00.000Z`,
    window: { start: dates[0], end: dates[dates.length - 1], days: WINDOW_DAYS },
    isSample: true,
    totals: {
      views: totalViews,
      visitors: totalVisitors,
      engagementRate: totalViews
        ? Math.round((engagedWeighted / totalViews) * 100)
        : 0,
      avgDwellSeconds: totalViews ? Math.round(dwellWeighted / totalViews) : 0,
    },
    posts: perPost,
    sourceBreakdown,
    trend,
  };
}
