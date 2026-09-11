import type { Metadata } from 'next';
import Link from 'next/link';
import { withDefaultOg } from '@/lib/metadata-defaults';
import LearnJsonLd from '@/components/LearnJsonLd';

export const metadata: Metadata = {
  title: 'How to Do Crossovers in Hockey — Forward and Backward',
  description: 'How to do crossovers in hockey. Forward crossovers, backward crossovers, when to use each, and the 5-step progression that gets you confident on the turns.',
  keywords: ['hockey crossovers', 'how to do crossovers', 'forward crossovers', 'backward crossovers', 'hockey turning', 'hockey edge work'],
  alternates: { canonical: 'https://rinkstop.com/learn/crossovers' },
  robots: { index: true, follow: true },
  openGraph: withDefaultOg({
    title: 'How to Do Crossovers in Hockey',
    description: 'Forward and backward crossovers, the moves that let you turn at speed.',
    type: 'article',
    url: 'https://rinkstop.com/learn/crossovers',
    siteName: 'RinkStop',
  }),
};

export default function CrossoversPage() {
  return (
    <main style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1rem 4rem' }}>
      <nav style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '1.5rem' }}>
        <Link href="/" style={{ color: 'rgba(255,255,255,0.4)' }}>Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/learn" style={{ color: 'rgba(255,255,255,0.4)' }}>Learn</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: 'rgba(255,255,255,0.6)' }}>Crossovers</span>
      </nav>

      <h1 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 'clamp(2rem, 5vw, 3rem)', color: '#fff', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>
        HOW TO DO CROSSOVERS
      </h1>
      <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '1.05rem', marginBottom: '2rem', lineHeight: 1.5 }}>
        Crossovers are the move that lets you turn at speed without losing momentum. Once you have them, you have hockey skating.
      </p>

      <div style={{ color: 'rgba(255,255,255,0.75)', lineHeight: 1.8, fontSize: '1rem' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>What a crossover actually is</h2>
        <p style={{ marginBottom: '1rem' }}>
          A crossover is the move where one foot crosses over the other to generate push in a turn. Instead of "stop turning, push, turn again" you stay in the turn and keep accelerating. Without crossovers, you can only go in a straight line or a long, slow curve. With crossovers, you can take tight turns at full speed — which is the entire point of hockey skating.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Prerequisites</h2>
        <p style={{ marginBottom: '1rem' }}>
          Before you practice crossovers, you need to be able to:
        </p>
        <ul style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li>Glide on one foot (the two-foot glide from <Link href="/learn/how-to-skate" style={{ color: '#C8102E' }}>how to skate</Link>)</li>
          <li>Stop using a snowplow (see <Link href="/learn/stopping" style={{ color: '#C8102E' }}>how to stop</Link>)</li>
          <li>Go around a circle on two feet at slow speed</li>
        </ul>
        <p style={{ marginBottom: '1rem' }}>
          If you can't do all three of those, work on them first. Crossovers are advanced — they require edge control and balance, and they build on the basics.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Forward crossovers, step by step</h2>
        <p style={{ marginBottom: '1rem' }}>
          I'll describe a right-foot-forward crossover (turning to your right). It's the same on the other side, just mirrored.
        </p>
        <ol style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li>Start gliding forward on both skates, building up a little speed.</li>
          <li>Begin to curve to your right by leaning your weight onto the inside edge of your left skate. (The inside edge is the side of the blade closest to your other foot.)</li>
          <li>Lift your right skate and bring it over your left, planting it on the inside of the turn. This is the "crossover" step.</li>
          <li>Push off your outside (left) skate, extending the leg fully. This push is what generates the speed through the turn.</li>
          <li>Bring your left skate over your right, repeating the crossover. Keep going around the circle.</li>
        </ol>
        <p style={{ marginBottom: '1rem' }}>
          Common mistake: not committing to the lean. If you stay upright through the turn, you have to push harder to maintain speed and you'll get tired fast. Lean into the turn with your whole body — shoulders, hips, knees. The lean is what keeps the outside skate loaded for a hard push.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Backward crossovers</h2>
        <p style={{ marginBottom: '1rem' }}>
          Backward crossovers are the same idea but you're moving backward. They're harder because you can't see where you're going as clearly, and the inside-outside edge relationship is reversed.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          For a backward right turn:
        </p>
        <ol style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li>Glide backward at a comfortable speed. Look over your shoulder to see where you're going.</li>
          <li>Begin to curve right. This time, the inside edge of your right skate is doing the carving.</li>
          <li>Lift your left skate and bring it behind your right, planting it on the outside of the turn.</li>
          <li>Push off the right skate, extending the leg back and out. The push direction is "back and to the side."</li>
          <li>Bring the right skate back and repeat.</li>
        </ol>
        <p style={{ marginBottom: '1rem' }}>
          Backward crossovers feel awkward at first. The hardest part is the head — turning to look where you're going while your body is moving the other way. Practice in a quiet area of the rink with no traffic.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>The 5-step progression</h2>
        <p style={{ marginBottom: '1rem' }}>
          Don't try to learn crossovers at full speed. Build up step by step:
        </p>
        <ol style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li><strong>Step 1:</strong> Walk a tight circle on the ice, both feet, no crossover. Get comfortable with the curve.</li>
          <li><strong>Step 2:</strong> Glide a wide circle on two feet. Lean into the turn.</li>
          <li><strong>Step 3:</strong> Glide the same circle on one foot (the outside foot). You'll fall — that's normal. Get back up and try again.</li>
          <li><strong>Step 4:</strong> Add the crossover step at slow speed. Don't worry about the push yet, just the foot-over-foot motion.</li>
          <li><strong>Step 5:</strong> Add the push. This is where the speed comes from.</li>
        </ol>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>When to use forward vs. backward crossovers</h2>
        <p style={{ marginBottom: '1rem' }}>
          Forward crossovers are for attacking. When you have the puck and you want to turn without losing speed, you use a forward crossover.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          Backward crossovers are for defending. When a forward is skating at you and you need to back up while staying oriented to them, you use a backward crossover.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          A defenseman in a game is almost always either pivoting forward to backward, or using a backward crossover, to stay between the attacker and the goal.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>How long does it take?</h2>
        <p style={{ marginBottom: '1rem' }}>
          Forward crossovers: a few hours of practice to get the basic idea, weeks to make them smooth. Most adult beginners can do a recognizable forward crossover within their first month of hockey.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          Backward crossovers: months. They're a higher-skill move because of the head-turn coordination. Most adult beginners struggle with backward crossovers for the first 6 months. Don't get discouraged.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Related reading</h2>
        <ul style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li><Link href="/learn/how-to-skate" style={{ color: '#C8102E' }}>How to skate</Link></li>
          <li><Link href="/learn/stopping" style={{ color: '#C8102E' }}>How to stop</Link></li>
          <li><Link href="/guides/skating" style={{ color: '#C8102E' }}>Hockey skating guide (full)</Link></li>
        </ul>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Disclosure</h2>
        <p style={{ marginBottom: "0.5rem", fontSize: "0.85rem", color: "#888" }}>Last updated 2026-09-10. AI-assisted, human-reviewed by RinkStop editorial.</p>
        <p style={{ marginBottom: '1.5rem', fontSize: '0.9rem', color: 'rgba(255,255,255,0.4)' }}>
          RinkStop is supported in part by advertising. Advertising does not influence our editorial content. See our <Link href="/advertise" style={{ color: '#C8102E' }}>advertising policy</Link> and <Link href="/editorial-policy" style={{ color: '#C8102E' }}>editorial policy</Link> for the full disclosure.
        </p>
      </div>


    <LearnJsonLd
      href={`/learn/crossovers`}
      title={`How to Do Crossovers`}
      description={`Forward and backward crossovers, the 5-step progression, when to use each, and the moves that let you turn at speed.`}
      verified={`2026-09-10`}
      readTime={8}
    />
</main>
  );
}