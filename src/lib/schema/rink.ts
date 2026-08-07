/**
 * Rink schema.org generator.
 *
 * Extracted from src/app/directory/rinks/[slug]/page.tsx (2026-08-05, WS17 PR2)
 * so the schema can be:
 *   - Tested in isolation
 *   - Reused on /events/[slug] when linking back to the rink
 *   - Extended with WS17 data (availableActivity + event[]) without bloating the page
 *
 * Returns a @graph array suitable for <script type="application/ld+json">.
 * Always returns at least a BreadcrumbList so the page emits valid schema
 * even if the rink payload is malformed.
 */

import { provinceDisplayName } from '@/lib/ca-provinces';
import type { OpeningHoursJson } from '@/lib/rinkOpeningHours';

export type RinkSchemaInput = {
  name: string;
  slug: string | null;
  city: string | null;
  province_state: string | null;
  country: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  capacity?: number | null;
  phone?: string | null;
  website_url?: string | null;
  google_maps_url?: string | null;
  google_phone?: string | null;
  cover_photo_url?: string | null;
  logo_url?: string | null;
  opening_hours_json?: OpeningHoursJson | null;
  ice_size?: string | null;
  notes?: string | null;
};

export type RinkProgrammingForSchema = {
  activity_type: string;
  skill_level?: string | null;
  description?: string | null;
};

export type RinkEventForSchema = {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  starts_at: string;
  ends_at: string;
  status: string;
  banner_image_url?: string | null;
  registration_url?: string | null;
  price_cents?: number | null;
  currency?: string | null;
  divisions?: Array<{
    name: string;
    skill_level?: string | null;
    gender?: string | null;
    birth_year_min?: number | null;
    birth_year_max?: number | null;
    age_min?: number | null;
    age_max?: number | null;
    price_cents?: number | null;
  }>;
};

const BASE_URL = 'https://rinkstop.com';

function breadcrumb(rink: RinkSchemaInput) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'Rinks', item: `${BASE_URL}/directory/rinks` },
      {
        '@type': 'ListItem',
        position: 3,
        name: rink.name,
        item: rink.slug ? `${BASE_URL}/directory/rinks/${rink.slug}` : `${BASE_URL}/directory/rinks`,
      },
    ],
  };
}

/**
 * Map our internal `rink_activity_type` enum to a schema.org activity type.
 *
 * Per WS17 PR2 locked decision #6: use exact schema.org subtypes where they
 * exist, fall back to SportsActivity + additionalType (link to our enum) for
 * everything else. This keeps Google Knowledge Graph data rich while still
 * covering all our enum values.
 *
 * Schema.org subtypes we use here:
 *   - PublicSkating  → public_skate
 *   - IceSkating     → learn_to_skate, figure_skating
 *   - Hockey         → youth_league, adult_league, open_hockey, stick_and_puck,
 *                      pickup, drop_in, shinny, rat_hockey
 *   - ExerciseAction → power_skating, skate_school
 *
 * Things that don't have a perfect schema.org match fall back to SportsActivity.
 */
export function activityTypeToSchemaType(activityType: string): {
  type: string;
  name: string;
} {
  switch (activityType) {
    case 'public_skate':
      return { type: 'PublicSkating', name: 'Public Skate' };
    case 'learn_to_skate':
    case 'figure_skating':
      return { type: 'IceSkating', name: activityType === 'learn_to_skate' ? 'Learn to Skate' : 'Figure Skating' };
    case 'youth_league':
      return { type: 'Hockey', name: 'Youth Hockey' };
    case 'adult_league':
      return { type: 'Hockey', name: 'Adult Hockey' };
    case 'open_hockey':
      return { type: 'Hockey', name: 'Open Hockey' };
    case 'stick_and_puck':
      return { type: 'Hockey', name: 'Stick and Puck' };
    case 'pickup':
    case 'drop_in':
      return { type: 'Hockey', name: activityType === 'pickup' ? 'Pickup Hockey' : 'Drop-in Hockey' };
    case 'shinny':
      return { type: 'Hockey', name: 'Shinny' };
    case 'rat_hockey':
      return { type: 'Hockey', name: 'Rat Hockey' };
    case 'power_skating':
    case 'skate_school':
      return { type: 'ExerciseAction', name: activityType === 'power_skating' ? 'Power Skating' : 'Skate School' };
    case 'tournament':
    case 'camp':
    case 'tryout':
    case 'showcase':
    case 'broomball':
    case 'other':
    default:
      return { type: 'SportsActivity', name: humanizeActivityType(activityType) };
  }
}

