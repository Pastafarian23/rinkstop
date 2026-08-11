import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'AHL Guide — Calder Cup Playoffs, Format, and How the American Hockey League Works',
  description: 'Everything you need to know about the AHL (American Hockey League): 32 teams across the US and Canada, the Calder Cup playoffs, primary NHL development role, divisions, schedule, and how to follow teams.',
  openGraph: {
    title: 'AHL Guide',
    description: 'AHL format, divisions, Calder Cup playoffs, and how the league develops NHL players.',
    type: 'article',
  },
  alternates: { canonical: 'https://rinkstop.com/guides/ahl' },
};

export default function AHLGuide() {
  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '0.75rem 1rem 4rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1rem' }}>
        <Link href="/">Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/guides" style={{ color: '#555' }}>Guides</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>AHL</span>
      </nav>
      <span style={{ display: 'inline-block', fontSize: '0.5625rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '0.2rem 0.6rem', borderRadius: '4px', background: 'rgba(200,16,46,0.12)', color: '#C8102E', marginBottom: '0.75rem' }}>Guide</span>
      <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(2rem, 5vw, 2.75rem)', color: '#fff', letterSpacing: '0.04em', lineHeight: 1, margin: '0 0 0.75rem' }}>AHL GUIDE</h1>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9375rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>The American Hockey League — 32 teams, the Calder Cup, and the primary development league for the NHL.</p>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'Article', headline: 'AHL Guide', description: 'AHL format, divisions, Calder Cup playoffs, and how the league develops NHL players.', author: { '@type': 'Organization', name: 'RinkStop' }, publisher: { '@type': 'Organization', name: 'RinkStop', url: 'https://rinkstop.com' }, datePublished: '2026-08-11' }) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [
        { '@type': 'Question', name: 'How many teams are in the AHL?', acceptedAnswer: { '@type': 'Answer', text: 'The AHL has 32 teams for the 2025–26 season, organized into 4 divisions: Atlantic, North, Central, and Pacific. Every team is affiliated with one or more NHL organizations; the league operates as the primary developmental circuit for the NHL.' } },
        { '@type': 'Question', name: 'What is the Calder Cup?', acceptedAnswer: { '@type': 'Answer', text: 'The Calder Cup is the AHL\'s championship trophy, awarded annually to the playoff champion since the 1937–38 season. Named after Frank Calder, the first president of the NHL. The Hershey Bears have won the most Calder Cups (12).' } },
        { '@type': 'Question', name: 'How does the AHL regular season work?', acceptedAnswer: { '@type': 'Answer', text: 'The AHL regular season runs from early October through mid-April, with each team playing 72 games. Top teams from each division qualify for the Calder Cup Playoffs, a best-of-3-to-best-of-7 format depending on the round.' } },
        { '@type': 'Question', name: 'How is the AHL connected to the NHL?', acceptedAnswer: { '@type': 'Answer', text: 'Every AHL team is a developmental affiliate of one or more NHL clubs. NHL teams assign their top prospects, recent draft picks, and signed players who need additional ice time to their AHL affiliate. The AHL does not have independent franchises — it exists to develop NHL talent.' } },
        { '@type': 'Question', name: 'Can a team play in the AHL without an NHL affiliation?', acceptedAnswer: { '@type': 'Answer', text: 'No. Since the early 2000s, the AHL has operated on a strict NHL-affiliate model. Independent franchises have not existed in the AHL for two decades; all 32 current teams are owned by or affiliated with NHL organizations.' } },
      ]}) }} />

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>WHAT IS THE AHL</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>The American Hockey League is a professional ice hockey league based in the United States and Canada. Founded in 1936, it has operated as the primary developmental league for the National Hockey League since 2001. Every team is affiliated with one or more NHL organizations, and the league\'s role is to bridge the gap between junior hockey and the NHL.</p>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {[
            { label: 'Founded', value: '1936 (as the International-American Hockey League)' },
            { label: 'Headquarters', value: 'Springfield, Massachusetts, USA' },
            { label: 'Teams', value: '32 (4 divisions, 2 conferences)' },
            { label: 'Regular season', value: '72 games per team, October to April' },
            { label: 'Playoffs', value: 'Calder Cup Playoffs, April to June' },
            { label: 'Affiliation', value: 'Every team is an NHL developmental affiliate' },
          ].map((row, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '1rem', padding: '0.625rem 0.875rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '4px' }}>
              <span style={{ color: '#C8102E', fontSize: '0.875rem', fontWeight: 800 }}>{row.label}</span>
              <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.875rem', lineHeight: 1.55 }}>{row.value}</span>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>DIVISIONS AND FORMAT</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>The AHL is split into two conferences and four divisions. The Eastern Conference contains the Atlantic and North divisions; the Western Conference contains the Central and Pacific divisions.</p>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {[
            { conference: 'Eastern Conference', divisions: 'Atlantic, North' },
            { conference: 'Western Conference', divisions: 'Central, Pacific' },
          ].map((row, i) => (
            <div key={i} style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.875rem 1.125rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
                <h3 style={{ color: '#fff', fontSize: '1rem', fontWeight: 700, margin: 0 }}>{row.conference}</h3>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8125rem' }}>{row.divisions}</span>
              </div>
            </div>
          ))}
        </div>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginTop: '1rem', fontSize: '0.9375rem' }}>Each division has 8 teams. The top 4 teams in each division qualify for the Calder Cup Playoffs. Teams play a 72-game schedule with home-and-home series against every other team in their division, plus inter-conference and inter-division games to round out the calendar.</p>
      </section>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>THE CALDER CUP PLAYOFFS</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>16 teams qualify (top 4 from each of the 4 divisions). The format varies by round:</p>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {[
            { round: 'Division Semifinals', teams: '8 → 4', format: 'Best-of-5', note: 'Top 4 teams in each division. Higher seed hosts Games 1, 2, 5 if necessary.' },
            { round: 'Division Finals', teams: '4 → 2', format: 'Best-of-7', note: 'Winners of the Division Semifinals meet within each division.' },
            { round: 'Conference Finals', teams: '2 → 1', format: 'Best-of-7', note: 'Eastern Conference Final and Western Conference Final.' },
            { round: 'Calder Cup Final', teams: '2 → 1', format: 'Best-of-7', note: 'East vs West. The Calder Cup is awarded to the winner in June.' },
          ].map((row, i) => (
            <div key={i} style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.875rem 1.125rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
                <h3 style={{ color: '#fff', fontSize: '1rem', fontWeight: 700, margin: 0 }}>{row.round}</h3>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8125rem' }}>{row.teams} · {row.format}</span>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', lineHeight: 1.55, margin: 0 }}>{row.note}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>RECENT CALDER CUP CHAMPIONS</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>Recent champions and runners-up:</p>
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          {[
            { year: '2025', winner: 'Abbotsford Canucks', note: 'Vancouver affiliate' },
            { year: '2024', winner: 'Hershey Bears', note: 'Washington affiliate, 12th title' },
            { year: '2023', winner: 'Hershey Bears', note: 'Washington affiliate' },
            { year: '2022', winner: 'Chicago Wolves', note: 'Carolina affiliate' },
            { year: '2021', winner: 'No champion awarded', note: 'Season cancelled due to COVID-19' },
            { year: '2020', winner: 'No champion awarded', note: 'Season cut short due to COVID-19' },
          ].map((row, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '60px 1fr 1fr', gap: '1rem', padding: '0.625rem 0.875rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '4px' }}>
              <span style={{ color: '#C8102E', fontSize: '0.875rem', fontWeight: 800 }}>{row.year}</span>
              <span style={{ color: '#fff', fontSize: '0.875rem', fontWeight: 600 }}>{row.winner}</span>
              <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.875rem' }}>{row.note}</span>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>FRANCHISE LEADERS</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>The most successful franchises in AHL history by Calder Cup titles:</p>
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          {[
            { rank: 1, team: 'Hershey Bears', cups: 12 },
            { rank: 2, team: 'Springfield Indians / Thunderbirds', cups: 7 },
            { rank: 3, team: 'Cleveland Barons', cups: 9 },
            { rank: 4, team: 'Rochester Americans', cups: 6 },
            { rank: 5, team: 'Pittsburgh Hornets', cups: 4 },
          ].map((row, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '40px 1fr 80px', gap: '1rem', padding: '0.625rem 0.875rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '4px', alignItems: 'center' }}>
              <span style={{ color: '#C8102E', fontSize: '0.9375rem', fontWeight: 800, textAlign: 'right' }}>{row.rank}</span>
              <span style={{ color: '#fff', fontSize: '0.9375rem', fontWeight: 600 }}>{row.team}</span>
              <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.875rem', textAlign: 'right' }}>{row.cups} Cups</span>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>FOLLOW THE AHL</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>Browse the directory to find AHL teams, scores, and standings.</p>
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          <Link href="/directory/teams?league=ahl" style={{ display: 'block', padding: '0.75rem 1rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '4px', color: '#C8102E', textDecoration: 'none', fontSize: '0.9375rem' }}>→ All 32 AHL teams</Link>
          <Link href="/standings/ahl" style={{ display: 'block', padding: '0.75rem 1rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '4px', color: '#C8102E', textDecoration: 'none', fontSize: '0.9375rem' }}>→ AHL standings and playoff bracket</Link>
          <Link href="/guides/stanley-cup" style={{ display: 'block', padding: '0.75rem 1rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '4px', color: '#C8102E', textDecoration: 'none', fontSize: '0.9375rem' }}>→ Stanley Cup Guide (NHL)</Link>
          <Link href="/guides/nhl-draft" style={{ display: 'block', padding: '0.75rem 1rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '4px', color: '#C8102E', textDecoration: 'none', fontSize: '0.9375rem' }}>→ NHL Draft Guide</Link>
        </div>
      </section>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>RELATED GUIDES</h2>
        <ul style={{ color: '#aaa', lineHeight: 1.7, fontSize: '0.9375rem', paddingLeft: '1.25rem' }}>
          <li style={{ marginBottom: '0.4rem' }}><Link href="/guides/stanley-cup" style={{ color: '#C8102E' }}>Stanley Cup Guide</Link> — the NHL\'s championship trophy</li>
          <li style={{ marginBottom: '0.4rem' }}><Link href="/guides/iihf-world-championship" style={{ color: '#C8102E' }}>IIHF World Championship Guide</Link></li>
          <li style={{ marginBottom: '0.4rem' }}><Link href="/guides/nhl-draft" style={{ color: '#C8102E' }}>NHL Draft Guide</Link> — where AHL players often pass through</li>
          <li style={{ marginBottom: '0.4rem' }}><Link href="/guides/hockey-positions" style={{ color: '#C8102E' }}>Hockey Positions Explained</Link></li>
        </ul>
      </section>
    </div>
  );
}
