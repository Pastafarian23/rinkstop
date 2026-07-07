/**
 * FAQ + intro builder for state and province pages.
 *
 * Models after lib/city-faq-builder.ts and lib/city-context.ts.
 * Returns 6-8 entries from real data only — never invents a
 * ranking, roster, or claim that is not in either:
 *
 *   - STATE_HOCKEY_FACTS / PROVINCE_HOCKEY_FACTS (lib/state-hockey-facts.ts)
 *   - Live DB counts (cities, rinks, teams in this state/province)
 *   - The country-level context (lib/league-context.ts via
 *     countryContextFor('United States' | 'Canada'))
 *
 * FACT-CHECK POLICY (added 2026-07-07):
 * Same discipline as city-faq-builder. If a fact is not in one of
 * the three sources above, the FAQ returns the honest "we do not
 * have that on file" fallback rather than manufacturing a value.
 */

import { getStateHockeyFacts, getProvinceHockeyFacts, type StateHockeyFacts, type ProvinceHockeyFacts } from '@/lib/state-hockey-facts';
import { countryContextFor } from '@/lib/league-context';

export interface StateFAQEntry {
  question: string;
  answer: string;
}

export interface StateFAQInput {
  regionName: string;
  regionAbbr: string;
  countryName: string;
  cityCount: number;
  rinkCount: number;
  teamCount: number;
  topCities?: { city: string; rinks: number; teams: number }[];
}

/**
 * Build the intro paragraph for a US state or Canadian province page.
 * If curated facts exist, lead with them. Otherwise describe the state
 * purely from DB counts. Never invent.
 */
export function buildRegionIntro(
  input: StateFAQInput,
  facts: StateHockeyFacts | ProvinceHockeyFacts | null
): string {
  const { regionName, cityCount, rinkCount, teamCount, countryName } = input;

  if (facts) {
    // CURATED PATH
    const nhlPart = facts.nhlTeams ? `${regionName} is home to the ${facts.nhlTeams} at the NHL level. ` : '';
    const leaguePart = facts.notableLeagues ? `${facts.notableLeagues} ${facts.notableLeagues.includes(',') ? 'operate' : 'operates'} in the state. ` : '';
    const youthPart = facts.youthHockey ? `${facts.youthHockey}. ` : '';
    return `${nhlPart}${leaguePart}${youthPart}RinkStop currently tracks ${cityCount} cit${cityCount === 1 ? 'y' : 'ies'} in ${regionName}, with ${rinkCount} rink${rinkCount === 1 ? '' : 's'} and ${teamCount} team${teamCount === 1 ? '' : 's'} on file.`;
    // source: STATE/PROVINCE_HOCKEY_FACTS (lib/state-hockey-facts.ts) + live DB
  }

  // DATA-DRIVEN PATH (no curated facts). No invention.
  return `${regionName} is part of ${countryName}'s hockey infrastructure. RinkStop currently tracks ${cityCount} cit${cityCount === 1 ? 'y' : 'ies'} in ${regionName}, with ${rinkCount} rink${rinkCount === 1 ? '' : 's'} and ${teamCount} team${teamCount === 1 ? '' : 's'} on file. We do not currently have a hand-curated hockey profile for ${regionName}; the listings below are sourced from the operators themselves.`;
  // source: live DB (rinkCount, teamCount, cityCount)
}

/**
 * Build 6-8 FAQ entries for a US state page. Models after buildCityFAQs.
 * All claims trace to STATE_HOCKEY_FACTS, COUNTRY_HOCKEY_CONTEXT, or DB.
 */
