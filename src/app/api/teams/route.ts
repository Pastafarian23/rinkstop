import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { enrichEntitiesWithClaimTier, compareByTier } from '@/lib/listingTier';
import { LEAGUE_LEVELS, LEVEL_ORDER, type Level } from '@/lib/league-levels';

const API_SECRET = process.env.API_SECRET;
const ADMIN_SECRET = process.env.ADMIN_SECRET;

function requireAuth(request: NextRequest) {
  const key = request.headers.get('x-api-secret');
  return key === API_SECRET || key === ADMIN_SECRET;
}

// Original `teams` column name → `team_workspaces` column name.
// Used by POST/PUT to translate the API contract (stable) into the new schema.
const COLUMN_TRANSLATE: Record<string, string> = {
  country: 'country_code',
  city: 'home_city',
  logo_url: 'avatar_url',
  state_province: 'home_state',
  deactivated_at: 'archived_at',
  // Note: division, colors, home_state are also new columns backfilled in PR2.
  // For these, the legacy name passes through unchanged (no rename needed).
  // merged_into_id, brand_id, logo_source, logo_verified_at, deactivated_reason are dropped.
  // league_id, name, slug, is_active, age_category, etc. are unchanged.
};

const DROPPED_COLUMNS = new Set([
  'merged_into_id',
  'brand_id',
  'logo_source',
  'logo_verified_at',
  'deactivated_reason',
  'colors',          // legacy text[]; new column is also text[] but only set by backfill
  'division',        // only set by backfill
  'state_province',  // renamed
]);

function translateToWorkspace(body: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(body)) {
    if (DROPPED_COLUMNS.has(k)) continue;        // silently drop
    const target = COLUMN_TRANSLATE[k] || k;
    // Empty string → NULL. Otherwise CHAR(2) columns get padded with spaces
    // ('  ') which violates "is valid ISO" checks at the application layer.
    out[target] = v === '' ? null : v;
  }
  // For POST: country_code also drives home_country (same ISO code).
  if (out.country_code && !out.home_country) {
    out.home_country = out.country_code;
  }
  return out;
}

/**
 * Resolve ?level= to a list of league_ids for an efficient DB filter.
 * Returns null if no level filter is set (caller skips the in-clause).
 */
