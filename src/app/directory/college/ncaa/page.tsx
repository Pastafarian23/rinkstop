import Link from 'next/link';
import type { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';

export const metadata: Metadata = {
  title: 'NCAA Hockey Programs | RinkStop',
  description:
    'All NCAA hockey programs across Division 1, Division 3, and ACHA — teams, rosters, conferences, and schedules.',
  alternates: {
    canonical: 'https://rinkstop.com/directory/college/ncaa',
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: 'NCAA Hockey Programs | RinkStop',
    description:
      'All NCAA hockey programs across Division 1, Division 3, and ACHA — teams, rosters, conferences, and schedules.',
    url: 'https://rinkstop.com/directory/college/ncaa',
    siteName: 'RinkStop',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NCAA Hockey Programs | RinkStop',
    description:
      'All NCAA hockey programs across Division 1, Division 3, and ACHA.',
  },
};

// Always render fresh — directory data changes too often to cache statically.
export const dynamic = 'force-dynamic';

const supabase = createClient(
  'https://placeholder.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'
);

const NCAA_LEAGUE_ID = '498c6b36-a83a-4e81-9829-a2f9ca3a03f8';

export default async function NCAAAthletePage() {
  const { data: allTeams } = await supabase
    .from('teams')
    .select('id, name, slug, city, division')
    .eq('league_id', NCAA_LEAGUE_ID)
    .order('name');

  const conferences = ['All', 'NCHC', 'Big Ten', 'Hockey East'];

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1rem' }}>
        <Link href="/" style={{ color: '#555' }}>Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/directory" style={{ color: '#555' }}>Directory</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/directory/college" style={{ color: '#555' }}>College</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>NCAA</span>
      </nav>

      <div style={{ marginBottom: '1.5rem' }}>
        <h1 className="font-sport" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: '#fff', letterSpacing: '0.02em', lineHeight: 1 }}>
          NCAA
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
          {allTeams?.length || 0} programs across all NCAA divisions
        </p>
      </div>

      {!allTeams || allTeams.length === 0 ? (
        <div style={{ color: '#666', padding: '2rem', textAlign: 'center' }}>
          No teams found.
        </div>
      ) : (
        <>
          {/* Conference filter tabs */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
            {conferences.map(conf => (
              <span
                key={conf}
                style={{
                  padding: '0.3rem 0.875rem',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  background: conf === 'All' ? 'var(--red)' : 'var(--s2)',
                  color: conf === 'All' ? '#fff' : 'rgba(255,255,255,0.55)',
                  border: `1px solid ${conf === 'All' ? 'var(--red)' : 'var(--border)'}`,
                }}
              >
                {conf}
              </span>
            ))}
          </div>

          {/* Team grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
            {allTeams.map(team => (
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
                  {team.division && (
                    <span style={{ display: 'inline-block', marginTop: '0.375rem', fontSize: '0.5625rem', color: '#C8102E', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      {team.division}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}