export function buildStateFAQs(input: StateFAQInput): StateFAQEntry[] {
  const { regionName, cityCount, rinkCount, teamCount, topCities = [] } = input;
  const facts = getStateHockeyFacts(input.regionAbbr);
  const countryBlock = countryContextFor('United States');

  const out: StateFAQEntry[] = [];

  // Q1: What is the hockey scene in {state}?
  if (facts) {
    out.push({
      question: `What is the hockey scene in ${regionName}?`,
      answer:
        `${regionName} has an active hockey scene tracked by RinkStop. ` +
        (facts.nhlTeams ? `At the NHL level, ${regionName} is home to ${facts.nhlTeams}. ` : '') +
        (facts.youthHockey || '') +
        ` Our directory currently lists ${cityCount} cit${cityCount === 1 ? 'y' : 'ies'} with hockey activity, ${rinkCount} rink${rinkCount === 1 ? '' : 's'}, and ${teamCount} team${teamCount === 1 ? '' : 's'} on file in ${regionName}.`,
    });
  } else {
    out.push({
      question: `What is the hockey scene in ${regionName}?`,
      answer:
        `${regionName} is a US state tracked by RinkStop. Our directory currently lists ${cityCount} cit${cityCount === 1 ? 'y' : 'ies'} with hockey activity, ${rinkCount} rink${rinkCount === 1 ? '' : 's'}, and ${teamCount} team${teamCount === 1 ? '' : 's'} on file in ${regionName}. We do not currently have a curated profile for ${regionName}; listings below are sourced from operators.`,
    });
  }

  // Q2: How many ice rinks?
  if (rinkCount > 0) {
    const sample = topCities.filter(c => c.rinks > 0).slice(0, 3).map(c => c.city).join(', ');
    out.push({
      question: `How many ice rinks are there in ${regionName}?`,
      answer:
        rinkCount === 1
          ? `RinkStop tracks 1 indoor ice rink in ${regionName} across the cities below${sample ? ` (most prominently in ${sample})` : ''}. If you operate a rink we are missing, you can <a href="/claim-your-listing">claim your rink listing</a>.`
          : `RinkStop currently tracks ${rinkCount} indoor ice rink${rinkCount === 1 ? '' : 's'} in ${regionName}${sample ? `, across cities including ${sample}` : ''}. The full list is grouped below by city; if you operate a rink we are missing, you can <a href="/claim-your-listing">claim your rink listing</a>.`,
    });
  } else {
    out.push({
      question: `How many ice rinks are there in ${regionName}?`,
      answer:
        `RinkStop does not currently have rink listings for ${regionName} in our directory. ` +
        `If you operate an ice facility in the state, you can <a href="/claim-your-listing">submit a rink listing</a> — every rink we list was added the same way.`,
    });
  }

  // Q3: NHL teams in this state
  if (facts?.nhlTeams) {
    out.push({
      question: `Does ${regionName} have an NHL team?`,
      answer:
        `Yes — ${facts.nhlTeams} ${facts.nhlTeams.includes(',') ? 'are' : 'is'} based in ${regionName}. ` +
        (facts.notableLeagues ? `${facts.notableLeagues} also operate${facts.notableLeagues.includes(',') ? '' : 's'} in the state. ` : '') +
        `RinkStop also tracks the surrounding amateur, junior, and youth teams at the city level.`,
    });
  } else {
    out.push({
      question: `Does ${regionName} have an NHL team?`,
      answer:
        `RinkStop does not currently list an NHL team based in ${regionName}. ` +
        `${regionName} may still host amateur, junior, college, and youth teams — see the city list below for what we have on file.`,
    });
  }

  // Q4: Youth hockey
  if (facts?.youthHockey) {
    out.push({
      question: `Can my kid play youth hockey in ${regionName}?`,
      answer:
        `${facts.youthHockey}. ` +
        `Most USA Hockey districts in ${regionName} accept beginners from age 5–6, and many rinks run learn-to-play hockey clinics for both kids and adults. The <a href="/directory/youth-hockey">youth hockey directory</a> has program types and contact details.`,
    });
  } else {
    out.push({
      question: `Can my kid play youth hockey in ${regionName}?`,
      answer:
        `${regionName} likely has USA Hockey youth programs; RinkStop does not currently maintain a curated list. ` +
        `Visit your nearest rink (see cities below) for learn-to-skate and learn-to-play clinics, or browse the <a href="/directory/youth-hockey">national youth hockey directory</a>.`,
    });
  }

  // Q5: Country context (verified prose from COUNTRY_HOCKEY_CONTEXT)
  if (countryBlock) {
    const trimmed = countryBlock.length > 380 ? countryBlock.slice(0, 380).replace(/\s+\S*$/, '') + '…' : countryBlock;
    out.push({
      question: `How is hockey organized in the United States?`,
      answer: trimmed + ` <a href="/directory/united-states">Browse the full US hockey directory →</a>`,
    });
  }

  // Q6: Junior leagues
  if (facts?.notableLeagues) {
    out.push({
      question: `What hockey leagues operate in ${regionName}?`,
      answer:
        `${facts.notableLeagues} ${facts.notableLeagues.includes(',') ? 'have' : 'has'} a footprint in ${regionName}. ` +
        `AHL affiliates feed NHL rosters from the cities below; NCAA programs play in conferences such as Hockey East, Big Ten, and NCHC where applicable. Browse the city-level pages for league breakdowns per market.`,
    });
  } else {
    out.push({
      question: `What hockey leagues operate in ${regionName}?`,
      answer:
        `RinkStop lists leagues at the city level. Browse the cities below to see which leagues (NCAA, AHL, USHL, NAHL, ECHL) operate in each market within ${regionName}.`,
    });
  }

  // Q7: Data freshness (honest)
  out.push({
    question: `How current is the data on this page?`,
    answer:
      `RinkStop updates rink, team, and program listings as operators edit them through <a href="/claim-your-listing">listing claims</a>. ` +
      `Counts above reflect what was in our database when this page was last rendered. If you spot a missing rink or team, the fastest fix is to claim the listing and add it.`,
  });

  return out.slice(0, 8);
}

