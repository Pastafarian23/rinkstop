import Link from 'next/link';
import { supabase } from '@/lib/supabase';

// Canadian province abbreviations and full names
const CA_PROVINCES: Record<string, string> = {
  'alberta': 'AB', 'british-columbia': 'BC', 'manitoba': 'MB',
  'new-brunswick': 'NB', 'newfoundland-and-labrador': 'NL', 'nova-scotia': 'NS',
  'northwest-territories': 'NT', 'nunavut': 'NU', 'ontario': 'ON',
  'prince-edward-island': 'PE', 'quebec': 'QC', 'saskatchewan': 'SK', 'yukon': 'YT',
  'ab': 'AB', 'bc': 'BC', 'mb': 'MB',
  'nb': 'NB', 'nl': 'NL', 'ns': 'NS',
  'nt': 'NT', 'nu': 'NU', 'on': 'ON',
  'pe': 'PE', 'qc': 'QC', 'sk': 'SK', 'yt': 'YT',
};

const PROVINCE_NAMES: Record<string, string> = {
  'ab': 'Alberta', 'bc': 'British Columbia', 'mb': 'Manitoba',
  'nb': 'New Brunswick', 'nl': 'Newfoundland and Labrador', 'ns': 'Nova Scotia',
  'nt': 'Northwest Territories', 'nu': 'Nunavut', 'on': 'Ontario',
  'pe': 'Prince Edward Island', 'qc': 'Quebec', 'sk': 'Saskatchewan', 'yt': 'Yukon',
};

interface CityData {
  city: string;
  rink_count: number;
  team_count: number;
}

export const dynamic = 'force-dynamic';

export default async function CanadaProvincePage({
  params,
}: {
  params: Promise<{ province: string }>;
}) {
  const { province: provinceSlug } = await params;
  
  // Convert slug to province abbreviation
  const provinceAbbr = CA_PROVINCES[provinceSlug] || provinceSlug.toUpperCase();
  const provinceName = PROVINCE_NAMES[provinceAbbr.toLowerCase()] || provinceAbbr;

  // Get rinks in this province
  const { data: rinks } = await supabase
    .from('rinks')
    .select('city')
    .eq('country', 'Canada')
    .eq('province_state', provinceAbbr)
    .eq('is_active', true)
    .not('city', 'is', null);

  // Count rinks per city
  const rinkCounts = new Map<string, number>();
  (rinks || []).forEach(r => {
    if (r.city) {
      rinkCounts.set(r.city, (rinkCounts.get(r.city) || 0) + 1);
    }
  });

  // Get cities that have teams in this province
  const cityNames = Array.from(rinkCounts.keys());
  let teamCounts = new Map<string, number>();
  
  if (cityNames.length > 0) {
    const { data: teams } = await supabase
      .from('teams')
      .select('city, province_state')
      .eq('country', 'Canada')
      .eq('province_state', provinceAbbr)
      .eq('is_active', true);
    
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
        <Link href="/directory/canada" style={{ color: '#555555' }}>Canada</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>{provinceName}</span>
      </nav>

      <div style={{ marginBottom: '2.5rem', paddingTop: '1.5rem' }}>
        <div style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#C8102E', marginBottom: '0.5rem' }}>
          🇨🇦 Canada
        </div>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: '0.5rem' }}>
          {provinceName} Hockey
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
              href={`/directory/canada/${provinceAbbr.toLowerCase()}/${citySlug}`}
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
          <p>No hockey found in {provinceName} yet.</p>
          <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
            Know a team or rink? <Link href="/add-listing" style={{ color: '#C8102E' }}>Add it</Link>
          </p>
        </div>
      )}
    </div>
  );
}