import Link from 'next/link';
import type { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';

export const metadata: Metadata = {
  title: 'Big Ten Hockey',
  description:
    'Big Ten Conference college hockey programs, teams, rosters, and schedules.',
  alternates: {
    canonical: 'https://rinkstop.com/directory/college/big-ten',
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: 'Big Ten Hockey',
    description:
      'Big Ten Conference college hockey programs, teams, rosters, and schedules.',
    url: 'https://rinkstop.com/directory/college/big-ten',
    siteName: 'RinkStop',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Big Ten Hockey',
    description:
      'Big Ten Conference college hockey programs, teams, rosters, and schedules.',
  },
};

// ISR-cached for 1 hour (2026-07-22 perf pass).
export const revalidate = 3600;
export const dynamicParams = true;

const supabase = createClient(
  'https://placeholder.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'
);

const NCAA_LEAGUE_ID = '498c6b36-a83a-4e81-9829-a2f9ca3a03f8';

export default async function BigTenPage() {
  const { data: teams } = await supabase
    .from('team_workspaces')
    .select('id, name, slug, city, division')
    .eq('league_id', NCAA_LEAGUE_ID)
    .eq('division', 'Big Ten')
    .order('name');

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1rem' }}>
        <Link href="/" style={{ color: '#555' }}>Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/directory" style={{ color: '#555' }}>Directory</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/directory/college" style={{ color: '#555' }}>College</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>Big Ten</span>
      </nav>

      <div style={{ marginBottom: '1.5rem' }}>
        <h1 className="font-sport" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: '#fff', letterSpacing: '0.02em', lineHeight: 1 }}>
          BIG TEN HOCKEY
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
          Big Ten Conference  --  {teams?.length || 0} programs
        </p>
      </div>

      {!teams || teams.length === 0 ? (
        <div style={{ color: '#666', padding: '2rem', textAlign: 'center' }}>
          No Big Ten teams found.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
          {teams.map(team => (
            <Link key={team.id} href={`/directory/teams/${team.slug}`} style={{ textDecoration: 'none' }}>
              <div style={{
                background: 'var(--s2)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '1rem',
                transition: 'border-color 0.15s',
              }}>
                <h3 style={{ color: '#fff', fontSize: '0.9375rem', fontWeight: 700 }}>{team.name}</h3>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', marginTop: '0.25rem' }}>{team.city}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}