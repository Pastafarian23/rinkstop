/**
 * src/lib/schema/event.ts
 *
 * Centralized schema.org Event JSON-LD builder.
 *
 * Why this exists (2026-09-14):
 *   Google Search Console flagged rinkstop.com for 6 "Events structured data
 *   issues" — missing fields: location, eventStatus, organizer, performer,
 *   image, and offers.validFrom. The Event JSON-LD objects were built
 *   inline in 4 nearly-identical places (Country/City/Province/SEO components
 *   in ice-marketplace), each missing 4-5 of these fields.
 *
 *   Fix: one helper, every site uses it. Adding a missing field = one edit.
 *
 * Required fields per Google Search Gallery for Event rich results
 * (https://developers.google.com/search/docs/appearance/structured-data/event):
 *   - name
 *   - startDate
 *   - location (Place or VirtualLocation)
 *   - eventAttendanceMode (OfflineEventAttendanceMode / Online / Mixed)
 *
 * Recommended:
 *   - endDate
 *   - eventStatus (EventScheduled / EventCancelled / EventPostponed / EventRescheduled)
 *   - description
 *   - image (URL or array of URLs)
 *   - organizer (Organization or Person)
 *   - performer (Person or Organization, may be array)
 *   - offers (Offer with price, priceCurrency, url, validFrom, availability)
 *
 * Output is a plain JSON-serializable object. Rendered via:
 *   <script type="application/ld+json">{JSON.stringify(buildIceListingEvent(args))}</script>
 */

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://rinkstop.com').replace(/\/$/, '');

export interface IceListingSchemaInput {
  id: string;
  title: string;
  description?: string | null;
  start_time: string;
  end_time: string;
  requested_price_cents?: number | null;
  currency?: string | null;
  /** ISO timestamp; falls back to start_time if not provided */
  valid_from?: string | null;
  rink?: {
    name: string;
    slug?: string | null;
    city?: string | null;
    province_state?: string | null;
    country?: string | null;
    cover_photo_url?: string | null;
  } | null;
}

/**
 * Builds a fully-populated schema.org Event object for an ice listing.
 * GSC-compliant: every required/recommended Google Event field present
 * (either with a real value OR explicitly omitted via `undefined` so
 * consumers can JSON-strip undefined keys).
 */
export function buildIceListingEvent(l: IceListingSchemaInput): Record<string, unknown> {
  const r = l.rink ?? null;

  // location.address as PostalAddress (GSC requires structured address,
  // not a freeform string, to count location as fully-populated)
  const location = r
    ? {
        '@type': 'Place',
        name: r.name,
        address: {
          '@type': 'PostalAddress',
          ...(r.city ? { addressLocality: r.city } : {}),
          ...(r.province_state ? { addressRegion: r.province_state } : {}),
          ...(r.country ? { addressCountry: r.country } : {}),
        },
      }
    : undefined;

  // organizer — the rink that hosts the listing. URL points to the public
  // rink page so Google can crawl it as a real identifier.
  const organizer = r
    ? {
        '@type': 'Organization',
        name: r.name,
        ...(r.slug ? { url: `${SITE}/directory/rinks/${r.slug}` } : {}),
      }
    : undefined;

  // offers.validFrom per GSC: when the offer became (or will become) valid.
  // Use starts_at as the natural default — when the ice slot goes on sale.
  const validFrom = l.valid_from || l.start_time;

  const offer = l.requested_price_cents
    ? {
        '@type': 'Offer',
        price: (l.requested_price_cents / 100).toFixed(2),
        priceCurrency: l.currency || 'USD',
        url: `${SITE}/book-ice/${l.id}`,
        availability: 'https://schema.org/InStock',
        validFrom,
      }
    : undefined;

  // performer: there's no individual performer for an ice slot, but Google
  // recommends at least one of organizer/performer/image. We deliberately
  // omit performer when there's nothing meaningful to link — including an
  // empty array confuses Google's parser.

  return {
    '@type': 'Event',
    name: l.title,
    startDate: l.start_time,
    endDate: l.end_time,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    description: l.description || undefined,
    ...(r?.cover_photo_url ? { image: r.cover_photo_url } : {}),
    location,
    organizer,
    offers: offer,
    // Internal canonical id (rare for Google but useful for dedup audits)
    '@id': `${SITE}/book-ice/${l.id}`,
  };
}

/**
 * Wraps an array of ice listings as an ItemList schema.org object.
 * Used by all /ice-marketplace/* landing pages + SEO component.
 */
export function buildIceListingItemList(
  listings: IceListingSchemaInput[],
  meta: { name: string; description: string; total: number; limit?: number },
): Record<string, unknown> {
  const limit = meta.limit ?? 50;
  const itemListElements = listings.slice(0, limit).map((l, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    item: buildIceListingEvent(l),
  }));

  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: meta.name,
    description: meta.description,
    numberOfItems: meta.total,
    itemListElement: itemListElements,
  };
}
