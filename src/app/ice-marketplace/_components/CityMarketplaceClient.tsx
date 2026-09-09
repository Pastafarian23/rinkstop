/**
 * CityMarketplaceClient — city-scoped ice marketplace page.
 *
 * Server-rendered. Shows:
 *   - City-specific H1 + meta-friendly intro
 *   - Listings filtered to this city (from props)
 *   - City-specific SEO copy block
 *   - JSON-LD ItemList of the listings (same ItemList shape as
 *     the parent /ice-marketplace)
 *   - Internal links back to the parent marketplace + the city
 *     directory page
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
  provinceSlug: string | null;
  provinceName: string | null;
  citySlug: string;
  cityName: string;
  location: string;
  cityRinkCount: number;
  listings: ListingRow[];
}

const SITE = 'https://rinkstop.com';

function formatPrice(cents: number | null, currency: string): string {
  if (cents === null) return 'Free';
  return `${currency} ${(cents / 100).toFixed(2)}`;
}

function formatSlot(dateStr: string, tz: string): string {
  return new Date(dateStr).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: tz,
  });
}

export default function CityMarketplaceClient({
  countrySlug,
  countryName,
  provinceSlug,
  provinceName,
  citySlug,
  cityName,
  location,
  cityRinkCount,
  listings,
}: Props) {
  // JSON-LD ItemList of the city-specific listings
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
        location: r
          ? {
              '@type': 'Place',
              name: r.name,
              address: [r.city, r.province_state, r.country].filter(Boolean).join(', ') || undefined,
            }
          : undefined,
        offers: l.requested_price_cents
          ? {
              '@type': 'Offer',
              price: (l.requested_price_cents / 100).toFixed(2),
              priceCurrency: l.currency || 'USD',
              url: `${SITE}/ice-marketplace/${l.id}/book`,
              availability: 'https://schema.org/InStock',
            }
          : undefined,
      },
    };
  });

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Open ice time in ${location}`,
    description: `Ice time and practice slots available for sale or rent in ${location}.`,
    numberOfItems: listings.length,
    itemListElement: itemListElements,
  };

  // Breadcrumb schema
  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE}/` },
      { '@type': 'ListItem', position: 2, name: 'Ice Marketplace', item: `${SITE}/ice-marketplace` },
      ...(provinceName && provinceSlug
        ? [{ '@type': 'ListItem', position: 3, name: provinceName, item: `${SITE}/ice-marketplace/${countrySlug}/${provinceSlug}` }]
        : []),
      { '@type': 'ListItem', position: provinceName ? 4 : 3, name: cityName, item: `${SITE}/ice-marketplace${provinceSlug ? `/${countrySlug}/${provinceSlug}/${citySlug}` : `/${countrySlug}/${citySlug}`}` },
    ],
  };

  return (
    <main
      data-page="ice-marketplace-city"
      data-country={countrySlug}
      data-city={citySlug}
      style={{ background: '#0F172A', color: '#fff', minHeight: '100vh', padding: '2rem 1rem 4rem' }}
    >
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        {/* Breadcrumbs (visible) */}
        <nav
          aria-label="Breadcrumb"
          style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.5)', marginBottom: '1rem' }}
        >
          <Link href="/" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>Home</Link>
          <span style={{ margin: '0 0.4rem' }}>›</span>
          <Link href="/ice-marketplace" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>Ice Marketplace</Link>
          {provinceName && provinceSlug ? (
            <>
              <span style={{ margin: '0 0.4rem' }}>›</span>
              <Link
                href={`/ice-marketplace/${countrySlug}/${provinceSlug}`}
                style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}
              >
                {provinceName}
              </Link>
            </>
          ) : null}
          <span style={{ margin: '0 0.4rem' }}>›</span>
          <span style={{ color: '#FFB81C' }}>{cityName}</span>
        </nav>

        {/* H1 + intro */}
        <h1
          data-ice-h1="city"
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
            ? `No open ice slots in ${location} right now. Check back soon, or browse the full marketplace.`
            : `${listings.length} open ${listings.length === 1 ? 'slot' : 'slots'} available in ${location} from ${cityRinkCount} ${cityRinkCount === 1 ? 'rink' : 'rinks'} and clubs.`}
        </p>
        <p style={{ color: '#64748B', fontSize: '0.8125rem', margin: '0 0 1.5rem' }}>
          Looking for the rink directory in {cityName}? See{' '}
          <Link
            href={`/directory/${provinceSlug ? `${countrySlug}/${provinceSlug}/${citySlug}` : `${countrySlug}/${citySlug}`}`}
            style={{ color: '#38BDF8', textDecoration: 'underline' }}
          >
            all {cityName} rinks
          </Link>
          .
        </p>

        {/* Filter form (city-locked — no need to repeat) */}
        <div
          style={{
            background: 'rgba(13,17,23,0.8)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 12,
            padding: '1rem 1.25rem',
            marginBottom: '1.5rem',
          }}
        >
          <form method="GET" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Slot type</label>
              <select name="slot_type" defaultValue="" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#fff', padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}>
                <option value="">All types</option>
                <option value="practice">Practice</option>
                <option value="game">Game</option>
                <option value="tournament">Tournament</option>
                <option value="camp">Camp</option>
                <option value="clinic">Clinic</option>
                <option value="lesson">Lesson</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Skill level</label>
              <select name="skill_level" defaultValue="" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#fff', padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}>
                <option value="">All levels</option>
                <option value="all">All</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
                <option value="elite">Elite</option>
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button type="submit" style={{ background: '#38BDF8', color: '#0F172A', border: 'none', padding: '0.5rem 1rem', borderRadius: 6, fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>
                Filter
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <Link
                href={`/ice-marketplace${provinceSlug ? `/${countrySlug}/${provinceSlug}/${citySlug}` : `/${countrySlug}/${citySlug}`}`}
                style={{ color: '#94A3B8', fontSize: '0.85rem', textDecoration: 'none', padding: '0.5rem 0.5rem' }}
              >
                Clear
              </Link>
            </div>
          </form>
        </div>

        {/* Listings */}
        {listings.length === 0 ? (
          <div
            data-ice-empty-state="true"
            style={{
              background: 'rgba(13,17,23,0.6)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: '3rem 2rem',
              textAlign: 'center',
            }}
          >
            <p style={{ color: '#94A3B8', fontSize: '1rem', margin: 0 }}>
              No ice listings available in {location} right now.
            </p>
            <p style={{ color: '#64748b', fontSize: '0.875rem', margin: '0.5rem 0 1.5rem' }}>
              Rinks and clubs in {cityName} can list their open ice on RinkStop. If you operate one,{' '}
              <Link href="/launch" style={{ color: '#FFB81C', textDecoration: 'underline' }}>
                apply to be a founding partner
              </Link>{' '}
              — first 6 months are 0% take-rate.
            </p>
            <Link
              href="/ice-marketplace"
              style={{
                display: 'inline-block',
                marginTop: '0.5rem',
                color: '#38BDF8',
                textDecoration: 'none',
                padding: '0.5rem 1rem',
                border: '1px solid rgba(56,189,248,0.3)',
                borderRadius: 6,
                fontSize: '0.875rem',
                fontWeight: 600,
              }}
            >
              ← Browse all open ice
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
            {listings.map((listing) => {
              const tz = listing.timezone || 'America/Chicago';
              return (
                <div
                  key={listing.id}
                  data-ice-listing-id={listing.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1.25rem',
                    padding: '1rem 1.25rem',
                    background: 'rgba(13,17,23,0.6)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: 12,
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 220 }}>
                    <div style={{ color: '#fff', fontWeight: 600, fontSize: '1rem' }}>{listing.title}</div>
                    <div style={{ color: '#94A3B8', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                      {listing.rink?.name || 'Unknown rink'}
                    </div>
                    <div style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                      {formatSlot(listing.start_time, tz)}
                      {listing.slot_type ? ` · ${listing.slot_type.replace(/_/g, ' ')}` : ''}
                      {listing.skill_level && listing.skill_level !== 'all' ? ` · ${listing.skill_level}` : ''}
                      {listing.age_group ? ` · ${listing.age_group}` : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                    <span style={{ color: '#cbd5e1', fontSize: '1rem', fontWeight: 600 }}>
                      {formatPrice(listing.requested_price_cents, listing.currency)}
                    </span>
                    <Link
                      href={`/ice-marketplace/${listing.id}/book`}
                      style={{
                        background: '#C8102E',
                        color: '#fff',
                        padding: '0.375rem 0.875rem',
                        borderRadius: 6,
                        textDecoration: 'none',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                      }}
                    >
                      Request to book
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* SEO content block */}
        <section
          data-ice-city-seo="true"
          style={{
            marginTop: '3rem',
            padding: '2rem 0',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.85)',
            fontSize: '0.95rem',
            lineHeight: 1.6,
          }}
        >
          <h2
            style={{
              fontFamily: '"Bebas Neue", sans-serif',
              fontSize: '1.5rem',
              letterSpacing: '0.04em',
              color: '#fff',
              margin: '0 0 0.75rem',
            }}
          >
            About open ice in {location}
          </h2>
          <p>
            {provinceName ? `In ${cityName}, ${provinceName}` : `In ${cityName}, ${countryName}`}, hockey runs on
            ice time, and not every team has enough of it. The RinkStop Ice Marketplace connects local rinks,
            clubs, and associations with teams that need ice for practice, games, tournaments, or clinics. Use
            this page to find open ice by the hour in {cityName} without cold-calling the rink office.
          </p>
          <p>
            {cityRinkCount >= 1 ? (
              <>RinkStop currently lists <strong>{cityRinkCount} {cityRinkCount === 1 ? 'rink' : 'rinks'}</strong> in {cityName}. </>
            ) : null}
            {listings.length >= 1 ? (
              <>{listings.length} {listings.length === 1 ? 'slot is' : 'slots are'} currently available for booking. Listings include practice ice, tournament ice, and clinic ice — filter by slot type, age group, and skill level above. </>
            ) : null}
            For the full rink directory in {cityName}, see the{' '}
            <Link
              href={`/directory/${provinceSlug ? `${countrySlug}/${provinceSlug}/${citySlug}` : `${countrySlug}/${citySlug}`}`}
              style={{ color: '#38BDF8', textDecoration: 'underline' }}
            >
              {cityName} rink directory
            </Link>
            .
          </p>

          <h3
            style={{
              fontFamily: '"Bebas Neue", sans-serif',
              fontSize: '1.125rem',
              letterSpacing: '0.04em',
              color: '#fff',
              margin: '1.5rem 0 0.5rem',
            }}
          >
            For rinks and arena operators in {cityName}
          </h3>
          <p>
            If you operate a rink in {cityName} or run a local hockey club, you can list your open ice on
            RinkStop for free. RinkStop charges 0% take-rate for the first 6 months for founding partners, and
            20% after that. You set the price, the slot duration, the skill level, and the age group. Teams
            searching for ice in {cityName} will find your listings. To apply, see the{' '}
            <Link href="/launch" style={{ color: '#FFB81C', textDecoration: 'underline' }}>
              founding partner program
            </Link>
            .
          </p>
        </section>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
    </main>
  );
}
