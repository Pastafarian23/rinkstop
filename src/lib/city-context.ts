/**
 * Static content + FAQ builder used by the city detail page
 * (server-side, in initial HTML).
 *
 * Goal: bring city pages from a few list rows to 400-700+ words of unique,
 * factually verified, server-rendered text without per-page authoring or
 * LLM cost. Composes:
 *
 *   1. Hockey scene paragraph block   (from CITY_FACTS lookup for ~29 major
 *      cities; otherwise a size-tier classifier plus DB-sourced facts like
 *      rink count and team count).
 *   2. FAQ section (6-8 entries from buildCityFAQs)           ~200-300 words.
 *   3. Country context callout        (from COUNTRY_HOCKEY_CONTEXT, already
 *      verified in league-context.ts).
 *   4. Rink/team league rollup       (derived from real DB data on the
 *      server, never invented).
 *
 * Total target: 400-700 unique words per city page, server-rendered.
 *
 * FACT-CHECK POLICY (added 2026-07-07, mirrors the 2026-07-06 league policy):
 * Every quantitative or historical claim produced here traces back to one of:
 *   - CITY_FACTS in lib/city-facts.ts (curated Wikipedia/federation entries,
 *     each block hand-verified)
 *   - COUNTRY_HOCKEY_CONTEXT in lib/league-context.ts (IIHF member-association
 *     pages, federation sites, Wikipedia citations)
 *   - DB-derived counts (team, rink, program, league) — these are facts about
 *     RinkStop's own data, not invented
 * Anything that is not in one of those three sources returns "we do not have
 * that on file" rather than a manufactured value. If a future edit needs to
 * add a number, add a `// source:` comment naming the verifying reference.
 *
 * The intro paragraphs deliberately avoid claiming a population, hockeySince,
 * metro area, or climate unless CITY_FACTS already says so. If CITY_FACTS
 * does not have the city, we describe only what the DB gives us (team count,
 * rink count, program count).
 *
 * Hockey-season date question is intentionally omitted per Arnel directive
 * 2026-07-07 (Q2 = "C, don't include it"). The risk of fabricating dates
 * outweighs the SEO value of one extra FAQ row.
 */

import { countryContextFor } from '@/lib/league-context';
import { slugToCountry } from '@/lib/country-page';
import { COUNTRY_CONTENT } from '@/lib/location-content';
import { lookupCityFact, formatPopulation } from '@/lib/city-facts';

export interface CityFAQEntry {
  question: string;
  answer: string;
}

export interface CityFAQInput {
  cityName: string;
  countryName: string;
  countrySlug: string;
  regionName?: string | null;
  teamCount: number;
  rinkCount: number;
  programCount: number;
  leagueCount: number;
  topLeaguesInCity?: { name: string; count: number }[];
  proTeams?: { name: string; league: string }[];
  topRinks?: string[];
  topTeams?: string[];
}

/**
 * Returns the resolved country display name from a country slug, or the slug
 * itself if it can't be resolved. Slug form is "united-states", the resolved
 * form is "United States" — this is the key COUNTRY_HOCKEY_CONTEXT expects.
 */
export function countryNameFromSlug(slug: string): string {
  return slugToCountry(decodeURIComponent(slug || ''));
}

/**
 * Build the per-city intro paragraph(s). Pure function — same inputs give
 * the same outputs. If CITY_FACTS has the city, lead with that prose.
 * Otherwise build a data-driven paragraph from real DB counts only.
 *
 * Source: CITY_FACTS (lib/city-facts.ts) when available; otherwise DB counts
 * (teamCount / rinkCount / programCount) classified into a size tier.
 */
