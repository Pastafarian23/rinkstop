/**
 * Paged, server-side league search for the directory (paged mode of GET /api/leagues).
 * Searches and filters the FULL active dataset, then returns one page.
 *
 * - sort=tier: every matching league is ranked on the server (claim tier, name, id)
 *   before the page is sliced, so Load More never reorders or repeats rows.
 * - otherwise: database order by name then id, with an exact total.
 */
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { enrichEntitiesWithClaimTier, isVerifiedClaim } from '@/lib/listingTier';
import { pageInfo, rangeFor, sortAndSlice, type PageRequest } from '@/lib/rinks-list';
import { LEAGUE_PUBLIC_COLUMNS } from '@/lib/public-directory-fields';

export interface LeaguePageParams {
  search?: string | null;
  country?: string | null;
  verifiedOnly?: boolean;
  sort: string;
  page: PageRequest;
}

export interface LeaguePageResult {
  count: number;
  offset: number;
  limit: number;
  hasMore: boolean;
  nextOffset: number | null;
  data: Array<Record<string, unknown>>;
}

const SCAN_CHUNK = 1000;
const ENRICH_CHUNK = 500;

/* eslint-disable @typescript-eslint/no-explicit-any */
function applyFilters(q: any, p: LeaguePageParams): any {
  q = q.eq('is_active', true);
  if (p.search) q = q.ilike('name', `%${p.search}%`);
  if (p.country) q = q.ilike('country', `%${p.country}%`);
  return q;
}

async function tierMapFor(ids: string[]): Promise<Map<string, any>> {
  const out = new Map<string, any>();
  for (let i = 0; i < ids.length; i += ENRICH_CHUNK) {
    const part = await enrichEntitiesWithClaimTier(supabaseAdmin, 'league', ids.slice(i, i + ENRICH_CHUNK));
    for (const [k, v] of part) out.set(k, v);
  }
  return out;
}

function decorate(rows: any[], tiers: Map<string, any>): Array<Record<string, unknown>> {
  return rows.map((d) => {
    const c = tiers.get(d.id);
    return { ...d, claimed_by_tier: c?.tier || null, claimed_by_org_tier: c?.org_tier || null };
  });
}

export async function fetchLeaguePage(p: LeaguePageParams): Promise<LeaguePageResult> {
  if (p.sort === 'tier' || p.verifiedOnly) {
    // 1) Every matching league, id + name only, read in chunks (no permanent cap).
    const all: Array<{ id: string; name: string | null }> = [];
    for (let from = 0; ; from += SCAN_CHUNK) {
      const { data, error } = await applyFilters(supabase.from('leagues').select('id, name').order('id'), p)
        .range(from, from + SCAN_CHUNK - 1);
      if (error) throw new Error(error.message);
      const rows = (data || []) as any[];
      all.push(...rows);
      if (rows.length < SCAN_CHUNK) break;
    }
    // 2) Rank on the server; apply verified-only BEFORE paging so the total is exact.
    const tiers = await tierMapFor(all.map((r) => r.id));
    const ranked = all.map((r) => {
      const c = tiers.get(r.id);
      return { id: r.id, name: r.name, claimed_by_tier: c?.tier ?? null, claimed_by_org_tier: c?.org_tier ?? null };
    });
    const eligible = p.verifiedOnly
      ? ranked.filter((r) => isVerifiedClaim(r.claimed_by_tier, r.claimed_by_org_tier))
      : ranked;
    const pageRows = sortAndSlice(eligible, p.page);
    // 3) Full public rows for just this page, in ranked order.
    const ids = pageRows.map((r) => r.id);
    let data: any[] = [];
    if (ids.length) {
      const { data: full, error } = await supabase.from('leagues').select(LEAGUE_PUBLIC_COLUMNS).in('id', ids);
      if (error) throw new Error(error.message);
      const byId = new Map(((full || []) as any[]).map((r) => [r.id, r]));
      data = ids.map((id) => byId.get(id)).filter(Boolean);
    }
    return { ...pageInfo(eligible.length, p.page), data: decorate(data, tiers) };
  }

  const { from, to } = rangeFor(p.page);
  const { data, error, count } = await applyFilters(
    supabase.from('leagues').select(LEAGUE_PUBLIC_COLUMNS, { count: 'exact' }),
    p,
  )
    .order('name', { ascending: true })
    .order('id', { ascending: true })
    .range(from, to);
  if (error) throw new Error(error.message);
  const rows = (data || []) as any[];
  const tiers = await tierMapFor(rows.map((r) => r.id));
  return { ...pageInfo(count ?? 0, p.page), data: decorate(rows, tiers) };
}
/* eslint-enable @typescript-eslint/no-explicit-any */
