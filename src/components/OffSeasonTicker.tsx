import Link from 'next/link';

interface Chip {
  id: string;
  emoji: string;
  label: string;
  href: string;
}

const CHIPS: Chip[] = [
  { id: 'welcome', emoji: '🏒', label: 'Welcome to RinkStop — Find a rink near you', href: '/directory/rinks' },
  { id: 'find-rink', emoji: '⛸', label: 'Find a rink near you', href: '/directory/rinks' },
  { id: 'explore-teams', emoji: '🏒', label: 'Explore local hockey teams', href: '/directory/teams' },
  { id: 'claim', emoji: '📋', label: 'Claim your team listing', href: '/claim-your-listing' },
];

export default function OffSeasonTicker() {
  return (
    <>
      <style>{`
        @keyframes off-season-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .off-season-track {
          display: flex;
          flex-wrap: nowrap;
          animation: off-season-scroll 50s linear infinite;
          will-change: transform;
        }
        .off-season-track:hover { animation-play-state: paused; }
        .off-season-chip {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0 1.5rem;
          height: 38px;
          white-space: nowrap;
          font-size: 0.75rem;
          font-weight: 600;
          color: #fff;
          text-decoration: none;
          border-right: 1px solid rgba(255,255,255,0.15);
          flex-shrink: 0;
        }
        .off-season-chip:hover { color: #FFB81C; }
      `}</style>

      <div
        aria-label="Off-season welcome strip"
        style={{
          background: '#041E42',
          borderBottom: '2px solid #C8102E',
          overflow: 'hidden',
          height: '38px',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <div className="off-season-track">
          {[...CHIPS, ...CHIPS].map((chip, i) => (
            <Link
              key={`${chip.id}-${i}`}
              href={chip.href}
              className="off-season-chip"
              aria-label={chip.label}
            >
              <span aria-hidden="true">{chip.emoji}</span>
              <span>{chip.label} →</span>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
