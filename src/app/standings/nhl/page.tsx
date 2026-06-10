import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getLatestSeason, getStandingsForSeason, NhlStanding } from '@/lib/nhl-data';
import { ALL_CONFERENCES, ALL_DIVISIONS, NHL_TEAMS_CANONICAL, NhlTeamCanonical } from '@/lib/nhl-teams-canonical';

export const revalidate = 3600; // 1 hour

export const metadata: Metadata = {
  title: 'NHL Standings | RinkStop',
  description: 'Current NHL standings by conference and division. Full records, points, goals for/against, and goal differential for all 32 teams.',
};

// Resolve the canonical team data for a given standings row.
// Match by name (case-insensitive) to bridge the nhl_standings 6-digit
// team_id system to the canonical 1-2 digit highlightly IDs.
function resolveCanonical(teamName: string): NhlTeamCanonical | undefined {
  if (!teamName) return undefined;
  const norm = teamName.toLowerCase().trim();
  return NHL_TEAMS_CANONICAL.find(t => t.name.toLowerCase() === norm);
}

function DiffCell({ gf, ga }: { gf: number; ga: number }) {
  const d = gf - ga;
  const color = d > 0 ? '#4ade80' : d < 0 ? '#ff6b6b' : 'rgba(255,255,255,0.4)';
  const sign = d > 0 ? '+' : '';
  return (
    <span style={{ color, fontWeight: 600 }}>
      {d === 0 ? '0' : `${sign}${d}`}
    </span>
  );
}

function StandingsTable({
  rows,
  showDivisionHeader,
}: {
  rows: NhlStanding[];
  showDivisionHeader: boolean;
}) {
  if (rows.length === 0) {
    return (
      <div style={{
        padding: '1.5rem',
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '6px',
        textAlign: 'center',
        color: 'rgba(255,255,255,0.4)',
        fontSize: '0.85rem',
      }}>
        No standings data available.
      </div>
    );
  }

  return (
    <div style={{
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: '6px',
      overflow: 'hidden',
    }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          minWidth: 540,
        }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <th style={th}>#</th>
              <th style={{ ...th, textAlign: 'left', minWidth: 180 }}>Team</th>
              <th style={th} title="Games Played">GP</th>
              <th style={th} title="Wins">W</th>
              <th style={th} title="Losses">L</th>
              <th style={th} title="Overtime Losses">OTL</th>
              <th style={{ ...th, color: '#FFB81C', fontWeight: 800 }} title="Points">PTS</th>
              <th style={th} title="Goals For">GF</th>
              <th style={th} title="Goals Against">GA</th>
              <th style={th} title="Goal Differential">DIFF</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const canonical = resolveCanonical(row.team_name);
              const teamHref = canonical ? `/directory/nhl/teams/${canonical.slug}` : `/directory/nhl`;
              return (
                <tr
                  key={row.team_id}
                  style={{
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                  }}
                >
                  <td style={{ ...td, color: 'rgba(255,255,255,0.45)', fontWeight: 700, fontSize: '0.8rem' }}>
                    {row.rank}
                  </td>
                  <td style={{ ...td, textAlign: 'left', padding: '0.625rem 0.5rem' }}>
                    <Link href={teamHref} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', textDecoration: 'none' }}>
                      {row.team_logo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={row.team_logo}
                          alt=""
                          width={24}
                          height={24}
                          style={{ objectFit: 'contain', flexShrink: 0 }}
                          loading="lazy"
                        />
                      ) : (
                        <div style={{ width: 24, height: 24, borderRadius: '50%', background: canonical?.primaryColor || '#333', flexShrink: 0 }} />
                      )}
                      <span style={{ color: '#fff', fontWeight: 600, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {canonical ? canonical.name : row.team_name}
                      </span>
                    </Link>
                  </td>
                  <td style={td}>{row.played}</td>
                  <td style={td}>{row.wins}</td>
                  <td style={td}>{row.losses}</td>
                  <td style={td}>{row.overtime_losses}</td>
                  <td style={{ ...td, color: '#FFB81C', fontWeight: 800 }}>{row.points}</td>
                  <td style={td}>{row.goals_for}</td>
                  <td style={td}>{row.goals_against}</td>
                  <td style={td}>
                    <DiffCell gf={row.goals_for} ga={row.goals_against} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {showDivisionHeader && (
        <div style={{
          padding: '0.5rem 0.75rem',
          background: 'rgba(0,0,0,0.2)',
          fontSize: '0.7rem',
          color: 'rgba(255,255,255,0.3)',
          textAlign: 'center',
        }}>
          x = clinched · y = clinched wild card · z = division leader
        </div>
      )}
    </div>
  );
}

const th: React.CSSProperties = {
  padding: '0.625rem 0.5rem',
  fontSize: '0.7rem',
  fontWeight: 700,
  color: 'rgba(255,255,255,0.5)',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  textAlign: 'center',
};
const td: React.CSSProperties = {
  padding: '0.625rem 0.5rem',
  fontSize: '0.85rem',
  color: '#fff',
  textAlign: 'center',
  fontVariantNumeric: 'tabular-nums',
};

export default async function NhlStandingsPage() {
  const latestSeason = await getLatestSeason();
  if (latestSeason) {
    redirect(`/standings/nhl/${latestSeason}`);
  }
  return (
    <main>
      <section style={{ background: '#0D1117', padding: '3rem 0', textAlign: 'center' }}>
        <div className="container">
          <h1 className="font-sport" style={{ fontSize: 'clamp(2rem, 6vw, 3.5rem)', color: '#fff' }}>NHL STANDINGS</h1>
          <p style={{ color: 'rgba(255,255,255,0.5)' }}>No standings data available yet.</p>
        </div>
      </section>
    </main>
  );
}
