import type { Metadata } from 'next';
import Link from 'next/link';
import { withDefaultOg } from '@/lib/metadata-defaults';
import LearnJsonLd from '@/components/LearnJsonLd';
import MarkReadButton from '@/components/learn/MarkReadButton';

export const metadata: Metadata = {
  title: 'How to Fit Hockey Skates — A Step-by-Step Guide for Beginners',
  description: 'How to fit hockey skates at the store or online. Sizing, width, ankle support, breaking them in, and the 5 things to check before you walk out of the shop.',
  keywords: ['how to fit hockey skates', 'hockey skate fitting', 'hockey skate sizing', 'hockey skates too tight', 'hockey skate width', 'how to break in hockey skates'],
  alternates: { canonical: 'https://rinkstop.com/learn/skate-fitting' },
  robots: { index: true, follow: true },
  openGraph: withDefaultOg({
    title: 'How to Fit Hockey Skates',
    description: 'Step-by-step: what to ask, what to check, what to walk away from.',
    type: 'article',
    url: 'https://rinkstop.com/learn/skate-fitting',
    siteName: 'RinkStop',
  }),
};

export default function SkateFittingPage() {
  return (
    <main style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1rem 4rem' }}>
      <nav style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '1.5rem' }}>
        <Link href="/" style={{ color: 'rgba(255,255,255,0.4)' }}>Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/learn" style={{ color: 'rgba(255,255,255,0.4)' }}>Learn</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: 'rgba(255,255,255,0.6)' }}>Skate Fitting</span>
      </nav>

      <h1 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 'clamp(2rem, 5vw, 3rem)', color: '#fff', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>
        HOW TO FIT HOCKEY SKATES
      </h1>
      <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '1.05rem', marginBottom: '2rem', lineHeight: 1.5 }}>
        A correctly fitted skate is the single most important equipment decision. Here's how to get it right.
      </p>

      <div style={{ color: 'rgba(255,255,255,0.75)', lineHeight: 1.8, fontSize: '1rem' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Why fit matters more than anything else</h2>
        <p style={{ marginBottom: '1rem' }}>
          A poor-fitting skate ruins hockey. It causes blisters, hot spots, ankle pain, knee pain, and bad skating mechanics. No amount of money on the most expensive skate on the market fixes a bad fit.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          A correctly-fitted skate feels snug but not painful. You can wiggle your toes but they shouldn't slide. The ankle doesn't move side to side but the foot can bend forward to skate. You can stand in them for 20 minutes without pain.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>The sizing system: Bauer, CCM, and the rest</h2>
        <p style={{ marginBottom: '1rem' }}>
          Hockey skates don't fit like shoes. The size on the box is your US shoe size minus 1 (a men's US 10 foot usually fits a size 9 hockey skate). This is a rough rule — fit depends on the brand and the model.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          Use our <Link href="/tools/hockey-skate-size-calculator" style={{ color: '#C8102E' }}>free skate size calculator</Link> to translate your US shoe size to a starting point for Bauer, CCM, or generic. Then go to a store and try them on.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          Don't buy skates online without trying them first. Even within one brand, two adjacent sizes can fit very differently. The size 9.5 in one Bauer line might be the same as a size 9 in another.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>The 5 things to check in the store</h2>
        <p style={{ marginBottom: '1rem' }}>
          When you're standing in the shop with a pair of skates laced up, check these five things before you buy:
        </p>

        <h3 style={{ fontWeight: 700, color: '#fff', marginTop: '1.5rem', marginBottom: '0.5rem' }}>1. Heel lock</h3>
        <p style={{ marginBottom: '1rem' }}>
          Stand with your weight evenly on both feet. Your heel should be firmly against the back of the skate. Lift your toes — your heel shouldn't lift more than a few millimeters. If your heel is sliding up and down inside the boot, the skate is too wide or too long. Go down half a size.
        </p>

        <h3 style={{ fontWeight: 700, color: '#fff', marginTop: '1.5rem', marginBottom: '0.5rem' }}>2. Toe room</h3>
        <p style={{ marginBottom: '1rem' }}>
          Stand up straight with your weight on both feet. Your toes should just barely touch the front of the boot, or have ¼ inch of space. If your toes are curled or crunched, the skate is too small. If you can wiggle freely and your foot slides forward when you stop, the skate is too long.
        </p>

        <h3 style={{ fontWeight: 700, color: '#fff', marginTop: '1.5rem', marginBottom: '0.5rem' }}>3. Ankle support</h3>
        <p style={{ marginBottom: '1rem' }}>
          This is the part beginners under-test. Push your ankle side to side. The skate should resist the motion — if your ankle flops over easily, the boot is too soft or too wide. You want firm resistance but not pain. If it's painful to push, the boot is too stiff for your level (or too narrow).
        </p>

        <h3 style={{ fontWeight: 700, color: '#fff', marginTop: '1.5rem', marginBottom: '0.5rem' }}>4. The lace test</h3>
        <p style={{ marginBottom: '1rem' }}>
          Lace the skates properly: snug at the toe, slightly looser in the middle, snug at the top. Then stand and bend your knees. If your heel lifts, the lacing isn't right. The pattern should be: pull the laces tight at the ankle eyelets (the second-to-last set), then add a half-eyelet of slack at the top eyelets so you can bend your ankle forward.
        </p>

        <h3 style={{ fontWeight: 700, color: '#fff', marginTop: '1.5rem', marginBottom: '0.5rem' }}>5. The 10-minute stand</h3>
        <p style={{ marginBottom: '1rem' }}>
          Lace the skates. Stand in them for 10 minutes. Walk around the store in them. If a hot spot develops in those 10 minutes, the fit is wrong. If they feel snug but bearable, the fit is probably right.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Width: D, EE, and why it matters</h2>
        <p style={{ marginBottom: '1rem' }}>
          Hockey skates come in different widths. Bauer and CCM use letter sizes:
        </p>
        <ul style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li><strong>D</strong> = standard width (most people)</li>
          <li><strong>EE</strong> = wide (a little more room in the forefoot)</li>
          <li><strong>R</strong> = low-volume / narrow (rare, for slim feet)</li>
        </ul>
        <p style={{ marginBottom: '1rem' }}>
          If your foot spills over the side of the insole when you step out, the skate is too narrow. If your foot slides around inside, it's too wide. Most stores will only stock D width in popular models, so you may need to order online for a different width.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Breaking in new skates</h2>
        <p style={{ marginBottom: '1rem' }}>
          New skates need to be broken in. The process is:
        </p>
        <ol style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li>Wear them around the house (with skate guards on if you have them) for an hour or two a day for the first week. The heat from your foot softens the materials slightly.</li>
          <li>Take them to a public-skate session or stick-and-puck. Walk around. Don't try to do laps. The first 30 minutes on the ice is the most important break-in period.</li>
          <li>After the ice, dry them thoroughly (loosen the laces, pull the tongue forward, take out the insoles). Store them with moisture-wicking boot trees or newspaper stuffed inside.</li>
          <li>Expect 4-8 hours of ice time to fully break in. If hot spots or pain develop, see a skate-fitter at your shop — many shops will punch or heat-mold the boot to fix pressure points for free.</li>
        </ol>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>What about online shopping?</h2>
        <p style={{ marginBottom: '1rem' }}>
          You can buy skates online if you've been fitted in a store before and you know your size in that brand/model. If it's your first pair, go to a store. The $20-40 markup for the fitting is the cheapest insurance you'll ever buy in hockey.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          A few online retailers offer free returns on skates. Use those. Order 2-3 sizes, try them at home, send back what doesn't fit. This is the only safe way to fit online if you don't have a recent in-store fit.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Related reading</h2>
        <ul style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li><Link href="/tools/hockey-skate-size-calculator" style={{ color: '#C8102E' }}>Free skate size calculator</Link></li>
          <li><Link href="/guides/skate-fitting-guide" style={{ color: '#C8102E' }}>Full skate fitting guide</Link></li>
          <li><Link href="/learn/your-first-skate-fit" style={{ color: '#C8102E' }}>Your first skate fit — at the store, step-by-step</Link></li>
          <li><Link href="/learn/how-to-skate" style={{ color: '#C8102E' }}>How to skate</Link></li>
        </ul>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Disclosure</h2>
        <p style={{ marginBottom: "0.5rem", fontSize: "0.85rem", color: "rgba(255,255,255,0.4)" }}>Last updated 2026-09-10. AI-assisted, human-reviewed by RinkStop editorial.</p>
        <p style={{ marginBottom: '1.5rem', fontSize: '0.9rem', color: 'rgba(255,255,255,0.4)' }}>
          RinkStop is supported in part by advertising. Advertising does not influence our editorial content. See our <Link href="/advertise" style={{ color: '#C8102E' }}>advertising policy</Link> and <Link href="/editorial-policy" style={{ color: '#C8102E' }}>editorial policy</Link> for the full disclosure.
        </p>
      </div>

            <div style={{ marginTop: "2.5rem", paddingTop: "1.5rem", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <MarkReadButton href="/learn/skate-fitting" title="HOW TO FIT HOCKEY SKATES" />
      </div>

    <LearnJsonLd
      href={`/learn/skate-fitting`}
      title={`How to Fit Hockey Skates`}
      description={`A step-by-step guide for beginners. Heel lock, toe room, ankle support, the lace test, width, and how to break in new skates.`}
      verified={`2026-09-10`}
      readTime={7}
    />
</main>
  );
}