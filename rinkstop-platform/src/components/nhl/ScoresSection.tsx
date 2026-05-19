'use client';
import { useState, useEffect } from 'react';

interface LiveGame {
  id: string;
  date: string;
  status: string;
  homeTeam: { abbr: string; name: string; score: number; winner?: boolean };
  awayTeam: { abbr: string; name: string; score: number; winner?: boolean };
  periodDisplay: string;
  round: string;
  seriesLabel: string;
  shortName: string;
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

export default function ScoresSection() {
  const [completed, setCompleted] = useState<LiveGame[]>([]);
  const [upcoming, setUpcoming] = useState<LiveGame[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  useEffect(() => {
    async function fetchScores() {
      try {
        const res = await fetch('/api/nhl/scores?status=all&limit=20');
        if (!res.ok) return;
        const data = await res.json();
        setCompleted((data.completed || []).slice(0, 6));
        setUpcoming((data.upcoming || []).slice(0, 4));
        setLastUpdated(new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }));
      } catch {}
    }
    fetchScores();
    const id = setInterval(fetchScores, 60 * 1000);
    return () => clearInterval(id);
  }, []);

  if (completed.length === 0 && upcoming.length === 0) return null;

  return (
    <div style={{ marginBottom: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <h2 style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#C8102E' }}>
          Stanley Cup Playoffs 2026
        </h2>
        {lastUpdated && (
          <span style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.3)' }}>
            Updated {lastUpdated}
          </span>
        )}
      </div>

      {completed.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <p style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)', marginBottom: '0.5rem' }}>Recent Results</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.5rem' }}>
            {completed.map(g => (
              <div key={g.id} style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#fff', minWidth: '2.5ch' }}>{g.awayTeam?.abbr}</span>
                    <span style={{ fontSize: '0.9375rem', fontWeight: 900, color: g.awayTeam?.winner ? '#4ADE80' : 'rgba(255,255,255,0.6)' }}>{g.awayTeam?.score}</span>
                    <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.75rem' }}>@</span>
                    <span style={{ fontSize: '0.9375rem', fontWeight: 900, color: g.homeTeam?.winner ? '#4ADE80' : 'rgba(255,255,255,0.6)' }}>{g.homeTeam?.score}</span>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#fff', minWidth: '2.5ch' }}>{g.homeTeam?.abbr}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.5625rem', color: '#C8102E', fontWeight: 600, textTransform: 'uppercase' }}>{g.periodDisplay}</span>
                    <span style={{ fontSize: '0.5625rem', color: 'rgba(255,255,255,0.3)' }}>{fmtDate(g.date)}</span>
                    <span style={{ fontSize: '0.5625rem', color: 'rgba(255,255,255,0.3)' }}>·</span>
                    <span style={{ fontSize: '0.5625rem', color: 'rgba(255,255,255,0.3)' }}>{g.round}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {upcoming.length > 0 && (
        <div>
          <p style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)', marginBottom: '0.5rem' }}>Upcoming Games</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.5rem' }}>
            {upcoming.map(g => (
              <div key={g.id} style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#fff' }}>{g.awayTeam?.abbr}</span>
                    <span style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.35)' }}>@</span>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#fff' }}>{g.homeTeam?.abbr}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.5625rem', color: '#2563EB', fontWeight: 600, background: 'rgba(37,99,235,0.15)', padding: '0.1rem 0.35rem', borderRadius: '3px' }}>Game {g.seriesLabel}</span>
                    <span style={{ fontSize: '0.5625rem', color: 'rgba(255,255,255,0.3)' }}>{fmtDate(g.date)} · {fmtTime(g.date)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}