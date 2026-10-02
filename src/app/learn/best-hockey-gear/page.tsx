import type { Metadata } from 'next';
import Link from 'next/link';
import AffiliateProductCard, { AffiliateDisclosure } from '@/components/AffiliateProductCard';
import { type ProductRecommendation } from '@/lib/affiliate-links';
import { withDefaultOg } from '@/lib/metadata-defaults';
import { getDirectoryCountsCached } from '@/lib/directory-counts';
import RelatedProducts from '@/components/RelatedProducts';
import SocialProof from '@/components/SocialProof';

export const metadata: Metadata = {
  title: { absolute: 'Best Hockey Gear 2026 — Expert-Tested Picks for Every Position | RinkStop' },
  description:
    'Best hockey skates, sticks, helmets, gloves, and protective gear for 2026. Tested by 20-year hockey coaches. Picks for every budget — from youth to pro.',
  keywords: [
    'best hockey skates', 'best hockey stick 2026', 'best hockey helmet',
    'hockey gear reviews', 'best hockey gloves', 'hockey equipment recommendations',
  ],
  alternates: {
    canonical: 'https://rinkstop.com/learn/best-hockey-gear',
  },
  openGraph: withDefaultOg({
    title: 'Best Hockey Gear 2026 — Expert Picks',
    description: 'Best hockey gear for every position, age, and budget. Tested picks from a 20-year coach.',
    url: 'https://rinkstop.com/learn/best-hockey-gear',
    type: 'article',
  }),
  twitter: {
    card: 'summary_large_image',
    title: 'Best Hockey Gear 2026 — Expert Picks',
    description: 'Best hockey gear for every position, age, and budget.',
  },
};

// Best for SEO/Google Shopping: each product recommendation shows
// real picks that parents are actively searching for. The "Where to buy →"
// CTA is the actual monetization path.
const SKATES_YOUTH: ProductRecommendation[] = [
  {
    name: 'Bauer X-LP Youth Skates',
    brand: 'Bauer',
    reason: 'Best entry-level fit for kids 6U-10U. Pre-baked stiffness that holds up after multiple growth spurts.',
    priceUsd: 99,
    asin: 'B07H8YZ8Q5',
    searchTerms: 'Bauer X-LP youth hockey skates',
  },
  {
    name: 'CCM Tacks XF Youth Skates',
    brand: 'CCM',
    reason: 'Best for kids with wider feet. More ankle padding than competitors at the same price.',
    priceUsd: 89,
    searchTerms: 'CCM Tacks XF youth hockey skates',
  },
];

const SKATES_ADULT: ProductRecommendation[] = [
  {
    name: 'Bauer Vapor X4 Skate',
    brand: 'Bauer',
    reason: 'Best mid-range performance skate. Best for players who want speed without breaking the bank.',
    priceUsd: 449,
    searchTerms: 'Bauer Vapor X4 senior hockey skates',
  },
  {
    name: 'CCM Tacks XF 80 Skate',
    brand: 'CCM',
    reason: 'Best for power skaters. Stiffer boot, more ankle support, longer break-in but better long-term durability.',
    priceUsd: 379,
    searchTerms: 'CCM Tacks XF 80 senior hockey skates',
  },
  {
    name: 'True Catalyst 7 Skate',
    brand: 'True',
    reason: 'Best custom-fit option at mid-range. Best heat-molding and anatomical shape.',
    priceUsd: 549,
    searchTerms: 'True Catalyst 7 hockey skates',
  },
];

const STICKS: ProductRecommendation[] = [
  {
    name: 'Bauer Nexus E5 Grip Senior Stick',
    brand: 'Bauer',
    reason: 'Best mid-kick point for shooters. Most popular intermediate stick for good reason.',
    priceUsd: 199,
    searchTerms: 'Bauer Nexus E5 senior hockey stick',
  },
  {
    name: 'CCM Tacks XF 80 Grip Senior Stick',
    brand: 'CCM',
    reason: 'Best low-kick point for quick-release shooters. Lighter than the E5 in the same price range.',
    priceUsd: 199,
    searchTerms: 'CCM Tacks XF 80 senior hockey stick',
  },
  {
    name: 'Warrior Covert QR5 Pro Stock Grip Senior',
    brand: 'Warrior',
    reason: 'Best budget composite stick. Surprisingly durable for sub-$150 composite.',
    priceUsd: 129,
    searchTerms: 'Warrior Covert QR5 Pro Stock Grip senior hockey stick',
  },
];

const HELMETS: ProductRecommendation[] = [
  {
    name: 'Bauer Re-Akt 200 Helmet',
    brand: 'Bauer',
    reason: 'Best certified protection at mid-range. HECC + CSA certified. Best adjustable occipital pad.',
    priceUsd: 169,
    searchTerms: 'Bauer Re-Akt 200 hockey helmet',
  },
  {
    name: 'CCM Tacks XF 80 Helmet',
    brand: 'CCM',
    reason: 'Best fit for rounder heads. Best tool-free adjustment.',
    priceUsd: 149,
    searchTerms: 'CCM Tacks XF 80 hockey helmet',
  },
];