function humanizeActivityType(activityType: string): string {
  return activityType
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function buildOpeningHours(rink: RinkSchemaInput): any[] | undefined {
  if (!Array.isArray(rink.opening_hours_json?.periods)) return undefined;
  return rink.opening_hours_json!.periods
    .filter(
      (p: any) =>
        p &&
        p.open &&
        typeof p.open.time === 'string' &&
        p.open.time.length >= 4 &&
        typeof p.open.day === 'number' &&
        p.open.day >= 0 &&
        p.open.day <= 6 &&
        p.close &&
        typeof p.close.time === 'string' &&
        p.close.time.length >= 4,
    )
    .map((p: any) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][p.open.day],
      opens: `${p.open.time.slice(0, 2)}:${p.open.time.slice(2, 4)}`,
      closes: `${p.close.time.slice(0, 2)}:${p.close.time.slice(2, 4)}`,
    }));
}

function mapEventStatus(status: string): string {
  switch (status) {
    case 'cancelled':
      return 'https://schema.org/EventCancelled';
    case 'completed':
      return 'https://schema.org/EventScheduled';
    case 'published':
    case 'pending':
    default:
      return 'https://schema.org/EventScheduled';
  }
}

function buildOffer(event: RinkEventForSchema): any | undefined {
  if (event.price_cents == null) return undefined;
  return {
    '@type': 'Offer',
    price: (event.price_cents / 100).toFixed(2),
    priceCurrency: event.currency || 'USD',
    url: event.registration_url
      ? `${BASE_URL}/events/${event.slug}`
      : `${BASE_URL}/events/${event.slug}`,
    availability:
      event.divisions?.some((d) => d.price_cents != null)
        ? 'https://schema.org/InStock'
        : 'https://schema.org/InStock',
    validFrom: event.starts_at,
  };
}

function buildSubEvent(division: NonNullable<RinkEventForSchema['divisions']>[number]): any {
  const sub: any = {
    '@type': 'Event',
    name: division.name,
  };
  if (division.age_min != null || division.age_max != null) {
    sub.eventAttendanceMode = 'https://schema.org/OfflineEventAttendanceMode';
  }
  if (division.skill_level) sub.additionalProperty = { name: 'skill_level', value: division.skill_level };
  if (division.gender && division.gender !== 'coed') sub.gender = division.gender;
  if (division.price_cents != null) {
    sub.offers = {
      '@type': 'Offer',
      price: (division.price_cents / 100).toFixed(2),
      priceCurrency: 'USD',
    };
  }
  return sub;
}

