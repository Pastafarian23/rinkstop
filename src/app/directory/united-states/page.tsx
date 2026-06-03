import type { Metadata } from 'next';
import Link from 'next/link';
import { getCountryPageData, getCountryMetadata, countryToSlug } from '@/lib/country-page';
import CountryPageContent from '@/components/CountryPageContent';

const COUNTRY_NAME = 'United States';

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

const BORDER = '#1e1e1e';
const CARD = '#0f0f0f';
const RED = '#C8102E';
const TEXT_DIM = '#555';

export async function generateMetadata(): Promise<Metadata> {
  return getCountryMetadata(COUNTRY_NAME, countryToSlug(COUNTRY_NAME));
}

export const dynamic = 'force-dynamic';

export default async function UnitedStatesPage() {
  const data = await getCountryPageData(COUNTRY_NAME);

  return (
    <>
      <CountryPageContent data={data} />

      {/* US State drilldown — preserved from original USA page */}
      <div style={{ background: '#0a0a0a' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px 80px' }}>
          <h2
            style={{
              fontFamily: "'Bebas Neue', Impact, sans-serif",
              fontSize: 26,
              letterSpacing: '0.04em',
              color: '#fff',
              marginBottom: 16,
              borderLeft: `4px solid ${RED}`,
              paddingLeft: 14,
            }}
          >
            Browse by State
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: 10,
            }}
          >
            {US_STATES.map(state => (
              <Link
                key={state.slug}
                href={`/directory/united-states/${state.slug}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '14px 16px',
                  background: CARD,
                  border: `1px solid ${BORDER}`,
                  borderRadius: 8,
                  textDecoration: 'none',
                  color: '#fff',
                }}
              >
                <span style={{ fontWeight: 700, color: RED, fontSize: 14, minWidth: 32 }}>{state.abbr}</span>
                <span style={{ fontSize: 14 }}>{state.name}</span>
              </Link>
            ))}
          </div>

          {/* Major US leagues quick-links */}
          <h2
            style={{
              fontFamily: "'Bebas Neue', Impact, sans-serif",
              fontSize: 26,
              letterSpacing: '0.04em',
              color: '#fff',
              margin: '40px 0 16px',
              borderLeft: `4px solid ${RED}`,
              paddingLeft: 14,
            }}
          >
            Major US Hockey Leagues
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {['NHL', 'AHL', 'USHL', 'NAHL', 'NCAA Division I', 'NCAA Division III', 'USAC'].map(league => (
              <Link
                key={league}
                href={`/directory/leagues/${league.toLowerCase().replace(/\s+/g, '-')}`}
                style={{
                  padding: '8px 16px',
                  background: CARD,
                  border: `1px solid ${BORDER}`,
                  borderRadius: 20,
                  textDecoration: 'none',
                  color: '#fff',
                  fontSize: 14,
                }}
              >
                {league}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