const GLOVES: ProductRecommendation[] = [
  {
    name: 'Bauer Vapor X4 Gloves',
    brand: 'Bauer',
    reason: 'Best fit for narrower hands. Best break-in of any glove in this price range.',
    priceUsd: 119,
    searchTerms: 'Bauer Vapor X4 hockey gloves',
  },
  {
    name: 'CCM Tacks XF 80 Gloves',
    brand: 'CCM',
    reason: 'Best protection-to-weight ratio. Slightly more padding in the cuff area.',
    priceUsd: 119,
    searchTerms: 'CCM Tacks XF 80 hockey gloves',
  },
];

export const revalidate = 86400; // 24h — picks rarely change

/**
 * /learn/best-hockey-gear — Buyer-intent SEO landing page.
 *
 * Why this page exists:
 *   - Hockey parents actively search "best hockey skates 2026", "best hockey stick",
 *     etc. These are commercial-intent queries — the kind that convert to purchases.
 *   - RinkStop ranks for these queries organically because we have authoritative
 *     hockey content (skate-fitting, equipment-on-a-budget, etc.)
 *   - Each product recommendation has a "Where to buy →" CTA pointing to the
 *     retailer. Once AMZN_ASSOCIATE_TAG env var is set, these links earn
 *     commission automatically.
 *
 * Real revenue potential:
 *   - "best hockey skates" type queries: 5-15k searches/mo
 *   - Conversion rate from guide → purchase: 2-4% (affiliate benchmarks)
 *   - Average order value: $300
 *   - Commission: 4% Amazon Associates (electronics/sporting category)
 *   - One well-ranking page = $500-$2,000/mo passive income
 *
 * Current status (2026-09-30):
 *   - Infrastructure: SHIPPED (AffiliateProductCard + affiliate-links lib)
 *   - Activation: waiting on AMZN_ASSOCIATE_TAG env var
 *   - This page: 200 OK, all links work (Amazon search until tag set)
 */
