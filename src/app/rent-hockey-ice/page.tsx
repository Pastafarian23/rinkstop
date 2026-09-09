// /rent-hockey-ice
//
// Commercial-intent landing page targeting "rent hockey ice",
// "hockey ice rental", "ice rink rental", "ice rental near me".
// This is the second-most-common way people search for the same thing.
// The page is indexable, has FAQ schema + BreadcrumbList, and links
// to the marketplace hub + city hubs.

import Link from 'next/link';
import type { Metadata } from 'next';
import type { CSSProperties } from 'react';

export const dynamic = 'force-static';

const SITE = 'https://rinkstop.com';

export const metadata: Metadata = {
  title: 'Rent Hockey Ice — Practice, Tournament, and Clinic Ice Rental | RinkStop',
  description:
    'Rent hockey ice by the hour from rinks, clubs, and teams. Practice ice, tournament slots, and clinic ice for rent in the U.S., Canada, and 70+ countries. List yours free.',
  alternates: { canonical: `${SITE}/rent-hockey-ice` },
  robots: { index: true, follow: true, 'max-image-preview': 'large' },
  openGraph: {
    title: 'Rent Hockey Ice — Practice, Tournament, and Clinic Ice Rental',
    description: 'Rent hockey ice by the hour. Practice, tournaments, clinics, and game ice from rinks near you.',
    url: `${SITE}/rent-hockey-ice`,
    siteName: 'RinkStop',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Rent Hockey Ice by the Hour',
    description: 'Rent hockey ice by the hour from rinks, clubs, and teams across 70+ countries.',
  },
};

