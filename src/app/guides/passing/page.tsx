import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Hockey Passing Guide - Forehand, Backhand, Saucer, and How to Move the Puck',
  description: 'Everything you need to know about hockey passing: the basic passes, the saucer pass, one-touch passing, give-and-go, breakout passes, and the drills that build puck-moving skills.',
  openGraph: {
    title: 'Hockey Passing Guide',
    description: 'Hockey passing: forehand, backhand, saucer, one-touch, give-and-go, and breakouts.',
    type: 'article',
  },
  alternates: { canonical: 'https://rinkstop.com/guides/passing' },
};

export default function PassingGuide() {
  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '0.75rem 1rem 4rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1rem' }}>
        <Link href="/">Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/guides" style={{ color: '#555' }}>Guides</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>Passing</span>
      </nav>
      <span style={{ display: 'inline-block', fontSize: '0.5625rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '0.2rem 0.6rem', borderRadius: '4px', background: 'rgba(200,16,46,0.12)', color: '#C8102E', marginBottom: '0.75rem' }}>Guide</span>
      <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(2rem, 5vw, 2.75rem)', color: '#fff', letterSpacing: '0.04em', lineHeight: 1, margin: '0 0 0.75rem' }}>HOCKEY PASSING GUIDE</h1>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9375rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>The passes that move the puck, the saucer that skips sticks, and the give-and-go that beats defenders.</p>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'Article', headline: 'Hockey Passing Guide', description: 'Hockey passing: forehand, backhand, saucer, one-touch, give-and-go, and breakouts.', author: { '@type': 'Organization', name: 'RinkStop' }, publisher: { '@type': 'Organization', name: 'RinkStop', url: 'https://rinkstop.com' }, datePublished: '2026-08-11' }) }} />

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>BASIC PASS TYPES</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>Hockey passes fall into a handful of categories. Most plays involve multiple types:</p>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {[
            { name: 'Forehand pass', desc: 'A pass made on the forehand side of the blade. The most-used and most accurate pass. Should arrive flat and on the tape.' },
            { name: 'Backhand pass', desc: 'A pass made on the backhand side of the blade. Used to change the angle and catch defenders off guard. Effective in tight spaces.' },
            { name: 'Saucer pass', desc: 'A pass that floats over sticks and obstacles. Used to clear the defensive zone, set up a one-timer, or feed a forward on a rush.' },
            { name: 'Bank pass', desc: 'A pass off the boards. Used to maintain possession in the defensive zone and to reset plays.' },
            { name: 'One-touch pass', desc: 'A pass made without stopping the puck. The fastest pass but requires excellent hand-eye coordination.' },
            { name: 'Slap pass', desc: 'A pass made with a slap shot motion. Used for long-distance clearing or as a power-play setup.' },
          ].map((row, i) => (
            <div key={i} style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.875rem 1.125rem' }}>
              <div style={{ marginBottom: '0.4rem' }}>
                <h3 style={{ color: '#fff', fontSize: '1rem', fontWeight: 700, margin: 0 }}>{row.name}</h3>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', lineHeight: 1.55, margin: 0 }}>{row.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>PASSING MECHANICS</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>The fundamentals of a good pass are the same regardless of type. Focus on:</p>
        <ul style={{ color: '#aaa', lineHeight: 1.7, fontSize: '0.9375rem', paddingLeft: '1.25rem', marginBottom: '1.5rem' }}>
          <li style={{ marginBottom: '0.5rem' }}><strong style={{ color: '#fff' }}>Lead the target:</strong> pass to where the receiver is going, not where they are. The puck should arrive at the receiver stick as they reach it, not before or after.</li>
          <li style={{ marginBottom: '0.5rem' }}><strong style={{ color: '#fff' }}>On the tape:</strong> the puck should arrive flat on the receiver blade, not bouncing. Bouncing pucks require stickhandling to receive and slow the play.</li>
          <li style={{ marginBottom: '0.5rem' }}><strong style={{ color: '#fff' }}>Head up before passing:</strong> look at the target, not the puck. The puck is between the blade and the ice; the eyes should be scanning options.</li>
          <li style={{ marginBottom: '0.5rem' }}><strong style={{ color: '#fff' }}>Push and follow:</strong> push the puck with a sweeping motion of the blade. Pulling the puck limits accuracy and speed.</li>
          <li style={{ marginBottom: '0.5rem' }}><strong style={{ color: '#fff' }}>Soft hands on reception:</strong> catch the puck softly to set up the next play. Hard catches require stickhandling to settle.</li>
        </ul>
      </section>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>SAUCER PASS DETAILS</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>The saucer is the most-used specialty pass. Used to clear sticks, avoid blocked lanes, or feed a forward on a rush. The mechanics:</p>
        <ol style={{ color: '#aaa', lineHeight: 1.7, fontSize: '0.9375rem', paddingLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li style={{ marginBottom: '0.5rem' }}>Cup the puck slightly with the heel of the blade</li>
          <li style={{ marginBottom: '0.5rem' }}>Push through the puck with a slight upward angle (5-15 degrees)</li>
          <li style={{ marginBottom: '0.5rem' }}>The puck lifts 2-6 inches off the ice depending on distance</li>
          <li style={{ marginBottom: '0.5rem' }}>Receiver should expect the puck in the air; receive with the blade angled up</li>
        </ol>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>The saucer is most effective on breakouts (clearing the defensive zone over the forechecker stick) and on the power play (feeding the slot player across the seam).</p>
      </section>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>GIVE-AND-GO</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>The give-and-go is the simplest and most-effective way to beat a defender one-on-one. The mechanics:</p>
        <ol style={{ color: '#aaa', lineHeight: 1.7, fontSize: '0.9375rem', paddingLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li style={{ marginBottom: '0.5rem' }}>Approach the defender with the puck</li>
          <li style={{ marginBottom: '0.5rem' }}>Pass to a teammate in support (the "give")</li>
          <li style={{ marginBottom: '0.5rem' }}>Skate past the defender toward open ice</li>
          <li style={{ marginBottom: '0.5rem' }}>Receive the return pass (the "go") in stride</li>
        </ol>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>The give-and-go works because the defender must commit to either the puck carrier or the support player. The split-second decision is what creates the open lane.</p>
      </section>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>PASSING DRILLS</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>The most effective passing drills for practice:</p>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {[
            { name: 'Stationary partner passing', desc: 'Two players 10-15 feet apart, continuous forehand-backhand passing for 60 seconds. The foundational drill for passing accuracy.' },
            { name: 'Moving partner passing', desc: 'Two players skating the length of the ice passing back and forth. Builds the timing needed for in-game passes.' },
            { name: 'Three-man weave', desc: 'Three players in a zigzag pattern, continuous one-touch passing. Used in warm-ups and to build touch.' },
            { name: 'Saucer over obstacles', desc: 'Two players with sticks or pucks between them; the passer must lift the puck over. Builds saucer accuracy.' },
            { name: 'Give-and-go with cones', desc: 'Cone simulates a defender. Pass to support, skate past cone, receive return pass. Builds the timing for the give-and-go.' },
            { name: 'Breakout patterns', desc: 'Five players in defensive zone positions. Defenseman retrieves puck and executes each breakout pattern in turn.' },
          ].map((row, i) => (
            <div key={i} style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.875rem 1.125rem' }}>
              <div style={{ marginBottom: '0.4rem' }}>
                <h3 style={{ color: '#fff', fontSize: '1rem', fontWeight: 700, margin: 0 }}>{row.name}</h3>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', lineHeight: 1.55, margin: 0 }}>{row.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: "2.5rem" }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>EXPLORE THE DIRECTORY</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>Take what you've learned into the RinkStop directory.</p>
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          <Link href="/directory/players?position=center" style={{ display: "block", padding: "0.75rem 1rem", background: "var(--s2)", border: "1px solid var(--border)", borderRadius: "4px", color: "#C8102E", textDecoration: "none", fontSize: "0.9375rem" }}>Find playmaking centers and wings →</Link>
        </div>
      </section>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>RELATED GUIDES</h2>
        <ul style={{ color: '#aaa', lineHeight: 1.7, fontSize: '0.9375rem', paddingLeft: '1.25rem' }}>
          <li style={{ marginBottom: '0.4rem' }}><Link href="/guides/stickhandling" style={{ color: '#C8102E' }}>Hockey Stickhandling Guide</Link></li>
          <li style={{ marginBottom: '0.4rem' }}><Link href="/guides/shooting" style={{ color: '#C8102E' }}>Hockey Shooting Guide</Link></li>
          <li style={{ marginBottom: '0.4rem' }}><Link href="/guides/defensive-play" style={{ color: '#C8102E' }}>Hockey Defensive Play Guide</Link></li>
          <li style={{ marginBottom: '0.4rem' }}><Link href="/guides/skating" style={{ color: '#C8102E' }}>Hockey Skating Guide</Link></li>
        </ul>
      </section>
    </div>
  );
}
