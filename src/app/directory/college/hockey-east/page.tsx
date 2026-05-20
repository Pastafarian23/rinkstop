import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const NCAA_LEAGUE_ID = '498c6b36-a83a-4e81-9829-a2f9ca3a03f8';

export default async function HockeyEastPage() {
  const { data: teams } = await supabase
    .from('teams')
    .select('id, name, slug, city, division')
    .eq('league_id', NCAA_LEAGUE_ID)
    .eq('division', 'Hockey East')
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
        <span style={{ color: '#A0A0A0' }}>Hockey East</span>
      </nav>

      <div style={{ marginBottom: '1.5rem' }}>
        <h1 className="font-sport" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: '#fff', letterSpacing: '0.02em', lineHeight: 1 }}>
          HOCKEY EAST
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
          Hockey East  --  {teams?.length || 0} programs
        </p>
      </div>

      {!teams || teams.length === 0 ? (
        <div style={{ color: '#666', padding: '2rem', textAlign: 'center' }}>
          No Hockey East teams found.
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