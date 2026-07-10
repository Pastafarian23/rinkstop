import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'RinkStop vs Competitors — Pricing & Value Comparison',
  description:
    'How RinkStop\'s pricing compares to LinkedIn Premium, Hudl, SportsEngine, Yelp, and other directory and team-management services. Side-by-side value analysis for every RinkStop tier.',
  alternates: { canonical: 'https://rinkstop.com/guides/rinkstop-vs-competitors' },
  openGraph: {
    title: 'RinkStop vs Competitors — Pricing & Value Comparison',
    description:
      'How RinkStop\'s pricing compares to LinkedIn Premium, Hudl, SportsEngine, Yelp, and other directory and team-management services.',
    type: 'article',
  },
};

const COMPARISON = [
  {
    category: 'Personal identity & networking',
    rows: [
      {
        ours: { tier: 'Verified Identity', price: '$24.99/yr' },
        them: { name: 'LinkedIn Premium Career', price: '$239.88/yr' },
        delta: '~90% cheaper',
        note: 'RinkStop\'s Verified Identity covers identity verification, claim a player profile, parent/guardian linking, and team invitations. LinkedIn Premium Career is profile boosting + InMail. Both are professional identity services — RinkStop is hockey-specific and cheaper.',
      },
      {
        ours: { tier: 'Identity Plus', price: '$59.99/yr' },
        them: { name: 'LinkedIn Premium Career', price: '$239.88/yr' },
        delta: '75% cheaper',
        note: 'Identity Plus adds Family Hub, advanced player analytics, achievement tracking, and unlimited photos/videos. LinkedIn\'s premium adds profile boosts. For parents managing multiple youth players, Identity Plus is built for the job.',
      },
    ],
  },
  {
    category: 'Team & club management',
    rows: [
      {
        ours: { tier: 'Club Starter', price: '$149/yr' },
        them: { name: 'SportsEngine HQ', price: '$696/yr' },
        delta: '79% cheaper',
        note: 'Both cover team management, registration, scheduling, attendance, payments, and a website. SportsEngine adds a few extras (uniform ordering, background checks) but at 4.7x the price.',
      },
      {
        ours: { tier: 'Club Pro', price: '$399/yr' },
        them: { name: 'Hudl Silver', price: '$1,000/yr' },
        delta: '60% cheaper',
        note: 'Club Pro adds coach + volunteer management, equipment, financial reporting, player transfers. Hudl Silver is video + analytics for competitive teams. Different focus — both expensive. For org management (not video), Club Pro wins on price.',
      },
      {
        ours: { tier: 'Club Elite', price: '$999/yr' },
        them: { name: 'Hudl Gold', price: '$1,600/yr' },
        delta: '38% cheaper',
        note: 'Club Elite = unlimited teams + advanced analytics + custom branding + API access + multi-location. Hudl Gold = video breakdown + recruiting for elite teams. Comparable for large clubs running multi-team operations.',
      },
      {
        ours: { tier: 'League', price: '$1,999/yr' },
        them: { name: 'SportsEngine HQ (league plan)', price: 'Custom (typically $2k-$5k)' },
        delta: 'Below market',
        note: 'League-wide management + dedicated success manager + onboarding + migration support. Custom pricing makes direct comparison difficult — but $1,999 is below the typical league-plan entry for SportsEngine / LeagueApps.',
      },
    ],
  },
  {
    category: 'Business listings (rink / shop / brand)',
    rows: [
      {
        ours: { tier: 'Business Listing', price: '$99/yr' },
        them: { name: 'Yelp basic', price: '$360-$720/yr' },
        delta: '73-86% cheaper',
        note: 'Verified listing, contact info, lead form, photos, analytics. Yelp\'s basic tier is the closest comparator — RinkStop is hockey-specific (your audience is here), and undercutting Yelp by 3-7x.',
      },
      {
        ours: { tier: 'Business Plus', price: '$299/yr' },
        them: { name: 'Yelp Enhanced', price: '$1,080-$2,400/yr' },
        delta: '73-87% cheaper',
        note: 'Multi-listing, featured placement, promotions, messaging, enhanced analytics, booking support. Yelp\'s Enhanced tier is the closest — same feature set at 3-8x the price. BBB accreditation ($500-$1,000/yr) is also undercut.',
      },
    ],
  },
];

