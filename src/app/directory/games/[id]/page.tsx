'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import ShareButton from '@/components/ShareButton';
import { type SharePayload } from '@/lib/share';

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
}

const statusStyle: Record<string, { color: string; label: string }> = {
  scheduled: { color: '#555', label: 'Scheduled' },
  in_progress: { color: '#00d4ff', label: 'In Progress' },
  completed: { color: '#34d399', label: 'Completed' },
  cancelled: { color: '#C8102E', label: 'Cancelled' },
  postponed: { color: '#fbbf24', label: 'Postponed' },
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

export default function GamePage() {
  const params = useParams();
  const gameId = params.id as string;

  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!gameId) return;

    // First try to fetch from our API
    fetch(`/api/scores?limit=100`)
      .then(r => r.json())
      .then(allGames => {
        const found = Array.isArray(allGames) ? allGames.find((g: any) => g.id === gameId) : null;
        if (found) {
          setGame(found);
          setLoading(false);
          return;
        }

        // Fallback: fetch directly from NHL API using game ID
        // The game ID might be the UUID from fixtures or the NHL game ID
        setLoading(false);
        setError('Game not found in database');
      })
      .catch(err => {
        setLoading(false);
        setError(err.message);
      });
  }, [gameId]);

  if (loading) {
    return (
      <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
        <div className="skeleton" style={{ width: '60px', height: '60px', borderRadius: '50%', margin: '0 auto 1rem' }} />
        <div className="skeleton" style={{ width: '200px', height: '24px', margin: '0 auto' }} />
      </div>
    );
  }

  if (error || !game) {
    return (
      <div style={{ maxWidth: '600px', marginLeft: 'auto', marginRight: 'auto', padding: '4rem 2rem', textAlign: 'center' }}> 
        <h1 style={{ fontSize: '2rem', color: '#fff', marginBottom: '1rem' }}>Game Not Found</h1>
        <p style={{ color: 'rgba(255,255,255,0.5)' }}>This game doesn&apos;t exist or has been removed.</p>
        <Link href="/directory/games" style={{ color: '#C8102E', display: 'inline-block', marginTop: '1rem' }}>
          ← Back to Scores
        </Link>
      </div>
    );
  }

  const s = statusStyle[game.status] || statusStyle.scheduled;
  const homeName = game.home_team?.name || 'Home';
  const awayName = game.away_team?.name || 'Away';

  return (
      <div style={{ maxWidth: '700px', marginLeft: 'auto', marginRight: 'auto', padding: '2rem 1rem', textAlign: 'center' }}> 
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1rem' }}>
        <Link href="/" style={{ color: '#555' }}>Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/directory/games" style={{ color: '#555' }}>Scores</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>{awayName} @ {homeName}</span>
      </nav>

      {/* Game Header */}
      <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '2rem', textAlign: 'center', marginBottom: '1.5rem' }}>
        {/* Date */}
        <p style={{ fontSize: '0.875rem', color: '#888', marginBottom: '1.5rem' }}>
          {formatDate(game.scheduled_at || game.date)}
        </p>

        {/* Teams */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem' }}>
          {/* Away */}
          <div style={{ textAlign: 'center' }}>
            {game.away_team?.logo_url && (
              <img src={game.away_team.logo_url} alt="" style={{ width: '64px', height: '64px', objectFit: 'contain', marginBottom: '0.5rem' }} />
            )}
            <p style={{ fontSize: '1.125rem', fontWeight: 700, color: '#fff' }}>{awayName}</p>
            {game.away_team && (
              <p style={{ fontSize: '0.75rem', color: '#555' }}>@{game.away_team.slug?.toUpperCase()}</p>
            )}
          </div>

          {/* Score */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
              <span style={{ fontSize: '2.5rem', fontWeight: 800, color: game.away_score !== null ? '#fff' : '#555' }}>
                {game.away_score ?? '-'}
              </span>
              <span style={{ color: '#333', fontSize: '1.25rem' }}>@</span>
              <span style={{ fontSize: '2.5rem', fontWeight: 800, color: game.home_score !== null ? '#fff' : '#555' }}>
                {game.home_score ?? '-'}
              </span>
            </div>
            <span style={{
              display: 'inline-block',
              marginTop: '0.75rem',
              padding: '0.25rem 0.75rem',
              borderRadius: '99px',
              fontSize: '0.6875rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              color: s.color,
              border: `1px solid ${s.color}40`,
            }}>
              {s.label}
            </span>
          </div>

          {/* Home */}
          <div style={{ textAlign: 'center' }}>
            {game.home_team?.logo_url && (
              <img src={game.home_team.logo_url} alt="" style={{ width: '64px', height: '64px', objectFit: 'contain', marginBottom: '0.5rem' }} />
            )}
            <p style={{ fontSize: '1.125rem', fontWeight: 700, color: '#fff' }}>{homeName}</p>
            {game.home_team && (
              <p style={{ fontSize: '0.75rem', color: '#555' }}>{game.home_team.slug?.toUpperCase()}</p>
            )}
          </div>
        </div>

        {/* League */}
        {game.league?.name && (
          <p style={{ fontSize: '0.875rem', color: '#666', marginTop: '0.5rem' }}>{game.league.name}</p>
        )}

        {/* Venue */}
        {game.venue_details?.name && (
          <p style={{ fontSize: '0.75rem', color: '#444', marginTop: '0.25rem' }}>@{game.venue_details.name}</p>
        )}

        {/* Share — full popover (X, FB, LI, WhatsApp, Reddit, Email, Copy).
            Built from the loaded game state. Mobile uses native share sheet.
            This is the generic /directory/games/[id] page (not NHL); the
            share URL points back here, not to /directory/nhl/games/[slug]. */}
        <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'center' }}>
          <ShareButton
            payload={{
              title: `${awayName} at ${homeName} — RinkStop`,
              text: game.status === 'completed' && game.home_score !== null && game.away_score !== null
                ? `${awayName} at ${homeName} — Final ${game.away_score}-${game.home_score}.`
                : `${awayName} at ${homeName} on RinkStop.`,
              url: `${typeof window !== 'undefined' ? window.location.origin : 'https://rinkstop.com'}/directory/games/${game.id}`,
            } satisfies SharePayload}
            variant="brand"
          />
        </div>
      </div>

      {/* Period Scores */}
      {game.period_scores && Array.isArray(game.period_scores) && (
        <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '0.75rem', fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>Period Scores</h3>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            {game.period_scores.map((p: any, i: number) => (
              <div key={i} style={{ background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.75rem 1rem', textAlign: 'center' }}>
                <p style={{ fontSize: '0.625rem', color: '#555', marginBottom: '0.25rem' }}>P{i + 1}</p>
                <p style={{ fontSize: '1rem', fontWeight: 700, color: '#fff' }}>{p.home} - {p.away}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Back Link */}
      <div style={{ textAlign: 'center' }}>
        <Link href="/directory/games" style={{ color: '#C8102E', fontSize: '0.875rem', fontWeight: 600 }}>
          ← Back to All Scores
        </Link>
      </div>
    </div>
  );
}