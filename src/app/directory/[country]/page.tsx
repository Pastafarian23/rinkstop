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
  // Add all other countries...
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

// League info for top countries
const LEAGUE_INFO: Record<string, { league: string; note: string }> = {
  'United States': { league: 'NHL, NCAA, USHL', note: 'Fastest-growing hockey market globally' },
  'Canada': { league: 'NHL, OHL, WHL, QMJHL', note: 'Hockey\'s birthplace and powerhouse' },
  'Russia': { league: 'KHL, MHL, VHL', note: 'World\'s second-best league after NHL' },
  'Sweden': { league: 'SHL, Hockeyallsvenskan', note: 'Top player development system' },
  'Finland': { league: 'Liiga, Mestis', note: 'Per-capita hockey power' },
  'Germany': { league: 'DEL, DEL2', note: 'Growing NHL pipeline' },
  'Switzerland': { league: 'NL, SL', note: 'High-quality league, neutral host' },
  'Czech Republic': { league: 'Extraliga, 1. Liga', note: 'Rich hockey tradition' },
  'Norway': { league: 'Fjordkraft-Ligaen', note: 'Rapidly improving program' },
  'France': { league: 'Ligue Magnus', note: 'Growing NHL interest' },
  'Austria': { league: 'ICEHL, EBEL', note: 'Alpine hockey tradition' },
  'Italy': { league: 'Serie A', note: 'Mediterranean hockey hub' },
  'Australia': { league: 'AIHL', note: 'Growing Down Under' },
  'Netherlands': { league: 'Eredivisie', note: 'Dutch hockey progressing' },
  'Japan': { league: 'BHL', note: 'Asia\'s most developed program' },
  'South Korea': { league: 'KHL, Asia League', note: 'Rapidly rising program' },
  'China': { league: 'CWHL', note: 'Fastest-growing market' },
  'Denmark': { league: 'Metal Ligaen', note: 'Strong international results' },
  'New Zealand': { league: 'NZIHL', note: 'Oceania hockey entry point' },
  'United Kingdom': { league: 'EIHL, NIHL', note: 'UK hockey expanding' },
  'Mexico': { league: 'LNHHB', note: 'Growing in North America' },
};