export default function RentHockeyIcePage() {
  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'How do I rent hockey ice?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Find a city hub on RinkStop\'s ice marketplace, click a listing that fits your time and budget, and click "Request to book." The rink owner replies within one business day with availability, exact pricing, and a payment link.',
        },
      },
      {
        '@type': 'Question',
        name: 'Can I rent a full hockey rink?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes. Most listings on RinkStop are full-rink rentals. Some rinks also split-ice rentals for skills sessions or small groups. Each listing shows whether the slot is full-ice, half-ice, or shared.',
        },
      },
      {
        '@type': 'Question',
        name: 'How much does it cost to rent a hockey rink?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Hockey rink rentals vary widely. Off-peak practice ice runs $80–$150/hour at most rinks. Prime-time evening and weekend slots run $200–$400/hour. Tournament and showcase ice in major markets can run $300–$500+/hour. Each listing on RinkStop shows the exact price.',
        },
      },
      {
        '@type': 'Question',
        name: 'Do I need insurance to rent hockey ice?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'It depends on the rink. Most rinks require proof of liability insurance for organized team practices, tournaments, and adult leagues. Casual pickup or stick-and-puck usually doesn\'t require insurance. Ask the rink owner when they reply to your booking request.',
        },
      },
      {
        '@type': 'Question',
        name: 'Can I list my rink\'s open ice for rent?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes. Rinks, clubs, and teams can list their ice for rent for free at rinkstop.com/launch. Founding partners pay 0% take-rate for the first 6 months.',
        },
      },
    ],
  };

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE}/` },
      { '@type': 'ListItem', position: 2, name: 'Rent Hockey Ice', item: `${SITE}/rent-hockey-ice` },
    ],
  };

  return (
    <main
      data-page="rent-hockey-ice"
      style={{ background: '#0F172A', color: '#fff', minHeight: '100vh', padding: '2rem 1rem 4rem' }}
    >
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <nav aria-label="Breadcrumb" style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.5)', marginBottom: '1rem' }}>
          <Link href="/" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>Home</Link>
          <span style={{ margin: '0 0.4rem' }}>›</span>
          <span style={{ color: '#FFB81C' }}>Rent Hockey Ice</span>
        </nav>

        <h1
          data-rhi-h1="main"
          style={{
            fontFamily: '"Bebas Neue", sans-serif',
            fontSize: 'clamp(2rem, 5vw, 3rem)',
            color: '#fff',
            margin: '0 0 0.5rem',
            letterSpacing: '0.02em',
            lineHeight: 1.1,
          }}
        >
          Rent Hockey Ice
        </h1>
        <p style={{ color: '#94A3B8', fontSize: '1.1rem', maxWidth: 640, margin: '0 0 1.5rem' }}>
          Rent hockey ice by the hour from rinks, clubs, and teams. Practice ice, tournament slots,
          clinic ice, and game ice from rinks near you — in the U.S., Canada, and 70+ other countries.
        </p>

        {/* Primary CTA */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
          <Link
            href="/ice-marketplace"
            data-rhi-cta="browse"
            style={{
              display: 'inline-block',
              padding: '0.75rem 1.5rem',
              background: '#C8102E',
              color: '#fff',
              borderRadius: 6,
              fontWeight: 700,
              textDecoration: 'none',
              fontSize: '0.9375rem',
            }}
          >
            Browse the marketplace →
          </Link>
          <Link
            href="/open-ice-near-me"
            data-rhi-cta="near-me"
            style={{
              display: 'inline-block',
              padding: '0.75rem 1.5rem',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.3)',
              color: '#fff',
              borderRadius: 6,
              fontWeight: 600,
              textDecoration: 'none',
              fontSize: '0.9375rem',
            }}
          >
            Find open ice near me
          </Link>
        </div>

        {/* SEO body */}
        <section
          data-rhi-seo="true"
          style={{
            padding: '2rem 0',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.85)',
            fontSize: '0.95rem',
            lineHeight: 1.6,
          }}
        >
          <h2 style={sectionH2}>Who rents hockey ice?</h2>
          <p>
            Hockey ice gets rented by teams, coaches, leagues, tournament organizers, hockey schools,
            skills coaches, and individuals for pickup games. RinkStop makes it easy for any of them
            to find ice in their city without cold-calling a dozen rinks. Browse the{' '}
            <Link href="/ice-marketplace" style={link}>ice marketplace</Link> for live listings, or
            use the <Link href="/open-ice-near-me" style={link}>near-me search</Link> to find ice in
            a specific city.
          </p>

          <h2 style={sectionH2}>Types of hockey ice available for rent</h2>
          <p>RinkStop listings cover every category of hockey ice rental:</p>
          <ul style={{ paddingLeft: '1.25rem', margin: '0 0 1rem' }}>
            <li><strong>Practice ice</strong> — the bread and butter of hockey rentals. Off-peak hours when the rink isn&apos;t running programs.</li>
            <li><strong>Tournament ice</strong> — multi-day blocks for showcase and tournament organizers.</li>
            <li><strong>Camps and clinics</strong> — full-day or multi-day ice for hockey schools and development programs.</li>
            <li><strong>Game ice</strong> — prime-time slots for leagues, exhibition games, and playoffs.</li>
            <li><strong>Pickup ice</strong> — open stick time for adult-league and pickup-style play.</li>
          </ul>

          <h2 style={sectionH2}>What does it cost to rent a hockey rink?</h2>
          <p>
            Hockey rink rental rates vary by city, time of day, and slot type. Here are rough ranges
            based on what gets listed on RinkStop:
          </p>
          <ul style={{ paddingLeft: '1.25rem', margin: '0 0 1rem' }}>
            <li><strong>Off-peak practice</strong> (early mornings, weekday afternoons): $80&ndash;$150/hour</li>
            <li><strong>Evening/weekend prime-time</strong> at suburban rinks: $150&ndash;$300/hour</li>
            <li><strong>Tournament ice</strong> in major markets (Toronto, Boston, Chicago, Stockholm): $300&ndash;$500+/hour</li>
            <li><strong>Pickup / open stick</strong>: $10&ndash;$25 per skater at most rinks</li>
          </ul>
          <p>
            Every RinkStop listing shows the exact price. You can filter the{' '}
            <Link href="/ice-marketplace" style={link}>marketplace</Link> by price range.
          </p>

          <h2 style={sectionH2}>How renting hockey ice works on RinkStop</h2>
          <ol style={{ paddingLeft: '1.25rem', margin: '0 0 1rem' }}>
            <li><strong>Find a city</strong> &mdash; use the marketplace or the <Link href="/open-ice-near-me" style={link}>near-me search</Link>.</li>
            <li><strong>Browse listings</strong> &mdash; filter by date, time, slot type, price, age group, and skill level.</li>
            <li><strong>Request to book</strong> &mdash; click any listing, fill in your name, email, and a short note about your team or group.</li>
            <li><strong>Confirm with the rink owner</strong> &mdash; the owner replies within 1 business day with availability, exact pricing, and a payment link.</li>
          </ol>
          <p>
            You don&apos;t need a RinkStop account to request ice. Booking requests go directly to the rink owner.
          </p>

          <h2 style={sectionH2}>List your rink&apos;s ice for rent</h2>
          <p>
            Rink operators, hockey clubs, and team organizers can list their open ice for free. Founding
            partners pay 0% take-rate for the first 6 months. Apply at{' '}
            <Link href="/launch" style={link}>rinkstop.com/launch</Link>.
          </p>
        </section>

        {/* Country links for SEO crawl depth */}
        <section
          data-rhi-countries="true"
          style={{
            marginTop: '2.5rem',
            padding: '2rem',
            background: 'rgba(13,17,23,0.6)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 12,
          }}
        >
          <h2 style={sectionH2}>Rent ice by country</h2>
          <p style={{ color: '#94A3B8', fontSize: '0.9rem', margin: '0 0 1rem' }}>
            Pick a country to see all listed ice for rent:
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.5rem' }}>
            {[
              { slug: 'united-states', name: 'United States' },
              { slug: 'canada', name: 'Canada' },
              { slug: 'sweden', name: 'Sweden' },
              { slug: 'finland', name: 'Finland' },
              { slug: 'czech-republic', name: 'Czech Republic' },
              { slug: 'germany', name: 'Germany' },
              { slug: 'russia', name: 'Russia' },
              { slug: 'switzerland', name: 'Switzerland' },
            ].map((c) => (
              <Link
                key={c.slug}
                href={`/ice-marketplace/${c.slug}`}
                data-rhi-country={c.slug}
                style={countryPill}
              >
                {c.name}
              </Link>
            ))}
          </div>
        </section>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
    </main>
  );
}

const sectionH2: CSSProperties = {
  fontFamily: '"Bebas Neue", sans-serif',
  fontSize: '1.5rem',
  letterSpacing: '0.04em',
  color: '#fff',
  margin: '1.5rem 0 0.75rem',
};

const link: CSSProperties = {
  color: '#38BDF8',
  textDecoration: 'underline',
};

const countryPill: CSSProperties = {
  display: 'block',
  padding: '0.625rem 0.875rem',
  background: 'rgba(56,189,248,0.08)',
  border: '1px solid rgba(56,189,248,0.25)',
  borderRadius: 6,
  color: '#7DD3FC',
  textDecoration: 'none',
  fontSize: '0.9rem',
  fontWeight: 600,
  textAlign: 'center',
};
