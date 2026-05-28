import type { Metadata } from 'next';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface Team {
  id: string;
  name: string;
  logo_url?: string;
  slug?: string;
}
interface Rink {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  website_url?: string;
}

// US state abbreviations mapping
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

// NHL teams by city for cross-referencing
const CITY_NHL_TEAMS: Record<string, string[]> = {
  'New York': ['New York Rangers', 'New York Islanders', 'New Jersey Devils'],
  'Los Angeles': ['Los Angeles Kings'],
  'San Jose': ['San Jose Sharks'],
  'Anaheim': ['Anaheim Ducks'],
  'Las Vegas': ['Vegas Golden Knights'],
  'Seattle': ['Seattle Kraken'],
  'Boston': ['Boston Bruins'],
  'Chicago': ['Chicago Blackhawks'],
  'Detroit': ['Detroit Red Wings'],
  'Philadelphia': ['Philadelphia Flyers'],
  'Pittsburgh': ['Pittsburgh Penguins'],
  'St. Louis': ['St. Louis Blues'],
  'Dallas': ['Dallas Stars'],
  'Denver': ['Colorado Avalanche'],
  'Phoenix': ['Arizona Coyotes'],
  'Minneapolis': ['Minnesota Wild'],
  'Miami': ['Florida Panthers'],
  'Tampa Bay': ['Tampa Bay Lightning'],
  'Washington': ['Washington Capitals'],
  'Nashville': ['Nashville Predators'],
  'Columbus': ['Columbus Blue Jackets'],
  'Carolina': ['Carolina Hurricanes'],
  'Raleigh': ['Carolina Hurricanes'],
  'Buffalo': ['Buffalo Sabres'],
  'Baltimore': [],
  'San Francisco': [],
  'Oakland': [],
  'Jersey City': [],
  'Brooklyn': [],
};

export async function generateMetadata({ params }: { params: Promise<{ state: string; city: string }> }): Promise<Metadata> {
  const { state: stateSlug, city: citySlug } = await params;
  const stateAbbr = US_STATES[stateSlug] || stateSlug.toUpperCase();
  const stateName = STATE_NAMES[stateAbbr.toLowerCase()] || stateAbbr;
  const cityName = citySlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  return {
    title: `${cityName}, ${stateName} Hockey - Rinks & Teams | RinkStop`,
    description: `Find hockey teams, ice rinks, and leagues in ${cityName}, ${stateName}. Discover youth programs and adult leagues near you.`,
    alternates: {
      canonical: `https://rinkstop.com/directory/united-states/${stateSlug}/${citySlug}`,
    },
    openGraph: {
      title: `${cityName} Hockey | RinkStop`,
      description: `Hockey in ${cityName}, ${stateName}: ice rinks, teams, and leagues.`,
      type: 'website',
    },
  };
}

export const dynamic = 'force-dynamic';

