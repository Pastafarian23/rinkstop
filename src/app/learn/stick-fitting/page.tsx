import type { Metadata } from 'next';
import Link from 'next/link';
import { withDefaultOg } from '@/lib/metadata-defaults';

export const metadata: Metadata = {
  title: 'How to Choose a Hockey Stick — Length, Flex, Curve, Lie',
  description: 'How to choose a hockey stick. Length by height and position, flex rating by weight and age, blade curve patterns (P92, P88, etc.), and lie angle. The beginner-friendly guide.',
  keywords: ['how to choose a hockey stick', 'hockey stick length', 'hockey stick flex', 'hockey stick curve', 'P92 P88 hockey curve', 'hockey stick lie'],
  alternates: { canonical: 'https://rinkstop.com/learn/stick-fitting' },
  robots: { index: true, follow: true },
  openGraph: withDefaultOg({
    title: 'How to Choose a Hockey Stick',
    description: 'Length, flex, curve, lie. The right stick for your height, weight, and position.',
    type: 'article',
    url: 'https://rinkstop.com/learn/stick-fitting',
    siteName: 'RinkStop',
  }),
};

export default function StickFittingPage() {
  return (
    <main style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1rem 4rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1.5rem' }}>
        <Link href="/" style={{ color: '#555' }}>Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/learn" style={{ color: '#555' }}>Learn</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>Stick Fitting</span>
      </nav>

      <h1 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 'clamp(2rem, 5vw, 3rem)', color: '#041E42', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>
        HOW TO CHOOSE A HOCKEY STICK
      </h1>
      <p style={{ color: '#444', fontSize: '1.05rem', marginBottom: '2rem', lineHeight: 1.5 }}>
        Four things matter: length, flex, curve pattern, and lie. Get all four right and the stick disappears in your hands.
      </p>

      <div style={{ color: '#1a1a1a', lineHeight: 1.8, fontSize: '1rem' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Length</h2>
        <p style={{ marginBottom: '1rem' }}>
          Stand in your shoes (not skates) and hold the stick vertically with the toe on the floor in front of you. The shaft should reach somewhere between your chin and your nose. Chin = mid-length stick. Nose = slightly longer. Anything higher than your nose and you'll be reaching; anything below your chin and you'll be cramped.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          Position matters. Forwards who take a lot of one-timers often go shorter (a stick a few inches below the chin) so they can release the puck quickly without the blade dragging. Defencemen often go longer (a stick at the nose or above) for reach on slap shots and poke checks. Most beginners should start at chin height and adjust.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          Junior sticks are sold in inches: 41, 44, 47, 50, 52, 54, 56, 58, 60. Senior sticks are sold in flex number and length: 65" / 75 flex, 65" / 85 flex, etc. Buy the junior or senior length that matches your height.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>The chin test (with skates on)</h2>
        <p style={{ marginBottom: '1rem' }}>
          The chin test is the standard. With your skates on (or the right shoes on — your normal skate height is about an inch and a half), stand the stick on its toe in front of you. The shaft should reach your chin. If it's at your collarbone, it's too long. If it's at your mouth, it's slightly long. If it's past your nose, it's definitely too long.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          For a 5'8" adult: 65" shaft. For a 5'10" adult: 65" or 67" depending on preference. For a 6'2" adult: 67" or 75". The taller you are, the longer the stick.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          When in doubt, shorter is better. A stick you can grow into is a stick you can use.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Flex: the most important spec</h2>
        <p style={{ marginBottom: '1rem' }}>
          Flex is how much the stick bends when you load it with your bottom hand. Lower flex number = stiffer stick. Higher flex number = softer stick. A 75 flex stick requires 75 pounds of force to bend one inch.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          The right flex is roughly half your body weight in pounds. A 150-pound player uses a 75 flex stick. A 200-pound player uses a 100. This is a starting point, not a hard rule. Two players of the same weight may prefer different flexes based on shooting style — a hard slap-shot player wants a stiffer stick; a quick-release player wants a softer one.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          For kids: the rule is even more important. A kid using a stick that's too stiff can't load it properly, can't shoot hard, and develops bad mechanics. USA Hockey's ADM recommends kids play with very soft sticks (flex 20-40 for the youngest age groups). This is one of the most common equipment mistakes.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          Use our <Link href="/tools/hockey-stick-size-calculator" style={{ color: '#C8102E' }}>stick size calculator</Link> to translate your height and weight to a starting length and flex.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Curve pattern: P92, P88, and the rest</h2>
        <p style={{ marginBottom: '1rem' }}>
          The blade curve (or "pattern") determines how the puck moves when you shoot and stickhandle. There are dozens of patterns, but most fall into a few families:
        </p>
        <ul style={{ marginBottom: '1.5rem' }}>
          <li><strong>P92 (Ovechkin) — the modern default.</strong> A mid-curve with an open angle. The puck lifts when you shoot, perfect for top-shelf goals. Most NHLers use this or something close to it. If you don't know what curve to get, this is the safe pick.</li>
          <li><strong>P88 (Kane) —</strong> A deeper curve, more hook. Excellent for stickhandling and one-timers. The puck really grips the blade. Some beginners find it harder to elevate the puck.</li>
          <li><strong>P28 (McDavid) —</strong> A mid-curve similar to P92 but slightly different lie. Used by lots of playmakers. Almost interchangeable with P92 for most players.</li>
          <li><strong>P90 (Nylander) —</strong> A bigger, more open curve. Lots of sauce on the shots. Not great for beginners because the deep curve makes it hard to receive passes cleanly.</li>
          <li><strong>Straight blade (P106, etc.) —</strong> No curve. Best for slap shots and defencemen who want predictable puck control. Harder to lift the puck for wrist shots.</li>
        </ul>
        <p style={{ marginBottom: '1rem' }}>
          For your first stick, get a P92. It's the most versatile curve and the one you'll find on most NHLers' sticks. After a year, you'll have an opinion.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Lie: the angle of the blade</h2>
        <p style={{ marginBottom: '1rem' }}>
          Lie is the angle between the shaft and the blade. Higher lie = the blade sits more upright. Lower lie = the blade lays flatter on the ice.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          Most sticks come in 4-6 lie. The right one depends on your hand position when you shoot and stickhandle. Stand in your normal stance and look at where the blade sits on the ice. If the heel of the blade is off the ice and only the toe is touching, you need a lower lie. If the toe is off the ice and the heel is touching, you need a higher lie.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          Most adult sticks are sold in 5 or 6 lie. Most kids are in 4-5 lie. If you don't have a strong opinion, leave the default.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Composite vs. wood</h2>
        <p style={{ marginBottom: '1rem' }}>
          Wood sticks are still made and are cheaper ($30-50), but composite sticks are now the standard. They're lighter, more durable, and shoot harder. Wood is fine for a recreational player who doesn't care about performance. Composite is the right choice for anyone playing more than a few times a year.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>How to cut a stick to length</h2>
        <p style={{ marginBottom: '1rem' }}>
          Most sticks come longer than you need. Cutting is fine — it just shortens the shaft and doesn't change the flex much (unless you cut a lot). To cut:
        </p>
        <ol style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li>Measure from the heel of the blade up the shaft. Mark the cut point with tape (so the saw doesn't scratch the shaft).</li>
          <li>Wrap the cut line in painters tape. This prevents splintering when you saw.</li>
          <li>Use a fine-tooth hacksaw or a proper stick-cutting saw. Saw slowly, don't force it.</li>
          <li>After cutting, sand the end smooth with fine sandpaper.</li>
          <li>Re-attach the butt end of the grip. Most sticks have a removable butt end that pops off before cutting.</li>
        </ol>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Related reading</h2>
        <ul style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li><Link href="/tools/hockey-stick-size-calculator" style={{ color: '#C8102E' }}>Free stick size calculator</Link></li>
          <li><Link href="/guides/hockey-stick-guide" style={{ color: '#C8102E' }}>How to choose a hockey stick (full)</Link></li>
          <li><Link href="/learn/hockey-equipment-guide" style={{ color: '#C8102E' }}>Hockey equipment guide</Link></li>
          <li><Link href="/learn/shooting" style={{ color: '#C8102E' }}>How to shoot</Link></li>
        </ul>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Disclosure</h2>
        <p style={{ marginBottom: '1.5rem', fontSize: '0.9rem', color: '#666' }}>
          RinkStop is supported in part by advertising. Advertising does not influence our editorial content. See our <Link href="/advertise" style={{ color: '#C8102E' }}>advertising policy</Link> and <Link href="/editorial-policy" style={{ color: '#C8102E' }}>editorial policy</Link> for the full disclosure.
        </p>
      </div>
    </main>
  );
}