export default function RinkStopVsCompetitors() {
  return (
    <div style={{ maxWidth: '920px', margin: '0 auto', padding: '0.75rem 1rem 4rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1rem' }}>
        <Link href="/">Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/guides" style={{ color: '#555' }}>Guides</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>RinkStop vs Competitors</span>
      </nav>

      <span
        style={{
          display: 'inline-block',
          fontSize: '0.5625rem',
          fontWeight: 800,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          padding: '0.2rem 0.6rem',
          borderRadius: '4px',
          background: 'rgba(200,16,46,0.12)',
          color: '#C8102E',
          marginBottom: '0.75rem',
        }}
      >
        Pricing Analysis
      </span>

      <h1
        style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: 'clamp(2rem, 5vw, 2.75rem)',
          color: '#fff',
          letterSpacing: '0.04em',
          lineHeight: 1,
          margin: '0 0 0.75rem',
        }}
      >
        RINKSTOP VS COMPETITORS — PRICING & VALUE COMPARISON
      </h1>

      <p
        style={{
          color: 'rgba(255,255,255,0.4)',
          fontSize: '0.9375rem',
          lineHeight: 1.6,
          marginBottom: '1.5rem',
        }}
      >
        Side-by-side comparison of RinkStop&apos;s 8 paid tiers against the closest
        real-world alternatives. Every competitor price is from a publicly-listed
        source or vendor-quoted plan as of 2026. If you find a price that has
        changed, email{' '}
        <a href="mailto:support@rinkstop.com" style={{ color: '#FFB81C' }}>
          support@rinkstop.com
        </a>
        .
      </p>

      <p
        style={{
          color: 'rgba(255,255,255,0.6)',
          fontSize: '0.9375rem',
          lineHeight: 1.7,
          marginBottom: '2rem',
        }}
      >
        The honest summary: every RinkStop paid tier undercuts its closest
        competitor by 38-90%. The reason we can do this is scope: we serve
        hockey, not every sport and not every profession. Hockey-specific
        value (claim your local rink, claim your kid&apos;s team profile, find
        rinks and leagues by city) is what you&apos;re paying for — and what no
        general-purpose directory offers at any price.
      </p>

      {COMPARISON.map((section) => (
        <section key={section.category} style={{ marginBottom: '3rem' }}>
          <h2
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: '1.5rem',
              color: '#fff',
              letterSpacing: '0.04em',
              marginBottom: '1rem',
            }}
          >
            {section.category.toUpperCase()}
          </h2>

          {section.rows.map((row, i) => (
            <div
              key={i}
              style={{
                background: 'rgba(255,255,255,0.025)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '10px',
                padding: '1.25rem 1.5rem',
                marginBottom: '1rem',
              }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto 1fr',
                  gap: '1rem',
                  alignItems: 'center',
                  marginBottom: '0.75rem',
                }}
              >
                <div>
                  <p
                    style={{
                      fontSize: '0.6875rem',
                      fontWeight: 700,
                      color: '#FFB81C',
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      marginBottom: '0.25rem',
                    }}
                  >
                    RinkStop
                  </p>
                  <p
                    style={{
                      fontSize: '1.125rem',
                      fontWeight: 700,
                      color: '#fff',
                      marginBottom: '0.125rem',
                    }}
                  >
                    {row.ours.tier}
                  </p>
                  <p style={{ fontSize: '0.875rem', color: '#FFB81C' }}>{row.ours.price}</p>
                </div>

                <div
                  style={{
                    fontSize: '1.5rem',
                    color: 'rgba(255,255,255,0.3)',
                    textAlign: 'center',
                  }}
                >
                  vs
                </div>

                <div style={{ textAlign: 'right' }}>
                  <p
                    style={{
                      fontSize: '0.6875rem',
                      fontWeight: 700,
                      color: 'rgba(255,255,255,0.4)',
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      marginBottom: '0.25rem',
                    }}
                  >
                    Closest Competitor
                  </p>
                  <p
                    style={{
                      fontSize: '1.125rem',
                      fontWeight: 700,
                      color: '#fff',
                      marginBottom: '0.125rem',
                    }}
                  >
                    {row.them.name}
                  </p>
                  <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)' }}>
                    {row.them.price}
                  </p>
                </div>
              </div>

              <div
                style={{
                  display: 'inline-block',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '0.25rem 0.6rem',
                  borderRadius: '4px',
                  background: 'rgba(0,150,80,0.12)',
                  color: '#009650',
                  marginBottom: '0.75rem',
                }}
              >
                {row.delta}
              </div>

              <p
                style={{
                  fontSize: '0.875rem',
                  color: 'rgba(255,255,255,0.6)',
                  lineHeight: 1.6,
                }}
              >
                {row.note}
              </p>
            </div>
          ))}
        </section>
      ))}

      <section
        style={{
          background: 'rgba(255,184,28,0.05)',
          border: '1px solid rgba(255,184,28,0.2)',
          borderRadius: '10px',
          padding: '1.5rem',
          marginBottom: '2rem',
        }}
      >
        <h2
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: '1.5rem',
            color: '#FFB81C',
            letterSpacing: '0.04em',
            marginBottom: '0.75rem',
          }}
        >
          IS IT WORTH IT?
        </h2>
        <p
          style={{
            color: 'rgba(255,255,255,0.7)',
            fontSize: '0.9375rem',
            lineHeight: 1.7,
            marginBottom: '1rem',
          }}
        >
          For a <strong style={{ color: '#fff' }}>parent claiming a kid&apos;s player profile</strong>:{' '}
          $24.99/yr is the cost of one hockey tape roll. If your kid plays 5+ years,
          that&apos;s $5/year to have a permanent verified record of their career.
          <strong style={{ color: '#009650' }}> Worth it.</strong>
        </p>
        <p
          style={{
            color: 'rgba(255,255,255,0.7)',
            fontSize: '0.9375rem',
            lineHeight: 1.7,
            marginBottom: '1rem',
          }}
        >
          For a <strong style={{ color: '#fff' }}>rink owner claiming their rink listing</strong>:{' '}
          $99/yr Business Listing includes a lead-capture form. If that form gets
          you 3-5 league inquiries per year, each of which converts to one
          tournament booking ($300-$2,000 revenue), the listing pays for itself in
          a single booking.{' '}
          <strong style={{ color: '#009650' }}>Worth it.</strong>
        </p>
        <p
          style={{
            color: 'rgba(255,255,255,0.7)',
            fontSize: '0.9375rem',
            lineHeight: 1.7,
            marginBottom: '1rem',
          }}
        >
          For a <strong style={{ color: '#fff' }}>small club (under 30 players)</strong>:{' '}
          $149/yr Club Starter vs $696/yr SportsEngine HQ. If you&apos;re a small club
          that hasn&apos;t committed to either yet, RinkStop&apos;s tier is the
          price-of-entry choice.{' '}
          <strong style={{ color: '#009650' }}>Worth it.</strong>
        </p>
        <p
          style={{
            color: 'rgba(255,255,255,0.7)',
            fontSize: '0.9375rem',
            lineHeight: 1.7,
          }}
        >
          For a <strong style={{ color: '#fff' }}>league or federation</strong>:{' '}
          You already have infrastructure and a budget. RinkStop&apos;s $1,999 League tier
          is competitive with what you&apos;d pay elsewhere — the question is whether
          adding RinkStop to your stack is worth the integration cost. For most
          established leagues, this is a sales conversation, not a self-serve
          decision.
        </p>
      </section>

      <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
        <Link
          href="/pricing"
          style={{
            background: '#C8102E',
            color: '#fff',
            padding: '0.875rem 2rem',
            borderRadius: 8,
            textDecoration: 'none',
            fontWeight: 700,
            fontSize: '1rem',
            display: 'inline-block',
          }}
        >
          See all RinkStop pricing →
        </Link>
      </div>

      <p
        style={{
          color: 'rgba(255,255,255,0.3)',
          fontSize: '0.75rem',
          textAlign: 'center',
          marginTop: '2rem',
        }}
      >
        Last updated: 2026-07-10. Prices for competitors are sourced from each
        vendor&apos;s public pricing page as of the date above. RinkStop reserves the
        right to update tier pricing at any time; the values shown on{' '}
        <Link href="/pricing" style={{ color: '#FFB81C' }}>
          /pricing
        </Link>{' '}
        are always authoritative.
      </p>
    </div>
  );
}