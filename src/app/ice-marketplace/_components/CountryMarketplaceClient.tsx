/**
 * CountryMarketplaceClient — country-level ice marketplace hub.
 *
 * Server-rendered. Shows:
 *   - Country-specific H1 + intro
 *   - Listings filtered to the country
 *   - City hub list (top cities by rink count)
 *   - JSON-LD ItemList + BreadcrumbList
 */

import Link from 'next/link';
import type { Metadata } from 'next';

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
  countryRinkCount: number;
  cityCount: number;
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

export default function CountryMarketplaceClient({ countrySlug, countryName, countryRinkCount, cityCount, listings }: Props) {
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
        offers: l.requested_price_cents ? { '@type': 'Offer', price: (l.requested_price_cents / 100).toFixed(2), priceCurrency: l.currency || 'USD', url: `${SITE}/ice-marketplace/${l.id}/book`, availability: 'https://schema.org/InStock' } : undefined,
      },
    };
  });

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Open ice time in ${countryName}`,
    description: `Ice time and practice slots for sale or rent in ${countryName}.`,
    numberOfItems: listings.length,
    itemListElement: itemListElements,
  };

  return (
    <main
      data-page="ice-marketplace-country"
      data-country={countrySlug}
      style={{ background: '#0F172A', color: '#fff', minHeight: '100vh', padding: '2rem 1rem 4rem' }}
    >
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <nav aria-label="Breadcrumb" style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.5)', marginBottom: '1rem' }}>
          <Link href="/" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>Home</Link>
          <span style={{ margin: '0 0.4rem' }}>›</span>
          <Link href="/ice-marketplace" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>Ice Marketplace</Link>
          <span style={{ margin: '0 0.4rem' }}>›</span>
          <span style={{ color: '#FFB81C' }}>{countryName}</span>
        </nav>

        <h1
          data-ice-h1="country"
          style={{
            fontFamily: '"Bebas Neue", sans-serif',
            fontSize: 'clamp(2rem, 5vw, 3rem)',
            color: '#fff',
            margin: '0 0 0.5rem',
            letterSpacing: '0.02em',
            lineHeight: 1.1,
          }}
        >
          Open Ice Time in {countryName}
        </h1>
        <p style={{ color: '#94A3B8', fontSize: '1rem', maxWidth: 720, margin: '0 0 0.5rem' }}>
          {listings.length === 0
            ? `No open ice slots in ${countryName} right now. Check back soon.`
            : `${listings.length} open ${listings.length === 1 ? 'slot' : 'slots'} across ${countryRinkCount} ${countryRinkCount === 1 ? 'rink' : 'rinks'} and clubs in ${countryName}.`}
        </p>
        <p style={{ color: '#64748B', fontSize: '0.875rem', margin: '0 0 2rem' }}>
          {countryRinkCount} rinks in {cityCount} {cityCount === 1 ? 'city' : 'cities'} across {countryName}.{' '}
          Browse by city below.
        </p>

        {/* Listings */}
        {listings.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '3rem' }}>
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
                      {listing.rink?.city ? ` · ${listing.rink.city}${listing.rink?.province_state ? `, ${listing.rink.province_state}` : ''}` : ''}
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
                    href={`/ice-marketplace/${listing.id}/book`}
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

        {/* SEO */}
        <section
          data-ice-country-seo="true"
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
            Open ice in {countryName}
          </h2>
          <p>
            The RinkStop Ice Marketplace lists every open ice slot in {countryName} from rinks, hockey clubs, and
            associations. Use the listings above to find practice ice, tournament slots, or clinic ice near you.
            Each entry shows the rink, the time, the price, the skill level, and the age group. Click
            &ldquo;Request to book&rdquo; to send the rink owner a direct inquiry — no account required.
          </p>
          <p>
            If you operate a rink or run a club in {countryName}, you can list your open ice on RinkStop for free.
            Founding partners pay 0% take-rate for their first 6 months. To apply, see the{' '}
            <Link href="/launch" style={{ color: '#FFB81C', textDecoration: 'underline' }}>founding partner program</Link>.
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