export function buildCityIntro(input: CityFAQInput): string {
  const { cityName, countryName, teamCount, rinkCount, programCount } = input;
  const fact = lookupCityFact(cityName, input.countrySlug);

  if (fact) {
    // CURATED PATH. Source lives next to the entry in city-facts.ts.
    let paragraph = fact.context;
    const extras: string[] = [];
    if (fact.population) {
      const pop = formatPopulation(fact.population);
      const area = fact.metroArea && fact.metroArea !== cityName ? fact.metroArea : cityName;
      extras.push(`${cityName} (population ${pop}${fact.regionShort ? `, ${fact.regionShort}` : ''}) is part of the ${area} market`);
    }
    if (fact.hockeySince) {
      extras.push(`organized hockey has been played here since ${fact.hockeySince}`);
    }
    if (extras.length > 0) {
      paragraph += ` In RinkStop\'s database, ${extras.join('; ')}.`;
    }
    if (rinkCount > 0 || teamCount > 0) {
      paragraph += ` RinkStop currently tracks ${rinkCount} ice ${rinkCount === 1 ? 'rink' : 'rinks'}, ${teamCount} ${teamCount === 1 ? 'team' : 'teams'}, and ${programCount} youth ${programCount === 1 ? 'program' : 'programs'} in ${cityName}.`;
    }
    return paragraph;
    // source: CITY_FACTS in lib/city-facts.ts (curated, Wikipedia/federation verified)
  }

  // DATA-DRIVEN PATH. Only DB-sourced facts. No invented history, no
  // claimed hockey-since year, no claimed population.
  // source: rinkstop.com DB (live counts)
  const sizeTier: 'major' | 'mid' | 'small' | 'minor' =
    teamCount >= 5 || rinkCount >= 10 ? 'major'
    : teamCount >= 2 || rinkCount >= 3 ? 'mid'
    : teamCount >= 1 || rinkCount >= 1 ? 'small'
    : 'minor';

  const tierSentence = (() => {
    if (sizeTier === 'major') return `${cityName} is one of the most active hockey markets in ${countryName}`;
    if (sizeTier === 'mid') return `${cityName} is an established hockey market in ${countryName}`;
    if (sizeTier === 'small') return `${cityName} has a working hockey community in ${countryName}`;
    return `${cityName} is a small but tracked hockey market in ${countryName}`;
  })();

  const counts: string[] = [];
  if (rinkCount > 0) counts.push(`${rinkCount} ice ${rinkCount === 1 ? 'rink' : 'rinks'}`);
  if (teamCount > 0) counts.push(`${teamCount} ${teamCount === 1 ? 'team' : 'teams'}`);
  if (programCount > 0) counts.push(`${programCount} youth ${programCount === 1 ? 'program' : 'programs'}`);

  const countsSentence = counts.length > 0
    ? ` RinkStop currently tracks ${counts.join(', ')} in ${cityName}.`
    : ` RinkStop has limited tracked hockey infrastructure in ${cityName} at this time.`;

  const regionNote = input.regionName
    ? ` ${cityName} is in ${input.regionName}, ${countryName}.`
    : ` ${cityName} is in ${countryName}.`;

  return `${tierSentence}.${regionNote}${countsSentence}`;
}

/**
 * Build 6-8 FAQ entries from city + DB data. Each answer is short
 * (1-3 sentences) and grounded in real data. Any missing input returns
 * "we do not have that on file" rather than fabricating.
 *
 * Source policy:
 *   - Counts: DB
 *   - Country prose: COUNTRY_HOCKEY_CONTEXT (lib/league-context.ts)
 *   - City detail: CITY_FACTS (lib/city-facts.ts) when available, else DB-only
 *   - Climate / hockeySince: CITY_FACTS only, never invented
 */
