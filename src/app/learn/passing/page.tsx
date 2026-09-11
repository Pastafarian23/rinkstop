import type { Metadata } from 'next';
import Link from 'next/link';
import { withDefaultOg } from '@/lib/metadata-defaults';
import LearnJsonLd from '@/components/LearnJsonLd';

export const metadata: Metadata = {
  title: 'How to Pass a Hockey Puck — Forehand, Backhand, Saucer, and More',
  description: 'How to pass a hockey puck. Forehand pass, backhand pass, saucer pass, one-touch pass, give-and-go. The right pass for every situation.',
  keywords: ['hockey passing', 'how to pass in hockey', 'forehand pass', 'backhand pass', 'saucer pass', 'give and go', 'hockey passing technique'],
  alternates: { canonical: 'https://rinkstop.com/learn/passing' },
  robots: { index: true, follow: true },
  openGraph: withDefaultOg({
    title: 'How to Pass a Hockey Puck',
    description: 'Forehand, backhand, saucer, one-touch. The right pass for every situation.',
    type: 'article',
    url: 'https://rinkstop.com/learn/passing',
    siteName: 'RinkStop',
  }),
};

export default function PassingPage() {
  return (
    <main style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1rem 4rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1.5rem' }}>
        <Link href="/" style={{ color: '#555' }}>Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/learn" style={{ color: '#555' }}>Learn</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>Passing</span>
      </nav>

      <h1 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 'clamp(2rem, 5vw, 3rem)', color: '#041E42', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>
        HOW TO PASS
      </h1>
      <p style={{ color: '#444', fontSize: '1.05rem', marginBottom: '2rem', lineHeight: 1.5 }}>
          Passing is the single biggest separator between new players and experienced ones. Master these passes and you'll play a different game.
      </p>

      <div style={{ color: '#1a1a1a', lineHeight: 1.8, fontSize: '1rem' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>The forehand pass</h2>
        <p style={{ marginBottom: '1rem' }}>
          The most common pass in hockey. You're moving the puck from your forehand side to a teammate's forehand side.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <strong>How to do it:</strong>
        </p>
        <ol style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li>Get the puck to the middle of the blade. This is the control point.</li>
          <li>Cup the blade slightly — the bottom edge of the blade turns up toward the ceiling — to cup the puck and keep it on the blade.</li>
          <li>Sweep the blade forward. The motion comes from your bottom hand pushing the shaft forward, not from your top hand pulling.</li>
          <li>Follow through toward the target. The blade should point at where you want the puck to go when the pass is complete.</li>
          <li>Keep your head up. You can't pick out a pass you can't see.</li>
        </ol>
        <p style={{ marginBottom: '1rem' }}>
          Common mistake: sweeping with the top hand. The top hand is for control; the bottom hand is for power. Players who sweep with the top hand have weak, slow passes.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>The backhand pass</h2>
        <p style={{ marginBottom: '1rem' }}>
          You receive the puck on your backhand side and you need to move it without turning the blade over. The backhand pass is a high-skill move because the geometry is awkward.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <strong>How to do it:</strong>
        </p>
        <ol style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li>Pull the puck to the middle of the blade. Same control point as the forehand pass.</li>
          <li>Cup the blade — the open face is up. The puck is sitting in the cup.</li>
          <li>Sweep the blade forward by pushing with your top hand and rotating your bottom hand. The motion is similar to a backhand sweep in tennis.</li>
          <li>Roll your wrists at the end of the pass to give the puck a little lift and direction. Without the roll, the puck tends to slide flat and slow.</li>
        </ol>
        <p style={{ marginBottom: '1rem' }}>
          A good backhand pass is the mark of an experienced player. The puck stays flat and fast, the player doesn't have to turn their body, and the play keeps flowing. Work on this — it's worth it.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>The saucer pass</h2>
        <p style={{ marginBottom: '1rem' }}>
          A pass that floats — about 6-12 inches off the ice — over an obstacle. The obstacle is usually a defender's stick or a puddle. The pass lands flat on the recipient's stick, so it's easy to receive.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <strong>How to do it:</strong>
        </p>
        <ol style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li>Cup the puck on the heel of the blade. The puck should be sitting on the curved part, not the toe.</li>
          <li>Sweep forward, but as you sweep, lift the heel of the blade. The puck leaves the blade in an arc — high in the middle, landing flat on the other side.</li>
          <li>The lift comes from the wrist, not the arm. If you lift with the arm, the puck goes too high. A wrist-only lift is the right amount.</li>
        </ol>
        <p style={{ marginBottom: '1rem' }}>
          Saucer passes are advanced because the lift is hard to calibrate. Too little and the puck doesn't clear; too much and it lands on the back of the recipient's neck. Practice this on a quiet rink with a partner who can give you feedback.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>The one-touch pass</h2>
        <p style={{ marginBottom: '1rem' }}>
          You receive the puck and pass it without stopping it. This is the highest-skill pass because you have to read the play, position your stick, and redirect the puck in one motion.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <strong>How to do it:</strong>
        </p>
        <ol style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li>Read the play before the puck arrives. Where is the open teammate? Where is the defender?</li>
          <li>Position your blade at the angle you want the puck to go. Open your stance so the blade faces the target.</li>
          <li>The puck arrives. Let it hit the middle of the blade. Don't fight it.</li>
          <li>Transfer your weight through the puck, in the direction of the target. The puck redirects out the other side.</li>
        </ol>
        <p style={{ marginBottom: '1rem' }}>
          One-touch passes are what make a hockey team look fast. If you can redirect a pass to a teammate in stride without breaking your own stride, you save a half-second every time — and a half-second is most of hockey.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>The give-and-go</h2>
        <p style={{ marginBottom: '1rem' }}>
          You pass to a teammate, then move to an open space. Your teammate passes it back to you in your new space. The classic two-man give-and-go is one of the simplest and most effective plays in hockey.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <strong>How to do it:</strong>
        </p>
        <ol style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li>Pass the puck to a teammate. The pass doesn't need to be a beauty — just a clean, catchable pass.</li>
          <li>Move immediately after the pass. Skating away from the defender is the standard. The defender was watching you; now they're chasing you.</li>
          <li>Your teammate sees you moving and one-times or short-passes the puck back to you in your new space.</li>
        </ol>
        <p style={{ marginBottom: '1rem' }}>
          The give-and-go works because most defenders freeze for a beat when they don't have the puck. That beat is your window. Skating through the window is the entire skill.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>When to use each pass</h2>
        <p style={{ marginBottom: '1rem' }}>
          <strong>Forehand pass</strong> — the default. Most of your passes will be forehand. Use it when the teammate is on your forehand side and there's no obstacle in the way.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <strong>Backhand pass</strong> — when the teammate is on your backhand side and turning the blade over would take too long. The backhand pass is faster than the forehand pass in some situations because you don't have to rotate your body.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <strong>Saucer pass</strong> — over a defender's stick, over a puddle, or to a teammate who's surrounded. Saucers are a higher-skill pass — use them when the situation calls for it, not by default.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <strong>One-touch pass</strong> — when you're stationary and the play is moving. If you're waiting for the puck and a teammate is open, redirect it. One-touch passes are how good teams keep the puck moving.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <strong>Give-and-go</strong> — when you have the puck in the offensive zone and a teammate is supporting. Pass and move. The simplest and most effective offensive play in hockey.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Receiving a pass</h2>
        <p style={{ marginBottom: '1rem' }}>
          Most new players focus on passing, but receiving is half the equation. The right way to receive:
        </p>
        <ul style={{ marginBottom: '1.5rem' }}>
          <li>Keep your stick on the ice, blade open, in the passing lane.</li>
          <li>Cushion the puck — give slightly with the blade as the puck arrives. A stiff blade sends the puck bouncing; a soft one rolls it in cleanly.</li>
          <li>Look at the passer's stick, not their eyes. The stick tells you where the puck is going; the eyes can lie.</li>
          <li>Call for the pass if you want it. The passer may not see you.</li>
        </ul>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>How to practice passing</h2>
        <p style={{ marginBottom: '1rem' }}>
          Stationary passing is the foundation. Stand 15 feet apart, pass back and forth, both forehand and backhand. Once forehand and backhand are automatic, increase the distance. Once that's automatic, add a target (a puck, a cone, a circle drawn in the snow). Add a moving target. Add a defender. Add a clock.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          Moving passing — passing while you and your partner are skating — is the next step. Start slow. Work up to game speed.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Related reading</h2>
        <ul style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li><Link href="/learn/shooting" style={{ color: '#C8102E' }}>How to shoot</Link></li>
          <li><Link href="/learn/face-offs" style={{ color: '#C8102E' }}>How to win face-offs</Link></li>
          <li><Link href="/guides/passing" style={{ color: '#C8102E' }}>Hockey passing guide (full)</Link></li>
        </ul>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Disclosure</h2>
        <p style={{ marginBottom: '1.5rem', fontSize: '0.9rem', color: '#666' }}>
          RinkStop is supported in part by advertising. Advertising does not influence our editorial content. See our <Link href="/advertise" style={{ color: '#C8102E' }}>advertising policy</Link> and <Link href="/editorial-policy" style={{ color: '#C8102E' }}>editorial policy</Link> for the full disclosure.
        </p>
      </div>



    
    <LearnJsonLd
      href='/learn/passing'
      title='How to Pass a Hockey Puck'
      description='Forehand, backhand, saucer, one-touch, give-and-go. The right pass for every situation, with technique breakdowns for each.'
      verified='2026-09-10'
      readTime={9}
    />
</main>
  );
}