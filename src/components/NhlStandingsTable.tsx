import Link from 'next/link';
import { NHL_TEAMS_CANONICAL, NhlTeamCanonical } from '@/lib/nhl-teams-canonical';
import type { NhlStanding } from '@/lib/nhl-data';

/**
 * NhlStandingsTable — server-rendered NHL standings table.
 *
 * 2026-10-01: Extracted from /standings/nhl/[season]/page.tsx (which uses
 * a client component with tab/wild-card switching). The /standings index
 * page needs a pure server-rendered version that can be inlined without
 * shipping a client bundle.
 *
 * Columns match the NHL.com / ESPN reference:
 *   # | Team (logo + name) | GP | W | L | OTL | PTS | GF | GA | DIFF
 *
 * Top-3 in each division get a green-dot "clinched" indicator; bottom-3
 * get a red dot for "playoff race" (UI-only, since we don't track
 * clinch semantics from the data source).
 */

interface Props {
  rows: NhlStanding[];
  /** Optional caption above the table (e.g. "Eastern Conference"). */
  caption?: string;
  /** Highlight row backgrounds for the divisional top-3 (light green tint). */
  markTopThree?: boolean;
}

const TEAM_ALIASES: Record<string, string> = {
  'utah mammoth': 'utah-hockey-club',
  'arizona coyotes': 'utah-hockey-club',
  'utah': 'utah-hockey-club',
  'arizona': 'utah-hockey-club',
};

function resolveCanonical(teamName: string): NhlTeamCanonical | undefined {
  if (!teamName) return undefined;
  const norm = teamName.toLowerCase().trim();
  if (TEAM_ALIASES[norm]) {
    return NHL_TEAMS_CANONICAL.find(t => t.slug === TEAM_ALIASES[norm]);
  }
  return NHL_TEAMS_CANONICAL.find(t => t.name.toLowerCase() === norm);
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

export default function NhlStandingsTable({ rows, caption, markTopThree }: Props) {
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
      marginBottom: '1.5rem',
    }}>
      {caption && (
        <h3 style={{
          fontSize: '1rem',
          fontWeight: 800,
          color: '#fff',
          padding: '0.75rem 1rem',
          margin: 0,
          background: 'rgba(255,255,255,0.04)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
        }}>
          {caption}
        </h3>
      )}
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
            {rows.map((row, i) => {
              const canonical = resolveCanonical(row.team_name);
              const teamHref = canonical ? `/directory/nhl/teams/${canonical.slug}` : `/directory/nhl`;
              const isTopThree = markTopThree && i < 3;
              return (
                <tr
                  key={row.team_id}
                  style={{
                    background: isTopThree ? 'rgba(74,222,128,0.04)' : 'transparent',
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
    </div>
  );
}