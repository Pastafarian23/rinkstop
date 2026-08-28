// src/app/profile/[slug]/passport/HockeyStatsSection.tsx
// RSC. Reads hockey_player_stats_season. Renders skater or goalie stats based on position_category.

import { createClient } from '@supabase/supabase-js';
import { VerificationBadge } from './VerificationBadge';
import { StatsActions } from '@/components/passport/PassportActionsBar';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

const SKATER_COLS = [
  { key: 'games_played',    label: 'GP' },
  { key: 'goals',           label: 'G' },
  { key: 'assists',         label: 'A' },
  { key: 'plus_minus',      label: '+/-' },
  { key: 'penalty_minutes', label: 'PIM' },
] as const;

const GOALIE_COLS = [
  { key: 'goalie_games_played', label: 'GP' },
  { key: 'wins',                label: 'W' },
  { key: 'losses',              label: 'L' },
  { key: 'gaa',                 label: 'GAA' },
  { key: 'save_percentage',     label: 'SV%' },
  { key: 'shutouts',            label: 'SO' },
] as const;

function formatNum(n: any): string {
  if (n == null) return '—';
  if (typeof n === 'number') return n.toString();
  return String(n);
}

function formatPct(n: any): string {
  if (n == null) return '—';
  return `${(Number(n) * 100).toFixed(1)}%`;
}

function formatGaa(n: any): string {
  if (n == null) return '—';
  return Number(n).toFixed(2);
}

export async function HockeyStatsSection({
  playerId,
  playerName,
  positionCategory,
  isOwner,
}: {
  playerId: string;
  playerName: string;
  positionCategory: 'forward' | 'defense' | 'goalie' | null;
  isOwner: boolean;
}) {
  const isGoalie = positionCategory === 'goalie';

  // Fetch stats rows + seasons list + team history list in parallel.
  // All three are needed for the inline "+ Add season stats" modal.
  const [statsRes, seasonsRes, teamHistoryRes] = await Promise.all([
    supabaseAdmin
      .from('hockey_player_stats_season')
      .select(`
        id, season_id, level, league_id,
        games_played, goals, assists, plus_minus, penalty_minutes,
        goalie_games_played, wins, losses, goals_against, saves,
        save_percentage, shutouts, gaa,
        verification_source, verified_at,
        season:hockey_seasons(label, start_date)
      `)
      .eq('player_id', playerId)
      .order('created_at', { ascending: false }),
    supabaseAdmin
      .from('hockey_seasons')
      .select('id, label, start_date, end_date')
      .order('start_date', { ascending: false })
      .limit(200),
    supabaseAdmin
      .from('hockey_player_team_history')
      .select('id, team_name_snapshot, season_id, level, position, jersey_number')
      .eq('player_id', playerId)
      .order('start_date', { ascending: false })
      .limit(50),
  ]);

  const rows = statsRes.data;
  const error = statsRes.error;
  const seasons = (seasonsRes.data as any[]) ?? [];
  const teamHistory = (teamHistoryRes.data as any[]) ?? [];
  const sectionStyle = {
    padding: '1.25rem 1.5rem 1.5rem',
    borderTop: '1px solid rgba(255,255,255,0.08)',
  } as const;

  const headingStyle = {
    fontFamily: "'Bebas Neue', sans-serif",
    fontSize: '0.875rem',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
    marginBottom: '0.75rem',
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  };

  if (error) {
    return (
      <section style={sectionStyle}>
        <h2 style={headingStyle}>Hockey stats</h2>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem' }}>Unable to load stats right now.</p>
      </section>
    );
  }

  if (!rows || rows.length === 0) {
    return (
      <section style={sectionStyle}>
        <h2 style={headingStyle}>
          <span>Hockey stats{isGoalie ? ' (goalie)' : ''}</span>
          {isOwner && (
            <StatsActions
              isOwner={isOwner}
              playerId={playerId}
              playerName={playerName}
              positionCategory={positionCategory}
              seasons={seasons}
              teamHistory={teamHistory}
            />
          )}
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
          No season stats recorded yet.
        </p>
      </section>
    );
  }

  const cols = isGoalie ? GOALIE_COLS : SKATER_COLS;

  function renderCell(row: any, colKey: string): string {
    if (colKey === 'save_percentage') return formatPct(row.save_percentage);
    if (colKey === 'gaa') return formatGaa(row.gaa);
    return formatNum((row as any)[colKey]);
  }

  return (
    <section style={sectionStyle}>
      <h2 style={headingStyle}>
        <span>Hockey stats{isGoalie ? ' (goalie)' : ''}</span>
        {isOwner && (
          <StatsActions
            isOwner={isOwner}
            playerId={playerId}
            playerName={playerName}
            positionCategory={positionCategory}
            seasons={seasons}
            teamHistory={teamHistory}
          />
        )}
      </h2>

      {/* Horizontal scroll wrapper for mobile */}
      <div style={{ overflowX: 'auto', marginLeft: '-1.5rem', marginRight: '-1.5rem', padding: '0 1.5rem' }}>
        <table
          style={{
            width: '100%',
            minWidth: cols.length * 50 + 100,
            borderCollapse: 'collapse',
            fontSize: '0.8125rem',
          }}
        >
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <th
                style={{
                  textAlign: 'left',
                  padding: '0.5rem 0.5rem 0.5rem 0',
                  fontWeight: 700,
                  color: 'rgba(255,255,255,0.6)',
                  textTransform: 'uppercase',
                  fontSize: '0.6875rem',
                  letterSpacing: '0.06em',
                }}
              >
                Season
              </th>
              {cols.map((c) => (
                <th
                  key={c.key}
                  style={{
                    textAlign: 'right',
                    padding: '0.5rem 0.25rem',
                    fontWeight: 700,
                    color: 'rgba(255,255,255,0.6)',
                    textTransform: 'uppercase',
                    fontSize: '0.6875rem',
                    letterSpacing: '0.06em',
                  }}
                >
                  {c.label}
                </th>
              ))}
              <th style={{ width: 80 }}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const seasonLabel = (row as any).season?.label ?? '—';
              const seasonYear = (row as any).season?.start_date
                ? new Date((row as any).season.start_date).getFullYear()
                : null;
              return (
                <tr key={row.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '0.5rem 0.5rem 0.5rem 0', color: '#fff', fontWeight: 600 }}>
                    {seasonLabel}
                    {row.level && (
                      <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 400, marginLeft: 6, fontSize: '0.6875rem' }}>
                        {row.level}
                      </span>
                    )}
                  </td>
                  {cols.map((c) => (
                    <td
                      key={c.key}
                      style={{
                        textAlign: 'right',
                        padding: '0.5rem 0.25rem',
                        color: '#fff',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {renderCell(row, c.key)}
                    </td>
                  ))}
                  <td style={{ textAlign: 'right' }}>
                    <VerificationBadge source={row.verification_source} verifiedAt={row.verified_at} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}