/**
 * Paging state for the Teams directory "Load more" list.
 *
 * The directory is one ordered list of active team rows, ordered by name and
 * then id. The server-rendered first page and /api/teams both use that order,
 * so every row sits at exactly one offset. Load more advances a single cursor
 * by the number of rows the server actually returned, and drops any row whose
 * id is already on the page.
 *
 * Earlier versions advanced the offset by the merged list length, and fetched
 * /api/user-teams, which takes no offset and returns the same rows on every
 * call. That appended repeated rows and skipped others.
 *
 * Pure functions only, so the client state transitions can be tested directly.
 */

/** Rows per server page. The server-rendered first page uses the same size. */
export const TEAMS_PAGE_SIZE = 48;

export interface TeamsPageState<T extends { id: string }> {
  /** Filter key this state belongs to. State for another filter is never used. */
  key: string;
  /** Rows loaded by Load more. Server-rendered seed rows are kept by the caller. */
  teams: T[];
  /** Next server offset: the number of name-ordered rows consumed so far. */
  cursor: number;
  hasMore: boolean;
}

/**
 * Starting state for a filter. `initialCursor` is the number of rows the
 * server-rendered first page took from the ordered list (at most one page).
 * `initialHasMore` comes from a one-row lookahead on that same query, so an
 * exact page does not trigger an empty request.
 */
export function initialTeamsPageState<T extends { id: string }>(
  key: string,
  initialCursor: number,
  initialHasMore: boolean,
): TeamsPageState<T> {
  return { key, teams: [], cursor: initialCursor, hasMore: initialHasMore };
}

export interface TeamsPageResponse<T extends { id: string }> {
  key: string;
  /** The offset this request was sent with. */
  requestedOffset: number;
  rows: T[];
  /** Exact count of the ordered list from the server, or null if it was not sent. */
  total: number | null;
  /** Rows already on the page before this response (the server-rendered seed). */
  seedTeams: readonly T[];
}

/**
 * Applies one Load more response. Returns the state unchanged when the response
 * belongs to another filter, or when it does not start at the cursor (a repeat
 * or out-of-order request). Otherwise it appends only rows whose id is new,
 * advances the cursor by the rows returned, and recomputes hasMore.
 */
export function applyTeamsPage<T extends { id: string }>(
  state: TeamsPageState<T>,
  page: TeamsPageResponse<T>,
): TeamsPageState<T> {
  if (page.key !== state.key) return state;
  if (page.requestedOffset !== state.cursor) return state;

  const seen = new Set<string>();
  for (const t of page.seedTeams) seen.add(t.id);
  for (const t of state.teams) seen.add(t.id);

  const fresh: T[] = [];
  for (const t of page.rows) {
    if (seen.has(t.id)) continue;
    seen.add(t.id);
    fresh.push(t);
  }

  const cursor = page.requestedOffset + page.rows.length;
  // A short page means the ordered list has ended. An exact total, when sent,
  // also bounds the cursor so a full last page does not trigger an empty fetch.
  const hasMore =
    page.rows.length >= TEAMS_PAGE_SIZE &&
    (page.total === null || cursor < page.total);

  return { key: state.key, teams: [...state.teams, ...fresh], cursor, hasMore };
}