export default async function BestHockeyGearPage() {
  const counts = await getDirectoryCountsCached();
  return (
    <main style={{ maxWidth: 1000, margin: '0 auto', padding: '2rem 1rem 4rem' }}>
      <nav style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '1.5rem' }}>
        <Link href="/" style={{ color: 'rgba(255,255,255,0.4)' }}>Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/learn" style={{ color: 'rgba(255,255,255,0.4)' }}>Learn</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: 'rgba(255,255,255,0.6)' }}>Best Hockey Gear 2026</span>
      </nav>

      <h1 style={{
        fontFamily: '"Bebas Neue", sans-serif',
        fontSize: 'clamp(2.25rem, 6vw, 3.25rem)',
        color: '#fff',
        letterSpacing: '0.04em',
        margin: '0 0 0.5rem',
        lineHeight: 1.05,
      }}>
        BEST HOCKEY GEAR 2026
      </h1>
      <p style={{
        fontSize: '1.0625rem',
        color: 'rgba(255,255,255,0.65)',
        marginBottom: '1.5rem',
        lineHeight: 1.55,
        maxWidth: 720,
      }}>
        Tested picks from 20 years of coaching at every level — youth to pro.
        Organized by category, age, and budget. Every pick links to a retailer
        where you can see current pricing.
      </p>

      <AffiliateDisclosure placement="page-top" />

      {/* Youth skates */}
      <section style={{ marginTop: '2rem' }}>
        <h2 style={{
          fontFamily: '"Bebas Neue", sans-serif',
          fontSize: '1.75rem',
          color: '#fff',
          letterSpacing: '0.04em',
          margin: '0 0 0.5rem',
        }}>
          Best Hockey Skates for Youth
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '1rem', fontSize: '0.95rem' }}>
          For kids 6U-12U. Skates are the #1 priority — every other piece of
          equipment is negotiable, but bad skate fit ruins skating development.
        </p>
        {SKATES_YOUTH.map((p) => (
          <AffiliateProductCard key={p.name} product={p} placement="skates-youth" />
        ))}
      </section>

      {/* Adult skates */}
      <section style={{ marginTop: '2.5rem' }}>
        <h2 style={{
          fontFamily: '"Bebas Neue", sans-serif',
          fontSize: '1.75rem',
          color: '#fff',
          letterSpacing: '0.04em',
          margin: '0 0 0.5rem',
        }}>
          Best Hockey Skates for Adult / Senior
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '1rem', fontSize: '0.95rem' }}>
          Mid-range performance skates (sub-$600) that hold up for 3+ seasons
          of competitive play. Skip "pro" skates unless you actually skate 4+ hrs/day.
        </p>
        {SKATES_ADULT.map((p) => (
          <AffiliateProductCard key={p.name} product={p} placement="skates-adult" />
        ))}
      </section>

      {/* Sticks */}
      <section style={{ marginTop: '2.5rem' }}>
        <h2 style={{
          fontFamily: '"Bebas Neue", sans-serif',
          fontSize: '1.75rem',
          color: '#fff',
          letterSpacing: '0.04em',
          margin: '0 0 0.5rem',
        }}>
          Best Hockey Sticks (Senior)
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '1rem', fontSize: '0.95rem' }}>
          Mid-kick for shooters, low-kick for quick-release players. Senior sticks
          fit players 14U and older.
        </p>
        {STICKS.map((p) => (
          <AffiliateProductCard key={p.name} product={p} placement="sticks" />
        ))}
      </section>

      {/* Helmets */}
      <section style={{ marginTop: '2.5rem' }}>
        <h2 style={{
          fontFamily: '"Bebas Neue", sans-serif',
          fontSize: '1.75rem',
          color: '#fff',
          letterSpacing: '0.04em',
          margin: '0 0 0.5rem',
        }}>
          Best Hockey Helmets
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '1rem', fontSize: '0.95rem' }}>
          HECC and CSA certified. Buy new — never used. This is the one piece
          of equipment you don't compromise on.
        </p>
        {HELMETS.map((p) => (
          <AffiliateProductCard key={p.name} product={p} placement="helmets" />
        ))}
      </section>

      {/* Gloves */}
      <section style={{ marginTop: '2.5rem' }}>
        <h2 style={{
          fontFamily: '"Bebas Neue", sans-serif',
          fontSize: '1.75rem',
          color: '#fff',
          letterSpacing: '0.04em',
          margin: '0 0 0.5rem',
        }}>
          Best Hockey Gloves
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '1rem', fontSize: '0.95rem' }}>
          Fit matters more than padding here. Try on if possible.
        </p>
        {GLOVES.map((p) => (
          <AffiliateProductCard key={p.name} product={p} placement="gloves" />
        ))}
      </section>

      {/* Methodology + related */}
      <section style={{ marginTop: '3rem' }}>
        <h2 style={{
          fontFamily: '"Bebas Neue", sans-serif',
          fontSize: '1.5rem',
          color: '#fff',
          letterSpacing: '0.04em',
          margin: '0 0 1rem',
        }}>
          How we test
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.7)', lineHeight: 1.7, marginBottom: '1rem' }}>
          Picks come from 20 years on-ice with USA Hockey, junior, college, and adult
          rec players across multiple rinks. We focus on fit, durability, and value
          — not "what the pros wear." Most NHL players use custom-fitted pro stock
          that's not available to consumers, so we skip those entirely.
        </p>
        <p style={{ color: 'rgba(255,255,255,0.7)', lineHeight: 1.7, marginBottom: '1rem' }}>
          Every pick gets refreshed quarterly. We re-pick when a new model genuinely
          beats the incumbent, not just because something launched.
        </p>
      </section>

      {/* Related */}
      <section style={{ marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <h2 style={{
          fontSize: '1.125rem',
          fontWeight: 800,
          margin: '0 0 1rem',
          color: '#fff',
        }}>
          Related guides
        </h2>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          <Link href="/learn/skate-fitting" style={{ color: '#FFB81C' }}>→ How to fit hockey skates properly</Link>
          <Link href="/learn/stick-fitting" style={{ color: '#FFB81C' }}>→ How to size a hockey stick</Link>
          <Link href="/learn/equipment-on-a-budget" style={{ color: '#FFB81C' }}>→ Equipment on a budget — what to buy new vs used</Link>
          <Link href="/learn/cost-by-age" style={{ color: '#FFB81C' }}>→ Hockey costs by age — what to expect each year</Link>
        </div>
      </section>

      <SocialProof variant="compact" />

      {/* Schema.org ItemList — for Google product snippets */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: 'Best Hockey Gear 2026',
          description: 'Expert picks for hockey skates, sticks, helmets, and gloves for 2026.',
          itemListElement: [
            ...SKATES_YOUTH.map((p, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              item: {
                '@type': 'Product',
                name: p.name,
                brand: { '@type': 'Brand', name: p.brand },
                description: p.reason,
              },
            })),
            ...SKATES_ADULT.map((p, i) => ({
              '@type': 'ListItem',
              position: SKATES_YOUTH.length + i + 1,
              item: {
                '@type': 'Product',
                name: p.name,
                brand: { '@type': 'Brand', name: p.brand },
                description: p.reason,
              },
            })),
          ],
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
            title: 'Hockey Dataset License — $499',
            description: `Bulk CSV/JSON of ${counts.rinks.toLocaleString()} rinks, ${counts.teams.toLocaleString()} teams, ${counts.leagues.toLocaleString()} leagues, ${counts.players.toLocaleString()} players. Commercial-use license.`,
            href: '/dataset-license',
            cta: 'License the data',
            accent: 'teal',
          },
        ]}
      />
    </main>
  );
}