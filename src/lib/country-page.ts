import type { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';

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
  'czech-republic': 'Czech Republic', 'czechia': 'Czech Republic',
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

// League info for top countries
export const LEAGUE_INFO: Record<string, { league: string; note: string; iihfRank?: string; firstNhl?: string }> = {
  'United States': { league: 'NHL, NCAA, USHL', note: 'Fastest-growing hockey market globally', iihfRank: '—', firstNhl: '1924' },
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

export interface CountryPageData {
  countryName: string;
  countrySlug: string;
  rinks: any[];
  teams: any[];
  rinkCount: number;
  teamCount: number;
  leagues: any[];
  players: any[];
  relatedPosts: any[];
  finalPosts: any[];
  hasData: boolean;
  info: { league: string; note: string; iihfRank?: string; firstNhl?: string } | undefined;
  howToNote: string | undefined;
}

export async function getCountryPageData(countryName: string): Promise<CountryPageData> {
  const countrySlug = countryToSlug(countryName);
  const iocCode = COUNTRY_TO_IOC[countryName];
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
  ] = await Promise.all([
    supabase.from('rinks').select('id, slug, name, city, address, phone, website_url').eq('country', countryName).eq('is_active', true).order('name').limit(50),
    supabase.from('teams').select('id, name, slug, logo_url, city, league_id').eq('country', countryName).eq('is_active', true).order('name').limit(20),
    supabase.from('rinks').select('*', { count: 'exact', head: true }).eq('country', countryName).eq('is_active', true),
    supabase.from('teams').select('*', { count: 'exact', head: true }).eq('country', countryName).eq('is_active', true),
    supabase.from('leagues').select('id, name, slug, level, logo_url, country').or(`country.eq.${countryName},country.ilike.%${countryName}%`).eq('is_active', true).order('level').limit(8),
    iocCode
      ? supabase.from('players').select('id, first_name, last_name, slug, position, nationality, headshot_url, team_id').eq('nationality', iocCode).eq('is_active', true).order('last_name').limit(8)
      : Promise.resolve({ data: null as any }),
    supabase.from('posts').select('id, slug, title, subtitle, category, tags, author_name, reading_time_minutes, published_at').eq('status', 'published').order('published_at', { ascending: false }).limit(30),
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

  return {
    countryName,
    countrySlug,
    rinks: rinks || [],
    teams: teams || [],
    rinkCount: rinkCount ?? 0,
    teamCount: teamCount ?? 0,
    leagues: leagues || [],
    players: players || [],
    relatedPosts: relatedPosts || [],
    finalPosts: finalPosts || [],
    hasData,
    info,
    howToNote,
  };
}

export async function getCountryMetadata(countryName: string, countrySlug: string): Promise<Metadata> {
  const data = await getCountryPageData(countryName);
  const rinks = data.rinkCount;
  const teams = data.teamCount;
  const hasData = data.hasData;

  const title = hasData
    ? `Hockey in ${countryName} — ${rinks} Rinks, ${teams} Teams & Top Leagues | RinkStop`
    : `Hockey in ${countryName} — Directory, Leagues & How to Get Started | RinkStop`;

  const description = hasData
    ? `Find ice hockey rinks, teams, and leagues in ${countryName}. Browse ${rinks} rinks, ${teams} active teams, and the top leagues. ${data.info?.note || 'Complete hockey directory for players, parents, and fans.'}`
    : `Hockey directory for ${countryName}. Find nearby rinks, learn-to-play programs, and ${LEAGUE_INFO[countryName]?.note || 'how to get started in the sport.'}`;

  return {
    title,
    description,
    alternates: { canonical: `https://rinkstop.com/directory/${countrySlug}` },
    openGraph: { title, description, type: 'website' },
  };
}

// Auto-deploy test: 2026-06-03
