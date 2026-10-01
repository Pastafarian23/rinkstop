import type { Metadata } from 'next';
import Link from 'next/link';
import DirectoryLandingClient from './DirectoryLandingClient';
import { withDefaultOg } from '@/lib/metadata-defaults';
import { getDirectoryCountsCached } from '@/lib/directory-counts';

// 2026-10-01 (Arnel data-integrity audit): route title/description through
// the canonical helper so the directory landing page metadata matches the
// rendered DirectoryLandingClient counts and never drifts.
export async function generateMetadata(): Promise<Metadata> {
  const counts = await getDirectoryCountsCached();
  const description = `Browse RinkStop's complete hockey directory — ${counts.teams.toLocaleString()}+ teams, ${counts.leagues.toLocaleString()}+ leagues, ${counts.players.toLocaleString()}+ players, and ${counts.rinks.toLocaleString()} ice rinks across ${counts.countries.toLocaleString()} countries. Search by name, league, country, or city.`;
  return {
    title: 'Hockey Directory',
  description: description,
  alternates: {
    canonical: 'https://rinkstop.com/directory',
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: withDefaultOg({
    title: 'Hockey Directory',
    description: description,
    url: 'https://rinkstop.com/directory',
    siteName: 'RinkStop',
    type: 'website',
  }),
  twitter: {
    card: 'summary_large_image',
    title: 'Hockey Directory',
    description: description,
  },
  };
}

// ISR-cached for 1 hour (2026-07-22 perf pass).
export const revalidate = 3600;
export const dynamicParams = true;

export default function DirectoryPage() {
  return (
    <>
      <section style={{ background: 'rgba(56,189,248,0.06)', borderBottom: '1px solid rgba(56,189,248,0.18)', padding: '1rem 0' }}>
        <div className="container" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem 1.5rem', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.875rem' }}>
            <strong style={{ color: '#FFB81C' }}>Planning a season?</strong>{' '}
            See costs by age, state, and level with the{' '}
            <Link href="/tools/hockey-cost-calculator" style={{ color: '#FFB81C', textDecoration: 'underline' }}>Hockey Cost Calculator</Link>,
            read the{' '}
            <Link href="/guides/hockey-parents-handbook" style={{ color: '#FFB81C', textDecoration: 'underline' }}>Hockey Parents Handbook</Link>,
            or browse{' '}
            <Link href="/learn" style={{ color: '#FFB81C', textDecoration: 'underline' }}>Learn Hockey</Link>
            {' '}— 24 beginner-friendly explainers.
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <Link href="/tools" style={{ color: '#FFB81C', fontSize: '0.8125rem', fontWeight: 600, textDecoration: 'none' }}>All tools →</Link>
            <Link href="/guides" style={{ color: '#FFB81C', fontSize: '0.8125rem', fontWeight: 600, textDecoration: 'none' }}>All guides →</Link>
            <Link href="/learn" style={{ color: '#FFB81C', fontSize: '0.8125rem', fontWeight: 600, textDecoration: 'none' }}>All learn →</Link>
          </div>
        </div>
      </section>
      <DirectoryLandingClient />
    </>
  );
}
