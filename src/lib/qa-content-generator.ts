// /lib/qa-content-generator.ts
//
// WS28 PR3 — Q&A content generator.
//
// Given the dataset (/api/data/dataset), produces a list of Q&A page
// configurations that the Q&A route can render. Each config represents
// one direct-answer page designed for AI engine citation:
//   - 40-80 word answer capsule at the top (Featured Snippet format)
//   - Real data from the database (counts, names, lists)
//   - FAQPage JSON-LD schema
//   - Canonical link to the underlying directory page
//
// The generator runs on the server at request time and is cached for
// 1 hour (same cadence as the dataset export).

import { supabaseAdmin } from '@/lib/supabase';

export interface QAPageConfig {
  slug: string;
  url_path: string;
  question: string;        // The H1 question, e.g. "How many hockey teams are in Sweden?"
  short_answer: string;    // 40-80 word direct answer, AI-snippet format
  full_answer_md: string;  // Long-form answer body (Markdown)
  related_urls: { label: string; url: string }[];
  data_sources: {         // Provenance — what real DB counts back this answer
    source: string;
    count: number;
  }[];
  faqs: { q: string; a: string }[];
  meta_description: string;
  og_title: string;
}

interface DatasetCache {
  countries: { country: string; rinkCount: number; teamCount: number; states: { name: string; rinkCount: number; cities: { city: string; rinkCount: number }[] }[] }[];
  leagues: { id: string; slug: string; name: string; country: string; level: string; teamCount: number }[];
  cities: { city: string; country: string; rinkCount: number }[];
  generatedAt: number;
}

let cache: DatasetCache | null = null;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

