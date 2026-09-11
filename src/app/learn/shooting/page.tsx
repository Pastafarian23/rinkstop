import type { Metadata } from 'next';
import Link from 'next/link';
import { withDefaultOg } from '@/lib/metadata-defaults';
import LearnJsonLd from '@/components/LearnJsonLd';

export const metadata: Metadata = {
  title: 'How to Shoot a Hockey Puck — Wrist, Snap, Slap, Backhand',
  description: 'How to shoot a hockey puck. Wrist shot, snap shot, slap shot, backhand shot. The right shot for every situation, with technique breakdowns for each.',
  keywords: ['how to shoot a hockey puck', 'hockey wrist shot', 'hockey snap shot', 'hockey slap shot', 'hockey backhand', 'hockey shooting technique'],
  alternates: { canonical: 'https://rinkstop.com/learn/shooting' },
  robots: { index: true, follow: true },
  openGraph: withDefaultOg({
    title: 'How to Shoot a Hockey Puck',
    description: 'Wrist, snap, slap, backhand. The right shot for every situation.',
    type: 'article',
    url: 'https://rinkstop.com/learn/shooting',
    siteName: 'RinkStop',
  }),
};

export default function ShootingPage() {
  return (
    <main style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1rem 4rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1.5rem' }}>
        <Link href="/" style={{ color: '#555' }}>Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/learn" style={{ color: '#555' }}>Learn</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>Shooting</span>
      </nav>

      <h1 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 'clamp(2rem, 5vw, 3rem)', color: '#041E42', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>
        HOW TO SHOOT
      </h1>
      <p style={{ color: '#444', fontSize: '1.05rem', marginBottom: '2rem', lineHeight: 1.5 }}>
        Four shots, in order of difficulty. Learn the wrist shot first — it's the foundation for everything else.
      </p>

      <div style={{ color: '#1a1a1a', lineHeight: 1.8, fontSize: '1rem' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>The four shots</h2>
        <p style={{ marginBottom: '1rem' }}>
          Hockey has four main shot types: wrist shot, snap shot, slap shot, and backhand. Each has a different speed, release point, and use case. Here's the quick reference:
        </p>
        <ul style={{ marginBottom: '1.5rem' }}>
          <li><strong>Wrist shot</strong> — quick release, good accuracy, moderate speed. The most-used shot at every level. Develop this first.</li>
          <li><strong>Snap shot</strong> — fastest release, hard to stop, less accurate than a wrist shot. The go-to for one-timers in traffic.</li>
          <li><strong>Slap shot</strong> — hardest shot in hockey, slowest release. Best used from the blue line with a clear lane.</li>
          <li><strong>Backhand</strong> — useful when you can't get to your forehand. Less powerful but underrated for accuracy in tight spaces.</li>
        </ul>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>The wrist shot</h2>
        <p style={{ marginBottom: '1rem' }}>
          The wrist shot is the foundation. Most goals at every level are wrist shots. The mechanics: pull the puck toward your body, then push it forward as you release.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <strong>How to do it:</strong>
        </p>
        <ol style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li>Get the puck to the middle of the blade. This is your control point.</li>
          <li>Cup the blade slightly so the puck sits in the curve.</li>
          <li>Pull the puck back toward your back foot, dragging it a few inches. This loads the shot.</li>
          <li>Push the puck forward with the bottom hand, sweeping the blade toward the target. As you sweep, roll your top wrist over the puck to add spin.</li>
          <li>Finish with the blade pointing at the target. The follow-through is the accuracy.</li>
        </ol>
        <p style={{ marginBottom: '1rem' }}>
          The wrist roll at the end is what makes a wrist shot lift. Without it, the puck stays flat and the goalie can see it coming. With it, the puck has topspin and lifts, often into the corners of the net.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>The snap shot</h2>
        <p style={{ marginBottom: '1rem' }}>
          The snap shot is a quick-release version of the wrist shot. The puck barely moves before it leaves the blade. The release is so fast that goalies have a fraction of the time they get on a wrist shot.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <strong>How to do it:</strong>
        </p>
        <ol style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li>Keep your hands close together on the shaft. The closer your hands, the faster the release.</li>
          <li>Pull the puck back a short distance. Maybe 3-4 inches, not 12. Snap shots are about minimal load.</li>
          <li>Sweep the blade forward with a quick, firm motion. The motion is mostly wrist and forearm, not the whole arm.</li>
          <li>Release at the top of the sweep. The puck leaves the blade with a flick of the wrists.</li>
        </ol>
        <p style={{ marginBottom: '1rem' }}>
          Snap shots are useful in traffic. When you don't have time for a full wrist shot, a snap gets the puck on net. The trade-off: less accuracy, less power.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>The slap shot</h2>
        <p style={{ marginBottom: '1rem' }}>
          The hardest shot in hockey. A good NHL slap shot can hit 100+ mph. The trade-off: it takes a long time to load and the release is slow, so the goalie has time to react if you telegraph it.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <strong>How to do it:</strong>
        </p>
        <ol style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li>Pull the stick back behind you, well past your back foot. The further back, the more you can load the shot. (But the longer the load, the more time the goalie has.)</li>
          <li>Plant your back foot. The slap shot is a closed kinetic chain — your back leg drives the power.</li>
          <li>Sweep the stick forward, with your bottom hand pushing hard. The stick bends as you sweep — that flex is the slingshot that makes the puck move fast.</li>
          <li>Contact the puck slightly behind the middle of the blade. The contact point determines whether the puck lifts (heel) or stays flat (toe).</li>
          <li>Follow through. The follow-through on a slap shot is huge — the stick should end up in front of you, blade pointing at the target.</li>
        </ol>
        <p style={{ marginBottom: '1rem' }}>
          Common mistake: trying to slap everything. The slap shot is a special-purpose tool. Most goals are wrist shots. Use the slap shot when you have a clear lane and time to load — usually from the blue line on the power play.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>The backhand shot</h2>
        <p style={{ marginBottom: '1rem' }}>
          The backhand is the underdog shot. Most players don't practice it. That makes it useful — goalies don't expect it, and a quick backhand release can fool a goalie who's set up for a forehand shot.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <strong>How to do it:</strong>
        </p>
        <ol style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li>Pull the puck to the middle of the blade. Cup the blade — the open face is up.</li>
          <li>Transfer your weight forward as you sweep the blade. The push comes from your top hand and the rotation of your bottom hand.</li>
          <li>Roll your wrists at the end to give the puck lift. Without the wrist roll, the puck stays flat and easy to stop.</li>
        </ol>
        <p style={{ marginBottom: '1rem' }}>
          The backhand is less powerful than the forehand. Goalies know this. The advantage is surprise: a backhand release in a one-timer situation, or a backhand tucked into a tight space where a forehand wrap-around is too slow, can catch a goalie cheating.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Where to aim</h2>
        <p style={{ marginBottom: '1rem' }}>
          Most beginners aim for the middle of the net. The middle is the worst place to aim — the goalie's body is in the middle.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          Better targets:
        </p>
        <ul style={{ marginBottom: '1.5rem' }}>
          <li><strong>Top corners (top shelf):</strong> Above the goalie's shoulders, inside the post. Hard to reach, hard to stop. The wrist shot is the best shot for this target.</li>
          <li><strong>Five-hole (between the legs):</strong> Open when the goalie is moving or has their legs too close together. A well-placed low shot beats most goalies.</li>
          <li><strong>Short side (under the arm on the side they're moving away from):</strong> When a goalie is moving across the crease, the side they're moving AWAY from opens up. A short-side shot is often a goal.</li>
          <li><strong>Far side (over the blocker or stick side):</strong> Goalies protect their glove or blocker side. The opposite side is harder for them to cover.</li>
        </ul>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>How to practice shooting</h2>
        <p style={{ marginBottom: '1rem' }}>
          The standard drill: 50 wrist shots from the hash marks. Pick a corner, shoot, retrieve, repeat. Track how many go in. Most beginners hit 20-30% at first. Pros hit 60-80%.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          When you're bored of static wrist shots, add movement: shoot in stride, shoot off a pass, shoot from a bad angle. The harder the shot, the more the practice matters.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          The single most under-practiced shot in hockey is the backhand. Most players don't work on it at all. If you want an edge, spend 20% of your shooting practice on backhands.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Common mistakes</h2>
        <ul style={{ marginBottom: '1.5rem' }}>
          <li><strong>Aiming for the goalie.</strong> Pick a corner, not the middle. Even an open net has a goalie in the middle of it.</li>
          <li><strong>Not following through.</strong> The shot ends when the stick stops, not when the puck leaves the blade. A short follow-through means a short shot.</li>
          <li><strong>Looking at the puck.</strong> Keep your head up. The target is the net, not your blade.</li>
          <li><strong>Shooting while off-balance.</strong> A shot from a stable position is faster and more accurate than a shot from a falling body. If you're going to fall, fall forward — but shoot from a stable position first.</li>
        </ul>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Related reading</h2>
        <ul style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li><Link href="/learn/passing" style={{ color: '#C8102E' }}>How to pass</Link></li>
          <li><Link href="/learn/stick-fitting" style={{ color: '#C8102E' }}>How to choose a hockey stick</Link></li>
          <li><Link href="/guides/shooting" style={{ color: '#C8102E' }}>Hockey shooting guide (full)</Link></li>
        </ul>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Disclosure</h2>
        <p style={{ marginBottom: "0.5rem", fontSize: "0.85rem", color: "#888" }}>Last updated 2026-09-10. AI-assisted, human-reviewed by RinkStop editorial.</p>
        <p style={{ marginBottom: '1.5rem', fontSize: '0.9rem', color: '#666' }}>
          RinkStop is supported in part by advertising. Advertising does not influence our editorial content. See our <Link href="/advertise" style={{ color: '#C8102E' }}>advertising policy</Link> and <Link href="/editorial-policy" style={{ color: '#C8102E' }}>editorial policy</Link> for the full disclosure.
        </p>
      </div>

    <LearnJsonLd
      href={"/learn/shooting"}
      title={`How to Shoot a Hockey Puck`}
      description={`Wrist, snap, slap, backhand. The right shot for every situation, where to aim, and how to practice.`}
      verified={"2026-09-10"}
      readTime={10}
    />
</main>
  );
}