function slugToCountry(slug: string): string {
  const lower = slug.toLowerCase();
  if (COUNTRY_MAP[lower]) return COUNTRY_MAP[lower];
  // Fallback: capitalize first letter of each word
  return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

interface Props {
  params: Promise<{ country: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { country: countrySlug } = await params;
  const countryName = slugToCountry(countrySlug);
  const info = LEAGUE_INFO[countryName];
  
  return {
    title: `Hockey in ${countryName} | RinkStop`,
    description: info 
      ? `${countryName} hockey: find ice rinks, teams, and leagues. ${info.note}.`
      : `Find ice hockey teams, rinks, and leagues in ${countryName}. Hockey directory and community.`,
    alternates: { canonical: `https://rinkstop.com/directory/${countrySlug}` },
  };
}

export const dynamic = 'force-dynamic';

export default async function CountryPage({ params }: Props) {
  const { country: countrySlug } = await params;
  const countryName = slugToCountry(countrySlug);
  
  const [{ data: rinks }, { data: teams }, { count: rinkCount }] = await Promise.all([
    supabase.from('rinks').select('id, slug, name, city, address, phone, website_url').eq('country', countryName).eq('is_active', true).order('name').limit(50),
    supabase.from('teams').select('id, name, slug, logo_url').eq('country', countryName).eq('is_active', true).order('name').limit(20),
    supabase.from('rinks').select('*', { count: 'exact', head: true }).eq('country', countryName).eq('is_active', true),
  ]);

  const hasData = (rinks && rinks.length > 0) || (teams && teams.length > 0);
  const info = LEAGUE_INFO[countryName];

  const bg = '#0a0a0a', card = '#0f0f0f', border = '#1e1e1e', red = '#C8102E', textMain = '#fff', textMuted = '#888', textDim = '#555';

  // FAQ schema
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: `How many ice rinks are in ${countryName}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: hasData 
            ? `${countryName} has ${rinkCount ?? 0} ice rinks in our directory. ${info?.note || ''}`
            : `We don't have ice rink data for ${countryName} yet. Know a rink? Help us by adding it!`,
        },
      },
      {
        '@type': 'Question',
        name: `What is the main hockey league in ${countryName}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: info 
            ? `The main hockey league in ${countryName} is the ${info.league}.`
            : `We're researching hockey leagues in ${countryName}. Check back soon or help us document it!`,
        },
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

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

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
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '80px 24px', textAlign: 'center' }}>
          <h1 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: 'clamp(2.5rem, 8vw, 4rem)', color: textMain, letterSpacing: '0.04em', lineHeight: 1, marginBottom: 16 }}>
            HOCKEY IN {countryName.toUpperCase()}
          </h1>
          <p style={{ color: textMuted, fontSize: 16, maxWidth: 520, margin: '0 auto' }}>
            {hasData 
              ? `${rinkCount ?? 0} ice rinks. ${info?.note || ''}`
              : `No hockey listings yet. Be the first to add hockey in ${countryName}!`
            }
          </p>
        </div>

        {/* Content */}
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px 80px' }}>

          {/* Stats (if has data) */}
          {hasData && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 48 }}>
              <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, padding: '20px', textAlign: 'center' }}>
                <div style={{ fontSize: 32, fontWeight: 800, color: red }}>{rinkCount ?? 0}</div>
                <div style={{ fontSize: 13, color: textMuted }}>Ice Rinks</div>
              </div>
              <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, padding: '20px', textAlign: 'center' }}>
                <div style={{ fontSize: 32, fontWeight: 800, color: red }}>{teams?.length ?? 0}</div>
                <div style={{ fontSize: 13, color: textMuted }}>Teams</div>
              </div>
              {info && (
                <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, padding: '20px', textAlign: 'center' }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: red }}>{info.league.split(',')[0]}</div>
                  <div style={{ fontSize: 13, color: textMuted }}>Top League</div>
                </div>
              )}
            </div>
          )}

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

          {/* Teams */}
          {teams && teams.length > 0 && (
            <div style={{ marginBottom: 48 }}>
              <h2 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: 28, letterSpacing: '0.04em', borderLeft: `4px solid ${red}`, paddingLeft: 16, marginBottom: 24, color: textMain }}>
                TEAMS IN {countryName.toUpperCase()}
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                {teams.map(team => (
                  <Link key={team.id} href={`/directory/teams/${team.slug || team.id}`} style={{ background: card, border: `1px solid ${border}`, borderRadius: 8, padding: '14px 16px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: textMain }}>{team.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Rinks */}
          {rinks && rinks.length > 0 && (
            <div style={{ marginBottom: 48 }}>
              <h2 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: 28, letterSpacing: '0.04em', borderLeft: `4px solid ${red}`, paddingLeft: 16, marginBottom: 24, color: textMain }}>
                ICE RINKS IN {countryName.toUpperCase()}
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                {rinks.map(rink => (
                  <div key={rink.id} style={{ background: card, border: `1px solid ${border}`, borderRadius: 10, padding: 20 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: textMain, marginBottom: 4 }}>{rink.name}</h3>
                    <div style={{ fontSize: 13, color: textMuted, marginBottom: 8 }}>{rink.city ?? ''}</div>
                    {rink.address && <div style={{ fontSize: 12, color: textDim, marginBottom: 4 }}>{rink.address}</div>}
                    {rink.phone && <div style={{ fontSize: 12, color: textDim, marginBottom: 4 }}>📞 {rink.phone}</div>}
                    {rink.website_url && <a href={rink.website_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: red, textDecoration: 'none' }}>🌐 Website →</a>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Back to Directory */}
          <div style={{ textAlign: 'center', marginTop: 48 }}>
            <Link href="/directory" style={{ color: red, fontSize: 14 }}>← Browse all countries</Link>
          </div>
        </div>
      </div>
    </>
  );
}
