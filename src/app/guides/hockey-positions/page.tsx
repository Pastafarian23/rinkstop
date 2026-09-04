import type { Metadata } from 'next';
import Link from 'next/link';
import { withDefaultOg } from '@/lib/metadata-defaults';

export const metadata: Metadata = {
  title: 'Understanding Hockey Positions',
  description: 'Centers, wings, defense, and goalies  --  what each hockey position does and how they work together. A complete guide for players, parents, and fans.',
  openGraph: withDefaultOg({
    title: 'Understanding Hockey Positions',
    description: 'Centers, wings, defense, and goalies  --  what each position does and how they work together.',
    type: 'article',
  }),
  alternates: { canonical: 'https://rinkstop.com/guides/hockey-positions' },
};

export default function HockeyPositions() {
  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '0.75rem 1rem 4rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1rem' }}>
        <Link href="/">Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/guides" style={{ color: '#555' }}>Guides</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>Understanding Hockey Positions</span>
      </nav>

      <span style={{ display: 'inline-block', fontSize: '0.5625rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '0.2rem 0.6rem', borderRadius: '4px', background: 'rgba(200,16,46,0.12)', color: '#C8102E', marginBottom: '0.75rem' }}>
        Beginners
      </span>
      <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(2rem, 5vw, 2.75rem)', color: '#fff', letterSpacing: '0.04em', lineHeight: 1, margin: '0 0 0.75rem' }}>
        UNDERSTANDING HOCKEY POSITIONS
      </h1>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9375rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
        Centers, wings, defense, and goalies  --  what each position does and how they work together on a shift.
      </p>

      <div style={{ background: 'var(--s2)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '1.5rem 1.75rem', marginBottom: '1.5rem' }}>
        <p style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', marginBottom: '0.75rem' }}>Positions at a glance</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.625rem' }}>
          {[
            { pos: 'Center (C)', role: 'Faceoffs, two-way play', icon: '🎯' },
            { pos: 'Left Wing (LW)', role: 'Forecheck, left side', icon: '⬅️' },
            { pos: 'Right Wing (RW)', role: 'Forecheck, right side', icon: '➡️' },
            { pos: 'Defenseman (D)', role: 'Defend net, breakouts', icon: '🛡️' },
            { pos: 'Goalie (G)', role: 'Stop pucks, direct D', icon: '🏒' },
          ].map(p => (
            <div key={p.pos} style={{ padding: '0.875rem', background: 'rgba(255,255,255,0.04)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p style={{ fontSize: '1rem', marginBottom: '0.25rem' }}>{p.icon}</p>
              <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#fff', marginBottom: '0.2rem' }}>{p.pos}</p>
              <p style={{ fontSize: '0.75rem', color: '#777' }}>{p.role}</p>
            </div>
          ))}
        </div>
      </div>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: 'Understanding Hockey Positions',
        description: 'Centers, wings, defense, and goalies  --  what each hockey position does and how they work together.',
        author: { '@type': 'Organization', name: 'RinkStop' },
        publisher: { '@type': 'Organization', name: 'RinkStop', url: 'https://rinkstop.com' },
        datePublished: '2026-05-16',
      }) }} />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
          { '@type': 'Question', name: 'What does a center do in hockey?', acceptedAnswer: { '@type': 'Answer', text: 'A center takes faceoffs in all three zones, plays both offense and defense, leads the forecheck, and is typically the leader of the forward lines. Centers are expected to backcheck through the neutral zone, win key defensive zone draws, and contribute at both ends of the ice.' } },
          { '@type': 'Question', name: 'What is the difference between left wing and right wing in hockey?', acceptedAnswer: { '@type': 'Answer', text: 'Left wings play on the left side of the ice, typically handling the left boards and covering the left lane defensively. Right wings play on the right side. Both are expected to forecheck hard and retrieve pucks along their respective walls. The main difference is which side of the ice they cover  --  the specific responsibilities are similar.' } },
          { '@type': 'Question', name: 'What does a defenseman do in hockey?', acceptedAnswer: { '@type': 'Answer', text: 'Defensemen play in pairs  --  left defenseman (LD) and right defenseman (RD). Their primary job is to defend the net, block shots, break up plays, and clear the puck out of the defensive zone. Offensively, they join the rush, quarterback the power play from the blue line, and take slap shots.' } },
          { '@type': 'Question', name: 'How many players are on a hockey team on the ice?', acceptedAnswer: { '@type': 'Answer', text: 'Six players are on the ice for each team at a time: one goalie, two defensemen, and three forwards (center, left wing, and right wing). Each team dresses 18 skaters + 2 goalies for a game (20 total dressed players). On a shift, typically all three forward lines rotate and both defensive pairs rotate.' } },
        ],
      }) }} />

      {/* Forwards */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>THE FORWARDS  --  3 PLAYERS</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1.25rem', fontSize: '0.9375rem' }}>
          Three forwards play as a line  --  center flanked by left wing and right wing. Each line typically plays 30-60 seconds per shift before changing. The best lines have chemistry between all three players.
        </p>

        <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '1.25rem 1.5rem', marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', marginBottom: '0.75rem' }}>Center (C)  --  The Quarterback</h3>
          <p style={{ fontSize: '0.875rem', color: '#999', lineHeight: 1.7, marginBottom: '0.75rem' }}>
            The center is the most demanding forward position. They take faceoffs in all three zones  --  offensive, defensive, and neutral  --  and are expected to backcheck through the neutral zone when the other team has the puck. Centers are typically the leader of the line and often the best two-way player.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {['Faceoffs', 'Two-way play', 'Backcheck', 'Shutdown defense', 'Offensive playmaking'].map(s => (
              <span key={s} style={{ padding: '0.25rem 0.75rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '999px', fontSize: '0.75rem', color: '#777' }}>{s}</span>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
          <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '1.25rem 1.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', marginBottom: '0.75rem' }}>Left Wing (LW)  --  The Left Side</h3>
            <p style={{ fontSize: '0.875rem', color: '#999', lineHeight: 1.7, marginBottom: '0.75rem' }}>
              Plays on the left side of the ice. Typically responsible for covering the left lane defensively and forechecking along the left boards. Many elite left wing scorers play a perimeter game from the left circle.
            </p>
            <p style={{ fontSize: '0.8125rem', color: '#777' }}><strong style={{ color: '#888' }}>Key skills:</strong> Board play, left-side shooting, forecheck</p>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '1.25rem 1.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', marginBottom: '0.75rem' }}>Right Wing (RW)  --  The Right Side</h3>
            <p style={{ fontSize: '0.875rem', color: '#999', lineHeight: 1.7, marginBottom: '0.75rem' }}>
              Plays on the right side of the ice. Tasked with forechecking and retrieving pucks along the right boards. In systems with a strong-side bias, right wing often rotates to cover the strong side as the third forward back.
            </p>
            <p style={{ fontSize: '0.8125rem', color: '#777' }}><strong style={{ color: '#888' }}>Key skills:</strong> Right-side retrieval, net-front, forecheck</p>
          </div>
        </div>
      </section>

      {/* Defensemen */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>THE DEFENSEMEN  --  2 PLAYERS</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1.25rem', fontSize: '0.9375rem' }}>
          Two defensemen play as a pair  --  one left defenseman (LD) and one right defenseman (RD). They don't sub out on the fly during a shift the way forwards do; pairs stay together for the entire 30-60 second sequence.
        </p>

        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {[
            { title: 'Left Defenseman (LD)', desc: 'Plays on the left side, usually a player who leans more toward puck-moving and joining the rush. Covers the left side of the net in the defensive zone.', skills: ['Puck movement', 'Gap control', 'Point shot', 'Rush join'] },
            { title: 'Right Defenseman (RD)', desc: 'Plays on the right side, often the bigger, more physical defenseman who blocks shots and plays a more conservative game. Controls the right-side breakout.', skills: ['Shot blocking', 'Board clearing', 'Right-side breakout', 'Physical play'] },
          ].map(d => (
            <div key={d.title} style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '1.25rem 1.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>{d.title}</h3>
              <p style={{ fontSize: '0.875rem', color: '#999', lineHeight: 1.7, marginBottom: '0.75rem' }}>{d.desc}</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {d.skills.map(s => <span key={s} style={{ padding: '0.2rem 0.625rem', background: 'rgba(0,130,200,0.08)', border: '1px solid rgba(0,130,200,0.2)', borderRadius: '999px', fontSize: '0.75rem', color: '#0082C8' }}>{s}</span>)}
              </div>
            </div>
          ))}
        </div>

        <div style={{ background: 'rgba(0,130,200,0.05)', border: '1px solid rgba(0,130,200,0.15)', borderRadius: '10px', padding: '1.25rem 1.5rem', marginTop: '1rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', marginBottom: '0.75rem' }}>Defensive Pair Dynamics</h3>
          <p style={{ fontSize: '0.875rem', color: '#999', lineHeight: 1.7, marginBottom: '0.5rem' }}>
            The best defensive pairs have complementary styles  --  one more offense-minded who joins the rush, one more conservative who stays back. This is called a "cover-one" system.
          </p>
          <p style={{ fontSize: '0.875rem', color: '#999', lineHeight: 1.7 }}>
            Some teams play a "contain" system where both defensemen are more conservative. Others use a "rotate" system where both jump into the play. The pair dynamic is one of the most important  --  and underrated  --  elements of a team's structure.
          </p>
        </div>
      </section>

      {/* Goalie */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>THE GOALIE  --  THE LAST LINE</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1.25rem', fontSize: '0.9375rem' }}>
          The goalie is the only player with a catching glove and blocker, and the only one restricted to a specific area (the crease). Goalies are the most specialized position in all of sports  --  a good goalie can steal a game; a bad goalie can lose one no matter how well the team plays.
        </p>

        <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '1.25rem 1.5rem', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', marginBottom: '0.75rem' }}>Goalie Responsibilities</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem' }}>
            {[
              { title: 'Save the puck', desc: 'Stop all shots that enter the crease area. The primary job.' },
              { title: 'Control rebounds', desc: 'Direct rebounds toward the corners or walls  --  not into the slot.' },
              { title: 'Communicate', desc: 'Call out shots, players behind the net, and passing lanes to the defense.' },
              { title: 'Handle the puck', desc: 'Play the puck behind the net during defensive zone exits. Increasingly important in modern hockey.' },
              { title: 'Direct the PK', desc: 'From inside the crease, call out penalty kill coverage adjustments.' },
              { title: 'Contain', desc: 'Stay big in the net, seal the five-hole, challenge shooters.' },
            ].map(g => (
              <div key={g.title} style={{ padding: '0.875rem', background: 'rgba(255,255,255,0.04)', borderRadius: '6px' }}>
                <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#fff', marginBottom: '0.25rem' }}>{g.title}</p>
                <p style={{ fontSize: '0.75rem', color: '#777', lineHeight: 1.5 }}>{g.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Line Combinations */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>HOW SHIFTS WORK</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>
          A shift is 30-60 seconds of play. Forwards sub out "on the fly" at their bench. Defensemen stay together as a pair for the full shift. Goalies play the entire game (with relief from the backup in blowouts or back-to-backs).
        </p>

        <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '1.25rem 1.5rem' }}>
          <div style={{ display: 'grid', gap: '0.875rem' }}>
            {[
              { label: 'Forward lines', desc: 'Three lines of forwards rotate. Each line has a center, left wing, and right wing. Lines 1 and 2 are typically the scoring lines; line 3 is checking/grinding; line 4 is energy/special teams.' },
              { label: 'Defensive pairs', desc: 'Two pairs of defensemen (4 total) rotate. Pair 1 plays the most minutes against opponent top lines. Pairs are matched to opponent lines and situations.' },
              { label: 'Special teams', desc: 'Power play units (5 players including at least one D) and penalty kill units (4 players including at least one D) sub in when penalties are called.' },
            ].map(l => (
              <div key={l.label} style={{ padding: '0.875rem', background: 'rgba(255,255,255,0.04)', borderRadius: '8px' }}>
                <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#fff', marginBottom: '0.375rem' }}>{l.label}</p>
                <p style={{ fontSize: '0.8125rem', color: '#888', lineHeight: 1.6 }}>{l.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <div style={{ background: 'var(--s2)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '1.5rem', textAlign: 'center', marginTop: '2rem' }}>
        <p style={{ color: '#666', fontSize: '0.875rem', marginBottom: '0.75rem' }}>Explore the player directory</p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/directory/players" style={{ padding: '0.625rem 1.25rem', background: '#C8102E', borderRadius: '6px', color: '#fff', fontWeight: 600, fontSize: '0.875rem', textDecoration: 'none' }}>Browse All Players</Link>
          <Link href="/glossary" style={{ padding: '0.625rem 1.25rem', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: '#fff', fontWeight: 600, fontSize: '0.875rem', textDecoration: 'none' }}>Hockey Glossary</Link>
        </div>
      </div>
    </div>
  );
}