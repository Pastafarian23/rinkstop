// Franchise-name resolution for game displays.
//
// The DB stores one canonical team row per active franchise (e.g. one
// "Utah Hockey Club" record), and fixtures reference it via team_home_id /
// team_away_id. That join makes every historical Phoenix Coyotes game
// render as "Utah Hockey Club" — wrong per Arnel directive.
//
// This module provides a date-aware lookup: given a team slug and a game
// date, return the name that team was known by on that date, plus the
// current-name suffix for cross-referencing.
//
// Dates are inclusive on both ends. effective_to is exclusive for the
// next entry — so a Phoenix→Arizona switch on 2014-01-01 has:
//   phoenix-coyotes: 1979-07-01 → 2014-01-01
//   arizona-coyotes: 2014-01-01 → 2024-04-18
//   utah-hockey-club: 2024-04-19 → present
// (the actual franchise moved to Utah in spring 2024; we use a known
//  transfer-effective date. If a date falls in a gap, the lookup falls
//  back to current name.)

import { NHL_FRANCHISE_HISTORY, getChainForSlug, type FranchiseEntry } from './nhl-franchise-history';
import { findCanonicalTeam } from './nhl-teams-canonical';

export type DisplayName = {
  /** The name to render in this game. */
  display: string;
  /** Slug of the entry this name belongs to. */
  entrySlug: string;
  /** Was this the team active on the game date, or just the current row? */
  isHistorical: boolean;
  /** Current name of the franchise, if different from display. */
  currentName?: string;
  /** Slug of the current team (always populated). */
  currentSlug: string;
};

/**
 * Look up the franchise name active on the given date.
 * @param teamSlug  The current canonical slug (or any historical slug in a chain).
 * @param date      The game date (ISO string or Date).
 */
export function displayNameForGame(teamSlug: string, date: string | Date | null | undefined): DisplayName {
  const chain = getChainForSlug(teamSlug);
  if (!chain) {
    // No chain = team has never relocated/renamed. Resolve via the
    // canonical team list so we always return a real display name
    // (not the raw slug).
    const canonical = findCanonicalTeam(teamSlug);
    return {
      display: canonical?.name ?? teamSlug,
      entrySlug: teamSlug,
      isHistorical: false,
      currentSlug: teamSlug,
    };
  }

  const current = chain.chain[chain.chain.length - 1];
  const gameDate = date ? new Date(date) : null;
  const isValidDate = gameDate && !isNaN(gameDate.getTime());

  if (!isValidDate) {
    // No date — show current name.
    return {
      display: current.name,
      entrySlug: current.slug,
      isHistorical: false,
      currentSlug: chain.current,
    };
  }

  const ts = gameDate.getTime();
  const match = chain.chain.find((entry) => {
    const from = parseYearOrDate(entry.startDate);
    const to = parseYearOrDate(entry.endDate);
    if (from === null) return false;
    // Inclusive start, inclusive end (or open-ended if endDate is null)
    if (ts < from) return false;
    if (to !== null && ts > to) return false;
    return true;
  });

  if (!match) {
    // Date fell in a gap or before any known start. Fall back to current.
    return {
      display: current.name,
      entrySlug: current.slug,
      isHistorical: false,
      currentSlug: chain.current,
    };
  }

  const isCurrent = match.slug === current.slug;
  return {
    display: match.name,
    entrySlug: match.slug,
    isHistorical: !isCurrent,
    currentName: isCurrent ? undefined : current.name,
    currentSlug: chain.current,
  };
}

/**
 * Short alias label for old-game context.
 * Returns "Phoenix Coyotes (now Utah Hockey Club)" if the game date is
 * from a historical era. Returns undefined for current games.
 */
export function historicalAliasLabel(teamSlug: string, date: string | Date | null | undefined): string | undefined {
  const d = displayNameForGame(teamSlug, date);
  if (!d.isHistorical) return undefined;
  return `${d.display} (now ${d.currentName})`;
}

// --- Internal: parse "1902-01-01" or "1996" into a timestamp ---
function parseYearOrDate(value: string | null | undefined): number | null {
  if (!value) return null;
  // Full ISO date like "2024-04-19"
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return Date.parse(`${value}T00:00:00Z`);
  }
  // Year only like "1996" — treat as Jan 1
  if (/^\d{4}$/.test(value)) {
    return Date.parse(`${value}-01-01T00:00:00Z`);
  }
  return null;
}

/**
 * Get the chain itself for components that want the whole lineage.
 * Convenience re-export.
 */
export function getChainForTeam(slug: string) {
  return getChainForSlug(slug);
}

/**
 * List every team slug that has a multi-era chain (used by admin pages,
 * sitemap entries, etc.).
 */
export const FRANCHISES_WITH_HISTORY: string[] = NHL_FRANCHISE_HISTORY.map((c) => c.current);