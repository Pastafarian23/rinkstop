/**
 * CityCloud — list of city hubs derived from the visible marketplace listings.
 *
 * Aggregates the visible listings by city, then renders a row of city
 * links. The "show 6 max" cap is the SEO move: search engines can crawl
 * from /ice-marketplace to per-city pages without an unbounded
 * outgoing link surface. The hubs are real (route resolves), and
 * each one is built from the same city-page machinery the directory uses.
 *
 * This is a server component (no client JS), rendered as part of
 * the page server-render.
 */

import Link from 'next/link';

interface ListingRow {
  rink: { id: string; name: string; slug: string | null; city: string | null; province_state: string | null; country: string | null } | null;
}

interface Props {
  listings: ListingRow[];
}

const COUNTRY_SLUG: Record<string, string> = {
  'united states': 'united-states',
  'usa': 'united-states',
  'us': 'united-states',
  'canada': 'canada',
  'ca': 'canada',
};

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(' ')
    .map((w) => (w.length === 0 ? w : w[0].toUpperCase() + w.slice(1)))
    .join(' ');
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function cityHubPath(country: string | null, province: string | null, city: string | null): string | null {
  if (!city) return null;
  const countrySlug = country ? COUNTRY_SLUG[country.toLowerCase()] || slugify(country) : null;
  if (!countrySlug) return null;
  const citySlug = slugify(city);
  const provinceSlug = province ? slugify(province) : null;
  // RinkStop uses /directory/{country}/{province}/{city} for US/CA.
  // For other countries we just use /directory/{country}/{city} (matches
  // the existing /directory/sweden path pattern).
  if ((countrySlug === 'united-states' || countrySlug === 'canada') && provinceSlug) {
    return `/directory/${countrySlug}/${provinceSlug}/${citySlug}`;
  }
  return `/directory/${countrySlug}/${citySlug}`;
}

export default function CityCloud({ listings }: Props) {
  const counts = new Map<string, { label: string; href: string; count: number }>();
  for (const l of listings) {
    const r = l.rink;
    if (!r || !r.city) continue;
    const country = r.country || '';
    const province = r.province_state || '';
    const city = r.city;
    const path = cityHubPath(country, province, city);
    if (!path) continue;
    const key = path;
    const existing = counts.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      counts.set(key, { label: `${titleCase(city)}${province ? `, ${province}` : ''}`, href: path, count: 1 });
    }
  }
  // Sort: most listings first, then alpha. Cap at 6 cities to keep the
  // internal-link surface tight.
  const cities = Array.from(counts.values())
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, 6);
  if (cities.length === 0) return null;

  return (
    <div
      data-ice-marketplace-city-cloud="true"
      style={{
        marginTop: '2.5rem',
        padding: '1.5rem',
        background: 'rgba(13,17,23,0.6)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 12,
      }}
    >
      <h2
        style={{
          fontFamily: '"Bebas Neue", sans-serif',
          fontSize: '1.125rem',
          letterSpacing: '0.04em',
          color: '#fff',
          margin: '0 0 0.75rem',
        }}
      >
        Browse open ice by city
      </h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
        {cities.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            data-ice-city-link={c.label}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.375rem',
              padding: '0.5rem 0.875rem',
              background: 'rgba(56,189,248,0.1)',
              border: '1px solid rgba(56,189,248,0.3)',
              borderRadius: 6,
              color: '#7DD3FC',
              textDecoration: 'none',
              fontSize: '0.875rem',
              fontWeight: 600,
            }}
          >
            {c.label}
            {c.count > 1 ? <span style={{ color: '#38BDF8', fontSize: '0.75rem' }}>· {c.count}</span> : null}
          </Link>
        ))}
      </div>
    </div>
  );
}
