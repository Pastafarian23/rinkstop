// src/lib/staff-record.ts
//
// Shared loader for a single staff record (coach, scout, official, exec).
//
// WHY THIS EXISTS (2026-11-11):
//   `/directory/coaches/[id]` was written as a standalone page that re-queried
//   the database itself — and it queried `nhl_players.headshot_url`, a column
//   that does not exist. The table has `logo`. PostgREST returns 42703 for the
//   WHOLE row, so the page could never render a coach.
//
//   `/api/staff/[role]` already had a correct, tested formatter for both
//   staff sources (NHL staff from `nhl_players`, community coaches from
//   `team_members`). Duplicating that logic in the page is how the column
//   bug happened in the first place: two copies of the same mapping, one of
//   which drifted.
//
//   So the page and the API now share ONE loader. If the shape of the data
//   changes, both change together.
//
// ID SHAPES:
//   `nhl-<numeric_id>`  — NHL staff, from `nhl_players`
//   `team-<uuid>`       — community coach, from `team_members`

import { supabaseAdmin } from '@/lib/supabase';

export type StaffSource = 'nhl' | 'community';

export interface StaffRecord {
  id: string;
  source: StaffSource;
  first_name: string | null;
  last_name: string | null;
  full_name: string;
  slug: string;
  position: string | null;
  position_abbreviation: string | null;
  jersey_number: number | string | null;
  nationality: string | null;
  birth_date: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  shoots: string | null;
  headshot_url: string | null;
  is_active: boolean;
  role: string;
  was_player: boolean;
  current_team_id: string | null;
  current_team_abbreviation: string | null;
  current_team_name: string | null;
  current_team_logo: string | null;
  league_name: string | null;
  teams: {
    name: string;
    logo_url: string | null;
    league_id: string | null;
    leagues: { name: string; slug: string } | null;
  } | null;
}

/** Coach-related roles in `team_members`. */
const COACH_ROLES = [
  'head_coach',
  'assistant_coach',
  'goalie_coach',
  'skills_coach',
  'manager',
];

function slugifyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Format an `nhl_players` row into the shared staff shape. */
function formatNhlStaff(p: any): StaffRecord {
  const name = p.full_name || `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim();
  const [first, ...rest] = name.split(' ');
  const last = rest.join(' ');
  return {
    id: `nhl-${p.id}`,
    source: 'nhl',
    first_name: first || null,
    last_name: last || null,
    full_name: name,
    slug: slugifyName(name),
    position: p.position ?? null,
    position_abbreviation: p.position_abbreviation ?? null,
    jersey_number: p.jersey_number ?? null,
    nationality: p.nationality ?? null,
    birth_date: p.birth_date ?? null,
    height_cm: p.height ?? null,
    weight_kg: p.weight ?? null,
    shoots: p.shoots ?? null,
    // `nhl_players` has `logo`, NOT `headshot_url`. Selecting a column that
    // does not exist fails the whole row with 42703.
    headshot_url: p.logo ?? null,
    is_active: p.is_active ?? false,
    role: p.role ?? 'staff',
    was_player: p.was_player ?? false,
    current_team_id: p.current_team_id ?? null,
    current_team_abbreviation: p.current_team_abbreviation ?? null,
    current_team_name: p.current_team_name ?? null,
    current_team_logo: p.current_team_logo ?? null,
    league_name: p.league_name ?? null,
    teams: p.current_team_name
      ? {
          name: p.current_team_name,
          logo_url: p.current_team_logo,
          league_id: p.league_name || 'NHL',
          leagues: {
            name: p.league_name || 'NHL',
            slug: (p.league_name || 'nhl').toLowerCase(),
          },
        }
      : null,
  };
}

/** Format a `team_members` row into the shared staff shape. */
function formatCommunityCoach(
  m: any,
  teamName: string | null,
  teamShortName: string | null,
  teamLogo: string | null,
): StaffRecord {
  const displayName = (m.profiles as any)?.display_name || 'Unknown';
  const [first, ...rest] = displayName.split(' ');
  const last = rest.join(' ');
  return {
    id: `team-${m.id}`,
    source: 'community',
    first_name: first || null,
    last_name: last || null,
    full_name: displayName,
    slug: slugifyName((m.profiles as any)?.username || displayName),
    position: null,
    position_abbreviation: null,
    jersey_number: null,
    nationality: null,
    birth_date: null,
    height_cm: null,
    weight_kg: null,
    shoots: null,
    headshot_url: (m.profiles as any)?.avatar_url || null,
    is_active: !m.left_at,
    role: 'coach',
    was_player: false,
    current_team_id: m.team_id ?? null,
    current_team_abbreviation: teamShortName,
    current_team_name: teamName,
    current_team_logo: teamLogo,
    league_name: null,
    teams: teamName
      ? {
          name: teamName,
          logo_url: teamLogo,
          league_id: null,
          leagues: null,
        }
      : null,
  };
}

/**
 * Load one staff record by its public id.
 *
 * Returns `null` when the id is malformed or no record matches — the caller
 * decides whether that is a 404.
 */
export async function getStaffRecord(id: string): Promise<StaffRecord | null> {
  const isNhl = id.startsWith('nhl-');
  const isTeam = id.startsWith('team-');
  if (!isNhl && !isTeam) return null;

  if (isNhl) {
    const rawId = id.replace(/^nhl-/, '');
    const numericId = Number(rawId);
    if (!Number.isFinite(numericId)) return null;

    // `select('*')` — the column set on `nhl_players` has changed before
    // (headshot_url → logo). An explicit list is what broke this route.
    const { data, error } = await supabaseAdmin
      .from('nhl_players')
      .select('*')
      .eq('id', numericId)
      .maybeSingle();

    if (error || !data) return null;
    return formatNhlStaff(data);
  }

  const rawId = id.replace(/^team-/, '');
  const { data: member, error } = await supabaseAdmin
    .from('team_members')
    .select(
      'id, role, team_id, left_at, profiles!team_members_user_id_fkey(display_name, username, avatar_url), team_workspaces!inner(name, short_name, avatar_url)',
    )
    .eq('id', rawId)
    .maybeSingle();

  if (error || !member) return null;

  const tw: any = (member as any).team_workspaces;
  return formatCommunityCoach(member, tw?.name || null, tw?.short_name || null, tw?.avatar_url || null);
}

export { formatNhlStaff, formatCommunityCoach, COACH_ROLES };

/**
 * Resolve a staff route id to the (source namespace, source row id) that
 * `person_sources` is keyed on.
 *
 * WHY THIS IS NEEDED
 *   The staff detail route uses `nhl-<id>` and `team-<uuid>`, but those
 *   ids live in DIFFERENT id spaces per namespace:
 *     - `nhl_players.id`        → a large integer (8477967)
 *     - `nhl_coaching_staff.id` → a small integer (118)
 *     - `team_members.id`       → a uuid
 *   Guessing the namespace from the id shape would resolve the WRONG person
 *   — `nhl-118` is Aaron Schneekloth in `nhl_coaching_staff`, and there is
 *   no `nhl_players` row 118. So this asks the data instead.
 *
 *   The order matters: `nhl_coaching_staff` first, because its id space is
 *   small and would be ambiguous against `nhl_players` otherwise.
 */
export async function getStaffSourceRef(
  id: string,
): Promise<{ source: string; sourceId: string }> {
  const rawId = id.replace(/^(nhl|team)-/, '');

  const candidates: Array<{ source: string; sourceId: string }> = id.startsWith('team-')
    ? [{ source: 'team_members', sourceId: rawId }]
    : [
        { source: 'nhl_coaching_staff', sourceId: rawId },
        { source: 'nhl_players', sourceId: rawId },
      ];

  for (const candidate of candidates) {
    const { data, error } = await supabaseAdmin
      .from('person_sources')
      .select('id')
      .eq('source', candidate.source)
      .eq('source_id', candidate.sourceId)
      .maybeSingle();
    if (!error && data) return candidate;
  }

  // Nothing matched — return the first candidate so the caller renders a
  // link that resolves to nothing rather than throwing.
  return candidates[0];
}
