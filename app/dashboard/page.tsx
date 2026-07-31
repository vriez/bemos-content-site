import Link from 'next/link';
import { getSnapshot } from '@/lib/analytics/data';
import {
  PostPerformance,
  SOURCE_LABELS,
  SOURCE_ORDER,
  TrafficSource,
} from '@/lib/analytics/schema';

export const metadata = {
  title: 'Content Analytics · BemOS Plantoes',
  description: 'Per-post performance, traffic sources, and trends.',
};

export default function DashboardPage() {
  const s = getSnapshot();
  const topSourceOf = (p: PostPerformance): TrafficSource | null => {
    let best: TrafficSource | null = null;
    let max = -1;
    (Object.keys(p.sources) as TrafficSource[]).forEach((src) => {
      if (p.sources[src] > max) {
        max = p.sources[src];
        best = src;
      }
    });
    return max > 0 ? best : null;
  };

  const sourceTotal =
    SOURCE_ORDER.reduce((sum, src) => sum + (s.sourceBreakdown[src] || 0), 0) || 1;
  const maxTrend = Math.max(1, ...s.trend.map((t) => t.views));

  return (
    <section className="dash">
      <div className="dash-head">
        <div>
          <h1>Content Analytics</h1>
          <p className="dash-sub">
            Per-post performance for the last {s.window.days} days (
            {fmtDate(s.window.start)} – {fmtDate(s.window.end)}).
          </p>
        </div>
        {s.isSample && (
          <span
            className="badge-sample"
            title="Seed data derived from live content. Connect a collector to show real traffic."
          >
            Sample data
          </span>
        )}
      </div>

      {/* KPI row */}
      <div className="kpi-row">
        <Kpi label="Total views" value={fmtNum(s.totals.views)} />
        <Kpi label="Visitors" value={fmtNum(s.totals.visitors)} />
        <Kpi label="Engagement rate" value={`${s.totals.engagementRate}%`} />
        <Kpi label="Avg. time on page" value={fmtDuration(s.totals.avgDwellSeconds)} />
      </div>

      {/* Trend */}
      <div className="dash-card">
        <div className="card-head">
          <h2>Views — last {s.window.days} days</h2>
          <span className="card-note">{fmtNum(s.totals.views)} total</span>
        </div>
        <div className="trend" role="img" aria-label="Daily views trend">
          {s.trend.map((t) => (
            <div key={t.date} className="trend-col" title={`${fmtDate(t.date)}: ${t.views} views`}>
              <div
                className="trend-bar"
                style={{ height: `${Math.round((t.views / maxTrend) * 100)}%` }}
              />
              <span className="trend-x">{t.date.slice(8)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Top content */}
      <div className="dash-card">
        <div className="card-head">
          <h2>Top content</h2>
          <span className="card-note">ranked by views</span>
        </div>
        <div className="table-wrap">
          <table className="perf-table">
            <thead>
              <tr>
                <th>#</th>
                <th className="c-title">Content</th>
                <th>Status</th>
                <th className="num">Views</th>
                <th className="num">Visitors</th>
                <th className="num">Engaged</th>
                <th className="num">Avg. scroll</th>
                <th className="num">Avg. time</th>
                <th>Top source</th>
              </tr>
            </thead>
            <tbody>
              {s.posts.map((p, i) => {
                const top = topSourceOf(p);
                return (
                  <tr key={p.contentId}>
                    <td className="rank">{i + 1}</td>
                    <td className="c-title">
                      {p.path && p.status === 'published' ? (
                        <Link href={p.path}>{p.title}</Link>
                      ) : (
                        <span>{p.title}</span>
                      )}
                    </td>
                    <td>
                      <span className={`status status-${p.status}`}>{p.status}</span>
                    </td>
                    <td className="num strong">{fmtNum(p.views)}</td>
                    <td className="num">{fmtNum(p.visitors)}</td>
                    <td className="num">{p.views ? `${p.engagementRate}%` : '—'}</td>
                    <td className="num">{p.views ? `${p.avgScrollDepth}%` : '—'}</td>
                    <td className="num">{p.views ? fmtDuration(p.avgDwellSeconds) : '—'}</td>
                    <td>{top ? SOURCE_LABELS[top] : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Traffic sources */}
      <div className="dash-card">
        <div className="card-head">
          <h2>Traffic sources</h2>
          <span className="card-note">where visits come from</span>
        </div>
        <ul className="src-list">
          {SOURCE_ORDER.map((src) => {
            const v = s.sourceBreakdown[src] || 0;
            const pct = Math.round((v / sourceTotal) * 100);
            return (
              <li key={src} className="src-row">
                <span className="src-name">{SOURCE_LABELS[src]}</span>
                <span className="src-track">
                  <span className="src-fill" style={{ width: `${pct}%` }} />
                </span>
                <span className="src-val">
                  {fmtNum(v)} <span className="src-pct">({pct}%)</span>
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <p className="dash-foot">
        {s.isSample ? (
          <>
            Showing seed data generated from live content on{' '}
            {fmtDate(s.generatedAt.slice(0, 10))}. The tracker is live on every
            page; connect an ingestion endpoint (
            <code>NEXT_PUBLIC_ANALYTICS_ENDPOINT</code>) to replace this with real
            traffic.
          </>
        ) : (
          <>Live data · generated {fmtDate(s.generatedAt.slice(0, 10))}.</>
        )}{' '}
        Read the data model in <code>lib/analytics/schema.ts</code>.
      </p>
    </section>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="kpi">
      <span className="kpi-val">{value}</span>
      <span className="kpi-label">{label}</span>
    </div>
  );
}

function fmtNum(n: number): string {
  return n.toLocaleString('en-US');
}

function fmtDuration(sec: number): string {
  if (!sec) return '0s';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m ? `${m}m ${s}s` : `${s}s`;
}

function fmtDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00Z');
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}
