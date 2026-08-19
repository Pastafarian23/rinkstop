import type { Metadata } from 'next';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import TeamsIndexClient, { type Team } from './TeamsIndexClient';
import HockeyTeamsContent from './HockeyTeamsContent';
import { LEAGUE_LEVELS, LEVEL_LABELS, LEVEL_ORDER, type Level } from '@/lib/league-levels';
import {
  getDirectoryCountsCached,
  getCountryTeamCountsCached,
  getTopLeaguesCached,
  getCountryLeaguesMapCached,
} from '@/lib/directory-counts';

const LEVEL_DESCRIPTIONS: Record<Level, string> = {
  pro: 'Top-tier professional hockey: NHL, AHL, KHL, top European leagues, and professional women\u2019s hockey.',
  junior: 'Major junior hockey: CHL (OHL, WHL, QMJHL), USHL, and other draft-eligible leagues.',
  college: 'University-level hockey: NCAA Division I and III, U SPORTS (Canada).',
  international: 'National-team programs and IIHF tournaments.',
  adult: 'Senior amateur, recreational, and regional leagues (beer leagues, women\u2019s rec, men\u2019s league).',
};

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ country?: string; level?: string; league?: string }> }): Promise<Metadata> {
  const { country, level, league } = await searchParams;
  const levelIsValid = level && LEVEL_ORDER.includes(level as Level);
  const counts = await getDirectoryCountsCached();
  const teamCount = counts.teams;
  // Title strategy: lead with the most specific filter, add context, end with brand.
  // country + level: "[Level] Hockey Teams in [Country]"
  // country only:    "Hockey Teams in [Country]"
  // level only:      "[Level] Hockey Teams Worldwide"
  // league only:     "[League] Hockey Teams"
  // nothing:         "[count] Hockey Teams Across 240 Leagues"
  let title: string;
  if (country && levelIsValid) {
    title = `${LEVEL_LABELS[level as Level]} Hockey Teams in ${country}`;
  } else if (country) {
    title = `Hockey Teams in ${country}`;
  } else if (league) {
    title = `${league} Hockey Teams`;
  } else if (levelIsValid) {
    title = `${LEVEL_LABELS[level as Level]} Hockey Teams Worldwide`;
  } else {
    title = `${teamCount.toLocaleString()}+ Hockey Teams Across 240 Leagues`;
  }
  const description = (() => {
    if (levelIsValid && country) {
      return `Browse ${LEVEL_LABELS[level as Level]} hockey teams in ${country}. ${LEVEL_DESCRIPTIONS[level as Level]} Find rosters, arena info, schedules, and verified team profiles.`;
    }
    if (levelIsValid) {
      return `Browse ${LEVEL_LABELS[level as Level]} hockey teams from every country. ${LEVEL_DESCRIPTIONS[level as Level]} Rosters, arenas, schedules, and verified profiles in one place.`;
    }
    if (country) {
      return `Browse hockey teams in ${country}. Find pro, junior, college, and amateur teams with rosters, logos, and arena info — searchable by league tier and city.`;
    }
    return `Find any hockey team in the world. ${teamCount.toLocaleString()}+ active teams across 240 leagues and 57 countries — NHL, AHL, KHL, NCAA, CHL, IIHF, and amateur levels. Search by name, league, or city.`;
  })();
  const canonicalParams = new URLSearchParams();
  if (country) canonicalParams.set('country', country);
  if (levelIsValid) canonicalParams.set('level', level as string);
  if (league) canonicalParams.set('league', league);
  const qs = canonicalParams.toString();
  return {
    title,
    description,
    alternates: {
      canonical: qs ? `https://rinkstop.com/directory/teams?${qs}` : 'https://rinkstop.com/directory/teams',
    },
    robots: {
      index: true,
      follow: true,
    },
    openGraph: {
      title,
      description,
      url: qs ? `https://rinkstop.com/directory/teams?${qs}` : 'https://rinkstop.com/directory/teams',
      siteName: 'RinkStop',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

// ISR-cached for 1 hour (2026-07-22 perf pass).
export const dynamic = 'force-dynamic';

/**
 * Resolve ?level= to a list of league_ids so we can filter the teams table
 * directly at the DB layer (no JS post-filter).
 */
async function leagueIdsForLevel(level: string): Promise<string[] | null> {
  if (!LEVEL_ORDER.includes(level as Level)) return null;
  const { data: leagues } = await supabase
    .from('leagues')
    .select('id, name');
  if (!leagues) return null;
  return leagues
    .filter((l: any) => LEAGUE_LEVELS[l.name] === level)
    .map((l: any) => l.id);
}

async function fetchInitialTeams(opts: {
  country?: string | null;
  level?: string | null;
  league?: string | null;
  limit?: number;
  offset?: number;
}): Promise<Team[]> {
  const { country, level, league, limit = 500, offset = 0 } = opts;
  // Resolve the URL `country=` value to the 2-letter ISO that team_workspaces
  // stores in `country_code`. The directory dropdown sends full English names
  // ("Canada", "United States"), and the legacy teams table also had a `country`
  // text column — but after PR2 (WS12) the column is `country_code` (CHAR(2)).
  // Without this translation the country filter silently matches nothing.
  let countryIso: string | null = null;
  if (country) {
    const { COUNTRY_TO_ISO } = await import('@/lib/country-page');
    countryIso = country.length === 2 ? country.toUpperCase() : (COUNTRY_TO_ISO[country] ?? country);
  }

  // Fetch both NHL-imported teams AND user-created teams (team_workspaces)
  // in parallel so the SSR HTML includes user-created teams from the start.
  // NOTE: PR2 renamed several columns:
  //   logo_url → avatar_url, city → home_city, country → country_code
  // The previous select() referenced the legacy names and failed with
  // "column does not exist", so the server-rendered teams list silently
  // dropped every team_workspaces row (NHL filter then returned 0 NHL rows).
  //
  // 2026-08-13: callers should pass `limit/offset` so the page can paginate.
  // Default 500 stays for clients that don't paginate.
  let nhlQuery = supabase
    .from('team_workspaces')
    .select('id, name, slug, avatar_url, home_city, country_code, league_id, leagues(name)')
    .eq('is_active', true)
    .order('name')
    .range(offset, offset + limit - 1);
  if (countryIso) nhlQuery = nhlQuery.eq('country_code', countryIso);

  // Filter by league and/or level. Both can be set at once — intersect them.
  // Bug fix 2026-08-12: the previous `if (league) ... else if (level)` chain
  // silently dropped the level filter when both were set, so picking
  // "Level: College + League: NHL" returned all NHL teams (pro, junior,
  // college) instead of just college-level NHL teams.
  let leagueIdFilter: string[] | null = null;
  if (level) {
    const ids = await leagueIdsForLevel(level);
    if (ids && ids.length > 0) {
      leagueIdFilter = ids;
    } else if (ids !== null) {
      // level set but no leagues in that tier — force empty result
      leagueIdFilter = ['__none__'];
    }
    // ids === null: level value was invalid; ignore (don't filter by level)
  }
  if (league) {
    // Exact-name match (case-insensitive). Using ilike with wildcards
    // previously over-matched leagues whose names CONTAINED the search
    // string (e.g. "College" matched "College Hockey League").
    const { data: matchedLeagues } = await supabase
      .from('leagues')
      .select('id')
      .ilike('name', league);  // no wildcards — exact match
    const leagueIds = (matchedLeagues ?? []).map((m: { id: string }) => m.id);

    if (leagueIds.length === 0) {
      // No match — force empty result
      leagueIdFilter = ['__none__'];
    } else if (leagueIdFilter === null) {
      leagueIdFilter = leagueIds;
    } else {
      // Intersect with the level-derived set
      const set = new Set(leagueIds);
      leagueIdFilter = leagueIdFilter.filter((id) => set.has(id));
      if (leagueIdFilter.length === 0) leagueIdFilter = ['__none__'];
    }
  }
  if (leagueIdFilter !== null) {
    nhlQuery = nhlQuery.in('league_id', leagueIdFilter);
  }

  let userQuery = supabaseAdmin
    .from('team_workspaces')
    .select('id, slug, name, country_code, home_city, home_country, age_category, age_label, level, season_label, description, organization_id, league_id, federation_id, organization:organizations(name,slug), league:leagues(name,slug), federation:federations(name,slug)')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .range(offset, offset + Math.min(limit, 100) - 1);
  if (countryIso) {
    // Try the ISO code on country_code first; fall back to home_country text
    // matching by the full English name (handles legacy rows where
    // country_code is null but home_country was populated).
    userQuery = userQuery.or(
      `country_code.ilike.%${countryIso}%,home_country.ilike.%${country}%`
    );
  }
  // Apply the same league + level filter to user teams so the result list
  // matches what the dropdown promises. Without this, picking any league
  // filter returned the full user-team list regardless — making the chip
  // a lie. Special carve-out: classify user teams as 'adult' when their own
  // level column is empty (most user-created teams are adult/amateur and
  // haven't filled the field yet).
  if (leagueIdFilter !== null) {
    userQuery = userQuery.in('league_id', leagueIdFilter);
  }
  // The "level" filter for user teams: we don't have a reliable way to
  // classify user teams by level without explicit data, so:
  //   - ?level=adult → show user teams (they're generally adult/amateur)
  //   - ?level=youth → hide user teams for now (until team owners fill
  //     age_category/level; long-term: enable when data exists)
  //   - ?level=pro/junior/college/international → hide user teams
  // (Simplest correct behavior: only show user teams when level filter is
  // unset OR explicitly set to 'adult'.)
  if (level === 'pro' || level === 'junior' || level === 'college' || level === 'international') {
    userQuery = userQuery.eq('id', '__none__'); // empty result
  } else if (level === 'adult') {
    // pass — include user teams
  }

  const [nhlRes, userRes] = await Promise.all([nhlQuery, userQuery]);

  if (nhlRes.error) console.error('Teams initial fetch failed:', nhlRes.error);
  if (userRes.error) console.error('User teams initial fetch failed:', userRes.error);

  // Alias the new column names to the legacy ones (city/country/logo_url)
  // expected by the Team type + TeamsIndexClient card renderer. The renaming
  // happened in PR2; we keep the public shape stable.
  const nhlTeams = ((nhlRes.data || []) as any[]).map((t: any): Team => ({
    id: t.id,
    name: t.name,
    slug: t.slug,
    logo_url: t.avatar_url ?? null,
    city: t.home_city ?? null,
    country: t.country_code ?? null,
    league_id: t.league_id ?? null,
    leagues: t.leagues ?? null,
    source: 'nhl' as const,
  }));
  const userTeams = ((userRes.data || []) as any[]).map((t: any): Team => ({
    id: t.id,
    name: t.name,
    slug: t.slug,
    city: t.home_city || null,
    country: t.home_country || null,
    country_code: t.country_code || null,
    source: 'user' as const,

    // New: structured federation → league → organization references.
    organization_id: t.organization_id ?? null,
    league_id: t.league_id ?? null,
    federation_id: t.federation_id ?? null,
    organization: t.organization ?? null,
    league: t.league ?? null,
    federation: t.federation ?? null,
    level: t.level || null,
    age_label: t.age_label || null,
    age_category: t.age_category || null,
    description: t.description || null,
    season_label: t.season_label || null,
    claimed_by_tier: null,
  }));

  // Dedup by id (user teams may collide with NHL teams by name; id is unique)
  const merged = [...nhlTeams, ...userTeams].filter(
    (t, i, arr) => arr.findIndex(x => x.id === t.id) === i
  );
  return merged;
}

// SSRed page size for the teams grid. This is the crux of the page-load
// weight: rendering 500+ team cards into HTML was producing ~1MB of
// uncompressed HTML and 200-300ms of TTFB on the wire. 48 cards (4 rows
// of 12 on a 6-col grid) fits the visible viewport on every device and
// keeps the initial HTML under ~80KB. The "Load more" button on the page
// fetches the next batch via /api/teams?offset=N.
const SSR_PAGE_SIZE = 48;

export default async function TeamsPage({ searchParams }: { searchParams: Promise<{ country?: string; level?: string; league?: string; q?: string }> }) {
  const { country, level, league, q } = await searchParams;
  // All five queries are independent — run them in parallel so the page
  // wall time is max(queries) instead of sum(queries). With each query
  // averaging 500–700ms on the Supabase pool, sequential was ~2.5s total.
  // Parallel + cached: ~600ms. (Verified live 2026-08-13 after deploy.)
  const [
    initialTeams,
    counts,
    topCountries,
    topLeagues,
    countryLeaguesMap,
  ] = await Promise.all([
    fetchInitialTeams({ country, level, league, limit: SSR_PAGE_SIZE }),
    getDirectoryCountsCached(),
    getCountryTeamCountsCached(),
    getTopLeaguesCached(),
    getCountryLeaguesMapCached(),
  ]);
  return (
    <>
      {(() => {
        // JSON-LD: CollectionPage + ItemList of top 20 teams. Helps Google
        // build rich snippets (sitelinks, breadcrumbs). Server-rendered
        // so it shows in initial HTML.
        const top = initialTeams.slice(0, 20);
        const ldJson = {
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'CollectionPage',
              name: 'Hockey Teams Directory',
              description: 'Hockey teams directory — RinkStop',
              url: 'https://rinkstop.com/directory/teams',
              isPartOf: { '@type': 'WebSite', name: 'RinkStop', url: 'https://rinkstop.com' },
            },
            {
              '@type': 'ItemList',
              name: 'Hockey Teams',
              // Directory page (not a paginated list) — ItemList advertises
              // the full directory size. The rendered 'top' is a sample.
              numberOfItems: counts.teams,
              itemListElement: top.map((t, i) => ({
                '@type': 'ListItem',
                position: i + 1,
                name: t.name,
                url: `https://rinkstop.com/directory/teams/${(t as any).slug || t.id}`,
              })),
            },
          ],
        };
        return (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(ldJson) }}
          />
        );
      })()}
      {/* SEO editorial section — was placed above TeamsIndexClient on 2026-06-15.
          On 2026-08-12 we moved it BELOW the search/filter UI (after the ad slot)
          and wrapped it in a <details> collapsed by default, so the search bar is
          visible above the fold on mobile. Google still indexes the inner text
          even when <details> is collapsed. Same content; just relocated. */}
      <TeamsIndexClient
        initialTeams={initialTeams}
        topCountries={topCountries.map((c) => ({ name: c.country, slug: c.country.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''), teamCount: c.team_count }))}
        topLeagues={topLeagues.map((l) => ({ name: l.name, slug: l.slug, teamCount: l.team_count }))}
        countryLeaguesMap={countryLeaguesMap}
        totalCount={counts.teams}
        country={country ?? null}
        level={level ?? null}
        league={league ?? null}
        initialQuery={q ?? null}
      />
      {/* WS16 PR2 — AdSense in-feed ad below the team list. */}
      <div style={{ maxWidth: '1200px', margin: '1.5rem auto', padding: '0 1rem' }}>
        
      </div>
      {country ? (
        <details style={{ maxWidth: '80rem', margin: '0 auto 2rem', padding: '0 1rem', color: 'rgba(255,255,255,0.75)', fontSize: '0.9375rem', lineHeight: 1.7 }}>
          <summary style={{ cursor: 'pointer', color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 700, userSelect: 'none', padding: '0.5rem 0' }}>
            About hockey teams in {country}
          </summary>
          <div style={{ marginTop: '0.75rem' }}>
            <h2 style={{ fontSize: '1.375rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>
              Hockey teams in {country}
            </h2>
            <p style={{ marginBottom: '0.75rem' }}>
              {country} has a mix of professional, junior, college, and amateur hockey teams across
              multiple leagues and divisions. This page lists every active hockey team in {country}
              from our directory. Use the search box above to filter by team name, city, or league.
            </p>
            <h3 style={{ fontSize: '1.0625rem', fontWeight: 600, color: '#fff', marginTop: '0.875rem', marginBottom: '0.4rem' }}>
              How to find a hockey team in {country}
            </h3>
            <p>
              Most teams have a roster page with arena info, division, and the league they play in.
              If you are a player looking for a team, the verified rosters show which teams are
              actively recruiting. If you are a parent looking for youth hockey in {country},
              start with the teams in your city and check the league page for age-group rules.
            </p>
          </div>
        </details>
      ) : (
        <details style={{ maxWidth: '80rem', margin: '0 auto 2rem', padding: '0 1rem', color: 'rgba(255,255,255,0.75)', fontSize: '0.9375rem', lineHeight: 1.7 }}>
          <summary style={{ cursor: 'pointer', color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 700, userSelect: 'none', padding: '0.5rem 0' }}>
            About this hockey teams directory
          </summary>
          <div style={{ marginTop: '0.75rem' }}>
            <h2 style={{ fontSize: '1.375rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>
              Find any hockey team in the world
            </h2>
            <p style={{ marginBottom: '0.75rem' }}>
              RinkStop tracks more than {initialTeams.length.toLocaleString()} active hockey teams
              across professional, junior, college, amateur, and youth leagues on six continents.
              Use the search and league filters above to find a specific team, or browse the full
              directory by league, country, or city.
            </p>
            <h3 style={{ fontSize: '1.0625rem', fontWeight: 600, color: '#fff', marginTop: '0.875rem', marginBottom: '0.4rem' }}>
              Professional hockey leagues in the directory
            </h3>
            <p style={{ marginBottom: '0.75rem' }}>
              The directory covers the NHL and its 32 franchises, the AHL (American Hockey League),
              the ECHL, the KHL (Kontinental Hockey League in Russia and Belarus), the SHL (Swedish
              Hockey League), the Liiga (Finland), the DEL (Germany), the NLA (Switzerland), and
              the Czech Extraliga. We also track the CHL (Canadian Hockey League) including the OHL,
              WHL, and QMJHL, plus NCAA Division I and Division III men&apos;s and women&apos;s programs
              in the United States and Canada.
            </p>
            <h3 style={{ fontSize: '1.0625rem', fontWeight: 600, color: '#fff', marginTop: '0.875rem', marginBottom: '0.4rem' }}>
              Junior, youth, and amateur hockey
            </h3>
            <p style={{ marginBottom: '0.75rem' }}>
              Beyond the pro ranks, the directory includes USA Hockey and Hockey Canada registered
              youth programs, high school teams, college club programs, beer leagues, and women&apos;s
              leagues at every level. If a team plays organized hockey on a regular schedule, it
              belongs here.
            </p>
            <h3 style={{ fontSize: '1.0625rem', fontWeight: 600, color: '#fff', marginTop: '0.875rem', marginBottom: '0.4rem' }}>
              How to use the directory
            </h3>
            <p>
              Click any team to see its full roster, arena, schedule, and league context. Verified
              rosters are marked with a check badge. Teams can be filtered by league tier using the
              pill bar at the top of the list.
            </p>
          </div>
        </details>
      )}
      <HockeyTeamsContent totalTeams={counts.teams} topCountriesRaw={topCountries} />
    </>
  );
}
