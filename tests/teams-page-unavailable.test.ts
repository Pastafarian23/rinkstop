import { describe, expect, it, vi } from 'vitest';
import { renderToReadableStream } from 'react-dom/server';

// Simulates the production failure: the Supabase client rejects with the same
// error the Preview reports ("TypeError: fetch failed"). Everything else is
// neutral so the real teams page renders to HTML.
vi.mock('next/cache', () => ({ unstable_cache: (fn: any) => fn, revalidateTag: () => {} }));
vi.mock('@/lib/supabase', () => {
  let mode: 'fail' | 'empty' = 'fail';
  const failing = () => (mode === 'fail'
    ? Promise.reject(new TypeError('fetch failed'))
    : Promise.resolve({ data: [], error: null, count: 0 }));
  const chain: any = {};
  for (const m of ['select', 'eq', 'neq', 'ilike', 'or', 'in', 'order', 'range', 'limit', 'is', 'not', 'gte', 'lte', 'filter', 'contains', 'match', 'returns']) chain[m] = () => chain;
  chain.then = (res: any, rej: any) => failing().then(res, rej);
  (globalThis as any).__setTeamsMode = (m: 'fail' | 'empty') => { mode = m; };
  chain.maybeSingle = failing;
  chain.single = failing;
  const client = { from: () => chain, rpc: failing };
  return { supabase: client, supabaseAdmin: client };
});
vi.mock('@clerk/nextjs', () => import('../staging-stubs/clerk-signed-out'));
vi.mock('@clerk/nextjs/server', () => import('../staging-stubs/clerk-signed-out'));
vi.mock('next/navigation', () => ({
  notFound: () => { throw new Error('NEXT_NOT_FOUND'); },
  redirect: (url: string) => { throw new Error('NEXT_REDIRECT:' + url); },
  usePathname: () => '/directory/teams',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push() {}, replace() {}, refresh() {}, prefetch() {}, back() {} }),
}));

async function html(el: any): Promise<string> {
  const stream = await renderToReadableStream(el);
  await stream.allReady;
  const reader = stream.getReader(); const dec = new TextDecoder(); let out = '';
  for (;;) { const { done, value } = await reader.read(); if (done) break; out += dec.decode(value, { stream: true }); }
  return out + dec.decode();
}

import TeamsPage from '@/app/directory/teams/page';

describe('teams page when the initial query succeeds with no rows', () => {
  it('shows the normal no-results message, not the unavailable message', async () => {
    (globalThis as any).__setTeamsMode('empty');
    const el = await TeamsPage({ searchParams: Promise.resolve({}) } as any);
    const out = await html(el);
    expect(out).toContain('No teams found');
    expect(out).not.toContain('temporarily unavailable');
    expect(out).not.toMatch(/\(0 total\)/);
  }, 60000);
});

describe('teams page when the initial query fails', () => {
  it('restores failure mode for the failure test', () => {
    (globalThis as any).__setTeamsMode('fail');
  });
  it('shows the unavailable message, not "No results"', async () => {
    const el = await TeamsPage({ searchParams: Promise.resolve({}) } as any);
    const out = await html(el);
    expect(out).toContain('Teams are temporarily unavailable');
    expect(out).not.toContain('No teams found');
    expect(out).not.toMatch(/\(0 total\)/);
  }, 60000);
});
