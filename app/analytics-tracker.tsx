'use client';

/**
 * Client-side analytics tracker.
 *
 * Mounted once in the root layout. For every page view it:
 *  1. Attributes a traffic source from the referrer + UTM params.
 *  2. Measures engagement — max scroll depth and *active* dwell time (only
 *     while the tab is visible), flushed when the visit ends.
 *  3. Emits one `AnalyticsEvent` via `navigator.sendBeacon` to the collector at
 *     `NEXT_PUBLIC_ANALYTICS_ENDPOINT`.
 *
 * It is privacy-friendly by design: no cookies, no fingerprinting, no PII —
 * just page + source + engagement. When no endpoint is configured (local dev,
 * or before the CEO picks a collector) it degrades gracefully: the event is
 * logged to the console and stashed in `localStorage` so it stays inspectable.
 *
 * Vendor-neutral: the same event can go to our own endpoint, a serverless
 * function, or be adapted to GoatCounter / Plausible / GA4 without touching the
 * dashboard, which only ever reads an `AnalyticsSnapshot`.
 */
import { useEffect } from 'react';
import { AnalyticsEvent, classifySource, isEngaged } from '@/lib/analytics/schema';

const ENDPOINT = process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT || '';
const STORAGE_KEY = 'bemos:analytics:queue';

/** Derive the content id for a path: post slug, `home`, or `dashboard`. */
function contentIdFor(path: string): string {
  const clean = path.replace(/\/+$/, '');
  const m = /\/posts\/([^/]+)/.exec(clean);
  if (m) return m[1];
  if (clean === '' || clean.endsWith('/bemos-content-site')) return 'home';
  const seg = clean.split('/').filter(Boolean).pop();
  return seg || 'home';
}

export default function AnalyticsTracker() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const path = window.location.pathname;
    const params = new URLSearchParams(window.location.search);
    const source = classifySource(
      document.referrer,
      params.get('utm_medium'),
      window.location.hostname,
    );
    let referrerHost = '';
    try {
      referrerHost = document.referrer ? new URL(document.referrer).hostname : '';
    } catch {
      referrerHost = '';
    }

    const startedAt = Date.now();
    let activeMs = 0;
    let lastResume = document.visibilityState === 'visible' ? startedAt : 0;
    let maxScroll = 0;

    const sampleScroll = () => {
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - window.innerHeight;
      const pct =
        scrollable <= 0
          ? 100
          : Math.min(100, Math.round((window.scrollY / scrollable) * 100));
      if (pct > maxScroll) maxScroll = pct;
    };

    const onVisibility = () => {
      const now = Date.now();
      if (document.visibilityState === 'visible') {
        lastResume = now;
      } else if (lastResume) {
        activeMs += now - lastResume;
        lastResume = 0;
      }
    };

    let sent = false;
    const flush = () => {
      if (sent) return;
      sent = true;
      if (lastResume) {
        activeMs += Date.now() - lastResume;
        lastResume = 0;
      }
      sampleScroll();
      const dwellSeconds = Math.round(activeMs / 1000);
      const event: AnalyticsEvent = {
        contentId: contentIdFor(path),
        path,
        source,
        referrerHost: referrerHost || undefined,
        campaign: params.get('utm_campaign') || undefined,
        scrollDepth: maxScroll,
        dwellSeconds,
        engaged: isEngaged(maxScroll, dwellSeconds),
        ts: new Date().toISOString(),
      };

      if (ENDPOINT && navigator.sendBeacon) {
        try {
          navigator.sendBeacon(ENDPOINT, JSON.stringify(event));
        } catch {
          /* best-effort; analytics must never break the page */
        }
      } else {
        // No collector configured yet — keep the event inspectable.
        try {
          const q = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
          q.push(event);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(q.slice(-100)));
        } catch {
          /* storage may be unavailable; ignore */
        }
        // eslint-disable-next-line no-console
        console.info('[analytics] event (no endpoint configured):', event);
      }
    };

    sampleScroll();
    window.addEventListener('scroll', sampleScroll, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);
    // `pagehide` is the most reliable "visit is ending" signal on mobile.
    window.addEventListener('pagehide', flush);
    window.addEventListener('beforeunload', flush);

    return () => {
      window.removeEventListener('scroll', sampleScroll);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', flush);
      window.removeEventListener('beforeunload', flush);
      flush(); // SPA route change: record the visit we're leaving.
    };
  }, []);

  return null;
}
