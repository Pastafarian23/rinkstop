import type { Metadata } from 'next';
import Link from 'next/link';
import DirectoryLandingClient from './DirectoryLandingClient';
import { withDefaultOg } from '@/lib/metadata-defaults';

export const metadata: Metadata = {
  title: 'Hockey Directory',
  description:
    'Find hockey teams, players, leagues, rinks, and more from every corner of the globe.',
  alternates: {
    canonical: 'https://rinkstop.com/directory',
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: withDefaultOg({
    title: 'Hockey Directory',
    description:
      'Find hockey teams, players, leagues, rinks, and more from every corner of the globe.',
    url: 'https://rinkstop.com/directory',
    siteName: 'RinkStop',
    type: 'website',
  }),
  twitter: {
    card: 'summary_large_image',
    title: 'Hockey Directory',
    description:
      'Find hockey teams, players, leagues, rinks, and more from every corner of the globe.',
  },
};

// ISR-cached for 1 hour (2026-07-22 perf pass).
export const revalidate = 3600;
export const dynamicParams = true;

export default function DirectoryPage() {
  return (
    <>
      <section style={{ background: 'rgba(56,189,248,0.06)', borderBottom: '1px solid rgba(56,189,248,0.18)', padding: '1rem 0' }}>
        <div className="container" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem 1.5rem', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.875rem' }}>
            <strong style={{ color: '#38BDF8' }}>Planning a season?</strong>{' '}
            See costs by age, state, and level with the{' '}
            <Link href="/tools/hockey-cost-calculator" style={{ color: '#38BDF8', textDecoration: 'underline' }}>Hockey Cost Calculator</Link>,
            or read the{' '}
            <Link href="/guides/hockey-parents-handbook" style={{ color: '#38BDF8', textDecoration: 'underline' }}>Hockey Parents Handbook</Link>.
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <Link href="/tools" style={{ color: '#38BDF8', fontSize: '0.8125rem', fontWeight: 600, textDecoration: 'none' }}>All tools →</Link>
            <Link href="/guides" style={{ color: '#38BDF8', fontSize: '0.8125rem', fontWeight: 600, textDecoration: 'none' }}>All guides →</Link>
          </div>
        </div>
      </section>
      <DirectoryLandingClient />
    </>
  );
}
