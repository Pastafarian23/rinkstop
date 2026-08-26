// src/lib/nhl-coaching.ts
//
// Data accessors for the nhl_coaching_staff table.
//
// Most code calls getTeamCoachingStaff() for the per-team view.
// The verifyCoachingAudit() function is used by the /admin/nhl-coaching-audit
// page to surface rows that need human review before public display.

import { supabaseAdmin } from './supabase';

export type CoachingRole =
  | 'head_coach'
  | 'associate_coach'
  | 'assistant_coach'
  | 'goaltending_coach'
  | 'video_coach'
  | 'skills_coach'
  | 'other';

export type CoachingStatus =
  | 'full_season'
  | 'hired_mid'
  | 'left_mid'
  | 'interim'
  | 'unconfirmed';

export interface NhlCoachRow {
  id: number;
  nhl_team_id: string;
  season: string;
  role: CoachingRole;
  name: string;
  start_date: string | null;
  end_date: string | null;
  status: CoachingStatus;
  notes: string | null;
  display_order: number;
}

export interface NhlCoachRowWithTeam extends NhlCoachRow {
  team_name: string;
  team_short_name: string | null;
}

export const ROLE_LABEL: Record<CoachingRole, string> = {
  head_coach: 'Head Coach',
  associate_coach: 'Associate Coach',
  assistant_coach: 'Assistant Coach',
  goaltending_coach: 'Goaltending Coach',
  video_coach: 'Video Coach',
  skills_coach: 'Skills Coach',
  other: 'Staff',
};

export const STATUS_LABEL: Record<CoachingStatus, string> = {
  full_season: 'Full season',
  hired_mid: 'Hired mid-season',
  left_mid: 'Left mid-season',
  interim: 'Interim',
  unconfirmed: 'Roster TBD',
};

export const STATUS_COLOR: Record<CoachingStatus, string> = {
  full_season: '#22c55e',
  hired_mid: '#3b82f6',
  left_mid: '#ef4444',
  interim: '#fbbf24',
  unconfirmed: '#a3a3a3',
};

/** Strip "[AUDIT-REQUIRED: ...]" suffix from notes for clean public display. */
export function stripAuditTag(notes: string | null): string | null {
  if (!notes) return null;
  return notes
    .replace(/\s*\|\s*\[\s*AUDIT-REQUIRED:[^\]]*\]\s*/g, '')
    .replace(/^\s*\[\s*AUDIT-REQUIRED:[^\]]*\]\s*/, '')
    .trim() || null;
}

/** Returns true if the notes field contains an AUDIT-REQUIRED tag. */
export function hasAuditTag(notes: string | null): boolean {
  return !!notes && notes.includes('AUDIT-REQUIRED');
}

/** Fetch all coaching staff for a team in a given season. */
export async function getTeamCoachingStaff(
  nhlTeamId: string,
  season: string = '2025-26',
): Promise<NhlCoachRow[]> {
  const { data, error } = await supabaseAdmin
    .from('nhl_coaching_staff')
    .select('*')
    .eq('nhl_team_id', nhlTeamId)
    .eq('season', season)
    .order('display_order', { ascending: true })
    .order('id', { ascending: true });

  if (error) {
    throw new Error(`Failed to load coaching staff for team ${nhlTeamId}: ${error.message}`);
  }
  return (data ?? []) as NhlCoachRow[];
}

/**
 * Fetch every coaching row for the season joined with the team name.
 * Used by /admin/nhl-coaching-audit and /directory/nhl/coaches.
 */
export async function getAllCoachingStaff(
  season: string = '2025-26',
): Promise<NhlCoachRowWithTeam[]> {
  const { data, error } = await supabaseAdmin
    .from('nhl_coaching_staff')
    .select('*, nhl_teams: nhl_team_id (name, short_name)')
    .eq('season', season)
    .order('nhl_team_id', { ascending: true })
    .order('display_order', { ascending: true });

  if (error) {
    throw new Error(`Failed to load all coaching staff: ${error.message}`);
  }

  // Flatten the join. Supabase returns it as { ..., nhl_teams: { name, short_name } }.
  return (data ?? []).map((row: any) => ({
    ...row,
    team_name: row.nhl_teams?.name ?? 'Unknown',
    team_short_name: row.nhl_teams?.short_name ?? null,
  })) as NhlCoachRowWithTeam[];
}

/** Fetch rows flagged with AUDIT-REQUIRED in the notes field. */
export async function verifyCoachingAudit(
  season: string = '2025-26',
): Promise<NhlCoachRowWithTeam[]> {
  const all = await getAllCoachingStaff(season);
  return all.filter((row) => hasAuditTag(row.notes));
}

/** Count of audit-required rows (for dashboards / heartbeat). */
export async function countAuditRequired(season: string = '2025-26'): Promise<number> {
  const rows = await verifyCoachingAudit(season);
  return rows.length;
}