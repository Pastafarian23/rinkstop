import type { Metadata } from 'next';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

// US state abbreviations and full names
const US_STATES: Record<string, string> = {
  'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR', 'california': 'CA',
  'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE', 'florida': 'FL', 'georgia': 'GA',
  'hawaii': 'HI', 'idaho': 'ID', 'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA',
  'kansas': 'KS', 'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
  'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS', 'missouri': 'MO',
  'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV', 'new-hampshire': 'NH', 'new-jersey': 'NJ',
  'new-mexico': 'NM', 'new-york': 'NY', 'north-carolina': 'NC', 'north-dakota': 'ND', 'ohio': 'OH',
  'oklahoma': 'OK', 'oregon': 'OR', 'pennsylvania': 'PA', 'rhode-island': 'RI', 'south-carolina': 'SC',
  'south-dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT', 'vermont': 'VT',
  'virginia': 'VA', 'washington': 'WA', 'west-virginia': 'WV', 'wisconsin': 'WI', 'wyoming': 'WY',
  'district-of-columbia': 'DC',
};

const STATE_NAMES: Record<string, string> = {
  'al': 'Alabama', 'ak': 'Alaska', 'az': 'Arizona', 'ar': 'Arkansas', 'ca': 'California',
  'co': 'Colorado', 'ct': 'Connecticut', 'de': 'Delaware', 'fl': 'Florida', 'ga': 'Georgia',
  'hi': 'Hawaii', 'id': 'Idaho', 'il': 'Illinois', 'in': 'Indiana', 'ia': 'Iowa',
  'ks': 'Kansas', 'ky': 'Kentucky', 'la': 'Louisiana', 'me': 'Maine', 'md': 'Maryland',
  'ma': 'Massachusetts', 'mi': 'Michigan', 'mn': 'Minnesota', 'ms': 'Mississippi', 'mo': 'Missouri',
  'mt': 'Montana', 'ne': 'Nebraska', 'nv': 'Nevada', 'nh': 'New Hampshire', 'nj': 'New Jersey',
  'nm': 'New Mexico', 'ny': 'New York', 'nc': 'North Carolina', 'nd': 'North Dakota', 'oh': 'Ohio',
  'ok': 'Oklahoma', 'or': 'Oregon', 'pa': 'Pennsylvania', 'ri': 'Rhode Island', 'sc': 'South Carolina',
  'sd': 'South Dakota', 'tn': 'Tennessee', 'tx': 'Texas', 'ut': 'Utah', 'vt': 'Vermont',
  'va': 'Virginia', 'wa': 'Washington', 'wv': 'West Virginia', 'wi': 'Wisconsin', 'wy': 'Wyoming',
  'dc': 'District of Columbia',
};

const STATE_HOCKEY_FACTS: Record<string, { nhlTeams?: string; notableLeagues?: string; youthHockey?: string }> = {
  'NY': { nhlTeams: 'New York Rangers, Buffalo Sabres, New York Islanders', notableLeagues: 'NHL, AHL, ECHL', youthHockey: 'Second most registered youth hockey players in the US' },
  'MA': { nhlTeams: 'Boston Bruins', notableLeagues: 'NCAA D1 (Boston College, Boston University)', youthHockey: 'Most registered youth hockey players per capita in the US' },
  'MN': { nhlTeams: 'Minnesota Wild', notableLeagues: 'NCAA D1 (University of Minnesota), USHL', youthHockey: 'Third most registered youth hockey players, "State of Hockey"' },
  'MI': { nhlTeams: 'Detroit Red Wings', notableLeagues: 'NCAA D1 (Michigan, Michigan State)', youthHockey: 'Fourth most registered youth hockey players' },
  'PA': { nhlTeams: 'Pittsburgh Penguins, Philadelphia Flyers', notableLeagues: 'NHL, AHL (Lehigh Valley, Wilkes-Barre)', youthHockey: 'Top 5 youth hockey state' },
  'CA': { nhlTeams: 'Los Angeles Kings, San Jose Sharks, Anaheim Ducks, Vegas Golden Knights, Seattle Kraken', notableLeagues: 'NHL, AHL, NCAA', youthHockey: 'Fastest growing youth hockey market in the US' },
  'TX': { nhlTeams: 'Dallas Stars, Austin (NHL expansion rumored)', notableLeagues: 'NHL, NAHL, USHL', youthHockey: 'Rapidly growing market with multiple NHL teams' },
  'CO': { nhlTeams: 'Colorado Avalanche', notableLeagues: 'NHL, NCAA (Colorado College, Denver)', youthHockey: 'Strong youth hockey growth, home of Avalanche' },
  'IL': { nhlTeams: 'Chicago Blackhawks', notableLeagues: 'NHL, AHL (Rockford), USHL', youthHockey: 'Major youth hockey market with rich history' },
  'FL': { nhlTeams: 'Florida Panthers, Tampa Bay Lightning', notableLeagues: 'NHL, ECHL', youthHockey: 'Fastest growing youth hockey market in the country' },
};