async function buildCache(): Promise<DatasetCache> {
  // Aggregate rinks by country (paginate — Supabase caps at 1000 per query)
  const allRinks: any[] = [];
  let rinkOffset = 0;
  const rinkPageSize = 1000;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const client: any = supabaseAdmin;
    const query: any = client.from('rinks').select('country, city, province_state').eq('is_active', true).range(rinkOffset, rinkOffset + rinkPageSize - 1);
    const result: any = await query;
    if (result?.error) {
      console.error('rinks query error:', result.error.message);
      break;
    }
    const rows: any[] = result?.data || [];
    allRinks.push(...rows);
    if (rows.length < rinkPageSize) break;
    rinkOffset += rinkPageSize;
  }
  const rinks = allRinks;
  const countryRinks = new Map<string, { rinkCount: number; cities: Map<string, number>; states: Map<string, number>; stateCities: Map<string, Map<string, number>> }>();
  for (const r of rinks || []) {
    if (!r.country) continue;
    if (!countryRinks.has(r.country)) countryRinks.set(r.country, { rinkCount: 0, cities: new Map(), states: new Map(), stateCities: new Map() });
    const c = countryRinks.get(r.country)!;
    c.rinkCount++;
    // Filter postal-code artifacts out of city aggregation too.
    const cityClean = r.city && !/\d/.test(r.city) ? r.city.trim() : null;
    if (cityClean) c.cities.set(cityClean, (c.cities.get(cityClean) || 0) + 1);
    if (r.province_state) {
      c.states.set(r.province_state, (c.states.get(r.province_state) || 0) + 1);
      // Per-state city aggregation for cross-linking from state QA pages
      // to their top cities. Only for clean (no-digit) cities.
      if (cityClean) {
        if (!c.stateCities.has(r.province_state)) c.stateCities.set(r.province_state, new Map());
        const sc = c.stateCities.get(r.province_state)!;
        sc.set(cityClean, (sc.get(cityClean) || 0) + 1);
      }
    }
  }

  // Aggregate teams by country (paginate)
  const allTeams: any[] = [];
  let teamOffset = 0;
  const teamPageSize = 1000;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const client: any = supabaseAdmin;
    const query: any = client.from('team_workspaces').select('country_code, league_id').eq('is_active', true).range(teamOffset, teamOffset + teamPageSize - 1);
    const result: any = await query;
    if (result?.error) {
      console.error('teams query error:', result.error.message);
      break;
    }
    const rows: any[] = result?.data || [];
    allTeams.push(...rows);
    if (rows.length < teamPageSize) break;
    teamOffset += teamPageSize;
  }
  const teams = allTeams;
  const countryTeams = new Map<string, number>();
  for (const t of teams || []) {
    if (!t.country_code) continue;
    countryTeams.set(t.country_code, (countryTeams.get(t.country_code) || 0) + 1);
  }
  const countryNameMap: Record<string, string> = {
    US: 'United States', CA: 'Canada', SE: 'Sweden', FI: 'Finland', RU: 'Russia', CZ: 'Czech Republic',
    DE: 'Germany', CH: 'Switzerland', AT: 'Austria', NO: 'Norway', DK: 'Denmark', SK: 'Slovakia',
    LV: 'Latvia', NL: 'Netherlands', FR: 'France', IT: 'Italy', GB: 'United Kingdom', UA: 'Ukraine',
    PL: 'Poland', JP: 'Japan', KR: 'South Korea', CN: 'China', AU: 'Australia', EE: 'Estonia',
  };

  const countries: DatasetCache['countries'] = [];
  for (const [country, agg] of countryRinks.entries()) {
    const states = Array.from(agg.states.entries())
      .map(([name, rinkCount]) => {
        // Top-5 cities per state for cross-linking from state QA pages.
        const stateCityMap = agg.stateCities.get(name);
        const cities = stateCityMap
          ? Array.from(stateCityMap.entries())
              .map(([city, cityCount]) => ({ city, rinkCount: cityCount }))
              .sort((a, b) => b.rinkCount - a.rinkCount)
              .slice(0, 5)
          : [];
        return { name, rinkCount, cities };
      })
      .sort((a, b) => b.rinkCount - a.rinkCount);
    countries.push({
      country,
      rinkCount: agg.rinkCount,
      // Map country name to ISO code if known
      teamCount: countryTeams.get(countryNameMap[country] === country ? '' : '') || 0,
      states,
    });
  }

  // Aggregate leagues with team counts
  const { data: leagues } = await supabaseAdmin.from('leagues').select('id, name, slug, country, level').eq('is_active', true);
  const leagueTeamCounts = new Map<string, number>();
  for (const t of teams || []) {
    if (t.league_id) leagueTeamCounts.set(t.league_id, (leagueTeamCounts.get(t.league_id) || 0) + 1);
  }
  const leagueList: DatasetCache['leagues'] = (leagues || []).map((l: any) => ({
    id: l.id, slug: l.slug, name: l.name, country: l.country || 'Unknown', level: l.level || 'unknown',
    teamCount: leagueTeamCounts.get(l.id) || 0,
  }));

  // Top cities by rink count
  const cityList: DatasetCache['cities'] = [];
  for (const [country, agg] of countryRinks.entries()) {
    for (const [city, count] of agg.cities.entries()) {
      if (count >= 5) cityList.push({ city, country, rinkCount: count });
    }
  }
  cityList.sort((a, b) => b.rinkCount - a.rinkCount);

  return { countries, leagues: leagueList, cities: cityList, generatedAt: Date.now() };
}

async function getCache(): Promise<DatasetCache> {
  if (!cache || Date.now() - cache.generatedAt > CACHE_TTL_MS) {
    cache = await buildCache();
  }
  return cache;
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// US state abbrev → full name (for "Hockey in Minnesota" instead of "Hockey in MN")
const US_STATE_ABBR_TO_NAME: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri',
  MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
  NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio',
  OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
  VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
};

function displayStateName(s: string): string {
  // If already a full name (no spaces after first word and length > 3), return as-is
  // Otherwise look up abbreviation
  return US_STATE_ABBR_TO_NAME[s] || s;
}

// Inverse map for looking up the 2-letter state code from the rinks.province_state
// column. Used by state QA templates to find that state's cities.
function getAbbrFromStateName(s: string): string {
  for (const [abbr, fullName] of Object.entries(US_STATE_ABBR_TO_NAME)) {
    if (fullName === s) return abbr;
  }
  return s;
}

