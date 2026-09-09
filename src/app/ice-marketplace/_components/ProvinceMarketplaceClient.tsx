/**
 * ProvinceMarketplaceClient — province/state-level ice marketplace hub.
 *
 * Similar to CountryMarketplaceClient but scoped to a state/province.
 * US/CA only.
 */

import Link from 'next/link';

interface ListingRow {
  id: string;
  title: string;
  description: string | null;
  requested_price_cents: number | null;
  currency: string;
  start_time: string;
  end_time: string;
  timezone: string;
  age_group: string | null;
  skill_level: string | null;
  slot_type: string | null;
  rink: { id: string; name: string; slug: string | null; city: string | null; province_state: string | null; country: string | null } | null;
}

interface Props {
  countrySlug: string;
  countryName: string;
  provinceSlug: string;
  provinceName: string;
  provinceRinkCount: number;
  listings: ListingRow[];
}

const SITE = 'https://rinkstop.com';

function formatPrice(cents: number | null, currency: string): string {
  if (cents === null) return 'Free';
  return `${currency} ${(cents / 100).toFixed(2)}`;
}

function formatSlot(dateStr: string, tz: string): string {
  return new Date(dateStr).toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: tz,
  });
}

function cityToSlug(city: string): string {
  return city.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export default function ProvinceMarketplaceClient({
  countrySlug,
  countryName,
  provinceSlug,
  provinceName,
  provinceRinkCount,
  listings,
}: Props) {
  const location = `${provinceName}, ${countryName}`;
  const cityPath = (city: string) =>
    `/ice-marketplace/${countrySlug}/${provinceSlug}/${cityToSlug(city)}`;

  // Group listings by city
  const listingsByCity = new Map<string, number>();
  for (const l of listings) {
    if (l.rink?.city) {
      listingsByCity.set(l.rink.city, (listingsByCity.get(l.rink.city) || 0) + 1);
    }
  }
  const topCities = Array.from(listingsByCity.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12);

  const itemListElements = listings.slice(0, 50).map((l, i) => {
    const r = l.rink;
    return {
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Event',
        name: l.title,
        description: l.description || undefined,
        startDate: l.start_time,
        endDate: l.end_time,
        eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
        location: r ? { '@type': 'Place', name: r.name, address: [r.city, r.province_state, r.country].filter(Boolean).join(', ') || undefined } : undefined,
        offers: l.requested_price_cents ? { '@type': 'Offer', price: (l.requested_price_cents / 100).toFixed(2), priceCurrency: l.currency || 'USD', url: `${SITE}/book-ice/${l.id}`, availability: 'https://schema.org/InStock' } : undefined,
      },
    };
  });

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Open ice time in ${location}`,
    description: `Ice time and practice slots for sale or rent in ${location}.`,
    numberOfItems: listings.length,
    itemListElement: itemListElements,
  };

  return (
    <main
      data-page="ice-marketplace-province"
      data-country={countrySlug}
      data-province={provinceSlug}
      style={{ background: '#0F172A', color: '#fff', minHeight: '100vh', padding: '2rem 1rem 4rem' }}
    >
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <nav aria-label="Breadcrumb" style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.5)', marginBottom: '1rem' }}>
          <Link href="/" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>Home</Link>
          <span style={{ margin: '0 0.4rem' }}>›</span>
          <Link href="/ice-marketplace" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>Ice Marketplace</Link>
          <span style={{ margin: '0 0.4rem' }}>›</span>
          <Link href={`/ice-marketplace/${countrySlug}`} style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>{countryName}</Link>
          <span style={{ margin: '0 0.4rem' }}>›</span>
          <span style={{ color: '#FFB81C' }}>{provinceName}</span>
        </nav>

        <h1
          data-ice-h1="province"
          style={{
            fontFamily: '"Bebas Neue", sans-serif',
            fontSize: 'clamp(2rem, 5vw, 3rem)',
            color: '#fff',
            margin: '0 0 0.5rem',
            letterSpacing: '0.02em',
            lineHeight: 1.1,
          }}
        >
          Open Ice Time in {location}
        </h1>
        <p style={{ color: '#94A3B8', fontSize: '1rem', maxWidth: 720, margin: '0 0 0.5rem' }}>
          {listings.length === 0
            ? `No open ice slots in ${location} right now.`
            : `${listings.length} open ${listings.length === 1 ? 'slot' : 'slots'} across ${provinceRinkCount} rinks in ${provinceName}.`}
        </p>

        {topCities.length > 0 && (
          <section
            data-ice-province-cities="true"
            style={{
              marginTop: '1.5rem',
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
              Cities with open ice in {provinceName}
            </h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {topCities.map(([city, count]) => (
                <Link
                  key={city}
                  href={cityPath(city)}
                  data-ice-province-city={city}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
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
                  {city}
                  {count > 1 ? <span style={{ color: '#38BDF8', fontSize: '0.75rem' }}>· {count}</span> : null}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Listings */}
        {listings.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '2rem', marginBottom: '3rem' }}>
            {listings.slice(0, 50).map((listing) => {
              const tz = listing.timezone || 'America/Chicago';
              return (
                <div
                  key={listing.id}
                  data-ice-listing-id={listing.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '1.25rem',
                    padding: '1rem 1.25rem',
                    background: 'rgba(13,17,23,0.6)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: 12, flexWrap: 'wrap',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 220 }}>
                    <div style={{ color: '#fff', fontWeight: 600, fontSize: '1rem' }}>{listing.title}</div>
                    <div style={{ color: '#94A3B8', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                      {listing.rink?.name}
                      {listing.rink?.city ? ` · ${listing.rink.city}` : ''}
                    </div>
                    <div style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                      {formatSlot(listing.start_time, tz)}
                      {listing.slot_type ? ` · ${listing.slot_type.replace(/_/g, ' ')}` : ''}
                    </div>
                  </div>
                  <span style={{ color: '#cbd5e1', fontSize: '1rem', fontWeight: 600 }}>
                    {formatPrice(listing.requested_price_cents, listing.currency)}
                  </span>
                  <Link
                    href={`/book-ice/${listing.id}`}
                    style={{
                      background: '#C8102E', color: '#fff', padding: '0.375rem 0.875rem',
                      borderRadius: 6, textDecoration: 'none', fontSize: '0.8rem', fontWeight: 700,
                    }}
                  >
                    Request to book
                  </Link>
                </div>
              );
            })}
          </div>
        )}

        <section
          data-ice-province-seo="true"
          style={{
            marginTop: '2rem',
            padding: '2rem 0',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.85)',
            fontSize: '0.95rem',
            lineHeight: 1.6,
          }}
        >
          <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', letterSpacing: '0.04em', color: '#fff', margin: '0 0 0.75rem' }}>
            Open ice in {provinceName}
          </h2>
          <p>
            {provinceName} has {provinceRinkCount} active rinks on RinkStop. The listings above show every open
            ice slot currently available for booking. Use the city cloud to drill into a specific city, or
            browse the full{' '}
            <Link href={`/directory/${countrySlug}/${provinceSlug}`} style={{ color: '#38BDF8', textDecoration: 'underline' }}>
              {provinceName} rink directory
            </Link>{' '}
            to find a specific rink.
          </p>
        </section>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </main>
  );
}
