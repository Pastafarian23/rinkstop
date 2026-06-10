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
    current: 'utah-hockey-club',
    currentName: 'Utah Hockey Club',
    blurb:
      'The youngest NHL franchise. Relocated from Arizona in 2024 and rebranded to the Utah Hockey Club, with the "Mammoth" identity adopted in 2025-26. The franchise is the direct successor of the original Winnipeg Jets.',
    chain: [
      { slug: 'winnipeg-jets-original', name: 'Winnipeg Jets', years: '1972–1996', city: 'Winnipeg', notes: 'Original WHA (1972) and NHL (1979) franchise. Relocated to Phoenix in 1996.' },
      { slug: 'phoenix-coyotes', name: 'Phoenix Coyotes', years: '1996–2014', city: 'Phoenix', notes: 'Relocated from Winnipeg. Retained Winnipeg-era Jets history.' },
      { slug: 'arizona-coyotes', name: 'Arizona Coyotes', years: '2014–2024', city: 'Glendale / Tempe', notes: 'Renamed from Phoenix to Arizona in 2014. Played at multiple Valley venues.' },
      { slug: 'utah-hockey-club', name: 'Utah Hockey Club', years: '2024–present', city: 'Salt Lake City', notes: 'Relocated from Arizona. "Mammoth" branding identity adopted 2025-26.' },
    ],
  },
  {
    current: 'carolina-hurricanes',
    currentName: 'Carolina Hurricanes',
    blurb:
      'Relocated from Hartford, Connecticut in 1997. The Whalers identity lives on in Hartford\'s branding; the franchise brought its full history (including WHA years) to North Carolina.',
    chain: [
      { slug: 'new-england-whalers', name: 'New England Whalers', years: '1972–1979', city: 'Boston / Hartford', notes: 'WHA franchise. Moved to Hartford full-time in 1974.' },
      { slug: 'hartford-whalers', name: 'Hartford Whalers', years: '1979–1997', city: 'Hartford, CT', notes: 'Joined NHL in 1979 merger. Relocated to Carolina in 1997.' },
      { slug: 'carolina-hurricanes', name: 'Carolina Hurricanes', years: '1997–present', city: 'Raleigh, NC', notes: 'Stanley Cup champions in 2006.' },
    ],
  },
  {
    current: 'colorado-avalanche',
    currentName: 'Colorado Avalanche',
    blurb:
      'Relocated from Quebec City in 1995. Won the Stanley Cup the very next season (1996). The franchise retains all Quebec Nordiques history.',
    chain: [
      { slug: 'quebec-nordiques-wha', name: 'Quebec Nordiques', years: '1972–1979', city: 'Quebec City', notes: 'WHA franchise.' },
      { slug: 'quebec-nordiques', name: 'Quebec Nordiques', years: '1979–1995', city: 'Quebec City', notes: 'Joined NHL in 1979 merger. Relocated to Denver in 1995.' },
      { slug: 'colorado-avalanche', name: 'Colorado Avalanche', years: '1995–present', city: 'Denver, CO', notes: 'Stanley Cup champions in 1996 and 2001.' },
    ],
  },
  {
    current: 'dallas-stars',
    currentName: 'Dallas Stars',
    blurb:
      'Relocated from Bloomington, Minnesota in 1993. The franchise brought 26 years of North Stars history with it, including two Presidents\' Trophies.',
    chain: [
      { slug: 'minnesota-north-stars', name: 'Minnesota North Stars', years: '1967–1993', city: 'Bloomington, MN', notes: 'Original 1967 expansion team. Relocated to Dallas in 1993.' },
      { slug: 'dallas-stars', name: 'Dallas Stars', years: '1993–present', city: 'Dallas, TX', notes: 'Stanley Cup champions in 1999.' },
    ],
  },
  {
    current: 'winnipeg-jets',
    currentName: 'Winnipeg Jets (current)',
    blurb:
      'Not the relocated Jets from 1996 — the current Winnipeg Jets are the former Atlanta Thrashers, who moved to Manitoba in 2011.',
    chain: [
      { slug: 'atlanta-thrashers', name: 'Atlanta Thrashers', years: '1999–2011', city: 'Duluth / Atlanta, GA', notes: '1999 expansion team. Relocated to Winnipeg in 2011.' },
      { slug: 'winnipeg-jets', name: 'Winnipeg Jets', years: '2011–present', city: 'Winnipeg, MB', notes: 'Adopted the Jets name to honor the original WHA/NHL Jets (1972-1996).' },
    ],
  },
  {
    current: 'calgary-flames',
    currentName: 'Calgary Flames',
    blurb:
      'Relocated from Atlanta in 1980. The Flames brought their full history — and the 1989 Stanley Cup — to Calgary.',
    chain: [
      { slug: 'atlanta-flames', name: 'Atlanta Flames', years: '1972–1980', city: 'Atlanta, GA', notes: 'Original 1972 expansion team. Relocated to Calgary in 1980.' },
      { slug: 'calgary-flames', name: 'Calgary Flames', years: '1980–present', city: 'Calgary, AB', notes: 'Stanley Cup champions in 1989.' },
    ],
  },
  {
    current: 'new-jersey-devils',
    currentName: 'New Jersey Devils',
    blurb:
      'Two relocations in eight years: Kansas City to Colorado (1976) to New Jersey (1982). The franchise traces its history all the way back to 1974.',
    chain: [
      { slug: 'kansas-city-scouts', name: 'Kansas City Scouts', years: '1974–1976', city: 'Kansas City, MO', notes: 'Original 1974 expansion team. Relocated to Colorado in 1976.' },
      { slug: 'colorado-rockies', name: 'Colorado Rockies', years: '1976–1982', city: 'Denver, CO', notes: 'Relocated from Kansas City. Relocated to New Jersey in 1982.' },
      { slug: 'new-jersey-devils', name: 'New Jersey Devils', years: '1982–present', city: 'Newark, NJ', notes: 'Stanley Cup champions in 1995, 2000, 2003.' },
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
