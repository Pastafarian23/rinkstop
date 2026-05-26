'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';

interface StoredSeries {
  desc: string;
  homeWins: number;
  awayWins: number;
  homeTeam: string;
  awayTeam: string;
  homeAbbr: string;
  awayAbbr: string;
  nextGame: any;
  games: any[];
}

interface StoredRound {
  seriesDesc: string;
  round: number;
  series: StoredSeries[];
}

const AHL_RED = '#003DA5';
const AHL_GOLD = '#FFB81C';

export default function AHLPlayoffsPage() {
  const [rounds, setRounds] = useState<StoredRound[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [updates, setUpdates] = useState<any[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const updatesIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchUpdates = useCallback(async () => {
    try {
      const res = await fetch('/api/ahl/playoffs/updates');
      if (res.ok) {
        const data = await res.json();
        setUpdates(data as any[]);
      }
    } catch {}
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/ahl/playoffs?ts=' + Date.now());
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

    const updatesInterval = setInterval(fetchUpdates, 60000);
    updatesIntervalRef.current = updatesInterval;

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (updatesIntervalRef.current) clearInterval(updatesIntervalRef.current);
    };
  }, [fetchData, fetchUpdates]);

  const roundLabels: Record<number, string> = {
    1: 'QUARTER-FINALS',
    2: 'SEMI-FINALS',
    3: 'CONFERENCE FINALS',
    4: 'CALDER CUP FINAL',
  };

  const getLogoUrl = (abbr: string) => {
    const logoMap: Record<string, string> = {
      'CHI': 'https://assets.nhle.com/logos/n/svg/CHI_light.svg',
      'COL': 'https://assets.nhle.com/logos/n/svg/COL_light.svg',
      'TOR': 'https://assets.nhle.com/logos/n/svg/TOR_light.svg',
      'WBS': 'https://assets.nhle.com/logos/n/svg/WBS_light.svg',
      'CLE': 'https://assets.nhle.com/logos/n/svg/CLE_light.svg',
      'SPR': 'https://assets.nhle.com/logos/n/svg/SPR_light.svg',
      'GR': 'https://assets.nhle.com/logos/n/svg/GR_light.svg',
      'CVF': '',
    };
    return logoMap[abbr] || '';
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
    goal: '#fff', period: 'rgba(255,255,255,0.7)', final: AHL_RED,
    start: '#4CAF50', update: 'rgba(255,255,255,0.65)', analysis: '#FFD700', trade: '#9C27B0',
  };

  const allGames = rounds.flatMap((r: StoredRound) =>
    r.series.flatMap((s: StoredSeries) => s.games.filter((g: any) => g.status === 'finished'))
  );
  const hasLiveUpdates = allGames.length > 0;

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1rem' }}>
        <Link href="/" style={{ color: '#555' }}>Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/directory/ahl" style={{ color: '#555' }}>AHL</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>Playoffs</span>
      </nav>

      <div style={{ marginBottom: '1rem' }}>
        <div className="label" style={{ color: AHL_GOLD }}>2026 Calder Cup Playoffs</div>
        <h1 className="font-sport" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: '#fff', letterSpacing: '0.02em', lineHeight: 1 }}>
          AHL PLAYOFFS  --  LIVE
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: AHL_RED, boxShadow: `0 0 6px ${AHL_RED}`, animation: 'pulse 2s infinite' }} />
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Live Coverage</span>
          {lastUpdated && <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.6875rem' }}>· Updated {lastUpdated}</span>}
        </div>
      </div>

      {/* Sub Nav */}
      <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
        {[
          { href: '/directory/ahl', label: 'Overview' },
          { href: '/directory/ahl/playoffs', label: 'Playoffs' },
        ].map(n => (
          <Link key={n.href} href={n.href} style={{ padding: '0.3rem 0.75rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, textDecoration: 'none', color: 'rgba(255,255,255,0.55)', background: 'var(--s2)', border: '1px solid var(--border)' }}>{n.label}</Link>
        ))}
      </div>

      <div style={{ height: '2px', background: `linear-gradient(90deg, ${AHL_RED} 0%, ${AHL_GOLD} 100%)`, borderRadius: '2px', marginBottom: '1.5rem', width: '80px' }} />

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[1, 2, 3].map(i => <div key={i} style={{ height: '120px', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }} />)}
        </div>
      ) : rounds.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '1rem', marginBottom: '0.375rem' }}>Playoff bracket available when the postseason begins.</p>
          <p style={{ color: 'rgba(255,255,255,0.18)', fontSize: '0.875rem' }}>Typically runs April through June.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {rounds.map((round: StoredRound) => (
            <div key={round.seriesDesc}>
              <h2 className="font-sport" style={{ fontSize: '1rem', color: round.round === 4 ? AHL_GOLD : '#fff', letterSpacing: '0.1em', marginBottom: '0.75rem', paddingBottom: '0.375rem', borderBottom: round.round === 4 ? `2px solid ${AHL_GOLD}` : '1px solid var(--border)' }}>
                {roundLabels[round.round] || `ROUND ${round.round}`}
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(round.series.length, 4)}, 1fr)`, gap: '0.75rem' }}>
                {round.series.map((s: StoredSeries, sIdx: number) => {
                  const seriesOver = s.homeWins >= 4 || s.awayWins >= 4;
                  const isInProgress = !seriesOver && (s.homeWins > 0 || s.awayWins > 0);
                  return (
                    <div key={sIdx} style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1rem', opacity: seriesOver ? 0.55 : 1, transition: 'opacity 0.3s', borderTop: seriesOver ? `3px solid rgba(0,61,165,0.5)` : isInProgress ? `3px solid ${AHL_GOLD}` : '3px solid transparent' }}>
                      <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.5625rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{s.desc}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                            {getLogoUrl(s.awayAbbr) && <img src={getLogoUrl(s.awayAbbr)} alt="" style={{ width: 24, height: 24, objectFit: 'contain' }} onError={(e: any) => { e.target.style.display = 'none'; }} />}
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: seriesOver && s.awayWins >= 4 ? AHL_GOLD : '#fff' }}>{s.awayTeam.split(' ').pop()}</span>
                          </div>
                          <span style={{ fontSize: '1rem', fontWeight: 800, color: seriesOver && s.awayWins >= 4 ? AHL_GOLD : '#fff' }}>{s.awayWins}</span>
                        </div>
                        <div style={{ height: '1px', background: 'var(--border)' }} />
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                            {getLogoUrl(s.homeAbbr) && <img src={getLogoUrl(s.homeAbbr)} alt="" style={{ width: 24, height: 24, objectFit: 'contain' }} onError={(e: any) => { e.target.style.display = 'none'; }} />}
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: seriesOver && s.homeWins >= 4 ? AHL_GOLD : '#fff' }}>{s.homeTeam.split(' ').pop()}</span>
                          </div>
                          <span style={{ fontSize: '1rem', fontWeight: 800, color: seriesOver && s.homeWins >= 4 ? AHL_GOLD : '#fff' }}>{s.homeWins}</span>
                        </div>
                      </div>
                      {s.nextGame?.date && !seriesOver && (
                        <div style={{ marginTop: '0.5rem', textAlign: 'center' }}>
                          <span style={{ fontSize: '0.5625rem', color: '#444' }}>
                            Next: {new Date(s.nextGame.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Game-by-game results */}
              <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                {s.games.map((g: any, gi: number) => (
                  <div key={gi} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.375rem 0.5rem', background: g.status === 'finished' ? 'rgba(255,255,255,0.02)' : 'transparent', borderRadius: '4px', fontSize: '0.75rem' }}>
                    <span style={{ color: 'rgba(255,255,255,0.2)', minWidth: 50 }}>{g.date?.slice(5)}</span>
                    <span style={{ color: g.awayScore !== null && g.homeScore !== null ? (g.awayScore > g.homeScore ? '#fff' : 'rgba(255,255,255,0.4)') : 'rgba(255,255,255,0.3)' }}>
                      {g.away} {g.awayScore ?? '-'}
                    </span>
                    <span style={{ color: 'rgba(255,255,255,0.15)' }}>@</span>
                    <span style={{ color: g.homeScore !== null && g.awayScore !== null ? (g.homeScore > g.awayScore ? '#fff' : 'rgba(255,255,255,0.4)') : 'rgba(255,255,255,0.3)' }}>
                      {g.home} {g.homeScore ?? '-'}
                    </span>
                    {g.ot && <span style={{ color: AHL_GOLD, fontSize: '0.625rem', fontWeight: 700 }}>OT</span>}
                    <span style={{ color: g.status === 'finished' ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.15)', marginLeft: 'auto' }}>
                      {g.status === 'finished' ? 'Final' : g.status === 'scheduled' ? 'Scheduled' : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <Link href="/directory/ahl" style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8125rem', textDecoration: 'none' }}>← AHL Overview</Link>
        <Link href="/directory/pwhl/playoffs" style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8125rem', textDecoration: 'none' }}>PWHL Playoffs →</Link>
      </div>

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </div>
  );
}
