/**
 * Reads a directory list endpoint and separates the three outcomes a page must
 * tell apart:
 *  - ok: a successful HTTP response whose body has a `data` array (may be empty)
 *  - failed: a non-2xx status, a body that is not the expected shape, or a body
 *    that cannot be parsed. Failures must never be shown as "no results".
 */
export type ListResult<T> = { ok: true; data: T[] } | { ok: false };

export async function readListResponse<T = unknown>(res: Response): Promise<ListResult<T>> {
  if (!res.ok) return { ok: false };
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    return { ok: false };
  }
  if (!body || typeof body !== 'object' || !Array.isArray((body as { data?: unknown }).data)) {
    return { ok: false };
  }
  return { ok: true, data: (body as { data: T[] }).data };
}

export const LIST_UNAVAILABLE_MESSAGE = 'Teams are temporarily unavailable. Please try again shortly.';
