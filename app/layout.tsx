import type { Metadata } from 'next';
import Link from 'next/link';
import AnalyticsTracker from './analytics-tracker';
import './globals.css';

const base = process.env.NEXT_PUBLIC_BASE_PATH || '';

export const metadata: Metadata = {
  title: 'BemOS Plantoes',
  description: 'The BemOS Plantoes content platform.',
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
