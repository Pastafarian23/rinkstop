// src/app/profile/[slug]/passport/HockeyCareerSection.tsx
// RSC. Reads hockey_player_team_history for the player. Renders career timeline.
//
// 2026-08-28: owner-only "+ Add affiliation" button is now an inline modal
// (CareerHistoryFormModal) instead of a separate /dashboard/.../new page.
// The dashboard route still exists as a fallback entry point.

import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { VerificationBadge } from './VerificationBadge';
import { CareerHistoryActions } from '@/components/passport/PassportActionsBar';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

interface Season {
  id: string;
  label: string;
  start_date: string;
  end_date: string;
}

interface TeamHistory {
  id: string;
  team_name_snapshot: string;
  season_id: string;
  level: string | null;
  position: string | null;
  jersey_number: number | null;
}

export async function HockeyCareerSection({
  playerId,
  playerName,
  isOwner,
}: {
  playerId: string;
  playerName: string;
  isOwner: boolean;
}) {
  // Fetch career rows AND the season list in parallel. The season list
  // is needed by the inline "+ Add" modal so the owner doesn't have to
  // navigate to /dashboard/.../new to pick a season.
  const [historyRes, seasonsRes] = await Promise.all([
    supabaseAdmin
      .from('hockey_player_team_history')
      .select(`
        id, team_id, team_name_snapshot, jersey_number, position, role,
        start_date, end_date, verification_source, verified_at, level,
        season:hockey_seasons(label),
        team:teams(slug, name)
      `)
      .eq('player_id', playerId)
      .order('start_date', { ascending: false, nullsFirst: false }),
    supabaseAdmin
      .from('hockey_seasons')
      .select('id, label, start_date, end_date')
      .order('start_date', { ascending: false })
      .limit(200),
  ]);

  const rows = historyRes.data;
  const error = historyRes.error;
  const seasons: Season[] = (seasonsRes.data as Season[]) ?? [];
  // Map the career rows to the shape the modal expects (so the modal can
  // let the owner link new stats to an existing career entry).
  const teamHistory: TeamHistory[] = (rows ?? []).map((r: any) => ({
    id: r.id,
    team_name_snapshot: r.team_name_snapshot ?? r.team?.name ?? 'Unknown team',
    season_id: r.season?.id ?? '',
    level: r.level,
    position: r.position,
    jersey_number: r.jersey_number,
  }));

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
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '0.5rem',
  };

  if (error) {
    return (
      <section style={sectionStyle}>
        <h2 style={headingStyle}>
          <span>Hockey career</span>
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem' }}>
          Unable to load career data right now.
        </p>
      </section>
    );
  }

  if (!rows || rows.length === 0) {
    return (
      <section style={sectionStyle}>
        <h2 style={headingStyle}>
          <span>Hockey career</span>
          {isOwner && (
            <CareerHistoryActions
              isOwner={isOwner}
              playerId={playerId}
              playerName={playerName}
              seasons={seasons}
              teamHistory={teamHistory}
            />
          )}
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
          No team affiliations recorded yet.
        </p>
      </section>
    );
  }

  return (
    <section style={sectionStyle}>
      <h2 style={headingStyle}>
        <span>Hockey career</span>
        {isOwner && (
          <CareerHistoryActions
            isOwner={isOwner}
            playerId={playerId}
            playerName={playerName}
            seasons={seasons}
            teamHistory={teamHistory}
          />
        )}
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {rows.map((row) => {
          const teamName = (row as any).team?.name ?? row.team_name_snapshot ?? 'Unknown team';
          const teamHref = (row as any).team?.slug ? `/directory/teams/${(row as any).team.slug}` : null;
          const seasonLabel = (row as any).season?.label;
          const detailBits: string[] = [];
          if (seasonLabel) detailBits.push(seasonLabel);
          if (row.jersey_number != null) detailBits.push(`#${row.jersey_number}`);
          if (row.position) detailBits.push(row.position);
          if (row.role && row.role !== 'player') detailBits.push(row.role);
          if (row.level) detailBits.push(row.level);

          const dateRange =
            row.start_date || row.end_date
              ? `${row.start_date ?? '?'} – ${row.end_date ?? 'present'}`
              : null;

          return (
            <div
              key={row.id}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
                padding: '0.75rem',
                borderRadius: 8,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                {teamHref ? (
                  <Link
                    href={teamHref}
                    style={{
                      fontWeight: 600,
                      color: '#fff',
                      textDecoration: 'none',
                      display: 'block',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {teamName}
                  </Link>
                ) : (
                  <p style={{ fontWeight: 600, color: '#fff', margin: 0 }}>{teamName}</p>
                )}
                {detailBits.length > 0 && (
                  <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.55)', margin: '0.125rem 0 0 0' }}>
                    {detailBits.join(' · ')}
                  </p>
                )}
                {dateRange && (
                  <p style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.35)', margin: '0.125rem 0 0 0' }}>
                    {dateRange}
                  </p>
                )}
              </div>
              <VerificationBadge source={row.verification_source} verifiedAt={row.verified_at} />
            </div>
          );
        })}
      </div>
    </section>
  );
}
