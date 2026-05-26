'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface StoredGame {
  date: string;
  home: string;
  away: string;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  period: string | null;
  ot?: boolean;
}

interface StoredSeries {
  desc: string;
  homeWins: number;
  awayWins: number;
  homeTeam: string;
  awayTeam: string;
  homeAbbr: string;
  awayAbbr: string;
  nextGame: any;
  games: StoredGame[];
}

interface StoredRound {
  seriesDesc: string;
  round: number;
  series: StoredSeries[];
}

interface UpdateEntry {
  id?: string;
  text: string;
  type: string;
  content?: string;
  author?: string;
  created_at?: string;
}

const PWHL_TEAL = '#4ECDC4';

export default function PWHLPlayoffsPage() {
  const [rounds, setRounds] = useState<StoredRound[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [updates, setUpdates] = useState<UpdateEntry[]>([]);

  const fetchUpdates = useCallback(async () => {
    try {
      const res = await fetch('/api/pwhl/playoffs/updates');
      if (res.ok) {
        const data = await res.json();
        setUpdates(data as UpdateEntry[]);
      }
    } catch {}
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/pwhl/playoffs?ts=' + Date.now());
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      if (data.rounds && data.rounds.length > 0) {
        setRounds(data.rounds);
      }
      setLastUpdated(new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' }));
      setLoading(false);
    } catch {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchUpdates();
    const interval = setInterval(fetchUpdates, 60000);
    return () => clearInterval(interval);
  }, [fetchData, fetchUpdates]);

  const roundLabels: Record<number, string> = {
    1: 'QUARTER-FINALS',
    2: 'SEMI-FINALS',
    3: 'WALTER CUP FINAL',
  };

  const formatUpdateTime = (iso?: string) => {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    } catch { return ''; }
  };

  const formatUpdateDate = (iso?: string) => {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch { return ''; }
  };

  const typeColors: Record<string, string> = {
    goal: '#fff', period: 'rgba(255,255,255,0.7)', final: PWHL_TEAL,
    start: '#4CAF50', update: 'rgba(255,255,255,0.65)', analysis: '#FFD700', trade: '#9C27B0',
  };

  function SeriesCard({ s }: { s: StoredSeries }) {
    const seriesOver = s.homeWins >= 3 || s.awayWins >= 3;
    const isInProgress = !seriesOver && (s.homeWins > 0 || s.awayWins > 0);
    return (
      <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1rem', opacity: seriesOver ? 0.55 : 1, transition: 'opacity 0.3s', borderTop: seriesOver ? `3px solid rgba(78,205,196,0.5)` : isInProgress ? `3px solid ${PWHL_TEAL}` : '3px solid transparent' }}>
        <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '0.5625rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{s.desc}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: seriesOver && s.awayWins >= 3 ? PWHL_TEAL : '#fff' }}>{s.awayTeam}</span>
            <span style={{ fontSize: '1rem', fontWeight: 800, color: seriesOver && s.awayWins >= 3 ? PWHL_TEAL : '#fff' }}>{s.awayWins}</span>
          </div>
          <div style={{ height: '1px', background: 'var(--border)' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: seriesOver && s.homeWins >= 3 ? PWHL_TEAL : '#fff' }}>{s.homeTeam}</span>
            <span style={{ fontSize: '1rem', fontWeight: 800, color: seriesOver && s.homeWins >= 3 ? PWHL_TEAL : '#fff' }}>{s.homeWins}</span>
          </div>
        </div>
        {s.nextGame?.date && !seriesOver && (
          <div style={{ marginTop: '0.5rem', textAlign: 'center' }}>
            <span style={{ fontSize: '0.5625rem', color: '#444' }}>
              Next: {new Date(s.nextGame.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          </div>
        )}

        {/* Game-by-game results */}
        <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {s.games.map((g, gi) => (
            <div key={gi} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.25rem 0.375rem', background: g.status === 'finished' ? 'rgba(78,205,196,0.03)' : 'transparent', borderRadius: '3px', fontSize: '0.6875rem' }}>
              <span style={{ color: 'rgba(255,255,255,0.2)', minWidth: 44 }}>{g.date?.slice(5)}</span>
              <span style={{ color: g.awayScore !== null && g.homeScore !== null ? (g.awayScore > g.homeScore ? '#fff' : 'rgba(255,255,255,0.4)') : 'rgba(255,255,255,0.3)' }}>
                {g.away} {g.awayScore ?? '-'}
              </span>
              <span style={{ color: 'rgba(255,255,255,0.15)' }}>@</span>
              <span style={{ color: g.homeScore !== null && g.awayScore !== null ? (g.homeScore > g.awayScore ? '#fff' : 'rgba(255,255,255,0.4)') : 'rgba(255,255,255,0.3)' }}>
                {g.home} {g.homeScore ?? '-'}
              </span>
              {g.ot && <span style={{ color: PWHL_TEAL, fontSize: '0.5625rem', fontWeight: 700 }}>OT</span>}
              <span style={{ color: g.status === 'finished' ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)', marginLeft: 'auto' }}>
                {g.status === 'finished' ? 'F' : g.status === 'scheduled' ? 'S' : ''}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1rem' }}>
        <Link href="/" style={{ color: '#555' }}>Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/directory/pwhl" style={{ color: '#555' }}>PWHL</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>Playoffs</span>
      </nav>

      <div style={{ marginBottom: '1rem' }}>
        <div className="label" style={{ color: PWHL_TEAL }}>2026 PWHL Playoffs</div>
        <h1 className="font-sport" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: '#fff', letterSpacing: '0.02em', lineHeight: 1 }}>
          2026 PWHL PLAYOFFS
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: PWHL_TEAL, boxShadow: `0 0 6px ${PWHL_TEAL}` }} />
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Backdated Results</span>
          {lastUpdated && <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.6875rem' }}>· Updated {lastUpdated}</span>}
        </div>
      </div>

      {/* Sub Nav */}
      <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
        {[
          { href: '/directory/pwhl', label: 'Overview' },
          { href: '/directory/pwhl/playoffs', label: 'Playoffs' },
        ].map(n => (
          <Link key={n.href} href={n.href} style={{ padding: '0.3rem 0.75rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, textDecoration: 'none', color: n.href === '/directory/pwhl/playoffs' ? PWHL_TEAL : 'rgba(255,255,255,0.55)', background: n.href === '/directory/pwhl/playoffs' ? `${PWHL_TEAL}22` : 'var(--s2)', border: `1px solid ${n.href === '/directory/pwhl/playoffs' ? PWHL_TEAL : 'var(--border)'}` }}>{n.label}</Link>
        ))}
      </div>

      <div style={{ height: '2px', background: `linear-gradient(90deg, ${PWHL_TEAL} 0%, #2a9d8f 100%)`, borderRadius: '2px', marginBottom: '1.5rem', width: '80px' }} />

      {/* Live Updates Feed */}
      <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1rem 1.25rem', marginBottom: '1.5rem', borderLeft: `3px solid ${PWHL_TEAL}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ fontSize: '0.5625rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.35)' }}>Live Updates</div>
          <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: PWHL_TEAL }} />
            <span style={{ fontSize: '0.5625rem', color: 'rgba(255,255,255,0.3)' }}>Refreshes every 60s</span>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto' }}>
          {updates.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '1rem 0', color: 'rgba(255,255,255,0.25)', fontSize: '0.8125rem' }}>
              No live updates yet — playoff updates will appear here during games.
            </div>
          ) : updates.map((u, i) => (
            <div key={u.id || i} style={{ display: 'flex', gap: '0.875rem', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: 56, flexShrink: 0 }}>
                <span style={{ fontSize: '0.625rem', fontWeight: 700, color: PWHL_TEAL, fontFamily: 'monospace', lineHeight: 1.2 }}>
                  {formatUpdateTime(u.created_at)}
                </span>
                <span style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace' }}>
                  {formatUpdateDate(u.created_at)}
                </span>
              </div>
              <span style={{ fontSize: '0.8125rem', color: typeColors[u.type] || 'rgba(255,255,255,0.65)', fontWeight: u.type === 'goal' || u.type === 'final' ? 700 : 400, lineHeight: 1.5 }}>
                {u.text || u.content}
              </span>
            </div>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[1, 2, 3].map(i => <div key={i} style={{ height: '120px', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }} />)}
        </div>
      ) : rounds.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '1rem', marginBottom: '0.375rem' }}>Playoff bracket available when the postseason begins.</p>
          <p style={{ color: 'rgba(255,255,255,0.18)', fontSize: '0.875rem' }}>Typically runs April through May.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {rounds.map((round: StoredRound) => (
            <div key={round.seriesDesc}>
              <h2 className="font-sport" style={{ fontSize: '1rem', color: round.round === 3 ? PWHL_TEAL : '#fff', letterSpacing: '0.1em', marginBottom: '0.75rem', paddingBottom: '0.375rem', borderBottom: round.round === 3 ? `2px solid ${PWHL_TEAL}` : '1px solid var(--border)' }}>
                {roundLabels[round.round] || `ROUND ${round.round}`}
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(round.series.length, 4)}, 1fr)`, gap: '0.75rem' }}>
                {round.series.map((s: StoredSeries, sIdx: number) => (
                  <SeriesCard key={sIdx} s={s} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <Link href="/directory/pwhl" style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8125rem', textDecoration: 'none' }}>← PWHL Overview</Link>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Link href="/directory/ahl/playoffs" style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8125rem', textDecoration: 'none' }}>AHL Playoffs →</Link>
          <Link href="/directory/nhl/playoffs" style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8125rem', textDecoration: 'none' }}>NHL Playoffs →</Link>
        </div>
      </div>
    </div>
  );
}
