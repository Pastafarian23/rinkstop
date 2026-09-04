import type { Metadata } from 'next';
import Link from 'next/link';
import { withDefaultOg } from '@/lib/metadata-defaults';

export const metadata: Metadata = {
  title: 'KHL Guide — Gagarin Cup Playoffs, Format, and How the Kontinental Hockey League Works',
  description: 'Everything you need to know about the KHL (Kontinental Hockey League): 22 teams across Russia, Belarus, Kazakhstan, and China, the Gagarin Cup playoffs, conferences, schedule, and how to follow teams.',
  openGraph: withDefaultOg({
    title: 'KHL Guide',
    description: 'KHL format, conferences, Gagarin Cup playoffs, and the largest professional hockey league outside the NHL.',
    type: 'article',
  }),
  alternates: { canonical: 'https://rinkstop.com/guides/khl' },
};

export default function KHLGuide() {
  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '0.75rem 1rem 4rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1rem' }}>
        <Link href="/">Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/guides" style={{ color: '#555' }}>Guides</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>KHL</span>
      </nav>
      <span style={{ display: 'inline-block', fontSize: '0.5625rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '0.2rem 0.6rem', borderRadius: '4px', background: 'rgba(200,16,46,0.12)', color: '#C8102E', marginBottom: '0.75rem' }}>Guide</span>
      <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(2rem, 5vw, 2.75rem)', color: '#fff', letterSpacing: '0.04em', lineHeight: 1, margin: '0 0 0.75rem' }}>KHL GUIDE</h1>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9375rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>The Kontinental Hockey League — 22 teams across Russia and former Soviet states, the Gagarin Cup, and the largest professional hockey league outside the NHL.</p>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'Article', headline: 'KHL Guide', description: 'KHL format, conferences, Gagarin Cup playoffs, and the largest professional hockey league outside the NHL.', author: { '@type': 'Organization', name: 'RinkStop' }, publisher: { '@type': 'Organization', name: 'RinkStop', url: 'https://rinkstop.com' }, datePublished: '2026-08-11' }) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [
        { '@type': 'Question', name: 'How many teams are in the KHL?', acceptedAnswer: { '@type': 'Answer', text: 'The KHL has 22 teams for the 2025–26 season, with the majority based in Russia and additional clubs in Belarus, Kazakhstan, and China. The league operates 2 conferences and 4 divisions.' } },
        { '@type': 'Question', name: 'What is the Gagarin Cup?', acceptedAnswer: { '@type': 'Answer', text: 'The Gagarin Cup is the KHL\'s championship trophy, awarded annually since 2009 to the playoff champion. Named after Yuri Gagarin, the Soviet cosmonaut and first human in space. Metallurg Magnitogorsk and Ak Bars Kazan are tied for the most Gagarin Cup wins (3 each).' } },
        { '@type': 'Question', name: 'How does the KHL regular season work?', acceptedAnswer: { '@type': 'Answer', text: 'The KHL regular season runs from September through March, with each team playing 68 games. The top 8 teams in each conference qualify for the Gagarin Cup Playoffs.' } },
        { '@type': 'Question', name: 'Is the KHL connected to the NHL?', acceptedAnswer: { '@type': 'Answer', text: 'Not formally. The KHL is an independent league, not a developmental circuit like the AHL. Some Russian players move between the KHL and NHL, but the leagues operate under separate rules, transfer agreements, and governance.' } },
        { '@type': 'Question', name: 'Why is the KHL called the Kontinental Hockey League?', acceptedAnswer: { '@type': 'Answer', text: 'The name reflects the league\'s continental scope — operating across multiple countries and time zones rather than a single national league. Founded in 2008 through a merger of the Russian Superleague and select Kazakh and Belarus clubs, the KHL was intended as the top professional circuit in Eurasia.' } },
      ]}) }} />

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>WHAT IS THE KHL</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>The Kontinental Hockey League is a professional ice hockey league founded in 2008 as a merger of the Russian Superleague (RSL) and select clubs from Kazakhstan and Belarus. It is the largest professional hockey league outside the NHL by geography and roster size, and it operates as the top-level professional circuit in Russia and several neighboring countries.</p>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {[
            { label: 'Founded', value: '2008 (current form)' },
            { label: 'Headquarters', value: 'Moscow, Russia' },
            { label: 'Teams', value: '22 (4 divisions, 2 conferences)' },
            { label: 'Countries', value: 'Russia, Belarus, Kazakhstan, China' },
            { label: 'Regular season', value: '68 games per team, September to March' },
            { label: 'Playoffs', value: 'Gagarin Cup Playoffs, March to April' },
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
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>The KHL is split into two conferences and four divisions. The Western Conference contains the Bobrov and Tarasov divisions; the Eastern Conference contains the Kharlamov and Chernyshev divisions.</p>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {[
            { conference: 'Western Conference', divisions: 'Bobrov, Tarasov' },
            { conference: 'Eastern Conference', divisions: 'Kharlamov, Chernyshev' },
          ].map((row, i) => (
            <div key={i} style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.875rem 1.125rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
                <h3 style={{ color: '#fff', fontSize: '1rem', fontWeight: 700, margin: 0 }}>{row.conference}</h3>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8125rem' }}>{row.divisions}</span>
              </div>
            </div>
          ))}
        </div>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginTop: '1rem', fontSize: '0.9375rem' }}>Teams play a balanced schedule against their own division opponents and a mix of cross-division and cross-conference games. The KHL has experimented with various playoff formats, including a divisional opening round before conference brackets.</p>
      </section>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>THE GAGARIN CUP PLAYOFFS</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>16 teams qualify (top 8 from each conference). The format has evolved over the league\'s history:</p>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {[
            { round: 'Conference Quarterfinals', teams: '8 → 4', format: 'Best-of-7', note: 'Top 8 teams in each conference play intra-conference matchups.' },
            { round: 'Conference Semifinals', teams: '4 → 2', format: 'Best-of-7', note: 'Winners meet within each conference.' },
            { round: 'Conference Finals', teams: '2 → 1', format: 'Best-of-7', note: 'Western and Eastern Conference champions crowned.' },
            { round: 'Gagarin Cup Final', teams: '2 → 1', format: 'Best-of-7', note: 'East vs West. The Gagarin Cup is awarded in April.' },
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
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>RECENT GAGARIN CUP CHAMPIONS</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>Recent champions:</p>
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          {[
            { year: '2025', winner: 'Metallurg Magnitogorsk', note: '3rd Gagarin Cup' },
            { year: '2024', winner: 'Metallurg Magnitogorsk', note: '2nd Gagarin Cup' },
            { year: '2023', winner: 'CSKA Moscow', note: '2nd Gagarin Cup' },
            { year: '2022', winner: 'CSKA Moscow', note: '1st Gagarin Cup' },
            { year: '2021', winner: 'Avangard Omsk', note: '1st Gagarin Cup' },
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
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>The most successful franchises in KHL history by Gagarin Cup titles:</p>
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          {[
            { rank: 1, team: 'Metallurg Magnitogorsk', cups: 3 },
            { rank: 2, team: 'Ak Bars Kazan', cups: 3 },
            { rank: 3, team: 'CSKA Moscow', cups: 2 },
            { rank: 4, team: 'SKA Saint Petersburg', cups: 2 },
            { rank: 5, team: 'Avangard Omsk', cups: 1 },
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
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>FOLLOW THE KHL</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>Browse the directory to find KHL teams, scores, and standings.</p>
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          <Link href="/directory/teams?league=khl" style={{ display: 'block', padding: '0.75rem 1rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '4px', color: '#C8102E', textDecoration: 'none', fontSize: '0.9375rem' }}>→ All 22 KHL teams</Link>
          <Link href="/standings/khl" style={{ display: 'block', padding: '0.75rem 1rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '4px', color: '#C8102E', textDecoration: 'none', fontSize: '0.9375rem' }}>→ KHL standings and playoff bracket</Link>
          <Link href="/guides/iihf-world-championship" style={{ display: 'block', padding: '0.75rem 1rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '4px', color: '#C8102E', textDecoration: 'none', fontSize: '0.9375rem' }}>→ IIHF World Championship Guide</Link>
          <Link href="/guides/stanley-cup" style={{ display: 'block', padding: '0.75rem 1rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '4px', color: '#C8102E', textDecoration: 'none', fontSize: '0.9375rem' }}>→ Stanley Cup Guide (NHL)</Link>
        </div>
      </section>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>RELATED GUIDES</h2>
        <ul style={{ color: '#aaa', lineHeight: 1.7, fontSize: '0.9375rem', paddingLeft: '1.25rem' }}>
          <li style={{ marginBottom: '0.4rem' }}><Link href="/guides/iihf-world-championship" style={{ color: '#C8102E' }}>IIHF World Championship Guide</Link> — national-team tournament</li>
          <li style={{ marginBottom: '0.4rem' }}><Link href="/guides/stanley-cup" style={{ color: '#C8102E' }}>Stanley Cup Guide</Link></li>
          <li style={{ marginBottom: '0.4rem' }}><Link href="/guides/ahl" style={{ color: '#C8102E' }}>AHL Guide</Link> — the NHL\'s primary developmental league</li>
          <li style={{ marginBottom: '0.4rem' }}><Link href="/guides/nhl-draft" style={{ color: '#C8102E' }}>NHL Draft Guide</Link></li>
        </ul>
      </section>
    </div>
  );
}
