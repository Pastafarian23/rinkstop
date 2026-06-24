/**
 * Stable team color palette.
 *
 * Each team gets a color derived from its ID so the assignment is consistent
 * across renders and sessions. No DB writes, no random assignment.
 *
 * Used by /dashboard/schedule (G1c) to visually distinguish events from
 * multiple teams on the same day.
 */

export const TEAM_PALETTE = [
  { color: '#FFB81C', bg: 'rgba(255,184,28,0.18)', border: 'rgba(255,184,28,0.55)' }, // gold (RinkStop brand)
  { color: '#C8102E', bg: 'rgba(200,16,46,0.18)',  border: 'rgba(200,16,46,0.55)'  }, // red
  { color: '#14b8a6', bg: 'rgba(20,184,166,0.18)',  border: 'rgba(20,184,166,0.55)'  }, // teal
  { color: '#a855f7', bg: 'rgba(168,85,247,0.18)',  border: 'rgba(168,85,247,0.55)'  }, // purple
  { color: '#3b82f6', bg: 'rgba(59,130,246,0.18)',  border: 'rgba(59,130,246,0.55)'  }, // blue
  { color: '#22c55e', bg: 'rgba(34,197,94,0.18)',   border: 'rgba(34,197,94,0.55)'   }, // green
  { color: '#ec4899', bg: 'rgba(236,72,153,0.18)',  border: 'rgba(236,72,153,0.55)'  }, // pink
  { color: '#f97316', bg: 'rgba(249,115,22,0.18)',  border: 'rgba(249,115,22,0.55)'  }, // orange
] as const;

/**
 * Returns a stable color for a team ID. Hashes the UUID to an index 0-7.
 * Same team always gets the same color.
 */
export function teamColor(teamId: string) {
  let hash = 0;
  for (let i = 0; i < teamId.length; i++) {
    hash = ((hash << 5) - hash + teamId.charCodeAt(i)) | 0;
  }
  const idx = Math.abs(hash) % TEAM_PALETTE.length;
  return TEAM_PALETTE[idx];
}

/** Short display label for a team (slug → uppercase first 6 chars, or short_name) */
export function teamShortLabel(team: { short_name?: string | null; slug: string; name?: string }) {
  if (team.short_name && team.short_name.trim()) return team.short_name.trim();
  // Fall back to first 8 chars of the name (or slug if name empty)
  const src = (team.name || team.slug || '').trim();
  if (!src) return 'Team';
  return src.length > 8 ? src.slice(0, 8) : src;
}