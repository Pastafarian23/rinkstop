/**
 * IceMarketplaceSEO — informational body copy + JSON-LD ItemList for
 * /ice-marketplace. Provides the long-form content Google needs to
 * understand what the page is for and what entities (listings) it
 * contains.
 *
 * Strategy:
 *   - <script type="application/ld+json"> with ItemList of every
 *     visible listing. Google can use this for rich results
 *     (carousel, sitelinks search box expansion).
 *   - <h2> sub-headings targeting real search intents:
 *     "buy ice time by the hour", "open practice ice near me",
 *     "rent a hockey rink", "ice marketplace for clubs".
 *   - Copy is plain prose, ~300 words of unique content. No thin
 *     content flags.
 */

import Link from 'next/link';

interface ListingRow {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  requested_price_cents: number | null;
  currency: string;
  rink: { id: string; name: string; slug: string | null; city: string | null; province_state: string | null; country: string | null } | null;
}

interface Props {
  total: number;
  // The full list of listings rendered on the page is already
  // available in the parent. We don't need to re-fetch.
  listings?: ListingRow[];
}

const SITE = 'https://rinkstop.com';

export default function IceMarketplaceSEO({ total, listings = [] }: Props) {
  // JSON-LD ItemList of every listing rendered. cap at 50 to keep
  // the schema payload reasonable; Google can crawl the page for the rest.
  const itemListElements = listings.slice(0, 50).map((l, i) => {
    const r = l.rink;
    const location = r
      ? [r.city, r.province_state, r.country].filter(Boolean).join(', ')
      : '';
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
              address: location || undefined,
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
    name: 'Open ice time on RinkStop',
    description:
      'Open ice time and hockey practice slots listed for sale or rent by rinks, clubs, and teams. Filter by city, age group, and skill level.',
    numberOfItems: total,
    itemListElement: itemListElements,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <section
        data-ice-marketplace-seo="true"
        style={{
          marginTop: '3rem',
          padding: '2rem 0',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          color: 'rgba(255,255,255,0.85)',
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
          Buy open ice time by the hour
        </h2>
        <p style={{ fontSize: '0.95rem', lineHeight: 1.6, margin: '0 0 1rem' }}>
          The RinkStop Ice Marketplace is the easiest way for hockey teams, figure skaters, and tournament
          organizers to find open ice by the hour. Rinks, clubs, and associations list their unused or
          off-peak ice here so coaches and parents can book it without cold-calling the rink office. Every
          listing shows the rink name, the start and end time, the skill level and age group the ice is
          appropriate for, and a price per hour. Filter by city, slot type (practice, tournament, camp,
          clinic, or game), and skill level to find what you need.
        </p>

        <h2
          style={{
            fontFamily: '"Bebas Neue", sans-serif',
            fontSize: '1.5rem',
            letterSpacing: '0.04em',
            color: '#fff',
            margin: '1.5rem 0 0.75rem',
          }}
        >
          For rinks and arena operators
        </h2>
        <p style={{ fontSize: '0.95rem', lineHeight: 1.6, margin: '0 0 1rem' }}>
          If you operate a rink or run a hockey club, you can list your open ice on RinkStop for free. You
          set the price, the slot duration, and who the ice is for. Coaches and parents searching for ice
          in your area will find you. To get started,{' '}
          <Link href="/launch" style={{ color: '#FFB81C', textDecoration: 'underline' }}>
            apply to be a founding partner
          </Link>{' '}
          — founding partners pay 0% take-rate for their first 6 months on the platform.
        </p>

        <h2
          style={{
            fontFamily: '"Bebas Neue", sans-serif',
            fontSize: '1.5rem',
            letterSpacing: '0.04em',
            color: '#fff',
            margin: '1.5rem 0 0.75rem',
          }}
        >
          For coaches, parents, and tournament organizers
        </h2>
        <p style={{ fontSize: '0.95rem', lineHeight: 1.6, margin: '0 0 1rem' }}>
          No account required to browse or inquire. Click &ldquo;Request to book&rdquo; on any listing to
          send the rink owner a direct inquiry. The rink will reply with availability, exact pricing, and
          a payment link. For the best results, include the team level, number of players, and any
          equipment needs (nets, boards, etc.) in the notes.
        </p>

        <h2
          style={{
            fontFamily: '"Bebas Neue", sans-serif',
            fontSize: '1.5rem',
            letterSpacing: '0.04em',
            color: '#fff',
            margin: '1.5rem 0 0.75rem',
          }}
        >
          Browse open ice by city
        </h2>
        <p style={{ fontSize: '0.95rem', lineHeight: 1.6, margin: '0 0 0.5rem' }}>
          RinkStop covers rinks across the United States, Canada, and 70+ other countries. To find ice in a
          specific city, jump straight to your local directory:
        </p>
        <ul style={{ fontSize: '0.95rem', lineHeight: 1.7, margin: '0 0 1rem', paddingLeft: '1.25rem' }}>
          <li>
            <Link href="/directory/united-states" style={{ color: '#38BDF8', textDecoration: 'underline' }}>
              United States
            </Link>{' '}
            — rinks in all 50 states
          </li>
          <li>
            <Link href="/directory/canada" style={{ color: '#38BDF8', textDecoration: 'underline' }}>
              Canada
            </Link>{' '}
            — rinks in all 13 provinces and territories
          </li>
          <li>
            <Link href="/directory/sweden" style={{ color: '#38BDF8', textDecoration: 'underline' }}>
              Sweden
            </Link>
            ,{' '}
            <Link href="/directory/finland" style={{ color: '#38BDF8', textDecoration: 'underline' }}>
              Finland
            </Link>
            ,{' '}
            <Link href="/directory/czech-republic" style={{ color: '#38BDF8', textDecoration: 'underline' }}>
              Czech Republic
            </Link>
            , and 60+ other countries
          </li>
        </ul>
        <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)', margin: '0' }}>
          You can also browse all 1,857+ rinks in the{' '}
          <Link href="/directory/rinks" style={{ color: '#38BDF8', textDecoration: 'underline' }}>
            rink directory
          </Link>{' '}
          or all{' '}
          <Link href="/directory/teams" style={{ color: '#38BDF8', textDecoration: 'underline' }}>
            hockey teams
          </Link>
          .
        </p>
      </section>
    </>
  );
}
