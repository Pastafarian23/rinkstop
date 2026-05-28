import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://yszheonqyyskkjoxoexk.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key'
);

// US states with abbreviations
const US_STATES = [
  { name: 'Alabama', slug: 'alabama', abbr: 'AL' },
  { name: 'Alaska', slug: 'alaska', abbr: 'AK' },
  { name: 'Arizona', slug: 'arizona', abbr: 'AZ' },
  { name: 'Arkansas', slug: 'arkansas', abbr: 'AR' },
  { name: 'California', slug: 'california', abbr: 'CA' },
  { name: 'Colorado', slug: 'colorado', abbr: 'CO' },
  { name: 'Connecticut', slug: 'connecticut', abbr: 'CT' },
  { name: 'Delaware', slug: 'delaware', abbr: 'DE' },
  { name: 'Florida', slug: 'florida', abbr: 'FL' },
  { name: 'Georgia', slug: 'georgia', abbr: 'GA' },
  { name: 'Hawaii', slug: 'hawaii', abbr: 'HI' },
  { name: 'Idaho', slug: 'idaho', abbr: 'ID' },
  { name: 'Illinois', slug: 'illinois', abbr: 'IL' },
  { name: 'Indiana', slug: 'indiana', abbr: 'IN' },
  { name: 'Iowa', slug: 'iowa', abbr: 'IA' },
  { name: 'Kansas', slug: 'kansas', abbr: 'KS' },
  { name: 'Kentucky', slug: 'kentucky', abbr: 'KY' },
  { name: 'Louisiana', slug: 'louisiana', abbr: 'LA' },
  { name: 'Maine', slug: 'maine', abbr: 'ME' },
  { name: 'Maryland', slug: 'maryland', abbr: 'MD' },
  { name: 'Massachusetts', slug: 'massachusetts', abbr: 'MA' },
  { name: 'Michigan', slug: 'michigan', abbr: 'MI' },
  { name: 'Minnesota', slug: 'minnesota', abbr: 'MN' },
  { name: 'Mississippi', slug: 'mississippi', abbr: 'MS' },
  { name: 'Missouri', slug: 'missouri', abbr: 'MO' },
  { name: 'Montana', slug: 'montana', abbr: 'MT' },
  { name: 'Nebraska', slug: 'nebraska', abbr: 'NE' },
  { name: 'Nevada', slug: 'nevada', abbr: 'NV' },
  { name: 'New Hampshire', slug: 'new-hampshire', abbr: 'NH' },
  { name: 'New Jersey', slug: 'new-jersey', abbr: 'NJ' },
  { name: 'New Mexico', slug: 'new-mexico', abbr: 'NM' },
  { name: 'New York', slug: 'new-york', abbr: 'NY' },
  { name: 'North Carolina', slug: 'north-carolina', abbr: 'NC' },
  { name: 'North Dakota', slug: 'north-dakota', abbr: 'ND' },
  { name: 'Ohio', slug: 'ohio', abbr: 'OH' },
  { name: 'Oklahoma', slug: 'oklahoma', abbr: 'OK' },
  { name: 'Oregon', slug: 'oregon', abbr: 'OR' },
  { name: 'Pennsylvania', slug: 'pennsylvania', abbr: 'PA' },
  { name: 'Rhode Island', slug: 'rhode-island', abbr: 'RI' },
  { name: 'South Carolina', slug: 'south-carolina', abbr: 'SC' },
  { name: 'South Dakota', slug: 'south-dakota', abbr: 'SD' },
  { name: 'Tennessee', slug: 'tennessee', abbr: 'TN' },
  { name: 'Texas', slug: 'texas', abbr: 'TX' },
  { name: 'Utah', slug: 'utah', abbr: 'UT' },
  { name: 'Vermont', slug: 'vermont', abbr: 'VT' },
  { name: 'Virginia', slug: 'virginia', abbr: 'VA' },
  { name: 'Washington', slug: 'washington', abbr: 'WA' },
  { name: 'West Virginia', slug: 'west-virginia', abbr: 'WV' },
  { name: 'Wisconsin', slug: 'wisconsin', abbr: 'WI' },
  { name: 'Wyoming', slug: 'wyoming', abbr: 'WY' },
  { name: 'District of Columbia', slug: 'district-of-columbia', abbr: 'DC' },
];

