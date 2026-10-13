import type { Metadata } from 'next';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';
import IceRinksNearMeSearch from './IceRinksNearMeSearch';
import { withDefaultOg } from '@/lib/metadata-defaults';

export const revalidate = 3600;
export const dynamic = 'force-dynamic';

const SITE = 'https://rinkstop.com';
const CANONICAL = `${SITE}/ice-rinks-near-me`;

export const metadata: Metadata = {
  title: { absolute: 'Ice Rinks Near Me — Find Hockey Rinks, Arenas & Public Skating | RinkStop' },
  description:
    'Find ice rinks and hockey arenas near you. Search by city, or browse our directory of 1,857+ rinks across 78 countries. Includes public skating hours, learn-to-play programs, and contact info for every rink.',
  alternates: { canonical: CANONICAL },
  robots: { index: true, follow: true, 'max-image-preview': 'large' },
  openGraph: withDefaultOg({
    title: 'Ice Rinks Near Me — Find Hockey Rinks, Arenas & Public Skating',
    description:
      'Find ice rinks and hockey arenas near you. 1,857+ rinks across 78 countries with public skating, learn-to-play, and youth hockey programs.',
    url: CANONICAL,
    siteName: 'RinkStop',
    type: 'website',
  }),
  twitter: {
    card: 'summary_large_image',
    title: 'Ice Rinks Near Me — Find Hockey Rinks, Arenas & Public Skating',
    description: 'Find ice rinks and hockey arenas near you. 1,857+ rinks across 78 countries.',
  },
};

interface TopCity {
  city: string;
  country: string;
  country_slug: string;
  province_state: string | null;
  province_slug: string | null;
  rink_count: number;
  city_slug: string;
  page_url: string;
}

interface TopCountry {
  name: string;
  slug: string;
  flag: string;
  rink_count: number;
}

const TOP_COUNTRIES: TopCountry[] = [
  { name: 'United States', slug: 'united-states', flag: '🇺🇸', rink_count: 0 },
  { name: 'Canada', slug: 'canada', flag: '🇨🇦', rink_count: 0 },
  { name: 'Sweden', slug: 'sweden', flag: '🇸🇪', rink_count: 0 },
  { name: 'Finland', slug: 'finland', flag: '🇫🇮', rink_count: 0 },
  { name: 'Germany', slug: 'germany', flag: '🇩🇪', rink_count: 0 },
  { name: 'United Kingdom', slug: 'united-kingdom', flag: '🇬🇧', rink_count: 0 },
  { name: 'Russia', slug: 'russia', flag: '🇷🇺', rink_count: 0 },
  { name: 'Czechia', slug: 'czechia', flag: '🇨🇿', rink_count: 0 },
  { name: 'Switzerland', slug: 'switzerland', flag: '🇨🇭', rink_count: 0 },
  { name: 'Norway', slug: 'norway', flag: '🇳🇴', rink_count: 0 },
];

