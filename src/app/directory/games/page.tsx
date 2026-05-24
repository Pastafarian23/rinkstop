'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

const BASE_URL = 'https://rinkstop.com';

interface Game {
  id: string;
  date: string;
  status: string;
  home_team_id: string;
  away_team_id: string;
  home_score: number | null;
  away_score: number | null;
  scheduled_at: string;
  home_team: { name: string; logo_url: string | null; slug: string } | null;
  away_team: { name: string; logo_url: string | null; slug: string } | null;
  league: { name: string } | null;
  venue_details: any;
  period_scores: any;
  referees: any;
}

const statusStyle: Record<string, { color: string; label: string }> = {
  scheduled:  { color: '#555',    label: 'Scheduled'  },
  in_progress:{ color: '#00d4ff', label: 'In Progress'},
  completed: { color: '#34d399', label: 'Completed'  },
  cancelled: { color: '#C8102E', label: 'Cancelled'  },
  postponed:  { color: '#fbbf24', label: 'Postponed'  },
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

function PeriodScores({ scores }: any) {
  if (!scores || !Array.isArray(scores)) return null;
  return (
    <span style={{ fontSize: '0.625rem', color: '#444', marginLeft: '0.5rem' }}>
      [{scores.map((p: any, i: number) => `P${i+1}: ${p.home}-${p.away}`).join(' ')}]
    </span>
  );
}

function GameCard({ game }: { game: Game }) {
  const s = statusStyle[game.status] || statusStyle.scheduled;
  const homeName = game.home_team?.name || game.home_team_id?.slice(0, 8) || 'Home';
  const awayName = game.away_team?.name || game.away_team_id?.slice(0, 8) || 'Away';

  return (
    <div style={{
      background: 'var(--s2)',
      border: '1px solid var(--border)',
      borderRadius: '8px',
      padding: '1rem 1.25rem',
      display: 'grid',
      gridTemplateColumns: '1fr auto 1fr',
      alignItems: 'center',
      gap: '1rem',
    }}>
      {/* Home team */}
      <div style={{ textAlign: game.home_team?.slug ? 'left' : 'center' }}>
        {game.home_team?.slug ? (
          <Link href={`/directory/teams/${game.home_team.slug}`} style={{ textDecoration: 'none' }}>
            {game.home_team.logo_url && (
              <img src={game.home_team.logo_url} alt="" style={{ width: '28px', height: '28px', objectFit: 'contain', marginBottom: '4px' }} />
            )}
            <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#fff' }}>{homeName}</p>
          </Link>
        ) : (
          <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#fff' }}>{homeName}</p>
        )}
      </div>

      {/* Score + status */}
      <div style={{ textAlign: 'center', minWidth: '80px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>{game.home_score ?? '-'}</span>
          <span style={{ color: '#333', fontSize: '0.875rem' }}>@</span>
          <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>{game.away_score ?? '-'}</span>
        </div>
        <p style={{ fontSize: '0.6875rem', color: '#555', marginTop: '0.25rem' }}>{formatDate(game.scheduled_at || game.date)}</p>
        <span style={{
          display: 'inline-block',
          marginTop: '0.25rem',
          padding: '0.15rem 0.4rem',
          borderRadius: '99px',
          fontSize: '0.5rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: s.color,
          border: `1px solid ${s.color}40`,
        }}>
          {s.label}
        </span>
      </div>

      {/* Away team */}
      <div style={{ textAlign: game.away_team?.slug ? 'right' : 'center' }}>
        {game.away_team?.slug ? (
          <Link href={`/directory/teams/${game.away_team.slug}`} style={{ textDecoration: 'none' }}>
            {game.away_team.logo_url && (
              <img src={game.away_team.logo_url} alt="" style={{ width: '28px', height: '28px', objectFit: 'contain', marginBottom: '4px' }} />
            )}
            <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#fff' }}>{awayName}</p>
          </Link>
        ) : (
          <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#fff' }}>{awayName}</p>
        )}
      </div>

      {/* Metadata footer */}
      {(game.period_scores || game.venue_details?.name || game.league?.name) && (
        <div style={{ gridColumn: '1 / -1', textAlign: 'center', marginTop: '0.25rem' }}>
          {game.league?.name && <span style={{ fontSize: '0.6875rem', color: '#666' }}>{game.league.name}</span>}
          {game.period_scores && <PeriodScores scores={game.period_scores} />}
          {game.venue_details?.name && <span style={{ fontSize: '0.6875rem', color: '#444', marginLeft: '0.5rem' }}>@{game.venue_details.name}</span>}
        </div>
      )}
    </div>
  );
}

export default function GamesPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch('/api/games?limit=50')
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d)) setGames(d);
        else if (d?.data) setGames(d.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (games.length === 0) return;
    const breadcrumbSchema = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
        { '@type': 'ListItem', position: 2, name: 'Scores', item: `${BASE_URL}/directory/games` },
      ],
    };
    const events = games.map(g => ({
      '@type': 'SportsEvent',
      name: `${g.home_team?.name || 'Home'} vs ${g.away_team?.name || 'Away'}`,
      startDate: g.date,
      location: g.venue_details?.name ? { '@type': 'Place', name: g.venue_details.name } : undefined,
      competitor: [
        g.home_team ? { '@type': 'SportsTeam', name: g.home_team.name } : undefined,
        g.away_team ? { '@type': 'SportsTeam', name: g.away_team.name } : undefined,
      ].filter(Boolean),
    }));
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify([breadcrumbSchema, ...events]);
    document.head.appendChild(script);
    return () => { document.head.removeChild(script); };
  }, [games]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1rem' }}>
        <Link href="/" style={{ color: '#555' }}>Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>Scores</span>
      </nav>

      <div style={{ marginBottom: '1.5rem' }}>
        <div className="label">Live &amp; Recent</div>
        <h1 className="font-sport" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: '#fff', letterSpacing: '0.02em', lineHeight: 1 }}>
          SCORES &amp; FIXTURES
        </h1>
      </div>

      <div style={{ height: '2px', background: 'linear-gradient(90deg, #C8102E 0%, #041E42 100%)', borderRadius: '2px', marginBottom: '1.5rem', width: '80px' }} />

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: '80px', borderRadius: '8px' }} />)}
        </div>
      ) : games.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '1rem', marginBottom: '0.375rem' }}>No games yet.</p>
          <p style={{ color: 'rgba(255,255,255,0.18)', fontSize: '0.875rem' }}>Game schedules and results will appear here once data is available.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {games.map(g => <GameCard key={g.id} game={g} />)}
        </div>
      )}
    </div>
  );
}// trigger production deploy Sun May 24 15:54:14 UTC 2026
// Final attempt Sun May 24 16:15:30 UTC 2026
