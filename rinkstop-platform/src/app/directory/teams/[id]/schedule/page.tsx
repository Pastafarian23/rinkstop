// /directory/teams/[id]/schedule - Team schedule, recent results, and standings
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import Breadcrumbs from '@/components/Breadcrumbs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function formatDate(dateStr: string) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(dateStr: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
}

function getResultClass(status: string) {
  if (status === 'Finished') return { color: '#22c55e', label: 'W' };
  if (status === 'In Progress') return { color: '#f59e0b', label: 'Live' };
  return { color: '#888', label: 'Scheduled' };
}

export default async function TeamSchedulePage({ params }: { params: { id: string } }) {
  const { id } = params;

  // Fetch team
  const { data: team } = await supabase
    .from('teams')
    .select('id, name, slug, city, country, logo_url, league_id')
    .eq('id', id)
    .single();

  if (!team) {
    return (
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem 1rem' }}>
        <Breadcrumbs links={[{ label: 'Teams', href: '/directory/teams' }]} />
        <h1 style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 700 }}>Team not found</h1>
      </div>
    );
  }

  // Fetch matches where this team is home or away
  // Use highlightly_matches for recent + upcoming
  const { data: homeMatches } = await supabase
    .from('highlightly_matches')
    .select('*')
    .eq('home_team_id', id)
    .gte('date', '2025-09-01')
    .order('date', { ascending: false });

  const { data: awayMatches } = await supabase
    .from('highlightly_matches')
    .select('*')
    .eq('away_team_id', id)
    .gte('date', '2025-09-01')
    .order('date', { ascending: false });

  // Combine and dedupe
  const allMatchesMap = new Map();
  for (const m of homeMatches || []) allMatchesMap.set(m.id, m);
  for (const m of awayMatches || []) allMatchesMap.set(m.id, m);
  const allMatches = Array.from(allMatchesMap.values()).sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const now = new Date();
  const upcoming = allMatches.filter(m => new Date(m.date) >= now && m.status !== 'Finished').slice(0, 5);
  const recent = allMatches.filter(m => m.status === 'Finished' || new Date(m.date) < now).slice(0, 5);

  // Fetch standings for this team
  const { data: standings } = await supabase
    .from('highlightly_standings')
    .select('*')
    .eq('league_id', '49291') // NHL for now - will expand
    .eq('season', '2025')
    .order('points', { ascending: false });

  const teamStanding = standings?.find(s => s.team_name === team.name);

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>

      <Breadcrumbs links={[
        { label: 'Directory', href: '/directory' },
        { label: 'Teams', href: '/directory/teams' },
        { label: team.name, href: `/directory/teams/${team.id}` },
        { label: 'Schedule', href: `/directory/teams/${team.id}/schedule` },
      ]} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        {team.logo_url ? (
          <img src={team.logo_url} alt="" style={{ width: 56, height: 56, objectFit: 'contain', flexShrink: 0 }} />
        ) : (
          <div style={{ width: 56, height: 56, borderRadius: '8px', background: 'linear-gradient(135deg, #C8102E, #041E42)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>🏒</div>
        )}
        <div>
          <h1 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: 'clamp(1.5rem, 4vw, 2.25rem)', color: '#fff', letterSpacing: '0.02em', lineHeight: 1 }}>
            {team.name.toUpperCase()} — SCHEDULE
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.8125rem' }}>
            {[team.city, team.country].filter(Boolean).join(', ')}
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>

        {/* Upcoming Games */}
        <div>
          <h2 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '1.125rem', color: '#fff', letterSpacing: '0.03em', marginBottom: '0.875rem' }}>
            UPCOMING GAMES
          </h2>
          {upcoming.length === 0 ? (
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.875rem', padding: '1rem 0' }}>No upcoming games scheduled.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {upcoming.map(m => {
                const isHome = m.home_team_id === id;
                const opponent = isHome ? m.away_team_name : `@ ${m.home_team_name}`;
                return (
                  <div key={m.id} style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', padding: '0.875rem 1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {m.league_name || 'NHL'}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: '#666' }}>{formatDate(m.date)}</span>
                    </div>
                    <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.9375rem' }}>
                      {isHome ? `${m.away_team_name}` : `@ ${m.home_team_name}`}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.125rem' }}>
                      {formatTime(m.date)} · {m.venue || 'TBD'}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Results */}
        <div>
          <h2 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '1.125rem', color: '#fff', letterSpacing: '0.03em', marginBottom: '0.875rem' }}>
            RECENT RESULTS
          </h2>
          {recent.length === 0 ? (
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.875rem', padding: '1rem 0' }}>No recent results.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {recent.map(m => {
                const isHome = m.home_team_id === id;
                const teamScore = isHome ? m.home_score : m.away_score;
                const oppScore = isHome ? m.away_score : m.home_score;
                const won = parseInt(teamScore) > parseInt(oppScore);
                const tie = parseInt(teamScore) === parseInt(oppScore);
                const result = m.status === 'Finished' ? (won ? 'W' : tie ? 'T' : 'L') : m.status;

                return (
                  <div key={m.id} style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', padding: '0.875rem 1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: '#666', marginRight: '0.5rem' }}>{formatDate(m.date)}</span>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#888', textTransform: 'uppercase' }}>{m.league_name || 'NHL'}</span>
                      </div>
                      <span style={{
                        fontSize: '0.7rem', fontWeight: 800,
                        color: m.status === 'Finished' ? (won ? '#22c55e' : '#ef4444') : '#f59e0b',
                        background: m.status === 'Finished' ? (won ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)') : 'rgba(245,158,11,0.15)',
                        padding: '0.2rem 0.5rem', borderRadius: '4px'
                      }}>
                        {m.status === 'Finished' ? result : 'LIVE'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.375rem' }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#fff', flex: 1, textAlign: isHome ? 'left' : 'right' }}>
                        {isHome ? 'vs' : ''} {isHome ? m.away_team_name : m.home_team_name}
                      </span>
                      {m.status === 'Finished' && (
                        <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.125rem', color: '#fff' }}>
                          {teamScore} – {oppScore}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Standing */}
        <div>
          <h2 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '1.125rem', color: '#fff', letterSpacing: '0.03em', marginBottom: '0.875rem' }}>
            CURRENT STANDING
          </h2>
          {teamStanding ? (
            <div style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', padding: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginBottom: '0.75rem' }}>
                {[
                  { label: 'Position', value: teamStanding.position || '—' },
                  { label: 'Points', value: teamStanding.points || 0 },
                  { label: 'Wins', value: teamStanding.wins || 0 },
                  { label: 'Losses', value: teamStanding.losses || 0 },
                  { label: 'OTL', value: teamStanding.overtime_losses || 0 },
                  { label: 'Season', value: teamStanding.season || '2025' },
                ].map(s => (
                  <div key={s.label} style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: '0.2rem' }}>{s.label}</p>
                    <p style={{ fontSize: '1.25rem', fontWeight: 700, color: s.label === 'Position' ? '#C8102E' : '#fff' }}>{s.value}</p>
                  </div>
                ))}
              </div>
              <div style={{ height: '1px', background: '#333', margin: '0.75rem 0' }} />
              <p style={{ fontSize: '0.75rem', color: '#666', textAlign: 'center' }}>
                {teamStanding.league_name || 'NHL'} · {teamStanding.season || '2025'} Season
              </p>
            </div>
          ) : (
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.875rem', padding: '1rem 0' }}>
              Standing data not available for this league.
            </p>
          )}
        </div>

      </div>

      {/* Back link */}
      <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid #333' }}>
        <Link href={`/directory/teams/${team.id}`} style={{ color: '#C8102E', fontSize: '0.8125rem', fontWeight: 600 }}>
          ← Back to {team.name}
        </Link>
      </div>

    </div>
  );
}