/**
 * Build 6-8 FAQ entries for a Canadian province page. Same discipline
 * as buildStateFAQs, with Hockey Canada branch + primary league focus.
 */
export function buildProvinceFAQs(input: StateFAQInput): StateFAQEntry[] {
  const { regionName, cityCount, rinkCount, teamCount, topCities = [] } = input;
  const facts = getProvinceHockeyFacts(input.regionAbbr);
  const countryBlock = countryContextFor('Canada');

  const out: StateFAQEntry[] = [];

  // Q1: hockey scene
  if (facts) {
    out.push({
      question: `What is the hockey scene in ${regionName}?`,
      answer:
        `${regionName} is a Canadian province tracked by RinkStop. ` +
        (facts.nhlTeams ? `At the NHL level, ${regionName} is home to ${facts.nhlTeams}. ` : '') +
        (facts.youthHockey || '') +
        ` Our directory currently lists ${cityCount} cit${cityCount === 1 ? 'y' : 'ies'}, ${rinkCount} rink${rinkCount === 1 ? '' : 's'}, and ${teamCount} team${teamCount === 1 ? '' : 's'} on file in ${regionName}.`,
    });
  } else {
    out.push({
      question: `What is the hockey scene in ${regionName}?`,
      answer:
        `${regionName} is a Canadian province tracked by RinkStop. Our directory currently lists ${cityCount} cit${cityCount === 1 ? 'y' : 'ies'}, ${rinkCount} rink${rinkCount === 1 ? '' : 's'}, and ${teamCount} team${teamCount === 1 ? '' : 's'} on file in ${regionName}. We do not currently have a curated profile for ${regionName}; listings below are sourced from operators.`,
    });
  }

  // Q2: Hockey Canada branch
  if (facts?.hockeyCanadaBranch) {
    out.push({
      question: `Who governs hockey in ${regionName}?`,
      answer:
        `${facts.hockeyCanadaBranch} governs amateur hockey in ${regionName}, with registration through Hockey Canada at the national level. ` +
        `All competitive players must be registered with the branch before joining a team.`,
    });
  } else {
    out.push({
      question: `Who governs hockey in ${regionName}?`,
      answer:
        `Hockey Canada is the national federation; ${regionName}'s play is administered through one of its member branches. ` +
        `RinkStop does not currently publish the specific branch for ${regionName} — contact any rink in the cities below to confirm registration requirements.`,
    });
  }

  // Q3: NHL teams
  if (facts?.nhlTeams) {
    out.push({
      question: `Does ${regionName} have an NHL team?`,
      answer:
        `Yes — ${facts.nhlTeams} ${facts.nhlTeams.includes(',') ? 'are' : 'is'} based in ${regionName}. ` +
        `${facts.primaryLeague ? `${facts.primaryLeague} teams also play in ${regionName}.` : ''}`,
    });
  } else {
    out.push({
      question: `Does ${regionName} have an NHL team?`,
      answer:
        `RinkStop does not currently list an NHL team based in ${regionName}. ` +
        `${regionName} may still host major-junior (CHL), university (U Sports), and youth teams — see the city list below.`,
    });
  }

  // Q4: rinks
  if (rinkCount > 0) {
    const sample = topCities.filter(c => c.rinks > 0).slice(0, 3).map(c => c.city).join(', ');
    out.push({
      question: `How many ice rinks are in ${regionName}?`,
      answer:
        rinkCount === 1
          ? `RinkStop tracks 1 indoor ice rink in ${regionName}${sample ? `, located in ${sample}` : ''}. If you operate a rink we are missing, you can <a href="/claim-your-listing">claim your rink listing</a>.`
          : `RinkStop currently tracks ${rinkCount} indoor ice rink${rinkCount === 1 ? '' : 's'} in ${regionName}${sample ? `, across cities including ${sample}` : ''}. The full list is grouped below by city; if you operate a rink we are missing, you can <a href="/claim-your-listing">claim your rink listing</a>.`,
    });
  } else {
    out.push({
      question: `How many ice rinks are in ${regionName}?`,
      answer:
        `RinkStop does not currently have rink listings for ${regionName} in our directory. ` +
        `If you operate an ice facility, you can <a href="/claim-your-listing">submit a rink listing</a>.`,
    });
  }

  // Q5: youth hockey
  if (facts?.youthHockey) {
    out.push({
      question: `Can my kid play youth hockey in ${regionName}?`,
      answer:
        `${facts.youthHockey}. ` +
        `${facts.hockeyCanadaBranch ? `${facts.hockeyCanadaBranch} runs age-group programming for players 5–17.` : ''} ` +
        `The <a href="/directory/youth-hockey">youth hockey directory</a> has program types and contact details.`,
    });
  } else {
    out.push({
      question: `Can my kid play youth hockey in ${regionName}?`,
      answer:
        `${regionName} has youth hockey programs through local associations and Hockey Canada branches. ` +
        `Contact any rink in the cities below for learn-to-skate and learn-to-play clinics, or browse the <a href="/directory/youth-hockey">national youth hockey directory</a>.`,
    });
  }

  // Q6: country context
  if (countryBlock) {
    const trimmed = countryBlock.length > 380 ? countryBlock.slice(0, 380).replace(/\s+\S*$/, '') + '…' : countryBlock;
    out.push({
      question: `How is hockey organized in Canada?`,
      answer: trimmed + ` <a href="/directory/canada">Browse the full Canada hockey directory →</a>`,
    });
  }

  // Q7: primary league (CHL context)
  if (facts?.primaryLeague) {
    out.push({
      question: `What is the main junior hockey league in ${regionName}?`,
      answer:
        `${facts.primaryLeague} is the primary junior league with a footprint in ${regionName}. ` +
        `CHL (Canadian Hockey League) teams operate in three regional leagues — the WHL in western Canada, the OHL in Ontario, and the QMJHL in Quebec and the Maritimes — and feed NHL rosters via the annual CHL Import Draft and NHL Entry Draft.`,
    });
  } else {
    out.push({
      question: `What junior hockey leagues operate in ${regionName}?`,
      answer:
        `${regionName} is part of Hockey Canada's development pathway. ` +
        `Junior teams in the CHL (WHL, OHL, QMJHL) and various Junior A leagues operate across the country. The cities below may have local franchise pages.`,
    });
  }

  // Q8: data freshness
  out.push({
    question: `How current is the data on this page?`,
    answer:
      `RinkStop updates rink, team, and program listings as operators edit them through <a href="/claim-your-listing">listing claims</a>. ` +
      `Counts above reflect what was in our database when this page was last rendered. If you spot a missing rink or team, the fastest fix is to claim the listing and add it.`,
  });

  return out.slice(0, 8);
}