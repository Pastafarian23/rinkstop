import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { LEAGUE_LEVELS } from '@/lib/league-levels';

export const dynamic = 'force-dynamic';

/**
 * Resolve ?level= to a list of league_ids so the .in() filter is exact.
 * Returns null if the level is invalid (caller should skip the filter).
 */
async function leagueIdsForLevel(level: string): Promise<string[] | null> {
  const { data: leagues, error } = await supabaseAdmin
    .from('leagues')
    .select('id, name')
    .eq('is_active', true);
  if (error || !leagues) return null;
  const ids = (leagues as Array<{ id: string; name: string }>)
    .filter((l) => LEAGUE_LEVELS[l.name] === level)
    .map((l) => l.id);
  return ids.length > 0 ? ids : null;
}

// GET /api/user-teams — all user-created teams (team_workspaces with source = 'user')
// Returns the fields needed by the directory listing card.
// No auth required — team_workspaces data is public-profile fields only.
//
// 2026-08-12 fix: added level + league filter support so the client can
// apply the same filters here as it does on /api/teams. Previously the
// endpoint ignored these, returning 100 random teams regardless of filter,
// which caused the directory to show stale results when the user picked
// a level/league filter from the dropdown.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search');
  const country = searchParams.get('country');
  const level = searchParams.get('level');
  const league = searchParams.get('league');
  const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 500);

  let q = supabaseAdmin
    .from('team_workspaces')
    .select(
      'id, slug, name, country_code, home_city, home_country, age_category, age_label, level, season_label, description, organization_id, league_id, federation_id'
    )
    .eq('is_active', true)
    .limit(limit);

  if (country) {
    q = q.or(`country_code.ilike.%${country}%,home_country.ilike.%${country}%`);
  }

  if (search) {
    q = q.or(
      `name.ilike.%${search}%,home_city.ilike.%${search}%`
    );
  }

  // Resolve level + league filter to a single set of league_ids (intersection
  // when both are set). Same logic as /api/teams — refactored here so a
  // future change doesn't break one endpoint.
  let leagueIdFilter: string[] | null = null;
  if (level) {
    const ids = await leagueIdsForLevel(level);
    if (ids === null || ids.length === 0) {
      // Bad level value or no leagues in this tier — force empty result
      return NextResponse.json({ data: [], count: 0 });
    }
    leagueIdFilter = ids;
  }
  if (league) {
    // Exact-name match (no wildcards — was over-matching before)
    const { data: matchedLeagues } = await supabaseAdmin
      .from('leagues')
      .select('id')
      .eq('is_active', true)
      .ilike('name', league);
    const leagueIds = (matchedLeagues ?? []).map((l: { id: string }) => l.id);
    if (leagueIds.length === 0) {
      return NextResponse.json({ data: [], count: 0 });
    }
    if (leagueIdFilter === null) {
      leagueIdFilter = leagueIds;
    } else {
      const set = new Set(leagueIds);
      leagueIdFilter = leagueIdFilter.filter((id) => set.has(id));
      if (leagueIdFilter.length === 0) {
        return NextResponse.json({ data: [], count: 0 });
      }
    }
  }
  if (leagueIdFilter !== null) {
    q = q.in('league_id', leagueIdFilter);
  }

  q = q.order('created_at', { ascending: false });

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const teams = (data || []).map((t: any): {
    id: string;
    name: string;
    slug: string;
    city: string | null;
    country: string | null;
    country_code: string | null;
    source: 'user';
    level: string | null;
    age_label: string | null;
    age_category: string | null;
    description: string | null;
    season_label: string | null;
    claimed_by_tier: null;
  } => ({
    id: t.id,
    name: t.name,
    slug: t.slug,
    city: t.home_city || null,
    country: t.home_country || null,
    country_code: t.country_code || null,
    source: 'user' as const,
    // directory card fields
    level: t.level || null,
    age_label: t.age_label || null,
    age_category: t.age_category || null,
    description: t.description || null,
    season_label: t.season_label || null,
    claimed_by_tier: null, // enriched separately below if needed
  }));

  return NextResponse.json({ data: teams, count: teams.length });
}
