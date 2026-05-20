'use client';
import { useEffect, useState } from 'react';

interface TickerGame {
  id: string;
  content: string;
  update_type: string;
  created_at: string;
}

function parseGameDisplay(content: string): any {
  const finalMatch = content.match(/FINAL:\s*(.+?)\s*(\d+)[–\-—](\d+)\s*(.+)/);
  if (finalMatch) {
    const [, homeTeam, homeScore, awayScore, awayTeam] = finalMatch;
    return {
      type: 'final',
      home: homeTeam.trim(),
      homeScore: parseInt(homeScore),
      away: awayTeam.trim(),
      awayScore: parseInt(awayScore),
    };
  }
  const winMatch = content.match(/(.+?)\s+WIN!?.+?defeats\s+(.+?)\s+(\d+)[–\-—](\d+)/);
  if (winMatch) {
    return {
      type: 'final',
      home: winMatch[2].trim(),
      homeScore: parseInt(winMatch[4]),
      away: winMatch[1].trim(),
      awayScore: parseInt(winMatch[3]),
    };
  }
  const upcomingMatch = content.match(/(.+?)\s+vs\s+(.+?)\s+Game\s+(\d+)/i);
  if (upcomingMatch) {
    return { type: 'upcoming', home: upcomingMatch[2].trim(), away: upcomingMatch[1].trim(), gameNum: upcomingMatch[3] };
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
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>{game.away}</span>
        <span style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.4)' }}>vs</span>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>{game.home}</span>
        <span style={{ fontSize: '0.5625rem', color: '#fff', marginLeft: '0.25rem', background: 'rgba(0,0,0,0.25)', padding: '0.1rem 0.35rem', borderRadius: '2px' }}>G{game.gameNum} TONIGHT</span>
      </div>
    );
  }
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', padding: '0 1.25rem',
      height: '38px', whiteSpace: 'nowrap', borderRight: '1px solid rgba(255,255,255,0.15)', flexShrink: 0,
    }}>
      <span style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.5)', fontStyle: 'italic' }}>{game.label}</span>
    </div>
  );
}

export default function ScoreTicker() {
  const [games, setGames] = useState<TickerGame[]>([]);

  useEffect(() => {
    async function fetchGames() {
      try {
        const res = await fetch('/api/nhl/playoffs/updates?limit=12');
        const data = await res.json();
        if (Array.isArray(data)) setGames(data);
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
          NHL
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