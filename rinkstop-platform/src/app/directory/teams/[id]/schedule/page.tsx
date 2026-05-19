'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Breadcrumbs from '@/components/Breadcrumbs';

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

function GameCard({ match, teamName, isUpcoming }: { match: any; teamName: string; isUpcoming: boolean }) {
  const isHome = match.home_team_name === teamName;
  const opponent = isHome ? match.away_team_name : `@ ${match.home_team_name}`;
  const teamScore = isHome ? match.home_score : match.away_score;
  const oppScore = isHome ? match.away_score : match.home_score;
  const won = parseInt(teamScore) > parseInt(oppScore);
  const tie = parseInt(teamScore) === parseInt(oppScore);
  const result = match.status === 'Finished' ? (won ? 'W' : tie ? 'T' : 'L') : 'LIVE';
  const isLive = match.status === 'In Progress';

  if (isUpcoming) {
    return (
      <div style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', padding: '0.875rem 1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {match.league_name || 'NHL'}
          </span>
          <span style={{ fontSize: '0.7rem', color: '#666' }}>{formatDate(match.date)}</span>
        </div>
        <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.9375rem' }}>
          {opponent}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.125rem' }}>
          {formatTime(match.date)} · {match.venue || 'TBD'}
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', padding: '0.875rem 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ fontSize: '0.75rem', color: '#666', marginRight: '0.5rem' }}>{formatDate(match.date)}</span>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#888', textTransform: 'uppercase' }}>{match.league_name || 'NHL'}</span>
        </div>
        <span style={{
          fontSize: '0.7rem', fontWeight: 800,
          color: match.status === 'Finished' ? (won ? '#22c55e' : '#ef4444') : '#f59e0b',
          background: match.status === 'Finished' ? (won ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)') : 'rgba(245,158,11,0.15)',
          padding: '0.2rem 0.5rem', borderRadius: '4px'
        }}>
          {isLive ? 'LIVE' : result}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.375rem' }}>
        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#fff', flex: 1, textAlign: isHome ? 'left' : 'right' }}>
          {isHome ? 'vs' : ''} {opponent.replace('@ ', '')}
        </span>
        {match.status === 'Finished' && (
          <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.125rem', color: '#fff' }}>
            {teamScore} – {oppScore}
          </span>
        )}
      </div>
    </div>
  );
}

export default function TeamSchedulePage() {
  const { id } = useParams();
  const [team, setTeam] = useState<any>(null);
  const [upcoming, setUpcoming] = useState<any[]>([]);
  const [recent, setRecent] = useState<any[]>([]);
  const [standings, setStandings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);

    // Fetch team info
    fetch(`/api/teams?id=${id}`)
      .then(r => r.json())
      .then(d => {
        if (d?.data?.length > 0) {
          setTeam(d.data[0]);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!id || !team) return;

    // Fetch schedule via API
    fetch(`/api/teams/schedule?teamId=${id}&limit=20`)
      .then(r => r.json())
      .then(d => {
        setUpcoming(d.upcoming || []);
        setRecent(d.recent || []);
      })
      .catch(() => {});

    // Fetch standings for this team (NHL for now)
    fetch(`/api/highantly/standings?league_id=49291&season=2025`)
      .then(r => r.json())
      .then(d => {
        const standing = d?.standings?.find((s: any) => s.team_name === team.name);
        if (standing) setStandings(standing);
      })
      .catch(() => {});
  }, [id, team]);

  if (loading) {
    return (
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem 1rem' }}>
        <div className="skeleton" style={{ height: '1.5rem', width: '200px', marginBottom: '1rem' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: '120px' }} />)}
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem 1rem' }}>
        <Breadcrumbs links={[{ label: 'Teams', href: '/directory/teams' }]} />
        <h1 style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 700 }}>Team not found</h1>
      </div>
    );
  }

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
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.875rem', padding: '1rem 0' }}>
              No upcoming games scheduled.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {upcoming.map(m => (
                <GameCard key={m.id} match={m} teamName={team.name} isUpcoming={true} />
              ))}
            </div>
          )}
        </div>

        {/* Recent Results */}
        <div>
          <h2 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '1.125rem', color: '#fff', letterSpacing: '0.03em', marginBottom: '0.875rem' }}>
            RECENT RESULTS
          </h2>
          {recent.length === 0 ? (
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.875rem', padding: '1rem 0' }}>
              No recent results.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {recent.map(m => (
                <GameCard key={m.id} match={m} teamName={team.name} isUpcoming={false} />
              ))}
            </div>
          )}
        </div>

        {/* Standing */}
        <div>
          <h2 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '1.125rem', color: '#fff', letterSpacing: '0.03em', marginBottom: '0.875rem' }}>
            CURRENT STANDING
          </h2>
          {standings ? (
            <div style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', padding: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginBottom: '0.75rem' }}>
                {[
                  { label: 'Position', value: standings.position || '—' },
                  { label: 'Points', value: standings.points || 0 },
                  { label: 'Wins', value: standings.wins || 0 },
                  { label: 'Losses', value: standings.losses || 0 },
                  { label: 'OTL', value: standings.overtime_losses || 0 },
                  { label: 'Season', value: '2025' },
                ].map(s => (
                  <div key={s.label} style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: '0.2rem' }}>{s.label}</p>
                    <p style={{ fontSize: '1.25rem', fontWeight: 700, color: s.label === 'Position' ? '#C8102E' : '#fff' }}>{s.value}</p>
                  </div>
                ))}
              </div>
              <div style={{ height: '1px', background: '#333', margin: '0.75rem 0' }} />
              <p style={{ fontSize: '0.75rem', color: '#666', textAlign: 'center' }}>
                NHL · 2025 Season
              </p>
            </div>
          ) : (
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.875rem', padding: '1rem 0' }}>
              Standing data not available.
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