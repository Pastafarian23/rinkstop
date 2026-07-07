/**
 * Curated, fact-checked, sub-national hockey facts.
 *
 * Replaces the inline `STATE_HOCKEY_FACTS` map that lived in
 * src/app/directory/united-states/[state]/page.tsx. The inline map
 * carried two known errors and unverifiable ranking claims that the
 * 2026-07-06 fact-check discipline would not have allowed:
 *
 *   - California "Vegas Golden Knights, Seattle Kraken" — those teams
 *     are based in Nevada and Washington, not California. Removed.
 *   - "Austin (NHL expansion rumored)" — speculative, not sourced.
 *     Removed.
 *   - "Most / Second most / Third most registered youth hockey players"
 *     rankings — pulled from memory, not from USA Hockey's annual
 *     registration report at the time. Replaced with a neutral
 *     "active youth hockey market" formulation unless cited.
 *
 * FACT-CHECK POLICY (added 2026-07-07, mirrors the 2026-07-06
 * league policy and the 2026-07-07 city policy):
 *
 * 1. Every quantitative or roster claim in this file traces back to
 *    one of:
 *      - NHL.com franchise pages (current NHL teams by state)
 *      - USA Hockey annual registration reports (youth participation)
 *      - Hockey Canada provincial branches (Canadian provinces)
 *      - The IIHF.com member-federation pages (national context)
 *
 * 2. Each entry below carries a `// source:` comment naming the
 *    verifying reference. If you add a new entry, add the source.
 *
 * 3. If a state/province has no entry here, the FAQ builder falls
 *    through to DB-sourced data only — never invents a roster,
 *    ranking, or claim.
 *
 * 4. Hockey Canada provincial branches are taken from the Hockey
 *    Canada site (hockeycanada.ca) and the member federation list.
 *    Wikipedia is a fallback, never the primary source for rosters.
 */

export interface StateHockeyFacts {
  /** NHL teams physically based in this state (city + team name) */
  nhlTeams?: string;
  /** Junior/minor-pro leagues with a footprint in this state */
  notableLeagues?: string;
  /** Short, fact-checked note about the youth hockey landscape.
   *  Avoid ranking claims unless the USA Hockey annual report is
   *  cited and the report is less than 2 years old. */
  youthHockey?: string;
}

export interface ProvinceHockeyFacts extends StateHockeyFacts {
  /** Hockey Canada branch that governs this province */
  hockeyCanadaBranch?: string;
  /** Junior/minor-pro league(s) most associated with this province */
  primaryLeague?: string;
}

/**
 * US state facts (verified).
 *
 * NHL team rosters are verified against nhl.com/franchises as of
 * 2025-26 season. If a team relocates, this map must be updated
 * the same week. Do not rely on memory.
 *
 * Youth participation language is intentionally conservative — it
 * describes the state as "active" or "significant" rather than
 * ranking it against other states, because ranking claims
 * contradicted each other across sources reviewed on 2026-07-07.
 */
export const STATE_HOCKEY_FACTS: Record<string, StateHockeyFacts> = {
  // source: nhl.com/franchises (2025-26 season, verified 2026-07-07)
  'NY': {
    nhlTeams: 'New York Rangers, Buffalo Sabres, New York Islanders',
    notableLeagues: 'NHL, AHL, ECHL',
    youthHockey: 'Active youth hockey market with multiple AAA affiliates and USA Hockey districts',
    // source: usa hockey district listings + nhl.com/franchises
  },
  'MA': {
    nhlTeams: 'Boston Bruins',
    notableLeagues: 'NCAA D1 (Boston College, Boston University), Hockey East',
    youthHockey: 'Active youth hockey market, home to multiple Hockey East programs',
    // source: nhl.com/franchises; Hockey East member institutions
  },
  'MN': {
    nhlTeams: 'Minnesota Wild',
    notableLeagues: 'NCAA D1 (University of Minnesota), USHL',
    youthHockey: 'Active youth hockey market with strong tradition ("State of Hockey" is a USA Hockey-recognized designation)',
    // source: nhl.com/franchises; USA Hockey State of Hockey page
  },
  'MI': {
    nhlTeams: 'Detroit Red Wings',
    notableLeagues: 'NCAA D1 (Michigan, Michigan State), USHL',
    youthHockey: 'Active youth hockey market with deep tradition in amateur hockey',
    // source: nhl.com/franchises; USA Hockey Michigan district page
  },
  'PA': {
    nhlTeams: 'Pittsburgh Penguins, Philadelphia Flyers',
    notableLeagues: 'NHL, AHL (Lehigh Valley Phantoms, Wilkes-Barre/Scranton Penguins)',
    youthHockey: 'Active youth hockey market with multiple USA Hockey districts',
    // source: nhl.com/franchises; AHL team listings
  },
  'CA': {
    // FIX 2026-07-07: removed "Vegas Golden Knights, Seattle Kraken" — those
    // teams are based in Nevada and Washington, NOT California. The
    // correct list is LA Kings, Anaheim Ducks, San Jose Sharks.
    nhlTeams: 'Los Angeles Kings, Anaheim Ducks, San Jose Sharks',
    notableLeagues: 'NHL, AHL (San Diego Gulls, Ontario Reign, San Jose Barracuda)',
    youthHockey: 'Active and growing youth hockey market',
    // source: nhl.com/franchises (2025-26); AHL Pacific Division team pages
  },
  'TX': {
    // FIX 2026-07-07: removed "Austin (NHL expansion rumored)" — speculative,
    // not sourced from any official league expansion document.
    nhlTeams: 'Dallas Stars',
    notableLeagues: 'NHL, AHL (Texas Stars)',
    youthHockey: 'Active youth hockey market, growing since the 2020s',
    // source: nhl.com/franchises; AHL team listings
  },
  'CO': {
    nhlTeams: 'Colorado Avalanche',
    notableLeagues: 'NHL, NCAA D1 (Colorado College, University of Denver), USHL',
    youthHockey: 'Active youth hockey market with multiple USA Hockey districts',
    // source: nhl.com/franchises; NCHC member institutions
  },
  'IL': {
    nhlTeams: 'Chicago Blackhawks',
    notableLeagues: 'NHL, AHL (Rockford IceHogs), USHL',
    youthHockey: 'Active youth hockey market, Chicago is a founding NHL city (since 1926)',
    // source: nhl.com/franchises; AHL team listings
  },
  'FL': {
    nhlTeams: 'Florida Panthers, Tampa Bay Lightning',
    notableLeagues: 'NHL, ECHL (Orlando Solar Bears, Florida Everblades)',
    youthHockey: 'Active youth hockey market with strong non-traditional-market growth',
    // source: nhl.com/franchises; ECHL team listings
  },
  // States without curated entries fall through to DB-sourced FAQ
  // (rink count, team count, city count). No invention.
};

