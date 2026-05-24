import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://placeholder.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'
);

const NCAA_LEAGUE_ID = '498c6b36-a83a-4e81-9829-a2f9ca3a03f8';

const CONFERENCES = [
  { id: 'All',        label: 'All'        },
  { id: 'NCHC',       label: 'NCHC'       },
  { id: 'Big Ten',    label: 'Big Ten'    },
  { id: 'Hockey East', label: 'Hockey East' },
];

export default async function CollegeHubPage({
  searchParams,
}: {
  searchParams: Promise<{ conf?: string }>;
}) {
  const activeConf = (await searchParams).conf || 'All';

  const query = supabase
    .from('teams')
    .select('id, name, slug, city, division')
    .eq('league_id', NCAA_LEAGUE_ID)
    .order('name');

  if (activeConf !== 'All') {
    query.eq('division', activeConf);
  }

  const { data: teams } = await query;

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1rem' }}>
        <Link href="/" style={{ color: '#555' }}>Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/directory" style={{ color: '#555' }}>Directory</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>College Hockey</span>
      </nav>

      <div style={{ marginBottom: '1.5rem' }}>
        <h1 className="font-sport" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: '#fff', letterSpacing: '0.02em', lineHeight: 1 }}>
          COLLEGE HOCKEY
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
          The complete college hockey landscape  --  NCAA Division I and beyond.
        </p>
      </div>

      {/* Conference tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
        {CONFERENCES.map(conf => (
          <Link
            key={conf.id}
            href={conf.id === 'All' ? '/directory/college' : `/directory/college?conf=${conf.id}`}
            style={{
              padding: '0.3rem 0.875rem',
              borderRadius: '4px',
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              textDecoration: 'none',
              background: activeConf === conf.id ? 'var(--red)' : 'var(--s2)',
              color: activeConf === conf.id ? '#fff' : 'rgba(255,255,255,0.55)',
              border: `1px solid ${activeConf === conf.id ? 'var(--red)' : 'var(--border)'}`,
            }}
          >
            {conf.label}
          </Link>
        ))}
      </div>

      <p style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1rem', letterSpacing: '0.04em' }}>
        {teams?.length || 0} TEAM{teams?.length !== 1 ? 'S' : ''}
      </p>

      {!teams || teams.length === 0 ? (
        <div style={{ color: '#666', padding: '2rem', textAlign: 'center' }}>
          No teams found.
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
                {team.division && (
                  <span style={{ display: 'inline-block', marginTop: '0.375rem', fontSize: '0.5625rem', color: '#C8102E', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    {team.division}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}