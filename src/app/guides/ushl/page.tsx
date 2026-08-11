import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'USHL Guide — Clark Cup Playoffs, Format, and How the US Hockey League Works',
  description: 'Everything you need to know about the USHL (United States Hockey League): the only Tier 1 USA Hockey junior league, 16 teams, Clark Cup playoffs, draft pipeline to NCAA and NHL, and the USHL Draft.',
  openGraph: {
    title: 'USHL Guide',
    description: 'USHL format, Clark Cup playoffs, the USA Hockey Tier 1 junior league, and the primary path to NCAA and NHL for American players.',
    type: 'article',
  },
  alternates: { canonical: 'https://rinkstop.com/guides/ushl' },
};

export default function USHLGuide() {
  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '0.75rem 1rem 4rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1rem' }}>
        <Link href="/">Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/guides" style={{ color: '#555' }}>Guides</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>USHL</span>
      </nav>
      <span style={{ display: 'inline-block', fontSize: '0.5625rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '0.2rem 0.6rem', borderRadius: '4px', background: 'rgba(200,16,46,0.12)', color: '#C8102E', marginBottom: '0.75rem' }}>Guide</span>
      <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(2rem, 5vw, 2.75rem)', color: '#fff', letterSpacing: '0.04em', lineHeight: 1, margin: '0 0 0.75rem' }}>USHL GUIDE</h1>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9375rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>The United States Hockey League — the only Tier 1 USA Hockey junior league, 16 teams across the Midwest, the Clark Cup, and the primary path to NCAA and NHL for American players.</p>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'Article', headline: 'USHL Guide', description: 'USHL format, Clark Cup playoffs, the USA Hockey Tier 1 junior league, and the primary path to NCAA and NHL for American players.', author: { '@type': 'Organization', name: 'RinkStop' }, publisher: { '@type': 'Organization', name: 'RinkStop', url: 'https://rinkstop.com' }, datePublished: '2026-08-11' }) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [
        { '@type': 'Question', name: 'How many teams are in the USHL?', acceptedAnswer: { '@type': 'Answer', text: 'The USHL has 16 teams for the 2025–26 season, split into the Eastern Conference and Western Conference (8 teams each). All teams are based in the United States Midwest, primarily in states like Minnesota, Michigan, Wisconsin, Illinois, Iowa, Indiana, Nebraska, and Ohio.' } },
        { '@type': 'Question', name: 'What is the Clark Cup?', acceptedAnswer: { '@type': 'Answer', text: 'The Clark Cup is the USHL\'s playoff championship trophy, awarded annually to the playoff champion since the 1945–46 season. Named after the original USHL founders. The team that wins the Clark Cup also represents the USHL at the Junior Club World Cup.' } },
        { '@type': 'Question', name: 'How is the USHL connected to the NHL?', acceptedAnswer: { '@type': 'Answer', text: 'The USHL is the only Tier 1 junior league sanctioned by USA Hockey, and it serves as the primary development path for American-born NHL players. Unlike the CHL, USHL players retain NCAA eligibility, so most go on to play college hockey before turning professional.' } },
        { '@type': 'Question', name: 'Can USHL players go to college?', acceptedAnswer: { '@type': 'Answer', text: 'Yes — and most do. The USHL operates under NCAA eligibility rules, so players who complete their USHL careers retain full NCAA Division I eligibility. The majority of USHL alumni play college hockey after juniors, with a significant percentage eventually reaching the NHL.' } },
        { '@type': 'Question', name: 'How does the USHL Draft work?', acceptedAnswer: { '@type': 'Answer', text: 'The USHL holds an annual Phase I and Phase II Draft for players under 18, typically high-school-age American and international players. The Phase I Draft is the primary selection event; Phase II is a secondary draft for later-discovered or international players. Eligible players must be at least 15 years old.' } },
      ]}) }} />

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>WHAT IS THE USHL</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>The United States Hockey League is the only Tier 1 junior ice hockey league sanctioned by USA Hockey. It is the top junior circuit in the United States and serves as the primary development path for American-born players heading to NCAA Division I hockey and eventually the NHL.</p>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {[
            { label: 'Founded', value: '1961' },
            { label: 'Headquarters', value: 'Chicago, Illinois, USA' },
            { label: 'Tier', value: 'Tier 1 (USA Hockey sanctioned)' },
            { label: 'Teams', value: '16 (Eastern and Western Conferences, 8 each)' },
            { label: 'Region', value: 'US Midwest' },
            { label: 'Player age range', value: '16–20 years old' },
            { label: 'Championship', value: 'Clark Cup, awarded each spring' },
          ].map((row, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '1rem', padding: '0.625rem 0.875rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '4px' }}>
              <span style={{ color: '#C8102E', fontSize: '0.875rem', fontWeight: 800 }}>{row.label}</span>
              <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.875rem', lineHeight: 1.55 }}>{row.value}</span>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>CONFERENCES AND FORMAT</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>The USHL is split into two conferences of 8 teams each. Teams play a 62-game regular season from September through April, including the USHL Fall Classic and various showcase events that bring NHL scouts together to evaluate draft-eligible players.</p>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {[
            { conference: 'Eastern Conference', note: '8 teams, primarily Eastern Midwest' },
            { conference: 'Western Conference', note: '8 teams, primarily Western Midwest and Plains' },
          ].map((row, i) => (
            <div key={i} style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.875rem 1.125rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
                <h3 style={{ color: '#fff', fontSize: '1rem', fontWeight: 700, margin: 0 }}>{row.conference}</h3>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8125rem' }}>{row.note}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>THE CLARK CUP PLAYOFFS</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>The top 8 teams in the USHL qualify for the Clark Cup Playoffs. The format:</p>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {[
            { round: 'Conference Quarterfinals', teams: '8 → 4', format: 'Best-of-5', note: 'Top 8 teams play within their conferences. Higher seed hosts Games 1, 2, 5 if necessary.' },
            { round: 'Conference Semifinals', teams: '4 → 2', format: 'Best-of-5', note: 'Winners meet within each conference.' },
            { round: 'Conference Finals', teams: '2 → 1', format: 'Best-of-5', note: 'Eastern and Western Conference champions crowned.' },
            { round: 'Clark Cup Final', teams: '2 → 1', format: 'Best-of-5', note: 'East vs West. The Clark Cup is awarded in May.' },
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
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>RECENT CLARK CUP CHAMPIONS</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>Recent champions:</p>
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          {[
            { year: '2025', winner: 'Fargo Force', note: 'Western Conference' },
            { year: '2024', winner: 'Fargo Force', note: 'Western Conference, repeat' },
            { year: '2023', winner: 'Youngstown Phantoms', note: 'Eastern Conference' },
            { year: '2022', winner: 'Chicago Steel', note: 'Eastern Conference' },
            { year: '2021', winner: 'No champion awarded', note: 'Season modified due to COVID-19' },
            { year: '2020', winner: 'No champion awarded', note: 'Season cancelled due to COVID-19' },
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
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>USHL AS A PATH TO NCAA AND NHL</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>Unlike the CHL, the USHL preserves NCAA eligibility. The standard career path for top USHL players is:</p>
        <ol style={{ color: '#aaa', lineHeight: 1.7, fontSize: '0.9375rem', paddingLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li style={{ marginBottom: '0.5rem' }}>Play 1–3 seasons in the USHL</li>
          <li style={{ marginBottom: '0.5rem' }}>Commit to an NCAA Division I program</li>
          <li style={{ marginBottom: '0.5rem' }}>Play 3–4 seasons of college hockey</li>
          <li style={{ marginBottom: '0.5rem' }}>Sign with an NHL organization and go to the AHL or ECHL for development</li>
          <li style={{ marginBottom: '0.5rem' }}>Reach the NHL</li>
        </ol>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>Notable USHL alumni include:</p>
        <ul style={{ color: '#aaa', lineHeight: 1.7, fontSize: '0.9375rem', paddingLeft: '1.25rem' }}>
          <li style={{ marginBottom: '0.5rem' }}><strong style={{ color: '#fff' }}>Jack Hughes</strong> — USNTDP (played USHL games), drafted 1st overall 2019</li>
          <li style={{ marginBottom: '0.5rem' }}><strong style={{ color: '#fff' }}>Patrick Kane</strong> — USNTDP, drafted 1st overall 2007</li>
          <li style={{ marginBottom: '0.5rem' }}><strong style={{ color: '#fff' }}>Seth Jones</strong> — USNTDP, drafted 4th overall 2013</li>
          <li style={{ marginBottom: '0.5rem' }}><strong style={{ color: '#fff' }}>Johnny Gaudreau</strong> — Dubuque Fighting Saints, undrafted but signed by Calgary</li>
        </ul>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginTop: '1rem', fontSize: '0.9375rem' }}>Roughly 30–40% of NHL players drafted in the first round in any given year come from the USHL or USNTDP pathway.</p>
      </section>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>FOLLOW THE USHL</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>Browse the directory to find USHL teams.</p>
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          <Link href="/directory/teams?league=ushl" style={{ display: 'block', padding: '0.75rem 1rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '4px', color: '#C8102E', textDecoration: 'none', fontSize: '0.9375rem' }}>→ All 16 USHL teams</Link>
          <Link href="/standings/ushl" style={{ display: 'block', padding: '0.75rem 1rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '4px', color: '#C8102E', textDecoration: 'none', fontSize: '0.9375rem' }}>→ USHL standings and playoff bracket</Link>
          <Link href="/guides/ncaa-hockey" style={{ display: 'block', padding: '0.75rem 1rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '4px', color: '#C8102E', textDecoration: 'none', fontSize: '0.9375rem' }}>→ NCAA Hockey Guide</Link>
          <Link href="/guides/nhl-draft" style={{ display: 'block', padding: '0.75rem 1rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '4px', color: '#C8102E', textDecoration: 'none', fontSize: '0.9375rem' }}>→ NHL Draft Guide</Link>
        </div>
      </section>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>RELATED GUIDES</h2>
        <ul style={{ color: '#aaa', lineHeight: 1.7, fontSize: '0.9375rem', paddingLeft: '1.25rem' }}>
          <li style={{ marginBottom: '0.4rem' }}><Link href="/guides/ncaa-hockey" style={{ color: '#C8102E' }}>NCAA Hockey Guide</Link> — where most USHL players go next</li>
          <li style={{ marginBottom: '0.4rem' }}><Link href="/guides/nhl-draft" style={{ color: '#C8102E' }}>NHL Draft Guide</Link></li>
          <li style={{ marginBottom: '0.4rem' }}><Link href="/guides/chl" style={{ color: '#C8102E' }}>CHL Guide</Link> — the Canadian equivalent pathway</li>
          <li style={{ marginBottom: '0.4rem' }}><Link href="/guides/ahl" style={{ color: '#C8102E' }}>AHL Guide</Link></li>
        </ul>
      </section>
    </div>
  );
}