function slugifyCity(city: string): string {
  return city
    .toLowerCase()
    .trim()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function stateSlug(province: string | null, country: string): string | null {
  if (!province) return null;
  if (country === 'United States') {
    const usStateSlugs: Record<string, string> = {
      'Alabama': 'alabama', 'Alaska': 'alaska', 'Arizona': 'arizona', 'Arkansas': 'arkansas',
      'California': 'california', 'Colorado': 'colorado', 'Connecticut': 'connecticut',
      'Delaware': 'delaware', 'Florida': 'florida', 'Georgia': 'georgia', 'Hawaii': 'hawaii',
      'Idaho': 'idaho', 'Illinois': 'illinois', 'Indiana': 'indiana', 'Iowa': 'iowa',
      'Kansas': 'kansas', 'Kentucky': 'kentucky', 'Louisiana': 'louisiana', 'Maine': 'maine',
      'Maryland': 'maryland', 'Massachusetts': 'massachusetts', 'Michigan': 'michigan',
      'Minnesota': 'minnesota', 'Mississippi': 'mississippi', 'Missouri': 'missouri',
      'Montana': 'montana', 'Nebraska': 'nebraska', 'Nevada': 'nevada',
      'New Hampshire': 'new-hampshire', 'New Jersey': 'new-jersey',
      'New Mexico': 'new-mexico', 'New York': 'new-york',
      'North Carolina': 'north-carolina', 'North Dakota': 'north-dakota',
      'Ohio': 'ohio', 'Oklahoma': 'oklahoma', 'Oregon': 'oregon',
      'Pennsylvania': 'pennsylvania', 'Rhode Island': 'rhode-island',
      'South Carolina': 'south-carolina', 'South Dakota': 'south-dakota',
      'Tennessee': 'tennessee', 'Texas': 'texas', 'Utah': 'utah', 'Vermont': 'vermont',
      'Virginia': 'virginia', 'Washington': 'washington',
      'West Virginia': 'west-virginia', 'Wisconsin': 'wisconsin', 'Wyoming': 'wyoming',
      'District of Columbia': 'district-of-columbia',
    };
    return usStateSlugs[province] || slugifyCity(province);
  }
  return slugifyCity(province);
}

export default async function IceRinksNearMePage() {
  let topCities: TopCity[] = [];
  let totalRinks = 0;
  let totalCities = 0;
  let totalCountries = 0;

  try {
    const { data: rinks } = await supabaseAdmin
      .from('rinks')
      .select('city, country, country_slug, province_state')
      .eq('is_active', true)
      .not('city', 'is', null);

    if (rinks && rinks.length > 0) {
      const cityMap = new Map<string, { city: string; country: string; country_slug: string; province_state: string | null; rink_count: number }>();
      const countrySet = new Set<string>();

      for (const r of rinks) {
        if (!r.city) continue;
        const k = `${r.city}|${r.country || 'Unknown'}`;
        const existing = cityMap.get(k);
        if (existing) {
          existing.rink_count += 1;
        } else {
          cityMap.set(k, {
            city: r.city,
            country: r.country || 'Unknown',
            country_slug: r.country_slug || slugifyCity(r.country || 'unknown'),
            province_state: r.province_state || null,
            rink_count: 1,
          });
        }
        if (r.country) countrySet.add(r.country);
      }

      totalRinks = rinks.length;
      totalCities = cityMap.size;
      totalCountries = countrySet.size;

      const all = Array.from(cityMap.values()).sort((a, b) => b.rink_count - a.rink_count);

      topCities = all
        .filter((c) => c.country === 'United States' || c.country === 'Canada')
        .slice(0, 30)
        .map((c) => {
          const city_slug = slugifyCity(c.city);
          const province_slug = stateSlug(c.province_state, c.country);
          let page_url = '';
          if (c.country === 'United States' && province_slug) {
            page_url = `/directory/united-states/${province_slug}/${city_slug}`;
          } else if (c.country === 'Canada' && province_slug) {
            page_url = `/directory/canada/${province_slug}/${city_slug}`;
          } else {
            page_url = `/directory/locations/${c.country_slug}/${city_slug}`;
          }
          return {
            city: c.city,
            country: c.country,
            country_slug: c.country_slug,
            province_state: c.province_state,
            province_slug,
            rink_count: c.rink_count,
            city_slug,
            page_url,
          };
        });
    }
  } catch (e) {
    // silent — page still works for users
  }

  return (
    <main style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem 1rem 4rem' }}>
      <nav style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '1.5rem' }}>
        <Link href="/" style={{ color: 'rgba(255,255,255,0.4)' }}>Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: 'rgba(255,255,255,0.6)' }}>Ice Rinks Near Me</span>
      </nav>

      {/* Hero with search form (client component for geolocation) */}
      <section style={{ marginBottom: '3rem', textAlign: 'center', padding: '2.5rem 1rem', background: 'linear-gradient(135deg, #041E42 0%, #0a2d5c 100%)', borderRadius: '12px' }}>
        <div style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.15em', color: '#C8102E', marginBottom: '0.75rem', textTransform: 'uppercase' }}>Location-Based Search</div>
        <h1 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 'clamp(2rem, 5vw, 3rem)', color: '#fff', letterSpacing: '0.04em', marginBottom: '0.75rem' }}>
          ICE RINKS NEAR ME
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '1rem', maxWidth: '550px', margin: '0 auto 1.5rem', lineHeight: 1.7 }}>
          Find ice rinks, hockey arenas, and public skating facilities near your location. {totalRinks > 0 && `Currently tracking ${totalRinks.toLocaleString()} rinks across ${totalCountries} countries and ${totalCities} cities.`}
        </p>

        <IceRinksNearMeSearch />
      </section>

      {/* Top Cities with Most Rinks (for SEO + quick discovery) */}
      {topCities.length > 0 && (
        <section style={{ marginBottom: '3rem' }}>
          <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>
            TOP CITIES WITH ICE RINKS
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
            Browse the cities with the most registered rinks. Click any city to see its full directory.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem' }}>
            {topCities.map((c) => (
              <Link
                key={c.city + c.country}
                href={c.page_url}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.875rem 1rem',
                  background: 'rgba(13,17,23,0.6)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  transition: 'background 0.15s, border-color 0.15s',
                }}
              >
                <div>
                  <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.9375rem' }}>{c.city}</div>
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', marginTop: '0.1rem' }}>
                    {c.province_state ? `${c.province_state}, ` : ''}{c.country}
                  </div>
                </div>
                <div style={{ background: 'rgba(56,189,248,0.12)', color: '#7dd3fc', fontSize: '0.75rem', fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: '4px', whiteSpace: 'nowrap' }}>
                  {c.rink_count} rink{c.rink_count === 1 ? '' : 's'}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Browse by Country */}
      <section style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>
          BROWSE RINKS BY COUNTRY
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
          Hockey is played on rinks in {totalCountries} countries. Pick one to see its directory.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem' }}>
          {TOP_COUNTRIES.map((c) => (
            <Link key={c.slug} href={`/directory/${c.slug}`} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.75rem 0.875rem', background: 'rgba(255,255,255,0.04)', borderRadius: '6px', textDecoration: 'none', border: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ fontSize: '1.25rem' }}>{c.flag}</span>
              <span style={{ fontWeight: 500, color: '#cbd5e1', fontSize: '0.875rem' }}>{c.name}</span>
            </Link>
          ))}
        </div>
        <div style={{ marginTop: '1rem', textAlign: 'center' }}>
          <Link href="/directory/countries" style={{ color: '#7dd3fc', fontSize: '0.875rem', textDecoration: 'none' }}>
            See all {totalCountries} countries →
          </Link>
        </div>
      </section>

      {/* What you'll find */}
      <section style={{ marginBottom: '3rem', background: 'rgba(13,17,23,0.6)', padding: '1.5rem 1.75rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.25rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>
          WHAT YOU&apos;LL FIND ON A RINK PAGE
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>
          <div>
            <div style={{ color: '#fff', fontWeight: 600, marginBottom: '0.25rem' }}>📍 Address & hours</div>
            <div>Full street address, public skate times, and holiday schedules when registered by the rink operator.</div>
          </div>
          <div>
            <div style={{ color: '#fff', fontWeight: 600, marginBottom: '0.25rem' }}>🏒 Home teams</div>
            <div>Which teams play out of this rink — NHL, junior, college, amateur, and youth clubs.</div>
          </div>
          <div>
            <div style={{ color: '#fff', fontWeight: 600, marginBottom: '0.25rem' }}>📋 Programs</div>
            <div>Learn-to-play, learn-to-skate, public skate, youth leagues, adult rec, and clinics.</div>
          </div>
          <div>
            <div style={{ color: '#fff', fontWeight: 600, marginBottom: '0.25rem' }}>🗺️ Local hockey scene</div>
            <div>Leagues, tournaments, and notable teams in the area — plus driving directions.</div>
          </div>
        </div>
      </section>

      {/* For rink operators */}
      <section style={{ marginBottom: '3rem', padding: '1.5rem 1.75rem', background: 'rgba(255,184,28,0.06)', border: '1px solid rgba(255,184,28,0.3)', borderRadius: '12px' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.25rem', color: '#FFB81C', letterSpacing: '0.04em', marginBottom: '0.75rem' }}>
          RUN AN ICE RINK? CLAIM YOUR LISTING
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9375rem', lineHeight: 1.6, marginBottom: '1rem' }}>
          Rink operators can claim their listing for free to manage hours, programs, and contact info — and stop the next stranger from editing it out from under you.
        </p>
        <Link
          href="/claim-your-listing"
          style={{
            display: 'inline-block',
            padding: '0.625rem 1.25rem',
            background: '#FFB81C',
            color: '#C8102E',
            borderRadius: '6px',
            fontWeight: 700,
            fontSize: '0.875rem',
            textDecoration: 'none',
          }}
        >
          Claim your listing →
        </Link>
      </section>

      {/* Last Updated + Schema */}
      <div style={{ marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
        <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.25)' }}>
          Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
      </div>

      {/* Schema.org ItemList for the top cities — additional SEO surface */}
      {topCities.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'ItemList',
              name: 'Top cities with ice rinks',
              description: 'Cities with the most registered ice rinks on RinkStop',
              itemListElement: topCities.slice(0, 10).map((c, i) => ({
                '@type': 'ListItem',
                position: i + 1,
                name: `${c.rink_count} ice rinks in ${c.city}${c.province_state ? ', ' + c.province_state : ''}, ${c.country}`,
                url: `${SITE}${c.page_url}`,
              })),
            }),
          }}
        />
      )}

      {/* Schema.org WebPage */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: 'Ice Rinks Near Me',
            description: 'Find ice rinks, hockey arenas, and public skating facilities near your location.',
            url: CANONICAL,
            breadcrumb: {
              '@type': 'BreadcrumbList',
              itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Home', item: SITE },
                { '@type': 'ListItem', position: 2, name: 'Ice Rinks Near Me', item: CANONICAL },
              ],
            },
          }),
        }}
      />
    </main>
  );
}
