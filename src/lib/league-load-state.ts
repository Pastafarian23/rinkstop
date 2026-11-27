// Interprets the client-side league-list refresh (B-2, staging, 2026-11-27).
// Pure: no DOM, no fetch. The league client uses this so every outcome is explicit.
//   found      -> show the league (replaces the server copy with the refreshed one)
//   not_found  -> the league is not in the active list; show a clear message
//   error      -> request failed, rate-limited, timed out or returned an unexpected shape
// Visitors never stay on "Loading": every request resolves to one of these outcomes.

export type LeagueRefreshOutcome =
  | { kind: 'found'; league: Record<string, unknown> }
  | { kind: 'not_found' }
  | { kind: 'error' };

export function interpretLeagueListResponse(
  httpOk: boolean,
  body: unknown,
  slugOrId: string,
): LeagueRefreshOutcome {
  if (!httpOk) return { kind: 'error' };
  if (!Array.isArray(body)) return { kind: 'error' };
  const found = body.find(
    (l): l is Record<string, unknown> =>
      !!l && typeof l === 'object' && (l.slug === slugOrId || l.id === slugOrId),
  );
  return found ? { kind: 'found', league: found } : { kind: 'not_found' };
}

export const LEAGUE_NOT_FOUND_MESSAGE = "We couldn't find this league. It may have been renamed or removed.";
export const LEAGUE_ERROR_MESSAGE = "We couldn't load this league right now. Please refresh the page in a moment.";
export const LEAGUE_REQUEST_TIMEOUT_MS = 10000;
