'use client';
import { useEffect, useState } from 'react';

interface TickerItem {
  id: string;
  type: 'final' | 'live' | 'upcoming';
  homeAbbr: string;
  homeName: string;
  awayAbbr: string;
  awayName: string;
  homeScore?: number;
  awayScore?: number;
  periodDisplay?: string;
  seriesLabel?: string;
  date?: string;
  round?: string;
}

function GameChip({ item }: { item: TickerItem }) {
  if (item.type === 'final') {
    const homeWins = (item.homeScore ?? 0) > (item.awayScore ?? 0);
    return (
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
        padding: '0 1.25rem', height: '38px', whiteSpace: 'nowrap',
        borderRight: '1px solid rgba(255,255,255,0.15)', flexShrink: 0,
      }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fff' }}>{item.homeAbbr}</span>
        <span style={{
          fontSize: '0.6875rem', fontWeight: 900,
          color: homeWins ? '#4ADE80' : 'rgba(255,255,255,0.5)',
          minWidth: '1.5ch', textAlign: 'center'
        }}>{item.homeScore}</span>
        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.625rem' }}>–</span>
        <span style={{
          fontSize: '0.6875rem', fontWeight: 900,
          color: !homeWins ? '#4ADE80' : 'rgba(255,255,255,0.5)',
          minWidth: '1.5ch', textAlign: 'center'
        }}>{item.awayScore}</span>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fff' }}>{item.awayAbbr}</span>
        <span style={{
          fontSize: '0.5625rem', color: 'rgba(255,255,255,0.5)',
          marginLeft: '0.25rem', background: 'rgba(0,0,0,0.2)',
          padding: '0.1rem 0.35rem', borderRadius: '2px'
        }}>FINAL</span>
      </div>
    );
  }

  if (item.type === 'live') {
    const homeWins = (item.homeScore ?? 0) > (item.awayScore ?? 0);
    return (
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
        padding: '0 1.25rem', height: '38px', whiteSpace: 'nowrap',
        borderRight: '1px solid rgba(255,255,255,0.15)', flexShrink: 0,
        background: 'rgba(200,16,46,0.15)',
      }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fff' }}>{item.homeAbbr}</span>
        <span style={{
          fontSize: '0.6875rem', fontWeight: 900, color: homeWins ? '#4ADE80' : '#fff',
          minWidth: '1.5ch', textAlign: 'center'
        }}>{item.homeScore}</span>
        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.625rem' }}>–</span>
        <span style={{
          fontSize: '0.6875rem', fontWeight: 900, color: !homeWins ? '#4ADE80' : '#fff',
          minWidth: '1.5ch', textAlign: 'center'
        }}>{item.awayScore}</span>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fff' }}>{item.awayAbbr}</span>
        <span style={{
          fontSize: '0.5625rem', color: '#fff', marginLeft: '0.25rem',
          background: '#C8102E', padding: '0.1rem 0.35rem', borderRadius: '2px'
        }}>{item.periodDisplay || 'LIVE'}</span>
      </div>
    );
  }

  if (item.type === 'upcoming') {
    return (
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
        padding: '0 1.25rem', height: '38px', whiteSpace: 'nowrap',
        borderRight: '1px solid rgba(255,255,255,0.15)', flexShrink: 0,
      }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>{item.homeAbbr}</span>
        <span style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.4)' }}>vs</span>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>{item.awayAbbr}</span>
        {item.date && (
          <span style={{
            fontSize: '0.5625rem', color: 'rgba(255,255,255,0.5)',
            marginLeft: '0.25rem', background: 'rgba(0,0,0,0.25)',
            padding: '0.1rem 0.35rem', borderRadius: '2px'
          }}>
            {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()}
          </span>
        )}
      </div>
    );
  }

  return null;
}

export default function ScoreTicker() {
  const [items, setItems] = useState<TickerItem[]>([]);

  useEffect(() => {
    async function fetchGames() {
      try {
        const res = await fetch('/api/nhl/playoffs/ticker');
        const data = await res.json();
        if (Array.isArray(data)) setItems(data);
      } catch {}
    }
    fetchGames();
    const id = setInterval(fetchGames, 60 * 1000);
    return () => { clearInterval(id); };
  }, []);

  if (items.length === 0) return null;

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
          flexShrink: 0, borderRight: '1px solid rgba(255,255,255,0.2)',
          height: '100%', display: 'flex', alignItems: 'center', whiteSpace: 'nowrap',
          zIndex: 1, background: '#041E42',
        }}>
          NHL
        </div>
        <div style={{ overflow: 'hidden', flex: 1, height: '38px', display: 'flex', alignItems: 'center' }}>
          <div className="ticker-anim-track">
            {items.map((item, i) => <GameChip key={`a-${i}`} item={item} />)}
            {items.map((item, i) => <GameChip key={`b-${i}`} item={item} />)}
          </div>
        </div>
      </div>
    </>
  );
}