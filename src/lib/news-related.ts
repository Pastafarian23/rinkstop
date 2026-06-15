// src/lib/news-related.ts
// Server-side helpers for Phase 7 news article cross-linking.
// Used by /news/[slug]/page.tsx to render:
//   - Block A: team chips (team_home_id + team_away_id)
//   - Block B: related rinks (matched by tag/team city/country)
//   - Block C: city CTA (resolved from team city or country_slug)
//
// All functions are designed to NEVER throw. On any error, they return
// the empty/zero value. The caller decides whether to render anything.
//
// All queries use supabaseAdmin (server-only, bypasses RLS) for
// consistency with the existing getRelatedPosts() in /news/[slug]/page.tsx.

import { supabaseAdmin } from '@/lib/supabase';

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

export interface NewsPost {
  id: string;
  slug: string;
  title: string;
  category?: string;
  tags?: string[];
  team_home_id?: string | null;
  team_away_id?: string | null;
  league_id?: string | null;
  country_slug?: string | null;
}

export interface NewsTeam {
  id: string;
  slug: string;
  name: string;
  city?: string | null;
  country?: string | null;
  logo_url?: string | null;
  league_id?: string | null;
  league_name?: string | null;
}

export interface NewsRink {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  country: string | null;
  province_state?: string | null;
  cover_photo_url?: string | null;
}

export interface NewsCity {
  city: string;
  country: string | null;
  counts: { rinks: number; teams: number; leagues: number };
}

/* ------------------------------------------------------------------ */
/* Block A — Teams in this article                                    */
/* ------------------------------------------------------------------ */

/**
 * Returns up to 2 teams referenced by the post (home + away).
 * Returns [] if the post has no team columns set.
 * Order: home first, then away. Always deduplicates.
 */
export async function getNewsTeams(post: NewsPost): Promise<NewsTeam[]> {
  const ids = [post.team_home_id, post.team_away_id].filter(
    (x): x is string => typeof x === 'string' && x.length > 0
  );
  if (ids.length === 0) return [];

  try {
    const { data, error } = await supabaseAdmin
      .from('teams')
      .select('id, slug, name, city, country, logo_url, league_id, leagues(name)')
      .in('id', ids);

    if (error || !data) return [];

    // Preserve the home/away order from the post.
    const byId = new Map<string, NewsTeam>();
    for (const row of data) {
      const league = (row as any).leagues;
      byId.set(row.id, {
        id: row.id,
        slug: row.slug,
        name: row.name,
        city: row.city,
        country: row.country,
        logo_url: row.logo_url,
        league_id: row.league_id,
        league_name: league?.name ?? null,
      });
    }
    const ordered: NewsTeam[] = [];
    for (const id of ids) {
      const t = byId.get(id);
      if (t) ordered.push(t);
    }
    return ordered;
  } catch (e) {
    console.error('[getNewsTeams] failed:', e);
    return [];
  }
}

/* ------------------------------------------------------------------ */
/* Block B — Related Rinks                                            */
/* ------------------------------------------------------------------ */

/**
 * Returns up to `limit` rinks related to the post.
 *
 * Strategy (in priority order):
 *  1. Direct city match: rinks in the same city as team_home_id/team_away_id
 *  2. Tag match: a tag looks like a city or rink name (case-insensitive
 *     substring match against rinks.city and rinks.name)
 *  3. Country fallback: any rink in the same country
 *
 * Dedupes by rink id. Returns [] if no good match is found.
 *
 * Note: ilike with leading wildcards is slow on large tables, so we
 * cap the candidate pool at 30. A GIN/trigram index on rinks.city
 * is tracked as a follow-up if this becomes a hotspot.
 */