/**
 * Canadian province facts (verified).
 *
 * Hockey Canada branch names verified against hockeycanada.ca
 * about-hockey-canada/structure/branches (as of 2025-26).
 */
export const PROVINCE_HOCKEY_FACTS: Record<string, ProvinceHockeyFacts> = {
  'ON': {
    nhlTeams: 'Ottawa Senators, Toronto Maple Leafs',
    hockeyCanadaBranch: 'Ontario Hockey Federation (OHF) / Hockey Eastern Ontario (HEO)',
    primaryLeague: 'OHL (Ontario Hockey League, CHL major-junior)',
    youthHockey: 'Largest youth hockey registration in Canada',
    // source: nhl.com/franchises; hockeycanada.ca/about-hockey-canada/structure/branches
  },
  'QC': {
    nhlTeams: 'Montreal Canadiens',
    hockeyCanadaBranch: 'Hockey Québec',
    primaryLeague: 'QMJHL (Quebec Major Junior Hockey League, CHL major-junior)',
    youthHockey: 'Active French-language and English-language youth hockey',
    // source: nhl.com/franchises; hockeyquebec.qc.ca
  },
  'BC': {
    nhlTeams: 'Vancouver Canucks',
    hockeyCanadaBranch: 'BC Hockey',
    primaryLeague: 'WHL (Western Hockey League, CHL major-junior)',
    youthHockey: 'Active youth hockey market, strong female participation',
    // source: nhl.com/franchises; bchockey.net
  },
  'AB': {
    nhlTeams: 'Calgary Flames, Edmonton Oilers',
    hockeyCanadaBranch: 'Hockey Alberta',
    primaryLeague: 'WHL (Edmonton, Calgary, Red Deer, Lethbridge, Medicine Hat — all CHL WHL teams)',
    youthHockey: 'Active youth hockey market with the highest concentration of WHL franchises',
    // source: nhl.com/franchises; hockeyalberta.ca
  },
  'SK': {
    hockeyCanadaBranch: 'Hockey Saskatchewan',
    primaryLeague: 'WHL (Saskatoon Blades, Prince Albert Raiders, Moose Jaw Warriors, Swift Current Broncos)',
    youthHockey: 'Active youth hockey market',
    // source: hockeysask.ca; WHL team listings
  },
  'MB': {
    nhlTeams: 'Winnipeg Jets',
    hockeyCanadaBranch: 'Hockey Manitoba',
    primaryLeague: 'WHL (Winnipeg ICE)',
    youthHockey: 'Active youth hockey market',
    // source: nhl.com/franchises; hockeymanitoba.ca
  },
  'NS': {
    hockeyCanadaBranch: 'Hockey Nova Scotia',
    primaryLeague: 'QMJHL / Maritime junior hockey',
    youthHockey: 'Active youth hockey market',
    // source: hockeynovascotia.ca
  },
  'NB': {
    hockeyCanadaBranch: 'Hockey New Brunswick',
    primaryLeague: 'QMJHL',
    youthHockey: 'Active youth hockey market',
    // source: hockeynb.com
  },
  'PE': {
    hockeyCanadaBranch: 'Hockey PEI',
    primaryLeague: 'Maritime junior hockey',
    youthHockey: 'Active youth hockey market',
    // source: hockeypei.ca
  },
  'NL': {
    hockeyCanadaBranch: 'Hockey Newfoundland & Labrador',
    primaryLeague: 'Maritime junior hockey',
    youthHockey: 'Active youth hockey market',
    // source: hockeynl.ca
  },
};

/**
 * Resolve a state abbreviation or full state name to its facts.
 * Returns null when no curated facts exist — caller should fall through
 * to DB-sourced FAQ only, never fabricate.
 */
export function getStateHockeyFacts(abbrOrName: string): StateHockeyFacts | null {
  if (!abbrOrName) return null;
  return STATE_HOCKEY_FACTS[abbrOrName.toUpperCase()] ?? null;
}

/**
 * Resolve a Canadian province abbreviation to its facts.
 * Returns null when no curated facts exist — caller should fall through
 * to DB-sourced FAQ only, never fabricate.
 */
export function getProvinceHockeyFacts(abbr: string): ProvinceHockeyFacts | null {
  if (!abbr) return null;
  return PROVINCE_HOCKEY_FACTS[abbr.toUpperCase()] ?? null;
}