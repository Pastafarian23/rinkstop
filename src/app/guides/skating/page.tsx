import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Hockey Skating Guide - Stride, Edge Work, Crossovers, and Skating Drills',
  description: 'Everything you need to know about hockey skating: the mechanics of the hockey stride, edge work, crossovers, stopping, transitions, and the fundamental drills every player should learn.',
  openGraph: {
    title: 'Hockey Skating Guide',
    description: 'Hockey skating mechanics, edge work, crossovers, stopping, and the drills that build them.',
    type: 'article',
  },
  alternates: { canonical: 'https://rinkstop.com/guides/skating' },
};

export default function SkatingGuide() {
  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '0.75rem 1rem 4rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1rem' }}>
        <Link href="/">Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/guides" style={{ color: '#555' }}>Guides</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>Skating</span>
      </nav>
      <span style={{ display: 'inline-block', fontSize: '0.5625rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '0.2rem 0.6rem', borderRadius: '4px', background: 'rgba(200,16,46,0.12)', color: '#C8102E', marginBottom: '0.75rem' }}>Guide</span>
      <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(2rem, 5vw, 2.75rem)', color: '#fff', letterSpacing: '0.04em', lineHeight: 1, margin: '0 0 0.75rem' }}>HOCKEY SKATING GUIDE</h1>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9375rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>The most fundamental skill in hockey - the stride, edge work, crossovers, stopping, transitions, and the drills that build them.</p>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'Article', headline: 'Hockey Skating Guide', description: 'Hockey skating mechanics, edge work, crossovers, stopping, and the drills that build them.', author: { '@type': 'Organization', name: 'RinkStop' }, publisher: { '@type': 'Organization', name: 'RinkStop', url: 'https://rinkstop.com' }, datePublished: '2026-08-11' }) }} />

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>WHY SKATING IS THE FOUNDATION</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>Hockey is played on ice, and the player who skates better has a fundamental advantage. Skating affects every part of the game.</p>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {[
            { label: 'Forward stride', value: 'The primary skating motion. Power comes from full leg extension and pushing through the heel.' },
            { label: 'Edges', value: 'Inside and outside edges of each blade. Mastery separates good skaters from great ones.' },
            { label: 'Crossovers', value: 'The fundamental turning technique. Used on every faceoff and every change of direction.' },
            { label: 'Stopping', value: 'The hockey stop (one-foot) and T-stop (two-foot). Critical for both offense and defense.' },
            { label: 'Transitions', value: 'Switching between forward and backward skating. Required for every defenseman.' },
            { label: 'Backward skating', value: 'A separate skill set. Defenders spend significant time skating backward.' },
          ].map((row, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '1rem', padding: '0.625rem 0.875rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '4px' }}>
              <span style={{ color: '#C8102E', fontSize: '0.875rem', fontWeight: 800 }}>{row.label}</span>
              <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.875rem', lineHeight: 1.55 }}>{row.value}</span>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>THE FORWARD STRIDE</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>The forward stride looks simple but has a precise mechanical sequence. Most recreational skaters use only 60-70% of their potential stride length; even small corrections can yield significant speed gains.</p>
        <ol style={{ color: '#aaa', lineHeight: 1.7, fontSize: '0.9375rem', paddingLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li style={{ marginBottom: '0.5rem' }}>Start with knees bent at roughly 110-120 degrees, weight balanced, head up</li>
          <li style={{ marginBottom: '0.5rem' }}>Push out to the side with the inside edge of the lead skate, fully extending the leg</li>
          <li style={{ marginBottom: '0.5rem' }}>Recover the leg back underneath the body, keeping the blade on the ice</li>
          <li style={{ marginBottom: '0.5rem' }}>Repeat with the other leg; aim for full extension on every push</li>
          <li style={{ marginBottom: '0.5rem' }}>Recover quickly. The recovery is where most recreational skaters lose speed.</li>
          <li style={{ marginBottom: '0.5rem' }}>Bend the ankle slightly to keep the blade on the ice for as much of the recovery as possible</li>
        </ol>
      </section>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>EDGE WORK</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>Every skate blade has two edges: inside (toward the body) and outside (away from the body). Hockey skates are designed so a slight lean of the ankle engages one edge or the other. Edge work is the foundation of every advanced skating move.</p>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {[
            { name: 'Inside edge', desc: 'The blade leans toward the body. Used in tight turns, crossovers, and most lateral movement.' },
            { name: 'Outside edge', desc: 'The blade leans away from the body. Used in mohawk turns, backward crossovers, and tight defensive pivots.' },
            { name: 'C-cut', desc: 'A half-moon push on one edge, used to build power and edge control. The foundational drill for edge strength.' },
            { name: 'Mohawk turn', desc: 'A turn that switches from forward to backward (or vice versa) by rotating the hips and changing edges.' },
            { name: 'Pivot', desc: 'A 180-degree turn that maintains forward momentum. Used constantly in transitions and changes of direction.' },
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
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>FUNDAMENTAL DRILLS</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>A solid 20-minute skating routine built around these fundamentals will accelerate development for players of any age or level:</p>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {[
            { name: 'C-cuts (forward)', desc: 'Half-moon pushes on each foot, alternating sides. 10 reps each foot, 2 sets. Builds edge strength.' },
            { name: 'C-cuts (backward)', desc: 'Same as forward but skating backward. 10 reps each foot, 2 sets.' },
            { name: 'Forward crossovers', desc: 'Two full laps around the faceoff circle, both directions. Builds inside-edge turning power.' },
            { name: 'Backward crossovers', desc: 'Two full laps around the faceoff circle, both directions. Builds outside-edge turning power.' },
            { name: 'Hockey stops', desc: 'Stop from full speed, alternating feet. 10 reps each direction. Builds edge control and stopping power.' },
            { name: 'Tight turns', desc: 'Mohawk turns and pivots around a single cone. 10 reps each direction. Builds transitions.' },
            { name: 'Backward to forward', desc: 'Start skating backward, transition to forward, transition back. Builds transition speed.' },
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
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>OFF-ICE SKATING TRAINING</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>Off-ice training can accelerate on-ice development. The most effective off-ice work targets the same muscle groups and movement patterns used in skating:</p>
        <ul style={{ color: '#aaa', lineHeight: 1.7, fontSize: '0.9375rem', paddingLeft: '1.25rem' }}>
          <li style={{ marginBottom: '0.5rem' }}><strong style={{ color: '#fff' }}>Inline (roller) hockey:</strong> The closest off-ice training to ice. Mechanics transfer almost directly. Used widely by NHL players for summer conditioning.</li>
          <li style={{ marginBottom: '0.5rem' }}><strong style={{ color: '#fff' }}>Slide board:</strong> A two-board setup that mimics the lateral skating motion. Builds stride power without ice.</li>
          <li style={{ marginBottom: '0.5rem' }}><strong style={{ color: '#fff' }}>Plyometrics and balance work:</strong> Box jumps, single-leg hops, and balance board exercises develop the ankle and knee stability that good skating requires.</li>
          <li style={{ marginBottom: '0.5rem' }}><strong style={{ color: '#fff' }}>Strength training:</strong> Squats, deadlifts, and lunges build the leg strength that powers the stride. Recommended for players 12+.</li>
        </ul>
      </section>

      <section style={{ marginBottom: "2.5rem" }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>EXPLORE THE DIRECTORY</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>Take what you've learned into the RinkStop directory.</p>
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          <Link href="/directory/players" style={{ display: "block", padding: "0.75rem 1rem", background: "var(--s2)", border: "1px solid var(--border)", borderRadius: "4px", color: "#C8102E", textDecoration: "none", fontSize: "0.9375rem" }}>Find fast skaters in the directory →</Link><Link href="/directory/brands?category=skates" style={{ display: "block", padding: "0.75rem 1rem", background: "var(--s2)", border: "1px solid var(--border)", borderRadius: "4px", color: "#C8102E", textDecoration: "none", fontSize: "0.9375rem" }}>Browse skate brands →</Link>
        </div>
      </section>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>RELATED GUIDES</h2>
        <ul style={{ color: '#aaa', lineHeight: 1.7, fontSize: '0.9375rem', paddingLeft: '1.25rem' }}>
          <li style={{ marginBottom: '0.4rem' }}><Link href="/guides/skate-fitting-guide" style={{ color: '#C8102E' }}>Skate Fitting Guide</Link></li>
          <li style={{ marginBottom: '0.4rem' }}><Link href="/guides/off-ice-hockey-training" style={{ color: '#C8102E' }}>Off-Ice Training Guide</Link></li>
          <li style={{ marginBottom: '0.4rem' }}><Link href="/guides/hockey-positions" style={{ color: '#C8102E' }}>Hockey Positions Explained</Link></li>
          <li style={{ marginBottom: '0.4rem' }}><Link href="/guides/hockey-rules" style={{ color: '#C8102E' }}>Hockey Rules for Beginners</Link></li>
        </ul>
      </section>
    </div>
  );
}
