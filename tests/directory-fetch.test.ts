import { describe, expect, it } from 'vitest';
import { readListResponse, LIST_UNAVAILABLE_MESSAGE } from '@/lib/directory-fetch';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('readListResponse: successful empty result', () => {
  it('a 200 with an empty data array is a genuine zero-result success', async () => {
    const r = await readListResponse(json({ data: [], count: 0 }));
    expect(r).toEqual({ ok: true, data: [] });
  });
  it('a 200 with rows returns them', async () => {
    const r = await readListResponse(json({ data: [{ id: 't1' }], count: 1 }));
    expect(r).toEqual({ ok: true, data: [{ id: 't1' }] });
  });
});

describe('readListResponse: failed requests are never treated as empty', () => {
  it('an HTTP 500 with an error body is a failure, even though the body is JSON', async () => {
    const r = await readListResponse(json({ error: 'fetch failed' }, 500));
    expect(r.ok).toBe(false);
  });
  it('an HTTP 404 is a failure', async () => {
    expect((await readListResponse(json({ data: [] }, 404))).ok).toBe(false);
  });
  it('a 200 whose body has no data array is an invalid response, not zero results', async () => {
    expect((await readListResponse(json({ error: 'unexpected' }))).ok).toBe(false);
    expect((await readListResponse(json(null))).ok).toBe(false);
    expect((await readListResponse(json({ data: 'not-an-array' }))).ok).toBe(false);
  });
  it('a 200 with a body that is not JSON is a failure', async () => {
    expect((await readListResponse(new Response('<html>oops</html>', { status: 200 }))).ok).toBe(false);
  });
});

describe('unavailable message', () => {
  it('is neutral and contains no count or misleading zero', () => {
    expect(LIST_UNAVAILABLE_MESSAGE).toBe('Teams are temporarily unavailable. Please try again shortly.');
    expect(LIST_UNAVAILABLE_MESSAGE).not.toMatch(/\b0\b|total|No results/i);
  });
});
