// NHL franchise history — relocations, renames, and the chains of identity that
// connect predecessor teams to their current incarnations.
//
// Structure:
//   Each chain has a `current` slug (the team that exists today in the NHL).
//   The `chain` array walks from the OLDEST historical incarnation to the current
//   team. Entries include years the entry was active, the city it played in,
//   and a stable slug for the historical page.
//
// Why this exists:
//   When a fan searches for a team that no longer exists under that name
//   (e.g. "Hartford Whalers", "Quebec Nordiques"), they need to land on a page
//   that explains what the team became and link them to the current franchise.
//   The team detail page (e.g. /directory/teams/carolina-hurricanes) shows the
//   chain inline. The dedicated history page (/directory/nhl/history) lists
//   every chain with full context.

export type FranchiseEntry = {
  /** Stable slug used for the historical page URL. */
  slug: string;
  /** The team name as it was known during this era. */
  name: string;
  /** Years the team was active under this name (inclusive). */
  years: string;
  /** City the team played in during this era. */
  city: string;
  /** ISO date this era started (YYYY-MM-DD) — for date-keyed game lookup. */
  startDate?: string;
  /** ISO date this era ended (YYYY-MM-DD) — exclusive for the next entry's start. */
  endDate?: string;
  /** Optional notes (e.g. WHA vs NHL, brief stint, color/identity change). */
  notes?: string;
};

export type FranchiseChain = {
  /** Slug of the CURRENT NHL team that the chain ultimately becomes. */
  current: string;
  /** Display name of the current team. */
  currentName: string;
  /** Brief description of the franchise's overall identity. */
  blurb: string;
  /** All incarnations, ordered oldest → newest. The LAST entry is the current team. */
  chain: FranchiseEntry[];
};

