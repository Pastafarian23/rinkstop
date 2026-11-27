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
