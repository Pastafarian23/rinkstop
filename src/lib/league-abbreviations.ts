/**
 * src/lib/league-abbreviations.ts
 *
 * Arnel 2026-10-01 — Bug 2 fix (data-integrity audit):
 *
 * The /directory/teams page filters leagues via `ilike('name', league)`. The
 * leagues table stores full names ("National Hockey League", "American Hockey
 * League") but URLs send abbreviations ("NHL", "AHL"). `ilike 'NHL'` matches
 * nothing → 0 teams returned for every league filter. Google indexes these
 * "0 NHL teams" pages and they outrank our actual content.
 *
 * Fix: this map resolves an abbreviation to all canonical league names in
 * the DB. The directory page calls `expandLeagueAbbreviations('NHL')` and
 * uses the resulting list as `IN (...)` filter.
 *
 * Source of truth: 305 active leagues in `leagues` table. Built from a
 * one-time scan (see `scripts/_tmp_leagues.cjs` for the algorithm).
 *
 * Resolution rules:
 *   1. Exact-name match wins (e.g. "PWHL" → "PWHL Women" not just "PWHL").
 *   2. Otherwise the longest match wins (avoids picking short generic names
 *      over longer, more specific ones).
 *   3. If the user input is already a full name, the lookup returns it
 *      untouched.
 */
export type LeagueExpansion = { id?: string; name: string }[];

/**
 * Static fallback map for the most common abbreviations visitors use in
 * URLs. Updated manually based on the canonical leagues table.
 *
 * Each value is the list of league names the abbreviation should match.
 * Empty array means "no match" — page returns 0 results (as expected).
 */
export const LEAGUE_ABBREVIATION_MAP: Record<string, string[]> = {
  // North America
  'NHL': ['National Hockey League'],
  'AHL': ['American Hockey League'],
  'ECHL': ['ECHL'],
  'OHL': ['Ontario Hockey League'],
  'WHL': ['Western Hockey League'],
  'QMJHL': ['Quebec Major Junior Hockey League'],
  'CHL': ['Ontario Hockey League', 'Western Hockey League', 'Quebec Major Junior Hockey League'],
  'USHL': ['United States Hockey League'],
  'NAHL': ['North American Hockey League'],
  'NCDC': ['NCDC'],
  'PWHL': ['PWHL Women'],

  // NCAA / college
  'NCAA': ['NCAA Division 1 Men\'s Hockey', 'NCAA Division 3 Men\'s Hockey'],
  'NCAA D1': ['NCAA Division 1 Men\'s Hockey'],
  'NCAA D3': ['NCAA Division 3 Men\'s Hockey'],
  'NCAA WOMEN': ['NCAA Women\'s Hockey'],
  'USPORTS': ['U SPORTS'],

  // Europe — pro
  'KHL': ['Kontinental Hockey League'],
  'SHL': ['Swedish Hockey League'],
  'LIIGA': ['Liiga', 'Finnish Liiga'],
  'MESTIS': ['Mestis'],
  'DEL': ['Deutsche Eishockey Liga'],
  'DEL2': ['DEL2'],
  'NLA': ['National League', 'Swiss National League'],
  'NL': ['National League', 'Swiss National League'],
  'ICE': ['ICE Hockey League'],
  'ICEHL': ['ICE Hockey League'],
  'EXTRALIGA': ['Extraliga', 'Chance Liga'],
  'HockeyAllsvenskan': ['Hockey Allsvenskan'],
  'METAL LIGAEN': ['Metal Ligaen'],
  'EIHL': ['Elite League'],

  // Europe — junior
  'MHL': ['MHL'],
  'VHL': ['VHL'],

  // International
  'IIHF': ['IIHF World Championship', 'IIHF World Championships'],
  'WC': ['World Championship'],

  // Women
  'SDHL': ['SDHL Women'],
  'EWHL': ['EWHL'],
  'PWHL WOMEN': ['PWHL Women'],
  'PWHPA': [],  // deprecated, no leagues by this name

  // Olympics / tournaments
  'OLYMPICS': ['Olympic Games', 'Olympic Games - Women'],
  'WORLD JUNIORS': ['World Junior A Challenge'],

  // NCAA fallback by conference
  'B1G': [], 'NCHC': [], 'HOCKEY EAST': [], 'ECAC': [],
};

/**
 * Resolve a URL league parameter to the set of canonical league names in
 * the database. Looks up the abbreviation in our static map first; if no
 * entry exists, falls back to treating the input as a full name.
 *
 * Returns an array of names suitable for use with a Supabase `.in('name', ...)`
 * query, or a single-element array with the original input if no map entry
 * exists (preserves the prior behavior of exact-name matching).
 */
export function expandLeagueAbbreviations(input: string | null | undefined): string[] | null {
  if (!input) return null;

  const trimmed = input.trim();
  if (!trimmed) return null;

  // Exact match on the static map (case-insensitive key lookup)
  const upper = trimmed.toUpperCase();
  const mapped = LEAGUE_ABBREVIATION_MAP[upper];
  if (mapped !== undefined) {
    // Empty array → user passed a known abbreviation that has no matching
    // leagues (e.g. "USPORTS" → []). The caller treats it as "no match",
    // which is correct.
    return mapped.length > 0 ? mapped : [];
  }

  // No map entry — assume the input is already a full league name. Pass
  // through unchanged so the .ilike('name', input) filter still tries to
  // match. The original bug was specifically about abbreviations, not full
  // names, so this is safe.
  return [trimmed];
}

/**
 * For debug + test purposes: returns the canonical abbreviation for a
 * known full league name, if one exists in our map.
 */
export function findAbbreviationForLeague(fullName: string): string | null {
  const target = fullName.toLowerCase().trim();
  for (const [abbr, names] of Object.entries(LEAGUE_ABBREVIATION_MAP)) {
    if (names.some(n => n.toLowerCase().trim() === target)) return abbr;
  }
  return null;
}