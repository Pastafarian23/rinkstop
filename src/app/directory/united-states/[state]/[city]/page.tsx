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

export const dynamic = 'force-dynamic';

export default async function USStateCityPage({
  params,
}: {
  params: Promise<{ state: string; city: string }>;
}) {
  const { state: stateSlug, city: citySlug } = await params;
  
  // Convert slug to state abbreviation
  const stateAbbr = US_STATES[stateSlug] || stateSlug.toUpperCase();
  const stateName = STATE_NAMES[stateAbbr.toLowerCase()] || stateAbbr;
  
  // Convert slug to readable city name
  const cityName = citySlug.replace(/-/g, ' ');

  // Get teams and rinks in this city/state
  const [{ data: teams }, { data: rinks }] = await Promise.all([
    supabase
      .from('teams')
      .select('id, name, logo_url, slug')
      .eq('country', 'United States')
      .eq('city', cityName)
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('rinks')
      .select('id, name, address')
      .eq('country', 'United States')
      .eq('province_state', stateAbbr)
      .eq('city', cityName)
      .eq('is_active', true)
      .order('name'),
  ]);

  const teamsList = (teams || []) as Team[];
  const rinksList = (rinks || []) as Rink[];

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
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>{cityName}</span>
      </nav>

      <div style={{ marginBottom: '2.5rem', paddingTop: '1.5rem' }}>
        <div style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#C8102E', marginBottom: '0.5rem' }}>
          United States · {stateName}
        </div>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: '0.5rem' }}>
          {cityName} Hockey
        </h1>
        <p style={{ color: '#666666', fontSize: '1rem' }}>
          {teamsList.length} teams · {rinksList.length} rinks
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {/* Teams Section */}
        {teamsList.length > 0 && (
          <div style={{ gridColumn: '1 / -1' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>🏒</span> Teams in {cityName}
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
                    <img src={team.logo_url} alt="" style={{ width: 40, height: 40, objectFit: 'contain' }} />
                  ) : (
                    <div style={{ width: 40, height: 40, background: 'var(--s3)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>🏒</div>
                  )}
                  <div style={{ fontWeight: 600 }}>{team.name}</div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Rinks Section */}
        {rinksList.length > 0 && (
          <div style={{ gridColumn: '1 / -1' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>⛸️</span> Rinks in {cityName}
            </h2>
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {rinksList.map(rink => (
                <div
                  key={rink.id}
                  style={{
                    padding: '1rem',
                    background: 'var(--s2)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                  }}
                >
                  <div style={{ fontWeight: 600 }}>{rink.name}</div>
                  {rink.address && (
                    <div style={{ fontSize: '0.75rem', color: '#888', marginTop: '0.25rem' }}>{rink.address}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {teamsList.length === 0 && rinksList.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: '#666' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏒</div>
            <p>No hockey found in {cityName}, {stateName} yet.</p>
            <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
              Know a team or rink? <Link href="/add-listing" style={{ color: '#C8102E' }}>Add it</Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}