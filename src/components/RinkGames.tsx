import Link from 'next/link';

interface Game {
  id: string;
  date: string;
  time: string | null;
  home_team_id: string;
  away_team_id: string;
  home_team_name: string | null;
  away_team_name: string | null;
  venue_id: string | null;
  venue_name: string | null;
  location: string | null;
  status: string | null;
  home_score: number | null;
  away_score: number | null;
  period: string | null;
  period_time_remaining: string | null;
  broadcast: string | null;
}

interface RinkGamesProps {
  rinkId: string;
  rinkName: string;
  initialGames: Game[];
}

export default function RinkGames({ rinkId, rinkName, initialGames }: RinkGamesProps) {
  const games = initialGames;

  return (
    <div style={{ background: 'rgba(13,17,23,0.6)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '24px' }}>
      <h2 style={{ fontWeight: 600, marginBottom: '16px', color: '#fff', fontSize: '16px' }}>
        Upcoming Games at {rinkName}
      </h2>

      {games.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {games.slice(0, 5).map((f) => (
            <div
              key={f.id}
              style={{
                background: 'rgba(30,41,59,0.5)',
                padding: '12px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: '80px' }}>
                  <span style={{ color: '#94a3b8', fontSize: '13px' }}>
                    {new Date(f.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                  {f.time && (
                    <span style={{ color: 'var(--dim)', fontSize: '11px' }}>{f.time}</span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                  <span style={{ color: '#e2e8f0', fontSize: '14px', fontWeight: 500 }}>
                    {f.home_team_name || 'TBD'}
                  </span>
                  <span style={{ color: '#38bdf8', fontSize: '12px' }}>@</span>
                  <span style={{ color: '#e2e8f0', fontSize: '14px', fontWeight: 500 }}>
                    {f.away_team_name || 'TBD'}
                  </span>
                </div>
              </div>
              <Link
                href={`/directory/games/${f.id}`}
                style={{
                  color: '#C8102E',
                  fontSize: '13px',
                  fontWeight: 600,
                  textDecoration: 'none',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                View &rarr;
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '14px', fontStyle: 'italic' }}>
          No upcoming games scheduled at this rink.
        </p>
      )}
    </div>
  );
}