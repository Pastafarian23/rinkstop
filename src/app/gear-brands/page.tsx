import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Hockey Equipment Brands — Bauer, CCM, Warrior, True & More (2026 Guide)',
  description:
    'Hockey equipment brands directory. Reviews of Bauer, CCM, Warrior, True, and Easton for skates, sticks, pads, helmets, and protective gear. Buying guides and brand comparisons for 2026.',
  alternates: {
    canonical: 'https://rinkstop.com/gear-brands',
  },
  openGraph: {
    title: 'Hockey Equipment Brands — Bauer, CCM, Warrior, True & More',
    description:
      'Hockey equipment brand directory: reviews, comparisons, and buying guides for skates, sticks, pads, and protective gear.',
    type: 'website',
    url: 'https://rinkstop.com/gear-brands',
  },
};

export default function GearBrandsPage() {
  return (
    <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1rem' }}>
        <Link href="/">Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>Hockey Equipment Brands</span>
      </nav>

      <div style={{ marginBottom: '1.5rem' }}>
        <h1 className="font-sport" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: '#fff', letterSpacing: '0.02em', lineHeight: 1 }}>
          HOCKEY EQUIPMENT BRANDS
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
          Equipment brands, reviews, comparisons, and what to buy  --  from skates to sticks.
        </p>
      </div>

      {/* Directory link */}
      <div style={{ marginBottom: '2rem' }}>
        <Link
          href="/directory/brands"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1.25rem', background: 'linear-gradient(135deg, #FFD700, #FCC419)', color: '#000', fontWeight: 700, fontSize: '0.875rem', borderRadius: '8px', textDecoration: 'none', boxShadow: '0 2px 8px rgba(255,215,0,0.2)' }}
        >
          Browse All Brands
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { brand: 'Bauer', category: 'Skates & Equipment', lineup: 'Nexus • Vapor • Supreme', note: 'The largest hockey equipment brand in the world. Three distinct last shapes across product lines.', color: '#1E4D8C' },
          { brand: 'CCM', category: 'Skates & Equipment', lineup: 'JetSpeed • Ribcor • Tacks', note: 'Second-largest hockey brand. Known for the Super Tacks line and strong skate heat-molding tech.', color: '#C8102E' },
          { brand: 'Easton', category: 'Sticks & Equipment', lineup: 'M5 • M3 • Rival', note: 'Carbon fiber stick technology pioneer. Now focused on value-oriented sticks and protective gear.', color: '#FFB81C' },
          { brand: 'Warrior', category: 'Sticks & Equipment', lineup: 'Dolomit • Alpha • Ritual', note: 'Grew fast in the stick market with theCoil/Weave technology. Strong protective gear lineup too.', color: '#FF6600' },
          { brand: 'True', category: 'Sticks & Skates', lineup: 'A6.0 S1 • A6.0 S2', note: 'Direct-to-consumer brand that bypassed traditional retailers. Known for adjustability and feel.', color: '#00A3A3' },
          { brand: 'Bauer Re-Akt', category: 'Protective', lineup: 'Re-Akt 200 • Re-Akt 150', note: 'Security shell technology in helmets and shoulder pads. Popular at junior and college levels.', color: '#1E4D8C' },
          { brand: 'CCM Hyperlite', category: 'Skates', lineup: 'HyperLite 2', note: 'CCM\'s lightest skate ever. Asymmetrical toe cap and step-out last designed for maximum mobility.', color: '#C8102E' },
          { brand: 'Bauer Mach', category: 'Skates', lineup: 'Mach', note: 'Next generation of Bauer Vapor with a new suspended Tendon guard and upgraded liner.', color: '#1E4D8C' },
        ].map(g => (
          <div key={g.brand} style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1.25rem' }}>
            <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.25rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '0.25rem' }}>{g.brand}</h3>
            <span style={{ fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: g.color }}>{g.category}</span>
            <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', marginTop: '0.25rem', marginBottom: '0.5rem' }}>{g.lineup}</p>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8125rem', lineHeight: 1.65 }}>{g.note}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
        {[
          { title: 'Skate Buying Guide', note: 'Width, fit, blade quality  --  what actually matters when buying hockey skates.' },
          { title: 'Stick Flex Chart', note: 'Find the right flex based on weight and height. Too stiff or too whippy both hurt performance.' },
          { title: 'Helmet Ratings Explained', note: 'CCE vs. HECC certifications, what the ratings mean, and how to spot an outdated helmet.' },
          { title: 'Goalie Gear Differences', note: 'Leg pads, blockers, gloves, chest protectors  --  how goalie equipment differs from player gear.' },
        ].map(guide => (
          <div key={guide.title} style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '6px', padding: '1rem' }}>
            <h3 style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff', marginBottom: '0.4rem' }}>{guide.title}</h3>
            <p style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>{guide.note}</p>
          </div>
        ))}
      </div>

      {/* Editorial section — keyword-targeted for "hockey equipment", "hockey equipment brands",
          "best hockey equipment", "hockey gear brands" (GSC queries at position 50-90 in 90d).
          The page lives at /gear-brands because that is the URL Google already had impressions on.
          Pre-2026-07-10 this route 308-redirected to /gear-reviews; GSC reports 213 impr/month
          wasted on the redirect. Moving the content here matches the URL to the query intent. */}
      <section style={{ marginTop: '2.5rem', color: 'rgba(255,255,255,0.75)', fontSize: '0.9375rem', lineHeight: 1.7 }}>
        <h2 style={{ fontSize: '1.375rem', fontWeight: 700, color: '#fff', marginBottom: '0.75rem', letterSpacing: '0.01em' }}>
          What hockey equipment do you actually need?
        </h2>
        <p style={{ marginBottom: '1rem' }}>
          The short answer: a helmet, skates, a stick, and protective gear for the body.
          Everything else is optional. New players often buy full sets before they know what fits
          them, then end up with skates that pinch or a stick that is the wrong flex. The safer
          move is to start with the non-negotiables, get used to them, and add the rest as your
          game develops.
        </p>
        <h2 style={{ fontSize: '1.375rem', fontWeight: 700, color: '#fff', marginTop: '1.5rem', marginBottom: '0.75rem', letterSpacing: '0.01em' }}>
          The four big hockey equipment brands
        </h2>
        <p style={{ marginBottom: '1rem' }}>
          <strong>Bauer</strong> and <strong>CCM</strong> dominate the player gear market and
          together account for the majority of NHL equipment sales. Both make skates, sticks,
          helmets, gloves, and full protective lines. <strong>Warrior</strong> built a strong
          reputation in sticks and is now a full-line brand under the New Balance Hockey parent
          company. <strong>True</strong> is the disruptor, selling direct-to-consumer to cut
          retail markup and offering adjustable skate systems that grow with the player.
        </p>
        <h2 style={{ fontSize: '1.375rem', fontWeight: 700, color: '#fff', marginTop: '1.5rem', marginBottom: '0.75rem', letterSpacing: '0.01em' }}>
          Best hockey equipment brands by category
        </h2>
        <p style={{ marginBottom: '1rem' }}>
          <strong>Skates:</strong> Bauer and CCM are the safe choices for most players. True is the
          disruptor with its adjustable boot system and direct-to-consumer pricing. Easton is
          still around but the skate line has been retired. <strong>Sticks:</strong> Bauer, CCM,
          Warrior, and True dominate the senior market; Sherwood and Warrior own a lot of the
          value tier. <strong>Helmets:</strong> Bauer Re-Akt and CCM Tacks are the most popular
          senior models. For goalies, CCM and Bauer split the market about evenly.
        </p>
        <h2 style={{ fontSize: '1.375rem', fontWeight: 700, color: '#fff', marginTop: '1.5rem', marginBottom: '0.75rem', letterSpacing: '0.01em' }}>
          How much does hockey equipment cost in 2026?
        </h2>
        <p style={{ marginBottom: '1rem' }}>
          A full player set (helmet, skates, stick, gloves, shoulder pads, elbow pads, shin
          guards, hockey pants, and a bag) ranges from around $400 for a youth starter package
          to $1,500-plus for senior-level gear. Skates are the single biggest line item and
          the one piece that should never be bought on price alone. A good pair of skates will
          outlast three or four sticks, so spending more up front usually pays off.
        </p>
        <h2 style={{ fontSize: '1.375rem', fontWeight: 700, color: '#fff', marginTop: '1.5rem', marginBottom: '0.75rem', letterSpacing: '0.01em' }}>
          Where to buy hockey equipment
        </h2>
        <p style={{ marginBottom: '1rem' }}>
          Pro shops at your local rink are the best place to start because the staff can measure
          your foot and watch you skate before recommending boots. Big-box retailers and online
          stores like Pure Hockey, HockeyMonkey, and the brand direct-to-consumer sites (Bauer,
          CCM, True, Warrior) carry the same gear, often at lower prices, but you lose the
          fitting help. For used equipment, usedhockeyequipment.com and rink pro shops are
          worth a look, especially for kids who outgrow gear every season.
        </p>
      </section>
    </main>
  );
}