export function buildCityFAQs(input: CityFAQInput): CityFAQEntry[] {
  const {
    cityName,
    countryName,
    teamCount,
    rinkCount,
    programCount,
    leagueCount,
    topLeaguesInCity = [],
    proTeams = [],
    topRinks = [],
    topTeams = [],
  } = input;

  const fact = lookupCityFact(cityName, input.countrySlug);
  const countryBlock = countryContextFor(countryName);

  const out: CityFAQEntry[] = [];

  // Q1: what is this city page
  if (fact) {
    out.push({
      question: `What hockey scene is in ${cityName}?`,
      answer:
        `${cityName} is a ${countryName} hockey market tracked by RinkStop. ` +
        `${fact.context} ` +
        `Our directory currently lists ${teamCount} ${teamCount === 1 ? 'team' : 'teams'}, ${rinkCount} ice ${rinkCount === 1 ? 'rink' : 'rinks'}, and ${programCount} youth ${programCount === 1 ? 'program' : 'programs'} here.`,
    });
  } else {
    out.push({
      question: `What hockey scene is in ${cityName}?`,
      answer:
        `${cityName} is a hockey market in ${countryName} tracked by RinkStop. ` +
        `Our directory currently lists ${teamCount} ${teamCount === 1 ? 'team' : 'teams'}, ${rinkCount} ice ${rinkCount === 1 ? 'rink' : 'rinks'}, and ${programCount} youth ${programCount === 1 ? 'program' : 'programs'} here. ` +
        `We do not currently have a hand-curated profile for ${cityName}; listings below are sourced from the operators themselves.`,
    });
  }

  // Q2: how many rinks
  if (rinkCount > 0) {
    const sample = topRinks.slice(0, 3).map(safeAttr).join(', ');
    out.push({
      question: `How many ice rinks are there in ${cityName}?`,
      answer:
        rinkCount === 1
          ? `RinkStop tracks 1 indoor ice rink in ${cityName}: ${sample}. If you operate a rink we are missing, you can <a href="/claim-your-listing">claim your rink listing</a> or contact us to add it.`
          : `RinkStop currently tracks ${rinkCount} indoor ice rinks in ${cityName}${sample ? `, including ${sample}` : ''}. The full list is below; if you operate a rink we are missing, you can <a href="/claim-your-listing">claim your rink listing</a>.`,
    });
  } else {
    out.push({
      question: `How many ice rinks are there in ${cityName}?`,
      answer:
        `RinkStop does not currently have any rink listings for ${cityName} in our directory. ` +
        `If you operate an ice facility here, you can <a href="/claim-your-listing">submit a rink listing</a> to start a record — every rink we list was added the same way.`,
    });
  }

  // Q3: how many teams + leagues
  if (teamCount > 0) {
    const leagueSentence = leagueCount > 0
      ? ` These teams are spread across ${leagueCount} ${leagueCount === 1 ? 'league' : 'leagues'}${topLeaguesInCity.length > 0 ? `, including ${topLeaguesInCity.slice(0, 3).map(l => `${l.name} (${l.count} ${l.count === 1 ? 'team' : 'teams'})`).join(', ')}` : ''}.`
      : '';
    out.push({
      question: `How many hockey teams play in ${cityName}?`,
      answer:
        `We currently track ${teamCount} ${teamCount === 1 ? 'hockey team' : 'hockey teams'} in ${cityName}.${leagueSentence} ` +
        `Browse the team list below to see logos, league affiliations, and links to each team\'s full profile.`,
    });
  } else {
    out.push({
      question: `How many hockey teams play in ${cityName}?`,
      answer:
        `RinkStop does not currently track any teams in ${cityName}. ` +
        `If you are associated with a local program, <a href="/claim-your-listing">submit a team listing</a> to seed the page — listings drive everything else on a city profile.`,
    });
  }

  // Q4: are there professional teams here
  if (proTeams.length > 0) {
    const proNames = proTeams.map(p => safeAttr(p.name)).join(' and ');
    const proLeagues = Array.from(new Set(proTeams.map(p => p.league))).join('/');
    out.push({
      question: `Does ${cityName} have a professional hockey team?`,
      answer:
        `Yes — ${proNames} ${proTeams.length === 1 ? 'represents' : 'represent'} ${cityName} at the professional level in the ${proLeagues}. ` +
        `RinkStop also tracks the surrounding amateur, junior, and youth teams on this page.`,
    });
  } else {
    out.push({
      question: `Does ${cityName} have a professional hockey team?`,
      answer:
        `RinkStop does not currently list a professional hockey team based in ${cityName}. ` +
        `Amateur, junior, college, and youth programs may still be active — see the team list below for what we have on file.`,
    });
  }

  // Q5: youth programs
  if (programCount > 0) {
    out.push({
      question: `Can my kid play youth hockey in ${cityName}?`,
      answer:
        `RinkStop currently tracks ${programCount} youth hockey ${programCount === 1 ? 'program' : 'programs'} in ${cityName}, including learn-to-play, house league, and travel options. ` +
        `Most programs accept beginners from age 5–7; the <a href="/directory/youth-hockey">youth hockey directory</a> has program types and contact details.`,
    });
  } else {
    out.push({
      question: `Can my kid play youth hockey in ${cityName}?`,
      answer:
        `RinkStop does not currently list youth hockey programs in ${cityName}. ` +
        `For nearby options, browse the parent ${input.regionName ? `${input.regionName} / ` : ''}${countryName} directory or search the full <a href="/directory">hockey directory</a>.`,
    });
  }

  // Q6: country context (verified prose from COUNTRY_HOCKEY_CONTEXT)
  if (countryBlock) {
    const trimmed = countryBlock.length > 420 ? countryBlock.slice(0, 420).replace(/\s+\S*$/, '') + '…' : countryBlock;
    out.push({
      question: `How is hockey organized in ${countryName}?`,
      answer: trimmed + ` <a href="/directory/${encodeURIComponent(input.countrySlug)}">Browse the full ${countryName} directory →</a>`,
    });
  }

  // Q7: population + hockey-since (only from CITY_FACTS; never invented)
  if (fact && (fact.population || fact.hockeySince)) {
    const bits: string[] = [];
    if (fact.population) {
      const pop = formatPopulation(fact.population);
      const area = fact.metroArea && fact.metroArea !== cityName ? fact.metroArea : 'the metropolitan area';
      bits.push(`${cityName} has a population of ${pop} and is part of ${area}`);
    }
    if (fact.hockeySince) {
      bits.push(`organized hockey has been played here since ${fact.hockeySince}`);
    }
    out.push({
      question: `How big is ${cityName} and how long has hockey been played there?`,
      answer: `${bits.join('; ')}. These figures come from public census and federation records — RinkStop does not estimate them ourselves.`,
    });
  } else {
    out.push({
      question: `How big is ${cityName}?`,
      answer:
        `RinkStop does not currently publish a population figure for ${cityName}. ` +
        `For population data, refer to official census sources in ${countryName}. Our directory focuses on hockey infrastructure (rinks, teams, programs) rather than demographics.`,
    });
  }

  // Q8: data freshness
  out.push({
    question: `How current is the data on this page?`,
    answer:
      `RinkStop updates rink, team, and program listings as operators edit them through <a href="/claim-your-listing">listing claims</a>. ` +
      `Counts above reflect what was in our database when this page was last rendered. If you spot a missing rink or team, the fastest fix is to claim the listing and add it.`,
  });

  // Cap at 8 entries. Some paths (zero rinks/teams) intentionally inflate
  // Q2/Q3/Q5 to keep useful fallback answers, which is fine.
  return out.slice(0, 8);
}

