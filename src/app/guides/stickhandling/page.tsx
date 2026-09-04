import type { Metadata } from 'next';
import Link from 'next/link';
import { withDefaultOg } from '@/lib/metadata-defaults';

export const metadata: Metadata = {
  title: 'Hockey Stickhandling Guide - Puck Control, Deking, and the Skills That Beat Defenders',
  description: 'Everything you need to know about hockey stickhandling: the grip, the basic moves, how to develop soft hands, off-ice training, and the drills that build puck control.',
  openGraph: withDefaultOg({
    title: 'Hockey Stickhandling Guide',
    description: 'Hockey stickhandling: grip, basic moves, dekes, off-ice training, and the drills that build them.',
    type: 'article',
  }),
  alternates: { canonical: 'https://rinkstop.com/guides/stickhandling' },
};

export default function StickhandlingGuide() {
  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '0.75rem 1rem 4rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1rem' }}>
        <Link href="/">Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/guides" style={{ color: '#555' }}>Guides</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>Stickhandling</span>
      </nav>
      <span style={{ display: 'inline-block', fontSize: '0.5625rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '0.2rem 0.6rem', borderRadius: '4px', background: 'rgba(200,16,46,0.12)', color: '#C8102E', marginBottom: '0.75rem' }}>Guide</span>
      <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(2rem, 5vw, 2.75rem)', color: '#fff', letterSpacing: '0.04em', lineHeight: 1, margin: '0 0 0.75rem' }}>HOCKEY STICKHANDLING GUIDE</h1>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9375rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>Puck control, deking, and the soft hands that let skilled players beat defenders one-on-one.</p>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'Article', headline: 'Hockey Stickhandling Guide', description: 'Hockey stickhandling: grip, basic moves, dekes, off-ice training, and the drills that build them.', author: { '@type': 'Organization', name: 'RinkStop' }, publisher: { '@type': 'Organization', name: 'RinkStop', url: 'https://rinkstop.com' }, datePublished: '2026-08-11' }) }} />

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>THE STICKHANDLING GRIP</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>A proper grip is the foundation of all stickhandling. Most youth players grip the stick too tightly, which limits feel and touch. The correct grip allows the puck to roll across the blade with minimal effort.</p>
        <ul style={{ color: '#aaa', lineHeight: 1.7, fontSize: '0.9375rem', paddingLeft: '1.25rem', marginBottom: '1.5rem' }}>
          <li style={{ marginBottom: '0.5rem' }}><strong style={{ color: '#fff' }}>Top hand:</strong> placed about 6-12 inches down the shaft from the top of the stick. Loose grip so you can slide the hand up and down with the stick held vertically.</li>
          <li style={{ marginBottom: '0.5rem' }}><strong style={{ color: '#fff' }}>Bottom hand:</strong> placed at the top of the shaft where it meets the tape. The grip here is also loose; the bottom hand provides power, not control.</li>
          <li style={{ marginBottom: '0.5rem' }}><strong style={{ color: '#fff' }}>Knuckles:</strong> aligned so the top hand knuckles roughly face the ceiling when the stick is in front of the body. This gives the most wrist flexibility.</li>
          <li style={{ marginBottom: '0.5rem' }}><strong style={{ color: '#fff' }}>Distance from body:</strong> about a forearm length, so the blade sits just inside the foot when the puck is centered.</li>
        </ul>
      </section>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>BASIC MOVES</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>Every hockey move is a combination of these basic stickhandling techniques. Master them in order:</p>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {[
            { name: 'Puck protection', desc: 'Using the body to shield the puck from a defender while keeping control on the stick. The most-used move in hockey. Used on the boards, in the corners, and in open ice.' },
            { name: 'Forehand-backhand', desc: 'The basic side-to-side move. The puck rolls across the blade from forehand to backhand side and back. The foundation of all other moves.' },
            { name: 'Toe drag', desc: 'Pulling the puck back toward the body with the toe of the blade. Used to escape defenders and create space. Especially effective at high speed.' },
            { name: 'Between the legs', desc: 'A show move used to evade defenders while maintaining speed. Common in shootouts and one-on-one situations. Less effective in traffic.' },
            { name: 'Lob and catch', desc: 'Lifting the puck slightly and catching it. Used to evade sticks and feet. Most effective when the defender is close.' },
            { name: 'Zigzag', desc: 'A continuous forehand-backhand while moving forward. The most-used practice drill. Builds the muscle memory that underlies all other moves.' },
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
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>SOFT HANDS</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>The phrase soft hands refers to the ability to handle the puck with minimal visible effort. Players with soft hands make difficult moves look effortless. The skill is built through thousands of small-hand repetitions:</p>
        <ul style={{ color: '#aaa', lineHeight: 1.7, fontSize: '0.9375rem', paddingLeft: '1.25rem' }}>
          <li style={{ marginBottom: '0.5rem' }}><strong style={{ color: '#fff' }}>Light grip pressure:</strong> the stick should feel almost like an extension of the hand, not a tool you are holding. Pressure of 2-3 pounds is enough; gripping harder reduces feel.</li>
          <li style={{ marginBottom: '0.5rem' }}><strong style={{ color: '#fff' }}>Top-hand control:</strong> the top hand does most of the work in puck control. The bottom hand provides stability but not active movement.</li>
          <li style={{ marginBottom: '0.5rem' }}><strong style={{ color: '#fff' }}>Wrist flexibility:</strong> the wrists do the work, not the arms. Full-arm swings are slow; wrist movements are fast and precise.</li>
          <li style={{ marginBottom: '0.5rem' }}><strong style={{ color: '#fff' }}>Eyes up:</strong> skilled players handle the puck while looking at the play, not the puck. The puck awareness comes from thousands of repetitions; the eyes are free to scan the ice.</li>
        </ul>
      </section>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>STICKHANDLING DRILLS</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>A consistent stickhandling practice routine is the single most impactful off-ice activity for puck skills. The most effective drills:</p>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {[
            { name: 'Forehand-backhand (static)', desc: 'Standing in place, roll the puck forehand to backhand across the blade. 100 reps per session. Builds the foundational feel.' },
            { name: 'Tight zigzags', desc: 'In a small space (about 5x5 feet), continuous zigzag stickhandling in and out. Build up to 60 seconds without losing the puck.' },
            { name: 'Obstacle course', desc: 'Set up small obstacles (pucks, bottles, socks) and stickhandle around them. Forces hand-eye coordination and quick blade adjustments.' },
            { name: 'Toe drag reps', desc: 'From a static position, practice the toe drag 50+ times. Builds the muscle memory for the most-used scoring move.' },
            { name: 'Weak-hand only', desc: 'Spend significant time with the off-hand only. Most players develop one hand dominant; balanced skill requires dedicated weak-hand work.' },
            { name: 'Sticks handling with a ball', desc: 'A golf ball or tennis ball adds resistance and unpredictability. Builds the soft hands needed for unpredictable puck behavior.' },
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
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>OFF-ICE EQUIPMENT</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>Effective off-ice stickhandle training requires the right equipment. The easiest entry point is a stickhandling mat, which simulates the puck on a flat surface:</p>
        <ul style={{ color: '#aaa', lineHeight: 1.7, fontSize: '0.9375rem', paddingLeft: '1.25rem' }}>
          <li style={{ marginBottom: '0.5rem' }}><strong style={{ color: '#fff' }}>Stickhandling mats:</strong> plastic or fabric mats that simulate puck behavior. Available in 4-6 foot lengths. The standard tool for home practice. A typical session is 15-30 minutes per day.</li>
          <li style={{ marginBottom: '0.5rem' }}><strong style={{ color: '#fff' }}>Green Biscuit:</strong> a weighted puck that slides on most surfaces (not carpet). The added resistance builds strength; the irregular bounce builds soft hands.</li>
          <li style={{ marginBottom: '0.5rem' }}><strong style={{ color: '#fff' }}>Synthetic ice tiles:</strong> small interlocking tiles that allow real puck handling at home. Higher cost but closest to ice feel.</li>
          <li style={{ marginBottom: '0.5rem' }}><strong style={{ color: '#fff' }}>Deker:</strong> a small plastic device that keeps the puck attached to the blade. Allows hundreds of repetitions without retrieving errant pucks.</li>
        </ul>
      </section>

      <section style={{ marginBottom: "2.5rem" }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>EXPLORE THE DIRECTORY</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>Take what you've learned into the RinkStop directory.</p>
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          <Link href="/directory/players?skill=stickhandling" style={{ display: "block", padding: "0.75rem 1rem", background: "var(--s2)", border: "1px solid var(--border)", borderRadius: "4px", color: "#C8102E", textDecoration: "none", fontSize: "0.9375rem" }}>Find players with elite stickhandling skills →</Link><Link href="/directory/brands?category=sticks" style={{ display: "block", padding: "0.75rem 1rem", background: "var(--s2)", border: "1px solid var(--border)", borderRadius: "4px", color: "#C8102E", textDecoration: "none", fontSize: "0.9375rem" }}>Browse hockey sticks used by the pros →</Link>
        </div>
      </section>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>RELATED GUIDES</h2>
        <ul style={{ color: '#aaa', lineHeight: 1.7, fontSize: '0.9375rem', paddingLeft: '1.25rem' }}>
          <li style={{ marginBottom: '0.4rem' }}><Link href="/guides/hockey-stick-guide" style={{ color: '#C8102E' }}>Hockey Stick Guide</Link></li>
          <li style={{ marginBottom: '0.4rem' }}><Link href="/guides/skating" style={{ color: '#C8102E' }}>Hockey Skating Guide</Link></li>
          <li style={{ marginBottom: '0.4rem' }}><Link href="/guides/shooting" style={{ color: '#C8102E' }}>Hockey Shooting Guide</Link></li>
          <li style={{ marginBottom: '0.4rem' }}><Link href="/guides/hockey-positions" style={{ color: '#C8102E' }}>Hockey Positions Explained</Link></li>
        </ul>
      </section>
    </div>
  );
}
