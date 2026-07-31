import type { Metadata } from 'next';
import Link from 'next/link';
import AnalyticsTracker from './analytics-tracker';
import { site } from '@/lib/site';
import './globals.css';

const base = process.env.NEXT_PUBLIC_BASE_PATH || '';

/**
 * Site-wide SEO defaults. `metadataBase` makes every relative canonical/OG URL
 * resolve to an absolute one; per-post pages override title/description/OG via
 * `generateMetadata` (see `lib/seo.ts`). The RSS feed is advertised to readers
 * and feed-consuming distribution tools via the `alternates` link.
 */
export const metadata: Metadata = {
  metadataBase: new URL(site.baseUrl),
  title: {
    default: site.title,
    template: `%s · ${site.name}`,
  },
  description: site.description,
  alternates: {
    types: {
      'application/rss+xml': `${base}/feed.xml`,
    },
  },
  openGraph: {
    type: 'website',
    siteName: site.name,
    title: site.title,
    description: site.description,
    locale: site.locale,
  },
  twitter: { card: 'summary_large_image' },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <div className="container">
            <Link href="/" className="brand">
              Bem<span>OS</span> Plantoes
            </Link>
            <nav className="nav">
              <Link href="/">Home</Link>
              <Link href="/dashboard/">Dashboard</Link>
            </nav>
          </div>
        </header>
        <main>
          <div className="container">{children}</div>
        </main>
        <AnalyticsTracker />
        <footer className="site-footer">
          <div className="container">
            Published by the BemOS content platform · auto-deployed from{' '}
            <code>{base || 'root'}</code>
          </div>
        </footer>
      </body>
    </html>
  );
}
