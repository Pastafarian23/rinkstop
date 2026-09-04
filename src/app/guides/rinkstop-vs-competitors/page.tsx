import type { Metadata } from 'next';
import Link from 'next/link';
import { withDefaultOg } from '@/lib/metadata-defaults';

export const metadata: Metadata = {
  title: 'RinkStop vs SportsEngine, Hudl, Yelp & LinkedIn (2026 Pricing Comparison)',
  description:
    'Side-by-side comparison of RinkStop\'s pricing against SportsEngine HQ, Hudl, LinkedIn Premium, Yelp, and BBB. Detailed value analysis for rink owners, club admins, parents, and players. Updated July 2026.',
  alternates: { canonical: 'https://rinkstop.com/guides/rinkstop-vs-competitors' },
  openGraph: withDefaultOg({
    title: 'RinkStop vs SportsEngine, Hudl, Yelp & LinkedIn (2026 Pricing Comparison)',
    description:
      'How RinkStop\'s pricing compares to SportsEngine HQ, Hudl, LinkedIn Premium, Yelp, and BBB. For rink owners, club admins, parents, and players.',
    type: 'article',
  }),
  keywords: [
    'rinkstop vs sportsengine',
    'rinkstop vs hudl',
    'hockey team management software pricing',
    'rink listing directory cost',
    'ice rink listing service',
    'hockey player profile website',
    'sportsengine pricing',
    'hudl pricing',
    'yelp business listing cost',
    'claim your rink listing',
  ],
};

const COMPARISON = [
  {
    category: 'Personal identity & networking',
    rows: [
      {
        ours: { tier: 'Hockey Passport', price: '$24.99/yr' },
        them: { name: 'LinkedIn Premium Career', price: '$239.88/yr' },
        delta: '~90% cheaper',
        note: 'RinkStop\'s Hockey Passport tier covers identity verification, claiming a player profile, parent/guardian linking, and team invitations. LinkedIn Premium Career is profile boosting plus InMail credits. Both serve the same underlying need — a verified professional identity — but RinkStop\'s scope is hockey-specific. For a parent who wants to claim and verify their kid\'s youth-hockey profile, $24.99/yr is built for that job. LinkedIn at $239.88/yr is overkill.',
      },
      {
        ours: { tier: 'Hockey Passport Plus', price: '$59.99/yr' },
        them: { name: 'LinkedIn Premium Career', price: '$239.88/yr' },
        delta: '75% cheaper',
        note: 'Hockey Passport Plus adds Family Hub (parent managing multiple children), advanced player analytics, achievement tracking, and unlimited photo/video uploads. For parents with two or more youth hockey players, Hockey Passport Plus pays for itself by centralizing profiles that would otherwise sit in five different apps. LinkedIn Premium Career has none of those features.',
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
        note: 'Both products cover the same core workflow: team management, registration, scheduling, attendance, payments, and a team website. SportsEngine HQ adds uniform ordering and background checks — useful for some clubs, irrelevant for most. The 4.7x price difference reflects SportsEngine\'s scale advantage with USA Hockey affiliation, not a feature gap most clubs will notice.',
      },
      {
        ours: { tier: 'Club Pro', price: '$399/yr' },
        them: { name: 'Hudl Silver', price: '$1,000/yr' },
        delta: '60% cheaper',
        note: 'Different focus. Hudl Silver is video breakdown and analytics for competitive teams — coaches upload game film, players get clip libraries. Club Pro on RinkStop is operations: coach and volunteer management, equipment tracking, financial reporting, player transfers. If you need video, you need Hudl. If you need to run a club, Club Pro at $399 vs Hudl Silver at $1,000 is a real comparison.',
      },
      {
        ours: { tier: 'Club Elite', price: '$999/yr' },
        them: { name: 'Hudl Gold', price: '$1,600/yr' },
        delta: '38% cheaper',
        note: 'Club Elite covers unlimited teams, advanced analytics, custom branding, API access, bulk imports, and multi-location support — built for clubs running 5+ teams or multiple geographic chapters. Hudl Gold adds elite-level video breakdown and recruiting tools. If your club is 5+ teams and you do not need Hudl\'s video ecosystem, Club Elite at $999 is the closest equivalent at 38% less.',
      },
      {
        ours: { tier: 'League', price: '$1,999/yr' },
        them: { name: 'SportsEngine HQ (league plan)', price: 'Custom (typically $2k-$5k)' },
        delta: 'Below market',
        note: 'League-wide management with a dedicated success manager, onboarding, and migration support. Custom pricing for the comparable SportsEngine plan makes a direct dollar comparison impossible — but $1,999 lands below the typical league-plan entry, and the dedicated CSM is the same model used by SportsEngine and LeagueApps at higher price points.',
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
        note: 'Verified listing with contact information, lead form, photos, and basic analytics. Yelp\'s basic tier is the closest competitor in feature set — but Yelp\'s audience is general consumers looking for restaurants and home services, not hockey players and rink operators. RinkStop\'s audience is the entire hockey ecosystem. For a rink owner, the conversion rate from RinkStop traffic will be 5-10x Yelp traffic for the same listing.',
      },
      {
        ours: { tier: 'Business Plus', price: '$299/yr' },
        them: { name: 'Yelp Enhanced', price: '$1,080-$2,400/yr' },
        delta: '73-87% cheaper',
        note: 'Multi-listing support, featured placement, promotions, messaging, enhanced analytics, and booking support. Yelp\'s Enhanced tier covers similar features, plus advertising spend that doesn\'t apply to a niche audience. BBB accreditation runs $500-$1,000/yr for the trust signal alone, with no marketing features. RinkStop Business Plus at $299/yr is the comparison: full feature set, niche audience, lower price.',
      },
    ],
  },
];

