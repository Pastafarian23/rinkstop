import type { Metadata } from 'next';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import TeamsIndexClient, { type Team } from './TeamsIndexClient';
import HockeyTeamsContent from './HockeyTeamsContent';
import AdSlot from '@/components/AdSlot';
import { ADSENSE_SLOTS } from '@/lib/adsense';
import { LEAGUE_LEVELS, LEVEL_LABELS, LEVEL_ORDER, type Level } from '@/lib/league-levels';
import { getDirectoryCounts, getCountryTeamCounts } from '@/lib/directory-counts';

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
  const counts = await getDirectoryCounts();
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
}): Promise<Team[]> {
  const { country, level, league } = opts;
  // Fetch both NHL-imported teams AND user-created teams (team_workspaces)
  // in parallel so the SSR HTML includes user-created teams from the start.
  let nhlQuery = supabase
    .from('team_workspaces')
    .select('id, name, slug, logo_url, city, country, league_id')
    .eq('is_active', true)
    .order('name')
    .limit(500);
  if (country) nhlQuery = nhlQuery.eq('country', country);
  if (league) {
    // Filter by league name via the joined table.
    const { data: matchedLeagues } = await supabase
      .from('leagues')
      .select('id')
      .ilike('name', `%${league}%`);
    if (matchedLeagues && matchedLeagues.length > 0) {
      nhlQuery = nhlQuery.in('league_id', matchedLeagues.map((m: any) => m.id));
    } else {
      nhlQuery = nhlQuery.eq('league_id', '__none__'); // force empty result
    }
  } else if (level) {
    const ids = await leagueIdsForLevel(level);
    if (ids && ids.length > 0) {
      nhlQuery = nhlQuery.in('league_id', ids);
    } else if (ids !== null) {
      nhlQuery = nhlQuery.eq('league_id', '__none__'); // level set but no matches
    }
  }

  let userQuery = supabaseAdmin
    .from('team_workspaces')
    .select('id, slug, name, country_code, home_city, home_country, age_category, age_label, level, season_label, description, organization_id, league_id, federation_id, organization:organizations(name,slug), league:leagues(name,slug), federation:federations(name,slug)')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(100);
  if (country) {
    userQuery = userQuery.or(
      `country_code.ilike.%${country}%,home_country.ilike.%${country}%`
    );
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

  const nhlTeams = (nhlRes.data || []) as Team[];
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

export default async function TeamsPage({ searchParams }: { searchParams: Promise<{ country?: string; level?: string; league?: string }> }) {
  const { country, level, league } = await searchParams;
  const initialTeams = await fetchInitialTeams({ country, level, league });
  const counts = await getDirectoryCounts();
  const topCountries = await getCountryTeamCounts();
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
      {/* SEO editorial section — added 2026-06-15.
          Renders server-side so Google sees the content in the initial
          HTML. The client component below handles the live search/filter
          UI; the editorial block sits above it and never re-renders. */}
      {country ? (
        <section style={{ marginBottom: '2rem', color: 'rgba(255,255,255,0.75)', fontSize: '0.9375rem', lineHeight: 1.7, maxWidth: '80rem', margin: '0 auto 2rem', padding: '2rem 1rem 0' }}>
          <h2 style={{ fontSize: '1.375rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>
            Hockey teams in {country}
          </h2>
          <p style={{ marginBottom: '0.75rem' }}>
            {country} has a mix of professional, junior, college, and amateur hockey teams across
            multiple leagues and divisions. This page lists every active hockey team in {country}
            from our directory. Use the search box below to filter by team name, city, or league.
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
        </section>
      ) : (
        <section style={{ marginBottom: '2rem', color: 'rgba(255,255,255,0.75)', fontSize: '0.9375rem', lineHeight: 1.7, maxWidth: '80rem', margin: '0 auto 2rem', padding: '2rem 1rem 0' }}>
          <h2 style={{ fontSize: '1.375rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>
            Find any hockey team in the world
          </h2>
          <p style={{ marginBottom: '0.75rem' }}>
            RinkStop tracks more than {initialTeams.length.toLocaleString()} active hockey teams
            across professional, junior, college, amateur, and youth leagues on six continents.
            Use the search and league filters below to find a specific team, or browse the full
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
        </section>
      )}
      <TeamsIndexClient initialTeams={initialTeams} country={country ?? null} level={level ?? null} league={league ?? null} teamCount={counts.teams} />
      {/* WS16 PR2 — AdSense in-feed ad below the team list. */}
      <div style={{ maxWidth: '1200px', margin: '1.5rem auto', padding: '0 1rem' }}>
        <AdSlot slot={ADSENSE_SLOTS.DIRECTORY_INFEED} type="in-feed" layout="-fb+5w+4e-db+4u" />
      </div>
      <HockeyTeamsContent totalTeams={counts.teams} topCountriesRaw={topCountries} />
    </>
  );
}
