import type { Metadata } from 'next';
import Link from 'next/link';
import { getCountryPageData, getCountryMetadata, countryToSlug } from '@/lib/country-page';
import CountryPageContent from '@/components/CountryPageContent';

const COUNTRY_NAME = 'Canada';

const CA_PROVINCES: Array<{ name: string; slug: string; abbr: string }> = [
  { name: 'Alberta', slug: 'alberta', abbr: 'AB' },
  { name: 'British Columbia', slug: 'british-columbia', abbr: 'BC' },
  { name: 'Manitoba', slug: 'manitoba', abbr: 'MB' },
  { name: 'New Brunswick', slug: 'new-brunswick', abbr: 'NB' },
  { name: 'Newfoundland and Labrador', slug: 'newfoundland-and-labrador', abbr: 'NL' },
  { name: 'Nova Scotia', slug: 'nova-scotia', abbr: 'NS' },
  { name: 'Ontario', slug: 'ontario', abbr: 'ON' },
  { name: 'Prince Edward Island', slug: 'prince-edward-island', abbr: 'PE' },
  { name: 'Quebec', slug: 'quebec', abbr: 'QC' },
  { name: 'Saskatchewan', slug: 'saskatchewan', abbr: 'SK' },
  { name: 'Northwest Territories', slug: 'northwest-territories', abbr: 'NT' },
  { name: 'Nunavut', slug: 'nunavut', abbr: 'NU' },
  { name: 'Yukon', slug: 'yukon', abbr: 'YT' },
];

const BORDER = '#1e1e1e';
const CARD = '#0f0f0f';
const RED = '#C8102E';

export async function generateMetadata(): Promise<Metadata> {
  return getCountryMetadata(COUNTRY_NAME, countryToSlug(COUNTRY_NAME));
}

export const revalidate = 3600;
export const dynamicParams = true;

export default async function CanadaPage() {
  const data = await getCountryPageData(COUNTRY_NAME);

  return (
    <>
      <CountryPageContent data={data} />

      {/* Canada province drilldown — preserved from original Canada page */}
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
            Browse by Province
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: 10,
            }}
          >
            {CA_PROVINCES.map(p => (
              <Link
                key={p.slug}
                href={`/directory/canada/${p.slug}`}
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
                <span style={{ fontWeight: 700, color: RED, fontSize: 14, minWidth: 32 }}>{p.abbr}</span>
                <span style={{ fontSize: 14 }}>{p.name}</span>
              </Link>
            ))}
          </div>

          {/* Major Canadian leagues quick-links */}
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
            Major Canadian Hockey Leagues
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {['NHL', 'AHL', 'OHL', 'WHL', 'QMJHL', 'NCAA'].map(league => (
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
