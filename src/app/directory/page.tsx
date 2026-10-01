import type { Metadata } from 'next';
import Link from 'next/link';
import DirectoryLandingClient from './DirectoryLandingClient';
import { withDefaultOg } from '@/lib/metadata-defaults';
import { getDirectoryCountsCached } from '@/lib/directory-counts';
import FourPathNav from '@/components/FourPathNav';

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

      {/* WS30 (Arnel 2026-10-01): 4-path compact nav at the bottom of the
          directory landing page so visitors who finished browsing can self-
          segment into the right next action. Sits below all browse
          affordances — visitors see this AFTER they've explored, not before. */}
      <section style={{ background: '#0D1117', borderTop: '1px solid rgba(255,255,255,0.06)', padding: '2rem 0' }}>
        <div className="container" style={{ maxWidth: '1200px' }}>
          <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
            <div className="label" style={{ color: 'rgba(255,255,255,0.5)' }}>Done browsing?</div>
            <h2 className="font-sport" style={{ fontSize: '1.25rem', color: '#fff', margin: 0 }}>
              WHAT&apos;S NEXT?
            </h2>
          </div>
          <FourPathNav variant="compact" />
        </div>
      </section>
    </>
  );
}