const FAQ = [
  {
    q: 'How accurate are the competitor prices on this page?',
    a: 'Every competitor price is sourced from the vendor\'s public pricing page or a directly-quoted plan as of July 2026. We re-verify quarterly. If you find a price that has changed, email support@rinkstop.com and we will update this page within 48 hours.',
  },
  {
    q: 'Does RinkStop replace SportsEngine, Hudl, or my existing tools?',
    a: 'For most clubs, no — it complements them. If you already run Hudl for video breakdown, keep Hudl. RinkStop\'s value is the directory + claim + identity layer that those tools do not cover. The exception: very small clubs (under 30 players) who have not committed to a paid management tool yet. For them, RinkStop Club Starter at $149/yr replaces the need for SportsEngine HQ at $696/yr.',
  },
  {
    q: 'Is RinkStop\'s pricing in USD?',
    a: 'Yes, all prices are in US dollars per year. We do not currently offer non-USD billing — international users pay in USD via Stripe.',
  },
  {
    q: 'What does RinkStop NOT do that competitors do?',
    a: 'Three things, honestly. (1) We do not have a video breakdown tool — Hudl is the standard for that and we recommend keeping it. (2) We do not have a payment processor for registration fees — for that, you still need Stripe Connect, Square, or a tool like LeagueApps. (3) We do not have a mobile app for offline tournament management — that\'s TeamSnap\'s territory. RinkStop is the directory and identity layer, not a complete club-operations replacement.',
  },
  {
    q: 'Is there a free trial?',
    a: 'No — the Free tier is the trial. You can browse, save, follow, and explore every feature of the directory at $0. When you upgrade to a paid tier, you can cancel within 14 days for a full refund (no questions asked).',
  },
  {
    q: 'Can I switch tiers or cancel anytime?',
    a: 'Yes. Upgrades take effect immediately and the unused portion of your current plan is credited. Downgrades and cancellations take effect at the end of your billing period. There are no annual commitments — all RinkStop tiers are billed annually with monthly cancellation.',
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
        Pricing Analysis · Updated July 2026
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
        RINKSTOP VS COMPETITORS — A SIDE-BY-SIDE PRICING COMPARISON
      </h1>

      <p
        style={{
          color: 'rgba(255,255,255,0.4)',
          fontSize: '0.9375rem',
          lineHeight: 1.6,
          marginBottom: '1.5rem',
        }}
      >
        Comparing RinkStop against SportsEngine HQ, Hudl, LinkedIn Premium, Yelp, and the BBB for buyers evaluating <strong style={{ color: '#fff' }}>hockey team management software</strong>, <strong style={{ color: '#fff' }}>rink listing directory</strong> services, and <strong style={{ color: '#fff' }}>hockey player profile</strong> platforms. Every competitor price below is sourced from that vendor&apos;s public pricing page as of July 2026.
      </p>

      <p
        style={{
          color: 'rgba(255,255,255,0.6)',
          fontSize: '0.9375rem',
          lineHeight: 1.7,
          marginBottom: '1rem',
        }}
      >
        The honest summary: every RinkStop paid tier undercuts its closest competitor by 38-90%. The reason is scope. We serve hockey, not every sport, not every profession. Hockey-specific value — claim your local rink, claim your kid&apos;s team profile, find rinks and leagues by city — is what you&apos;re paying for, and what no general-purpose directory offers at any price.
      </p>

      <p
        style={{
          color: 'rgba(255,255,255,0.6)',
          fontSize: '0.9375rem',
          lineHeight: 1.7,
          marginBottom: '2.5rem',
        }}
      >
        But &quot;cheaper&quot; is not the same as &quot;worth it.&quot; Below we break down per-tier value for the four buyer personas who actually pay for these products: <strong style={{ color: '#fff' }}>parents claiming a kid&apos;s player profile</strong>, <strong style={{ color: '#fff' }}>rink owners claiming their rink listing</strong>, <strong style={{ color: '#fff' }}>small clubs replacing SportsEngine HQ</strong>, and <strong style={{ color: '#fff' }}>leagues and federations</strong> evaluating enterprise plans.
      </p>

      <h2
        style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: '1.75rem',
          color: '#fff',
          letterSpacing: '0.04em',
          marginBottom: '1rem',
          paddingBottom: '0.5rem',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        THE COMPARISON
      </h2>

      {COMPARISON.map((section) => (
        <section key={section.category} style={{ marginBottom: '2.5rem' }}>
          <h3
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: '1.4rem',
              color: '#FFB81C',
              letterSpacing: '0.04em',
              marginBottom: '1rem',
            }}
          >
            {section.category}
          </h3>

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
                  <p style={{ fontSize: '0.875rem', color: '#FFB81C', fontWeight: 600 }}>
                    {row.ours.price}
                  </p>
                </div>

                <div
                  style={{
                    fontSize: '1.25rem',
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
                  color: 'rgba(255,255,255,0.65)',
                  lineHeight: 1.65,
                }}
              >
                {row.note}
              </p>
            </div>
          ))}
        </section>
      ))}

      <h2
        style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: '1.75rem',
          color: '#fff',
          letterSpacing: '0.04em',
          marginBottom: '1rem',
          paddingBottom: '0.5rem',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        IS IT WORTH IT? VALUE BY BUYER PERSONA
      </h2>

      <section
        style={{
          background: 'rgba(255,184,28,0.05)',
          border: '1px solid rgba(255,184,28,0.2)',
          borderRadius: '10px',
          padding: '1.5rem',
          marginBottom: '2rem',
        }}
      >
        <h3
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: '1.25rem',
            color: '#FFB81C',
            letterSpacing: '0.04em',
            marginBottom: '0.75rem',
          }}
        >
          PARENT — claiming a kid&apos;s player profile
        </h3>
        <p
          style={{
            color: 'rgba(255,255,255,0.7)',
            fontSize: '0.9375rem',
            lineHeight: 1.7,
            marginBottom: '0.5rem',
          }}
        >
          Recommended tier: <strong style={{ color: '#fff' }}>Hockey Passport ($24.99/yr)</strong> or Hockey Passport Plus if you have multiple kids.
        </p>
        <p
          style={{
            color: 'rgba(255,255,255,0.7)',
            fontSize: '0.9375rem',
            lineHeight: 1.7,
          }}
        >
          <strong style={{ color: '#009650' }}>Worth it.</strong> $24.99/yr is the cost of one roll of hockey tape. If your kid plays 5+ years, that&apos;s under $5/year to have a permanent, verified career record. The alternative is scattered stats across five apps that disappear when the kid graduates.
        </p>
      </section>

      <section
        style={{
          background: 'rgba(255,184,28,0.05)',
          border: '1px solid rgba(255,184,28,0.2)',
          borderRadius: '10px',
          padding: '1.5rem',
          marginBottom: '2rem',
        }}
      >
        <h3
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: '1.25rem',
            color: '#FFB81C',
            letterSpacing: '0.04em',
            marginBottom: '0.75rem',
          }}
        >
          RINK OWNER — claiming your rink listing
        </h3>
        <p
          style={{
            color: 'rgba(255,255,255,0.7)',
            fontSize: '0.9375rem',
            lineHeight: 1.7,
            marginBottom: '0.5rem',
          }}
        >
          Recommended tier: <strong style={{ color: '#fff' }}>Business Listing ($99/yr)</strong>. Upgrade to Business Plus if you run multiple rinks.
        </p>
        <p
          style={{
            color: 'rgba(255,255,255,0.7)',
            fontSize: '0.9375rem',
            lineHeight: 1.7,
          }}
        >
          <strong style={{ color: '#009650' }}>Worth it.</strong> Business Listing includes a lead-capture form on your rink page. If that form gets you 3-5 league or tournament inquiries per year, and each inquiry converts to one booking worth $300-$2,000 in ice-time revenue, the listing pays for itself with the first booking. Compared to Yelp&apos;s $360-$720/yr for a general-audience listing, RinkStop&apos;s $99/yr reaches the audience that actually books ice time.
        </p>
      </section>

      <section
        style={{
          background: 'rgba(255,184,28,0.05)',
          border: '1px solid rgba(255,184,28,0.2)',
          borderRadius: '10px',
          padding: '1.5rem',
          marginBottom: '2rem',
        }}
      >
        <h3
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: '1.25rem',
            color: '#FFB81C',
            letterSpacing: '0.04em',
            marginBottom: '0.75rem',
          }}
        >
          SMALL CLUB — replacing SportsEngine HQ
        </h3>
        <p
          style={{
            color: 'rgba(255,255,255,0.7)',
            fontSize: '0.9375rem',
            lineHeight: 1.7,
            marginBottom: '0.5rem',
          }}
        >
          Recommended tier: <strong style={{ color: '#fff' }}>Club Starter ($149/yr)</strong> for under 30 players, or Club Pro for 30-150.
        </p>
        <p
          style={{
            color: 'rgba(255,255,255,0.7)',
            fontSize: '0.9375rem',
            lineHeight: 1.7,
          }}
        >
          <strong style={{ color: '#009650' }}>Worth it.</strong> At $149/yr vs SportsEngine HQ at $696/yr, you save $547/year for the same core workflow. The catch: if you need USA Hockey affiliation, uniform ordering, or background checks, SportsEngine has those and RinkStop does not (yet). For a club under 30 players that hasn&apos;t committed to either platform, RinkStop is the price-of-entry choice.
        </p>
      </section>

      <section
        style={{
          background: 'rgba(255,255,255,0.025)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '10px',
          padding: '1.5rem',
          marginBottom: '2.5rem',
        }}
      >
        <h3
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: '1.25rem',
            color: 'rgba(255,255,255,0.7)',
            letterSpacing: '0.04em',
            marginBottom: '0.75rem',
          }}
        >
          LEAGUE OR FEDERATION — enterprise evaluation
        </h3>
        <p
          style={{
            color: 'rgba(255,255,255,0.6)',
            fontSize: '0.9375rem',
            lineHeight: 1.7,
            marginBottom: '0.5rem',
          }}
        >
          Recommended tier: <strong style={{ color: '#fff' }}>League ($1,999/yr)</strong> with onboarding + dedicated CSM.
        </p>
        <p
          style={{
            color: 'rgba(255,255,255,0.6)',
            fontSize: '0.9375rem',
            lineHeight: 1.7,
          }}
        >
          You already have infrastructure and a budget. RinkStop&apos;s $1,999/yr League tier is competitive with what you&apos;d pay elsewhere — the question is whether adding RinkStop to your stack is worth the integration cost. For most established leagues, this is a sales conversation, not a self-serve decision. Email{' '}
          <a href="mailto:leagues@rinkstop.com" style={{ color: '#FFB81C' }}>
            leagues@rinkstop.com
          </a>{' '}
          to start one.
        </p>
      </section>

      <h2
        style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: '1.75rem',
          color: '#fff',
          letterSpacing: '0.04em',
          marginBottom: '1rem',
          paddingBottom: '0.5rem',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        HOW WE BUILT THIS COMPARISON
      </h2>

      <p
        style={{
          color: 'rgba(255,255,255,0.6)',
          fontSize: '0.9375rem',
          lineHeight: 1.7,
          marginBottom: '1rem',
        }}
      >
        Every competitor price on this page was pulled from that vendor&apos;s public pricing page or a directly-quoted plan during July 2026. We re-verify quarterly. If a price has changed and we have not updated, please email{' '}
        <a href="mailto:support@rinkstop.com" style={{ color: '#FFB81C' }}>
          support@rinkstop.com
        </a>{' '}
        with a link to the new price and we will update within 48 hours.
      </p>

      <p
        style={{
          color: 'rgba(255,255,255,0.6)',
          fontSize: '0.9375rem',
          lineHeight: 1.7,
          marginBottom: '2.5rem',
        }}
      >
        The competitor we name in each row is the closest feature-for-feature alternative, not necessarily the most expensive. For example, Yelp Enhanced is the closest comparator to Business Plus — same feature categories (lead form, photos, enhanced analytics, featured placement) — even though Hudl at $1,600/yr is more expensive. Comparing on price-per-feature, not just dollar-amount, is what makes the comparison useful.
      </p>

      <h2
        style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: '1.75rem',
          color: '#fff',
          letterSpacing: '0.04em',
          marginBottom: '1.5rem',
          paddingBottom: '0.5rem',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        FREQUENTLY ASKED QUESTIONS
      </h2>

      {FAQ.map((item, i) => (
        <details
          key={i}
          style={{
            background: 'rgba(255,255,255,0.025)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '10px',
            padding: '1rem 1.25rem',
            marginBottom: '0.75rem',
            cursor: 'pointer',
          }}
        >
          <summary
            style={{
              color: '#fff',
              fontWeight: 700,
              fontSize: '1rem',
              listStyle: 'none',
              paddingRight: '2rem',
            }}
          >
            {item.q}
          </summary>
          <p
            style={{
              color: 'rgba(255,255,255,0.65)',
              fontSize: '0.9375rem',
              lineHeight: 1.7,
              marginTop: '0.75rem',
            }}
          >
            {item.a}
          </p>
        </details>
      ))}

      <section
        style={{
          textAlign: 'center',
          marginTop: '3rem',
          padding: '2rem 1rem',
          background: 'rgba(200,16,46,0.08)',
          border: '1px solid rgba(200,16,46,0.25)',
          borderRadius: '12px',
        }}
      >
        <h2
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: '1.75rem',
            color: '#fff',
            letterSpacing: '0.04em',
            marginBottom: '0.75rem',
          }}
        >
          READY TO CLAIM YOUR LISTING?
        </h2>
        <p
          style={{
            color: 'rgba(255,255,255,0.7)',
            fontSize: '0.9375rem',
            lineHeight: 1.6,
            marginBottom: '1.5rem',
            maxWidth: '640px',
            margin: '0 auto 1.5rem',
          }}
        >
          Search for your rink, team, or player profile and claim it on RinkStop. Verified listings get a checkmark, lead capture form, and featured rotation in their city.
        </p>
        <Link
          href="/claim-your-listing"
          style={{
            background: '#C8102E',
            color: '#fff',
            padding: '0.875rem 2rem',
            borderRadius: 8,
            textDecoration: 'none',
            fontWeight: 700,
            fontSize: '1rem',
            display: 'inline-block',
            marginRight: '0.75rem',
          }}
        >
          Claim your listing →
        </Link>
        <Link
          href="/pricing"
          style={{
            background: 'transparent',
            color: '#FFB81C',
            padding: '0.875rem 2rem',
            borderRadius: 8,
            textDecoration: 'none',
            fontWeight: 700,
            fontSize: '1rem',
            display: 'inline-block',
            border: '1px solid #FFB81C',
          }}
        >
          See all pricing
        </Link>
      </section>

      <p
        style={{
          color: 'rgba(255,255,255,0.3)',
          fontSize: '0.75rem',
          textAlign: 'center',
          marginTop: '2rem',
        }}
      >
        Last updated: July 10, 2026. RinkStop reserves the right to update tier
        pricing at any time; the values shown on{' '}
        <Link href="/pricing" style={{ color: '#FFB81C' }}>
          /pricing
        </Link>{' '}
        are always authoritative.
      </p>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: 'RinkStop vs Competitors — A Side-by-Side Pricing Comparison (2026)',
            description:
              'Side-by-side comparison of RinkStop\'s pricing against SportsEngine HQ, Hudl, LinkedIn Premium, Yelp, and BBB. Detailed value analysis for rink owners, club admins, parents, and players.',
            author: { '@type': 'Organization', name: 'RinkStop', url: 'https://rinkstop.com' },
            publisher: {
              '@type': 'Organization',
              name: 'RinkStop',
              url: 'https://rinkstop.com',
              logo: { '@type': 'ImageObject', url: 'https://rinkstop.com/rinkstoplogo.png' },
            },
            datePublished: '2026-07-10',
            dateModified: '2026-07-10',
            mainEntityOfPage: { '@type': 'WebPage', '@id': 'https://rinkstop.com/guides/rinkstop-vs-competitors' },
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: FAQ.map((item) => ({
              '@type': 'Question',
              name: item.q,
              acceptedAnswer: { '@type': 'Answer', text: item.a },
            })),
          }),
        }}
      />
    </div>
  );
}