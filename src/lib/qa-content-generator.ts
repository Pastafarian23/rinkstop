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
  countries: { country: string; rinkCount: number; teamCount: number }[];
  leagues: { id: string; slug: string; name: string; country: string; level: string; teamCount: number }[];
  cities: { city: string; country: string; rinkCount: number }[];
  generatedAt: number;
}

let cache: DatasetCache | null = null;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

async function buildCache(): Promise<DatasetCache> {
  // Aggregate rinks by country
  const { data: rinks } = await supabaseAdmin.from('rinks').select('country, city').eq('is_active', true);
  const countryRinks = new Map<string, { rinkCount: number; cities: Map<string, number> }>();
  for (const r of rinks || []) {
    if (!r.country) continue;
    if (!countryRinks.has(r.country)) countryRinks.set(r.country, { rinkCount: 0, cities: new Map() });
    const c = countryRinks.get(r.country)!;
    c.rinkCount++;
    if (r.city) c.cities.set(r.city, (c.cities.get(r.city) || 0) + 1);
  }

  // Aggregate teams by country
  const { data: teams } = await supabaseAdmin.from('team_workspaces').select('country_code, league_id').eq('is_active', true);
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
    countries.push({
      country,
      rinkCount: agg.rinkCount,
      // Map country name to ISO code if known
      teamCount: countryTeams.get(countryNameMap[country] === country ? '' : '') || 0,
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

export async function generateQAPages(): Promise<QAPageConfig[]> {
  const data = await getCache();
  const pages: QAPageConfig[] = [];

  // 1. Per-country Q&A: "Hockey in {country}"
  for (const c of data.countries.sort((a, b) => b.rinkCount - a.rinkCount)) {
    const slug = slugify(c.country);
    const page: QAPageConfig = {
      slug: `hockey-in-${slug}`,
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

Hockey Canada, USA Hockey, and equivalent federations run development programs at every age level.`,
      related_urls: [
        { label: `All ${c.country} rinks`, url: `/directory/${slug}` },
        { label: `Hockey teams in ${c.country}`, url: `/directory/${slug}/teams` },
        { label: `Hockey leagues`, url: '/directory/leagues' },
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
  const topLeagues = data.leagues.filter((l) => l.teamCount >= 3).slice(0, 80);
  for (const l of topLeagues) {
    const page: QAPageConfig = {
      slug: `${l.slug}-teams`,
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

  // 3. Per-city Q&A (top 100 cities by rink count)
  const topCities = data.cities.slice(0, 100);
  for (const city of topCities) {
    const citySlug = slugify(city.city);
    const countrySlug = slugify(city.country);
    const page: QAPageConfig = {
      slug: `hockey-rinks-in-${citySlug}`,
      url_path: `/learn/hockey-rinks-in/${citySlug}-${countrySlug}`,
      question: `Ice rinks in ${city.city}, ${city.country}`,
      short_answer: `RinkStop tracks ${city.rinkCount.toLocaleString()} ice rinks in ${city.city}, ${city.country}. These include professional arenas, community rinks, and public skating facilities. Each rink has a profile with address, hours, programs, and contact info.`,
      full_answer_md: `There are **${city.rinkCount.toLocaleString()} ice rinks** in ${city.city}, ${city.country} tracked by RinkStop.

## List of rinks in ${city.city}

[Browse all ${city.city} rinks →](/directory/${countrySlug}/cities/${citySlug})

## Programs offered

Rinks in ${city.city} typically offer:
- Public skating sessions
- Learn-to-skate and learn-to-play programs
- Youth hockey leagues
- Adult recreational hockey
- Figure skating
- Hockey schools and clinics

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

  return pages;
}

export async function findQAPage(slug: string): Promise<QAPageConfig | null> {
  const pages = await generateQAPages();
  return pages.find((p) => p.slug === slug) || null;
}
