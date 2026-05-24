'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

const BASE_URL = 'https://rinkstop.com';

<<<<<<< Updated upstream
export default function FixturesPage() {
  const [fixtures, setFixtures] = useState<any[]>([]);
=======
export default function GamesPage() {
  const [games, setGames] = useState<any[]>([]);
>>>>>>> Stashed changes
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
<<<<<<< Updated upstream
    fetch('/api/fixtures').then(r => r.json()).then(d => {
      setFixtures(d || []);
=======
    fetch('/api/games').then(r => r.json()).then(d => {
      setGames(d || []);
>>>>>>> Stashed changes
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
<<<<<<< Updated upstream
    if (fixtures.length === 0) return;
=======
    if (games.length === 0) return;
>>>>>>> Stashed changes

    const breadcrumbSchema = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
        { '@type': 'ListItem', position: 2, name: 'Scores', item: `${BASE_URL}/directory/games` },
      ],
    };

<<<<<<< Updated upstream
    const events = fixtures.map((f: any) => ({
=======
    const events = games.map((f: any) => ({
>>>>>>> Stashed changes
      '@type': 'SportsEvent',
      name: `${f.home_team?.name || 'Home'} vs ${f.away_team?.name || 'Away'}`,
      startDate: f.scheduled_at,
      location: f.venue?.name ? { '@type': 'Place', name: f.venue.name } : undefined,
      competitor: [
        f.home_team ? { '@type': 'SportsTeam', name: f.home_team.name } : undefined,
        f.away_team ? { '@type': 'SportsTeam', name: f.away_team.name } : undefined,
      ].filter(Boolean),
    }));

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify([breadcrumbSchema, ...events]);
    document.head.appendChild(script);
    return () => { document.head.removeChild(script); };;
<<<<<<< Updated upstream
  }, [fixtures]);
=======
  }, [games]);
>>>>>>> Stashed changes

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  const statusStyle: Record<string, { color: string; label: string }> = {
    scheduled:  { color: '#555',    label: 'Scheduled'  },
    in_progress:{ color: '#00d4ff', label: 'In Progress'},
    completed: { color: '#34d399', label: 'Completed'  },
    cancelled: { color: '#C8102E', label: 'Cancelled'  },
    postponed:  { color: '#fbbf24', label: 'Postponed'  },
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
<<<<<<< Updated upstream
      ) : fixtures.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '1rem', marginBottom: '0.375rem' }}>No fixtures yet.</p>
=======
      ) : games.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '1rem', marginBottom: '0.375rem' }}>No games yet.</p>
>>>>>>> Stashed changes
          <p style={{ color: 'rgba(255,255,255,0.18)', fontSize: '0.875rem' }}>Game schedules and results will appear here once data is available.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
<<<<<<< Updated upstream
          {fixtures.map((f: any) => {
=======
          {games.map((f: any) => {
>>>>>>> Stashed changes
            const s = statusStyle[f.status] || statusStyle.scheduled;
            return (
              <div key={f.id} style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ textAlign: 'center', minWidth: '80px' }}>
                  <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#fff' }}>{f.home_team?.name || 'Home'}</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', marginTop: '0.2rem' }}>{f.home_score ?? '-'}</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: '0.6875rem', color: '#555', marginBottom: '0.25rem' }}>{formatDate(f.scheduled_at)}</p>
                  <span style={{ display: 'inline-block', padding: '0.2rem 0.5rem', borderRadius: '99px', fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: s.color, border: `1px solid ${s.color}40` }}>
                    {s.label}
                  </span>
                </div>
                <div style={{ textAlign: 'center', minWidth: '80px' }}>
                  <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#fff' }}>{f.away_team?.name || 'Away'}</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', marginTop: '0.2rem' }}>{f.away_score ?? '-'}</p>
                </div>
                {f.venue?.name && (
                  <p style={{ width: '100%', textAlign: 'center', fontSize: '0.6875rem', color: '#444', marginTop: '0.25rem' }}>{f.venue.name}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}