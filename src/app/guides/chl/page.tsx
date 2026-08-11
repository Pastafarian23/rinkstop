import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'CHL Guide — Memorial Cup, Major Junior Hockey, and the Canadian Hockey League',
  description: 'Everything you need to know about the CHL (Canadian Hockey League): three member leagues (OHL, WHL, QMJHL), 60+ teams, the Memorial Cup, the CHL Import Draft, and how it develops NHL talent.',
  openGraph: {
    title: 'CHL Guide',
    description: 'CHL format, the Memorial Cup, the OHL/WHL/QMJHL, and the primary development path for NHL players.',
    type: 'article',
  },
  alternates: { canonical: 'https://rinkstop.com/guides/chl' },
};

export default function CHLGuide() {
  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '0.75rem 1rem 4rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1rem' }}>
        <Link href="/">Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/guides" style={{ color: '#555' }}>Guides</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>CHL</span>
      </nav>
      <span style={{ display: 'inline-block', fontSize: '0.5625rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '0.2rem 0.6rem', borderRadius: '4px', background: 'rgba(200,16,46,0.12)', color: '#C8102E', marginBottom: '0.75rem' }}>Guide</span>
      <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(2rem, 5vw, 2.75rem)', color: '#fff', letterSpacing: '0.04em', lineHeight: 1, margin: '0 0 0.75rem' }}>CHL GUIDE</h1>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9375rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>The Canadian Hockey League — three member leagues, 60+ teams across Canada and the US, the Memorial Cup, and the primary development path for NHL players.</p>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'Article', headline: 'CHL Guide', description: 'CHL format, the Memorial Cup, the OHL/WHL/QMJHL, and the primary development path for NHL players.', author: { '@type': 'Organization', name: 'RinkStop' }, publisher: { '@type': 'Organization', name: 'RinkStop', url: 'https://rinkstop.com' }, datePublished: '2026-08-11' }) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [
        { '@type': 'Question', name: 'What does CHL stand for?', acceptedAnswer: { '@type': 'Answer', text: 'CHL stands for Canadian Hockey League, an umbrella organization that operates three member leagues: the Ontario Hockey League (OHL), the Western Hockey League (WHL), and the Quebec Maritimes Junior Hockey League (QMJHL). The CHL itself does not play games — the three member leagues do — but it oversees shared operations including the Memorial Cup and the CHL Import Draft.' } },
        { '@type': 'Question', name: 'What is the Memorial Cup?', acceptedAnswer: { '@type': 'Answer', text: 'The Memorial Cup is the championship trophy of the Canadian Hockey League, awarded annually to the playoff champion of a four-team tournament held each May. The three CHL league champions (OHL, WHL, QMJHL) qualify automatically, joined by the host team of the Memorial Cup tournament.' } },
        { '@type': 'Question', name: 'How is the CHL different from the NHL?', acceptedAnswer: { '@type': 'Answer', text: 'The CHL is a major junior hockey league for players aged 16–20. It is not professional — players receive a monthly stipend and educational packages but not NHL-scale salaries. The NHL is a professional league. The CHL serves as the primary feeder system for the NHL: roughly half of all NHL players come through the CHL.' } },
        { '@type': 'Question', name: 'How does the CHL Import Draft work?', acceptedAnswer: { '@type': 'Answer', text: 'Each CHL team is allowed a limited number of import players (typically two) — players from outside North America. The CHL Import Draft is held annually and lets teams select eligible international players. Most imports come from European countries and Russia.' } },
        { '@type': 'Question', name: 'What age range plays in the CHL?', acceptedAnswer: { '@type': 'Answer', text: 'CHL players are typically 16 to 20 years old. Players are eligible for the CHL Draft the year they turn 16 and become overage at 20. Most players spend 2–4 seasons in the CHL before transitioning to professional hockey, either directly to the NHL or via the AHL or ECHL.' } },
      ]}) }} />

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>WHAT IS THE CHL</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>The Canadian Hockey League is an umbrella organization that oversees the operations of three major junior hockey leagues in Canada and the United States. The CHL operates the Memorial Cup tournament, the CHL Top Prospects Game, the CHL Import Draft, and shared player welfare and education programs. Each member league runs its own season and playoffs independently.</p>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {[
            { label: 'Founded', value: '1975 (in current umbrella form)' },
            { label: 'Headquarters', value: 'Toronto, Ontario, Canada' },
            { label: 'Member leagues', value: 'OHL, WHL, QMJHL' },
            { label: 'Total teams', value: '60 across the three leagues' },
            { label: 'Player age range', value: '16–20 years old' },
            { label: 'Championship', value: 'Memorial Cup, awarded each May' },
          ].map((row, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '1rem', padding: '0.625rem 0.875rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '4px' }}>
              <span style={{ color: '#C8102E', fontSize: '0.875rem', fontWeight: 800 }}>{row.label}</span>
              <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.875rem', lineHeight: 1.55 }}>{row.value}</span>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>THE THREE MEMBER LEAGUES</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>Each CHL member league covers a distinct geographic region and operates its own season, playoffs, and trophy:</p>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {[
            { name: 'OHL', full: 'Ontario Hockey League', region: 'Ontario, Michigan, Pennsylvania', teams: '20 teams', trophy: 'J. Ross Robertson Cup' },
            { name: 'WHL', full: 'Western Hockey League', region: 'Western Canada and US Pacific Northwest', teams: '22 teams', trophy: 'Ed Chynoweth Trophy' },
            { name: 'QMJHL', full: 'Quebec Maritimes Junior Hockey League', region: 'Quebec, Atlantic Canada, US Northeast', teams: '18 teams', trophy: 'President Cup' },
          ].map((row, i) => (
            <div key={i} style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.875rem 1.125rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
                <h3 style={{ color: '#fff', fontSize: '1rem', fontWeight: 700, margin: 0 }}>{row.name} — {row.full}</h3>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8125rem' }}>{row.teams}</span>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', lineHeight: 1.55, margin: '0 0 0.4rem' }}>{row.region}</p>
              <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.8125rem', lineHeight: 1.55, margin: 0 }}>League championship: <strong style={{ color: '#fff' }}>{row.trophy}</strong></p>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>THE MEMORIAL CUP</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>Each spring, the Memorial Cup tournament brings together the champions of the OHL, WHL, and QMJHL along with the host team of the upcoming tournament. The four teams play a round-robin followed by a semifinal and final, with the winner awarded the Memorial Cup.</p>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {[
            { round: 'Round Robin', teams: '4 teams', format: 'Round robin', note: 'Each team plays the other three once. Top two advance directly to the semifinal.' },
            { round: 'Semifinal', teams: '2 teams', format: 'Single game', note: '3rd place vs 4th place in round-robin standings.' },
            { round: 'Memorial Cup Final', teams: '2 teams', format: 'Single game', note: 'Round-robin winner vs semifinal winner.' },
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
        <p style={{ color: '#aaa', lineHeight: 1.75, marginTop: '1rem', fontSize: '0.9375rem' }}>The Memorial Cup has been awarded since 1919, originally as a tribute to Canadian soldiers who died in World War I. It is the oldest junior hockey trophy in North America.</p>
      </section>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>RECENT MEMORIAL CUP CHAMPIONS</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>Recent Memorial Cup champions:</p>
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          {[
            { year: '2025', winner: 'London Knights', note: 'OHL' },
            { year: '2024', winner: 'Saginaw Spirit', note: 'OHL' },
            { year: '2023', winner: 'Quebec Remparts', note: 'QMJHL' },
            { year: '2022', winner: 'Saint John Sea Dogs', note: 'QMJHL' },
            { year: '2021', winner: 'No champion awarded', note: 'Tournament cancelled due to COVID-19' },
            { year: '2020', winner: 'No champion awarded', note: 'Tournament cancelled due to COVID-19' },
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
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>CHL AS AN NHL FEEDER</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>The CHL is the primary development path to the NHL. Roughly half of all NHL players come through the CHL, including:</p>
        <ul style={{ color: '#aaa', lineHeight: 1.7, fontSize: '0.9375rem', paddingLeft: '1.25rem' }}>
          <li style={{ marginBottom: '0.5rem' }}><strong style={{ color: '#fff' }}>Connor McDavid</strong> — Erie Otters (OHL), drafted 1st overall 2015</li>
          <li style={{ marginBottom: '0.5rem' }}><strong style={{ color: '#fff' }}>Sidney Crosby</strong> — Rimouski Océanic (QMJHL), drafted 1st overall 2005</li>
          <li style={{ marginBottom: '0.5rem' }}><strong style={{ color: '#fff' }}>Connor Bedard</strong> — Regina Pats (WHL), drafted 1st overall 2023</li>
          <li style={{ marginBottom: '0.5rem' }}><strong style={{ color: '#fff' }}>Auston Matthews</strong> — ZSC Lions (Swiss, but CHL draft eligible), drafted 1st overall 2016</li>
        </ul>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginTop: '1rem', fontSize: '0.9375rem' }}>Players who aren\'t ready for the NHL after their CHL careers typically transition to the AHL or ECHL for additional development. Most NHL first-round picks in any given draft year come from the CHL.</p>
      </section>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>FOLLOW THE CHL</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>Browse the directory to find CHL teams across the OHL, WHL, and QMJHL.</p>
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          <Link href="/directory/teams?league=ohl" style={{ display: 'block', padding: '0.75rem 1rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '4px', color: '#C8102E', textDecoration: 'none', fontSize: '0.9375rem' }}>→ All 20 OHL teams</Link>
          <Link href="/directory/teams?league=whl" style={{ display: 'block', padding: '0.75rem 1rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '4px', color: '#C8102E', textDecoration: 'none', fontSize: '0.9375rem' }}>→ All 22 WHL teams</Link>
          <Link href="/directory/teams?league=qmjhl" style={{ display: 'block', padding: '0.75rem 1rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '4px', color: '#C8102E', textDecoration: 'none', fontSize: '0.9375rem' }}>→ All 18 QMJHL teams</Link>
          <Link href="/guides/nhl-draft" style={{ display: 'block', padding: '0.75rem 1rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '4px', color: '#C8102E', textDecoration: 'none', fontSize: '0.9375rem' }}>→ NHL Draft Guide</Link>
        </div>
      </section>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>RELATED GUIDES</h2>
        <ul style={{ color: '#aaa', lineHeight: 1.7, fontSize: '0.9375rem', paddingLeft: '1.25rem' }}>
          <li style={{ marginBottom: '0.4rem' }}><Link href="/guides/nhl-draft" style={{ color: '#C8102E' }}>NHL Draft Guide</Link> — where most CHL players go next</li>
          <li style={{ marginBottom: '0.4rem' }}><Link href="/guides/ahl" style={{ color: '#C8102E' }}>AHL Guide</Link> — the next step after the CHL</li>
          <li style={{ marginBottom: '0.4rem' }}><Link href="/guides/stanley-cup" style={{ color: '#C8102E' }}>Stanley Cup Guide</Link> — the NHL\'s ultimate prize</li>
          <li style={{ marginBottom: '0.4rem' }}><Link href="/guides/iihf-world-championship" style={{ color: '#C8102E' }}>IIHF World Championship Guide</Link></li>
        </ul>
      </section>
    </div>
  );
}
