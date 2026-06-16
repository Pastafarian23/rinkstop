import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { PROVINCE_FROM_SLUG_OR_ABBR, PROVINCE_FULL_NAMES, PROVINCE_SLUGS, type ProvinceAbbr } from '@/lib/ca-provinces';

interface CityData {
  city: string;
  rink_count: number;
  team_count: number;
}

export const dynamic = 'force-dynamic';

/** Resolve the URL segment (slug or abbr) to the province abbr + canonical slug. */
function resolveProvince(segment: string): { abbr: ProvinceAbbr; slug: string } | null {
  const abbr = PROVINCE_FROM_SLUG_OR_ABBR[segment.toLowerCase()];
  if (!abbr) return null;
  return { abbr, slug: PROVINCE_SLUGS[abbr] };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ province: string }>;
}): Promise<Metadata> {
  const { province: provinceSegment } = await params;
  const resolved = resolveProvince(provinceSegment);
  if (!resolved) return { title: 'Province not found' };
  const provinceName = PROVINCE_FULL_NAMES[resolved.abbr];
  return {
    title: `Hockey in ${provinceName}`,
    description: `Hockey teams, rinks, and cities in ${provinceName}, Canada. Browse local hockey listings in this province.`,
    alternates: {
      canonical: `https://rinkstop.com/directory/canada/${resolved.slug}`,
    },
    robots: {
      index: true,
      follow: true,
    },
    openGraph: {
      title: `Hockey in ${provinceName}`,
      description: `Hockey teams, rinks, and cities in ${provinceName}, Canada.`,
      url: `https://rinkstop.com/directory/canada/${resolved.slug}`,
      siteName: 'RinkStop',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `Hockey in ${provinceName}`,
      description: `Hockey teams, rinks, and cities in ${provinceName}, Canada.`,
    },
  };
}

export default async function CanadaProvincePage({
  params,
}: {
  params: Promise<{ province: string }>;
}) {
  const { province: provinceSegment } = await params;
  
  const resolved = resolveProvince(provinceSegment);
  if (!resolved) return notFound();
  // 301 redirect from abbr form (e.g. /directory/canada/ns) to full-name form (/directory/canada/nova-scotia)
  if (provinceSegment.toLowerCase() !== resolved.slug) {
    redirect(`/directory/canada/${resolved.slug}`);
  }
  const provinceAbbr = resolved.abbr;
  const provinceName = PROVINCE_FULL_NAMES[provinceAbbr];

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
              href={`/directory/canada/${resolved.slug}/${citySlug}`}
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