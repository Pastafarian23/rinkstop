'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

const BASE_URL = 'https://rinkstop.com';

export default function GamesPage() {
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch('/api/games').then(r => r.json()).then(d => {
      setGames(d || []);
      setLoading(false);
    }).catch(() => setLoading(false));
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

    const events = games.map((f: any) => ({
      '@type': 'SportsEvent',
      name: `${f.home_team?.name || f.home_team_name || 'Home'} vs ${f.away_team?.name || f.away_team_name || 'Away'}`,
      startDate: f.date || f.scheduled_at,
      location: f.venue ? { '@type': 'Place', name: f.venue } : undefined,
      competitor: [
        f.home_team?.name || f.home_team_name ? { '@type': 'SportsTeam', name: f.home_team?.name || f.home_team_name } : undefined,
        f.away_team?.name || f.away_team_name ? { '@type': 'SportsTeam', name: f.away_team?.name || f.away_team_name } : undefined,
      ].filter(Boolean),
    }));

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify([breadcrumbSchema, ...events]);
    document.head.appendChild(script);
    return () => { document.head.removeChild(script); };
  }, [games]);

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  const statusStyle: Record<string, { color: string; label: string }> = {
    scheduled:  { color: '#555',    label: 'Scheduled'  },
    in_progress:{ color: '#00d4ff', label: 'In Progress'},
    completed: { color: '#34d399', label: 'Completed'  },
    live:       { color: '#00d4ff', label: 'Live'        },
    finished:   { color: '#34d399', label: 'Finished'   },
    cancelled: { color: '#C8102E', label: 'Cancelled'  },
    postponed:  { color: '#fbbf24', label: 'Postponed'  },
  };

  const getTeamName = (g: any, side: 'home' | 'away') => {
    if (side === 'home') {
      return g.home_team?.name || g.home_team_name || 'Home';
    }
    return g.away_team?.name || g.away_team_name || 'Away';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {/* Breadcrumb */}
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1rem' }}>
        <Link href="/" style={{ color: '#555' }}>Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>Scores</span>
      </nav>

      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div className="label">Live &amp; Recent</div>
        <h1 className="font-sport" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: '#fff', letterSpacing: '0.02em', lineHeight: 1 }}>
          SCORES &amp; FIXTURES
        </h1>
      </div>

      {/* Line accent */}
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
          {games.map((g: any) => {
            const rawStatus = g.status?.toLowerCase() || 'scheduled';
            const s = statusStyle[rawStatus] || statusStyle.scheduled;
            const homeName = getTeamName(g, 'home');
            const awayName = getTeamName(g, 'away');
            return (
              <div key={g.id} style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ textAlign: 'center', minWidth: '80px' }}>
                  <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#fff' }}>{homeName}</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', marginTop: '0.2rem' }}>{g.home_score ?? '-'}</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: '0.6875rem', color: '#555', marginBottom: '0.25rem' }}>{formatDate(g.date)}</p>
                  <span style={{ display: 'inline-block', padding: '0.2rem 0.5rem', borderRadius: '99px', fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: s.color, border: `1px solid ${s.color}40` }}>
                    {s.label}
                  </span>
                </div>
                <div style={{ textAlign: 'center', minWidth: '80px' }}>
                  <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#fff' }}>{awayName}</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', marginTop: '0.2rem' }}>{g.away_score ?? '-'}</p>
                </div>
                {g.venue && (
                  <p style={{ width: '100%', textAlign: 'center', fontSize: '0.6875rem', color: '#444', marginTop: '0.25rem' }}>{g.venue}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}