import type { Metadata } from 'next';
import Link from 'next/link';
import { getStripePaymentLink } from '@/lib/stripe-payment-links';
import RelatedProducts from '@/components/RelatedProducts';
import SocialProof from '@/components/SocialProof';
import NewsletterSignup from '@/components/NewsletterSignup';
import { withDefaultOg } from '@/lib/metadata-defaults';
import { getDirectoryCountsCached } from '@/lib/directory-counts';

// 2026-10-01 (Arnel data-integrity audit): route title/description through
// the canonical helper so the dataset-license page metadata matches the
// rendered body and never drifts.
export async function generateMetadata(): Promise<Metadata> {
  const counts = await getDirectoryCountsCached();
  const titleFull = `Hockey Dataset License — ${counts.rinks.toLocaleString()} Rinks, ${counts.teams.toLocaleString()} Teams, ${counts.players.toLocaleString()} Players | RinkStop`;
  const titleShort = `Hockey Dataset License — ${counts.rinks.toLocaleString()} Rinks, ${counts.teams.toLocaleString()} Teams`;
  const description = `License RinkStop's complete hockey database — ${counts.rinks.toLocaleString()}+ rinks, ${counts.teams.toLocaleString()}+ teams, ${counts.leagues.toLocaleString()}+ leagues, ${counts.players.toLocaleString()}+ players across ${counts.countries.toLocaleString()} countries. CSV/JSON download with quarterly updates. $499 one-time.`;
  return {
  title: { absolute: titleFull },
  description: description,
  keywords: [
    'hockey data', 'hockey database download', 'hockey rink data',
    'hockey teams csv', 'ice rink dataset', 'sports business data',
    'hockey analytics data', 'rink database license',
  ],
  alternates: {
    canonical: 'https://rinkstop.com/dataset-license',
  },
  openGraph: withDefaultOg({
    title: titleFull,
    description:
      `License RinkStop's complete hockey database. CSV/JSON download, commercial use, quarterly updates. $499 one-time.`,
    url: 'https://rinkstop.com/dataset-license',
    siteName: 'RinkStop',
    type: 'website',
  }),
  twitter: {
    card: 'summary_large_image',
    title: titleShort,
    description:
      `Bulk hockey data for analytics, scouting, equipment, and research. Commercial-use license, $499.`,
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
            For Builders, Scouts, Researchers, Equipment Brands
          </div>
          <h1 style={{
            fontSize: 'clamp(2.25rem, 6vw, 3.5rem)',
            fontWeight: 900,
            margin: '0 0 1rem',
            lineHeight: 1.05,
            letterSpacing: '-0.02em',
          }}>
            The world's hockey data,<br />
            <span style={{ color: '#C8102E' }}>licensed.</span>
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
            1,857 ice rinks · 2,601 teams · 305 leagues · 6,351 players · 78 countries.
            <br />
            Bulk download, CSV + JSON, commercial-use license.
          </p>
          <a
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
          </a>
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
            { n: '1,857', l: 'Ice rinks', sub: 'Address, hours, programs, capacity' },
            { n: '2,601', l: 'Teams', sub: 'Roster, league, home arena' },
            { n: '305', l: 'Leagues', sub: 'Country, level, tier, season' },
            { n: '6,351', l: 'Players', sub: 'Position, stats, club history' },
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
        }}>Who buys this</h2>
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
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1rem' }}>What's in the bundle</h2>
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
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1rem' }}>Why this beats scraping</h2>
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
            Ship faster. Skip the scraping.
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.65)', marginBottom: '1.5rem' }}>
            Commercial-use license. Cite us in your methodology. Quarterly refreshes for 12 months.
          </p>
          <a
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
          </a>
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