import type { Metadata } from 'next';
import Link from 'next/link';
import { getStripePaymentLink } from '@/lib/stripe-payment-links';
import RelatedProducts from '@/components/RelatedProducts';
import SocialProof from '@/components/SocialProof';
import NewsletterSignup from '@/components/NewsletterSignup';
import MoneyPageViewTracker from '@/components/MoneyPageViewTracker';
import MoneyCtaLink from '@/components/MoneyCtaLink';
import { withDefaultOg } from '@/lib/metadata-defaults';
import { getDirectoryCountsCached } from '@/lib/directory-counts';

// 2026-10-01 (Arnel data-integrity audit): route title/description through
// the canonical helper so the dataset-license page metadata matches the
// rendered body and never drifts.
export async function generateMetadata(): Promise<Metadata> {
  const counts = await getDirectoryCountsCached();
  // 2026-11-05 (Arnel: 'the $499 dataset ranks page-one with 0 clicks, improve the copy').
  // Live GSC, 90d: /dataset-license had 4 impressions, 0 clicks, position 4.8, and
  // ZERO query rows — it was not being surfaced for any meaningful term, because
  // the title led with "License" (a legal noun nobody searches) and the counts
  // people DO search ("how many ice rinks are there") were pushed into the
  // description and the body.
  //
  // New title targets the actual commercial intent: people looking to BUY
  // hockey data search "hockey data", "ice rink database", "hockey teams csv".
  // "License" is demoted to the tail where it belongs — it is a reassurance
  // signal for a buyer who is already interested, not an acquisition keyword.
  const titleFull = `Hockey Data for Business — ${counts.rinks.toLocaleString()} Ice Rinks, ${counts.teams.toLocaleString()} Teams, ${counts.players.toLocaleString()} Players | CSV & JSON | RinkStop`;
  const titleShort = `Hockey Data for Business — ${counts.rinks.toLocaleString()} Ice Rinks, ${counts.teams.toLocaleString()} Teams`;
  const description = `Buy the RinkStop hockey database: ${counts.rinks.toLocaleString()} ice rinks, ${counts.teams.toLocaleString()} teams, ${counts.leagues.toLocaleString()} leagues and ${counts.players.toLocaleString()} players in ${counts.countries.toLocaleString()} countries. Instant CSV + JSON download, commercial license, quarterly updates. $499 one-time — no scraping, no maintenance.`;
  return {
  title: { absolute: titleFull },
  description: description,
  keywords: [
    // Buy-intent terms — what someone types when they want to license data.
    'hockey data', 'hockey database', 'hockey database download',
    'hockey dataset', 'hockey data license', 'buy hockey data',
    'hockey teams data', 'hockey players data', 'hockey league data',
    'ice rink data', 'ice rink database', 'ice rink list',
    'hockey rinks csv', 'hockey teams csv', 'hockey database csv',
    'sports data api', 'sports business data', 'hockey analytics data',
    'hockey tourism data', 'sports facility database',
  ],
  alternates: {
    canonical: 'https://rinkstop.com/dataset-license',
  },
  openGraph: withDefaultOg({
    title: titleFull,
    description:
      `Download ${counts.rinks.toLocaleString()} ice rinks, ${counts.teams.toLocaleString()} teams and ${counts.players.toLocaleString()} players as CSV or JSON. Commercial license, quarterly updates. $499 one-time.`,
    url: 'https://rinkstop.com/dataset-license',
    siteName: 'RinkStop',
    type: 'website',
  }),
  twitter: {
    card: 'summary_large_image',
    title: titleShort,
    description:
      `The complete hockey database — rinks, teams, leagues, players. CSV + JSON, commercial use, $499.`,
  },
  };
}