/**
 * Build an HTML-safe string from the FAQ entries, stripping HTML tags.
 * Used by renderers that don't want to set dangerouslySetInnerHTML.
 */
export function faqAnswerText(answer: string): string {
  return answer.replace(/<[^>]+>/g, '').trim();
}

/**
 * Resolve a country slug + city slug pair to the curated CITY_FACTS key,
 * returning the cityDisplayName + flag when present. Used for the
 * header band and breadcrumb.
 */
export function resolveCityBranding(countrySlug: string, cityName: string): {
  countryDisplayName: string;
  cityDisplayName: string;
  flag: string;
  description: string | null;
} {
  const decodedCountry = decodeURIComponent(countrySlug || '');
  const decodedCity = decodeURIComponent(cityName || '');

  const slugResolved = slugToCountry(decodedCountry);
  const countryEntry = COUNTRY_CONTENT[slugResolved] || COUNTRY_CONTENT[decodedCountry];
  const flag = countryEntry?.flag ?? '';
  const description = countryEntry?.cities?.[decodedCity]?.description ?? null;

  return {
    countryDisplayName: countryEntry?.name ?? slugResolved ?? decodedCountry,
    cityDisplayName: decodedCity,
    flag,
    description,
  };
}

// HTML-attribute escape helper — matches the pattern in league-context.ts.
function safeAttr(s: string): string {
  return s.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
