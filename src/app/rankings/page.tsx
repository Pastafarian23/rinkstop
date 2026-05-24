import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

export const metadata: Metadata = {
  title: 'Hockey Standings & Rankings | RinkStop',
  description: 'Live hockey standings and rankings across NHL, international, junior, college, and amateur leagues worldwide.',
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function getStandings() {
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  const { data } = await supabase
    .from('highlightly_standings')
    .select('*')
    .order('rank')
    .limit(100);
  
  return data || [];
}

async function getTopLeagues() {
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  const { data } = await supabase
    .from('highlightly_leagues')
    .select('id, name, country_code, country_name')
    .order('country_name')
    .limit(30);
  
  return data || [];
}

export default async function RankingsPage() {
  const [standings, leagues] = await Promise.all([getStandings(), getTopLeagues()]);
  
  // Group standings by league
  const byLeague: Record<string, any[]> = {};
  for (const s of standings) {
    if (!byLeague[s.league_name]) byLeague[s.league_name] = [];
    byLeague[s.league_name].push(s);
  }
  
  // Get top 5 leagues by team count
  const topLeagues = Object.entries(byLeague)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 8);
  
  return (
    <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1rem' }}>
        <Link href="/">Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>Rankings</span>
      </nav>

      <div style={{ marginBottom: '1.5rem' }}>
        <h1 className="font-sport" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: '#fff', letterSpacing: '0.02em', lineHeight: 1 }}>
          HOCKEY STANDINGS
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
          Live standings from {leagues.length}+ leagues worldwide.
        </p>
      </div>

      {/* Top Leagues Quick Access */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
        {leagues.slice(0, 15).map(l => (
          <Link
            key={l.id}
            href={`/league/${l.id}`}
            style={{
              fontSize: '0.6875rem',
              padding: '0.25rem 0.6rem',
              borderRadius: '4px',
              background: 'var(--s2)',
              border: '1px solid var(--border)',
              color: 'rgba(255,255,255,0.7)',
              textDecoration: 'none',
            }}
          >
            {l.name} ({l.country_code})
          </Link>
        ))}
      </div>

      {/* Standings by League */}
      <div style={{ display: 'grid', gap: '2rem' }}>
        {topLeagues.map(([leagueName, teams]) => (
          <div key={leagueName}>
            <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>
              {leagueName}
            </h2>
            <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={{ textAlign: 'left', padding: '0.75rem 1rem', color: 'rgba(255,255,255,0.4)', fontWeight: 500, fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>#</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem 1rem', color: 'rgba(255,255,255,0.4)', fontWeight: 500, fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Team</th>
                    <th style={{ textAlign: 'center', padding: '0.75rem 0.5rem', color: 'rgba(255,255,255,0.4)', fontWeight: 500, fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>GP</th>
                    <th style={{ textAlign: 'center', padding: '0.75rem 0.5rem', color: 'rgba(255,255,255,0.4)', fontWeight: 500, fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>W</th>
                    <th style={{ textAlign: 'center', padding: '0.75rem 0.5rem', color: 'rgba(255,255,255,0.4)', fontWeight: 500, fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>L</th>
                    <th style={{ textAlign: 'center', padding: '0.75rem 0.5rem', color: 'rgba(255,255,255,0.4)', fontWeight: 500, fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>OT</th>
                    <th style={{ textAlign: 'center', padding: '0.75rem 0.5rem', color: 'rgba(255,255,255,0.4)', fontWeight: 500, fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>GF</th>
                    <th style={{ textAlign: 'center', padding: '0.75rem 0.5rem', color: 'rgba(255,255,255,0.4)', fontWeight: 500, fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>GA</th>
                    <th style={{ textAlign: 'center', padding: '0.75rem 1rem', color: 'rgba(255,255,255,0.4)', fontWeight: 500, fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {teams.slice(0, 15).map((t: any) => (
                    <tr key={t.team_id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <td style={{ padding: '0.625rem 1rem', color: t.rank <= 3 ? '#4ade80' : 'rgba(255,255,255,0.6)' }}>{t.rank}</td>
                      <td style={{ padding: '0.625rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {t.team_logo && (
                            <img src={t.team_logo} alt="" style={{ width: 18, height: 18, objectFit: 'contain' }} />
                          )}
                          <span style={{ color: '#fff' }}>{t.team_name}</span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center', padding: '0.625rem 0.5rem', color: 'rgba(255,255,255,0.5)' }}>{t.played || 0}</td>
                      <td style={{ textAlign: 'center', padding: '0.625rem 0.5rem', color: 'rgba(255,255,255,0.5)' }}>{t.wins || 0}</td>
                      <td style={{ textAlign: 'center', padding: '0.625rem 0.5rem', color: 'rgba(255,255,255,0.5)' }}>{t.losses || 0}</td>
                      <td style={{ textAlign: 'center', padding: '0.625rem 0.5rem', color: 'rgba(255,255,255,0.5)' }}>{t.overtime_losses || 0}</td>
                      <td style={{ textAlign: 'center', padding: '0.625rem 0.5rem', color: 'rgba(255,255,255,0.5)' }}>{t.goals_for || 0}</td>
                      <td style={{ textAlign: 'center', padding: '0.625rem 0.5rem', color: 'rgba(255,255,255,0.5)' }}>{t.goals_against || 0}</td>
                      <td style={{ textAlign: 'center', padding: '0.625rem 1rem', color: '#fff', fontWeight: 600 }}>{t.points || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      {/* Coverage Stats */}
      <div style={{ marginTop: '3rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.25rem', color: '#fff', marginBottom: '1rem' }}>
          GLOBAL COVERAGE
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '1rem', textAlign: 'center' }}>
          <div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#4ade80' }}>{leagues.length}+</div>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>Leagues</div>
          </div>
          <div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#4ade80' }}>30+</div>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>Countries</div>
          </div>
          <div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#4ade80' }}>975+</div>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>Teams</div>
          </div>
          <div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#4ade80' }}>1,599+</div>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>Matches</div>
          </div>
        </div>
      </div>
    </main>
  );
}