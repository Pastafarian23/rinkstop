import type { Metadata } from 'next';
import Link from 'next/link';
import { withDefaultOg } from '@/lib/metadata-defaults';
import LearnJsonLd from '@/components/LearnJsonLd';
import MarkReadButton from '@/components/learn/MarkReadButton';

export const metadata: Metadata = {
  title: 'Hockey Equipment on a Budget — What to Buy New, Used, and Skip',
  description: 'How to outfit your kid for hockey without breaking the bank. What to buy new (helmet, skates), what to buy used (pads, pants, gloves), and what to skip entirely.',
  keywords: ['hockey equipment on a budget', 'cheap hockey gear', 'used hockey equipment', 'hockey gear for beginners', 'where to buy hockey equipment'],
  alternates: { canonical: 'https://rinkstop.com/learn/equipment-on-a-budget' },
  robots: { index: true, follow: true },
  openGraph: withDefaultOg({
    title: 'Hockey Equipment on a Budget',
    description: 'What to buy new, what to buy used, what to skip entirely.',
    type: 'article',
    url: 'https://rinkstop.com/learn/equipment-on-a-budget',
    siteName: 'RinkStop',
  }),
};

export default function EquipmentOnABudgetPage() {
  return (
    <main style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1rem 4rem' }}>
      <nav style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '1.5rem' }}>
        <Link href="/" style={{ color: 'rgba(255,255,255,0.4)' }}>Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/learn" style={{ color: 'rgba(255,255,255,0.4)' }}>Learn</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: 'rgba(255,255,255,0.6)' }}>Equipment on a Budget</span>
      </nav>

      <h1 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 'clamp(2rem, 5vw, 3rem)', color: '#fff', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>
        HOCKEY EQUIPMENT ON A BUDGET
      </h1>
      <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '1.05rem', marginBottom: '2rem', lineHeight: 1.5 }}>
        What to buy new, what to buy used, and what to skip entirely. The 80/20 of outfitting your kid for hockey without spending $500.
      </p>

      <div style={{ color: 'rgba(255,255,255,0.75)', lineHeight: 1.8, fontSize: '1rem' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>The 3-tier rule</h2>
        <p style={{ marginBottom: '1rem' }}>
          Every piece of hockey equipment falls into one of three tiers:
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <strong>Tier 1: Buy new. No exceptions.</strong> Helmet and skates. These affect safety (helmet) and skating development (skates). You can't verify a used helmet's safety, and a bad skate fit ruins your kid's skating for years.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <strong>Tier 2: Buy used if you can, new if you have to.</strong> Gloves, shin guards, hockey pants, shoulder pads, elbow pads. These are all protective but the protection is comparable across price points. The padding does the same job whether it cost $30 or $200.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <strong>Tier 3: Skip until you know your kid is sticking with it.</strong> Premium composite sticks, top-end skates for adults, custom jerseys. These are for the player who has committed to years of hockey.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>The first-year budget: $200-400</h2>
        <p style={{ marginBottom: '1rem' }}>
          If your kid is starting 6U-8U and might outgrow everything in 12-18 months, here's the budget that doesn't waste money:
        </p>
        <ul style={{ marginBottom: '1.5rem' }}>
          <li><strong>Helmet (new, $80-150):</strong> Buy new. Every helmet is single-impact rated — once it's been hit, replace it. Used helmets can't be verified safe.</li>
          <li><strong>Skates (new or used, $80-200):</strong> New if you can afford it. Used is fine if the boot is structurally sound. See the <Link href="/learn/skate-fitting" style={{ color: '#C8102E' }}>skate fitting guide</Link> for what to check.</li>
          <li><strong>Gloves (used, $20-40):</strong> Used is fine. Make sure the palm isn't torn and the fingers are flexible.</li>
          <li><strong>Shin guards (used, $15-30):</strong> Used is fine. Make sure they cover from above the knee to the top of the skate.</li>
          <li><strong>Hockey pants (used, $20-40):</strong> Used is fine. Make sure the kidney protection is intact.</li>
          <li><strong>Shoulder pads (used, $20-40):</strong> Used is fine for 6U-8U. They outgrow these fast anyway.</li>
          <li><strong>Elbow pads (used, $10-20):</strong> Used is fine.</li>
          <li><strong>Jock or jill (new, $20-40):</strong> Buy new. Used jocks are a hygiene question.</li>
          <li><strong>Hockey socks (new, $15-25):</strong> Buy new. Used is a hygiene question.</li>
          <li><strong>Stick (new, $30-50 for entry-level):</strong> New is fine for entry-level composite. A 50 flex intermediate stick is the right starting point for a 6-8 year old.</li>
        </ul>
        <p style={{ marginBottom: '1rem' }}>
          Total: $230-595 depending on how much you buy used.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Where to buy used</h2>
        <p style={{ marginBottom: '1rem' }}>
          <strong>Your rink's pro shop:</strong> Most rinks have a used-gear section. The advantage: you can try it on. The disadvantage: selection is limited.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <strong>Facebook marketplace:</strong> Search "hockey gear" + your city. Parents sell outgrown gear every spring. You can negotiate.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <strong>Poshmark, Sideline Swap, Play It Again Sports:</strong> National used-gear marketplaces. More selection, less try-on, shipping cost.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <strong>End-of-season sales:</strong> Most rinks and associations have a gear swap in March-April. The good stuff goes fast. Show up early.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>What NOT to cheap out on</h2>
        <p style={{ marginBottom: '1rem' }}>
          <strong>The helmet.</strong> A certified helmet is the single most important piece of equipment your kid wears. Buy new. Replace every 5-7 years or after any significant impact. Most youth hockey associations require HECC-certified helmets — don't buy a helmet that doesn't have the HECC sticker.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <strong>The skates.</strong> A bad-fitting skate is the most common cause of "my kid doesn't like hockey." Pain, blisters, and bad skating mechanics all start with the wrong skate fit. Get them fitted at a store. See the <Link href="/learn/your-first-skate-fit" style={{ color: '#C8102E' }}>first skate fit guide</Link>.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <strong>The mouthguard.</strong> A $5 boil-and-bite mouthguard is fine. Just wear one.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>What to skip entirely (for the first year)</h2>
        <p style={{ marginBottom: '1rem' }}>
          <strong>Top-end composite sticks.</strong> A $250 stick is a 5% performance improvement over a $50 stick. The performance gap is real but tiny. A 6-year-old cannot tell the difference. Buy entry-level composite for the first year.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <strong>Custom skates.</strong> Custom skates cost $700-1,200 and require professional fitting. They're for high-level players who know their exact specs. Way overkill for a beginner.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <strong>Top-end protective gear.</strong> The $300 Bauer pants and the $80 Bauer pants offer similar protection. The expensive ones are lighter and more flexible, which matters at a high level but not at the youth level.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <strong>Team-issued custom jerseys.</strong> Most learn-to-play programs use pinnies or reversible jerseys. The $200 custom jersey is a want, not a need.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <strong>Visors vs. cages.</strong> Both are safe. Cages are cheaper ($20-40 vs. $80-150) and offer better protection against sticks. Visors offer better visibility. Cages are the default for kids. Your kid can switch to a visor at 14U+ if they want.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Gear libraries and rental programs</h2>
        <p style={{ marginBottom: '1rem' }}>
          Most learn-to-play programs include equipment for the first 4-8 weeks. Some associations run "gear libraries" where families can borrow equipment for a season. Ask your program director.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          Some community rinks have equipment exchange events in the fall and spring. You can swap your outgrown gear for the next size up. These are gold.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>When to upgrade</h2>
        <p style={{ marginBottom: '1rem' }}>
          Upgrade gear when:
        </p>
        <ul style={{ marginBottom: '1.5rem' }}>
          <li>Your kid outgrows it (every 1-2 years for kids under 12)</li>
          <li>The helmet is more than 5 years old or has taken a significant impact</li>
          <li>The skates have structural damage (cracked sole, broken eyelets)</li>
          <li>The stick breaks (and your kid is now breaking sticks regularly — that's a sign of stronger shots, which is good)</li>
          <li>Your kid has been playing for 2+ years and is clearly committed</li>
        </ul>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Related reading</h2>
        <ul style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li><Link href="/learn/skate-fitting" style={{ color: '#C8102E' }}>How to fit hockey skates</Link></li>
          <li><Link href="/learn/your-first-skate-fit" style={{ color: '#C8102E' }}>Your first skate fit</Link></li>
          <li><Link href="/learn/stick-fitting" style={{ color: '#C8102E' }}>How to choose a hockey stick</Link></li>
          <li><Link href="/learn/cost-by-age" style={{ color: '#C8102E' }}>Hockey cost by age</Link></li>
          <li><Link href="/tools/hockey-cost-calculator" style={{ color: '#C8102E' }}>Hockey cost calculator</Link></li>
        </ul>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Disclosure</h2>
        <p style={{ marginBottom: "0.5rem", fontSize: "0.85rem", color: "rgba(255,255,255,0.4)" }}>Last updated 2026-09-10. AI-assisted, human-reviewed by RinkStop editorial.</p>
        <p style={{ marginBottom: '1.5rem', fontSize: '0.9rem', color: 'rgba(255,255,255,0.4)' }}>
          RinkStop is supported in part by advertising. Advertising does not influence our editorial content. See our <Link href="/advertise" style={{ color: '#C8102E' }}>advertising policy</Link> and <Link href="/editorial-policy" style={{ color: '#C8102E' }}>editorial policy</Link> for the full disclosure.
        </p>
      </div>

            <div style={{ marginTop: "2.5rem", paddingTop: "1.5rem", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <MarkReadButton href="/learn/equipment-on-a-budget" title="HOCKEY EQUIPMENT ON A BUDGET" />
      </div>

    <LearnJsonLd
      href={`/learn/equipment-on-a-budget`}
      title={`Hockey Equipment on a Budget`}
      description={`What to buy new vs. used vs. borrow, what to skip, what NOT to cheap out on. Plus the cost calculator link and gear libraries.`}
      verified={`2026-09-10`}
      readTime={7}
    />
</main>
  );
}