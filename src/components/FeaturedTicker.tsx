'use client';
import Link from 'next/link';

interface TickerItem {
  id: string;
  label: string;
  href: string;
  kind: 'team' | 'player' | 'rink';
}

// Hardcoded featured items (will be replaced with dynamic API later)
const FEATURED_ITEMS: TickerItem[] = [
  { id: 'teams', label: 'Explore Teams', href: '/directory/teams', kind: 'team' },
  { id: 'players', label: 'Find Players', href: '/directory/players', kind: 'player' },
  { id: 'rinks', label: 'Find Rinks', href: '/directory/rinks', kind: 'rink' },
  { id: 'claim', label: 'Claim Your Listing', href: '/claim-your-listing', kind: 'rink' },
];

export default function FeaturedTicker() {
  return (
    <div className="ticker-outer" style={{ background: 'var(--red)', height: '28px', display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
      <style jsx>{`
        @keyframes ticker-scroll {
          0% { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .ticker-track { display: flex; flex-wrap: nowrap; animation: ticker-scroll 50s linear infinite; will-change: transform; }
        .ticker-track:hover { animation-play-state: paused; }
        .ticker-item { flex-shrink: 0; padding: 0 1.5rem; font-size: .625rem; font-weight: 700; letter-spacing: .1em; color: rgba(255,255,255,.9); text-transform: uppercase; white-space: nowrap; text-decoration: none; }
        .ticker-item:hover { color: #fff; }
      `}</style>
      <div className="ticker-track">
        {[...FEATURED_ITEMS, ...FEATURED_ITEMS].map((item, i) => (
          <Link key={`${item.id}-${i}`} href={item.href} className="ticker-item">
            {item.kind === 'team' && '🏒 '}
            {item.kind === 'player' && '👤 '}
            {item.kind === 'rink' && '⛸ '}
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}