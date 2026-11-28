/**
 * Reads a directory list endpoint and separates the three outcomes a page must
 * tell apart:
 *  - ok: a successful HTTP response whose body has a `data` array (may be empty)
 *  - failed: a non-2xx status, a body that is not the expected shape, or a body
 *    that cannot be parsed. Failures must never be shown as "no results".
 */
export type ListResult<T> = { ok: true; data: T[] } | { ok: false };

/** Same as ListResult, plus the server's exact `count` when the body sent one. */
export type ListPageResult<T> = { ok: true; data: T[]; count: number | null } | { ok: false };

export async function readListPage<T = unknown>(res: Response): Promise<ListPageResult<T>> {
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
  const count = (body as { count?: unknown }).count;
  return {
    ok: true,
    data: (body as { data: T[] }).data,
    count: typeof count === 'number' && Number.isFinite(count) ? count : null,
  };
}

export async function readListResponse<T = unknown>(res: Response): Promise<ListResult<T>> {
  const page = await readListPage<T>(res);
  return page.ok ? { ok: true, data: page.data } : { ok: false };
}

export const LIST_UNAVAILABLE_MESSAGE = 'Teams are temporarily unavailable. Please try again shortly.';