export const NHL_FRANCHISE_HISTORY: FranchiseChain[] = [
  {
    current: 'utah-mammoth',
    currentName: 'Utah Mammoth',
    blurb:
      'The youngest NHL franchise. Relocated from Arizona in 2024, originally branded as the Utah Hockey Club. The "Mammoth" identity was adopted in 2025-26. The franchise is the direct successor of the original Winnipeg Jets (1972-1996).',
    chain: [
      { slug: 'winnipeg-jets-original', name: 'Winnipeg Jets', years: '1972–1996', city: 'Winnipeg', startDate: '1972-01-01', endDate: '1996-07-01', notes: 'Original WHA (1972) and NHL (1979) franchise. Relocated to Phoenix in 1996.' },
      { slug: 'phoenix-coyotes', name: 'Phoenix Coyotes', years: '1996–2014', city: 'Phoenix', startDate: '1996-07-01', endDate: '2014-06-27', notes: 'Relocated from Winnipeg. Retained Winnipeg-era Jets history.' },
      { slug: 'arizona-coyotes', name: 'Arizona Coyotes', years: '2014–2024', city: 'Glendale / Tempe', startDate: '2014-06-27', endDate: '2024-04-13', notes: 'Renamed from Phoenix to Arizona in 2014. Played at multiple Valley venues.' },
      { slug: 'utah-hockey-club', name: 'Utah Hockey Club', years: '2024–2025', city: 'Salt Lake City', startDate: '2024-04-13', endDate: '2025-09-01', notes: 'Relocated from Arizona. "Mammoth" branding identity adopted 2025-26.' },
      { slug: 'utah-mammoth', name: 'Utah Mammoth', years: '2025–present', city: 'Salt Lake City', startDate: '2025-09-01', notes: 'Permanent name adopted for the 2025-26 season. Direct successor of the Utah Hockey Club.' },
    ],
  },
  {
    current: 'carolina-hurricanes',
    currentName: 'Carolina Hurricanes',
    blurb:
      'Relocated from Hartford, Connecticut in 1997. The Whalers identity lives on in Hartford\'s branding; the franchise brought its full history (including WHA years) to North Carolina.',
    chain: [
      { slug: 'new-england-whalers', name: 'New England Whalers', years: '1972–1979', city: 'Boston / Hartford', startDate: '1972-01-01', endDate: '1979-01-01', notes: 'WHA franchise. Moved to Hartford full-time in 1974.' },
      { slug: 'hartford-whalers', name: 'Hartford Whalers', years: '1979–1997', city: 'Hartford, CT', startDate: '1979-01-01', endDate: '1997-06-25', notes: 'Joined NHL in 1979 merger. Relocated to Carolina in 1997.' },
      { slug: 'carolina-hurricanes', name: 'Carolina Hurricanes', years: '1997–present', city: 'Raleigh, NC', startDate: '1997-06-25', notes: 'Stanley Cup champions in 2006.' },
    ],
  },
  {
    current: 'colorado-avalanche',
    currentName: 'Colorado Avalanche',
    blurb:
      'Relocated from Quebec City in 1995. Won the Stanley Cup the very next season (1996). The franchise retains all Quebec Nordiques history.',
    chain: [
      { slug: 'quebec-nordiques-wha', name: 'Quebec Nordiques', years: '1972–1979', city: 'Quebec City', startDate: '1972-01-01', endDate: '1979-01-01', notes: 'WHA franchise.' },
      { slug: 'quebec-nordiques', name: 'Quebec Nordiques', years: '1979–1995', city: 'Quebec City', startDate: '1979-01-01', endDate: '1995-07-01', notes: 'Joined NHL in 1979 merger. Relocated to Denver in 1995.' },
      { slug: 'colorado-avalanche', name: 'Colorado Avalanche', years: '1995–present', city: 'Denver, CO', startDate: '1995-07-01', notes: 'Stanley Cup champions in 1996 and 2001.' },
    ],
  },
  {
    current: 'dallas-stars',
    currentName: 'Dallas Stars',
    blurb:
      'Relocated from Bloomington, Minnesota in 1993. The franchise brought 26 years of North Stars history with it, including two Presidents\' Trophies.',
    chain: [
      { slug: 'minnesota-north-stars', name: 'Minnesota North Stars', years: '1967–1993', city: 'Bloomington, MN', startDate: '1967-01-01', endDate: '1993-06-20', notes: 'Original 1967 expansion team. Relocated to Dallas in 1993.' },
      { slug: 'dallas-stars', name: 'Dallas Stars', years: '1993–present', city: 'Dallas, TX', startDate: '1993-06-20', notes: 'Stanley Cup champions in 1999.' },
    ],
  },
  {
    current: 'winnipeg-jets',
    currentName: 'Winnipeg Jets (current)',
    blurb:
      'Not the relocated Jets from 1996 — the current Winnipeg Jets are the former Atlanta Thrashers, who moved to Manitoba in 2011.',
    chain: [
      { slug: 'atlanta-thrashers', name: 'Atlanta Thrashers', years: '1999–2011', city: 'Duluth / Atlanta, GA', startDate: '1999-01-01', endDate: '2011-06-21', notes: '1999 expansion team. Relocated to Winnipeg in 2011.' },
      { slug: 'winnipeg-jets', name: 'Winnipeg Jets', years: '2011–present', city: 'Winnipeg, MB', startDate: '2011-06-21', notes: 'Adopted the Jets name to honor the original WHA/NHL Jets (1972-1996).' },
    ],
  },
  {
    current: 'calgary-flames',
    currentName: 'Calgary Flames',
    blurb:
      'Relocated from Atlanta in 1980. The Flames brought their full history — and the 1989 Stanley Cup — to Calgary.',
    chain: [
      { slug: 'atlanta-flames', name: 'Atlanta Flames', years: '1972–1980', city: 'Atlanta, GA', startDate: '1972-01-01', endDate: '1980-05-21', notes: 'Original 1972 expansion team. Relocated to Calgary in 1980.' },
      { slug: 'calgary-flames', name: 'Calgary Flames', years: '1980–present', city: 'Calgary, AB', startDate: '1980-05-21', notes: 'Stanley Cup champions in 1989.' },
    ],
  },
  {
    current: 'new-jersey-devils',
    currentName: 'New Jersey Devils',
    blurb:
      'Two relocations in eight years: Kansas City to Colorado (1976) to New Jersey (1982). The franchise traces its history all the way back to 1974.',
    chain: [
      { slug: 'kansas-city-scouts', name: 'Kansas City Scouts', years: '1974–1976', city: 'Kansas City, MO', startDate: '1974-01-01', endDate: '1976-07-15', notes: 'Original 1974 expansion team. Relocated to Colorado in 1976.' },
      { slug: 'colorado-rockies', name: 'Colorado Rockies', years: '1976–1982', city: 'Denver, CO', startDate: '1976-07-15', endDate: '1982-04-30', notes: 'Relocated from Kansas City. Relocated to New Jersey in 1982.' },
      { slug: 'new-jersey-devils', name: 'New Jersey Devils', years: '1982–present', city: 'Newark, NJ', startDate: '1982-04-30', notes: 'Stanley Cup champions in 1995, 2000, 2003.' },
    ],
  },

  // ============================================================================
  // Standalone chains for defunct NHL teams (pre-1967 Original Six era and
  // other historical teams that have no modern successor). These exist so
  // every team has its own page with exact historical name and dates.
  // ============================================================================

  {
    current: 'brooklyn-americans',
    currentName: 'Brooklyn Americans',
    blurb:
      'Formerly the New York Americans (1925-1941), the Brooklyn Americans were the third NHL team in New York City. Folded after the 1941-42 season due to wartime travel restrictions and financial pressure.',
    chain: [
      { slug: 'brooklyn-americans', name: 'Brooklyn Americans', years: '1925–1942', city: 'New York / Brooklyn, NY', startDate: '1925-12-21', endDate: '1942-06-15', notes: 'Played as New York Americans 1925-1941, renamed Brooklyn Americans 1941-42. Folded after the 1941-42 season.' },
    ],
  },
  {
    current: 'anaheim-ducks',
    currentName: 'Anaheim Ducks',
    blurb:
      'Founded as the Mighty Ducks of Anaheim in 1993 by The Walt Disney Company, the franchise dropped the "Mighty" prefix in 2006 and has been the Anaheim Ducks ever since. Stanley Cup champions in 2007.',
    chain: [
      { slug: 'mighty-ducks-of-anaheim', name: 'Mighty Ducks of Anaheim', years: '1993–2006', city: 'Anaheim, CA', startDate: '1993-10-08', endDate: '2006-06-22', notes: 'Founded by The Walt Disney Company. Renamed Anaheim Ducks in 2006.' },
      { slug: 'anaheim-ducks', name: 'Anaheim Ducks', years: '2006–present', city: 'Anaheim, CA', startDate: '2006-06-22', notes: 'Renamed from the Mighty Ducks of Anaheim. Stanley Cup champions in 2007.' },
    ],
  },
  {
    current: 'california-golden-seals',
    currentName: 'Minnesota North Stars (via California → Cleveland)',
    blurb:
      'The California Golden Seals began as an NHL expansion team in 1967, moved to Oakland, then Cleveland, and were eventually absorbed into the Minnesota North Stars in 1978 — a chain that eventually became the Dallas Stars.',
    chain: [
      { slug: 'california-golden-seals', name: 'California Golden Seals', years: '1967–1976', city: 'Oakland, CA', startDate: '1967-10-11', endDate: '1976-09-15', notes: 'Originally California Seals (1967), renamed Golden Seals (1970), renamed again California Golden Seals (1974). Relocated to Cleveland as the Cleveland Barons in 1976.' },
    ],
  },
  {
    current: 'cleveland-barons',
    currentName: 'Minnesota North Stars (via Cleveland)',
    blurb:
      'The Cleveland Barons were the relocated California Golden Seals (1976-1978). When the Barons folded, their players and franchise rights were absorbed by the Minnesota North Stars. This is the same chain as the Golden Seals — we keep a separate entry here for direct lookups by the Cleveland slug.',
    chain: [
      { slug: 'cleveland-barons', name: 'Cleveland Barons', years: '1976–1978', city: 'Cleveland, OH', startDate: '1976-09-15', endDate: '1978-06-15', notes: 'Relocated from Oakland (formerly the California Golden Seals). Absorbed by the Minnesota North Stars in 1978.' },
    ],
  },
  {
    current: 'detroit-cougars',
    currentName: 'Detroit Falcons',
    blurb:
      'The Detroit Cougars (1926-1930) were the renamed Detroit Falcons predecessor. The franchise was sold in 1930 and renamed the Detroit Falcons. Both eras share the same franchise history; they are the same team, renamed twice before the final Detroit Red Wings identity in 1933.',
    chain: [
      { slug: 'detroit-cougars', name: 'Detroit Cougars', years: '1926–1930', city: 'Detroit, MI', startDate: '1926-11-18', endDate: '1930-05-08', notes: 'Founded in 1926 as the Detroit Cougars. Renamed Detroit Falcons in 1930.' },
    ],
  },
  {
    current: 'detroit-falcons',
    currentName: 'Detroit Red Wings (via Falcons)',
    blurb:
      'The Detroit Falcons (1930-1932) were the renamed Detroit Cougars, and the final iteration of the franchise before it became the Detroit Red Wings in 1933. Owner James E. Norris renamed the team the Red Wings in 1933, ending the Falcons era.',
    chain: [
      { slug: 'detroit-falcons', name: 'Detroit Falcons', years: '1930–1932', city: 'Detroit, MI', startDate: '1930-05-08', endDate: '1932-11-01', notes: 'Renamed from the Detroit Cougars. Renamed Detroit Red Wings in 1932 (effective 1933 season).' },
    ],
  },
  {
    current: 'hamilton-tigers',
    currentName: 'Hamilton Tigers',
    blurb:
      'The Hamilton Tigers were an NHL team from 1920 to 1925. The club folded after the 1924-25 season following the death of its founder and a player strike over unpaid wages.',
    chain: [
      { slug: 'hamilton-tigers', name: 'Hamilton Tigers', years: '1920–1925', city: 'Hamilton, ON', startDate: '1920-12-22', endDate: '1925-08-26', notes: 'Folded after the 1924-25 season. Franchise was not revived.' },
    ],
  },
  {
    current: 'montreal-maroons',
    currentName: 'Montreal Maroons',
    blurb:
      'The Montreal Maroons were an NHL team from 1924 to 1938, and Stanley Cup champions in 1926 and 1935. They folded due to financial difficulty after the 1937-38 season, with the Great Depression eroding the fan base that supported the rival Montreal Canadiens.',
    chain: [
      { slug: 'montreal-maroons', name: 'Montreal Maroons', years: '1924–1938', city: 'Montreal, QC', startDate: '1924-11-29', endDate: '1938-06-21', notes: 'Stanley Cup champions in 1926 and 1935. Folded after the 1937-38 season.' },
    ],
  },
  {
    current: 'montreal-wanderers',
    currentName: 'Montreal Wanderers',
    blurb:
      'The Montreal Wanderers were one of the NHL’s founding teams in 1917. The Westmount Arena, their home rink, burned down on January 2, 1918 after a heating system failure. The team won a game later that night as "homeless" Wanderers and then folded, never to return.',
    chain: [
      { slug: 'montreal-wanderers', name: 'Montreal Wanderers', years: '1917–1918', city: 'Montreal, QC', startDate: '1917-12-19', endDate: '1918-01-02', notes: 'Founding NHL team. Lost their home arena to fire on January 2, 1918; folded the same night despite winning their final game.' },
    ],
  },
  {
    current: 'new-york-americans',
    currentName: 'New York Americans',
    blurb:
      'The New York Americans played in the NHL from 1925 to 1941, when they were renamed the Brooklyn Americans. See the Brooklyn Americans entry for the franchise’s final 1941-42 season.',
    chain: [
      { slug: 'new-york-americans', name: 'New York Americans', years: '1925–1941', city: 'New York, NY', startDate: '1925-12-21', endDate: '1941-10-24', notes: 'Played at Madison Square Garden. Renamed Brooklyn Americans in 1941; see the Brooklyn Americans entry for the final 1941-42 season.' },
    ],
  },
  {
    current: 'ottawa-senators-original',
    currentName: 'Ottawa Senators (original)',
    blurb:
      'The original Ottawa Senators franchise played in the NHL from 1917 to 1954 and was one of the league’s founding teams. They won four Stanley Cups (1920, 1921, 1923, 1927) before folding. The modern Ottawa Senators are a separate 1992 expansion team that has no franchise-lineage connection to the original.',
    chain: [
      { slug: 'ottawa-senators-original', name: 'Ottawa Senators', years: '1917–1954', city: 'Ottawa, ON', startDate: '1917-12-19', endDate: '1954-06-09', notes: 'Founding NHL team. Four Stanley Cups (1920, 1921, 1923, 1927). Folded after the 1953-54 season. Modern Senators (1992) are a separate franchise.' },
    ],
  },
  {
    current: 'philadelphia-quakers',
    currentName: 'Philadelphia Quakers (← Pittsburgh Pirates)',
    blurb:
      'The Philadelphia Quakers (1930-1931) were the relocated Pittsburgh Pirates. After one season in Philadelphia, the team folded due to the Great Depression and low attendance.',
    chain: [
      { slug: 'philadelphia-quakers', name: 'Philadelphia Quakers', years: '1930–1931', city: 'Philadelphia, PA', startDate: '1930-10-11', endDate: '1931-04-12', notes: 'Relocated from Pittsburgh (formerly the Pittsburgh Pirates). Folded after the 1930-31 season.' },
    ],
  },
  {
    current: 'philadelphia-quakers',
    currentName: 'Philadelphia Quakers (← Pittsburgh Pirates)',
    blurb:
      'The Philadelphia Quakers (1930-1931) were the relocated Pittsburgh Pirates. After one season in Philadelphia, the team folded due to the Great Depression and low attendance.',
    chain: [
      { slug: 'pittsburgh-pirates', name: 'Pittsburgh Pirates', years: '1925–1930', city: 'Pittsburgh, PA', startDate: '1925-11-24', endDate: '1930-10-11', notes: 'Renamed and relocated to Philadelphia as the Philadelphia Quakers in 1930.' },
      { slug: 'philadelphia-quakers', name: 'Philadelphia Quakers', years: '1930–1931', city: 'Philadelphia, PA', startDate: '1930-10-11', endDate: '1931-04-12', notes: 'Relocated from Pittsburgh. Folded after the 1930-31 season.' },
    ],
  },
  {
    current: 'quebec-bulldogs',
    currentName: 'Quebec Bulldogs',
    blurb:
      'The Quebec Bulldogs were an NHL team from 1919 to 1920, formerly the Quebec Bulldogs of the National Hockey Association. The team suspended operations after the 1919-20 season, with its franchise rights eventually transferred to Hamilton (as the Hamilton Tigers).',
    chain: [
      { slug: 'quebec-bulldogs', name: 'Quebec Bulldogs', years: '1919–1920', city: 'Quebec City, QC', startDate: '1919-12-23', endDate: '1920-06-12', notes: 'Joined the NHL from the NHA in 1919. Suspended operations after the 1919-20 season.' },
    ],
  },
  {
    current: 'st-louis-eagles',
    currentName: 'St. Louis Eagles',
    blurb:
      'The St. Louis Eagles were the relocated Ottawa Senators (original), who moved to St. Louis for the 1934-35 season. They folded mid-season due to financial trouble, becoming the first NHL team to fold mid-season since the Montreal Wanderers in 1918.',
    chain: [
      { slug: 'st-louis-eagles', name: 'St. Louis Eagles', years: '1934–1935', city: 'St. Louis, MO', startDate: '1934-10-09', endDate: '1935-03-12', notes: 'Relocated from Ottawa (formerly the Ottawa Senators (original)). Folded mid-season on March 12, 1935 due to financial trouble.' },
    ],
  },
  {
    current: 'toronto-arenas',
    currentName: 'Toronto Arenas',
    blurb:
      'The Toronto Arenas were one of the NHL’s founding teams in 1917, and won the first Stanley Cup awarded to an NHL team in 1918. The team was renamed the Toronto St. Patricks in 1919.',
    chain: [
      { slug: 'toronto-arenas', name: 'Toronto Arenas', years: '1917–1919', city: 'Toronto, ON', startDate: '1917-12-19', endDate: '1919-02-20', notes: 'Founding NHL team. Won the 1918 Stanley Cup. Renamed Toronto St. Patricks in 1919.' },
    ],
  },
  {
    current: 'toronto-maple-leafs',
    currentName: 'Toronto Maple Leafs',
    blurb:
      'Founded as the Toronto Arenas in 1917, renamed the Toronto St. Patricks in 1919, and renamed the Toronto Maple Leafs in 1927 by new owner Conn Smythe. Stanley Cup champions in 1918, 1922, 1932, 1942, 1945, 1947, 1948, 1949, 1951, 1962, 1963, 1967.',
    chain: [
      { slug: 'toronto-arenas', name: 'Toronto Arenas', years: '1917–1919', city: 'Toronto, ON', startDate: '1917-12-19', endDate: '1919-02-20', notes: 'Founding NHL team. Won the 1918 Stanley Cup. Renamed Toronto St. Patricks in 1919.' },
      { slug: 'toronto-st-patricks', name: 'Toronto St. Patricks', years: '1919–1927', city: 'Toronto, ON', startDate: '1919-02-20', endDate: '1927-08-14', notes: 'Renamed from the Toronto Arenas. Conn Smythe purchased the team in 1927 and renamed it the Toronto Maple Leafs.' },
      { slug: 'toronto-maple-leafs', name: 'Toronto Maple Leafs', years: '1927–present', city: 'Toronto, ON', startDate: '1927-08-14', notes: 'Renamed from the Toronto St. Patricks. 13 Stanley Cup championships.' },
    ],
  },

  // ============================================================================
  // Cross-league: the WHL (Western Hockey League) Winnipeg Jets are a
  // separate franchise from the original NHL Jets (1972-1996, which became
  // the Coyotes/Mammoth chain). The WHL Jets are kept as a standalone
  // entry for cross-reference.
  // ============================================================================
  {
    current: 'winnipeg-jets-whl',
    currentName: 'Winnipeg Jets (WHL)',
    blurb:
      'The Winnipeg Jets of the Western Hockey League (WHL) — not to be confused with the original NHL Winnipeg Jets (1972-1996, which became the Coyotes/Mammoth). The WHL Jets played in the rival professional league from 1952 to 1979, winning three WHL titles. When the WHL folded, the franchise and its players were transferred to the NHL; this is a separate franchise lineage from the Coyotes/Mammoth chain.',
    chain: [
      { slug: 'winnipeg-jets-whl', name: 'Winnipeg Jets', years: '1952–1979', city: 'Winnipeg, MB', startDate: '1952-12-01', endDate: '1979-06-30', notes: 'WHL franchise. Won three WHL titles. The WHL Jets are a separate franchise from the NHL Jets (1972-1996) that became the Coyotes/Mammoth chain.' },
    ],
  },
];

/** Look up a franchise chain by either the current slug or any historical slug in the chain. */
export function getChainForSlug(slug: string): FranchiseChain | undefined {
  return NHL_FRANCHISE_HISTORY.find(
    (c) => c.current === slug || c.chain.some((entry) => entry.slug === slug)
  );
}

/** Get the current (most recent) team entry for a slug — works for historical slugs too. */
export function getCurrentEntry(slug: string): FranchiseEntry | undefined {
  const chain = getChainForSlug(slug);
  if (!chain) return undefined;
  return chain.chain[chain.chain.length - 1];
}