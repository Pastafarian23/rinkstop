import Link from 'next/link';
import type { StandingRow } from '@/lib/standings';

/**
 * GenericStandingsTable — server-rendered table for any league's standings.
 *
 * 2026-10-01: pairs with the new /standings filter bar. When a user
 * filters by league (e.g. ?league=KHL) or by level (e.g. ?level=junior),
 * the page shows this table for each league that matches. Columns are
 * the same as NhlStandingsTable (rank, team, GP, W, L, OTL, PTS, GF, GA,
 * DIFF) so visitors see a consistent layout across leagues.
 *
 * Team-page linking is best-effort: the standings.team_id is the HL
 * numeric id (not a Supabase team_workspaces.uuid), and we don't have a
 * full HL-id -> slug lookup table. For NHL only we use the NHL canonical
 * map; for other leagues the team name is rendered without a team-page
 * link. Future work: build the HL-id -> slug map for top leagues
 * (similar to the existing NHL canonical map).
 */

interface Props {
  rows: StandingRow[];
  /** When true, top-3 rows get a subtle green tint. */
  markTopThree?: boolean;
}

const th: React.CSSProperties = {
  padding: '0.5rem 0.4rem',
  fontSize: '0.7rem',
  fontWeight: 700,
  color: 'rgba(255,255,255,0.5)',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  textAlign: 'center',
};

const td: React.CSSProperties = {
  padding: '0.5rem 0.4rem',
  fontSize: '0.85rem',
  color: '#fff',
  textAlign: 'center',
  fontVariantNumeric: 'tabular-nums',
};

function DiffCell({ gf, ga }: { gf: number | null; ga: number | null }) {
  if (gf == null || ga == null) return <span style={{ color: 'rgba(255,255,255,0.3)' }}>—</span>;
  const d = gf - ga;
  const color = d > 0 ? '#4ade80' : d < 0 ? '#ff6b6b' : 'rgba(255,255,255,0.4)';
  const sign = d > 0 ? '+' : '';
  return (
    <span style={{ color, fontWeight: 600 }}>
      {d === 0 ? '0' : `${sign}${d}`}
    </span>
  );
}

export default function GenericStandingsTable({ rows, markTopThree }: Props) {
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
      marginBottom: '1rem',
    }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 480 }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <th style={th}>#</th>
              <th style={{ ...th, textAlign: 'left', minWidth: 160 }}>Team</th>
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
              const isTopThree = markTopThree && i < 3;
              return (
                <tr
                  key={row.id}
                  style={{
                    background: isTopThree ? 'rgba(74,222,128,0.04)' : 'transparent',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                  }}
                >
                  <td style={{ ...td, color: 'rgba(255,255,255,0.45)', fontWeight: 700, fontSize: '0.8rem' }}>
                    {row.rank ?? '—'}
                  </td>
                  <td style={{ ...td, textAlign: 'left' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                      {row.team_logo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={row.team_logo}
                          alt=""
                          width={22}
                          height={22}
                          style={{ objectFit: 'contain', flexShrink: 0 }}
                          loading="lazy"
                        />
                      ) : null}
                      <span style={{ color: '#fff', fontWeight: 600, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {row.team_name}
                      </span>
                    </span>
                  </td>
                  <td style={td}>{row.played ?? '—'}</td>
                  <td style={td}>{row.wins ?? '—'}</td>
                  <td style={td}>{row.losses ?? '—'}</td>
                  <td style={td}>{row.overtime_losses ?? '—'}</td>
                  <td style={{ ...td, color: '#FFB81C', fontWeight: 800 }}>{row.points ?? '—'}</td>
                  <td style={td}>{row.goals_for ?? '—'}</td>
                  <td style={td}>{row.goals_against ?? '—'}</td>
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