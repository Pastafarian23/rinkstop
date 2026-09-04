import type { Metadata } from 'next';
import Link from 'next/link';
import { withDefaultOg } from '@/lib/metadata-defaults';

export const metadata: Metadata = {
  title: 'Hockey Equipment Brands — Bauer, CCM, Warrior, True & More (2026 Guide)',
  description:
    'Hockey equipment brands directory. Reviews of Bauer, CCM, Warrior, True, and Easton for skates, sticks, pads, helmets, and protective gear. Buying guides and brand comparisons for 2026.',
  alternates: {
    canonical: 'https://rinkstop.com/gear-brands',
  },
  openGraph: withDefaultOg({
    title: 'Hockey Equipment Brands — Bauer, CCM, Warrior, True & More',
    description:
      'Hockey equipment brand directory: reviews, comparisons, and buying guides for skates, sticks, pads, and protective gear.',
    type: 'website',
    url: 'https://rinkstop.com/gear-brands',
  }),
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

        <h2 style={{ fontSize: '1.375rem', fontWeight: 700, color: '#fff', marginTop: '1.5rem', marginBottom: '0.75rem', letterSpacing: '0.01em' }}>
          How to buy hockey skates (without wasting money)
        </h2>
        <p style={{ marginBottom: '1rem' }}>
          Skates are the single most important piece of equipment a hockey player owns and the
          one most often bought wrong. A bad fit causes pain, slows development, and turns new
          players off the sport. A good pair will outlast three or four sticks.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <strong>Fit is everything.</strong> Hockey skates should fit 1 to 1.5 sizes smaller
          than your street shoe. Your toes should lightly touch the front of the boot when
          standing upright and pull back 3 to 5 millimeters when you flex your knees. Any
          movement side-to-side means the boot is too wide. Width matters as much as length:
          Bauer, CCM, and True each offer multiple lasts (D, EE, and fit-system equivalents),
          and the right last for your foot is more important than the brand on the outside.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <strong>Get fitted at a pro shop.</strong> A trained fitter will measure both feet,
          watch you stand and flex, and pull 3 or 4 pairs for you to try. This is not optional
          for a first pair. Online retailers will not catch a heel lift or a toe pinch. If the
          nearest pro shop is more than an hour away, Pure Hockey and HockeyMonkey both have
          fit guides that help, but the in-person fitting is still preferable for a first pair.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <strong>Don't over-spend on a first pair.</strong> A $200 intermediate skate will
          outperform a $700 senior skate for a player who is still growing or still learning.
          The premium in senior skates is stiffness and weight savings, which only matter at
          higher playing speeds. Buy the level that matches the player, not the level the
          player aspires to.
        </p>

        <h2 style={{ fontSize: '1.375rem', fontWeight: 700, color: '#fff', marginTop: '1.5rem', marginBottom: '0.75rem', letterSpacing: '0.01em' }}>
          How to choose hockey stick flex
        </h2>
        <p style={{ marginBottom: '1rem' }}>
          Stick flex is the stiffness of the shaft, measured in pounds of force required to
          bend the stick one inch. The right flex depends on the player's weight, height, and
          shot style, not on the player's age or skill level.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <strong>The standard rule of thumb.</strong> Flex should be roughly half the player's
          body weight in pounds. A 160-pound player should use around an 80 flex. A 200-pound
          player should use around a 100 flex. This is a starting point — players who take
          mostly slap shots often prefer a stiffer stick (flex +10), and players who rely on
          quick wrist shots often prefer a whippier stick (flex -10).
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <strong>Cut length matters as much as flex.</strong> A stick cut 4 inches shorter
          behaves about 10 flex stiffer than its label. A player who cuts aggressively for
          puck handling is effectively raising their flex and should buy one step lower to
          compensate. The general rule: stick should reach the chin in skates for most playing
          styles, or the nose for players who want maximum reach on shots.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <strong>Curve pattern is a preference, not a performance choice.</strong> Mid-curve
          patterns (P92/Ovechkin, P88/Kane) suit most players. Deeper curves help toe drags
          but reduce backhand control. Flatter curves improve backhands and saucer passes but
          reduce shot lift. Pick the curve that matches the shot you actually take, not the
          shot you wish you could take.
        </p>

        <h2 style={{ fontSize: '1.375rem', fontWeight: 700, color: '#fff', marginTop: '1.5rem', marginBottom: '0.75rem', letterSpacing: '0.01em' }}>
          Hockey helmet certifications: what CCE and HECC actually mean
        </h2>
        <p style={{ marginBottom: '1rem' }}>
          A hockey helmet is the one piece of equipment where certification standards are
          non-negotiable. The two certifications that matter in North America are HECC
          (Hockey Equipment Certification Council) and, more recently, the newer CCE
          (Certified to CSA, in Canada). Both certify the helmet against impact tests at
          multiple temperatures, but they are not interchangeable.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <strong>HECC</strong> has been the standard for decades and is required by USA Hockey,
          Hockey Canada, and the NCAA. A HECC-certified helmet carries a sticker on the back
          with an expiration date. HECC certifications last about 6.5 years from manufacture;
          after that, the helmet is no longer certified regardless of its condition.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <strong>CCE</strong> is a newer Canadian standard (CSA Z262.1) that some manufacturers
          are adopting. It is not yet accepted by all leagues, so a CCE-only helmet may not
          pass equipment checks in some USA Hockey or NCAA contexts. Check league requirements
          before buying.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <strong>How to spot an outdated helmet.</strong> Look for the HECC sticker on the back
          and check the expiration date. If there is no sticker, the helmet is either uncertified
          (do not use it) or the sticker has been removed. If the foam inside the helmet feels
          packed down or cracked, the protection has degraded even if the certification is
          still valid. Replace it.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <strong>Mouthguards and cages/visors.</strong> HECC certification does not require a
          cage or visor, but most youth leagues do. A full cage is required for most players
          under 18 in USA Hockey. Half shields (visors) are permitted at older levels but offer
          less protection against deflected pucks.
        </p>

        <h2 style={{ fontSize: '1.375rem', fontWeight: 700, color: '#fff', marginTop: '1.5rem', marginBottom: '0.75rem', letterSpacing: '0.01em' }}>
          Goalie equipment: what is different and why
        </h2>
        <p style={{ marginBottom: '1rem' }}>
          Goalie gear is built differently from player gear in almost every category. The
          differences are not marketing — they reflect the actual physics of stopping pucks
          traveling 80 to 100 miles per hour.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <strong>Leg pads</strong> are 11 inches wide (vs. 10 for players) and constructed with
          layered foams over a stiff core. The wider surface area gives the goalie a blocking
          plane; the layered foam absorbs shot impact without transmitting force to the knee.
          A goalie's leg pad is also 1 to 2 inches taller than a player's shin guard because
          the goalie drops into a butterfly position where the pad must cover the five-hole.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <strong>Blockers</strong> are rectangular boards worn on the hand used to grip the
          stick. They have a flat blocking surface angled to redirect pucks away from the net.
          A blocker is not a glove and cannot catch — that is what the catch glove is for.
          Replacing one without the other breaks the catching-and-blocking system.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <strong>The catch glove</strong> is a large mitt with a deep pocket designed to close
          around the puck on impact. CCM and Bauer split the senior goalie market about evenly,
          with True growing in the junior market. The break angle (the angle at which the
          glove closes) is a personal preference; goalies who catch high prefer a 60- to
          75-degree break, while low catchers prefer 90 degrees.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <strong>Chest protectors</strong> for goalies extend further down the thighs and have
          wider shoulder caps than player chest protectors. The extended thigh coverage is what
          allows the goalie to drop into the butterfly without exposing the five-hole. A
          player's chest protector will not work for goalie — it ends too high and the shoulder
          floats during butterfly.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <strong>Cost difference.</strong> A full senior goalie set runs $1,500 to $3,500,
          roughly 2x the cost of a comparable player set. The biggest line items are the leg
          pads ($500 to $1,000 for senior) and the glove ($400 to $900). Used gear from
          out-grown junior sets is the best entry point for new goalies.
        </p>
      </section>
    </main>
  );
}