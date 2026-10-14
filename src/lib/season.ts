/**
 * src/lib/season.ts
 * Derive a display-season string from a fixture's scheduled_at date.
 */

/** "2025-10-04" → "2025-26"; "2026-04-15" → "2025-26"; "2026-09-01" → "2026-27" */
export function deriveSeasonFromDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const month = d.getUTCMonth() + 1;
  const year = d.getUTCFullYear();
  const startYear = month >= 8 ? year : year - 1;
  const endYear = startYear + 1;
  return `${startYear}-${String(endYear).padStart(2, '0')}`;
}
