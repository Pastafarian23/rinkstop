/**
 * Helpers for the client-side league refresh. The server-rendered league is the
 * fallback: a refresh only replaces it when the payload is a real list and holds
 * the requested league. Any other result keeps the server copy on screen.
 */

/** Returns the list from a bare array or a `{ data: [] }` payload. Anything else is []. */
export function listFromPayload(payload: unknown): any[] {
  if (Array.isArray(payload)) return payload;
  const data = (payload as { data?: unknown } | null | undefined)?.data;
  return Array.isArray(data) ? data : [];
}

/** Finds a league by slug, then by id. Returns null for a non-array payload or no match. */
export function findRefreshedLeague(payload: unknown, param: string): any | null {
  if (!Array.isArray(payload)) return null;
  return (
    payload.find((x: any) => x && x.slug === param) ||
    payload.find((x: any) => x && x.id === param) ||
    null
  );
}