export function buildRinkSchema(
  rink: RinkSchemaInput,
  description: string,
  options: {
    programming?: RinkProgrammingForSchema[];
    upcomingEvents?: RinkEventForSchema[];
  } = {},
): any {
  const { programming = [], upcomingEvents = [] } = options;

  const sportsActivityLocation: any = {
    '@type': 'SportsActivityLocation',
    '@id': rink.slug ? `${BASE_URL}/directory/rinks/${rink.slug}` : undefined,
    name: rink.name,
    description,
    url: rink.slug ? `${BASE_URL}/directory/rinks/${rink.slug}` : undefined,
    ...(rink.cover_photo_url || rink.logo_url
      ? { image: rink.cover_photo_url || rink.logo_url }
      : {}),
    ...(rink.address
      ? {
          address: {
            '@type': 'PostalAddress',
            addressLocality: rink.city,
            addressRegion: provinceDisplayName(rink.province_state) || rink.province_state,
            addressCountry: rink.country,
            streetAddress: rink.address,
          },
        }
      : {}),
    ...(rink.latitude && rink.longitude
      ? { geo: { '@type': 'GeoCoordinates', latitude: rink.latitude, longitude: rink.longitude } }
      : {}),
    ...(rink.capacity ? { maximumAttendeeCapacity: rink.capacity } : {}),
    ...(rink.phone ? { telephone: rink.phone } : {}),
    ...(rink.website_url ? { url: rink.website_url } : {}),
    ...(rink.google_maps_url ? { hasMap: rink.google_maps_url } : {}),
    ...(() => {
      const hours = buildOpeningHours(rink);
      return hours && hours.length > 0 ? { openingHoursSpecification: hours } : {};
    })(),
    sport: 'Ice Hockey',
    ...(rink.ice_size
      ? { amenityFeature: [{ '@type': 'LocationFeatureSpecification', name: `${rink.ice_size} ice surface` }] }
      : {}),
  };

  // availableActivity: one entry per unique activity type from programming.
  // Schema.org SportsActivityLocation.availableActivity is an array of SportsActivity.
  if (programming.length > 0) {
    const dedup = new Map<string, { type: string; name: string }>();
    for (const p of programming) {
      if (!p.activity_type) continue;
      const mapped = activityTypeToSchemaType(p.activity_type);
      if (!dedup.has(mapped.name)) dedup.set(mapped.name, mapped);
    }
    sportsActivityLocation.availableActivity = Array.from(dedup.values()).map(({ type, name }) => {
      const act: any = {
        '@type': type,
        name,
      };
      // For fallback SportsActivity, link back to our enum value so the
      // relationship is preserved even if schema.org has no exact match.
      if (type === 'SportsActivity') {
        act.additionalType = `https://rinkstop.com/schema/rink_activity_type#${encodeURIComponent(name)}`;
      }
      return act;
    });
  }

  // event: cap at 50 items for schema validity (Google Rich Results limit).
  const eventsForSchema = upcomingEvents.slice(0, 50);
  if (eventsForSchema.length > 0) {
    sportsActivityLocation.event = eventsForSchema.map((e) => {
      const ev: any = {
        '@type': 'Event',
        name: e.title,
        startDate: e.starts_at,
        endDate: e.ends_at,
        eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
        eventStatus: mapEventStatus(e.status),
        url: `${BASE_URL}/events/${e.slug}`,
        ...(e.banner_image_url ? { image: e.banner_image_url } : {}),
        ...(e.description ? { description: e.description } : {}),
        location: {
          '@type': 'Place',
          name: rink.name,
          address: rink.address
            ? {
                '@type': 'PostalAddress',
                addressLocality: rink.city,
                addressRegion: provinceDisplayName(rink.province_state) || rink.province_state,
                addressCountry: rink.country,
                streetAddress: rink.address,
              }
            : { '@type': 'PostalAddress', addressCountry: rink.country },
        },
        organizer: {
          '@type': 'Organization',
          name: rink.name,
          url: rink.website_url || (rink.slug ? `${BASE_URL}/directory/rinks/${rink.slug}` : undefined),
        },
      };
      const offer = buildOffer(e);
      if (offer) ev.offers = offer;
      if (e.divisions && e.divisions.length > 0) {
        ev.subEvent = e.divisions.map(buildSubEvent);
      }
      return ev;
    });
  }

  return {
    '@context': 'https://schema.org',
    '@graph': [breadcrumb(rink), sportsActivityLocation],
  };
}

/**
 * Minimal fallback schema — just a breadcrumb. Used if the full builder
 * throws on malformed data (per Tier 1h 2026-07-07 safety pattern).
 */
export function buildRinkSchemaFallback(rink: RinkSchemaInput): any {
  return {
    '@context': 'https://schema.org',
    '@graph': [breadcrumb(rink)],
  };
}
