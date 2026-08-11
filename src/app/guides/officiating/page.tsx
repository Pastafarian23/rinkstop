import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Hockey Officiating Guide - Referees, Linesmen, Signals, and How Penalties Are Called',
  description: 'Everything you need to know about hockey officiating: the role of referees and linesmen, standard signals, how penalties are assessed, the most commonly called infractions, and how to become an official.',
  openGraph: {
    title: 'Hockey Officiating Guide',
    description: 'Hockey officiating: referees, linesmen, signals, penalties, and how to become an official.',
    type: 'article',
  },
  alternates: { canonical: 'https://rinkstop.com/guides/officiating' },
};

export default function OfficiatingGuide() {
  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '0.75rem 1rem 4rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1rem' }}>
        <Link href="/">Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/guides" style={{ color: '#555' }}>Guides</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>Officiating</span>
      </nav>
      <span style={{ display: 'inline-block', fontSize: '0.5625rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '0.2rem 0.6rem', borderRadius: '4px', background: 'rgba(200,16,46,0.12)', color: '#C8102E', marginBottom: '0.75rem' }}>Guide</span>
      <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(2rem, 5vw, 2.75rem)', color: '#fff', letterSpacing: '0.04em', lineHeight: 1, margin: '0 0 0.75rem' }}>HOCKEY OFFICIATING GUIDE</h1>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9375rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>Referees, linesmen, signals, penalties, and how the game stays fair.</p>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'Article', headline: 'Hockey Officiating Guide', description: 'Hockey officiating: referees, linesmen, signals, penalties, and how to become an official.', author: { '@type': 'Organization', name: 'RinkStop' }, publisher: { '@type': 'Organization', name: 'RinkStop', url: 'https://rinkstop.com' }, datePublished: '2026-08-11' }) }} />

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>THE OFFICIATING CREW</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>An NHL game uses four officials: two referees and two linesmen. Lower levels may use fewer:</p>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {[
            { name: 'Referee (2 in NHL)', desc: 'The primary rule enforcer. Calls penalties, awards goals, handles video review, and manages game flow. Wears the orange armband.' },
            { name: 'Linesman (2 in NHL)', desc: 'Calls offside and icing, drops the puck for faceoffs, and breaks up minor scuffles. Does not call penalties in the NHL (other leagues vary).' },
            { name: 'Off-ice officials', desc: 'Goal judges, video reviewers, timekeepers, and penalty box attendants. Critical to the game but rarely visible.' },
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
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>STANDARD SIGNALS</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>Officials use a standard set of hand signals to communicate calls. The most common:</p>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {[
            { name: 'Arms crossed above head', desc: 'Goal scored. Used after the puck crosses the line and any video review confirms.' },
            { name: 'Arm straight out to the side', desc: 'Offside. The linesman points to the offending zone with the free arm.' },
            { name: 'Arm raised with closed fist, then extended forward', desc: 'Icing. The linesman raises the non-whistle arm to signal the impending icing, then extends it after the puck crosses the goal line.' },
            { name: 'Hand sweeping across the chest', desc: 'Washing out a goal or canceling a play. Used when an infraction nullifies a goal.' },
            { name: 'Arms out to sides, palms down, pushing down', desc: 'Delayed penalty. The penalized team retains possession until they touch the puck.' },
            { name: 'Hand chopping across forearm', desc: 'Power-play goal. The referee signals that a team has scored while on a power play.' },
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
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>THE MOST COMMON PENALTIES</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>The standard penalty minutes (minor = 2 min, major = 5 min, misconduct = 10 min, match = ejection) are applied for these common infractions:</p>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {[
            { name: 'Tripping', desc: 'Using the stick, skate, or body to knock an opponent off balance. Always a minor penalty. Includes slew-footing.' },
            { name: 'Hooking', desc: 'Using the stick to impede the progress of an opponent. Always a minor. Includes stick-on-hands and stick-on-body.' },
            { name: 'Slashing', desc: 'Swinging the stick at an opponent. Minor for a slash that does not draw blood; major if it draws blood.' },
            { name: 'High-sticking', desc: 'Contacting an opponent above the shoulders with the stick. Minor or major depending on intent and injury.' },
            { name: 'Cross-checking', desc: 'Using the shaft of the stick with both hands to check an opponent. Minor or major depending on force.' },
            { name: 'Interference', desc: 'Impeding the progress of an opponent who does not have the puck. Minor penalty. Includes goalie interference.' },
            { name: 'Holding', desc: 'Grabbing an opponent with the hands, stick, or body. Always a minor penalty.' },
            { name: 'Roughing', desc: 'Physical contact away from the puck. Minor penalty. Often called for after-the-whistle shoving.' },
            { name: 'Boarding', desc: 'Checking an opponent violently into the boards. Minor or major. Major when injury results.' },
            { name: 'Charging', desc: 'Taking more than three strides before delivering a check. Minor or major.' },
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
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>THE POWER PLAY AND PENALTY KILL</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>When one team has more players on the ice due to a penalty, the situation has specific names:</p>
        <ul style={{ color: '#aaa', lineHeight: 1.7, fontSize: '0.9375rem', paddingLeft: '1.25rem' }}>
          <li style={{ marginBottom: '0.5rem' }}><strong style={{ color: '#fff' }}>Power play:</strong> the team with the man advantage. Standard 5-on-4 with one skater in the box; 5-on-3 if two penalties are taken.</li>
          <li style={{ marginBottom: '0.5rem' }}><strong style={{ color: '#fff' }}>Penalty kill:</strong> the team short-handed. Defending against the power play with one fewer skater.</li>
          <li style={{ marginBottom: '0.5rem' }}><strong style={{ color: '#fff' }}>Delayed penalty:</strong> the offending team has not yet touched the puck; the referee signals with arms out. The non-penalized team retains possession.</li>
          <li style={{ marginBottom: '0.5rem' }}><strong style={{ color: '#fff' }}>Coincidental penalties:</strong> matching minors on both teams; neither team goes on the power play. Sides play 4-on-4.</li>
        </ul>
      </section>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>HOW TO BECOME AN OFFICIAL</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>Hockey needs officials at every level. The path:</p>
        <ol style={{ color: '#aaa', lineHeight: 1.7, fontSize: '0.9375rem', paddingLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li style={{ marginBottom: '0.5rem' }}>Complete the officiating certification course offered by your country or region (USA Hockey, Hockey Canada, IIHF, etc.)</li>
          <li style={{ marginBottom: '0.5rem' }}>Start with youth or recreational games, where the pace is slower and the consequences of mistakes are smaller</li>
          <li style={{ marginBottom: '0.5rem' }}>Build skills: positioning, angle of view, skating, and game management</li>
          <li style={{ marginBottom: '0.5rem' }}>Move up to higher levels: travel hockey, junior hockey, college hockey, minor league professional, and ultimately the NHL</li>
          <li style={{ marginBottom: '0.5rem' }}>Continue training and evaluation; even NHL officials attend annual development camps</li>
        </ol>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>Officiating is a great way to stay involved in hockey after playing days end. It pays (modestly at the youth level, very well at the NHL level) and the demand is high.</p>
      </section>

      <section style={{ marginBottom: "2.5rem" }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>EXPLORE THE DIRECTORY</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>Take what you've learned into the RinkStop directory.</p>
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          <Link href="/directory/leagues" style={{ display: "block", padding: "0.75rem 1rem", background: "var(--s2)", border: "1px solid var(--border)", borderRadius: "4px", color: "#C8102E", textDecoration: "none", fontSize: "0.9375rem" }}>Browse hockey leagues worldwide →</Link><Link href="/directory/players?position=referee" style={{ display: "block", padding: "0.75rem 1rem", background: "var(--s2)", border: "1px solid var(--border)", borderRadius: "4px", color: "#C8102E", textDecoration: "none", fontSize: "0.9375rem" }}>Find referees and officials →</Link>
        </div>
      </section>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>RELATED GUIDES</h2>
        <ul style={{ color: '#aaa', lineHeight: 1.7, fontSize: '0.9375rem', paddingLeft: '1.25rem' }}>
          <li style={{ marginBottom: '0.4rem' }}><Link href="/guides/hockey-rules" style={{ color: '#C8102E' }}>Hockey Rules for Beginners</Link></li>
          <li style={{ marginBottom: '0.4rem' }}><Link href="/guides/hockey-positions" style={{ color: '#C8102E' }}>Hockey Positions Explained</Link></li>
          <li style={{ marginBottom: '0.4rem' }}><Link href="/guides/defensive-play" style={{ color: '#C8102E' }}>Hockey Defensive Play Guide</Link></li>
          <li style={{ marginBottom: '0.4rem' }}><Link href="/guides/stanley-cup" style={{ color: '#C8102E' }}>Stanley Cup Guide</Link></li>
        </ul>
      </section>
    </div>
  );
}
