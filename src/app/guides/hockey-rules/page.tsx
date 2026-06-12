import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Hockey Rules Explained',
  description: 'Every NHL rule explained in plain language. From icing to offsides, power plays to penalty shots  --  what the refs actually call and why it matters.',
  openGraph: { title: 'Hockey Rules Explained', description: 'Every NHL rule explained in plain language. From icing to offsides, power plays to penalty shots.', type: 'article' },
  alternates: { canonical: 'https://rinkstop.com/guides/hockey-rules' },
};

export default function HockeyRules() {
  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '0.75rem 1rem 4rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1rem' }}>
        <Link href="/">Home</Link><span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/guides" style={{ color: '#555' }}>Guides</Link><span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>Hockey Rules Explained</span>
      </nav>
      <span style={{ display: 'inline-block', fontSize: '0.5625rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '0.2rem 0.6rem', borderRadius: '4px', background: 'rgba(200,16,46,0.12)', color: '#C8102E', marginBottom: '0.75rem' }}>Beginners</span>
      <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(2rem, 5vw, 2.75rem)', color: '#fff', letterSpacing: '0.04em', lineHeight: 1, margin: '0 0 0.75rem' }}>HOCKEY RULES EXPLAINED</h1>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9375rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>Every NHL rule explained in plain language. From icing to offsides, power plays to penalty shots  --  what the refs actually call and why it matters.</p>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'Article', headline: 'Hockey Rules Explained', description: 'Every NHL rule explained in plain language. From icing to offsides, power plays to penalty shots.', author: { '@type': 'Organization', name: 'RinkStop' }, publisher: { '@type': 'Organization', name: 'RinkStop', url: 'https://rinkstop.com' }, datePublished: '2026-05-16' }) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [
        { '@type': 'Question', name: 'What are the basic rules of hockey?', acceptedAnswer: { '@type': 'Answer', text: 'Hockey\'s basic rules: 6 players per team on the ice (5 skaters + 1 goalie). Games are 60 minutes of running time, divided into 3 periods of 20 minutes each. If tied at the end of regulation, the NHL uses 3-on-3 sudden-death overtime, then a shootout. The offsides rule prevents players from entering the offensive zone before the puck. Icing prevents a team from shooting the puck from their half of the ice to the opponent\'s end to avoid defending.' } },
        { '@type': 'Question', name: 'What is the 3-on-3 overtime rule in NHL?', acceptedAnswer: { '@type': 'Answer', text: 'In NHL regular season, if a game is tied after 60 minutes, a 5-minute sudden-death overtime period is played with 3 skaters per side instead of the usual 5. The team that scores first wins. If no one scores in 5 minutes, the game goes to a shootout.' } },
        { '@type': 'Question', name: 'What is a penalty shot in hockey?', acceptedAnswer: { '@type': 'Answer', text: 'A penalty shot is awarded when a player on a breakaway is fouled from behind and denied a clear scoring chance. The fouled player (or a teammate) takes a one-on-one shot against the goalie from center ice with no other defenders. Penalty shots are the rarest call in hockey.' } },
      ]}) }} />

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>THE BASICS</h2>
        <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '1.25rem 1.5rem', marginBottom: '1rem' }}>
          <div style={{ display: 'grid', gap: '0.625rem' }}>
            {[
              { label: 'Players', value: '6 per team on the ice (5 skaters + goalie)' },
              { label: 'Periods', value: '3 × 20 minutes = 60 minutes total' },
              { label: 'Tiebreaker', value: '5 min 3-on-3 sudden-death OT, then shootout (regular season)' },
              { label: 'Playoffs', value: '20 min sudden-death OT periods until someone scores' },
              { label: 'Offsides', value: 'No attacking player crosses the blue line before the puck' },
              { label: 'Icing', value: 'No shooting from behind center line to the far end boards' },
              { label: 'Penalties', value: '2 min (minor), 4 min (double minor), 5 min (major), 10 min (misconduct)' },
            ].map(r => (
              <div key={r.label} style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.75rem', padding: '0.625rem', background: 'rgba(255,255,255,0.035)', borderRadius: '6px', alignItems: 'center' }}>
                <p style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#C8102E' }}>{r.label}</p>
                <p style={{ fontSize: '0.875rem', color: '#ccc' }}>{r.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {[
        { title: 'OFFSIDES', anchor: 'offsides', definition: 'Offside (also called entering the zone early) is called when an attacking player enters the offensive zone  --  crosses the blue line  --  before the puck does. When this happens, play is immediately stopped and a faceoff occurs in the neutral zone near where the offside was called. The intent is to prevent "cherry picking"  --  a player waiting near the opponent\'s net for a long pass.', keyPoints: [
          { rule: 'Attacking blue line', detail: 'The blue line closest to the opponent\'s net. You must wait for the puck to cross before you enter.' },
          { rule: 'Puck must enter first', detail: 'If the puck is already in the offensive zone, players can follow the puck in. The puck always has right of way.' },
          { rule: 'Linesman judgment', detail: 'Linesmen make the call in real time. There is no coach\'s challenge for offsides in the NHL  --  but coaches can challenge for offside if they have a coach\'s challenge available and can show the puck entered before the player.' },
          { rule: 'Delayed offside', detail: 'If an attacker is in the zone when the puck enters, the linesman holds the whistle until they exit and re-enter legally. This is called a "delayed offside" and is signaled by the linesman holding his arm up.' },
        ]},
        { title: 'ICING', anchor: 'icing', definition: 'Icing is called when a player shoots the puck from their side of the center line, across the opponent\'s goal line, and out of play  --  without it being touched by anyone. The result is a faceoff in the defending zone of the team that iced the puck. Icing is one of the most commonly confused rules because it depends on where the puck is shot from.', keyPoints: [
          { rule: 'Shot from behind the center line', detail: 'The puck must be shot from the shooter\'s side of the center red line. If it\'s shot from inside the neutral zone, it\'s not icing.' },
          { rule: 'Crosses the goal line', detail: 'The puck must cross the goal line (the red line at the back of the rink) to count.' },
          { rule: 'No touch required', detail: 'The defending team does NOT need to touch the puck for icing to be called. As soon as the puck crosses the goal line, the linesman signals icing.' },
          { rule: 'Penalty kill exception', detail: 'A team on the penalty kill CANNOT ice the puck. If they shoot it from behind center and it goes out, play continues. This gives the shorthanded team an incentive to dump the puck and relieve pressure.' },
        ]},
        { title: 'PENALTIES', anchor: 'penalties', definition: 'A penalty is called when a player commits a infraction listed in the NHL rulebook. When a penalty is called, the offending player serves time in the penalty box and their team plays short-handed (with one fewer skater). The penalty clock runs in real time, not game time.', keyPoints: [
          { rule: 'Minor penalty (2 min)', detail: 'The most common call. Roughing, tripping, slashing, hooking, interference  --  all minor penalties. If the other team scores while on the power play, the penalty ends.' },
          { rule: 'Double minor (4 min)', detail: 'Usually called when a minor penalty causes an injury (e.g., high-sticking that causes bleeding). The penalty is served for 4 minutes and does NOT end early if the other team scores.' },
          { rule: 'Major penalty (5 min)', detail: 'Called for fighting (5-minute major + game misconduct) or for hits deemed reckless enough to warrant a double. Major penalties do NOT end early when the other team scores.' },
          { rule: 'Misconduct (10 min)', detail: 'Player is ejected from the game but a teammate serves the penalty. The team does NOT play short-handed  --  the misconduct player sits 10 minutes but their team continues at full strength.' },
        ]},
        { title: 'POWER PLAY & PENALTY KILL', anchor: 'power-play', definition: 'A power play occurs when a team has a numerical advantage because an opponent is serving a penalty. The team with the extra player has 5 skaters vs 4 (or 5 vs 3). The team that is short-handed is on the penalty kill. This is one of the most analyzed situations in hockey analytics.', keyPoints: [
          { rule: 'When it starts', detail: 'The moment the referee signals the penalty and the penalized player enters the box, the power play begins.' },
          { rule: 'When it ends', detail: 'For minor penalties: if the team on the power play scores, the penalty ends early and the penalized player returns. For major penalties: the penalty runs the full 5 minutes regardless of goals.' },
          { rule: 'Goalie on power play', detail: 'If the penalized team pulls their goalie (6th attacker), and the team on the power play scores into the empty net, the penalty does NOT end early  --  the penalty is still served in full for minors.' },
          { rule: '5-on-3', detail: 'If a team takes two penalties simultaneously, they play with 3 skaters vs 5. 5-on-3 is a significant advantage  --  teams usually score quickly in these situations.' },
        ]},
        { title: 'FACEOFFS', anchor: 'faceoffs', definition: 'Faceoffs restart play after a stoppage  --  the two centers clash sticks over the puck at a designated spot on the ice. Faceoffs happen in all three zones and are one of the most underrated skills in hockey. A center who wins draws consistently gives their team more offensive zone time.', keyPoints: [
          { rule: 'Faceoff locations', detail: 'After an offside: neutral zone. After icing: defensive zone of the team that iced. After a penalty: offensive zone of the team with the power play.' },
          { rule: 'Faceoff violations', detail: 'If a center or winger moves before the puck drops, they\'re assessed a warning and their opponent gets the draw. Centers who consistently false-start can lose the draw and their teammate takes it.' },
          { rule: 'Wingers\' role', detail: 'Wingers must be positioned correctly during a faceoff: inside the dots, on their side of the faceoff circle, outside the hashes. Violations give the opponent the draw.' },
        ]},
        { title: 'PLAYOFF RULES', anchor: 'playoffs', definition: 'Playoff hockey uses the same rules as regular season with two critical differences: there is no shootout (ties are resolved by overtime periods until a goal is scored), and regular-season overtime is 5 minutes of 3-on-3. In playoffs, overtime is full 20-minute sudden-death periods played at 5-on-5 until a goal is scored.', keyPoints: [
          { rule: 'No shootout in playoffs', detail: 'If a playoff game is tied after 60 minutes, play continues in 20-minute sudden-death overtime periods. The longest playoff game was 4 OT periods  --  over 4 hours of hockey.' },
          { rule: '5-on-5 overtime', detail: 'All overtime in the playoffs is played 5-on-5, unlike the 3-on-3 format used in regular season overtime. This makes playoff OT a grueling endurance battle.' },
          { rule: 'Same penalties apply', detail: 'Penalties still exist in playoffs. If a team takes a penalty in overtime, the opposing team plays 5-on-4 for the duration of the penalty. A 5-on-3 power play in playoff OT is nearly impossible to survive.' },
        ]},
      ].map(section => (
        <section key={section.anchor} id={section.anchor} style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>{section.title}</h2>
          <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>{section.definition}</p>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {section.keyPoints.map(p => (
              <div key={p.rule} style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '1rem 1.25rem' }}>
                <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#C8102E', marginBottom: '0.375rem' }}>{p.rule}</p>
                <p style={{ fontSize: '0.875rem', color: '#888', lineHeight: 1.65 }}>{p.detail}</p>
              </div>
            ))}
          </div>
        </section>
      ))}

      <div style={{ background: 'var(--s2)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '1.5rem', textAlign: 'center', marginTop: '2rem' }}>
        <p style={{ color: '#666', fontSize: '0.875rem', marginBottom: '0.75rem' }}>Continue learning</p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/glossary" style={{ padding: '0.625rem 1.25rem', background: '#C8102E', borderRadius: '6px', color: '#fff', fontWeight: 600, fontSize: '0.875rem', textDecoration: 'none' }}>Hockey Glossary</Link>
          <Link href="/guides/hockey-positions" style={{ padding: '0.625rem 1.25rem', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: '#fff', fontWeight: 600, fontSize: '0.875rem', textDecoration: 'none' }}>Hockey Positions</Link>
        </div>
      </div>
    </div>
  );
}