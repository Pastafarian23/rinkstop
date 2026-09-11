import type { Metadata } from 'next';
import Link from 'next/link';
import { withDefaultOg } from '@/lib/metadata-defaults';
import LearnJsonLd from '@/components/LearnJsonLd';

export const metadata: Metadata = {
  title: 'Your First Day on the Ice — A Complete Walk-Through for New Hockey Parents',
  description: 'What to expect at your kid\'s first learn-to-play hockey session: the parking lot, the dressing room, the ice, and the other parents. A walk-through for first-timers.',
  keywords: ['first day hockey', 'first time hockey parent', 'learn to play first session', 'hockey parent first time', 'what to expect at hockey practice'],
  alternates: { canonical: 'https://rinkstop.com/learn/first-day-on-ice' },
  robots: { index: true, follow: true },
  openGraph: withDefaultOg({
    title: 'Your First Day on the Ice',
    description: 'A walk-through for parents whose kid is starting hockey — what to expect, what to bring, what NOT to do.',
    type: 'article',
    url: 'https://rinkstop.com/learn/first-day-on-ice',
    siteName: 'RinkStop',
  }),
};

export default function FirstDayOnIcePage() {
  return (
    <main style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1rem 4rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1.5rem' }}>
        <Link href="/" style={{ color: '#555' }}>Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/learn" style={{ color: '#555' }}>Learn</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>Your First Day on the Ice</span>
      </nav>

      <h1 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 'clamp(2rem, 5vw, 3rem)', color: '#041E42', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>
        YOUR FIRST DAY ON THE ICE
      </h1>
      <p style={{ color: '#444', fontSize: '1.05rem', marginBottom: '2rem', lineHeight: 1.5 }}>
        A walk-through for parents whose kid is starting hockey — the parking lot, the dressing room, the ice, and what to do (and not do) when you get home.
      </p>

      <div style={{ color: '#1a1a1a', lineHeight: 1.8, fontSize: '1rem' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Before you leave the house</h2>
        <p style={{ marginBottom: '1rem' }}>
          Get to the rink 20-30 minutes before the ice time. You'll need that buffer for parking, finding the right entrance (most rinks have a separate "rink" door vs. a "lobby" door), and the most time-consuming part: getting your kid dressed.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          If the program provides equipment (most learn-to-play programs do for the first session), your kid just needs base layers and a snack. If you bought equipment, dress them in it. Don't worry about shin guards being in the wrong spot or the helmet strap being twisted — the coaches will fix it. The first session is about your kid getting on the ice, not about you being perfect at equipment.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>The dressing room</h2>
        <p style={{ marginBottom: '1rem' }}>
          The dressing room is louder than you expect. Kids are excited, parents are nervous, and the floor is wet. Give yourself 15 minutes to get your kid in their gear. If you have a 4-6 year old, plan on 20-25 minutes the first time. They will resist the helmet, the shin guards, and probably the socks.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          If you don't have your own equipment yet, the rink will have rentals. The staff will help with sizing. Don't be afraid to ask for help. Rink staff have seen thousands of first-timers and they have a system.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>The first 10 minutes on the ice</h2>
        <p style={{ marginBottom: '1rem' }}>
          Most learn-to-play programs start with a warm-up that involves standing in a circle and following the coach's directions. The first time your kid steps on the ice, they may:
        </p>
        <ul style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li>Refuse to leave your hand</li>
          <li>Fall down within 30 seconds</li>
          <li>Cry, laugh, or both</li>
          <li>Glue themselves to the boards</li>
          <li>Skate around like they've been doing it for years (rare but it happens)</li>
        </ul>
        <p style={{ marginBottom: '1rem' }}>
          All of these are normal. The coaches have seen them all. Your job is to stand in the bleachers and stay calm. If your kid is upset, wave at them and let the coach handle it. The coach is trained to comfort and redirect. If you rush to the ice, it usually makes things worse.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>What the session looks like</h2>
        <p style={{ marginBottom: '1rem' }}>
          A typical 45-60 minute learn-to-play session breaks down like this:
        </p>
        <ol style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li><strong>Warm-up (5-10 min):</strong> Standing in a circle, gentle stretches, basic stance. The kids will be distracted. That's normal.</li>
          <li><strong>Drills (15-20 min):</strong> Skating fundamentals. Marching in place, falling and getting up, forward strides. Lots of repetition. Don't expect your kid to "get it" in the first session.</li>
          <li><strong>Free play (10-15 min):</strong> Kids get to play with pucks, shoot at nets, do whatever they want. This is where the magic happens — they forget about being scared and start playing.</li>
          <li><strong>Scrimmage or game (10-15 min):</strong> Most learn-to-play programs end with a short cross-ice game. Your kid will probably just stand there for the first few games. That's also normal.</li>
        </ol>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>What NOT to do in the bleachers</h2>
        <p style={{ marginBottom: '1rem' }}>
          The Hockey Parents Handbook has a whole section on this. The highlights:
        </p>
        <ul style={{ marginBottom: '1.5rem' }}>
          <li>Don't yell instructions at your kid. They can hear you, and it confuses them when their instructions come from the stands instead of the coach.</li>
          <li>Don't talk about the referees. They're usually teenage volunteers or first-year officials. They're doing their best.</li>
          <li>Don't coach from the stands. The coach is on the ice. You're in the bleachers. Stay in your lane.</li>
          <li>Don't compare your kid to the other kids. Every kid develops at their own pace.</li>
          <li>Don't apologize for your kid's performance. They're four. They're learning to skate. That's enough.</li>
        </ul>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>The car ride home</h2>
        <p style={{ marginBottom: '1rem' }}>
          This is where most parents ruin the experience. Don't grill your kid about what they learned. Don't critique their skating. Don't ask "did you have fun?" in a way that makes them feel like the right answer matters.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          Better questions:
        </p>
        <ul style={{ marginBottom: '1.5rem' }}>
          <li>"What was the best part?" (open-ended, no right answer)</li>
          <li>"Did you fall down? I bet it was funny." (humor, normalizes falling)</li>
          <li>"Did the coach do anything cool?" (centers the coach, not you)</li>
          <li>"Are you going back next week?" (lets them opt in without pressure)</li>
        </ul>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>After the session: what to do with the equipment</h2>
        <p style={{ marginBottom: '1rem' }}>
          Take everything home wet. That's normal — your kid has been on ice for an hour. Don't try to dry the gear in the car. Get it home, lay it out, and let it air-dry overnight. Don't put it in the dryer. Don't leave it in a heap in the bag.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          Skates: take them out of the bag. Pull the tongue forward. Open them up. Stuff newspaper in them if they're soaked. They'll dry overnight.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          Helmet, pads, pants, gloves: hang them up or lay them on a drying rack. The smell that develops when you leave them in a sealed bag is unforgettable in a bad way.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>When to start shopping for your own equipment</h2>
        <p style={{ marginBottom: '1rem' }}>
          Most learn-to-play programs include equipment for the first 4-8 weeks. After that, you'll want to buy your own so the fit is right for your kid. Don't buy before the first session. Use the rentals to confirm your kid likes hockey.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          When you're ready to buy, see our <Link href="/learn/skate-fitting" style={{ color: '#C8102E' }}>skate fitting guide</Link> and the <Link href="/tools/hockey-cost-calculator" style={{ color: '#C8102E' }}>cost calculator</Link>. The first-year gear package for a 6U player runs $200-400 new or $80-150 used.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Related reading</h2>
        <ul style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li><Link href="/learn/age-to-start-hockey" style={{ color: '#C8102E' }}>When can my kid start hockey?</Link></li>
          <li><Link href="/learn/choosing-a-program" style={{ color: '#C8102E' }}>How to choose a learn-to-play program</Link></li>
          <li><Link href="/learn/parent-survival-guide" style={{ color: '#C8102E' }}>Hockey parent survival guide</Link></li>
          <li><Link href="/directory/youth-hockey/learn-to-play" style={{ color: '#C8102E' }}>Find a learn-to-play program near you</Link></li>
        </ul>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Disclosure</h2>
        <p style={{ marginBottom: "0.5rem", fontSize: "0.85rem", color: "#888" }}>Last updated 2026-09-10. AI-assisted, human-reviewed by RinkStop editorial.</p>
        <p style={{ marginBottom: '1.5rem', fontSize: '0.9rem', color: '#666' }}>
          RinkStop is supported in part by advertising. Advertising does not influence our editorial content. See our <Link href="/advertise" style={{ color: '#C8102E' }}>advertising policy</Link> and <Link href="/editorial-policy" style={{ color: '#C8102E' }}>editorial policy</Link> for the full disclosure.
        </p>
      </div>


    <LearnJsonLd
      href={`/learn/first-day-on-ice`}
      title={`Your First Day on the Ice`}
      description={`What to expect at your first learn-to-play session: the parking lot, the dressing room, the ice, and the other parents.`}
      verified={`2026-09-10`}
      readTime={6}
    />
</main>
  );
}