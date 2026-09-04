import type { Metadata } from 'next';
import Link from 'next/link';
import { withDefaultOg } from '@/lib/metadata-defaults';

export const metadata: Metadata = {
  title: 'NHL Draft Guide — Eligibility, Order, Process, and How Players Get Picked',
  description: 'How the NHL Draft works: age eligibility, draft order, rounds, combine, scouting, and the path from junior/amateur hockey to a professional contract.',
  openGraph: withDefaultOg({
    title: 'NHL Draft Guide',
    description: 'NHL Draft eligibility, order, rounds, combine, scouting, and the path from junior hockey to a pro contract.',
    type: 'article',
  }),
  alternates: { canonical: 'https://rinkstop.com/guides/nhl-draft' },
};

export default function NHLDraftGuide() {
  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '0.75rem 1rem 4rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1rem' }}>
        <Link href="/">Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/guides" style={{ color: '#555' }}>Guides</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>NHL Draft</span>
      </nav>
      <span style={{ display: 'inline-block', fontSize: '0.5625rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '0.2rem 0.6rem', borderRadius: '4px', background: 'rgba(200,16,46,0.12)', color: '#C8102E', marginBottom: '0.75rem' }}>Guide</span>
      <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(2rem, 5vw, 2.75rem)', color: '#fff', letterSpacing: '0.04em', lineHeight: 1, margin: '0 0 0.75rem' }}>NHL DRAFT GUIDE</h1>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9375rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>How the NHL Draft works — eligibility, order, rounds, the combine, scouting, and the path from junior or amateur hockey to a professional contract.</p>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'Article', headline: 'NHL Draft Guide', description: 'NHL Draft eligibility, order, rounds, combine, scouting, and the path to a pro contract.', author: { '@type': 'Organization', name: 'RinkStop' }, publisher: { '@type': 'Organization', name: 'RinkStop', url: 'https://rinkstop.com' }, datePublished: '2026-08-11' }) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [
        { '@type': 'Question', name: 'Who is eligible for the NHL Draft?', acceptedAnswer: { '@type': 'Answer', text: 'Players are eligible for the NHL Draft if they are at least 18 years old by September 15 of the draft year AND no older than 22 by September 15. There are exceptions: non-North American players over 18 are eligible in their first two seasons playing in North American pro/minor leagues. NCAA players lose eligibility if they sign with an NHL team before exhausting their college eligibility, so most NCAA-bound players go through the draft and then decide between pro and college.' } },
        { '@type': 'Question', name: 'How is the NHL Draft order determined?', acceptedAnswer: { '@type': 'Answer', text: 'The NHL Draft order is determined by a combination of regular-season standings and a draft lottery. The non-playoff teams participate in the lottery for the first overall pick (and now top picks in general, since 2023 changes reduced the number of lottery wins per team). After the lottery, the remaining non-playoff teams pick in reverse standings order. Playoff teams pick in reverse order of elimination, with the Stanley Cup finalist picking last. Trades can move picks around, so the actual draft order on draft day is rarely the same as the standings-based order.' } },
        { '@type': 'Question', name: 'How many rounds are in the NHL Draft?', acceptedAnswer: { '@type': 'Answer', text: 'The NHL Draft currently has 7 rounds. Each team gets one pick per round (32 picks per round x 7 rounds = 224 picks total), though the exact number can vary slightly due to compensatory picks and forfeiture. Each drafted player has 2 years from the date of the draft to sign with the NHL team that drafted them; if they do not sign, they become an unrestricted free agent and can sign with any team.' } },
        { '@type': 'Question', name: 'What is the NHL Combine?', acceptedAnswer: { '@type': 'Answer', text: 'The NHL Combine is an annual event held in late May or early June where the top draft-eligible prospects are invited for medical evaluations, fitness testing (VO2 max, bench press, push-ups, sit-ups, vertical jump, pro agility, grip strength), and individual interviews with all 32 NHL teams. The Combine is by invitation only — typically 100+ top prospects. Strong Combine performances can move players up draft boards; poor fitness scores or medical flags can move them down. The Combine has been held at Buffalo Sabres\' HarborCenter since 2015.' } },
        { '@type': 'Question', name: 'What leagues do NHL Draft prospects come from?', acceptedAnswer: { '@type': 'Answer', text: 'The NHL Draft pulls from every major hockey league: CHL (OHL, WHL, QMJHL), NCAA (D-I), USHL and NAHL (US junior), NCDC, BCHL and AJHL (Canadian junior), European pro leagues (SHL, Liiga, Czech Extraliga, KHL, etc.), European junior leagues, and high school (rare). Approximately 50% of first-round picks come from the CHL; 30% from European leagues; 15% from NCAA / USHL; 5% from other. The exact mix shifts year to year.' } },
      ]}) }} />

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>THE DRAFT LANDSCAPE</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>The NHL Draft happens once a year, in late June or early July. It's where every NHL team's future takes shape. 224 picks, 7 rounds, two days.</p>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {[
            { name: 'Round 1', picks: '32', note: 'Where stars are drafted. Top-15 picks are typically NHL-ready within 1-2 years. Picks 16-32 usually need 2-4 years of development in juniors, AHL, or NCAA.' },
            { name: 'Round 2', picks: '32', note: 'Still high-impact picks. Many NHL regulars are second-round picks. A team\'s scouting depth shows here.' },
            { name: 'Round 3-4', picks: '64', note: 'Project picks. Most round 3-4 picks need 3-5 years of development. Many never play in the NHL but have long AHL/ECHL careers.' },
            { name: 'Round 5-7', picks: '96', note: 'Long shots. Roughly 30-40% of picks in rounds 5-7 ever play an NHL game. Most have long minor-league careers or play European pro.' },
          ].map((row, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '120px 60px 1fr', gap: '1rem', padding: '0.875rem 1.125rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '6px', alignItems: 'start' }}>
              <span style={{ color: '#fff', fontSize: '0.9375rem', fontWeight: 700 }}>{row.name}</span>
              <span style={{ color: '#C8102E', fontSize: '0.875rem', fontWeight: 700 }}>{row.picks}</span>
              <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', lineHeight: 1.55 }}>{row.note}</span>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>WHO IS ELIGIBLE</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>NHL Draft eligibility is age-based, with international exceptions. The 18-and-under rule means most top prospects are 17-18 at the draft.</p>
        <ul style={{ color: '#aaa', lineHeight: 1.7, fontSize: '0.9375rem', paddingLeft: '1.25rem' }}>
          <li style={{ marginBottom: '0.5rem' }}><strong style={{ color: '#fff' }}>North American players:</strong> at least 18 by September 15 of the draft year AND not older than 22 by September 15. So a player turning 18 in early 2026 is eligible for the 2026 Draft. Most first-round picks are 17-18.</li>
          <li style={{ marginBottom: '0.5rem' }}><strong style={{ color: '#fff' }}>European players:</strong> any player 18+ by September 15 of the draft year is eligible. First two seasons of pro/minor in North America count as the eligibility window for any player who turns 18 in that window.</li>
          <li style={{ marginBottom: '0.5rem' }}><strong style={{ color: '#fff' }}>NCAA-bound players:</strong> drafted players can keep their NCAA eligibility by declining to sign with the NHL team for 30 days after the draft (essentially the first 30 days of June/July). Most NCAA-bound players are drafted and either sign the pro contract (losing NCAA eligibility) or go to college and re-negotiate later. Connor McDavid was drafted #1 in 2015 and spent one more year in the OHL; many NCAA-bound picks use a similar path.</li>
          <li style={{ marginBottom: '0.5rem' }}><strong style={{ color: '#fff' }}>CHL graduates:</strong> CHL (OHL, WHL, QMJHL) is the most common path. Most CHL players are drafted at 18, sent back to junior for 1-3 more years, and then turn pro in the AHL or NHL.</li>
        </ul>
      </section>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>THE PATH TO THE DRAFT</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>Most NHL draft picks come through one of four developmental paths. The path matters less than the player's individual development curve.</p>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {[
            { name: 'CHL (OHL, WHL, QMJHL)', desc: 'Major junior. 16-20 year olds, 60-72 game seasons, high-visibility. Most first-round picks come from here. NHL teams scout heavily.' },
            { name: 'NCAA (D-I)', desc: 'College hockey, 18-22 year olds, 30-40 game seasons. Stronger academic experience. NCAA players are typically drafted at 18-20 after 1-3 college seasons. About 30% of first-round picks have NCAA experience.' },
            { name: 'USHL / NAHL (US major junior)', desc: 'US junior leagues, 16-20 year olds. USHL is the top US junior league; NAHL is Tier 2. About 15-20% of first-round picks come from these leagues.' },
            { name: 'European pro leagues (SHL, Liiga, KHL, Czech Extraliga, etc.)', desc: 'Pro and junior leagues in Sweden, Finland, Czechia, Russia, Switzerland, Germany, Slovakia, Denmark. Most European top picks have 1-2 years of pro experience before being drafted.' },
          ].map((row, i) => (
            <div key={i} style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.875rem 1.125rem' }}>
              <h3 style={{ color: '#fff', fontSize: '0.9375rem', fontWeight: 700, marginBottom: '0.3rem' }}>{row.name}</h3>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', lineHeight: 1.55, margin: 0 }}>{row.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>WHAT SCOUTS LOOK FOR</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>The 80/20 of NHL draft scouting: <strong style={{ color: '#fff' }}>skating, hockey IQ, compete level, and projection.</strong> These are weighted in roughly that order.</p>
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          {[
            { weight: '30%', name: 'Skating', desc: 'Speed, acceleration, edge work, balance, transition from forward to backward. Skating is the hardest skill to develop and the one scouts can\'t teach. A player who skates well can be taught the rest.' },
            { weight: '25%', name: 'Hockey IQ / compete level', desc: 'Positioning, anticipation, decision-making under pressure, and willingness to compete. Many top prospects win in junior because they think the game faster than their peers.' },
            { weight: '20%', name: 'Skill execution', desc: 'Passing, shooting, hands, puck control. A player with average skating but elite hands can still make the NHL; a player with elite skating but poor hands has a lower ceiling.' },
            { weight: '15%', name: 'Projection / upside', desc: 'How good can this player be in 3-5 years? Scouts look at trajectory: is a 17-year-old already producing in the CHL, or is he dominating against weaker competition? Projection is what separates 1st-round picks from 4th-round picks with similar current skill.' },
            { weight: '10%', name: 'Character / intangibles', desc: 'Work ethic, coachability, off-ice habits, willingness to train. NHL teams do extensive character research (interviews with former coaches, teammates, trainers) before committing a top-3 pick.' },
          ].map((row, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '60px 200px 1fr', gap: '1rem', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '4px', alignItems: 'start' }}>
              <span style={{ color: '#C8102E', fontSize: '0.9375rem', fontWeight: 800, textAlign: 'right' }}>{row.weight}</span>
              <span style={{ color: '#fff', fontSize: '0.875rem', fontWeight: 700 }}>{row.name}</span>
              <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', lineHeight: 1.55 }}>{row.desc}</span>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>AFTER THE DRAFT</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>Being drafted is the start, not the end. Two years from the date of the draft, the player has to either sign an entry-level contract with the team that drafted them, or become an unrestricted free agent.</p>
        <ul style={{ color: '#aaa', lineHeight: 1.7, fontSize: '0.9375rem', paddingLeft: '1.25rem' }}>
          <li style={{ marginBottom: '0.5rem' }}><strong style={{ color: '#fff' }}>Entry-level contract (ELC):</strong> max 3 years, max $925K base salary (2023-24 figures, scale adjusts). Performance bonuses can push total compensation to $1.5M+. After the ELC, the player becomes a Restricted Free Agent (RFA).</li>
          <li style={{ marginBottom: '0.5rem' }}><strong style={{ color: '#fff' }}>Development path:</strong> most first-round picks spend 1-3 years in the AHL after signing, playing 30-50 NHL games per year. Top-5 picks often play 50-70 NHL games in their first pro season.</li>
          <li style={{ marginBottom: '0.5rem' }}><strong style={{ color: '#fff' }}>Unsigned draftees:</strong> a player who is drafted but doesn't sign within 2 years becomes a UFA. They can sign with any NHL team. This is rare but happens — e.g., high-end European prospects who stay in Europe.</li>
        </ul>
      </section>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>FIND THE TEAMS</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>Browse the directory to find NHL, AHL, junior, and college programs by region.</p>
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          <Link href="/directory/teams?level=pro" style={{ display: 'block', padding: '0.75rem 1rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '4px', color: '#C8102E', textDecoration: 'none', fontSize: '0.9375rem' }}>→ NHL, AHL, KHL, SHL, Liiga pro teams</Link>
          <Link href="/directory/teams?level=junior" style={{ display: 'block', padding: '0.75rem 1rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '4px', color: '#C8102E', textDecoration: 'none', fontSize: '0.9375rem' }}>→ CHL, USHL, NAHL, BCHL junior teams</Link>
          <Link href="/directory/teams?level=college" style={{ display: 'block', padding: '0.75rem 1rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '4px', color: '#C8102E', textDecoration: 'none', fontSize: '0.9375rem' }}>→ NCAA D-I, D-III, ACHA college teams</Link>
          <Link href="/guides/ncaa-hockey" style={{ display: 'block', padding: '0.75rem 1rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '4px', color: '#C8102E', textDecoration: 'none', fontSize: '0.9375rem' }}>→ NCAA Hockey Guide</Link>
        </div>
      </section>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>RELATED GUIDES</h2>
        <ul style={{ color: '#aaa', lineHeight: 1.7, fontSize: '0.9375rem', paddingLeft: '1.25rem' }}>
          <li style={{ marginBottom: '0.4rem' }}><Link href="/guides/ncaa-hockey" style={{ color: '#C8102E' }}>NCAA Hockey Guide</Link> — Division I, III, ACHA, recruiting</li>
          <li style={{ marginBottom: '0.4rem' }}><Link href="/guides/hockey-positions-explained" style={{ color: '#C8102E' }}>Hockey Positions Explained</Link> — every position, role, and deployment</li>
          <li style={{ marginBottom: '0.4rem' }}><Link href="/guides/hockey-tryout-guide" style={{ color: '#C8102E' }}>Hockey Tryout Guide</Link> — camps, showcases, and tryout prep</li>
          <li style={{ marginBottom: '0.4rem' }}><Link href="/guides/hockey-development-explained" style={{ color: '#C8102E' }}>Hockey Development Explained</Link> — pathways from youth to junior to pro</li>
          <li style={{ marginBottom: '0.4rem' }}><Link href="/guides/hockey-cost-explained" style={{ color: '#C8102E' }}>Hockey Cost Explained</Link> — the real numbers at every level</li>
        </ul>
      </section>
    </div>
  );
}
