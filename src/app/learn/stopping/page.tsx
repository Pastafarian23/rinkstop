import type { Metadata } from 'next';
import Link from 'next/link';
import { withDefaultOg } from '@/lib/metadata-defaults';
import LearnJsonLd from '@/components/LearnJsonLd';
import MarkReadButton from '@/components/learn/MarkReadButton';

export const metadata: Metadata = {
  title: 'How to Stop on Ice Skates — Snowplow Stop and One-Foot Stop',
  description: 'How to stop on ice skates. Snowplow stop (beginner), one-foot snowplow stop, and the T-stop. Step-by-step with the right weight transfer for each technique.',
  keywords: ['how to stop on ice skates', 'hockey stop', 'snowplow stop', 'how to stop on skates', 'hockey stopping techniques'],
  alternates: { canonical: 'https://rinkstop.com/learn/stopping' },
  robots: { index: true, follow: true },
  openGraph: withDefaultOg({
    title: 'How to Stop on Ice Skates',
    description: 'Snowplow stop, one-foot stop, T-stop. The right way to stop without falling.',
    type: 'article',
    url: 'https://rinkstop.com/learn/stopping',
    siteName: 'RinkStop',
  }),
};

export default function StoppingPage() {
  return (
    <main style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1rem 4rem' }}>
      <nav style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '1.5rem' }}>
        <Link href="/" style={{ color: 'rgba(255,255,255,0.4)' }}>Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/learn" style={{ color: 'rgba(255,255,255,0.4)' }}>Learn</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: 'rgba(255,255,255,0.6)' }}>How to Stop</span>
      </nav>

      <h1 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 'clamp(2rem, 5vw, 3rem)', color: '#fff', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>
        HOW TO STOP ON ICE SKATES
      </h1>
      <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '1.05rem', marginBottom: '2rem', lineHeight: 1.5 }}>
        Three techniques, in order of difficulty. Master them in this order — the snowplow is your first stop, the T-stop is the last.
      </p>

      <div style={{ color: 'rgba(255,255,255,0.75)', lineHeight: 1.8, fontSize: '1rem' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Why stopping is the most important first skill</h2>
        <p style={{ marginBottom: '1rem' }}>
          You will spend 80% of your first 10 hours on skates trying not to crash into things. If you can stop, you can be on a public-skate session safely. Stopping is the prerequisite for everything else: stickhandling (you need to be stationary to learn it), shooting (you need to be stopped), and playing with other people (you need to not run them over).
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Technique 1: The snowplow stop (beginner)</h2>
        <p style={{ marginBottom: '1rem' }}>
          The snowplow is the wedge shape you'd make skiing. Both skates stay on the ice, toes pointed inward, pushing the inside edges of the blades into the ice to slow down.
        </p>
        <p style={{ marginBottom: '1rem' }}><strong>How to do it:</strong></p>
        <ol style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li>Get moving at a comfortable speed (a few strides is enough).</li>
          <li>Bend your knees. Lower is more stable.</li>
          <li>Push your heels out wider than your toes. The blades form a "V" shape with toes together and heels apart.</li>
          <li>Press the inside edges of both blades into the ice. You'll feel resistance. That's the stop.</li>
          <li>Lean back slightly. Your weight is over your heels, not your toes.</li>
          <li>Keep pressing until you've stopped.</li>
        </ol>
        <p style={{ marginBottom: '1rem' }}>
          Common mistake: not bending the knees enough. If you're standing tall, the V shape collapses inward and you fall forward. Get low first.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Technique 2: The one-foot snowplow stop</h2>
        <p style={{ marginBottom: '1rem' }}>
          Once the two-foot snowplow is automatic, the one-foot version is the next step. It lets you stop while the other foot is still in motion — useful when you need to stop and pivot.
        </p>
        <p style={{ marginBottom: '1rem' }}><strong>How to do it:</strong></p>
        <ol style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li>Start on two feet, moving forward.</li>
          <li>Shift your weight to your back foot (let's say your right foot).</li>
          <li>Turn your right foot so the toe points inward, digging the inside edge into the ice. The blade acts like a brake.</li>
          <li>Keep your weight centered over the braking foot. Don't lean back too far or you'll topple.</li>
          <li>The other (left) foot stays in motion briefly before coming to rest.</li>
        </ol>
        <p style={{ marginBottom: '1rem' }}>
          This is the workhorse stop in hockey. You use it constantly in games because you can transition immediately into a crossover or a turn.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Technique 3: The T-stop (advanced)</h2>
        <p style={{ marginBottom: '1rem' }}>
          The T-stop is the fastest way to stop but the hardest to learn. You place one skate perpendicular behind the other, making a "T" shape with your feet, and drag the back foot sideways.
        </p>
        <p style={{ marginBottom: '1rem' }}><strong>How to do it:</strong></p>
        <ol style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li>Get moving at speed.</li>
          <li>Shift your weight to your front (left) foot.</li>
          <li>Bring your back (right) foot behind you, perpendicular to your direction of travel. The blade of your right skate should face sideways.</li>
          <li>Press the outside edge of your back foot's blade into the ice. This is what creates the friction.</li>
          <li>Drag the back foot as long as you need to slow down.</li>
          <li>Keep your weight over the front foot. The back foot is doing the work but the front foot is doing the balance.</li>
        </ol>
        <p style={{ marginBottom: '1rem' }}>
          The T-stop is the most "hockey-looking" stop. It looks like a hockey player. It also uses a different edge of the blade than the snowplow, which is why coaches teach it later — it requires more edge control.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>What doesn't work (and why people fall)</h2>
        <p style={{ marginBottom: '1rem' }}>
          <strong>Turning sideways to stop.</strong> This is what a non-skater tries first. It almost never works because the blade slides instead of digging in. You end up spinning and falling.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <strong>Leaning back.</strong> Leaning too far back to slow down. This is the natural fear response. It puts your weight on your heels, which is actually the right idea for the snowplow — but if you overdo it, your toes come up and you fall on your butt.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <strong>Standing up tall.</strong> Trying to stop while standing up. The higher you are, the less stable you are. Bend your knees. Always.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>How long does it take?</h2>
        <p style={{ marginBottom: '1rem' }}>
          Most beginners can do a passable two-foot snowplow stop within their first 30 minutes on ice. The one-foot version takes another 1-2 hours of practice. The T-stop is weeks of practice to make it look effortless.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          Don't skip the snowplow phase. It's not just for beginners — many experienced players use a snowplow stop when they need to stop in a hurry, because it's the most reliable.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Related reading</h2>
        <ul style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li><Link href="/learn/how-to-skate" style={{ color: '#C8102E' }}>How to skate</Link></li>
          <li><Link href="/learn/crossovers" style={{ color: '#C8102E' }}>How to do crossovers</Link></li>
          <li><Link href="/guides/skating" style={{ color: '#C8102E' }}>Hockey skating guide (full)</Link></li>
        </ul>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Disclosure</h2>
        <p style={{ marginBottom: "0.5rem", fontSize: "0.85rem", color: "rgba(255,255,255,0.4)" }}>Last updated 2026-09-10. AI-assisted, human-reviewed by RinkStop editorial.</p>
        <p style={{ marginBottom: '1.5rem', fontSize: '0.9rem', color: 'rgba(255,255,255,0.4)' }}>
          RinkStop is supported in part by advertising. Advertising does not influence our editorial content. See our <Link href="/advertise" style={{ color: '#C8102E' }}>advertising policy</Link> and <Link href="/editorial-policy" style={{ color: '#C8102E' }}>editorial policy</Link> for the full disclosure.
        </p>
      </div>

            <div style={{ marginTop: "2.5rem", paddingTop: "1.5rem", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <MarkReadButton href="/learn/stopping" title="HOW TO STOP ON ICE SKATES" />
      </div>

    <LearnJsonLd
      href={`/learn/stopping`}
      title={`How to Stop on Ice Skates`}
      description={`Snowplow stop (beginner), one-foot snowplow stop, and the T-stop. The right way to stop without falling.`}
      verified={`2026-09-10`}
      readTime={10}
    />
</main>
  );
}