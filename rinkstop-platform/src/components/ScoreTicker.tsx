'use client';
import { useEffect, useState } from 'react';

interface TickerGame {
  id: string;
  content: string;
  update_type: string;
  created_at: string;
}

function parseGameDisplay(content: string): any {
  const finalMatch = content.match(/^([A-Z]{2,4})\s+(\d+)[–\-—](\d+)\s+([A-Z]{2,4})$/);
  if (finalMatch) {
    return {
      type: 'final',
      home: finalMatch[4],
      homeScore: parseInt(finalMatch[3]),
      away: finalMatch[1],
      awayScore: parseInt(finalMatch[2]),
    };
  }
  const upcomingMatch = content.match(/^([A-Z]{2,4})\s+@\s+([A-Z]{2,4})\s+·\s+Game\s+(\d+)\s+·\s+(.+)$/);
  if (upcomingMatch) {
    return { type: 'upcoming', away: upcomingMatch[1], home: upcomingMatch[2], gameNum: upcomingMatch[3], dateLabel: upcomingMatch[4] };
  }
  return { type: 'text', label: content };
}

function GameChip({ game }: { game: any }) {
  if (game.type === 'final') {
    return (
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
        padding: '0 1.25rem', height: '38px', whiteSpace: 'nowrap',
        borderRight: '1px solid rgba(255,255,255,0.15)', flexShrink: 0,
      }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fff' }}>{game.home}</span>
        <span style={{ fontSize: '0.6875rem', fontWeight: 900, color: game.homeScore > game.awayScore ? '#4ADE80' : 'rgba(255,255,255,0.5)', minWidth: '1.5ch', textAlign: 'center' }}>{game.homeScore}</span>
        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.625rem' }}>–</span>
        <span style={{ fontSize: '0.6875rem', fontWeight: 900, color: game.awayScore > game.homeScore ? '#4ADE80' : 'rgba(255,255,255,0.5)', minWidth: '1.5ch', textAlign: 'center' }}>{game.awayScore}</span>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fff' }}>{game.away}</span>
        <span style={{ fontSize: '0.5625rem', color: 'rgba(255,255,255,0.5)', marginLeft: '0.25rem', background: 'rgba(0,0,0,0.2)', padding: '0.1rem 0.35rem', borderRadius: '2px' }}>FINAL</span>
      </div>
    );
  }
  if (game.type === 'upcoming') {
    return (
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
        padding: '0 1.25rem', height: '38px', whiteSpace: 'nowrap',
        borderRight: '1px solid rgba(255,255,255,0.15)', flexShrink: 0,
      }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>{game.away} @ {game.home}</span>
        <span style={{ fontSize: '0.5625rem', color: '#fff', marginLeft: '0.25rem', background: '#2563EB', padding: '0.1rem 0.35rem', borderRadius: '2px' }}>Game {game.gameNum} · {game.dateLabel}</span>
      </div>
    );
  }
  return null;

export default function ScoreTicker() {
  const [games, setGames] = useState<TickerGame[]>([]);

  useEffect(() => {
    async function fetchGames() {
      try {
        if (res.ok) {
          const data = await res.json();
          const completed = (data.completed || []).slice(0, 6).map((g: any) => ({
            id: g.id,
            content: `${g.awayTeam?.abbr} ${g.awayTeam?.score ?? 0}–${g.homeTeam?.score ?? 0} ${g.homeTeam?.abbr}`,
            update_type: 'final',
            created_at: g.date,
          }));
          const upcoming = (data.upcoming || []).slice(0, 4).map((g: any) => {
            const d = new Date(g.date);
            const day = d.toLocaleDateString('en-US', { weekday: 'short' });
            const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
            return {
              id: g.id,
              content: `${g.awayTeam?.abbr} @ ${g.homeTeam?.abbr} · Game ${g.seriesLabel} · ${day} ${time}`,
              update_type: 'upcoming',
              created_at: g.date,
            };
          });
          setGames([...completed, ...upcoming]);
        }
      } catch {}
    }
    fetchGames();
    const id = setInterval(fetchGames, 60 * 1000);
    return () => { clearInterval(id); };
  }, []);

  if (games.length === 0) return null;

  const parsed = games.map(g => parseGameDisplay(g.content));

  return (
    <>
      <style>{`
        @keyframes ticker-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .ticker-anim-track {
          display: flex;
          animation: ticker-scroll 160s linear infinite;
          will-change: transform;
        }
        .ticker-anim-track:hover { animation-play-state: paused; }
      `}</style>

      <div style={{
        background: '#041E42',
        borderBottom: '2px solid #C8102E',
        overflow: 'hidden', height: '38px', display: 'flex', alignItems: 'center',
      }}>
        <div style={{
          padding: '0 0.875rem', fontSize: '0.5625rem', fontWeight: 800,
          letterSpacing: '0.12em', textTransform: 'uppercase', color: '#C8102E',
          flexShrink: 0, borderRight: '1px solid rgba(255,255,255,0.2)', height: '100%',
          display: 'flex', alignItems: 'center', whiteSpace: 'nowrap', zIndex: 1, background: '#041E42',
        }}>
          NHL · STANLEY CUP PLAYOFFS 2026
        </div>
        <div style={{ overflow: 'hidden', flex: 1, height: '38px', display: 'flex', alignItems: 'center' }}>
          <div className="ticker-anim-track">
            {parsed.map((game, i) => <GameChip key={`a-${i}`} game={game} />)}
            {parsed.map((game, i) => <GameChip key={`b-${i}`} game={game} />)}
          </div>
        </div>
      </div>
    </>
  );
}