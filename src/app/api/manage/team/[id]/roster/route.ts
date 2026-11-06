/**
 * Team roster management API.
 *
 *   GET    /api/manage/team/[id]/roster          — read the roster
 *   POST   /api/manage/team/[id]/roster          — add a member
 *   PATCH  /api/manage/team/[id]/roster          — update a member row
 *   DELETE /api/manage/team/[id]/roster          — remove a member
 *
 * Authorization is ROLE-SCOPED PER TEAM (see `src/lib/team-authority.ts`):
 * the caller needs an approved claim on the team OR an admin role on it
 * (`team_members.role`), and roster management additionally requires an
 * organization tier that includes the roster feature (Organization Plus and
 * up). The page and this API use the SAME helper, so the UI can never
 * offer an action the server would refuse.
 *
 * TWO KINDS OF ROSTER ROW
 *
 *   `team_members` — a person with a RinkStop account who is on the roster.
 *     Carries the team ROLE (head_coach, player, parent_rep, …), jersey
 *     number, position, shoots, birth date, and — for minors — the
 *     guardian link (`parent_user_id`, `is_minor`).
 *
 *   `hockey_player_team_history` — a player record (a row in `players`)
 *     linked to the team for a stint. Carries jersey number, position,
 *     role, season and the verification source (`self_reported` /
 *     `coach_verified`).
 *
 * Both are needed: a club's roster is not only its account-holding members,
 * and its account-holding members are not only its players.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { checkRateLimit, getClientIP, applyRateLimitHeaders, maybeCleanup } from '@/lib/rateLimit';
import { getTeamAuthority, rosterBlockMessage } from '@/lib/team-authority';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const RL = { maxRequests: 60, windowMs: 60 * 1000 };

/** The 16 team roles, matching `team_members_role_check` in the DB. */
const TEAM_ROLES = [
  'head_coach',
  'assistant_coach',
  'goalie_coach',
  'skills_coach',
  'manager',
  'team_staff',
  'president',
  'vice_president',
  'secretary',
  'treasurer',
  'board_member',
  'safety_officer',
  'player',
  'goalie',
  'alternate_player',
  'parent_rep',
] as const;

/**
 * The `hockey_player_team_history` CHECK constraints.
 * `hockey_player_team_history_position_check`
 * `hockey_player_team_history_role_check`
 * `hockey_player_team_history_jersey_number_check`
 *
 * These are enforced by the database, so the API must send values the
 * database accepts — otherwise the insert fails with a constraint error
 * that the admin cannot act on.
 */
const PLAYER_POSITIONS = ['forward', 'defense', 'goalie'] as const;
const PLAYER_ROLES = ['player', 'captain', 'alternate_captain', 'goalie', 'other'] as const;

/** Roles that are not players — they do not appear in the public roster. */
const NON_PLAYER_ROLES = new Set([
  'head_coach',
  'assistant_coach',
  'goalie_coach',
  'skills_coach',
  'manager',
  'team_staff',
  'president',
  'vice_president',
  'secretary',
  'treasurer',
  'board_member',
  'safety_officer',
]);