export async function getNewsRelatedRinks(
  post: NewsPost,
  limit: number = 3
): Promise<NewsRink[]> {
  try {
    // Build candidate queries in priority order. We use OR'd .or() queries
    // and union the results in code.
    const tagList: string[] = Array.isArray(post.tags) ? post.tags : [];
    const candidates: NewsRink[] = [];
    const seen = new Set<string>();

    const addRinks = (rows: any[] | null) => {
      if (!rows) return;
      for (const r of rows) {
        if (seen.has(r.id)) continue;
        seen.add(r.id);
        candidates.push({
          id: r.id,
          slug: r.slug,
          name: r.name,
          city: r.city,
          country: r.country,
          province_state: r.province_state,
          cover_photo_url: r.cover_photo_url,
        });
      }
    };

    // 1. Resolve the team city first, so we can match rinks directly.
    let teamCity: string | null = null;
    let teamCountry: string | null = null;
    const teamIds = [post.team_home_id, post.team_away_id].filter(
      (x): x is string => typeof x === 'string' && x.length > 0
    );
    if (teamIds.length > 0) {
      const { data: teams } = await supabaseAdmin
        .from('teams')
        .select('id, city, country')
        .in('id', teamIds);
      if (teams && teams.length > 0) {
        teamCity = teams.find((t) => t.city)?.city ?? null;
        teamCountry = teams.find((t) => t.country)?.country ?? null;
      }
    }

    // 1a. Direct city match.
    if (teamCity) {
      const { data } = await supabaseAdmin
        .from('rinks')
        .select('id, slug, name, city, country, province_state, cover_photo_url')
        .ilike('city', teamCity)
        .eq('is_active', true)
        .limit(10);
      addRinks(data);
    }

    // 2. Tag-based match: try the first 3 tags that look like city/rink names.
    for (const tag of tagList.slice(0, 5)) {
      if (candidates.length >= limit * 3) break;
      const safe = tag.replace(/[%_\\]/g, '\\$&');
      const { data } = await supabaseAdmin
        .from('rinks')
        .select('id, slug, name, city, country, province_state, cover_photo_url')
        .or(`city.ilike.%${safe}%,name.ilike.%${safe}%`)
        .eq('is_active', true)
        .limit(5);
      addRinks(data);
    }

    // 3. Country fallback.
    if (candidates.length < limit && (teamCountry || post.country_slug)) {
      const country = teamCountry || post.country_slug;
      const { data } = await supabaseAdmin
        .from('rinks')
        .select('id, slug, name, city, country, province_state, cover_photo_url')
        .eq('country', country)
        .eq('is_active', true)
        .limit(10);
      addRinks(data);
    }

    return candidates.slice(0, limit);
  } catch (e) {
    console.error('[getNewsRelatedRinks] failed:', e);
    return [];
  }
}

/* ------------------------------------------------------------------ */
/* Block C — City CTA                                                 */
/* ------------------------------------------------------------------ */

/**
 * Resolves a {city, country} pair from the post and counts related
 * entities. Returns null if no confident city resolution is possible.
 *
 * Priority:
 *  1. team_home_id.city or team_away_id.city
 *  2. First tag that matches a known rink city
 *  3. country_slug alone (no city — caller decides whether to render)
 *
 * Counts are only computed if city is set. The CTA block should
 * gate on `counts.rinks >= 3` per the Phase 7 spec.
 */
export async function getNewsCity(post: NewsPost): Promise<NewsCity | null> {
  try {
    let city: string | null = null;
    let country: string | null = post.country_slug ?? null;

    // 1. Team city.
    const teamIds = [post.team_home_id, post.team_away_id].filter(
      (x): x is string => typeof x === 'string' && x.length > 0
    );
    if (teamIds.length > 0) {
      const { data: teams } = await supabaseAdmin
        .from('teams')
        .select('city, country')
        .in('id', teamIds);
      if (teams) {
        const withCity = teams.find((t) => t.city);
        if (withCity) {
          city = withCity.city;
          country = withCity.country ?? country;
        }
      }
    }

    // 2. Tag → city.
    if (!city) {
      const tagList: string[] = Array.isArray(post.tags) ? post.tags : [];
      for (const tag of tagList) {
        const safe = tag.replace(/[%_\\]/g, '\\$&');
        const { data: rinks } = await supabaseAdmin
          .from('rinks')
          .select('city, country')
          .or(`city.ilike.%${safe}%`)
          .eq('is_active', true)
          .limit(1);
        if (rinks && rinks.length > 0 && rinks[0].city) {
          city = rinks[0].city;
          country = rinks[0].country ?? country;
          break;
        }
      }
    }

    if (!city) return null;

    // Counts. 3 small queries in parallel.
    const safe = city.replace(/[%_\\]/g, '\\$&');
    const [rinkCountRes, teamCountRes, leagueCountRes] = await Promise.all([
      supabaseAdmin
        .from('rinks')
        .select('id', { count: 'exact', head: true })
        .ilike('city', safe)
        .eq('is_active', true),
      supabaseAdmin
        .from('teams')
        .select('id', { count: 'exact', head: true })
        .ilike('city', safe)
        .eq('is_active', true),
      // Leagues don't have a city, so we just count by country.
      country
        ? supabaseAdmin
            .from('leagues')
            .select('id', { count: 'exact', head: true })
            .eq('country', country)
        : Promise.resolve({ count: 0 } as { count: number | null }),
    ]);

    return {
      city,
      country,
      counts: {
        rinks: rinkCountRes.count ?? 0,
        teams: teamCountRes.count ?? 0,
        leagues: leagueCountRes.count ?? 0,
      },
    };
  } catch (e) {
    console.error('[getNewsCity] failed:', e);
    return null;
  }
}