interface CityData {
  city: string;
  rink_count: number;
  team_count: number;
}

export async function generateMetadata({ params }: { params: Promise<{ state: string }> }): Promise<Metadata> {
  const { state: stateSlug } = await params;
  const stateAbbr = US_STATES[stateSlug] || stateSlug.toUpperCase();
  const stateName = STATE_NAMES[stateAbbr.toLowerCase()] || stateSlug.replace(/-/g, ' ');

  return {
    title: `${stateName} Hockey - Ice Rinks, Teams & Leagues`,
    description: `Find every hockey rink, team, and league in ${stateName}. Discover youth programs, adult leagues, and NCAA teams near you.`,
    alternates: {
      canonical: `https://rinkstop.com/directory/united-states/${stateSlug}`,
    },
    openGraph: {
      title: `${stateName} Hockey`,
      description: `Hockey in ${stateName}: ice rinks, teams, leagues, and youth programs.`,
      type: 'website',
    },
  };
}

export const dynamic = 'force-dynamic';

export default async function USStatePage({ params }: { params: Promise<{ state: string }> }) {
  const { state: stateSlug } = await params;
  
  const stateAbbr = US_STATES[stateSlug] || stateSlug.toUpperCase();
  const stateName = STATE_NAMES[stateAbbr.toLowerCase()] || stateSlug.replace(/-/g, ' ');
  const hockeyFacts = STATE_HOCKEY_FACTS[stateAbbr] || {};

  // Get rinks in this state
  const { data: rinks } = await supabase
    .from('rinks')
    .select('city')
    .eq('country', 'United States')
    .eq('province_state', stateAbbr)
    .eq('is_active', true)
    .not('city', 'is', null);

  // Count rinks per city
  const rinkCounts = new Map<string, number>();
  (rinks || []).forEach(r => {
    if (r.city) {
      rinkCounts.set(r.city, (rinkCounts.get(r.city) || 0) + 1);
    }
  });

  // Get teams by city
  const cityNames = Array.from(rinkCounts.keys());
  let teamCounts = new Map<string, number>();
  
  if (cityNames.length > 0) {
    const { data: teams } = await supabase
      .from('teams')
      .select('city')
      .eq('country', 'United States')
      .eq('is_active', true)
      .in('city', cityNames);
    
    (teams || []).forEach(t => {
      if (t.city) {
        teamCounts.set(t.city, (teamCounts.get(t.city) || 0) + 1);
      }
    });
  }

  const allCities = new Set<string>([...rinkCounts.keys(), ...teamCounts.keys()]);
  const cities: CityData[] = Array.from(allCities).map(city => ({
    city,
    rink_count: rinkCounts.get(city) || 0,
    team_count: teamCounts.get(city) || 0,
  })).sort((a, b) => (b.rink_count + b.team_count) - (a.rink_count + a.team_count));

  // Schema.org structured data
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://rinkstop.com' },
      { '@type': 'ListItem', position: 2, name: 'Directory', item: 'https://rinkstop.com/directory' },
      { '@type': 'ListItem', position: 3, name: 'United States', item: 'https://rinkstop.com/directory/united-states' },
      { '@type': 'ListItem', position: 4, name: stateName, item: `https://rinkstop.com/directory/united-states/${stateSlug}` },
    ],
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: `How many hockey rinks are in ${stateName}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `${stateName} has ${rinkCounts.size} cities with hockey facilities listed on RinkStop. The exact number of rinks varies by source, with ${rinkCounts.values().next().value || 0}+ facilities statewide.`,
        },
      },
      {
        '@type': 'Question',
        name: `What NHL teams are in ${stateName}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: hockeyFacts.nhlTeams ? `${stateName} is home to ${hockeyFacts.nhlTeams}.` : `${stateName} does not have an NHL team, but has active hockey at the youth, amateur, and collegiate levels.`,
        },
      },
      {
        '@type': 'Question',
        name: `What youth hockey leagues are in ${stateName}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: hockeyFacts.youthHockey ? `${stateName} has ${hockeyFacts.youthHockey}. Levels include Mites, Squirts, Pee Wee, Bantam, and Midget.` : `${stateName} has youth hockey programs through local associations and travel teams. Check specific cities for details.`,
        },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 1rem 4rem' }}>
        <nav style={{ fontSize: '0.75rem', color: '#555555', padding: '1.5rem 0 0', marginBottom: '0' }}>
          <Link href="/" style={{ color: '#555555' }}>Home</Link>
          <span style={{ margin: '0 0.4rem' }}>›</span>
          <Link href="/directory" style={{ color: '#555555' }}>Directory</Link>
          <span style={{ margin: '0 0.4rem' }}>›</span>
          <Link href="/directory/united-states" style={{ color: '#555555' }}>United States</Link>
          <span style={{ margin: '0 0.4rem' }}>›</span>
          <span style={{ color: '#A0A0A0' }}>{stateName}</span>
        </nav>

        <div style={{ marginBottom: '2rem', paddingTop: '1.5rem' }}>
          <div style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#C8102E', marginBottom: '0.5rem' }}>
            United States
          </div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: '0.75rem' }}>
            {stateName} Hockey
          </h1>
          
          {/* Intro paragraph with state-specific info */}
          <p style={{ color: '#555', fontSize: '1.0625rem', lineHeight: 1.7, maxWidth: '800px', marginBottom: '1rem' }}>
            {hockeyFacts.nhlTeams 
              ? `${stateName} is home to ${hockeyFacts.nhlTeams}. ` 
              : `${stateName} has a vibrant hockey community with `}
            {cities.length} cities hosting hockey activities across youth, amateur, and collegiate levels.
            {hockeyFacts.youthHockey ? ` ${stateName} is known for ${hockeyFacts.youthHockey.toLowerCase()}.` : ''}
          </p>

          {/* Quick stats */}
          <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1rem' }}>
            <div style={{ background: 'var(--s2)', padding: '0.75rem 1.25rem', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#C8102E' }}>{cities.length}</div>
              <div style={{ fontSize: '0.75rem', color: '#666' }}>Cities</div>
            </div>
            <div style={{ background: 'var(--s2)', padding: '0.75rem 1.25rem', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#C8102E' }}>{Array.from(rinkCounts.values()).reduce((a, b) => a + b, 0)}</div>
              <div style={{ fontSize: '0.75rem', color: '#666' }}>Rinks</div>
            </div>
            <div style={{ background: 'var(--s2)', padding: '0.75rem 1.25rem', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#C8102E' }}>{Array.from(teamCounts.values()).reduce((a, b) => a + b, 0)}</div>
              <div style={{ fontSize: '0.75rem', color: '#666' }}>Teams</div>
            </div>
          </div>

          <p style={{ color: '#666666', fontSize: '0.9375rem' }}>
            Browse by city below or{' '}
            <Link href="/add-listing" style={{ color: '#C8102E', fontWeight: 600 }}>add a listing</Link>
            {' '}if you know a rink or team we&apos;re missing.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
          {cities.map(({ city, team_count, rink_count }) => {
            const citySlug = city.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
            return (
              <Link
                key={city}
                href={`/directory/united-states/${stateAbbr.toLowerCase()}/${citySlug}`}
                style={{
                  display: 'block',
                  padding: '1.25rem',
                  background: 'var(--s2)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  color: 'inherit',
                  transition: 'border-color 0.15s',
                }}
              >
                <div style={{ fontWeight: 600, fontSize: '1.0625rem', marginBottom: '0.5rem' }}>
                  {city}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#888', display: 'flex', gap: '1rem' }}>
                  {team_count > 0 && <span>🏒 {team_count} teams</span>}
                  {rink_count > 0 && <span>⛸️ {rink_count} rinks</span>}
                </div>
              </Link>
            );
          })}
        </div>

        {/* Cross-links to other content */}
        {stateAbbr === 'NY' && (
          <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--s2)', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem' }}>🇺🇸 Explore More US Hockey</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
              <Link href="/directory/united-states/minnesota" style={{ color: '#C8102E', fontSize: '0.875rem' }}>Minnesota</Link>
              <Link href="/directory/united-states/massachusetts" style={{ color: '#C8102E', fontSize: '0.875rem' }}>Massachusetts</Link>
              <Link href="/directory/united-states/michigan" style={{ color: '#C8102E', fontSize: '0.875rem' }}>Michigan</Link>
              <Link href="/directory/united-states/pennsylvania" style={{ color: '#C8102E', fontSize: '0.875rem' }}>Pennsylvania</Link>
              <Link href="/directory/nhl" style={{ color: '#C8102E', fontSize: '0.875rem' }}>All NHL Teams</Link>
            </div>
          </div>
        )}

        {stateAbbr === 'MN' && (
          <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--s2)', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem' }}>🏒 Minnesota - The State of Hockey</h3>
            <p style={{ fontSize: '0.875rem', color: '#555', marginBottom: '0.75rem' }}>
              Minnesota is known as the "State of Hockey" with the most registered youth hockey players per capita in the US.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
              <Link href="/directory/united-states/new-york" style={{ color: '#C8102E', fontSize: '0.875rem' }}>New York</Link>
              <Link href="/directory/united-states/massachusetts" style={{ color: '#C8102E', fontSize: '0.875rem' }}>Massachusetts</Link>
              <Link href="/directory/college/ncaa" style={{ color: '#C8102E', fontSize: '0.875rem' }}>NCAA Hockey</Link>
              <Link href="/directory/junior/ushl" style={{ color: '#C8102E', fontSize: '0.875rem' }}>USHL</Link>
            </div>
          </div>
        )}

        {stateAbbr === 'MA' && (
          <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--s2)', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem' }}>🏛️ Massachusetts - Hockey Roots</h3>
            <p style={{ fontSize: '0.875rem', color: '#555', marginBottom: '0.75rem' }}>
              Massachusetts has more registered youth hockey players per capita than any other state. Home to Boston Bruins and top NCAA programs.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
              <Link href="/directory/nhl" style={{ color: '#C8102E', fontSize: '0.875rem' }}>NHL</Link>
              <Link href="/directory/college/hockey-east" style={{ color: '#C8102E', fontSize: '0.875rem' }}>Hockey East</Link>
              <Link href="/directory/united-states/new-york" style={{ color: '#C8102E', fontSize: '0.875rem' }}>New York</Link>
            </div>
          </div>
        )}

        {cities.length === 0 && (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#666' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏒</div>
            <p>No hockey found in {stateName} yet.</p>
            <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
              Know a team or rink? <Link href="/add-listing" style={{ color: '#C8102E' }}>Add it</Link>
            </p>
          </div>
        )}
      </div>
    </>
  );
}