/**
 * /dataset-license — $499 commercial license for the RinkStop hockey dataset.
 *
 * Who buys this:
 *   - Sports analytics startups
 *   - Equipment brands (market sizing)
 *   - Academic researchers
 *   - Travel/hospitality (hockey tourism)
 *   - Scout firms / recruiters
 *
 * Why it works without human action:
 *   1. Visitor hits /dataset-license (organic from Bing search for "hockey data")
 *   2. Clicks "License the Dataset" button → Stripe-hosted checkout (no Clerk)
 *   3. Stripe webhook → /api/webhooks/stripe/route.ts → upserts profiles row
 *      with email + tier=dataset_license, stripe_session_id
 *   4. Stripe redirects to /dataset-license/success?session_id=cs_xxx
 *   5. Success page looks up profile by stripe_session_id, shows the
 *      download link (a presigned Supabase URL valid 24h)
 *
 * This is a brand-new monetization channel that doesn't depend on:
 *   - AdSense (rejected repeatedly by Google)
 *   - Affiliate networks (Pure Hockey, Skimlinks — not approved)
 *   - Arnel's email account (no outreach needed)
 *   - Bing/MSN publisher accounts (not approved)
 *
 * Real revenue potential: $499 × N buyers. Even 1 sale/week = ~$2k/mo.
 */
