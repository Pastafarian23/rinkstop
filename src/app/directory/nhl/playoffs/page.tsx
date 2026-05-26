'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import TicketmasterAd from '@/components/TicketmasterAd';

interface UpdateEntry {
  id?: string;
  time: string;
  text: string;
  type: string;
  content?: string;
  game_id?: string;
  game_label?: string;
  author?: string;
  created_at?: string;
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
  games: any[];
}

interface StoredRound {
  seriesDesc: string;
  round: number;
  series: StoredSeries[];
}

export default function PlayoffsPage() {
  const [rounds, setRounds] = useState<StoredRound[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [updates, setUpdates] = useState<UpdateEntry[]>([]);
  const [isGameWindow, setIsGameWindow] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const updatesIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isActiveGameWindow = useCallback(() => {
    const now = new Date();
    const hour = now.getUTCHours();
    // Active game windows: roughly 6pm-midnight ET (22:00-04:00 UTC)
    return hour >= 22 || hour < 4;
  }, []);

  const fetchUpdates = useCallback(async () => {
    try {
      const res = await fetch('/api/nhl/playoffs/updates');
      if (res.ok) {
        const data = await res.json();
        setUpdates(data as UpdateEntry[]);
      }
    } catch {}
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/nhl/playoffs?ts=' + Date.now());
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      if (data.games && data.games.length > 0) {
        setRounds(data.rounds || []);
      } else if (data.rounds && data.rounds.length > 0) {
        setRounds(data.rounds);
      }
      setLastUpdated(new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' }));
      setLoading(false);
    } catch {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const checkGameWindow = () => {
      setIsGameWindow(isActiveGameWindow());
    };
    checkGameWindow();
    const windowInterval = setInterval(checkGameWindow, 60000);


    fetchData();
    fetchUpdates();

    // During games: poll every 30s. Outside games: every 10 minutes
    const updatesInterval = setInterval(fetchUpdates, isActiveGameWindow() ? 30000 : 600000);
    updatesIntervalRef.current = updatesInterval;

    return () => {
      clearInterval(windowInterval);
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (updatesIntervalRef.current) clearInterval(updatesIntervalRef.current);
    };
  }, [fetchData, fetchUpdates, isActiveGameWindow]);

  const roundLabels: Record<number, string> = {
    1: 'FIRST ROUND',
    2: 'SECOND ROUND',
    3: 'CONFERENCE FINALS',
    4: 'STANLEY CUP FINAL',
  };

  const getLogoUrl = (abbr: string) =>
    `https://assets.nhle.com/logos/n/svg/${abbr}_light.svg`;

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
    goal: '#fff', period: 'rgba(255,255,255,0.7)', final: '#C8102E',
    start: '#4CAF50', update: 'rgba(255,255,255,0.65)', analysis: '#FFD700', trade: '#9C27B0',
  };

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1rem' }}>
        <Link href="/" style={{ color: '#555' }}>Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/directory/nhl" style={{ color: '#555' }}>NHL</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>Playoffs</span>
      </nav>

      <div style={{ marginBottom: '1rem' }}>
        <div className="label">2026 Stanley Cup Playoffs</div>
        <h1 className="font-sport" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: '#fff', letterSpacing: '0.02em', lineHeight: 1 }}>
          NHL PLAYOFFS  --  LIVE
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#C8102E', boxShadow: '0 0 6px #C8102E', animation: 'pulse 2s infinite' }} />
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Live Coverage</span>
          {lastUpdated && <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.6875rem' }}>· Updated {lastUpdated}</span>}
        </div>
      </div>

      {/* Ticketmaster NHL Banner - 468x60 */}
      <TicketmasterAd size="468x60" />

      {/* Live Updates Feed */}
      <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1rem 1.25rem', marginBottom: '1.5rem', borderLeft: '3px solid #C8102E' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ fontSize: '0.5625rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.35)' }}>Live Updates</div>
          <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#C8102E', animation: 'pulse 2s infinite' }} />
            <span style={{ fontSize: '0.5625rem', color: 'rgba(255,255,255,0.3)' }}>Refreshes every 30s</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '400px', overflowY: 'auto' }}>
          {updates.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '1.5rem 0', color: 'rgba(255,255,255,0.25)', fontSize: '0.8125rem' }}>Loading updates...</div>
          ) : updates.map((u, i) => (
            <div key={u.id || i} style={{ display: 'flex', gap: '0.875rem', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: 56, flexShrink: 0 }}>
                <span style={{ fontSize: '0.625rem', fontWeight: 700, color: '#C8102E', fontFamily: 'monospace', lineHeight: 1.2 }}>
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

      {/* Sub Nav */}
      <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
        {[{ href: '/directory/nhl', label: 'Scores' }, { href: '/directory/nhl/playoffs', label: 'Playoffs' }, { href: '/directory/nhl/standings', label: 'Standings' }, { href: '/directory/nhl/player-stats', label: 'Player Stats' }, { href: '/directory/nhl/history', label: 'History' }].map(n => (
          <Link key={n.href} href={n.href} style={{ padding: '0.3rem 0.75rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, textDecoration: 'none', color: 'rgba(255,255,255,0.55)', background: 'var(--s2)', border: '1px solid var(--border)' }}>{n.label}</Link>
        ))}
      </div>

      <div style={{ height: '2px', background: 'linear-gradient(90deg, #C8102E 0%, #041E42 100%)', borderRadius: '2px', marginBottom: '1.5rem', width: '80px' }} />

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
              <h2 className="font-sport" style={{ fontSize: '1rem', color: round.round === 4 ? '#C8102E' : '#fff', letterSpacing: '0.1em', marginBottom: '0.75rem', paddingBottom: '0.375rem', borderBottom: round.round === 4 ? '2px solid #C8102E' : '1px solid var(--border)' }}>
                {roundLabels[round.round] || `ROUND ${round.round}`}
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(round.series.length, 4)}, 1fr)`, gap: '0.75rem' }}>
                {round.series.map((s: StoredSeries, sIdx: number) => {
                  const seriesOver = s.homeWins === 4 || s.awayWins === 4;
                  return (
                    <div key={sIdx} style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1rem', opacity: seriesOver ? 0.55 : 1, transition: 'opacity 0.3s', borderTop: seriesOver ? '3px solid rgba(200,16,46,0.5)' : '3px solid transparent' }}>
                      <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.5625rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{s.desc}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                            <img src={getLogoUrl(s.awayAbbr)} alt="" style={{ width: 28, height: 28, objectFit: 'contain' }} onError={(e: any) => { e.target.style.display = 'none'; }} />
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: seriesOver && s.awayWins === 4 ? '#C8102E' : '#fff' }}>{s.awayTeam.split(' ').pop()}</span>
                          </div>
                          <span style={{ fontSize: '1rem', fontWeight: 800, color: seriesOver && s.awayWins === 4 ? '#C8102E' : '#fff' }}>{s.awayWins}</span>
                        </div>
                        <div style={{ height: '1px', background: 'var(--border)' }} />
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                            <img src={getLogoUrl(s.homeAbbr)} alt="" style={{ width: 28, height: 28, objectFit: 'contain' }} onError={(e: any) => { e.target.style.display = 'none'; }} />
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: seriesOver && s.homeWins === 4 ? '#C8102E' : '#fff' }}>{s.homeTeam.split(' ').pop()}</span>
                          </div>
                          <span style={{ fontSize: '1rem', fontWeight: 800, color: seriesOver && s.homeWins === 4 ? '#C8102E' : '#fff' }}>{s.homeWins}</span>
                        </div>
                      </div>
                      {s.nextGame?.date && !seriesOver && (
                        <div style={{ marginTop: '0.5rem', textAlign: 'center' }}>
                          <span style={{ fontSize: '0.5625rem', color: '#444' }}>
                            {new Date(s.nextGame.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <Link href="/directory/nhl/standings" style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8125rem', textDecoration: 'none' }}>← Standings</Link>
        <Link href="/directory/nhl/player-stats" style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8125rem', textDecoration: 'none' }}>Player Stats →</Link>
      </div>

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>

      {/* Ticketmaster NHL Banner - 300x250 */}
      <TicketmasterAd size="300x250" style={{ marginTop: '1.5rem' }} />
    </div>
  );
}