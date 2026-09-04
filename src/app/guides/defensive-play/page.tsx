import type { Metadata } from 'next';
import Link from 'next/link';
import { withDefaultOg } from '@/lib/metadata-defaults';

export const metadata: Metadata = {
  title: 'Hockey Defensive Play Guide - Positioning, Gap Control, and How to Win the Defensive Zone',
  description: 'Everything you need to know about hockey defensive play: defensive positioning, gap control, stick checking, defending the rush, breaking out, and the drills that build defensive skills.',
  openGraph: withDefaultOg({
    title: 'Hockey Defensive Play Guide',
    description: 'Hockey defensive play: positioning, gap control, stick checking, and breaking out.',
    type: 'article',
  }),
  alternates: { canonical: 'https://rinkstop.com/guides/defensive-play' },
};

export default function DefensivePlayGuide() {
  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '0.75rem 1rem 4rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1rem' }}>
        <Link href="/">Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/guides" style={{ color: '#555' }}>Guides</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>Defensive Play</span>
      </nav>
      <span style={{ display: 'inline-block', fontSize: '0.5625rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '0.2rem 0.6rem', borderRadius: '4px', background: 'rgba(200,16,46,0.12)', color: '#C8102E', marginBottom: '0.75rem' }}>Guide</span>
      <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(2rem, 5vw, 2.75rem)', color: '#fff', letterSpacing: '0.04em', lineHeight: 1, margin: '0 0 0.75rem' }}>HOCKEY DEFENSIVE PLAY GUIDE</h1>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9375rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>Positioning, gap control, and the skills that make a team hard to play against.</p>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'Article', headline: 'Hockey Defensive Play Guide', description: 'Hockey defensive play: positioning, gap control, stick checking, and breaking out.', author: { '@type': 'Organization', name: 'RinkStop' }, publisher: { '@type': 'Organization', name: 'RinkStop', url: 'https://rinkstop.com' }, datePublished: '2026-08-11' }) }} />

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>DEFENSIVE POSITIONING</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>Good defense starts with positioning. A defenseman in the right spot can break up a play without ever touching the puck. The fundamentals:</p>
        <ul style={{ color: '#aaa', lineHeight: 1.7, fontSize: '0.9375rem', paddingLeft: '1.25rem' }}>
          <li style={{ marginBottom: '0.5rem' }}><strong style={{ color: '#fff' }}>Gap control:</strong> the distance between you and the puck carrier. A proper gap closes down the rush and forces dump-ins or off-target shots.</li>
          <li style={{ marginBottom: '0.5rem' }}><strong style={{ color: '#fff' }}>Angle:</strong> the line from the puck to the net you take. Good angle forces the puck carrier to a specific part of the ice. Bad angle gives them the entire zone.</li>
          <li style={{ marginBottom: '0.5rem' }}><strong style={{ color: '#fff' }}>Stick position:</strong> stick on the ice, blade angled to take away the pass or shot. The stick is the primary defensive tool, not the body.</li>
          <li style={{ marginBottom: '0.5rem' }}><strong style={{ color: '#fff' }}>Skating backwards first:</strong> always start by skating backwards. Going forward commits you to a hit; going backward gives you options.</li>
        </ul>
      </section>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>THE DEFENSIVE ZONE</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>Playing defense in your own zone is structured around layers of coverage. The standard structure:</p>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {[
            { name: 'F1 (first forward low)', desc: 'Puck battles along the boards and in the corners. The most physically demanding defensive role.' },
            { name: 'F2 (first forward high)', desc: 'Slot area coverage. Reads the play and supports the puck battle or covers the lane.' },
            { name: 'F3 (first forward weak side)', desc: 'High weak-side support. Covers the point and is the outlet for a breakout pass.' },
            { name: 'D1 (first defenseman)', desc: 'Strong-side defenseman. Battles low and quarterbacks the breakout.' },
            { name: 'D2 (second defenseman)', desc: 'Weak-side defenseman. Covers the back door and high slot. Reads the play.' },
            { name: 'Goalie', desc: 'The last line. Trusts the layers in front; communicates the threat; covers the back door.' },
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
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>STICK CHECKING</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>The stick check is the foundation of defensive play. Done correctly, it disrupts the puck without taking a penalty. Done poorly, it sends you to the box. The key stick checks:</p>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {[
            { name: 'Stick poke', desc: 'A quick jab at the puck with the blade. Used to disrupt a passer or break up a play from distance.' },
            { name: 'Stick lift', desc: 'Lifting the opponent stick with yours to prevent a shot or pass. Especially effective against shooters.' },
            { name: 'Sweep check', desc: 'A sweeping motion across the ice to knock the puck loose. Used along the boards or in puck battles.' },
            { name: 'Hook and hold', desc: 'A controlled hook of the opponent stick to slow them down. Used at the right moment in a 1-on-1.' },
            { name: 'Channeling', desc: 'Using your stick to force the puck carrier into a specific area. The most-used check by far.' },
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
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>BREAKOUTS</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>After winning the puck in the defensive zone, the team needs to exit the zone cleanly. The standard breakout patterns:</p>
        <ul style={{ color: '#aaa', lineHeight: 1.7, fontSize: '0.9375rem', paddingLeft: '1.25rem' }}>
          <li style={{ marginBottom: '0.5rem' }}><strong style={{ color: '#fff' }}>D-to-D (defenseman to defenseman):</strong> the strongest defenseman gets the puck, swings it across the ice to the weak-side D, who moves it up. Used when the strong side is pressured.</li>
          <li style={{ marginBottom: '0.5rem' }}><strong style={{ color: '#fff' }}>D-to-F (defenseman to forward):</strong> the defenseman passes up the boards or through the middle to a forward. Used when the forward is open and the lane is clear.</li>
          <li style={{ marginBottom: '0.5rem' }}><strong style={{ color: '#fff' }}>Reverse:</strong> the puck goes back to the goalie, then up the opposite side. Used when the original breakout lane is closed.</li>
          <li style={{ marginBottom: '0.5rem' }}><strong style={{ color: '#fff' }}>Rim:</strong> the puck is rimmed around the boards. Used as a reset when no short option exists.</li>
          <li style={{ marginBottom: '0.5rem' }}><strong style={{ color: '#fff' }}>Skate:</strong> the defenseman skates the puck out himself. Used when no pass lane is available and the player has the speed.</li>
        </ul>
      </section>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>DEFENSIVE DRILLS</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>The most effective defensive drills for practice:</p>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {[
            { name: 'Gap control drill', desc: 'Forwards skate the puck down the boards; defensemen work on proper gap and angle. 10 reps each side. The foundation drill for defensemen.' },
            { name: '1-on-1 in the corner', desc: 'Offensive player starts with the puck in the corner; defensive player tries to keep them to the outside. Forces stick detail and body position.' },
            { name: '2-on-2 in the zone', desc: 'Forwards try to score; defensemen try to break up the play. Teaches gap, communication, and recovery.' },
            { name: 'Breakout sequence', desc: 'Coach dumps the puck in; D retrieves, executes the breakout, and the forwards transition to offense. Full-zone drill.' },
            { name: 'Offside challenge', desc: 'Forwards time their entries against the defensemen. Forces D to read the play and play the line.' },
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
          <Link href="/directory/players?position=defenseman" style={{ display: "block", padding: "0.75rem 1rem", background: "var(--s2)", border: "1px solid var(--border)", borderRadius: "4px", color: "#C8102E", textDecoration: "none", fontSize: "0.9375rem" }}>Find top defensemen in the directory →</Link><Link href="/directory/teams" style={{ display: "block", padding: "0.75rem 1rem", background: "var(--s2)", border: "1px solid var(--border)", borderRadius: "4px", color: "#C8102E", textDecoration: "none", fontSize: "0.9375rem" }}>Browse hockey teams by league →</Link>
        </div>
      </section>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>RELATED GUIDES</h2>
        <ul style={{ color: '#aaa', lineHeight: 1.7, fontSize: '0.9375rem', paddingLeft: '1.25rem' }}>
          <li style={{ marginBottom: '0.4rem' }}><Link href="/guides/hockey-positions" style={{ color: '#C8102E' }}>Hockey Positions Explained</Link></li>
          <li style={{ marginBottom: '0.4rem' }}><Link href="/guides/skating" style={{ color: '#C8102E' }}>Hockey Skating Guide</Link></li>
          <li style={{ marginBottom: '0.4rem' }}><Link href="/guides/stickhandling" style={{ color: '#C8102E' }}>Hockey Stickhandling Guide</Link></li>
          <li style={{ marginBottom: '0.4rem' }}><Link href="/guides/hockey-rules" style={{ color: '#C8102E' }}>Hockey Rules for Beginners</Link></li>
        </ul>
      </section>
    </div>
  );
}