export const metadata = {
  title: 'United States Hockey | RinkStop',
  description: 'Find hockey teams, leagues, rinks, and youth programs across the United States.',
};

export default async function UnitedStatesPage() {
  // Fetch US stats
  const [{ data: teams }, { data: rinks }, { data: leagues }] = await Promise.all([
    supabase
      .from('teams')
      .select('id', { count: 'exact', head: true })
      .eq('country', 'United States')
      .eq('is_active', true),
    supabase
      .from('rinks')
      .select('id', { count: 'exact', head: true })
      .eq('country', 'United States')
      .eq('is_active', true),
    supabase
      .from('leagues')
      .select('id', { count: 'exact', head: true })
      .or('country.ilike.%United States%,slug.ilike.%nhl%,slug.ilike.%ushl%,slug.ilike.%nahl%')
      .eq('is_active', true),
  ]);

  const stats = {
    teams: teams?.length || 0,
    rinks: rinks?.length || 0,
    leagues: leagues?.length || 0,
  };

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 1rem 4rem' }}>
      {/* Breadcrumb */}
      <nav style={{ fontSize: '0.75rem', color: '#555555', padding: '1.5rem 0 0', marginBottom: '0' }}>
        <Link href="/" style={{ color: '#555555' }}>Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/directory" style={{ color: '#555555' }}>Directory</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>United States</span>
      </nav>

      {/* Header */}
      <div style={{ marginBottom: '2.5rem', paddingTop: '1.5rem' }}>
        <div style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#C8102E', marginBottom: '0.5rem' }}>
          🇺🇸 United States
        </div>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: '0.5rem' }}>
          US Hockey Directory
        </h1>
        <p style={{ color: '#666666', fontSize: '1rem', marginBottom: '1.5rem' }}>
          {stats.teams.toLocaleString()} teams · {stats.rinks.toLocaleString()} rinks · {stats.leagues.toLocaleString()} leagues
        </p>

        {/* Stats Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1.25rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: '#C8102E' }}>{stats.teams.toLocaleString()}</div>
            <div style={{ fontSize: '0.75rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Teams</div>
          </div>
          <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1.25rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: '#C8102E' }}>{stats.rinks.toLocaleString()}</div>
            <div style={{ fontSize: '0.75rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Rinks</div>
          </div>
          <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1.25rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: '#C8102E' }}>{stats.leagues.toLocaleString()}</div>
            <div style={{ fontSize: '0.75rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Leagues</div>
          </div>
        </div>
      </div>

      {/* States Grid */}
      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Browse by State</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
        {US_STATES.map(state => (
          <Link
            key={state.slug}
            href={`/directory/united-states/${state.slug}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.875rem 1rem',
              background: 'var(--s2)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              textDecoration: 'none',
              color: 'inherit',
              transition: 'border-color 0.15s, background 0.15s',
            }}
          >
            <span style={{ fontWeight: 700, color: '#C8102E', fontSize: '0.875rem', minWidth: '32px' }}>{state.abbr}</span>
            <span style={{ fontSize: '0.875rem' }}>{state.name}</span>
          </Link>
        ))}
      </div>

      {/* Popular Leagues */}
      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '2.5rem 0 1rem' }}>Major US Leagues</h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
        {['NHL', 'AHL', 'USHL', 'NAHL', 'NCAA Division I', 'NCAA Division III', 'USAC'].map(league => (
          <Link
            key={league}
            href={`/directory/leagues/${league.toLowerCase().replace(/\s+/g, '-')}`}
            style={{
              padding: '0.5rem 1rem',
              background: 'var(--s2)',
              border: '1px solid var(--border)',
              borderRadius: '20px',
              textDecoration: 'none',
              color: 'inherit',
              fontSize: '0.875rem',
            }}
          >
            {league}
          </Link>
        ))}
      </div>
    </div>
  );
}
