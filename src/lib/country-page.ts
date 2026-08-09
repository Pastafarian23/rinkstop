import type { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';
import { robotsMeta } from '@/lib/seo';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Map URL slugs to proper country names
export const COUNTRY_MAP: Record<string, string> = {
  'united-states': 'United States', 'usa': 'United States', 'us': 'United States',
  'canada': 'Canada',
  'united-kingdom': 'United Kingdom', 'uk': 'United Kingdom', 'great-britain': 'United Kingdom',
  'russia': 'Russia', 'russian-federation': 'Russia',
  'sweden': 'Sweden',
  'finland': 'Finland',
  'germany': 'Germany',
  'switzerland': 'Switzerland',
  'czech-republic': 'Czech Republic', 'czechia': 'Czech Republic', // czechia = legacy alias; canonical URL is czech-republic
  'norway': 'Norway',
  'france': 'France',
  'austria': 'Austria',
  'italy': 'Italy',
  'australia': 'Australia',
  'netherlands': 'Netherlands', 'holland': 'Netherlands',
  'japan': 'Japan',
  'south-korea': 'South Korea', 'korea': 'South Korea',
  'china': 'China',
  'mexico': 'Mexico',
  'denmark': 'Denmark',
  'new-zealand': 'New Zealand',
  'poland': 'Poland', 'spain': 'Spain', 'belgium': 'Belgium', 'ireland': 'Ireland',
  'portugal': 'Portugal', 'greece': 'Greece', 'hungary': 'Hungary', 'croatia': 'Croatia',
  'slovakia': 'Slovakia', 'slovenia': 'Slovenia', 'romania': 'Romania', 'bulgaria': 'Bulgaria',
  'ukraine': 'Ukraine', 'belarus': 'Belarus', 'estonia': 'Estonia', 'latvia': 'Latvia',
  'lithuania': 'Lithuania', 'serbia': 'Serbia', 'bosnia': 'Bosnia and Herzegovina',
  'luxembourg': 'Luxembourg', 'iceland': 'Iceland', 'malta': 'Malta', 'cyprus': 'Cyprus',
  'brazil': 'Brazil', 'argentina': 'Argentina', 'chile': 'Chile', 'colombia': 'Colombia',
  'peru': 'Peru', 'venezuela': 'Venezuela', 'ecuador': 'Ecuador', 'uruguay': 'Uruguay',
  'india': 'India', 'pakistan': 'Pakistan', 'bangladesh': 'Bangladesh', 'sri-lanka': 'Sri Lanka',
  'nepal': 'Nepal', 'thailand': 'Thailand', 'vietnam': 'Vietnam', 'indonesia': 'Indonesia',
  'malaysia': 'Malaysia', 'philippines': 'Philippines', 'singapore': 'Singapore',
  'hong-kong': 'Hong Kong', 'taiwan': 'Taiwan', 'mongolia': 'Mongolia',
  'uae': 'United Arab Emirates', 'united-arab-emirates': 'United Arab Emirates',
  'saudi-arabia': 'Saudi Arabia', 'qatar': 'Qatar', 'kuwait': 'Kuwait', 'bahrain': 'Bahrain',
  'oman': 'Oman', 'israel': 'Israel', 'jordan': 'Jordan', 'lebanon': 'Lebanon',
  'iran': 'Iran', 'iraq': 'Iraq', 'egypt': 'Egypt', 'south-africa': 'South Africa',
  'nigeria': 'Nigeria', 'kenya': 'Kenya', 'morocco': 'Morocco', 'ghana': 'Ghana',
  'ethiopia': 'Ethiopia', 'tanzania': 'Tanzania', 'uganda': 'Uganda',
  'cameroon': 'Cameroon', 'senegal': 'Senegal', 'zambia': 'Zambia', 'zimbabwe': 'Zimbabwe',
  'botswana': 'Botswana', 'angola': 'Angola', 'mozambique': 'Mozambique',
  'jamaica': 'Jamaica', 'trinidad-and-tobago': 'Trinidad and Tobago', 'costa-rica': 'Costa Rica',
  'puerto-rico': 'Puerto Rico', 'panama': 'Panama', 'guatemala': 'Guatemala',
};

// Map country name → IOC 3-letter code (for player.nationality filtering)
export const COUNTRY_TO_IOC: Record<string, string> = {
  'United States': 'USA', 'Canada': 'CAN', 'United Kingdom': 'GBR',
  'Russia': 'RUS', 'Sweden': 'SWE', 'Finland': 'FIN', 'Germany': 'DEU',
  'Switzerland': 'SUI', 'Czech Republic': 'CZE', 'Norway': 'NOR',
  'France': 'FRA', 'Austria': 'AUT', 'Italy': 'ITA', 'Australia': 'AUS',
  'Netherlands': 'NLD', 'Japan': 'JPN', 'South Korea': 'KOR', 'China': 'CHN',
  'Mexico': 'MEX', 'Denmark': 'DNK', 'New Zealand': 'NZL', 'Poland': 'POL',
  'Spain': 'ESP', 'Belgium': 'BEL', 'Ireland': 'IRL', 'Portugal': 'PRT',
  'Greece': 'GRC', 'Hungary': 'HUN', 'Croatia': 'HRV', 'Slovakia': 'SVK',
  'Slovenia': 'SVN', 'Romania': 'ROU', 'Bulgaria': 'BGR', 'Ukraine': 'UKR',
  'Belarus': 'BLR', 'Estonia': 'EST', 'Latvia': 'LVA', 'Lithuania': 'LTU',
  'Serbia': 'SRB', 'Iceland': 'ISL', 'Cyprus': 'CYP', 'Brazil': 'BRA',
  'Argentina': 'ARG', 'Chile': 'CHI', 'Colombia': 'COL', 'Peru': 'PER',
  'India': 'IND', 'Pakistan': 'PAK', 'Philippines': 'PHL', 'South Africa': 'ZAF',
  'Nigeria': 'NGA', 'Kenya': 'KEN', 'Jamaica': 'JAM', 'Israel': 'ISR',
};

export const COUNTRY_TO_ISO: Record<string, string> = {
  'United States': 'US', 'USA': 'US',
  'Canada': 'CA', 'CA': 'CA',
  'United Kingdom': 'GB', 'Great Britain': 'GB',
  'Russia': 'RU', 'Sweden': 'SE', 'Finland': 'FI', 'Germany': 'DE',
  'Switzerland': 'CH', 'Czech Republic': 'CZ', 'Norway': 'NO', 'France': 'FR',
  'Austria': 'AT', 'Italy': 'IT', 'Australia': 'AU', 'Netherlands': 'NL',
  'Japan': 'JP', 'South Korea': 'KR', 'China': 'CN', 'Mexico': 'MX',
  'Denmark': 'DK', 'New Zealand': 'NZ', 'Poland': 'PL', 'Spain': 'ES',
  'Belgium': 'BE', 'Ireland': 'IE', 'Portugal': 'PT', 'Greece': 'GR',
  'Hungary': 'HU', 'Croatia': 'HR', 'Slovakia': 'SK', 'Slovenia': 'SI',
  'Romania': 'RO', 'Bulgaria': 'BG', 'Ukraine': 'UA', 'Belarus': 'BY',
  'Estonia': 'EE', 'Latvia': 'LV', 'Lithuania': 'LT', 'Serbia': 'RS',
  'Iceland': 'IS', 'Brazil': 'BR', 'Argentina': 'AR', 'Chile': 'CL',
  'Colombia': 'CO', 'Peru': 'PE', 'India': 'IN', 'Philippines': 'PH',
  'South Africa': 'ZA', 'Israel': 'IL', 'Andorra': 'AD', 'Armenia': 'AM',
  'Azerbaijan': 'AZ', 'Bahrain': 'BH', 'Bosnia and Herzegovina': 'BA',
  'Costa Rica': 'CR', 'Georgia': 'GE', 'Hong Kong': 'HK', 'Indonesia': 'ID',
  'Iran': 'IR', 'Kazakhstan': 'KZ', 'Kuwait': 'KW', 'Kyrgyzstan': 'KG',
  'Lebanon': 'LB', 'Luxembourg': 'LU', 'Malaysia': 'MY', 'Moldova': 'MD',
  'Mongolia': 'MN', 'Montenegro': 'ME', 'North Korea': 'KP',
  'North Macedonia': 'MK', 'Oman': 'OM', 'Pakistan': 'PK', 'Qatar': 'QA',
  'Saudi Arabia': 'SA', 'Singapore': 'SG', 'Taiwan': 'TW', 'Thailand': 'TH',
  'Turkey': 'TR', 'Turkmenistan': 'TM', 'United Arab Emirates': 'AE',
  'Uzbekistan': 'UZ', 'Venezuela': 'VE', 'Puerto Rico': 'PR',
  'Jamaica': 'JM', 'Cyprus': 'CY', 'Nigeria': 'NG', 'Kenya': 'KE',
};


// League info for top countries
export const LEAGUE_INFO: Record<string, { league: string; note: string; iihfRank?: string; firstNhl?: string }> = {
  'United States': { league: 'NHL, NCAA, USHL', note: 'Fastest-growing hockey market globally', iihfRank: '#4', firstNhl: '1924' },
  'Canada': { league: 'NHL, OHL, WHL, QMJHL', note: "Hockey's birthplace and powerhouse", iihfRank: '#1', firstNhl: '1917' },
  'Russia': { league: 'KHL, MHL, VHL', note: "World's second-best league after NHL", iihfRank: '#3', firstNhl: '1952' },
  'Sweden': { league: 'SHL, Hockeyallsvenskan', note: 'Top player development system', iihfRank: '#4', firstNhl: '1932' },
  'Finland': { league: 'Liiga, Mestis', note: 'Per-capita hockey power', iihfRank: '#3', firstNhl: '1927' },
  'Germany': { league: 'DEL, DEL2', note: 'Growing NHL pipeline', iihfRank: '#7', firstNhl: '1952' },
  'Switzerland': { league: 'NL, SL', note: 'High-quality league, neutral host', iihfRank: '#5', firstNhl: '1935' },
  'Czech Republic': { league: 'Extraliga, 1. Liga', note: 'Rich hockey tradition', iihfRank: '#5', firstNhl: '1936' },
  'Norway': { league: 'Fjordkraft-Ligaen', note: 'Rapidly improving program', iihfRank: '#8', firstNhl: '1949' },
  'France': { league: 'Ligue Magnus', note: 'Growing NHL interest', iihfRank: '#11', firstNhl: '1931' },
  'Austria': { league: 'ICEHL, EBEL', note: 'Alpine hockey tradition', iihfRank: '#13', firstNhl: '1947' },
  'Italy': { league: 'Serie A', note: 'Mediterranean hockey hub', iihfRank: '#16', firstNhl: '1947' },
  'Australia': { league: 'AIHL', note: 'Growing Down Under', iihfRank: '#22', firstNhl: '1982' },
  'Netherlands': { league: 'Eredivisie', note: 'Dutch hockey progressing', iihfRank: '#19', firstNhl: '1961' },
  'Japan': { league: 'BHL', note: "Asia's most developed program", iihfRank: '#23', firstNhl: '1930' },
  'South Korea': { league: 'Asia League', note: 'Rapidly rising program', iihfRank: '#14', firstNhl: '1984' },
  'China': { league: 'KHL (Kunlun)', note: 'Fastest-growing market', iihfRank: '#26', firstNhl: '1981' },
  'Denmark': { league: 'Metal Ligaen', note: 'Strong international results', iihfRank: '#9', firstNhl: '1949' },
  'New Zealand': { league: 'NZIHL', note: 'Oceania hockey entry point', iihfRank: '#25', firstNhl: '1989' },
  'United Kingdom': { league: 'EIHL, NIHL', note: 'UK hockey expanding', iihfRank: '#18', firstNhl: '1935' },
  'Mexico': { league: 'LNHHB', note: 'Growing in North America', iihfRank: '#30', firstNhl: '1989' },
  'Slovakia': { league: 'Extraliga, 1. Liga', note: 'Consistent NHL talent producer', iihfRank: '#10', firstNhl: '1936' },
  'Latvia': { league: 'Optibet Latvian Hockey League', note: 'Passionate hockey nation', iihfRank: '#10', firstNhl: '1932' },
  'Belarus': { league: 'Extraleague', note: 'Strong regional presence', iihfRank: '#15', firstNhl: '1952' },
};

// For the 40 placeholder countries with no permanent ice rink, list the
// closest active hockey markets (geographic + cultural neighbors that have
// at least 1 open rink in our database). Used to render the "Closest active
// hockey markets" section on the no-data state.
export const NEAREST_ACTIVE_HOCKEY: Record<string, string[]> = {
  'Albania': ['Italy', 'Greece', 'Croatia', 'Serbia'],
  'Antigua and Barbuda': ['Puerto Rico', 'United States', 'Mexico', 'Costa Rica'],
  'Bahamas': ['United States', 'Mexico', 'Costa Rica'],
  'Barbados': ['United States', 'Mexico', 'Costa Rica'],
  'Belize': ['Mexico', 'United States', 'Costa Rica'],
  'Bolivia': ['Argentina', 'Brazil', 'Peru', 'Chile'],
  'Channel Islands (Jersey & Guernsey – UK Crown Dependencies)': ['United Kingdom', 'France'],
  'Colombia': ['Costa Rica', 'Mexico', 'Venezuela', 'United States'],
  'Cuba': ['United States', 'Mexico', 'Costa Rica'],
  'Dominica': ['United States', 'Mexico', 'Costa Rica'],
  'Dominican Republic': ['United States', 'Puerto Rico', 'Mexico', 'Costa Rica'],
  'Ecuador': ['Peru', 'Mexico', 'Costa Rica', 'United States'],
  'El Salvador': ['Mexico', 'Costa Rica', 'United States'],
  'Faroe Islands (Denmark)': ['Denmark', 'Iceland', 'Norway', 'United Kingdom'],
  'Gibraltar (UK)': ['United Kingdom', 'Spain', 'Portugal'],
  'Grenada': ['United States', 'Mexico', 'Costa Rica'],
  'Guadeloupe': ['France', 'Puerto Rico', 'United States'],
  'Guatemala': ['Mexico', 'Costa Rica', 'United States'],
  'Haiti': ['United States', 'Mexico', 'Costa Rica'],
  'Honduras': ['Mexico', 'Costa Rica', 'United States'],
  'Isle of Man (UK Crown Dependency)': ['United Kingdom', 'Ireland'],
  'Jamaica': ['United States', 'Canada', 'Mexico'],
  'Kosovo': ['Serbia', 'Croatia', 'Hungary', 'Italy'],
  'Liechtenstein': ['Switzerland', 'Austria', 'Germany'],
  'Malta': ['Italy', 'Greece'],
  'Martinique': ['France', 'Puerto Rico', 'United States'],
  'Monaco': ['France', 'Italy', 'Switzerland'],
  'Nicaragua': ['Costa Rica', 'Mexico', 'United States'],
  'North Macedonia': ['Greece', 'Serbia', 'Bulgaria', 'Hungary'],
  'Panama': ['Mexico', 'Costa Rica', 'United States', 'Puerto Rico'],
  'Paraguay': ['Argentina', 'Brazil', 'Uruguay'],
  'Saint Kitts and Nevis': ['United States', 'Puerto Rico', 'Mexico'],
  'Saint Lucia': ['United States', 'Mexico', 'Costa Rica'],
  'Saint Vincent and the Grenadines': ['United States', 'Mexico', 'Costa Rica'],
  'San Marino': ['Italy'],
  'Trinidad and Tobago': ['United States', 'Mexico', 'Costa Rica'],
  'Turks and Caicos': ['United States', 'Puerto Rico'],
  'Uruguay': ['Argentina', 'Brazil', 'Chile'],
  'US Virgin Islands': ['United States', 'Puerto Rico'],
  'Vatican City': ['Italy'],
};

// Country-specific "how to play" notes
export const HOW_TO_NOTES: Record<string, string> = {
  'United States': 'USA Hockey is the official governing body and runs the national team pipeline. Most learn-to-play programs are run through local rinks and require registration with USA Hockey.',
  'Canada': 'Hockey Canada oversees the national program. Most children start through the Canadian Tire First Shift program, which provides free equipment for first-time players.',
  'Finland': 'The Finnish Ice Hockey Association (Jääkiekkoliitto) oversees the national program. Most young Finns play organized hockey by age 7 through local clubs (seurat).',
  'Sweden': 'The Swedish Ice Hockey Association (Svenska Ishockeyförbundet) runs a famously well-organized development system. Most clubs accept children from age 5–6.',
  'Russia': 'Hockey in Russia is organized through the Federal Center for Training National Teams. Development pathways run through schools of Olympic Reserve and youth teams of KHL clubs.',
  'Germany': 'The German Ice Hockey Federation (Deutscher Eishockey-Bund) runs the national program. DEL clubs operate youth academies that accept players from age 6–7.',
  'Switzerland': 'Swiss Ice Hockey runs the national program. Most clubs offer beginner programs for children and adult recreational leagues for newcomers.',
  'Czech Republic': 'The Czech Ice Hockey Association organizes the national program. Most children start at local clubs between ages 5–7, and the country has produced NHL talent at the highest per-capita rate in modern history.',
};

// Country → relevant tag words (for article matching)
export const COUNTRY_TAGS: Record<string, string[]> = {
  'Finland': ['hockey', 'global hockey', 'global-directory'],
  'Sweden': ['hockey', 'global hockey', 'global-directory'],
  'Russia': ['hockey', 'global hockey'],
  'Canada': ['hockey', 'rinkstop', 'youth hockey'],
  'United States': ['hockey', 'rinkstop', 'youth hockey', 'hockey costs'],
  'Germany': ['hockey', 'global hockey'],
  'Switzerland': ['hockey', 'global hockey'],
  'Czech Republic': ['hockey', 'global hockey'],
  'Japan': ['asia hockey', 'non-traditional markets', 'global-directory', 'hockey growth'],
  'South Korea': ['asia hockey', 'non-traditional markets', 'global-directory', 'hockey growth'],
  'China': ['asia hockey', 'non-traditional markets', 'global-directory', 'hockey growth'],
  'Philippines': ['asia hockey', 'non-traditional markets', 'global-directory', 'hockey growth'],
  'India': ['non-traditional markets', 'hockey growth'],
  'Mexico': ['non-traditional markets', 'hockey growth'],
  'Brazil': ['non-traditional markets', 'hockey growth'],
};

export function slugToCountry(slug: string): string {
  const lower = slug.toLowerCase();
  if (COUNTRY_MAP[lower]) return COUNTRY_MAP[lower];
  return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

export function countryToSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export interface NewestItem {
  id: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  slug: string | null;
  city?: string | null;
  home_city?: string | null;
  position?: string | null;
  title?: string;
  subtitle?: string | null;
  category?: string | null;
  published_at?: string | null;
  created_at: string;
}

export interface CountryPageData {
  countryName: string;
  countrySlug: string;
  rinks: any[];
  teams: any[];
  rinkCount: number;
  teamCount: number;
  playerCount: number;
  leagues: any[];
  players: any[];
  relatedPosts: any[];
  finalPosts: any[];
  hasData: boolean;
  info: { league: string; note: string; iihfRank?: string; firstNhl?: string } | undefined;
  howToNote: string | undefined;
  nearestHockeyCountries: { name: string; slug: string; rinkCount: number; teamCount: number }[];
  hockeyCities: { name: string; slug: string; rinkCount: number }[];
  iihfMember: {
    country: string;
    iihf_status: 'full' | 'associate' | 'suspended';
    ioc_code: string | null;
    date_joined: string | null;
    organization: string | null;
    mens_ranking: number | null;
    womens_ranking: number | null;
    ranking_as_of: string;
    mens_division: string | null;
    mens_division_rank: number | null;
    division_as_of: string | null;
  } | null;
  nationalTeams: Array<{
    id: string;
    team_name: string;
    team_type: 'mens' | 'womens' | 'mens_u20' | 'mens_u18' | 'womens_u18';
    ranking: number | null;
    ranking_label: string;
    slug: string;
  }>;
  leagueCount: number;
  newest: {
    rinks: NewestItem[];
    teams: NewestItem[];
    players: NewestItem[];
    articles: NewestItem[];
  };
}

export async function getCountryPageData(countryName: string): Promise<CountryPageData> {
  const countrySlug = countryToSlug(countryName);
  const iocCode = COUNTRY_TO_IOC[countryName];
  const isoCode = COUNTRY_TO_ISO[countryName];  // for team_workspaces.country_code filter
  const info = LEAGUE_INFO[countryName];
  const howToNote = HOW_TO_NOTES[countryName];
  const relevantTags = COUNTRY_TAGS[countryName] || ['hockey', 'global-directory'];

  const [
    { data: rinks },
    { data: teams },
    { count: rinkCount },
    { count: teamCount },
    { data: leagues },
    { data: players },
    { data: relatedPosts },
    { data: iihfMember },
    { data: nationalTeams },
    { count: leagueCount },
    { count: playerCount },
    { data: newestRinks },
    { data: newestTeams },
    { data: newestPlayers },
    { data: newestArticles },
  ] = await Promise.all([
    supabase.from('rinks').select('id, slug, name, city, address, phone, website_url').eq('country', countryName).eq('is_active', true).order('name').limit(50),
    supabase.from('team_workspaces').select('id, name, slug, avatar_url, home_city, league_id').eq('country_code', isoCode).eq('is_active', true).order('name').limit(20),
    supabase.from('rinks').select('*', { count: 'exact', head: true }).eq('country', countryName).eq('is_active', true),
    supabase.from('team_workspaces').select('*', { count: 'exact', head: true }).eq('country_code', isoCode).eq('is_active', true),
    supabase.from('leagues').select('id, name, slug, level, logo_url, country').or(`country.eq.${countryName},country.ilike.%${countryName}%`).eq('is_active', true).order('level').limit(8),
    iocCode
      ? supabase.from('players').select('id, first_name, last_name, slug, position, nationality, headshot_url, team_id').eq('nationality', iocCode).eq('is_active', true).order('last_name').limit(8)
      : Promise.resolve({ data: null as any }),
    supabase.from('posts').select('id, slug, title, subtitle, category, tags, author_name, reading_time_minutes, published_at').eq('status', 'published').order('published_at', { ascending: false }).limit(30),
    supabase.from('iihf_member_nations').select('country, iihf_status, ioc_code, date_joined, organization, mens_ranking, womens_ranking, ranking_as_of, mens_division, mens_division_rank, division_as_of').eq('country', countryName).maybeSingle(),
    supabase.from('national_teams').select('id, team_name, team_type, ranking, ranking_label, slug').eq('country', countryName).eq('is_active', true).order('team_type'),
    supabase.from('leagues').select('*', { count: 'exact', head: true }).or(`country.eq.${countryName},country.ilike.%${countryName}%`).eq('is_active', true),
    iocCode
      ? supabase.from('players').select('*', { count: 'exact', head: true }).eq('nationality', iocCode).eq('is_active', true)
      : Promise.resolve({ count: 0 } as any),
    // Newest rinks in this country (country page activity feed)
    supabase.from('rinks').select('id, name, slug, city, created_at').eq('country', countryName).eq('is_active', true).order('created_at', { ascending: false }).limit(5),
    // Newest teams in this country
    isoCode
      ? supabase.from('team_workspaces').select('id, name, slug, home_city, created_at').eq('country_code', isoCode).eq('is_active', true).order('created_at', { ascending: false }).limit(5)
      : Promise.resolve({ data: [] as any }),
    // Newest players with this nationality
    iocCode
      ? supabase.from('players').select('id, first_name, last_name, slug, position, created_at').eq('nationality', iocCode).eq('is_active', true).order('created_at', { ascending: false }).limit(5)
      : Promise.resolve({ data: [] as any }),
    // Newest articles tagged with this country
    supabase.from('posts').select('id, slug, title, subtitle, category, published_at, created_at').eq('status', 'published').eq('country_slug', countrySlug).order('published_at', { ascending: false }).limit(5),
  ]);

  // Score related articles by tag overlap
  const scoredPosts = (relatedPosts || [])
    .map(p => {
      const postTags = (p.tags || []) as string[];
      const overlap = postTags.filter(t => relevantTags.some(rt => t.toLowerCase().includes(rt.toLowerCase()))).length;
      return { post: p, score: overlap };
    })
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(s => s.post);

  // Fallback: latest 3
  const finalPosts = scoredPosts.length > 0 ? scoredPosts : (relatedPosts || []).slice(0, 3);

  const hasData = (rinks && rinks.length > 0) || (teams && teams.length > 0);

  // For no-data countries, compute nearest active hockey markets + their counts.
  // Only runs when hasData=false (skipped for the 70+ countries with rinks).
  const nearestNames = !hasData ? (NEAREST_ACTIVE_HOCKEY[countryName] || []) : [];
  let nearestHockeyCountries: { name: string; slug: string; rinkCount: number; teamCount: number }[] = [];
  if (nearestNames.length > 0) {
    const { data: nearestRinks } = await supabase
      .from('rinks')
      .select('country')
      .in('country', nearestNames)
      .eq('is_active', true)
      .eq('status', 'open');
    const { data: nearestTeams } = await supabase
      .from('team_workspaces')
      .select('country_code')
      .in('country_code', nearestNames.map(n => COUNTRY_TO_ISO[n]).filter(Boolean))
      .eq('is_active', true);
    const rinkByCountry: Record<string, number> = {};
    (nearestRinks || []).forEach(r => { rinkByCountry[r.country] = (rinkByCountry[r.country] || 0) + 1; });
    const teamByCountry: Record<string, number> = {};
    (nearestTeams || []).forEach(t => { teamByCountry[t.country_code] = (teamByCountry[t.country_code] || 0) + 1; });
    nearestHockeyCountries = nearestNames.map(name => ({
      name,
      slug: countryToSlug(name),
      rinkCount: rinkByCountry[name] || 0,
      teamCount: teamByCountry[COUNTRY_TO_ISO[name] || ''] || 0,
    }));
  }

  return {
    countryName,
    countrySlug,
    rinks: rinks || [],
    teams: teams || [],
    rinkCount: rinkCount ?? 0,
    teamCount: teamCount ?? 0,
    leagueCount: leagueCount ?? 0,
    playerCount: playerCount ?? 0,
    leagues: leagues || [],
    players: players || [],
    relatedPosts: relatedPosts || [],
    finalPosts: finalPosts || [],
    hasData,
    info,
    howToNote,
    nearestHockeyCountries,
    iihfMember: iihfMember || null,
    nationalTeams: nationalTeams || [],
    newest: {
      rinks: (newestRinks as any) || [],
      teams: (newestTeams as any) || [],
      players: (newestPlayers as any) || [],
      articles: (newestArticles as any) || [],
    },
    // Aggregate cities with 2+ rinks for the Hockey Cities section
    hockeyCities: (() => {
      const cityMap = new Map<string, number>();
      (rinks || []).forEach(r => {
        if (r.city) {
          const k = r.city.trim();
          cityMap.set(k, (cityMap.get(k) || 0) + 1);
        }
      });
      return Array.from(cityMap.entries())
        .filter(([, n]) => n >= 2)
        .map(([name]) => ({
          name,
          slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
          rinkCount: cityMap.get(name) || 0,
        }))
        .sort((a, b) => b.rinkCount - a.rinkCount);
    })(),
  };
}

export async function getCountryMetadata(countryName: string, countrySlug: string): Promise<Metadata> {
  const data = await getCountryPageData(countryName);
  const rinks = data.rinkCount;
  const teams = data.teamCount;
  const hasData = data.hasData;

  // Tier 1f (2026-07-07): apply noindex to country pages with no data. The
  // decision lives in one helper because all 155 country routes call this
  // function. Empty countries (hasData=false) are kept reachable for users
  // and search engines — the page shows the curated country context block,
  // league info, and a "how to get started" section — but Google drops the
  // empty page from its index via robotsMeta() below.
  // Binary gate: a country with no rinks/teams is noindex. Countries with
  // any listings are indexable — the CountryPageContent component always
  // renders 150+ unique words when hasData=true.
  const decision = { indexable: hasData, reason: hasData ? 'has data' : 'no data', uniquenessScore: hasData ? 50 : 0 };

  const title = hasData
    ? `Hockey in ${countryName} — ${rinks} Rinks, ${teams} Teams & Top Leagues`
    : `Hockey in ${countryName} — Directory, Leagues & How to Get Started`;

  const description = hasData
    ? `Find ice hockey rinks, teams, and leagues in ${countryName}. Browse ${rinks} rinks, ${teams} active teams, and the top leagues. ${data.info?.note || 'Complete hockey directory for players, parents, and fans.'}`
    : `Hockey directory for ${countryName}. Find nearby rinks, learn-to-play programs, and ${LEAGUE_INFO[countryName]?.note || 'how to get started in the sport.'}`;

  return {
    title,
    description,
    alternates: { canonical: `https://rinkstop.com/directory/${countrySlug}` },
+    // Country page structured data — entity + FAQPage
+    otherMeta: [
+      {
+        type: 'application/ld+json',
+        content: JSON.stringify({
+          '@context': 'https://schema.org',
+          '@type': 'FAQPage',
+          mainEntity: [
+            { '@type': 'Question', name: `How many ice rinks are in ${countryName}?`, acceptedAnswer: { '@type': 'Answer', text: `RinkStop lists ${rinks} ice rinks in ${countryName}.` } },
+            { '@type': 'Question', name: `What is the main hockey league in ${countryName}?`, acceptedAnswer: { '@type': 'Answer', text: topLeagueName ? `The top league is ${topLeagueName}.` : `${countryName} has multiple hockey leagues.` } },
+            { '@type': 'Question', name: `How do I start playing hockey in ${countryName}?`, acceptedAnswer: { '@type': 'Answer', text: `Most players start with learn-to-skate, then learn-to-play clinics at local rinks.` } },
+            { '@type': 'Question', name: `Is there women's hockey in ${countryName}?`, acceptedAnswer: { '@type': 'Answer', text: `Yes, ${countryName} has women's hockey programs and leagues.` } },
+            { '@type': 'Question', name: `Is hockey popular in ${countryName}?`, acceptedAnswer: { '@type': 'Answer', text: info?.note ? `${info.note}` : `Hockey has a dedicated community in ${countryName}.` } },
+          ],
+        }),
+      },
+    ],
    robots: robotsMeta(decision),
    openGraph: { title, description, type: 'website' },
  };
}

// Auto-deploy test: 2026-06-03
