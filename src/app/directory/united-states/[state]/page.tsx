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

interface CityData {
  city: string;
  rink_count: number;
  team_count: number;
}

export const dynamic = 'force-dynamic';

export default async function USStatePage({
  params,
}: {
  params: Promise<{ state: string }>;
}) {
  const { state: stateSlug } = await params;
  
  // Convert slug to state abbreviation
  const stateAbbr = US_STATES[stateSlug] || stateSlug.toUpperCase();
  const stateName = STATE_NAMES[stateAbbr.toLowerCase()] || stateSlug.replace(/-/g, ' ');

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

  // Get teams - filter by city names we know are in this state
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

  // Merge data
  const allCities = new Set<string>([...rinkCounts.keys(), ...teamCounts.keys()]);
  const cities: CityData[] = Array.from(allCities).map(city => ({
    city,
    rink_count: rinkCounts.get(city) || 0,
    team_count: teamCounts.get(city) || 0,
  })).sort((a, b) => (b.rink_count + b.team_count) - (a.rink_count + a.team_count));

  return (
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

      <div style={{ marginBottom: '2.5rem', paddingTop: '1.5rem' }}>
        <div style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#C8102E', marginBottom: '0.5rem' }}>
          United States
        </div>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: '0.5rem' }}>
          {stateName} Hockey
        </h1>
        <p style={{ color: '#666666', fontSize: '1rem' }}>
          {cities.length} cities with hockey
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
  );
}