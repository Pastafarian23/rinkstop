import type { Metadata } from 'next';
import Link from 'next/link';
import { withDefaultOg } from '@/lib/metadata-defaults';
import LearnJsonLd from '@/components/LearnJsonLd';
import MarkReadButton from '@/components/learn/MarkReadButton';

export const metadata: Metadata = {
  title: 'How to Skate — A First-Time Skater\'s Guide to Hockey Skating',
  description: 'How to skate for the first time. Hockey stance, stride, balance, falling, getting up. Step-by-step for adults and kids who have never been on ice.',
  keywords: ['how to skate', 'learn to skate', 'hockey skating', 'hockey stance', 'first time skating', 'how to stop on ice skates'],
  alternates: { canonical: 'https://rinkstop.com/learn/how-to-skate' },
  robots: { index: true, follow: true },
  openGraph: withDefaultOg({
    title: 'How to Skate for Hockey — Beginner Guide',
    description: 'Stance, stride, balance, falling, getting up. The first-time skater\'s playbook.',
    type: 'article',
    url: 'https://rinkstop.com/learn/how-to-skate',
    siteName: 'RinkStop',
  }),
};

export default function HowToSkatePage() {
  return (
    <main style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1rem 4rem' }}>
      <nav style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '1.5rem' }}>
        <Link href="/" style={{ color: 'rgba(255,255,255,0.4)' }}>Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/learn" style={{ color: 'rgba(255,255,255,0.4)' }}>Learn</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: 'rgba(255,255,255,0.6)' }}>How to Skate</span>
      </nav>

      <h1 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 'clamp(2rem, 5vw, 3rem)', color: '#fff', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>
        HOW TO SKATE
      </h1>
      <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '1.05rem', marginBottom: '2rem', lineHeight: 1.5 }}>
        A first-time skater's guide. The first 20 minutes on the ice are the hardest — after that, your body starts to figure it out.
      </p>

      <div style={{ color: 'rgba(255,255,255,0.75)', lineHeight: 1.8, fontSize: '1rem' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Before you step on the ice</h2>
        <p style={{ marginBottom: '1rem' }}>
          Wear thin socks. Thick socks feel warm but they prevent the skate from fitting correctly. The skate should be snug — your toes should just touch the front when you stand straight, and pull back slightly when you bend your knees. Lace them tight from the bottom up, with the top eyelets left a touch looser to let you bend your ankle forward.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          If you have your own skates, get them sharpened before your first session. A fresh hollow with a ⅝-inch or ¾-inch radius is the right starting place. Rental skates are usually dull — expect to slip more.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Step 1: The hockey stance</h2>
        <p style={{ marginBottom: '1rem' }}>
          Before you move, you need to learn how to stand on skates. Find a clear patch of ice near the boards (so you can hold on if you need to).
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <strong>Feet shoulder-width apart.</strong> Toes pointed slightly outward (about 11 and 1 o'clock). Knees bent — about as much as if you were about to sit in a chair. Back straight, chest up, head up. Hands out in front of you like you're holding a hockey stick, even if you don't have one yet.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          This is the hockey stance. Every other skill starts from here. Spend 5 minutes just standing in it and getting comfortable. Bend your knees a little more. Bend them a little less. Find the height where you feel athletic, not stiff.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Step 2: Marching in place</h2>
        <p style={{ marginBottom: '1rem' }}>
          Still near the boards. Lift one knee up, put it down, lift the other. You're not moving yet — just shifting weight from one skate to the other. The skate you're standing on should stay flat on the ice. The knee you're lifting should come up to hip height.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          Do 10 of each side. This builds balance on each skate, which is the foundation of everything else.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Step 3: The march in motion</h2>
        <p style={{ marginBottom: '1rem' }}>
          Same idea, but now you move. Push off the back foot and glide on the front foot for 2-3 seconds, then switch. You're not trying to go fast — you're trying to feel the weight transfer.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          Common mistake: trying to take big, fast strides. Slow, balanced strides are the foundation. Speed comes later, after balance is automatic.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Step 4: The two-foot glide</h2>
        <p style={{ marginBottom: '1rem' }}>
          Push off one foot, then bring both skates together and glide. You should feel the ice pass under you for 3-5 seconds. This is what balance on a single blade feels like.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          If your skates are wobbling side to side, your ankles aren't strong enough yet. Bend your knees more — the lower you are, the more stable.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Step 5: The forward stride</h2>
        <p style={{ marginBottom: '1rem' }}>
          Now the real thing. From the two-foot glide, push your back foot out to the side at about a 45-degree angle. Push through the inside edge — that's the edge of the blade closer to your other foot. Glide on the front foot. Switch sides.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          Each push should be a full extension of the leg, then bring it back to center. Don't try to push fast — push long. The power comes from the extension, not the speed.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Step 6: Falling and getting up</h2>
        <p style={{ marginBottom: '1rem' }}>
          You will fall. Everyone does. The right way to fall:
        </p>
        <ol style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li><strong>Try to fall on your side,</strong> not forward onto your hands (wrist fractures are the most common hockey injury for new skaters) and not backward onto your tailbone.</li>
          <li><strong>Keep your arms in.</strong> Don't try to catch yourself with straight arms. Bend the elbows and roll.</li>
          <li><strong>Hit the pads if you have them.</strong> Knee pads, elbow pads, and hockey pants exist for a reason.</li>
        </ol>
        <p style={{ marginBottom: '1rem' }}>
          To get up: roll onto your hands and knees, place one skate flat on the ice under your hips, push up to a knee, then stand on the other skate. Use your stick across your knee as a prop if you have one. Don't try to stand up from a seated position — you'll fall again.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>How long does it take to learn?</h2>
        <p style={{ marginBottom: '1rem' }}>
          Honest answer: 4-6 hours of on-ice time to be functional. A full year to be comfortable with the skills in a game situation. NHL players have been skating since they were 3-4 years old. Don't compare yourself to them.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          The good news: adults learn faster than kids in some ways. They're more coachable, more cautious, and more willing to drill the boring fundamentals. The kids are better at falling without caring.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Common mistakes to avoid</h2>
        <ul style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li><strong>Standing too tall.</strong> New skaters lock their knees and lean back. Bend your knees and lean slightly forward.</li>
          <li><strong>Looking down.</strong> Watch where you're going, not your feet. Your feet will follow your head.</li>
          <li><strong>Trying to skate fast before you can balance.</strong> Speed is the last thing to learn, not the first.</li>
          <li><strong>Death-gripping the boards.</strong> Trust your edges. The boards are for emergencies, not training wheels.</li>
        </ul>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Next steps</h2>
        <p style={{ marginBottom: '1rem' }}>
          Once you can glide on one foot and stop, you're ready to start learning the other skills. Read:
        </p>
        <ul style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li><Link href="/learn/stopping" style={{ color: '#C8102E' }}>How to stop</Link></li>
          <li><Link href="/learn/crossovers" style={{ color: '#C8102E' }}>How to do crossovers</Link></li>
          <li><Link href="/learn/skate-fitting" style={{ color: '#C8102E' }}>How to fit hockey skates</Link></li>
          <li><Link href="/learn/first-day-on-ice" style={{ color: '#C8102E' }}>What to expect at your first learn-to-play session</Link></li>
          <li><Link href="/tools/hockey-skate-size-calculator" style={{ color: '#C8102E' }}>Free skate size calculator</Link></li>
        </ul>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Disclosure</h2>
        <p style={{ marginBottom: "0.5rem", fontSize: "0.85rem", color: "rgba(255,255,255,0.4)" }}>Last updated 2026-09-10. AI-assisted, human-reviewed by RinkStop editorial.</p>
        <p style={{ marginBottom: '1.5rem', fontSize: '0.9rem', color: 'rgba(255,255,255,0.4)' }}>
          RinkStop is supported in part by advertising. Advertising does not influence our editorial content. See our <Link href="/advertise" style={{ color: '#C8102E' }}>advertising policy</Link> and <Link href="/editorial-policy" style={{ color: '#C8102E' }}>editorial policy</Link> for the full disclosure.
        </p>
      </div>

            <div style={{ marginTop: "2.5rem", paddingTop: "1.5rem", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <MarkReadButton href="/learn/how-to-skate" title="HOW TO SKATE" />
      </div>

    <LearnJsonLd
      href={`/learn/how-to-skate`}
      title={`How to Skate`}
      description={`A first-time skater&apos;s guide. Hockey stance, stride, balance, falling, getting up. Step-by-step for adults and kids who have never been on ice.`}
      verified={`2026-09-10`}
      readTime={15}
    />
</main>
  );
}