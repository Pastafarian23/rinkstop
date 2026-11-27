/**
 * Shared, paginated rink listing query used by /api/rinks (list mode) and the
 * /directory/rinks server render. Server-side only.
 *
 * - sort=tier: all matching rows are ranked on the server (claim tier, then
 *   name, then id) BEFORE the page is sliced, so paging is consistent.
 * - other sorts: offset paging with an exact total and a stable id tie-breaker.
 */
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { enrichEntitiesWithClaimTier, isVerifiedClaim } from '@/lib/listingTier';
import { pageInfo, rangeFor, sortAndSlice, type PageRequest } from '@/lib/rinks-list';

export const RINK_LIST_COLUMNS =
  'id, name, slug, city, province_state, country, address, latitude, longitude, ' +
  'capacity, ice_size, surface_type, website_url, logo_url, is_active, created_at, ' +
  'updated_at, notes, source, status, cover_photo_url, place_id, opening_hours_json, ' +
  'google_website, google_maps_url, static_map_url, league, timezone, ' +
  'cover_photo_verified_at, cover_photo_source, seo_h1, seo_title, qr_identifier, ' +
  'verification_tier, qr_revoked_at, notes_generated, meta_description, claimable';

export interface RinkListParams {
  country?: string | null;
  city?: string | null;
  search?: string | null;
  activeOnly: boolean;
  sort: string;
  verifiedOnly?: boolean;
  page: PageRequest;
}

export interface RinkListResult {
  count: number;
  offset: number;
  limit: number;
  hasMore: boolean;
  nextOffset: number | null;
  data: Array<Record<string, unknown>>;
}

const FULL_SCAN_CHUNK = 1000;
const ENRICH_CHUNK = 500;

/* eslint-disable @typescript-eslint/no-explicit-any */
function applyFilters(q: any, p: RinkListParams): any {
  if (p.country) q = q.eq('country', p.country);
  if (p.city) q = q.ilike('city', `%${p.city}%`);
  if (p.activeOnly) q = q.eq('is_active', true);
  if (p.search) q = q.or(`name.ilike.%${p.search}%,city.ilike.%${p.search}%`);
  return q;
}

async function tierMapFor(ids: string[]): Promise<Map<string, any>> {
  const out = new Map<string, any>();
  for (let i = 0; i < ids.length; i += ENRICH_CHUNK) {
    const part = await enrichEntitiesWithClaimTier(supabaseAdmin, 'rink', ids.slice(i, i + ENRICH_CHUNK));
    for (const [k, v] of part) out.set(k, v);
  }
  return out;
}

function decorate(rows: any[], tiers: Map<string, any>): Array<Record<string, unknown>> {
  return rows.map((d) => {
    const c = tiers.get(d.id);
    return {
      ...d,
      claimed_by_tier: c?.tier || null,
      claimed_by_org_tier: c?.org_tier || null,
      claimed_by_user_id: c?.user_id || null,
    };
  });
}

export async function fetchRinkListPage(p: RinkListParams): Promise<RinkListResult> {
  // Verified-only needs claim tiers before paging, so it always uses the ranked path.
  if (p.sort === 'tier' || p.verifiedOnly) {
    // 1) Full matching set, id + name only, read in chunks (no permanent cap).
    const all: Array<{ id: string; name: string | null }> = [];
    for (let from = 0; ; from += FULL_SCAN_CHUNK) {
      const { data, error } = await applyFilters(
        supabase.from('rinks').select('id, name').order('id'),
        p,
      ).range(from, from + FULL_SCAN_CHUNK - 1);
      if (error) throw new Error(error.message);
      const rows = (data || []) as any[];
      all.push(...rows);
      if (rows.length < FULL_SCAN_CHUNK) break;
    }
    // 2) Rank the full set on the server, then slice the requested page.
    const tiers = await tierMapFor(all.map((r) => r.id));
    const ranked = all.map((r) => {
      const c = tiers.get(r.id);
      return {
        id: r.id,
        name: r.name,
        claimed_by_tier: c?.tier ?? null,
        claimed_by_org_tier: c?.org_tier ?? null,
      };
    });
    const eligible = p.verifiedOnly
      ? ranked.filter((r) => isVerifiedClaim(r.claimed_by_tier, r.claimed_by_org_tier))
      : ranked;
    const pageRows = sortAndSlice(eligible, p.page);
    const ids = pageRows.map((r) => r.id);
    // 3) Full rows for just this page, returned in ranked order.
    let data: any[] = [];
    if (ids.length) {
      const { data: full, error } = await supabase.from('rinks').select(RINK_LIST_COLUMNS).in('id', ids);
      if (error) throw new Error(error.message);
      const byId = new Map(((full || []) as any[]).map((r) => [r.id, r]));
      data = ids.map((id) => byId.get(id)).filter(Boolean);
    }
    return { ...pageInfo(eligible.length, p.page), data: decorate(data, tiers) };
  }

  // Non-tier sorts: database paging with an exact total and a stable tie-breaker.
  const orderCol = p.sort === 'recent' ? 'created_at' : 'name';
  const ascending = p.sort !== 'recent';
  const { from, to } = rangeFor(p.page);
  const { data, error, count } = await applyFilters(
    supabase.from('rinks').select(RINK_LIST_COLUMNS, { count: 'exact' }),
    p,
  )
    .order(orderCol, { ascending })
    .order('id', { ascending: true })
    .range(from, to);
  if (error) throw new Error(error.message);
  const rows = (data || []) as any[];
  const tiers = await tierMapFor(rows.map((r) => r.id));
  return { ...pageInfo(count ?? 0, p.page), data: decorate(rows, tiers) };
}
/* eslint-enable @typescript-eslint/no-explicit-any */
