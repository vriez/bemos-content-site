/**
 * The analytics data model.
 *
 * Every visit to the site produces one `AnalyticsEvent`. Events are the raw
 * facts; everything the CEO dashboard shows is aggregated from them. The model
 * is deliberately small and vendor-neutral so the same events can be sent to
 * any collector (our own endpoint, GoatCounter, Plausible, GA4, …) without
 * changing the tracker or the dashboard.
 *
 * The unit that ties analytics back to editorial is `contentId` — the post
 * `slug` for an article, or a reserved id like `home` for index pages. That is
 * the join key between `content/` (see `lib/posts.ts`) and performance.
 */

/** How a visitor arrived. Derived from the referrer + UTM params at capture. */
export type TrafficSource =
  | 'direct' // no referrer / typed URL / bookmark
  | 'search' // organic search engines
  | 'social' // social networks
  | 'email' // newsletter / mail clients (utm_medium=email)
  | 'referral' // any other external site
  | 'internal'; // navigation from another page on our own site

/** A single captured visit. This is the atomic record the pipeline ingests. */
export interface AnalyticsEvent {
  /** Post slug, or a reserved page id such as `home`. */
  contentId: string;
  /** Page path that was viewed, e.g. `/posts/welcome-to-bemos/`. */
  path: string;
  /** Attributed traffic source. */
  source: TrafficSource;
  /** Referrer hostname (if any), useful for a source drill-down. */
  referrerHost?: string;
  /** Campaign name from `utm_campaign`, if present. */
  campaign?: string;
  /** Max scroll depth reached, 0–100. Our primary engagement signal. */
  scrollDepth: number;
  /** Active time on page in seconds (tab visible only). */
  dwellSeconds: number;
  /** Whether the visit is "engaged": dwell ≥ 15s OR scroll ≥ 50%. */
  engaged: boolean;
  /** ISO timestamp (UTC) the event was recorded. */
  ts: string;
}

/** Rolled-up performance for one piece of content. */
export interface PostPerformance {
  contentId: string;
  title: string;
  path: string;
  /** Editorial status from the content model (published/review/draft). */
  status: string;
  views: number;
  /** Distinct sessions (approx). */
  visitors: number;
  /** Share of visits that were "engaged", 0–100. */
  engagementRate: number;
  /** Mean scroll depth across views, 0–100. */
  avgScrollDepth: number;
  /** Mean active dwell time in seconds. */
  avgDwellSeconds: number;
  /** Views broken down by source. */
  sources: Record<TrafficSource, number>;
}

/** One day of the site-wide trend. */
export interface TrendPoint {
  date: string; // YYYY-MM-DD
  views: number;
  visitors: number;
}

/**
 * The aggregate the dashboard renders. A collector publishes one of these
 * (as JSON) and the dashboard reads it — build-time from the bundled seed, or
 * at runtime from `NEXT_PUBLIC_ANALYTICS_ENDPOINT` when a live feed is wired.
 */
export interface AnalyticsSnapshot {
  /** ISO timestamp the snapshot was generated. */
  generatedAt: string;
  /** Inclusive date window the snapshot covers. */
  window: { start: string; end: string; days: number };
  /** True for the bundled seed data; false once fed by a real collector. */
  isSample: boolean;
  totals: {
    views: number;
    visitors: number;
    engagementRate: number;
    avgDwellSeconds: number;
  };
  /** Per-post performance, callers typically sort by `views` desc. */
  posts: PostPerformance[];
  /** Site-wide views by source over the window. */
  sourceBreakdown: Record<TrafficSource, number>;
  /** Daily trend across the window, oldest → newest. */
  trend: TrendPoint[];
}

export const SOURCE_LABELS: Record<TrafficSource, string> = {
  direct: 'Direct',
  search: 'Search',
  social: 'Social',
  email: 'Email',
  referral: 'Referral',
  internal: 'Internal',
};

export const SOURCE_ORDER: TrafficSource[] = [
  'search',
  'social',
  'email',
  'referral',
  'direct',
  'internal',
];

const SEARCH_HOSTS = /(google|bing|duckduckgo|yahoo|ecosia|baidu|yandex|brave)\./i;
const SOCIAL_HOSTS =
  /(t\.co|twitter|x\.com|facebook|fb\.com|linkedin|lnkd\.in|instagram|reddit|news\.ycombinator|youtube|t\.me|mastodon|bsky|threads)/i;

/**
 * Classify a visit's traffic source from its referrer + UTM medium. Pure and
 * side-effect free so it is shared by the client tracker and any server-side
 * ingestion. `ownHost` lets us tell internal navigation from real referrals.
 */
export function classifySource(
  referrer: string,
  utmMedium: string | null,
  ownHost: string,
): TrafficSource {
  const medium = (utmMedium || '').toLowerCase();
  if (medium === 'email' || medium === 'newsletter') return 'email';
  if (medium === 'social') return 'social';
  if (!referrer) return 'direct';

  let host = '';
  try {
    host = new URL(referrer).hostname;
  } catch {
    return 'direct';
  }
  if (!host) return 'direct';
  if (ownHost && host === ownHost) return 'internal';
  if (SEARCH_HOSTS.test(host)) return 'search';
  if (SOCIAL_HOSTS.test(host)) return 'social';
  return 'referral';
}

/** An engaged visit: read for a while, or scrolled past the fold + halfway. */
export function isEngaged(scrollDepth: number, dwellSeconds: number): boolean {
  return dwellSeconds >= 15 || scrollDepth >= 50;
}
