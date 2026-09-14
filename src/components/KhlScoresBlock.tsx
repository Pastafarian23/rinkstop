// KhlScoresBlock.tsx — WS27 PR3
// Adds live-ish scores + standings to the /directory/khl hub page.
// Intent mismatch diagnosis: GSC showed 0.39% CTR (1,783 impressions / 7 clicks)
// — searchers want scores/standings; the page only had team list + history text.
// Adding these blocks addresses the intent gap without changing the title.

import Link from 'next/link';
//
// Data sources:
// - Last result: Supabase fixtures table (league_id = KHL_LEAGUE_ID, status = completed)
//   Only has data through May 2026 (2024-25 season). During off-season show the last
//   result with a "2026-27 TBD" note rather than leaving the block empty.
// - Standings: Supabase highlightly_standings table (league_id = 30569, season = 2025).
//   Covers the 2024-25 regular season. Top 8 shown. Next season (2026-27) not yet available.

interface Standing {
  rank: number;
  team_name: string;
  team_logo: string | null;
  played: number;
  wins: number;
  losses: number;
  overtime_losses: number;
  points: number;
  goals_for: number;
  goals_against: number;
}

interface LastResult {
  homeTeam: string;
  homeScore: number;
  awayTeam: string;
  awayScore: number;
  scheduledAt: string; // ISO 8601
  venue: string | null;
  slug: string | null;
}

interface KhlScoresBlockProps {
  standings: Standing[];
  lastResult: LastResult | null;
}

export function KhlScoresBlock({ standings, lastResult }: KhlScoresBlockProps) {
  const seasonLabel = '2024-25'; // data available through May 2026; 2025-26 not yet in DB

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2rem' }}>
      {/* Last result + CTA row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        {/* Last completed result */}
        <section style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1.25rem' }}>
          <p style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.4)', marginBottom: '0.75rem' }}>
            Last Result
          </p>
          {lastResult ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                {lastResult.slug ? (
                  <Link href={`/directory/teams/${lastResult.slug}`} style={{ color: '#fff', fontWeight: 700, fontSize: '0.9375rem', textDecoration: 'none' }}>
                    {lastResult.homeTeam}
                  </Link>
                ) : (
                  <span style={{ color: '#fff', fontWeight: 700, fontSize: '0.9375rem' }}>{lastResult.homeTeam}</span>
                )}
                <span style={{ marginLeft: 'auto', fontSize: '1.25rem', fontWeight: 800, color: '#C8102E' }}>{lastResult.homeScore}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                {lastResult.slug ? (
                  <Link href={`/directory/teams/${lastResult.slug}`} style={{ color: '#fff', fontWeight: 700, fontSize: '0.9375rem', textDecoration: 'none' }}>
                    {lastResult.awayTeam}
                  </Link>
                ) : (
                  <span style={{ color: '#fff', fontWeight: 700, fontSize: '0.9375rem' }}>{lastResult.awayTeam}</span>
                )}
                <span style={{ marginLeft: 'auto', fontSize: '1.25rem', fontWeight: 800, color: '#C8102E' }}>{lastResult.awayScore}</span>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', margin: 0 }}>
                {new Date(lastResult.scheduledAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                {lastResult.venue ? ` · ${lastResult.venue}` : ''}
                {' · '}2024-25 season
              </p>
            </>
          ) : (
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', margin: 0 }}>
              No results available. Check back when the 2026-27 season begins.
            </p>
          )}
        </section>

        {/* Scores CTA */}
        <section style={{ background: 'linear-gradient(135deg, #0d2137 0%, #061424 100%)', border: '1px solid rgba(30,91,156,0.3)', borderRadius: '8px', padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <p style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#4A90D9', marginBottom: '0.5rem' }}>Live Scores &amp; Schedules</p>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', marginBottom: '1rem', lineHeight: 1.5 }}>
            Full 2026-27 KHL schedule, live scores, and recent results — updated daily.
          </p>
          <Link
            href="/directory/games?league=intl"
            style={{
              display: 'inline-block',
              background: '#C8102E',
              color: '#fff',
              fontWeight: 700,
              fontSize: '0.875rem',
              padding: '0.5rem 1rem',
              borderRadius: '4px',
              textDecoration: 'none',
              textAlign: 'center',
            }}
          >
            View KHL Scores
          </Link>
        </section>
      </div>

      {/* Standings */}
      {standings.length > 0 && (
        <section style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1rem', color: '#fff', fontWeight: 700, margin: 0 }}>2024-25 Standings</h2>
            <Link href="/directory/games?league=intl" style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>
              Full standings ›
            </Link>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
              <thead>
                <tr style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'left' }}>
                  <th style={{ padding: '0.25rem 0.5rem 0.25rem 0', fontWeight: 600, fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.05em', width: '1.5rem' }}>#</th>
                  <th style={{ padding: '0.25rem 0.5rem', fontWeight: 600, fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Team</th>
                  <th style={{ padding: '0.25rem 0.5rem', fontWeight: 600, fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>GP</th>
                  <th style={{ padding: '0.25rem 0.5rem', fontWeight: 600, fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>W</th>
                  <th style={{ padding: '0.25rem 0.5rem', fontWeight: 600, fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>L</th>
                  <th style={{ padding: '0.25rem 0.5rem', fontWeight: 600, fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>OT</th>
                  <th style={{ padding: '0.25rem 0 0.25rem 0.5rem', fontWeight: 600, fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Pts</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((s) => (
                  <tr key={s.rank} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: '0.5rem 0.5rem 0.5rem 0', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>{s.rank}</td>
                    <td style={{ padding: '0.5rem 0.5rem', color: '#fff', fontWeight: 600 }}>{s.team_name}</td>
                    <td style={{ padding: '0.5rem', color: 'rgba(255,255,255,0.6)', textAlign: 'right' }}>{s.played}</td>
                    <td style={{ padding: '0.5rem', color: 'rgba(255,255,255,0.6)', textAlign: 'right' }}>{s.wins}</td>
                    <td style={{ padding: '0.5rem', color: 'rgba(255,255,255,0.6)', textAlign: 'right' }}>{s.losses}</td>
                    <td style={{ padding: '0.5rem', color: 'rgba(255,255,255,0.6)', textAlign: 'right' }}>{s.overtime_losses ?? 0}</td>
                    <td style={{ padding: '0.5rem 0 0.5rem 0.5rem', color: '#C8102E', fontWeight: 700, textAlign: 'right' }}>{s.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.6875rem', marginTop: '0.75rem', marginBottom: 0 }}>
            * 2024-25 regular-season standings. 2025-26 playoff results through May 2026 shown above.
            2026-27 season standings available when the regular season concludes.
          </p>
        </section>
      )}
    </div>
  );
}