export default async function DatasetLicensePage() {
  const buyLink = getStripePaymentLink('dataset_license');
  const counts = await getDirectoryCountsCached();

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0D1117',
      color: '#fff',
      paddingTop: 0,
    }}>
      <div className="container" style={{ maxWidth: 900, margin: '0 auto', padding: '3rem 1rem 4rem' }}>

        {/* Revenue instrumentation (2026-10-28): this page had ZERO tracked
            views and ZERO tracked CTA clicks, so the $499 product was a
            black box. One page_view + every CTA click now lands in
            analytics_events and surfaces on /admin/revenue. */}
        <MoneyPageViewTracker page="dataset-license" surface="direct" />

        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <div style={{
            display: 'inline-block',
            background: 'rgba(200,16,46,0.12)',
            color: '#FFB81C',
            fontSize: '0.75rem',
            fontWeight: 800,
            padding: '0.4rem 1rem',
            borderRadius: 999,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            marginBottom: '1.25rem',
            border: '1px solid rgba(200,16,46,0.3)',
          }}>
            Hockey Data · CSV & JSON · Commercial License
          </div>
          <h1 style={{
            fontSize: 'clamp(2.25rem, 6vw, 3.5rem)',
            fontWeight: 900,
            margin: '0 0 1rem',
            lineHeight: 1.05,
            letterSpacing: '-0.02em',
          }}>
            Every ice rink, team,<br />
            <span style={{ color: '#C8102E' }}>league and player.</span><br />
            <span style={{ fontSize: '0.5em', color: 'rgba(255,255,255,0.65)', display: 'block', marginTop: '0.5rem' }}>
              One download. Commercial license. $499.
            </span>
          </h1>
          <p style={{
            fontSize: 'clamp(1.0625rem, 2vw, 1.25rem)',
            color: 'rgba(255,255,255,0.7)',
            margin: '0 0 2rem',
            maxWidth: 700,
            marginLeft: 'auto',
            marginRight: 'auto',
            lineHeight: 1.55,
          }}>
            {counts.rinks.toLocaleString()} ice rinks · {counts.teams.toLocaleString()} teams · {counts.leagues.toLocaleString()} leagues · {counts.players.toLocaleString()} players · {counts.countries.toLocaleString()} countries.
            <br />
            Download as CSV or JSON today. Use commercially. Get quarterly updates for 12 months.
            <br />
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9em' }}>
              Address, coordinates, hours, capacity, contact details, rosters, league structure — verified, not scraped from a stale directory.
            </span>
          </p>
          <MoneyCtaLink
            eventName="dataset_license_purchase_clicked"
            props={{ page: 'dataset-license', placement: 'hero', price: 499 }}
            href={buyLink}
            target="_blank"
            rel="noopener"
            style={{
              display: 'inline-block',
              background: '#C8102E',
              color: '#fff',
              fontSize: '1.0625rem',
              fontWeight: 700,
              padding: '1rem 2.5rem',
              borderRadius: 6,
              textDecoration: 'none',
              letterSpacing: '0.02em',
              boxShadow: '0 6px 24px rgba(200,16,46,0.35)',
              transition: 'transform 0.15s',
            }}
          >
            License the Dataset — $499 →
          </MoneyCtaLink>
          <div style={{
            marginTop: '1rem',
            fontSize: '0.85rem',
            color: 'rgba(255,255,255,0.45)',
          }}>
            One-time payment · Commercial use · Quarterly updates for 12 months
          </div>
        </div>

        {/* What's included */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
          marginBottom: '3rem',
        }}>
          {[
            { n: counts.rinks.toLocaleString(), l: 'Ice rinks', sub: 'Address, hours, programs, capacity' },
            { n: counts.teams.toLocaleString(), l: 'Teams', sub: 'Roster, league, home arena' },
            { n: counts.leagues.toLocaleString(), l: 'Leagues', sub: 'Country, level, tier, season' },
            { n: counts.players.toLocaleString(), l: 'Players', sub: 'Position, stats, club history' },
          ].map((s) => (
            <div key={s.l} style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 8,
              padding: '1.25rem',
            }}>
              <div style={{
                fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
                fontWeight: 900,
                color: '#FFB81C',
                fontFamily: 'Bebas Neue, Impact, sans-serif',
                letterSpacing: '0.02em',
              }}>{s.n}</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, marginTop: '0.25rem' }}>{s.l}</div>
              <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.55)', marginTop: '0.35rem' }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Use cases */}
        <h2 style={{
          fontSize: '1.5rem',
          fontWeight: 800,
          marginBottom: '1.25rem',
        }}>What teams use it for</h2>
        <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '3rem' }}>
          {[
            { t: 'Equipment brands', d: 'Market sizing, retail distribution planning, sales territory mapping.' },
            { t: 'Sports analytics startups', d: 'Train hockey-specific models without scraping rinks manually for 6 months.' },
            { t: 'Scout firms & recruiters', d: 'Bulk player + league data without paying for multiple niche databases.' },
            { t: 'Travel & hospitality', d: 'Hockey tourism datasets — venues, accessibility, tournament locations.' },
            { t: 'Academic researchers', d: 'Sport sociology, regional development, gender studies in hockey.' },
            { t: 'Mobile app developers', d: 'Skip the cold-start problem — power "find ice" features with verified data.' },
          ].map((u) => (
            <div key={u.t} style={{
              padding: '1rem 1.25rem',
              background: 'rgba(255,255,255,0.025)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 6,
              display: 'flex',
              gap: '1rem',
              alignItems: 'flex-start',
            }}>
              <div style={{
                width: 6, height: 6, borderRadius: '50%',
                background: '#C8102E', marginTop: '0.55rem', flexShrink: 0,
              }} />
              <div>
                <div style={{ fontWeight: 700, marginBottom: '0.2rem' }}>{u.t}</div>
                <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.5 }}>{u.d}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Format details */}
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>Exactly what you get</h2>
        <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '1.25rem', fontSize: '0.95rem' }}>
          Six files, one download, no assembly. Column-level detail, not just names and addresses.
        </p>
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 8,
          padding: '1.5rem',
          marginBottom: '3rem',
        }}>
          <div style={{ display: 'grid', gap: '0.5rem', fontFamily: 'ui-monospace, monospace', fontSize: '0.875rem' }}>
            <div><span style={{ color: '#FFB81C' }}>rinks.csv</span> — {counts.rinks.toLocaleString()} rows. Address, lat/lon, hours, programs, capacity, contact.</div>
            <div><span style={{ color: '#FFB81C' }}>teams.csv</span> — {counts.teams.toLocaleString()} rows. Roster, league_id, home_arena_id, contact, social.</div>
            <div><span style={{ color: '#FFB81C' }}>leagues.csv</span> — {counts.leagues.toLocaleString()} rows. Country, level, tier, season format, governing body.</div>
            <div><span style={{ color: '#FFB81C' }}>players.csv</span> — {counts.players.toLocaleString()} rows. Position, height, weight, club history, stats where available.</div>
            <div><span style={{ color: '#FFB81C' }}>schema.json</span> — JSON Schema for every table. Validates the bundle.</div>
            <div><span style={{ color: '#FFB81C' }}>README.md</span> — License terms, citation guidance, update schedule.</div>
          </div>
        </div>

        {/* Comparison vs alternatives */}
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1rem' }}>Why buying beats scraping</h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '1rem',
          marginBottom: '3rem',
        }}>
          <div style={{
            padding: '1.25rem',
            background: 'rgba(255,255,255,0.025)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 6,
          }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>DO IT YOURSELF</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'rgba(255,255,255,0.5)' }}>$15k+</div>
            <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.25rem' }}>6+ months of staff time</div>
          </div>
          <div style={{
            padding: '1.25rem',
            background: 'rgba(200,16,46,0.08)',
            border: '1px solid rgba(200,16,46,0.3)',
            borderRadius: 6,
          }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#FFB81C', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>RINKSTOP LICENSE</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#C8102E' }}>$499</div>
            <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.65)', marginTop: '0.25rem' }}>Download in 2 minutes</div>
          </div>
        </div>

        {/* Final CTA */}
        <SocialProof variant="default" />

        <div style={{
          background: 'linear-gradient(135deg, rgba(200,16,46,0.12) 0%, rgba(255,184,28,0.06) 100%)',
          border: '1px solid rgba(255,184,28,0.2)',
          borderRadius: 10,
          padding: '2.5rem 2rem',
          textAlign: 'center',
        }}>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.5rem' }}>
            Get the data. Skip the scraping.
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.65)', marginBottom: '1.5rem' }}>
            {counts.rinks.toLocaleString()} ice rinks and {counts.teams.toLocaleString()} teams, delivered as CSV + JSON today.
            Commercial-use license, cite us in your methodology, quarterly refreshes for 12 months. $499 one-time.
          </p>
          <MoneyCtaLink
            eventName="dataset_license_purchase_clicked"
            props={{ page: 'dataset-license', placement: 'final_cta', price: 499 }}
            href={buyLink}
            target="_blank"
            rel="noopener"
            style={{
              display: 'inline-block',
              background: '#C8102E',
              color: '#fff',
              fontSize: '1.0625rem',
              fontWeight: 700,
              padding: '0.9rem 2.25rem',
              borderRadius: 6,
              textDecoration: 'none',
            }}
          >
            License the Dataset — $499 →
          </MoneyCtaLink>
          <div style={{ marginTop: '1rem', fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>
            Or pay without signing up · Receipt emailed · Download link delivered immediately
          </div>
        </div>

        {/* Email capture — non-buyers become leads */}
        <section
          data-dataset-newsletter
          style={{
            marginTop: '2.5rem',
            padding: '1.75rem 1.5rem',
            background: 'rgba(255,184,28,0.04)',
            border: '1px solid rgba(255,184,28,0.18)',
            borderRadius: 12,
            textAlign: 'center',
          }}
        >
          <div style={{
            fontSize: '0.6875rem',
            fontWeight: 800,
            letterSpacing: '0.22em',
            color: 'rgba(255,184,28,0.7)',
            textTransform: 'uppercase',
            marginBottom: '0.5rem',
          }}>
            Not ready yet?
          </div>
          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: 800,
            color: '#fff',
            margin: '0 0 0.5rem',
          }}>
            Get the next quarterly refresh notice
          </h3>
          <p style={{
            color: 'rgba(255,255,255,0.65)',
            fontSize: '0.9375rem',
            maxWidth: 480,
            margin: '0 auto 1.25rem',
            lineHeight: 1.55,
          }}>
            Quarterly refreshes with new rinks + teams + leagues. We'll email when the next one ships.
          </p>
          <NewsletterSignup source="dataset_quarterly_notice" />
        </section>

        {/* FAQ */}
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '3rem 0 1rem' }}>Questions</h2>
        <div style={{ display: 'grid', gap: '1rem' }}>
          {[
            { q: 'Can I use this commercially?', a: 'Yes. Commercial-use license included. Reselling the raw dataset is prohibited; using it to power a product or analysis is fine.' },
            { q: 'How fresh is the data?', a: 'Snapshot at purchase time. Quarterly refreshes for 12 months included free. After that, renew at $199/yr or whatever the current price is.' },
            { q: 'Do I need to cite you?', a: 'Recommended, not enforced. "Data: RinkStop.com, [year]" in your methodology section is appreciated.' },
            { q: 'What if a rink changes hours after I license?', a: 'You get the snapshot you licensed. Refreshes give you the current state.' },
            { q: 'Is there an API?', a: 'Not yet. The dataset license is for bulk download. For live API access, contact us about custom terms.' },
            { q: 'Refund policy?', a: 'Full refund within 7 days if the dataset is materially wrong (verified against our public /api/data/dataset endpoint).' },
          ].map((f) => (
            <details key={f.q} style={{
              padding: '1rem 1.25rem',
              background: 'rgba(255,255,255,0.025)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 6,
            }}>
              <summary style={{ fontWeight: 700, cursor: 'pointer', color: '#fff' }}>{f.q}</summary>
              <div style={{ marginTop: '0.5rem', color: 'rgba(255,255,255,0.65)', fontSize: '0.9rem', lineHeight: 1.55 }}>
                {f.a}
              </div>
            </details>
          ))}
        </div>

        {/* Schema.org Product schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: 'RinkStop Hockey Dataset License',
            description: `Commercial license for bulk hockey database — ${counts.rinks.toLocaleString()} rinks, ${counts.teams.toLocaleString()} teams, ${counts.leagues.toLocaleString()} leagues, ${counts.players.toLocaleString()} players across ${counts.countries.toLocaleString()} countries.`,
            brand: { '@type': 'Brand', name: 'RinkStop' },
            offers: {
              '@type': 'Offer',
              price: '499.00',
              priceCurrency: 'USD',
              availability: 'https://schema.org/InStock',
              url: 'https://rinkstop.com/dataset-license',
              seller: { '@type': 'Organization', name: 'RinkStop' },
            },
            aggregateRating: undefined,
          })}}
        />

        <RelatedProducts
          products={[
            {
              // 2026-11-05: /hockey-database was "Discovered - currently not
              // indexed" with zero impressions while /dataset-license was
              // indexed. It had only ONE internal link on the whole site. The
              // two pages were also competing for the same "hockey database"
              // intent — this link makes them complementary: the free page
              // for browsing, this one for buying the data.
              title: 'Browse the database free',
              description: 'Search every rink, team, league, and player yourself. No account needed.',
              href: '/hockey-database',
              cta: 'Open the database',
              accent: 'gold',
            },
            {
              title: 'Plans for hockey people',
              description: 'Verified Hockey Passport, team profiles, business listings — eight tiers from $24.99/yr.',
              href: '/pricing',
              cta: 'See plans',
              accent: 'red',
            },
            {
              title: 'Best Hockey Gear 2026',
              description: 'Free buyer\'s guide — tested picks for skates, sticks, helmets, gloves. Where-to-buy links for every pick.',
              href: '/learn/best-hockey-gear',
              cta: 'Read the guide',
              accent: 'gold',
            },
          ]}
        />
      </div>
    </div>
  );
}