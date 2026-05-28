'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface Team {
  id: string;
  name: string;
  logo_url?: string;
  slug?: string;
  leagues?: { name: string } | { name: string }[];
}
interface Rink {
  id: string;
  name: string;
  address?: string;
}
interface YouthProgram {
  id: string;
  name: string;
  program_type?: string;
  age_group?: string;
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

const STATE_NAMES: Record<string, string> = Object.fromEntries(
  Object.entries(US_STATES).map(([name, abbr]) => [abbr.toLowerCase(), name])
);

export default function USStateCityPage({
  params,
}: {
  params: Promise<{ state: string; city: string }>;
}) {
  const [stateName, setStateName] = useState('');
  const [cityName, setCityName] = useState('');
  const [teams, setTeams] = useState<Team[]>([]);
  const [rinks, setRinks] = useState<Rink[]>([]);
  const [programs, setPrograms] = useState<YouthProgram[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    params.then(async p => {
      const stateSlug = p.state;
      const citySlug = p.city;
      
      // Convert slug to state abbreviation
      const stateAbbr = US_STATES[stateSlug] || stateSlug.toUpperCase();
      const stateFullName = STATE_NAMES[stateAbbr.toLowerCase()] || stateAbbr;
      setStateName(stateFullName);
      
      // Convert slug to readable city name
      const cityReadable = citySlug.replace(/-/g, ' ');
      setCityName(cityReadable);
      
      await loadData(stateAbbr, cityReadable);
    });
  }, [params]);

  async function loadData(stateAbbr: string, city: string) {
    setLoading(true);

    // Search for teams in this city/state
    const [{ data: teamsData }, { data: rinksData }, { data: programsData }] = await Promise.all([
      supabase
        .from('teams')
        .select('id, name, logo_url, slug, leagues(name)')
        .eq('country', 'United States')
        .eq('city', city)
        .eq('is_active', true)
        .order('name'),
      supabase
        .from('rinks')
        .select('id, name, address')
        .eq('country', 'United States')
        .eq('city', city)
        .eq('is_active', true)
        .order('name'),
      supabase
        .from('youth_programs')
        .select('id, name, program_type, age_group')
        .eq('country', 'United States')
        .eq('city', city)
        .eq('is_active', true)
        .order('name'),
    ]);

    // Also search by state in address for rinks
    if (!rinksData || rinksData.length === 0) {
      const { data: rinksByState } = await supabase
        .from('rinks')
        .select('id, name, address')
        .eq('country', 'United States')
        .ilike('address', `%, ${stateAbbr}%`)
        .eq('is_active', true)
        .order('name');
      
      if (rinksByState && rinksByState.length > 0) {
        setRinks(rinksByState.filter(r => r.address?.toLowerCase().includes(city.toLowerCase())));
      } else {
        setRinks([]);
      }
    } else {
      setRinks(rinksData || []);
    }

    setTeams(teamsData || []);
    setPrograms(programsData || []);
    setLoading(false);
  }

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 1rem 4rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555555', padding: '1.5rem 0 0', marginBottom: '0' }}>
        <Link href="/" style={{ color: '#555555' }}>Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/directory" style={{ color: '#555555' }}>Directory</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/directory/united-states" style={{ color: '#555555' }}>United States</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href={`/directory/united-states/${params.then ? 'state' : ''}`} style={{ color: '#555555' }}>
          {stateName || 'States'}
        </Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>{cityName}</span>
      </nav>

      <div style={{ marginBottom: '2.5rem', paddingTop: '1.5rem' }}>
        <div style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#C8102E', marginBottom: '0.5rem' }}>
          United States · {stateName}
        </div>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: '0.5rem', textTransform: 'capitalize' }}>
          {cityName.replace(/-/g, ' ')} Hockey
        </h1>
        <p style={{ color: '#666666', fontSize: '1rem' }}>
          {loading ? 'Loading...' : `${teams.length} teams · ${rinks.length} rinks · ${programs.length} programs`}
        </p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton" style={{ height: '120px', borderRadius: '8px' }} />
          ))}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {/* Teams Section */}
          {teams.length > 0 && (
            <div style={{ gridColumn: '1 / -1' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>🏒</span> Teams in {cityName}
              </h2>
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                {teams.map(team => (
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
                    <div>
                      <div style={{ fontWeight: 600 }}>{team.name}</div>
                      {team.leagues && (
                        <div style={{ fontSize: '0.75rem', color: '#888' }}>
                          {Array.isArray(team.leagues) ? team.leagues.map(l => (l as any).name).join(', ') : (team.leagues as any).name}
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Rinks Section */}
          {rinks.length > 0 && (
            <div style={{ gridColumn: '1 / -1' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>⛸️</span> Rinks in {cityName}
              </h2>
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                {rinks.map(rink => (
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

          {/* Programs Section */}
          {programs.length > 0 && (
            <div style={{ gridColumn: '1 / -1' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>🏃</span> Youth Programs in {cityName}
              </h2>
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                {programs.map(program => (
                  <div
                    key={program.id}
                    style={{
                      padding: '1rem',
                      background: 'var(--s2)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>{program.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#888', marginTop: '0.25rem' }}>
                      {program.program_type && `${program.program_type} · `}
                      {program.age_group}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {teams.length === 0 && rinks.length === 0 && programs.length === 0 && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: '#666' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏒</div>
              <p>No hockey found in {cityName}, {stateName} yet.</p>
              <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
                Know a team, rink, or program? <Link href="/add-listing" style={{ color: '#C8102E' }}>Add it</Link>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
