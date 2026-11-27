/**
 * Response contract for GET /api/leagues (list mode).
 *
 * Success: HTTP 200 with a JSON ARRAY of league rows.
 * Failure: a non-2xx status with a JSON OBJECT like { error: string }.
 *
 * The directory client must only replace its list with a successful array.
 * Anything else keeps the current list, so an error body can never reach
 * code that calls array methods on it.
 */
export function nextLeagueList<T>(current: T[], ok: boolean, body: unknown): T[] {
  return ok && Array.isArray(body) ? (body as T[]) : current;
}