async function getViewer(request: NextRequest) {
  const session = await auth();
  if (!session.userId) return { userId: null as string | null };
  const cu = await currentUser();
  const userEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
  const userId = await resolveCanonicalUserId(session.userId, userEmail);
  return { userId };
}

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/** GET — read the roster. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ip = getClientIP(request);
  const rl = await checkRateLimit(`roster:${ip}`, RL);
  maybeCleanup();

  const { id: teamId } = await params;
  const { userId } = await getViewer(request);

  // Anyone may READ a public roster (the team page renders it publicly).
  // Reading is not gated; writing is.
  const { data: team } = await supabaseAdmin
    .from('team_workspaces')
    .select('id, name, slug')
    .eq('id', teamId)
    .maybeSingle();
  if (!team) return jsonError('Team not found.', 404);

  const [membersRes, historyRes] = await Promise.all([
    supabaseAdmin
      .from('team_members')
      .select(
        'id, user_id, role, jersey_number, position, shoots, birth_date, ' +
          'joined_at, left_at, is_minor, parent_user_id, notes, ' +
          'profiles:user_id(display_name, username, avatar_url)'
      )
      .eq('team_id', teamId)
      .is('left_at', null)
      .order('role')
      .order('joined_at'),
    supabaseAdmin
      .from('hockey_player_team_history')
      .select(
        'id, player_id, jersey_number, position, role, verification_source, ' +
          'season_id, start_date, end_date, ' +
          'players!inner(id, first_name, last_name, slug, headshot_url, nationality)'
      )
      .eq('team_id', teamId)
      .order('jersey_number', { ascending: true, nullsFirst: false })
      .limit(200),
  ]);

  const authority = userId ? await getTeamAuthority(userId, teamId) : null;

  const res = NextResponse.json({
    team: { id: team.id, name: team.name, slug: team.slug },
    members: membersRes.data || [],
    players: historyRes.data || [],
    authority,
  });
  return applyRateLimitHeaders(res, rl);
}

/** POST — add a member with a RinkStop account, or a player without one. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ip = getClientIP(request);
  const rl = await checkRateLimit(`roster:${ip}`, RL);
  maybeCleanup();

  const { id: teamId } = await params;
  const { userId } = await getViewer(request);
  const authority = await getTeamAuthority(userId, teamId);
  if (!authority.canManage) {
    return jsonError(rosterBlockMessage(authority.reason), 403);
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid JSON body.', 400);
  }

  // Two shapes:
  //   { kind: 'member', user_id, role, ... }  → team_members row
  //   { kind: 'player', player_id, ... }      → hockey_player_team_history row
  const kind = body?.kind === 'player' ? 'player' : 'member';

  if (kind === 'member') {
    const memberUserId = String(body.user_id || '').trim();
    if (!memberUserId) return jsonError('user_id is required.', 400);

    const role = String(body.role || 'player');
    if (!(TEAM_ROLES as readonly string[]).includes(role)) {
      return jsonError(`Invalid role "${role}".`, 400);
    }

    // A minor's roster entry must be created by their guardian.
    const isMinor = body.is_minor === true;
    const parentUserId = body.parent_user_id ? String(body.parent_user_id) : null;
    if (isMinor && !parentUserId) {
      return jsonError(
        'A minor must be linked to a guardian (parent_user_id).',
        400,
      );
    }

    // Does this person already have a row on this team?
    const { data: existing } = await supabaseAdmin
      .from('team_members')
      .select('id')
      .eq('team_id', teamId)
      .eq('user_id', memberUserId)
      .is('left_at', null)
      .limit(1)
      .maybeSingle();
    if (existing) {
      return jsonError('That person is already on this roster.', 409);
    }

    // The person must actually have a RinkStop profile.
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('user_id')
      .eq('user_id', memberUserId)
      .maybeSingle();
    if (!profile) {
      return jsonError(
        'That person does not have a RinkStop account, so they cannot be added as a member. Add them as a player instead.',
        400,
      );
    }

    const { data, error } = await supabaseAdmin
      .from('team_members')
      .insert({
        team_id: teamId,
        user_id: memberUserId,
        role,
        jersey_number:
          body.jersey_number === null || body.jersey_number === undefined || body.jersey_number === ''
            ? null
            : Number(body.jersey_number),
        position: body.position ? String(body.position).trim() : null,
        shoots: body.shoots === 'L' || body.shoots === 'R' ? body.shoots : null,
        birth_date: body.birth_date || null,
        is_minor: isMinor,
        parent_user_id: parentUserId,
        notes: body.notes ? String(body.notes).trim() : null,
        joined_at: new Date().toISOString(),
      })
      .select('id')
      .single();
    if (error) return jsonError(error.message, 500);

    const res = NextResponse.json({ ok: true, id: data.id, kind: 'member' }, { status: 201 });
    return applyRateLimitHeaders(res, rl);
  }

  // kind === 'player'
  const playerId = String(body.player_id || '').trim();
  if (!playerId) return jsonError('player_id is required.', 400);

  const { data: player } = await supabaseAdmin
    .from('players')
    .select('id')
    .eq('id', playerId)
    .maybeSingle();
  if (!player) return jsonError('Player not found.', 404);

  const { data: existing } = await supabaseAdmin
    .from('hockey_player_team_history')
    .select('id')
    .eq('team_id', teamId)
    .eq('player_id', playerId)
    .limit(1)
    .maybeSingle();
  if (existing) {
    return jsonError('That player is already on this roster.', 409);
  }

  // Validate against the table's CHECK constraints BEFORE inserting, so the
  // admin gets an actionable message instead of a database constraint error.
  const position = body.position ? String(body.position).trim().toLowerCase() : null;
  if (position && !(PLAYER_POSITIONS as readonly string[]).includes(position)) {
    return jsonError(
      `Invalid position "${position}". Use one of: ${PLAYER_POSITIONS.join(', ')}.`,
      400,
    );
  }
  const playerRole = body.role ? String(body.role).trim().toLowerCase() : 'player';
  if (!(PLAYER_ROLES as readonly string[]).includes(playerRole)) {
    return jsonError(
      `Invalid role "${playerRole}". Use one of: ${PLAYER_ROLES.join(', ')}.`,
      400,
    );
  }
  const jersey = body.jersey_number === undefined || body.jersey_number === null || body.jersey_number === ''
    ? null
    : Number(body.jersey_number);
  if (jersey !== null && (!Number.isInteger(jersey) || jersey < 0 || jersey > 99)) {
    return jsonError('Jersey number must be a whole number between 0 and 99.', 400);
  }

  // `team_name_snapshot` is NOT NULL — it records the team name at the time
  // of the stint, so the history stays readable even if the team is later
  // renamed or deactivated.
  const { data: teamRow } = await supabaseAdmin
    .from('team_workspaces')
    .select('name, league_id')
    .eq('id', teamId)
    .maybeSingle();
  const teamName = teamRow?.name || 'Unknown team';

  const { data, error } = await supabaseAdmin
    .from('hockey_player_team_history')
    .insert({
      team_id: teamId,
      team_name_snapshot: teamName,
      league_id: teamRow?.league_id ?? null,
      player_id: playerId,
      jersey_number: jersey,
      position,
      role: playerRole,
      // Rows added by a coach/admin are coach-verified by definition —
      // they were entered by the team, not self-reported by the player.
      verification_source: 'coach_verified',
      verified_by: userId,
      verified_at: new Date().toISOString(),
      start_date: body.start_date || new Date().toISOString().slice(0, 10),
    })
    .select('id')
    .single();
  if (error) return jsonError(error.message, 500);

  const res = NextResponse.json({ ok: true, id: data.id, kind: 'player' }, { status: 201 });
  return applyRateLimitHeaders(res, rl);
}

/** PATCH — update a roster row. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ip = getClientIP(request);
  const rl = await checkRateLimit(`roster:${ip}`, RL);
  maybeCleanup();

  const { id: teamId } = await params;
  const { userId } = await getViewer(request);
  const authority = await getTeamAuthority(userId, teamId);
  if (!authority.canManage) {
    return jsonError(rosterBlockMessage(authority.reason), 403);
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid JSON body.', 400);
  }

  const rowId = String(body.row_id || '').trim();
  if (!rowId) return jsonError('row_id is required.', 400);

  const kind = body.kind === 'player' ? 'player' : 'member';

  if (kind === 'member') {
    const patch: Record<string, unknown> = {};
    if (body.role !== undefined) {
      const role = String(body.role);
      if (!(TEAM_ROLES as readonly string[]).includes(role)) {
        return jsonError(`Invalid role "${role}".`, 400);
      }
      patch.role = role;
    }
    if (body.jersey_number !== undefined) {
      patch.jersey_number =
        body.jersey_number === null || body.jersey_number === '' ? null : Number(body.jersey_number);
    }
    if (body.position !== undefined) {
      patch.position = body.position ? String(body.position).trim() : null;
    }
    if (body.shoots !== undefined) {
      patch.shoots = body.shoots === 'L' || body.shoots === 'R' ? body.shoots : null;
    }
    if (body.birth_date !== undefined) patch.birth_date = body.birth_date || null;
    if (body.notes !== undefined) patch.notes = body.notes ? String(body.notes).trim() : null;
    if (body.left_at !== undefined) patch.left_at = body.left_at || null;
    patch.updated_at = new Date().toISOString();

    // The row must belong to THIS team.
    const { data: row } = await supabaseAdmin
      .from('team_members')
      .select('id')
      .eq('id', rowId)
      .eq('team_id', teamId)
      .maybeSingle();
    if (!row) return jsonError('Roster row not found on this team.', 404);

    const { error } = await supabaseAdmin.from('team_members').update(patch).eq('id', rowId);
    if (error) return jsonError(error.message, 500);

    const res = NextResponse.json({ ok: true });
    return applyRateLimitHeaders(res, rl);
  }

  // kind === 'player'
  const patch: Record<string, unknown> = {};
  if (body.jersey_number !== undefined) {
    const j =
      body.jersey_number === null || body.jersey_number === '' ? null : Number(body.jersey_number);
    if (j !== null && (!Number.isInteger(j) || j < 0 || j > 99)) {
      return jsonError('Jersey number must be a whole number between 0 and 99.', 400);
    }
    patch.jersey_number = j;
  }
  if (body.position !== undefined) {
    const pos = body.position ? String(body.position).trim().toLowerCase() : null;
    if (pos && !(PLAYER_POSITIONS as readonly string[]).includes(pos)) {
      return jsonError(
        `Invalid position "${pos}". Use one of: ${PLAYER_POSITIONS.join(', ')}.`,
        400,
      );
    }
    patch.position = pos;
  }
  if (body.role !== undefined) {
    const r = String(body.role).trim().toLowerCase();
    if (!(PLAYER_ROLES as readonly string[]).includes(r)) {
      return jsonError(`Invalid role "${r}". Use one of: ${PLAYER_ROLES.join(', ')}.`, 400);
    }
    patch.role = r;
  }
  if (body.start_date !== undefined) patch.start_date = body.start_date || null;
  if (body.end_date !== undefined) patch.end_date = body.end_date || null;
  patch.updated_at = new Date().toISOString();

  const { data: row } = await supabaseAdmin
    .from('hockey_player_team_history')
    .select('id')
    .eq('id', rowId)
    .eq('team_id', teamId)
    .maybeSingle();
  if (!row) return jsonError('Roster row not found on this team.', 404);

  const { error } = await supabaseAdmin
    .from('hockey_player_team_history')
    .update(patch)
    .eq('id', rowId);
  if (error) return jsonError(error.message, 500);

  const res = NextResponse.json({ ok: true });
  return applyRateLimitHeaders(res, rl);
}

/** DELETE — remove a roster row. */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ip = getClientIP(request);
  const rl = await checkRateLimit(`roster:${ip}`, RL);
  maybeCleanup();

  const { id: teamId } = await params;
  const { userId } = await getViewer(request);
  const authority = await getTeamAuthority(userId, teamId);
  if (!authority.canManage) {
    return jsonError(rosterBlockMessage(authority.reason), 403);
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid JSON body.', 400);
  }

  const rowId = String(body.row_id || '').trim();
  if (!rowId) return jsonError('row_id is required.', 400);

  const kind = body.kind === 'player' ? 'player' : 'member';
  const table = kind === 'player' ? 'hockey_player_team_history' : 'team_members';

  const { data: row } = await supabaseAdmin
    .from(table)
    .select('id')
    .eq('id', rowId)
    .eq('team_id', teamId)
    .maybeSingle();
  if (!row) return jsonError('Roster row not found on this team.', 404);

  const { error } = await supabaseAdmin.from(table).delete().eq('id', rowId);
  if (error) return jsonError(error.message, 500);

  const res = NextResponse.json({ ok: true });
  return applyRateLimitHeaders(res, rl);
}