export default async function USStateCityPage({ params }: { params: Promise<{ state: string; city: string }> }) {
  const { state: stateSlug, city: citySlug } = await params;
  
  const stateAbbr = US_STATES[stateSlug] || stateSlug.toUpperCase();
  const stateName = STATE_NAMES[stateAbbr.toLowerCase()] || stateAbbr;
  const cityName = citySlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  // Get teams and rinks in this city/province
  const [{ data: teamsData }, { data: rinksData }] = await Promise.all([
    supabase
      .from('teams')
      .select('id, name, logo_url, slug, league_id')
      .eq('country', 'United States')
      .eq('is_active', true)
      .or(`city.ilike.${cityName}`)
      .order('name'),
    supabase
      .from('rinks')
      .select('id, name, address, phone, website_url, city')
      .eq('country', 'United States')
      .eq('province_state', stateAbbr)
      .eq('is_active', true)
      .or(`city.ilike.${cityName},address.ilike.%${cityName}%`)
      .order('name'),
  ]);

  // Get league names for teams
  const teamsList = (teamsData || []) as Team[];
  const rinksList = (rinksData || []) as Rink[];

  // Get unique rink IDs to avoid duplicates
  const seenRinkIds = new Set<string>();
  const uniqueRinks = rinksList.filter(r => {
    if (seenRinkIds.has(r.id)) return false;
    seenRinkIds.add(r.id);
    return true;
  });

  // Schema.org structured data
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://rinkstop.com' },
      { '@type': 'ListItem', position: 2, name: 'Directory', item: 'https://rinkstop.com/directory' },
      { '@type': 'ListItem', position: 3, name: 'United States', item: 'https://rinkstop.com/directory/united-states' },
      { '@type': 'ListItem', position: 4, name: stateName, item: `https://rinkstop.com/directory/united-states/${stateSlug}` },
      { '@type': 'ListItem', position: 5, name: cityName, item: `https://rinkstop.com/directory/united-states/${stateSlug}/${citySlug}` },
    ],
  };

  // SportsVenue schema for each rink
  const venueSchemas = uniqueRinks.map(rink => ({
    '@type': 'SportsVenue',
    '@id': `https://rinkstop.com/rinks/${rink.id}`,
    name: rink.name,
    address: rink.address ? {
      '@type': 'PostalAddress',
      streetAddress: rink.address,
      addressLocality: cityName,
      addressRegion: stateAbbr,
      addressCountry: 'US',
    } : undefined,
    telephone: rink.phone,
    url: rink.website_url,
  }));

  // SportsTeam schema for each team
  const teamSchemas = teamsList.map(team => ({
    '@type': 'SportsTeam',
    '@id': `https://rinkstop.com/directory/teams/${team.slug || team.id}`,
    name: team.name,
    logo: team.logo_url,
  }));

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      {venueSchemas.map((schema, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      ))}
      {teamSchemas.map((schema, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      ))}
      
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 1rem 4rem' }}>
        <nav style={{ fontSize: '0.75rem', color: '#555555', padding: '1.5rem 0 0', marginBottom: '0' }}>
          <Link href="/" style={{ color: '#555555' }}>Home</Link>
          <span style={{ margin: '0 0.4rem' }}>›</span>
          <Link href="/directory" style={{ color: '#555555' }}>Directory</Link>
          <span style={{ margin: '0 0.4rem' }}>›</span>
          <Link href="/directory/united-states" style={{ color: '#555555' }}>United States</Link>
          <span style={{ margin: '0 0.4rem' }}>›</span>
          <Link href={`/directory/united-states/${stateSlug}`} style={{ color: '#555555' }}>{stateName}</Link>
          <span style={{ margin: '0 0.4rem' }}>›</span>
          <span style={{ color: '#A0A0A0' }}>{cityName}</span>
        </nav>

        <div style={{ marginBottom: '2rem', paddingTop: '1.5rem' }}>
          <div style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#C8102E', marginBottom: '0.5rem' }}>
            United States · {stateName}
          </div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: '0.75rem' }}>
            {cityName} Hockey
          </h1>

          {/* Intro */}
          <p style={{ color: '#555', fontSize: '1.0625rem', lineHeight: 1.7, maxWidth: '800px', marginBottom: '1rem' }}>
            {cityName} is home to {teamsList.length} hockey {teamsList.length === 1 ? 'team' : 'teams'} and {uniqueRinks.length} ice {uniqueRinks.length === 1 ? 'rink' : 'rinks'}.
            {CITY_NHL_TEAMS[cityName] && CITY_NHL_TEAMS[cityName].length > 0 && (
              <> The city is home to {CITY_NHL_TEAMS[cityName].join(', ')}.</>
            )}
            {' '}Browse teams and rinks below or <Link href="/add-listing" style={{ color: '#C8102E', fontWeight: 600 }}>add a listing</Link> if we&apos;re missing something.
          </p>

          {/* Quick stats */}
          <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1rem' }}>
            <div style={{ background: 'var(--s2)', padding: '0.75rem 1.25rem', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#C8102E' }}>{teamsList.length}</div>
              <div style={{ fontSize: '0.75rem', color: '#666' }}>Teams</div>
            </div>
            <div style={{ background: 'var(--s2)', padding: '0.75rem 1.25rem', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#C8102E' }}>{uniqueRinks.length}</div>
              <div style={{ fontSize: '0.75rem', color: '#666' }}>Rinks</div>
            </div>
          </div>
        </div>

        {/* Teams Section */}
        {teamsList.length > 0 && (
          <div style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>🏒</span> Hockey Teams in {cityName}
            </h2>
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {teamsList.map(team => (
                <Link
                  key={team.id}
                  href={`/directory/teams/${team.slug || team.id}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    padding: '1rem',
                    background: 'var(--s2)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    color: 'inherit',
                    transition: 'border-color 0.15s',
                  }}
                >
                  {team.logo_url ? (
                    <img src={team.logo_url} alt="" style={{ width: 48, height: 48, objectFit: 'contain' }} />
                  ) : (
                    <div style={{ width: 48, height: 48, background: 'var(--s3)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>🏒</div>
                  )}
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '1rem' }}>{team.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#888' }}>View team details →</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Rinks Section */}
        {uniqueRinks.length > 0 && (
          <div style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>⛸️</span> Ice Rinks in {cityName}
            </h2>
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {uniqueRinks.map(rink => (
                <div
                  key={rink.id}
                  style={{
                    padding: '1.25rem',
                    background: 'var(--s2)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '0.25rem' }}>{rink.name}</div>
                  {rink.address && (
                    <div style={{ fontSize: '0.8125rem', color: '#666', marginBottom: '0.25rem' }}>📍 {rink.address}</div>
                  )}
                  <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8125rem' }}>
                    {rink.phone && <span>📞 {rink.phone}</span>}
                    {rink.website_url && (
                      <a href={rink.website_url} target="_blank" rel="noopener noreferrer" style={{ color: '#C8102E' }}>
                        🌐 Website →
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* NHL Team cross-link for major cities */}
        {CITY_NHL_TEAMS[cityName] && CITY_NHL_TEAMS[cityName].length > 0 && (
          <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--s2)', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem' }}>🏆 Professional Hockey Nearby</h3>
            <p style={{ fontSize: '0.875rem', color: '#555', marginBottom: '0.75rem' }}>
              {cityName} is home to {CITY_NHL_TEAMS[cityName].join(' and ')}.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <Link href="/directory/nhl" style={{ color: '#C8102E', fontSize: '0.875rem', fontWeight: 600 }}>View All NHL Teams →</Link>
            </div>
          </div>
        )}

        {/* Related cities */}
        <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--s2)', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem' }}>🗺️ Explore More {stateName} Hockey</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
            <Link href={`/directory/united-states/${stateSlug}`} style={{ color: '#C8102E', fontSize: '0.875rem' }}>
              ← All {stateName} cities
            </Link>
          </div>
        </div>

        {/* Empty State */}
        {teamsList.length === 0 && uniqueRinks.length === 0 && (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#666' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏒</div>
            <p>No hockey found in {cityName}, {stateName} yet.</p>
            <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
              Know a team or rink? <Link href="/add-listing" style={{ color: '#C8102E' }}>Add it</Link>
            </p>
          </div>
        )}
      </div>
    </>
  );
}