import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Map URL slugs to proper country names
const COUNTRY_MAP: Record<string, string> = {
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
const COUNTRY_TO_IOC: Record<string, string> = {
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
const LEAGUE_INFO: Record<string, { league: string; note: string; iihfRank?: string; firstNhl?: string }> = {
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

function slugToCountry(slug: string): string {
  const lower = slug.toLowerCase();
  if (COUNTRY_MAP[lower]) return COUNTRY_MAP[lower];
  return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

// Map country → list of relevant tag words (for article matching)
const COUNTRY_TAGS: Record<string, string[]> = {
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

// Country-specific "how to play" notes (additive on top of the universal steps)
const HOW_TO_NOTES: Record<string, string> = {
  'United States': 'USA Hockey is the official governing body and runs the national team pipeline. Most learn-to-play programs are run through local rinks and require registration with USA Hockey.',
  'Canada': 'Hockey Canada oversees the national program. Most children start through the Canadian Tire First Shift program, which provides free equipment for first-time players.',
  'Finland': 'The Finnish Ice Hockey Association (Jääkiekkoliitto) oversees the national program. Most young Finns play organized hockey by age 7 through local clubs (seurat).',
  'Sweden': 'The Swedish Ice Hockey Association (Svenska Ishockeyförbundet) runs a famously well-organized development system. Most clubs accept children from age 5–6.',
  'Russia': 'Hockey in Russia is organized through the Federal Center for Training National Teams. Development pathways run through schools of Olympic Reserve and youth teams of KHL clubs.',
  'Germany': 'The German Ice Hockey Federation (Deutscher Eishockey-Bund) runs the national program. DEL clubs operate youth academies that accept players from age 6–7.',
  'Switzerland': 'Swiss Ice Hockey runs the national program. Most clubs offer beginner programs for children and adult recreational leagues for newcomers.',
  'Czech Republic': 'The Czech Ice Hockey Association organizes the national program. Most children start at local clubs between ages 5–7, and the country has produced NHL talent at the highest per-capita rate in modern history.',
};

interface Props {
  params: Promise<{ country: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { country: countrySlug } = await params;
  const countryName = slugToCountry(countrySlug);
  const info = LEAGUE_INFO[countryName];
  
  // Fetch counts for meta description
  const [{ count: rinkCount }, { count: teamCount }] = await Promise.all([
    supabase.from('rinks').select('*', { count: 'exact', head: true }).eq('country', countryName).eq('is_active', true),
    supabase.from('teams').select('*', { count: 'exact', head: true }).eq('country', countryName).eq('is_active', true),
  ]);

  const rinks = rinkCount ?? 0;
  const teams = teamCount ?? 0;
  const hasData = rinks > 0 || teams > 0;
  
  const title = hasData
    ? `Hockey in ${countryName} — ${rinks} Rinks, ${teams} Teams & Top Leagues | RinkStop`
    : `Hockey in ${countryName} — Directory, Leagues & How to Get Started | RinkStop`;
    
  const description = hasData
    ? `Find ice hockey rinks, teams, and leagues in ${countryName}. Browse ${rinks} rinks, ${teams} active teams, and the top leagues. ${info?.note || 'Complete hockey directory for players, parents, and fans.'}`
    : `Hockey directory for ${countryName}. Find nearby rinks, learn-to-play programs, and ${LEAGUE_INFO[countryName]?.note || 'how to get started in the sport.'}`;

  return {
    title,
    description,
    alternates: { canonical: `https://rinkstop.com/directory/${countrySlug}` },
    openGraph: { title, description, type: 'website' },
  };
}

export const dynamic = 'force-dynamic';

export default async function CountryPage({ params }: Props) {
  const { country: countrySlug } = await params;
  const countryName = slugToCountry(countrySlug);
  const iocCode = COUNTRY_TO_IOC[countryName];
  const info = LEAGUE_INFO[countryName];
  const howToNote = HOW_TO_NOTES[countryName];
  const relevantTags = COUNTRY_TAGS[countryName] || ['hockey', 'global-directory'];

  // Fetch all data in parallel
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
    // Leagues: match by country name OR by shared multi-country leagues (e.g., "USA/Canada")
    supabase.from('leagues').select('id, name, slug, level, logo_url, country').or(`country.eq.${countryName},country.ilike.%${countryName}%`).eq('is_active', true).order('level').limit(8),
    // Featured players: filter by IOC nationality code
    iocCode
      ? supabase.from('players').select('id, first_name, last_name, slug, position, nationality, headshot_url, team_id').eq('nationality', iocCode).eq('is_active', true).order('last_name').limit(8)
      : Promise.resolve({ data: null as any }),
    // Related articles: pull recent published posts, filter client-side by tag overlap
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

  // Fallback: if no tag matches, show latest 3 published posts
  const finalPosts = scoredPosts.length > 0
    ? scoredPosts
    : (relatedPosts || []).slice(0, 3);

  const hasData = (rinks && rinks.length > 0) || (teams && teams.length > 0);
  const rinkN = rinkCount ?? 0;
  const teamN = teamCount ?? 0;
  const leagueN = leagues?.length ?? 0;
  const playerN = players?.length ?? 0;

  // Build league name list for FAQ
  const topLeagueName = info?.league.split(',')[0] || (leagues?.[0]?.name ?? null);
  const womenLeague = leagues?.find(l => l.name.toLowerCase().includes('women') || l.name.toLowerCase().includes('sdhl') || l.name.toLowerCase().includes('naisten') || l.name.toLowerCase().includes('pwhl'));

  const bg = '#0a0a0a', card = '#0f0f0f', border = '#1e1e1e', red = '#C8102E', textMain = '#fff', textMuted = '#888', textDim = '#555';

  // FAQ schema (8 Q&As)
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: `How many ice rinks are in ${countryName}?`,
        acceptedAnswer: { '@type': 'Answer', text: `RinkStop currently lists ${rinkN} ice rinks in ${countryName}. The directory covers public arenas, private clubs, and training facilities.` },
      },
      {
        '@type': 'Question',
        name: `What is the main hockey league in ${countryName}?`,
        acceptedAnswer: { '@type': 'Answer', text: topLeagueName ? `The top professional hockey league in ${countryName} is the ${topLeagueName}.` : `${countryName} has multiple hockey leagues; browse the full list on this page.` },
      },
      {
        '@type': 'Question',
        name: `How do I start playing hockey in ${countryName}?`,
        acceptedAnswer: { '@type': 'Answer', text: `Most players in ${countryName} start with a learn-to-skate program, then progress to a learn-to-play clinic through a local rink or club. The "How to play" section below has a step-by-step pathway.` },
      },
      {
        '@type': 'Question',
        name: `Is there women's hockey in ${countryName}?`,
        acceptedAnswer: { '@type': 'Answer', text: womenLeague ? `Yes. ${womenLeague.name} is a women's hockey league in ${countryName}. Many local rinks also run women-only recreational leagues.` : `Yes, ${countryName} has women's hockey programs. Most rinks run women-only recreational leagues in addition to any national women's league.` },
      },
      {
        '@type': 'Question',
        name: `Is hockey popular in ${countryName}?`,
        acceptedAnswer: { '@type': 'Answer', text: info?.note ? `Hockey in ${countryName}: ${info.note}. IIHF ranking: ${info.iihfRank ?? 'unranked'}.` : `Hockey has a dedicated community in ${countryName}. Browse the rinks, teams, and leagues listed on this page to see the local scene.` },
      },
      {
        '@type': 'Question',
        name: `How many registered hockey teams are in ${countryName}?`,
        acceptedAnswer: { '@type': 'Answer', text: `RinkStop's directory lists ${teamN} active hockey teams in ${countryName} across all levels and age groups.` },
      },
      {
        '@type': 'Question',
        name: `What is the IIHF ranking of ${countryName}?`,
        acceptedAnswer: { '@type': 'Answer', text: info?.iihfRank ? `${countryName} is ranked ${info.iihfRank} in the IIHF World Ranking.` : `${countryName} is currently outside the IIHF top division. National program development is ongoing.` },
      },
      {
        '@type': 'Question',
        name: `Can my child start hockey at any age in ${countryName}?`,
        acceptedAnswer: { '@type': 'Answer', text: `Yes. Most programs in ${countryName} accept beginners from age 5–6, and many rinks offer adult learn-to-play programs for any age above 18.` },
      },
    ],
  };

  // Breadcrumb schema
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://rinkstop.com' },
      { '@type': 'ListItem', position: 2, name: 'Directory', item: 'https://rinkstop.com/directory' },
      { '@type': 'ListItem', position: 3, name: countryName, item: `https://rinkstop.com/directory/${countrySlug}` },
    ],
  };

  // ItemList schema for rinks
  const rinksListSchema = rinks && rinks.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Ice rinks in ${countryName}`,
    numberOfItems: rinkN,
    itemListElement: rinks.slice(0, 10).map((r, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: { '@type': 'IceRink', name: r.name, address: r.address, url: r.website_url || `https://rinkstop.com/directory/rinks/${r.slug || r.id}` },
    })),
  } : null;

  // ItemList schema for teams
  const teamsListSchema = teams && teams.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Hockey teams in ${countryName}`,
    numberOfItems: teamN,
    itemListElement: teams.slice(0, 10).map((t, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: { '@type': 'SportsTeam', name: t.name, url: `https://rinkstop.com/directory/teams/${t.slug || t.id}` },
    })),
  } : null;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      {rinksListSchema && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(rinksListSchema) }} />}
      {teamsListSchema && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(teamsListSchema) }} />}

      <div style={{ background: bg, color: textMain, minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
        {/* Breadcrumb */}
        <div style={{ borderBottom: `1px solid ${border}`, background: '#0f0f0f' }}>
          <div style={{ maxWidth: 1280, margin: '0 auto', padding: '12px 24px' }}>
            <nav style={{ fontSize: 13, color: textDim }}>
              <a href="/" style={{ color: textDim, textDecoration: 'none' }}>Home</a>
              <span style={{ margin: '0 6px' }}>›</span>
              <a href="/directory" style={{ color: textDim, textDecoration: 'none' }}>Directory</a>
              <span style={{ margin: '0 6px' }}>›</span>
              <span style={{ color: textMuted }}>{countryName}</span>
            </nav>
          </div>
        </div>

        {/* Hero */}
        <header style={{ maxWidth: 1280, margin: '0 auto', padding: '64px 24px 32px', textAlign: 'center' }}>
          <h1 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: 'clamp(2.5rem, 8vw, 4rem)', color: textMain, letterSpacing: '0.04em', lineHeight: 1, marginBottom: 16 }}>
            HOCKEY IN {countryName.toUpperCase()}
          </h1>
          <p style={{ color: textMuted, fontSize: 16, maxWidth: 640, margin: '0 auto 24px' }}>
            {hasData 
              ? `${info?.note || `Browse the complete hockey directory for ${countryName}.`}`
              : `Hockey has a growing presence in ${countryName}. Browse the directory, learn-to-play resources, and the closest active hockey countries.`
            }
          </p>
        </header>

        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px 80px' }}>

          {/* Stats Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 32 }}>
            <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 10, padding: '18px 14px', textAlign: 'center' }}>
              <div style={{ fontSize: 30, fontWeight: 800, color: red, lineHeight: 1 }}>{rinkN}</div>
              <div style={{ fontSize: 12, color: textMuted, marginTop: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ice Rinks</div>
            </div>
            <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 10, padding: '18px 14px', textAlign: 'center' }}>
              <div style={{ fontSize: 30, fontWeight: 800, color: red, lineHeight: 1 }}>{teamN}</div>
              <div style={{ fontSize: 12, color: textMuted, marginTop: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Teams</div>
            </div>
            <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 10, padding: '18px 14px', textAlign: 'center' }}>
              <div style={{ fontSize: 30, fontWeight: 800, color: red, lineHeight: 1 }}>{leagueN}</div>
              <div style={{ fontSize: 12, color: textMuted, marginTop: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Leagues</div>
            </div>
            <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 10, padding: '18px 14px', textAlign: 'center' }}>
              <div style={{ fontSize: 30, fontWeight: 800, color: red, lineHeight: 1 }}>{playerN}</div>
              <div style={{ fontSize: 12, color: textMuted, marginTop: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Players</div>
            </div>
            {info?.iihfRank && (
              <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 10, padding: '18px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: 30, fontWeight: 800, color: red, lineHeight: 1 }}>{info.iihfRank}</div>
                <div style={{ fontSize: 12, color: textMuted, marginTop: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>IIHF Rank</div>
              </div>
            )}
            {info?.firstNhl && (
              <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 10, padding: '18px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: 30, fontWeight: 800, color: red, lineHeight: 1 }}>{info.firstNhl}</div>
                <div style={{ fontSize: 12, color: textMuted, marginTop: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>First NHL Player</div>
              </div>
            )}
          </div>

          {/* No data state */}
          {!hasData && (
            <div style={{ textAlign: 'center', padding: '60px 24px', background: card, border: `1px solid ${border}`, borderRadius: 12, marginBottom: 48 }}>
              <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🏒</div>
              <h2 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '1.75rem', color: textMain, marginBottom: '0.75rem' }}>
                NO HOCKEY LISTINGS IN {countryName.toUpperCase()} YET
              </h2>
              <p style={{ color: textMuted, fontSize: 16, maxWidth: 480, margin: '0 auto 1.5rem' }}>
                Know a hockey team, rink, or league in {countryName}? Help us grow the world&apos;s hockey directory!
              </p>
              <Link href="/add-listing" style={{ display: 'inline-block', background: red, color: '#fff', padding: '12px 24px', borderRadius: 6, fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
                + Add Hockey in {countryName}
              </Link>
            </div>
          )}

          {/* Hockey Ecosystem Snapshot */}
          {(info || hasData) && (
            <section style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, padding: '24px 28px', marginBottom: 48 }}>
              <h2 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: 22, letterSpacing: '0.04em', color: textMain, marginBottom: 12 }}>
                Hockey ecosystem in {countryName}
              </h2>
              <p style={{ color: textMuted, fontSize: 15, lineHeight: 1.6, margin: 0 }}>
                {howToNote
                  ? howToNote
                  : hasData
                    ? `${countryName} has ${rinkN} ice rinks and ${teamN} active teams in the RinkStop directory, spanning ${leagueN} leagues across multiple levels. ${info?.note || ''}`
                    : `Hockey is an emerging or developing sport in ${countryName}. The page below includes learn-to-play resources and the closest established hockey markets.`
                }
              </p>
            </section>
          )}

          {/* Leagues Section */}
          {leagues && leagues.length > 0 && (
            <section style={{ marginBottom: 48 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16, borderLeft: `4px solid ${red}`, paddingLeft: 14 }}>
                <h2 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: 26, letterSpacing: '0.04em', color: textMain, margin: 0 }}>
                  Hockey Leagues in {countryName}
                </h2>
                <Link href="/directory/leagues" style={{ fontSize: 12, color: red, textDecoration: 'none', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  All leagues →
                </Link>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
                {leagues.map(l => (
                  <Link key={l.id} href={`/directory/leagues/${l.slug}`} style={{ background: card, border: `1px solid ${border}`, borderRadius: 8, padding: '14px 16px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
                    {l.logo_url ? (
                      <img src={l.logo_url} alt="" style={{ width: 32, height: 32, objectFit: 'contain', flexShrink: 0, borderRadius: 4 }} />
                    ) : (
                      <div style={{ width: 32, height: 32, borderRadius: 4, background: '#1a1a1a', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🏆</div>
                    )}
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: textMain, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.name}</div>
                      <div style={{ fontSize: 11, color: textMuted, textTransform: 'capitalize' }}>{l.level}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Teams Section */}
          {teams && teams.length > 0 && (
            <section style={{ marginBottom: 48 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16, borderLeft: `4px solid ${red}`, paddingLeft: 14 }}>
                <h2 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: 26, letterSpacing: '0.04em', color: textMain, margin: 0 }}>
                  Hockey Teams in {countryName}
                </h2>
                <Link href={`/directory/teams`} style={{ fontSize: 12, color: red, textDecoration: 'none', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  All {teamN} teams →
                </Link>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
                {teams.map(team => (
                  <Link key={team.id} href={`/directory/teams/${team.slug || team.id}`} style={{ background: card, border: `1px solid ${border}`, borderRadius: 8, padding: '14px 16px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
                    {team.logo_url ? (
                      <img src={team.logo_url} alt="" style={{ width: 28, height: 28, objectFit: 'contain', flexShrink: 0, borderRadius: 4 }} />
                    ) : (
                      <div style={{ width: 28, height: 28, borderRadius: 4, background: '#1a1a1a', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🏒</div>
                    )}
                    <span style={{ fontSize: 14, fontWeight: 600, color: textMain, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{team.name}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Rinks Section */}
          {rinks && rinks.length > 0 && (
            <section style={{ marginBottom: 48 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16, borderLeft: `4px solid ${red}`, paddingLeft: 14 }}>
                <h2 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: 26, letterSpacing: '0.04em', color: textMain, margin: 0 }}>
                  Ice Rinks in {countryName}
                </h2>
                <Link href="/directory/rinks" style={{ fontSize: 12, color: red, textDecoration: 'none', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Browse all →
                </Link>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
                {rinks.map(rink => (
                  <article key={rink.id} style={{ background: card, border: `1px solid ${border}`, borderRadius: 10, padding: 18 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: textMain, marginBottom: 4 }}>
                      <Link href={`/directory/rinks/${rink.slug || rink.id}`} style={{ color: textMain, textDecoration: 'none' }}>{rink.name}</Link>
                    </h3>
                    {rink.city && <div style={{ fontSize: 13, color: textMuted, marginBottom: 8 }}>{rink.city}{rink.address ? `, ${countryName}` : ''}</div>}
                    {rink.address && <div style={{ fontSize: 12, color: textDim, marginBottom: 4 }}>📍 {rink.address}</div>}
                    {rink.phone && <div style={{ fontSize: 12, color: textDim, marginBottom: 4 }}>📞 {rink.phone}</div>}
                    {rink.website_url && <a href={rink.website_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: red, textDecoration: 'none' }}>🌐 Visit website →</a>}
                  </article>
                ))}
              </div>
            </section>
          )}

          {/* Featured Players Section */}
          {players && players.length > 0 && (
            <section style={{ marginBottom: 48 }}>
              <h2 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: 26, letterSpacing: '0.04em', color: textMain, marginBottom: 16, borderLeft: `4px solid ${red}`, paddingLeft: 14 }}>
                Featured Hockey Players from {countryName}
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
                {players.map(p => (
                  <Link key={p.id} href={`/directory/players/${p.slug || p.id}`} style={{ background: card, border: `1px solid ${border}`, borderRadius: 8, padding: '14px 12px', textDecoration: 'none', textAlign: 'center' }}>
                    {p.headshot_url ? (
                      <img src={p.headshot_url} alt="" style={{ width: 56, height: 56, objectFit: 'cover', flexShrink: 0, borderRadius: '50%', margin: '0 auto 8px', display: 'block' }} />
                    ) : (
                      <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#1a1a1a', margin: '0 auto 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🧑</div>
                    )}
                    <div style={{ fontSize: 13, fontWeight: 700, color: textMain, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.first_name} {p.last_name}
                    </div>
                    {p.position && <div style={{ fontSize: 11, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>{p.position}</div>}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* How to Play Hockey in {Country} — Reusable Section */}
          <section style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, padding: '32px 28px', marginBottom: 48 }}>
            <h2 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: 26, letterSpacing: '0.04em', color: textMain, marginBottom: 8, borderLeft: `4px solid ${red}`, paddingLeft: 14 }}>
              How to Play Hockey in {countryName}
            </h2>
            <p style={{ color: textMuted, fontSize: 15, lineHeight: 1.6, marginBottom: 20 }}>
              A practical guide for beginners, newcomers to {countryName}, and parents looking to get their child into the sport.
            </p>
            <ol style={{ color: textMain, fontSize: 15, lineHeight: 1.7, paddingLeft: 0, listStyle: 'none', counterReset: 'step-counter', display: 'grid', gap: 14 }}>
              {[
                { title: 'Learn to skate first', body: `Most hockey players in ${countryName} start with skating lessons. Many rinks run learn-to-skate programs for ages 3+ that teach the basics of balance, edges, and stopping — the foundations of hockey.` },
                { title: 'Try a learn-to-play clinic', body: `Most local rinks and clubs run learn-to-play programs for beginners. These typically run 6–8 weeks, provide loaner equipment, and cost between $50–$300. ${hasData ? `Browse rinks above and contact one directly to ask about upcoming sessions.` : 'Search for nearby rinks in the closest active hockey country.'}` },
                { title: 'Join a youth or adult recreational team', body: `After learn-to-play, most players in ${countryName} join a house league or recreational team. These run weekly practices and games at the local rink and are the most common entry point to organized hockey.` },
                { title: 'Register with the national federation', body: `${info ? LEAGUE_INFO[countryName]?.note || '' : `Most countries require player registration with the national ice hockey federation.`} In the US this is USA Hockey, in Canada it's Hockey Canada, and in Europe each country has its own federation. Registration is typically annual and includes insurance.` },
                { title: 'Progress through the development pathway', body: `Talented players in ${countryName} typically progress through age-group teams (U8, U10, U12...) into travel or select teams, then junior leagues, and eventually professional or collegiate hockey. The pathway differs by country but generally follows the IIHF development model.` },
              ].map((step, i) => (
                <li key={i} style={{ counterIncrement: 'step-counter', display: 'grid', gridTemplateColumns: '32px 1fr', gap: 12, alignItems: 'start' }}>
                  <div style={{ background: red, color: '#fff', width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, flexShrink: 0 }}>{i + 1}</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: textMain, marginBottom: 2 }}>{step.title}</div>
                    <div style={{ color: textMuted, fontSize: 14, lineHeight: 1.55 }}>{step.body}</div>
                  </div>
                </li>
              ))}
            </ol>
            <div style={{ marginTop: 24, padding: '14px 18px', background: 'rgba(200,16,46,0.08)', border: '1px solid rgba(200,16,46,0.25)', borderRadius: 8 }}>
              <div style={{ fontSize: 13, color: textMain, fontWeight: 600, marginBottom: 4 }}>Know something we&apos;re missing?</div>
              <div style={{ fontSize: 13, color: textMuted, lineHeight: 1.5 }}>
                Help us keep the {countryName} hockey directory accurate.{' '}
                <Link href="/add-listing" style={{ color: red, textDecoration: 'underline' }}>Add or update a rink, team, or league →</Link>
              </div>
            </div>
          </section>

          {/* Related Articles */}
          {finalPosts && finalPosts.length > 0 && (
            <section style={{ marginBottom: 48 }}>
              <h2 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: 26, letterSpacing: '0.04em', color: textMain, marginBottom: 16, borderLeft: `4px solid ${red}`, paddingLeft: 14 }}>
                Related Hockey Articles
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {finalPosts.map(post => (
                  <Link key={post.id} href={`/blog/${post.slug}`} style={{ background: card, border: `1px solid ${border}`, borderRadius: 8, padding: '16px 20px', textDecoration: 'none', display: 'block' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        {post.category && (
                          <span style={{ display: 'inline-block', fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '2px 6px', borderRadius: 3, background: 'rgba(200,16,46,0.15)', color: red, marginBottom: 6 }}>
                            {post.category}
                          </span>
                        )}
                        <div style={{ fontWeight: 700, fontSize: 15, color: textMain, lineHeight: 1.35, marginBottom: 4 }}>{post.title}</div>
                        {post.subtitle && <div style={{ color: textMuted, fontSize: 13, lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden' }}>{post.subtitle}</div>}
                        <div style={{ display: 'flex', gap: 8, fontSize: 11, color: textDim, marginTop: 6 }}>
                          <span>{post.author_name || 'Arnel'}</span>
                          <span>·</span>
                          <span>{post.reading_time_minutes || 5} min read</span>
                        </div>
                      </div>
                      <span style={{ color: red, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0 }}>Read →</span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* FAQ Section (visible) */}
          <section style={{ marginBottom: 48 }}>
            <h2 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: 26, letterSpacing: '0.04em', color: textMain, marginBottom: 20, borderLeft: `4px solid ${red}`, paddingLeft: 14 }}>
              Frequently Asked Questions About Hockey in {countryName}
            </h2>
            <div style={{ display: 'grid', gap: 10 }}>
              {faqSchema.mainEntity.map((q, i) => (
                <details key={i} style={{ background: card, border: `1px solid ${border}`, borderRadius: 8, padding: '14px 18px' }}>
                  <summary style={{ fontWeight: 700, fontSize: 15, color: textMain, cursor: 'pointer', listStyle: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                    <span>{q.name}</span>
                    <span style={{ color: red, fontSize: 18, flexShrink: 0 }}>+</span>
                  </summary>
                  <p style={{ color: textMuted, fontSize: 14, lineHeight: 1.6, marginTop: 10, marginBottom: 0 }}>
                    {q.acceptedAnswer.text}
                  </p>
                </details>
              ))}
            </div>
          </section>

          {/* Back to Directory */}
          <div style={{ textAlign: 'center', marginTop: 48 }}>
            <Link href="/directory" style={{ color: red, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>← Browse all countries</Link>
          </div>
        </div>
      </div>
    </>
  );
}