// Canadian province abbrev → full name (Ontario, not ON)
const CA_PROVINCE_ABBR_TO_NAME: Record<string, string> = {
  AB: 'Alberta', BC: 'British Columbia', MB: 'Manitoba', NB: 'New Brunswick',
  NL: 'Newfoundland and Labrador', NS: 'Nova Scotia', NT: 'Northwest Territories',
  NU: 'Nunavut', ON: 'Ontario', PE: 'Prince Edward Island', QC: 'Quebec',
  SK: 'Saskatchewan', YT: 'Yukon',
};

function displayProvinceName(s: string): string {
  return CA_PROVINCE_ABBR_TO_NAME[s] || s;
}

// Inverse map for Canadian province abbr lookup.
function getCaAbbrFromProvinceName(s: string): string {
  for (const [abbr, fullName] of Object.entries(CA_PROVINCE_ABBR_TO_NAME)) {
    if (fullName === s) return abbr;
  }
  return s;
}

export async function generateQAPages(): Promise<QAPageConfig[]> {
  const data = await getCache();
  const pages: QAPageConfig[] = [];

  // 1. Per-country Q&A: "Hockey in {country}"
  for (const c of data.countries.sort((a, b) => b.rinkCount - a.rinkCount)) {
    const slug = slugify(c.country);
    // Page URL: /learn/hockey-in/{slug}
    // The route joins path segments with '-' so findQAPage is called with
    // 'hockey-in-{slug}'. Generate the slug to match.
    const pageSlug = `hockey-in-${slug}`;
    const page: QAPageConfig = {
      slug: pageSlug,
      url_path: `/learn/hockey-in/${slug}`,
      question: `Hockey in ${c.country} — rinks, teams, and leagues`,
      short_answer: `${c.country} has ${c.rinkCount.toLocaleString()} active ice rinks tracked by RinkStop. ${c.country} participates in professional leagues, ${c.country} national team programs compete in IIHF events, and recreational/youth hockey is played at every level. The exact rink and team counts below are pulled live from RinkStop's directory.`,
      full_answer_md: `Hockey in ${c.country} is played across professional leagues, national team programs, college/amateur clubs, and youth development systems.

## Rinks in ${c.country}

RinkStop tracks **${c.rinkCount.toLocaleString()} active ice rinks** in ${c.country}. These include:

- Professional arenas hosting league games
- Community rinks for youth and adult leagues
- Multi-surface facilities with public skating sessions
- Olympic-sized venues for international events

[Browse all ${c.country} rinks →](/directory/${slug})

## Leagues and teams in ${c.country}

${c.country} participates in both domestic leagues and international competitions. Leagues operating in ${c.country} include professional, junior, college, and recreational tiers.

[Browse ${c.country} leagues →](/directory/${slug})

## IIHF membership and national team

${c.country}'s national team program represents the country in IIHF-sanctioned events including the IIHF World Championship, Winter Olympics, and World Juniors.

## Youth and recreational hockey

Hockey Canada, USA Hockey, and equivalent federations run development programs at every age level.` +
        // For US/Canada, link to top states/provinces (cross-link graph).
        (c.states.length > 0
          ? `\n## Top ${c.country === 'United States' ? 'states' : c.country === 'Canada' ? 'provinces' : 'regions'} with rinks\n\n` +
            c.states.slice(0, 10).map((s) => {
              const urlSlug = c.country === 'United States'
                ? `/learn/hockey-in/${slugify(displayStateName(s.name))}-us-state`
                : c.country === 'Canada'
                ? `/learn/hockey-in/${slugify(displayProvinceName(s.name))}-canadian-province`
                : `/directory/${slug}`;
              const displayName = c.country === 'United States' ? displayStateName(s.name)
                : c.country === 'Canada' ? displayProvinceName(s.name)
                : s.name;
              return `- [Hockey in ${displayName}](${urlSlug}) — ${s.rinkCount.toLocaleString()} rink${s.rinkCount === 1 ? '' : 's'}`;
            }).join('\n')
          : ''),
      related_urls: [
        { label: `All ${c.country} rinks`, url: `/directory/${slug}` },
        { label: `Hockey teams in ${c.country}`, url: `/directory/${slug}/teams` },
        { label: `Hockey leagues`, url: '/directory/leagues' },
        // Add state/province QA pages to the related URL graph.
        ...(c.country === 'United States'
          ? c.states.slice(0, 10).map((s) => ({
              label: `Hockey in ${displayStateName(s.name)}`,
              url: `/learn/hockey-in/${slugify(displayStateName(s.name))}-us-state`,
            }))
          : c.country === 'Canada'
          ? c.states.slice(0, 10).map((s) => ({
              label: `Hockey in ${displayProvinceName(s.name)}`,
              url: `/learn/hockey-in/${slugify(displayProvinceName(s.name))}-canadian-province`,
            }))
          : []),
      ],
      data_sources: [
        { source: 'rinks table (is_active=true)', count: c.rinkCount },
        { source: 'team_workspaces table', count: c.teamCount },
      ],
      faqs: [
        { q: `How many hockey rinks are in ${c.country}?`, a: `RinkStop tracks ${c.rinkCount.toLocaleString()} active ice rinks in ${c.country} as of today.` },
        { q: `Does ${c.country} have an ice hockey national team?`, a: `Yes. ${c.country}'s national federation is an IIHF member and fields teams for the IIHF World Championship and Olympic qualification.` },
        { q: `What is the biggest hockey league in ${c.country}?`, a: `Browse the leagues directory at /directory/${slug} for the most current list of leagues operating in ${c.country}.` },
      ],
      meta_description: `${c.country} hockey: ${c.rinkCount.toLocaleString()} ice rinks, ${c.teamCount.toLocaleString()} active teams, multiple leagues. Data from RinkStop's global directory.`,
      og_title: `Hockey in ${c.country} — ${c.rinkCount.toLocaleString()} rinks, ${c.teamCount.toLocaleString()} teams`,
    };
    pages.push(page);
  }

  // 2. Per-league Q&A: "{league_name} teams" — top leagues by team count
  // Threshold lowered to 1 (was 3) — even single-team leagues warrant a Q&A page
  // because they have a canonical URL structure (/directory/{slug}/teams) and
  // AI engines look for "X teams" queries even when X is small.
  const topLeagues = data.leagues.filter((l) => l.teamCount >= 1).slice(0, 150);
  for (const l of topLeagues) {
    // Slug matches URL /learn/{league-slug}-teams, joined as
    // '{league-slug}-teams' by the catch-all route.
    const pageSlug = `${l.slug}-teams`;
    const page: QAPageConfig = {
      slug: pageSlug,
      url_path: `/learn/${l.slug}-teams`,
      question: `${l.name} teams — full roster and profiles`,
      short_answer: `${l.name} currently has ${l.teamCount.toLocaleString()} active teams tracked by RinkStop. ${l.name} is a ${l.level} league operating in ${l.country}. Each team has a verified profile with roster, arena, schedule, and contact information.`,
      full_answer_md: `The **${l.name}** (${l.level} tier) is one of ${l.country}'s hockey leagues, with ${l.teamCount.toLocaleString()} active teams currently tracked.

## Current ${l.name} teams

RinkStop maintains a verified profile for every active team in ${l.name}. Each profile includes the team roster, home arena, schedule, league standings, and direct contact information.

[Browse all ${l.name} teams →](/directory/${l.slug})

## About ${l.name}

${l.name} operates at the ${l.level} tier in ${l.country}. RinkStop updates team rosters and standings automatically as the league reports new data.

## Following ${l.name}

You can follow ${l.name} on RinkStop to get notifications about scores, trades, and roster moves.`,
      related_urls: [
        { label: `${l.name} directory`, url: `/directory/${l.slug}` },
        { label: 'Hockey leagues', url: '/directory/leagues' },
      ],
      data_sources: [
        { source: 'team_workspaces table (league_id match)', count: l.teamCount },
        { source: 'leagues table (is_active=true)', count: 1 },
      ],
      faqs: [
        { q: `How many teams are in ${l.name}?`, a: `RinkStop tracks ${l.teamCount.toLocaleString()} active teams in ${l.name}.` },
        { q: `What tier is ${l.name}?`, a: `${l.name} is classified as a ${l.level} league.` },
        { q: `Where can I see ${l.name} standings?`, a: `Visit /directory/${l.slug} for current standings and team profiles.` },
      ],
      meta_description: `${l.name}: ${l.teamCount.toLocaleString()} active teams, ${l.level} tier in ${l.country}. Full team profiles with rosters and standings.`,
      og_title: `${l.name} teams — ${l.teamCount.toLocaleString()} active profiles`,
    };
    pages.push(page);
  }

  // 3. Per-city Q&A (every city with ≥1 rink, capped at 1,500 to keep sitemap
  // reasonable). The cap was 100 which left ~1,200 cities unaddressed. With
  // the cap raised to 1,500 we cover the long tail of cities that drive
  // the highest-CTR organic queries (Estonia/Portugal/Greece per 2026-09-29
  // GSC analysis — these are small markets with very low competition).
  // We skip cities that contain postal-code artifacts (digits anywhere in
  // the city name) so the URL slugs are clean. Examples we filter out:
  //   "Tallinn 13414", "Alexandria (Inner South Sydney), NSW 2015",
  //   "Canillo, Andorra AD100".
  // This reduces the corpus from ~1,431 raw cities to ~1,292 clean ones
  // that produce useful URLs. Cities with all-letter names pass through
  // regardless of punctuation (commas, dashes, parentheses).
  const allCities = data.cities
    .filter((c) => c.city && c.country && !/\d/.test(c.city))
    .sort((a, b) => b.rinkCount - a.rinkCount)
    .slice(0, 1500);
  for (const city of allCities) {
    const citySlug = slugify(city.city);
    const countrySlug = slugify(city.country);
    // Slug matches URL /learn/hockey-rinks-in/{city-slug}-{country-slug},
    // joined by the route as 'hockey-rinks-in-{city-slug}-{country-slug}'.
    const pageSlug = `hockey-rinks-in-${citySlug}-${countrySlug}`;
    const page: QAPageConfig = {
      slug: pageSlug,
      url_path: `/learn/hockey-rinks-in/${citySlug}-${countrySlug}`,
      question: `Ice rinks in ${city.city}, ${city.country}`,
      short_answer: `RinkStop tracks ${city.rinkCount.toLocaleString()} ice rinks in ${city.city}, ${city.country}. These include professional arenas, community rinks, and public skating facilities. Each rink has a profile with address, hours, programs, and contact info.`,
      full_answer_md: `There are **${city.rinkCount.toLocaleString()} ice rinks** in ${city.city}, ${city.country} tracked by RinkStop.

## List of rinks in ${city.city}

[Browse all ${city.city} rinks →](/directory/${countrySlug}/cities/${citySlug})

## Local hockey teams

Several hockey teams use ${city.city} rinks as home arenas. Browse the team directory to see which teams play where.`,
      related_urls: [
        { label: `${city.city} rinks`, url: `/directory/${countrySlug}/cities/${citySlug}` },
        { label: 'All hockey rinks', url: '/directory/rinks' },
      ],
      data_sources: [
        { source: 'rinks table (city match, is_active=true)', count: city.rinkCount },
      ],
      faqs: [
        { q: `How many ice rinks are in ${city.city}?`, a: `RinkStop tracks ${city.rinkCount.toLocaleString()} active ice rinks in ${city.city}.` },
        { q: `Where can I play hockey in ${city.city}?`, a: `Most rinks in ${city.city} offer drop-in hockey sessions, league play, or learn-to-play programs. Check individual rink profiles at /directory/${countrySlug}/cities/${citySlug}.` },
        { q: `Are rinks in ${city.city} open year-round?`, a: `Most rinks in ${city.city} operate year-round. Some seasonal rinks close during summer. Status is shown on each rink profile.` },
      ],
      meta_description: `${city.rinkCount.toLocaleString()} ice rinks in ${city.city}, ${city.country} — addresses, hours, programs, and contact info.`,
      og_title: `Ice rinks in ${city.city} — ${city.rinkCount.toLocaleString()} active facilities`,
    };
    pages.push(page);
  }

  // 4. Per-US-state Q&A — all 50 states, hardcoded.
  // DB province_state is unpopulated for US rinks, so we generate all 50 regardless.
  const ALL_US_STATES = [
    'Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut','Delaware',
    'Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa','Kansas','Kentucky',
    'Louisiana','Maine','Maryland','Massachusetts','Michigan','Minnesota','Mississippi',
    'Missouri','Montana','Nebraska','Nevada','New Hampshire','New Jersey','New Mexico',
    'New York','North Carolina','North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania',
    'Rhode Island','South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont',
    'Virginia','Washington','West Virginia','Wisconsin','Wyoming',
  ];
  const usCountry = data.countries.find((c) => c.country === 'United States');
  const usRinkCount = usCountry?.rinkCount ?? 0;
  for (const stateName of ALL_US_STATES) {
    const stateSlug = slugify(stateName);
    const stateAbbr = getAbbrFromStateName(stateName);
    // Look up this state's data — rink count + top-5 cities for cross-links.
    // Falls back gracefully if province_state isn't populated for this state.
    const stateData = usCountry?.states.find((s) => s.name === stateAbbr);
    const stateRinkCount = stateData?.rinkCount ?? 0;
    const topCities = stateData?.cities ?? [];
    const pageSlug = `hockey-in-${stateSlug}-us-state`;
    // Build a cities bullet list for the markdown body. Each entry links
    // to the city QA page (deep internal link, high SEO value).
    const citiesSection = topCities.length > 0
      ? `\n## Top hockey cities in ${stateName}\n\n` +
        topCities.map((c) =>
          `- [Ice rinks in ${c.city}](/learn/hockey-rinks-in/${slugify(c.city)}-${slugify('United States')}) — ${c.rinkCount.toLocaleString()} rink${c.rinkCount === 1 ? '' : 's'}`
        ).join('\n')
      : '';
    const page: QAPageConfig = {
      slug: pageSlug,
      url_path: `/learn/hockey-in/${stateSlug}-us-state`,
      question: `Hockey in ${stateName} — rinks, teams, and leagues`,
      short_answer: stateRinkCount > 0
        ? `${stateName} has ${stateRinkCount.toLocaleString()} active ice rinks tracked by RinkStop${topCities.length > 0 ? `, with ${topCities.slice(0,3).map((c) => c.city).join(', ')} among the top cities.` : ''}. The state fields professional, junior, college (NCAA D1/D3), high school, and youth hockey programs. USA Hockey administers amateur hockey through designated affiliates in each state.`
        : `${stateName} is one of 50 US states tracked by RinkStop. The state fields professional, junior, college (NCAA D1/D3), high school, and youth hockey programs. USA Hockey administers amateur hockey through designated affiliates in each state.`,
      full_answer_md: `Hockey in ${stateName} is played at every competitive level — from professional franchises down to youth leagues.

## Rinks in ${stateName}

RinkStop tracks **${usRinkCount.toLocaleString()} active ice rinks** across the United States. Browse each state's directory page for local rink listings.

## College + amateur hockey

${stateName} hosts NCAA Division I and/or III programs (depending on the school). USA Hockey administers amateur hockey through designated affiliates in each state.

[Browse all US hockey →](/directory/united-states)
[Browse US hockey teams →](/directory/teams)
[Browse US hockey leagues →](/directory/leagues)` +
        citiesSection,
      related_urls: [
        { label: `${stateName} rinks`, url: `/directory/united-states/${stateSlug}` },
        { label: `US hockey directory`, url: '/directory/united-states' },
        { label: `Hockey leagues`, url: '/directory/leagues' },
        // Add top city QA pages as related URLs so they get included in the
        // sitemap cross-link graph. Only emit if the state has cities.
        ...topCities.map((c) => ({
          label: `Ice rinks in ${c.city}`,
          url: `/learn/hockey-rinks-in/${slugify(c.city)}-${slugify('United States')}`,
        })),
      ],
      data_sources: [
        { source: 'rinks table (country=United States, is_active=true)', count: usRinkCount },
        ...(topCities.length > 0 ? [{ source: `Top cities in ${stateName} (by rink count)`, count: topCities.length }] : []),
      ],
      faqs: [
        { q: `How many ice rinks are in ${stateName}?`, a: stateRinkCount > 0
          ? `${stateName} has ${stateRinkCount.toLocaleString()} active ice rinks tracked by RinkStop. The US as a whole has ${usRinkCount.toLocaleString()} rinks across all 50 states.`
          : `The United States has ${usRinkCount.toLocaleString()} active ice rinks tracked by RinkStop across all 50 states. ${stateName} rink counts are continuously updated as USA Hockey affiliates verify local listings.` },
        { q: `Does ${stateName} have professional hockey?`, a: `${stateName} may host professional teams depending on NHL/AHL/ECHL affiliation. Browse the league directory at /directory/leagues for current affiliations.` },
        { q: `Does ${stateName} have college hockey?`, a: `Most US states have at least one NCAA hockey program. Browse /directory/college for NCAA D1/D3 programs.` },
        ...(topCities.length > 0 ? [{ q: `What are the biggest hockey cities in ${stateName}?`, a: `The top cities for hockey rinks in ${stateName} are ${topCities.slice(0,5).map((c) => `${c.city} (${c.rinkCount} rink${c.rinkCount === 1 ? '' : 's'})`).join(', ')}.` }] : []),
      ],
      meta_description: stateRinkCount > 0
        ? `Hockey in ${stateName}: ${stateRinkCount.toLocaleString()} ice rinks${topCities.length > 0 ? `, top cities: ${topCities.slice(0,3).map((c) => c.city).join(', ')}` : ''}. NCAA, amateur, and youth leagues.`
        : `Hockey in ${stateName}: US hockey data, NCAA, amateur, and youth leagues.`,
      og_title: stateRinkCount > 0
        ? `Hockey in ${stateName} — ${stateRinkCount.toLocaleString()} rinks${topCities.length > 0 ? `, top cities: ${topCities.slice(0,3).map((c) => c.city).join(', ')}` : ''}`
        : `Hockey in ${stateName} — US hockey rinks, NCAA, amateur, and youth leagues`,
    };
    pages.push(page);
  }

  // 5. Per-Canadian-province Q&A (provinces with ≥2 rinks; targets "hockey in [province]" queries)
  const caCountry = data.countries.find((c) => c.country === 'Canada');
  if (caCountry && caCountry.states.length > 0) {
    const caProvinces = caCountry.states
      .filter((s) => s.rinkCount >= 1)
      .sort((a, b) => b.rinkCount - a.rinkCount)
      .slice(0, 13);
    for (const province of caProvinces) {
      const provinceSlug = slugify(province.name);
      const provinceName = displayProvinceName(province.name);
      const pageSlug = `hockey-in-${provinceSlug}-canadian-province`;
      // Top cities in this province for cross-linking.
      const topCitiesCa = province.cities ?? [];
      const citiesSectionCa = topCitiesCa.length > 0
        ? `\n## Top hockey cities in ${provinceName}\n\n` +
          topCitiesCa.map((c) =>
            `- [Ice rinks in ${c.city}](/learn/hockey-rinks-in/${slugify(c.city)}-${slugify('Canada')}) — ${c.rinkCount.toLocaleString()} rink${c.rinkCount === 1 ? '' : 's'}`
          ).join('\n')
        : '';
      const page: QAPageConfig = {
        slug: pageSlug,
        url_path: `/learn/hockey-in/${provinceSlug}-canadian-province`,
        question: `Hockey in ${provinceName}, Canada — rinks and leagues`,
        short_answer: `${provinceName} has ${province.rinkCount.toLocaleString()} active ice rinks tracked by RinkStop${topCitiesCa.length > 0 ? `, with ${topCitiesCa.slice(0,3).map((c) => c.city).join(', ')} among the top cities.` : ''}. The province fields CHL major-junior teams, U Sports university programs, AAA minor hockey, and recreational leagues under Hockey Canada governance.`,
        full_answer_md: `Hockey in ${provinceName} operates under Hockey Canada governance with regional branch offices.

## Rinks in ${provinceName}

RinkStop tracks **${province.rinkCount.toLocaleString()} active ice rinks** in ${provinceName}.

[Browse all ${provinceName} rinks →](/directory/canada/${provinceSlug})

## Junior + university hockey

${provinceName} typically hosts CHL teams (OHL, WHL, or QMJHL depending on region) and U Sports university programs.

[Browse Canadian hockey leagues →](/directory/leagues)

## Minor hockey

Hockey Canada runs minor hockey associations across ${provinceName} at AAA, AA, A, B, and recreational tiers.` +
          citiesSectionCa,
        related_urls: [
          { label: `${provinceName} rinks`, url: `/directory/canada/${provinceSlug}` },
          { label: `Canadian hockey directory`, url: '/directory/canada' },
          { label: `Hockey leagues`, url: '/directory/leagues' },
          ...topCitiesCa.map((c) => ({
            label: `Ice rinks in ${c.city}`,
            url: `/learn/hockey-rinks-in/${slugify(c.city)}-${slugify('Canada')}`,
          })),
        ],
        data_sources: [
          { source: 'rinks table (province_state match, is_active=true)', count: province.rinkCount },
          ...(topCitiesCa.length > 0 ? [{ source: `Top cities in ${provinceName} (by rink count)`, count: topCitiesCa.length }] : []),
        ],
        faqs: [
          { q: `How many ice rinks are in ${provinceName}?`, a: `RinkStop tracks ${province.rinkCount.toLocaleString()} active ice rinks in ${provinceName}, Canada.` },
          { q: `Does ${provinceName} have a CHL team?`, a: `${provinceName} may host CHL teams depending on the region. Browse the leagues directory for current affiliations.` },
          { q: `What is the main junior league in ${provinceName}?`, a: `${provinceName} typically has WHL (Western), OHL (Ontario), or QMJHL (Quebec) teams, plus U Sports university hockey.` },
          ...(topCitiesCa.length > 0 ? [{ q: `What are the biggest hockey cities in ${provinceName}?`, a: `The top cities for hockey rinks in ${provinceName} are ${topCitiesCa.slice(0,5).map((c) => `${c.city} (${c.rinkCount} rink${c.rinkCount === 1 ? '' : 's'})`).join(', ')}.` }] : []),
        ],
        meta_description: province.rinkCount > 0
          ? `Hockey in ${provinceName}: ${province.rinkCount.toLocaleString()} ice rinks${topCitiesCa.length > 0 ? `, top cities: ${topCitiesCa.slice(0,3).map((c) => c.city).join(', ')}` : ''}, CHL + U Sports + minor hockey.`
          : `Hockey in ${provinceName}: Canadian hockey data, CHL + U Sports + minor hockey.`,
        og_title: `Hockey in ${provinceName} — ${province.rinkCount.toLocaleString()} rinks${topCitiesCa.length > 0 ? `, top cities: ${topCitiesCa.slice(0,3).map((c) => c.city).join(', ')}` : ''}, CHL + U Sports`,
      };
      pages.push(page);
    }
  }

  return pages;
}

export async function findQAPage(slug: string): Promise<QAPageConfig | null> {
  const pages = await generateQAPages();
  return pages.find((p) => p.slug === slug) || null;
}