async function leagueIdsForLevel(level: string): Promise<string[] | null> {
  if (!LEVEL_ORDER.includes(level as Level)) return null;
  const { data: leagues, error } = await supabase
    .from('leagues')
    .select('id, name');
  if (error || !leagues) return null;
  return leagues
    .filter((l: any) => LEAGUE_LEVELS[l.name] === level)
    .map((l: any) => l.id);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const slug = searchParams.get('slug');
  // Country: accept either ISO 3166-1 alpha-2 ('CA') or full name ('Canada').
  // 2026-08-12 fix: client passes full names from the directory dropdown, but
  // team_workspaces stores country_code (2-letter). Translate here so the
  // filter actually matches the database. Falls back to the literal input
  // (so a 2-letter code still works as before).
  const rawCountry = searchParams.get('country');
  let country: string | null = null;
  if (rawCountry) {
    const { COUNTRY_TO_ISO } = await import('@/lib/country-page');
    if (rawCountry.length === 2) {
      country = rawCountry.toUpperCase();
    } else {
      country = COUNTRY_TO_ISO[rawCountry] ?? rawCountry;
    }
  }
  const search = searchParams.get('search');
  const leagueId = searchParams.get('leagueId');
  const league = searchParams.get('league');
  const level = searchParams.get('level');
  const rinkId = searchParams.get('rinkId');
  const city = searchParams.get('city');
  const sort = searchParams.get('sort') || 'name';
  const limit = parseInt(searchParams.get('limit') || '100', 10);
  const offset = parseInt(searchParams.get('offset') || '0', 10);
  const activeOnly = searchParams.get('activeOnly') !== 'false';

  // Explicit column list, not select('*').
  //
  // 2026-11-06: the contact-details hardening revoked table-level SELECT
  // from anon/authenticated on team_workspaces and re-granted it per
  // column. A star select then fails with "permission denied for table
  // team_workspaces" — PostgREST validates the star against the column
  // grants even when head:true. Every anon read must name its columns.
  let query = supabase
    .from('team_workspaces')
    .select(
      'id, name, slug, short_name, home_rink_id, home_city, home_country, ' +
        'country_code, age_category, age_label, age_min, age_max, level, ' +
        'season_label, description, visibility, is_active, created_at, updated_at, ' +
        'avatar_url, banner_url, federation_id, organization_id, league_id, ' +
        'website_url, division, home_state, timezone, is_published, ' +
        'leagues(name)',
      { count: 'exact' },
    );

  if (id) {
    query = query.eq('id', id).limit(1);
  } else if (slug) {
    query = query.eq('slug', slug).limit(1);
  } else {
    if (rinkId) query = query.eq('home_rink_id', rinkId);
    if (city) query = query.ilike('home_city', `%${city}%`);
    if (country) query = query.eq('country_code', country);
    // Bug fix 2026-08-12: previous `else if` chain silently dropped the
    // level filter when both ?league and ?level were set. Now we resolve
    // each independently and intersect when both are set.
    let leagueIdFilter: string[] | null = null;
    if (level) {
      const ids = await leagueIdsForLevel(level);
      if (ids === null) {
        // Bad level value → ignore
      } else if (ids.length === 0) {
        // Level has no leagues in our DB — force empty result
        return NextResponse.json({ data: [], count: 0 });
      } else {
        leagueIdFilter = ids;
      }
    }
    if (leagueId || league) {
      let resolved: string[] = [];
      if (leagueId) {
        resolved = [leagueId];
      } else if (league) {
        // Match the league by NAME or by SLUG.
        //
        // 2026-11-06: this was an exact NAME match only (`ilike('name', ...)`),
        // but the league page links here with the league SLUG
        // (`/directory/teams?league=india-first-league`). ilike without
        // wildcards is exact, so a slug never matched a name and the page
        // showed zero teams. The slug is now matched too.
        //
        // The name match stays EXACT (no wildcards) because wildcards
        // over-matched previously ("College" matched "College Hockey
        // League").
        const { data: matchedLeagues } = await supabase
          .from('leagues')
          .select('id')
          .or(`name.ilike.${league},slug.ilike.${league}`);
        resolved = (matchedLeagues ?? []).map((m: { id: string }) => m.id);
        if (resolved.length === 0) {
          return NextResponse.json({ data: [], count: 0 });
        }
      }
      if (leagueIdFilter === null) {
        leagueIdFilter = resolved;
      } else {
        const set = new Set(resolved);
        leagueIdFilter = leagueIdFilter.filter((id) => set.has(id));
        if (leagueIdFilter.length === 0) {
          return NextResponse.json({ data: [], count: 0 });
        }
      }
    }
    if (leagueIdFilter !== null) {
      query = query.in('league_id', leagueIdFilter);
    }
    if (activeOnly && !search) query = query.eq('is_active', true);
    if (search) query = query.or(`name.ilike.%${search}%,home_city.ilike.%${search}%`);
    query = query.range(offset, offset + limit - 1);
  }

  const orderCol = sort === 'recent' ? 'created_at' : 'name';
  const { data, error, count } = await query.order(orderCol, { ascending: sort === 'recent' ? false : true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let enrichedData = (data || []) as unknown as Array<Record<string, unknown> & { name?: string }>;
  if (!id && !slug && data && data.length) {
    const tierMap = await enrichEntitiesWithClaimTier(supabaseAdmin, 'team', data.map((d: any) => d.id));
    enrichedData = data.map((d: any) => {
      const claim = tierMap.get(d.id);
      return {
        ...d,
        claimed_by_tier: claim?.tier || null,
        // 2026-10-22: the organization track lives in a separate column
        // (profiles.org_tier). Expose it so the directory can judge
        // verification/featured state from the effective entitlement
        // (best of personal and org) rather than the personal column only.
        claimed_by_org_tier: claim?.org_tier || null,
        claimed_by_user_id: claim?.user_id || null,
      };
    });
    if (sort === 'tier') {
      enrichedData.sort(compareByTier);
    }
  }

  return NextResponse.json({ data: enrichedData, count });
}

export async function POST(request: NextRequest) {
  if (!requireAuth(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  const translated = translateToWorkspace(body);
  // team_workspaces column requires this; admin POSTs have no user identity.
  // Migration (PR1 fix) made this nullable for legacy imports. For new admin-created
  // rows we leave NULL — caller can update via PUT once the row exists.
  translated.created_by = null;
  const { data, error } = await supabaseAdmin
    .from('team_workspaces')
    .insert(translated)
    .select('*, leagues(name)')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data, { status: 201 });
}

export async function PUT(request: NextRequest) {
  if (!requireAuth(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id, ...rest } = await request.json();
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
  const translated = translateToWorkspace(rest);
  const { data, error } = await supabaseAdmin
    .from('team_workspaces')
    .update(translated)
    .eq('id', id)
    .select('*, leagues(name)')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest) {
  if (!requireAuth(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
  const { error } = await supabaseAdmin.from('team_workspaces').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
