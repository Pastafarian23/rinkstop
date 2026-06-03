import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { getCountryPageData, getCountryMetadata, countryToSlug } from '@/lib/country-page';
import CountryPageContent from '@/components/CountryPageContent';

const COUNTRY_NAME = 'United Kingdom';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const BORDER = '#1e1e1e';
const CARD = '#0f0f0f';
const RED = '#C8102E';

export async function generateMetadata(): Promise<Metadata> {
  return getCountryMetadata(COUNTRY_NAME, countryToSlug(COUNTRY_NAME));
}

export const dynamic = 'force-dynamic';

export default async function UnitedKingdomPage() {
  // Fetch UK country data via the standard fetcher
  const data = await getCountryPageData(COUNTRY_NAME);

  // Also fetch UK cities with rinks for the city drilldown list
  const { data: allUkRinks } = await supabase
    .from('rinks')
    .select('city')
    .eq('country', COUNTRY_NAME)
    .eq('is_active', true);

  const cityMap = new Map<string, number>();
  (allUkRinks || []).forEach((r: { city?: string }) => {
    if (r.city) cityMap.set(r.city, (cityMap.get(r.city) || 0) + 1);
  });

  const ukCities = Array.from(cityMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([city, count]) => ({
      city,
      count,
      slug: city.toLowerCase().replace(/\s+/g, '-').replace(/\//g, '-'),
    }));

  return (
    <>
      <CountryPageContent data={data} />

      {/* UK city drilldown — preserved from original UK page */}
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
            Browse by City
          </h2>
          {ukCities.length === 0 ? (
            <p style={{ color: '#888', fontSize: 14 }}>No UK city listings yet.</p>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: 10,
              }}
            >
              {ukCities.map(c => (
                <Link
                  key={c.slug}
                  href={`/directory/united-kingdom/${c.slug}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 16px',
                    background: CARD,
                    border: `1px solid ${BORDER}`,
                    borderRadius: 8,
                    textDecoration: 'none',
                    color: '#fff',
                  }}
                >
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{c.city}</span>
                  <span style={{ fontSize: 12, color: '#888' }}>{c.count} rink{c.count !== 1 ? 's' : ''}</span>
                </Link>
              ))}
            </div>
          )}

          {/* Major UK leagues quick-links */}
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
            Major UK Hockey Leagues
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {['EIHL', 'NIHL', 'NIHNL', 'WIH'].map(league => (
              <Link
                key={league}
                href={`/directory/leagues/${league.toLowerCase()}`}
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
