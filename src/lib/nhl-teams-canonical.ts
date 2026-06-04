// Canonical NHL team data — 32 active franchises with slug, division, conference, colors.
// Slug is used for URL building. highlightly_id links to the nhl_teams table.
// For rich details (founded, arena, etc.), see nhl-teams-data.ts (10 teams have full data).

export interface NhlTeamCanonical {
  slug: string;            // URL slug
  name: string;            // Full name e.g. "Boston Bruins"
  shortName: string;       // Abbreviation e.g. "BOS"
  city: string;            // e.g. "Boston"
  state: string;           // e.g. "Massachusetts" or "Ontario"
  country: 'US' | 'CA';
  division: 'Atlantic' | 'Metropolitan' | 'Central' | 'Pacific';
  conference: 'Eastern' | 'Western';
  primaryColor: string;    // hex
  secondaryColor: string;  // hex
  founded: number;
  arena: string;
  // highlightly_id is looked up at runtime from nhl_teams table by name
}

export const NHL_TEAMS_CANONICAL: NhlTeamCanonical[] = [
  // ---- Eastern Conference ----
  // Atlantic Division
  { slug: 'boston-bruins',         name: 'Boston Bruins',         shortName: 'BOS', city: 'Boston',         state: 'Massachusetts', country: 'US', division: 'Atlantic',      conference: 'Eastern', primaryColor: '#000000', secondaryColor: '#FFB81C', founded: 1924, arena: 'TD Garden' },
  { slug: 'buffalo-sabres',        name: 'Buffalo Sabres',        shortName: 'BUF', city: 'Buffalo',        state: 'New York',       country: 'US', division: 'Atlantic',      conference: 'Eastern', primaryColor: '#003087', secondaryColor: '#FFB81C', founded: 1970, arena: 'KeyBank Center' },
  { slug: 'detroit-red-wings',     name: 'Detroit Red Wings',     shortName: 'DET', city: 'Detroit',        state: 'Michigan',       country: 'US', division: 'Atlantic',      conference: 'Eastern', primaryColor: '#CE1126', secondaryColor: '#FFFFFF', founded: 1926, arena: 'Little Caesars Arena' },
  { slug: 'florida-panthers',      name: 'Florida Panthers',      shortName: 'FLA', city: 'Sunrise',        state: 'Florida',        country: 'US', division: 'Atlantic',      conference: 'Eastern', primaryColor: '#C8102E', secondaryColor: '#041E42', founded: 1993, arena: 'Amerant Bank Arena' },
  { slug: 'montreal-canadiens',    name: 'Montreal Canadiens',    shortName: 'MTL', city: 'Montreal',       state: 'Quebec',         country: 'CA', division: 'Atlantic',      conference: 'Eastern', primaryColor: '#AF1E2D', secondaryColor: '#192168', founded: 1909, arena: 'Bell Centre' },
  { slug: 'ottawa-senators',       name: 'Ottawa Senators',       shortName: 'OTT', city: 'Ottawa',         state: 'Ontario',        country: 'CA', division: 'Atlantic',      conference: 'Eastern', primaryColor: '#C52032', secondaryColor: '#000000', founded: 1992, arena: 'Canadian Tire Centre' },
  { slug: 'tampa-bay-lightning',   name: 'Tampa Bay Lightning',   shortName: 'TBL', city: 'Tampa',          state: 'Florida',        country: 'US', division: 'Atlantic',      conference: 'Eastern', primaryColor: '#00205B', secondaryColor: '#FFFFFF', founded: 1992, arena: 'Amalie Arena' },
  { slug: 'toronto-maple-leafs',   name: 'Toronto Maple Leafs',   shortName: 'TOR', city: 'Toronto',        state: 'Ontario',        country: 'CA', division: 'Atlantic',      conference: 'Eastern', primaryColor: '#00205B', secondaryColor: '#FFFFFF', founded: 1917, arena: 'Scotiabank Arena' },

  // Metropolitan Division
  { slug: 'carolina-hurricanes',   name: 'Carolina Hurricanes',   shortName: 'CAR', city: 'Raleigh',        state: 'North Carolina', country: 'US', division: 'Metropolitan',   conference: 'Eastern', primaryColor: '#CC0000', secondaryColor: '#000000', founded: 1997, arena: 'Lenovo Center' },
  { slug: 'columbus-blue-jackets', name: 'Columbus Blue Jackets', shortName: 'CBJ', city: 'Columbus',       state: 'Ohio',           country: 'US', division: 'Metropolitan',   conference: 'Eastern', primaryColor: '#002654', secondaryColor: '#CE1126', founded: 2000, arena: 'Nationwide Arena' },
  { slug: 'new-jersey-devils',     name: 'New Jersey Devils',     shortName: 'NJD', city: 'Newark',         state: 'New Jersey',     country: 'US', division: 'Metropolitan',   conference: 'Eastern', primaryColor: '#CE1126', secondaryColor: '#000000', founded: 1982, arena: 'Prudential Center' },
  { slug: 'new-york-islanders',    name: 'New York Islanders',    shortName: 'NYI', city: 'Elmont',         state: 'New York',       country: 'US', division: 'Metropolitan',   conference: 'Eastern', primaryColor: '#00539B', secondaryColor: '#F47A30', founded: 1972, arena: 'UBS Arena' },
  { slug: 'new-york-rangers',      name: 'New York Rangers',      shortName: 'NYR', city: 'New York',       state: 'New York',       country: 'US', division: 'Metropolitan',   conference: 'Eastern', primaryColor: '#0038A8', secondaryColor: '#CE1126', founded: 1926, arena: 'Madison Square Garden' },
  { slug: 'philadelphia-flyers',   name: 'Philadelphia Flyers',   shortName: 'PHI', city: 'Philadelphia',   state: 'Pennsylvania',   country: 'US', division: 'Metropolitan',   conference: 'Eastern', primaryColor: '#F74902', secondaryColor: '#000000', founded: 1967, arena: 'Wells Fargo Center' },
  { slug: 'pittsburgh-penguins',   name: 'Pittsburgh Penguins',   shortName: 'PIT', city: 'Pittsburgh',     state: 'Pennsylvania',   country: 'US', division: 'Metropolitan',   conference: 'Eastern', primaryColor: '#000000', secondaryColor: '#FCB514', founded: 1967, arena: 'PPG Paints Arena' },
  { slug: 'washington-capitals',   name: 'Washington Capitals',   shortName: 'WSH', city: 'Washington',     state: 'D.C.',           country: 'US', division: 'Metropolitan',   conference: 'Eastern', primaryColor: '#041E42', secondaryColor: '#C8102E', founded: 1974, arena: 'Capital One Arena' },

  // ---- Western Conference ----
  // Central Division
  { slug: 'colorado-avalanche',    name: 'Colorado Avalanche',    shortName: 'COL', city: 'Denver',         state: 'Colorado',       country: 'US', division: 'Central',        conference: 'Western', primaryColor: '#6F263D', secondaryColor: '#236192', founded: 1995, arena: 'Ball Arena' },
  { slug: 'dallas-stars',          name: 'Dallas Stars',          shortName: 'DAL', city: 'Dallas',         state: 'Texas',          country: 'US', division: 'Central',        conference: 'Western', primaryColor: '#006847', secondaryColor: '#8C2633', founded: 1967, arena: 'American Airlines Center' },
  { slug: 'minnesota-wild',        name: 'Minnesota Wild',        shortName: 'MIN', city: 'Saint Paul',     state: 'Minnesota',      country: 'US', division: 'Central',        conference: 'Western', primaryColor: '#154734', secondaryColor: '#A6192E', founded: 2000, arena: 'Xcel Energy Center' },
  { slug: 'nashville-predators',   name: 'Nashville Predators',   shortName: 'NSH', city: 'Nashville',      state: 'Tennessee',      country: 'US', division: 'Central',        conference: 'Western', primaryColor: '#FFB81C', secondaryColor: '#041E42', founded: 1998, arena: 'Bridgestone Arena' },
  { slug: 'st-louis-blues',        name: 'St. Louis Blues',       shortName: 'STL', city: 'St. Louis',      state: 'Missouri',       country: 'US', division: 'Central',        conference: 'Western', primaryColor: '#002F87', secondaryColor: '#FCB514', founded: 1967, arena: 'Enterprise Center' },
  { slug: 'utah-hockey-club',      name: 'Utah Hockey Club',      shortName: 'UTA', city: 'Salt Lake City', state: 'Utah',           country: 'US', division: 'Central',        conference: 'Western', primaryColor: '#71B2C9', secondaryColor: '#000000', founded: 2024, arena: 'Delta Center' },
  { slug: 'winnipeg-jets',         name: 'Winnipeg Jets',         shortName: 'WPG', city: 'Winnipeg',       state: 'Manitoba',       country: 'CA', division: 'Central',        conference: 'Western', primaryColor: '#041E42', secondaryColor: '#AC162C', founded: 1999, arena: 'Canada Life Centre' },
  { slug: 'chicago-blackhawks',    name: 'Chicago Blackhawks',    shortName: 'CHI', city: 'Chicago',        state: 'Illinois',       country: 'US', division: 'Central',        conference: 'Western', primaryColor: '#CF0A2C', secondaryColor: '#000000', founded: 1926, arena: 'United Center' },

  // Pacific Division
  { slug: 'anaheim-ducks',         name: 'Anaheim Ducks',         shortName: 'ANA', city: 'Anaheim',        state: 'California',     country: 'US', division: 'Pacific',        conference: 'Western', primaryColor: '#FC4C02', secondaryColor: '#B6985A', founded: 1993, arena: 'Honda Center' },
  { slug: 'calgary-flames',        name: 'Calgary Flames',        shortName: 'CGY', city: 'Calgary',        state: 'Alberta',        country: 'CA', division: 'Pacific',        conference: 'Western', primaryColor: '#C8102E', secondaryColor: '#F1B434', founded: 1980, arena: 'Scotiabank Saddledome' },
  { slug: 'edmonton-oilers',       name: 'Edmonton Oilers',       shortName: 'EDM', city: 'Edmonton',       state: 'Alberta',        country: 'CA', division: 'Pacific',        conference: 'Western', primaryColor: '#FF4C00', secondaryColor: '#041E42', founded: 1972, arena: 'Rogers Place' },
  { slug: 'los-angeles-kings',     name: 'Los Angeles Kings',     shortName: 'LAK', city: 'Los Angeles',    state: 'California',     country: 'US', division: 'Pacific',        conference: 'Western', primaryColor: '#111111', secondaryColor: '#A2AAAD', founded: 1967, arena: 'Crypto.com Arena' },
  { slug: 'san-jose-sharks',       name: 'San Jose Sharks',       shortName: 'SJS', city: 'San Jose',       state: 'California',     country: 'US', division: 'Pacific',        conference: 'Western', primaryColor: '#006D75', secondaryColor: '#EA7200', founded: 1991, arena: 'SAP Center' },
  { slug: 'seattle-kraken',        name: 'Seattle Kraken',        shortName: 'SEA', city: 'Seattle',        state: 'Washington',     country: 'US', division: 'Pacific',        conference: 'Western', primaryColor: '#001628', secondaryColor: '#99D9D9', founded: 2021, arena: 'Climate Pledge Arena' },
  { slug: 'vancouver-canucks',     name: 'Vancouver Canucks',     shortName: 'VAN', city: 'Vancouver',      state: 'British Columbia', country: 'CA', division: 'Pacific',      conference: 'Western', primaryColor: '#001F5B', secondaryColor: '#00843D', founded: 1970, arena: 'Rogers Arena' },
  { slug: 'vegas-golden-knights',  name: 'Vegas Golden Knights',  shortName: 'VGK', city: 'Las Vegas',      state: 'Nevada',         country: 'US', division: 'Pacific',        conference: 'Western', primaryColor: '#B4975A', secondaryColor: '#333F42', founded: 2017, arena: 'T-Mobile Arena' },
];

// Helpers
export function findCanonicalTeam(slug: string): NhlTeamCanonical | undefined {
  return NHL_TEAMS_CANONICAL.find(t => t.slug === slug);
}

export function teamsByDivision(division: NhlTeamCanonical['division']): NhlTeamCanonical[] {
  return NHL_TEAMS_CANONICAL.filter(t => t.division === division);
}

export function teamsByConference(conference: NhlTeamCanonical['conference']): NhlTeamCanonical[] {
  return NHL_TEAMS_CANONICAL.filter(t => t.conference === conference);
}

export const ALL_DIVISIONS: Array<NhlTeamCanonical['division']> = ['Atlantic', 'Metropolitan', 'Central', 'Pacific'];
export const ALL_CONFERENCES: Array<NhlTeamCanonical['conference']> = ['Eastern', 'Western'];
