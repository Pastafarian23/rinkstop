/**
 * Count-aware summary line for directory headings.
 *
 * A count is shown only when it is a real positive number. Zero, missing and
 * non-finite values mean "not available" (for example a failed RPC or a
 * placeholder backend), so they never render as "0+".
 */
export function knownCount(...candidates: Array<number | null | undefined>): number | null {
  for (const c of candidates) {
    if (typeof c === 'number' && Number.isFinite(c) && c > 0) return Math.floor(c);
  }
  return null;
}

export function leagueSummary(leagues: number | null, countries: number | null): string {
  const tiers = 'professional, junior, college, international, and amateur tiers.';
  if (leagues === null && countries === null) {
    return `Hockey leagues from ${tiers}`;
  }
  const parts: string[] = [];
  if (leagues !== null) parts.push(`${leagues.toLocaleString()}+ leagues`);
  if (countries !== null) parts.push(`across ${countries.toLocaleString()}+ countries`);
  return `${parts.join(' ')} — ${tiers}`;
}

/**
 * Lead-in phrase for leagues metadata: "305+ hockey leagues across 84+ countries".
 * Missing parts are dropped; with nothing known it reads "hockey leagues worldwide".
 */
export function leagueLeadPhrase(leagues: number | null, countries: number | null): string {
  if (leagues !== null && countries !== null) return `${leagues.toLocaleString()}+ hockey leagues across ${countries.toLocaleString()}+ countries`;
  if (leagues !== null) return `${leagues.toLocaleString()}+ hockey leagues`;
  if (countries !== null) return `hockey leagues across ${countries.toLocaleString()}+ countries`;
  return 'hockey leagues worldwide';
}

/** Count phrase for FAQ and body copy: "305+ active hockey leagues" or "active hockey leagues". */
export function leagueCountNoun(leagues: number | null): string {
  return leagues === null ? 'active hockey leagues' : `${leagues.toLocaleString()}+ active hockey leagues`;
}

/** Teams sentence used in metadata, FAQ, body copy: "2,656+ active hockey teams across 295+ leagues and 84+ countries". */
export function teamsTrackedPhrase(teams: number | null, leagues: number | null, countries: number | null): string {
  const base = teams !== null ? `${teams.toLocaleString()}+ active hockey teams` : 'active hockey teams';
  const extra: string[] = [];
  if (leagues !== null) extra.push(`${leagues.toLocaleString()}+ leagues`);
  if (countries !== null) extra.push(`${countries.toLocaleString()}+ countries`);
  return extra.length ? `${base} across ${extra.join(' and ')}` : base;
}

/** Rinks sentence for descriptions: "2,000 ice rinks and arenas across 84+ countries and 500 cities". */
export function rinksPhrase(rinks: number | null, countries: number | null, cities: number | null): string {
  const base = rinks !== null ? `${rinks.toLocaleString()} ice rinks and arenas` : 'ice rinks and arenas';
  const extra: string[] = [];
  if (countries !== null) extra.push(`${countries.toLocaleString()}+ countries`);
  if (cities !== null) extra.push(`${cities.toLocaleString()} cities`);
  return extra.length ? `${base} across ${extra.join(' and ')}` : base;
}

/** Rinks page title: "2,000 Ice Rinks Across 84 Countries — Find One Near You". */
export function rinksTitle(rinks: number | null, countries: number | null): string {
  let base = rinks !== null ? `${rinks.toLocaleString()} Ice Rinks` : 'Ice Rinks Worldwide';
  if (countries !== null) base += ` Across ${countries.toLocaleString()} Countries`;
  return `${base} — Find One Near You`;
}
