import type { Metadata } from 'next';
import Link from 'next/link';
import { withDefaultOg } from '@/lib/metadata-defaults';

export const metadata: Metadata = {
  title: 'How to Win Face-offs in Hockey — Technique and Rules',
  description: 'How to win face-offs in hockey. Center technique, wing technique, the grip, the stick position, the timing, and the rules on what you can and can\'t do at the dot.',
  keywords: ['how to win face-offs', 'hockey faceoff technique', 'faceoff rules', 'hockey face-off', 'center faceoff technique', 'hockey draws'],
  alternates: { canonical: 'https://rinkstop.com/learn/face-offs' },
  robots: { index: true, follow: true },
  openGraph: withDefaultOg({
    title: 'How to Win Face-offs in Hockey',
    description: 'Center technique, wing technique, the rules, and the timing.',
    type: 'article',
    url: 'https://rinkstop.com/learn/face-offs',
    siteName: 'RinkStop',
  }),
};

export default function FaceOffsPage() {
  return (
    <main style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1rem 4rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1.5rem' }}>
        <Link href="/" style={{ color: '#555' }}>Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/learn" style={{ color: '#555' }}>Learn</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>Face-offs</span>
      </nav>

      <h1 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 'clamp(2rem, 5vw, 3rem)', color: '#041E42', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>
        HOW TO WIN FACE-OFFS
      </h1>
      <p style={{ color: '#444', fontSize: '1.05rem', marginBottom: '2rem', lineHeight: 1.5 }}>
          Face-offs are won in the details. The grip, the stick position, the timing of the pull, and the rules you can and can't break.
      </p>

      <div style={{ color: '#1a1a1a', lineHeight: 1.8, fontSize: '1rem' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Why face-offs matter</h2>
        <p style={{ marginBottom: '1rem' }}>
          Every play starts with a face-off. Win the draw, and you start with the puck. Lose it, and the other team starts with possession. In close games, the team that wins more face-offs usually wins.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          For centers especially, face-off technique is a core skill. A center who wins 60% of their draws is more valuable than one who wins 50%, even if everything else is equal.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>The grip</h2>
        <p style={{ marginBottom: '1rem' }}>
          Most face-off coaches teach one of two grips:
        </p>
        <p style={{ marginBottom: '1rem' }}><strong>Top-hand grip (most common):</strong> Your top hand is at the top of the shaft, normal grip. Your bottom hand is 6-10 inches down the shaft, with the blade flat on the ice. This grip gives you leverage.</p>
        <p style={{ marginBottom: '1rem' }}><strong>Bottom-hand grip (advanced):</strong> Your top hand is in its normal position. Your bottom hand is at the very top of the shaft, almost touching the top hand. You pull with the top hand and push with the bottom. This grip gives you speed but less leverage.</p>
        <p style={{ marginBottom: '1rem' }}>
          Start with the top-hand grip. It's the more reliable draw for most players.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Stick position</h2>
        <p style={{ marginBottom: '1rem' }}>
          Your blade goes flat on the ice, with the toe of the blade just behind the dot. The blade should be in the same plane as the opponent's — that way you're not at a disadvantage from the start.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          The exact position depends on whether you're trying to win the puck to your forehand or your backhand. If you want it back to your D-man on your forehand, angle your blade slightly so the puck slides back to that side. If you want to draw it back to your wing, angle the other way.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          Common mistake: standing too tall. Get low — knees bent, weight on your skates, butt down. The lower you are, the harder you can pull.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>The pull</h2>
        <p style={{ marginBottom: '1rem' }}>
          The puck drops. You have a fraction of a second to react. The two strategies:
        </p>
        <p style={{ marginBottom: '1rem' }}><strong>The strong pull (most common):</strong> As soon as the puck hits the ice, you pull your stick straight back toward your body, hard. This wins the puck if your timing is right. The risk: the other center is doing the same thing and you collide sticks.</p>
        <p style={{ marginBottom: '1rem' }}><strong>The quick tap (advanced):</strong> Instead of pulling, you tap the puck sideways with the heel or toe of your blade. This works because you're reacting to where the puck actually lands, not where you expected it. It's harder to do but harder to defend against.</p>
        <p style={{ marginBottom: '1rem' }}>
          The pull is mostly about timing and hand strength. The more you practice, the more reliable your draw becomes.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Wing face-offs</h2>
        <p style={{ marginBottom: '1rem' }}>
          Only the center takes the face-off in the NHL. In youth hockey and many recreational leagues, both centers and the two wings (or one center and one wing) take it. The technique is the same, with these adjustments:
        </p>
        <ul style={{ marginBottom: '1.5rem' }}>
          <li>Stand slightly behind and to the side of the center. The wing is the second option — if the center wins the puck, the wing is the support.</li>
          <li>Your stick goes to the back of the dot, not the front. The wing is the safety valve: if the center loses the draw, the wing is in position to break up the play.</li>
          <li>Be ready to move in any direction. The wing's first step is more important than the center's draw.</li>
        </ul>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>The rules on what you can and can't do</h2>
        <p style={{ marginBottom: '1rem' }}>
          The linesman drops the puck, and from that moment, you can:
        </p>
        <ul style={{ marginBottom: '1.5rem' }}>
          <li>Pull your stick back to win the puck</li>
          <li>Skate forward to angle for position</li>
          <li>Move the puck once you've won it</li>
        </ul>
        <p style={{ marginBottom: '1rem' }}>
          You can't:
        </p>
        <ul style={{ marginBottom: '1.5rem' }}>
          <li>Swing your stick or chop at the puck before it lands</li>
          <li>Make a sweeping motion across the dot</li>
          <li>Move your skates into the face-off circle before the puck is dropped</li>
          <li>Use the toe of your blade to "shoot" the puck backward (some leagues allow a small backhand pass, but a hard shot is illegal)</li>
        </ul>
        <p style={{ marginBottom: '1rem' }}>
          The linesman will kick you out of the draw if you violate any of these. The center will be ejected from a second violation in the same game.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Special face-off situations</h2>
        <p style={{ marginBottom: '1rem' }}>
          Most face-offs are after a whistle. Some happen during play (e.g., after an offside call). The strategy is slightly different in each case:
        </p>
        <ul style={{ marginBottom: '1.5rem' }}>
          <li><strong>Offside (defensive zone face-off):</strong> You're on defense. Don't try to win the puck cleanly. Try to draw it back to your D-man or your goaltender to clear the zone.</li>
          <li><strong>Icing (defensive zone face-off):</strong> Same as offside. Clear the zone.</li>
          <li><strong>Power-play face-off (offensive zone):</strong> You're on the power play. You want possession. The standard play is a clean win back to your point or your off-wing. Most power-play goals start with a clean face-off win.</li>
          <li><strong>Penalty-kill face-off (defensive zone):</strong> You're killing a penalty. Don't try to win clean. Try to draw the puck back to your D-man to set up a clear, or to the boards for a battle.</li>
        </ul>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>How to practice face-offs</h2>
        <p style={{ marginBottom: '1rem' }}>
          Find a teammate. Stand at any dot. Drop the puck. Take turns. The first to 10 wins. The more reps, the more automatic the draw becomes.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          Good face-off centers practice 20+ draws per session, multiple times a week. It's a small but high-impact habit.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Related reading</h2>
        <ul style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li><Link href="/learn/hockey-rules" style={{ color: '#C8102E' }}>Hockey rules explained</Link></li>
          <li><Link href="/learn/hockey-positions-explained" style={{ color: '#C8102E' }}>Hockey positions explained</Link></li>
          <li><Link href="/learn/passing" style={{ color: '#C8102E' }}>How to pass</Link></li>
        </ul>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Disclosure</h2>
        <p style={{ marginBottom: '1.5rem', fontSize: '0.9rem', color: '#666' }}>
          RinkStop is supported in part by advertising. Advertising does not influence our editorial content. See our <Link href="/advertise" style={{ color: '#C8102E' }}>advertising policy</Link> and <Link href="/editorial-policy" style={{ color: '#C8102E' }}>editorial policy</Link> for the full disclosure.
        </p>
      </div>
    </main>
  );
}