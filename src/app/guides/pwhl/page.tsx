import type { Metadata } from 'next';
import Link from 'next/link';
import { withDefaultOg } from '@/lib/metadata-defaults';

export const metadata: Metadata = {
  title: 'PWHL Guide — Walter Cup Playoffs, Format, and How the Professional Women\'s Hockey League Works',
  description: 'Everything you need to know about the PWHL (Professional Women\'s Hockey League): 8 teams across the US and Canada, the Walter Cup playoffs, format, schedule, and how it transformed women\'s professional hockey.',
  openGraph: withDefaultOg({
    title: 'PWHL Guide',
    description: 'PWHL format, Walter Cup playoffs, and the unified professional women\'s hockey league launched in 2023-24.',
    type: 'article',
  }),
  alternates: { canonical: 'https://rinkstop.com/guides/pwhl' },
};

export default function PWHLGuide() {
  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '0.75rem 1rem 4rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1rem' }}>
        <Link href="/">Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/guides" style={{ color: '#555' }}>Guides</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>PWHL</span>
      </nav>
      <span style={{ display: 'inline-block', fontSize: '0.5625rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '0.2rem 0.6rem', borderRadius: '4px', background: 'rgba(200,16,46,0.12)', color: '#C8102E', marginBottom: '0.75rem' }}>Guide</span>
      <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(2rem, 5vw, 2.75rem)', color: '#fff', letterSpacing: '0.04em', lineHeight: 1, margin: '0 0 0.75rem' }}>PWHL GUIDE</h1>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9375rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>The Professional Women&apos;s Hockey League — 8 teams across the US and Canada, the Walter Cup, and the unified top-tier women&apos;s professional hockey league that launched in 2023.</p>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'Article', headline: 'PWHL Guide', description: 'PWHL format, Walter Cup playoffs, and the unified professional women\'s hockey league launched in 2023-24.', author: { '@type': 'Organization', name: 'RinkStop' }, publisher: { '@type': 'Organization', name: 'RinkStop', url: 'https://rinkstop.com' }, datePublished: '2026-08-11' }) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [
        { '@type': 'Question', name: 'What does PWHL stand for?', acceptedAnswer: { '@type': 'Answer', text: 'PWHL stands for Professional Women\'s Hockey League, the unified top-tier professional women\'s ice hockey league in North America. It launched its inaugural season in 2023-24 after the Premier Hockey Federation (PHF) and the Professional Women\'s Hockey Players Association (PWHPA) agreed to merge operations.' } },
        { '@type': 'Question', name: 'How many teams are in the PWHL?', acceptedAnswer: { '@type': 'Answer', text: 'The PWHL has 8 teams for the 2025–26 season, all based in the northeastern US and Canada. The teams are based in Boston, Minnesota, Montreal, New York, Ottawa, Philadelphia, Toronto, and the Greater Toronto Area (a second franchise was added in 2025).' } },
        { '@type': 'Question', name: 'What is the Walter Cup?', acceptedAnswer: { '@type': 'Answer', text: 'The Walter Cup is the PWHL\'s championship trophy, awarded annually to the playoff champion. Named after women\'s hockey pioneer and IIHF Hall of Famer Marguerite "Marg" Walter. Minnesota won the inaugural Walter Cup in 2024.' } },
        { '@type': 'Question', name: 'How does the PWHL regular season work?', acceptedAnswer: { '@type': 'Answer', text: 'The PWHL regular season runs from late November through May, with each team playing approximately 30 games. The top 4 teams qualify for the Walter Cup Playoffs, a single-elimination format that culminates in a best-of-5 final.' } },
        { '@type': 'Question', name: 'Is the PWHL connected to the NHL?', acceptedAnswer: { '@type': 'Answer', text: 'The PWHL is independently owned and operated by The Walter Group, founded by Mark and Kimbra Walter. It is not an NHL-owned league, though several NHL organizations have provided arena partnerships and marketing support. The PWHL is the unified top-tier league for women\'s professional hockey in North America.' } },
      ]}) }} />

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>WHAT IS THE PWHL</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>The Professional Women&apos;s Hockey League is the top-tier professional women&apos;s ice hockey league in North America. Founded in 2023 and launched for its inaugural season in 2023–24, the PWHL unified the previously fragmented women&apos;s professional hockey landscape by bringing together players who had been split between the Premier Hockey Federation (PHF) and the Professional Women&apos;s Hockey Players Association (PWHPA).</p>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {[
            { label: 'Founded', value: '2023 (in current form)' },
            { label: 'Inaugural season', value: '2023–24' },
            { label: 'Headquarters', value: 'Toronto, Ontario, Canada' },
            { label: 'Owner', value: 'The Walter Group (Mark and Kimbra Walter)' },
            { label: 'Teams', value: '8 (Northeastern US and Canada)' },
            { label: 'Regular season', value: '~30 games per team, November to May' },
            { label: 'Playoffs', value: 'Walter Cup Playoffs, May to June' },
          ].map((row, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '1rem', padding: '0.625rem 0.875rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '4px' }}>
              <span style={{ color: '#C8102E', fontSize: '0.875rem', fontWeight: 800 }}>{row.label}</span>
              <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.875rem', lineHeight: 1.55 }}>{row.value}</span>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>THE TEAMS</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>For the 2025–26 season, the PWHL operates 8 franchises in major media markets across the northeastern US and Canada. The PWHL originally launched with 6 teams in its inaugural season and added a 7th (the Greater Toronto Area franchise) and an 8th in subsequent seasons.</p>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {[
            { name: 'Boston Fleet', city: 'Boston, MA' },
            { name: 'Minnesota Frost', city: 'Saint Paul, MN' },
            { name: 'Montréal Victoire', city: 'Montreal, QC' },
            { name: 'New York Sirens', city: 'Newark, NJ' },
            { name: 'Ottawa Charge', city: 'Ottawa, ON' },
            { name: 'Philadelphia Fleet', city: 'Philadelphia, PA' },
            { name: 'Toronto Sceptres', city: 'Toronto, ON' },
            { name: 'PWHL Vancouver', city: 'Vancouver, BC' },
          ].map((row, i) => (
            <div key={i} style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.875rem 1.125rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '0.5rem', flexWrap: 'wrap' }}>
                <h3 style={{ color: '#fff', fontSize: '1rem', fontWeight: 700, margin: 0 }}>{row.name}</h3>
                <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.8125rem' }}>{row.city}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>THE WALTER CUP PLAYOFFS</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>The top 4 teams in the PWHL qualify for the Walter Cup Playoffs. The format is a single-elimination structure with a best-of-5 final:</p>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {[
            { round: 'Walter Cup Semifinal', teams: '4 → 2', format: 'Best-of-3', note: 'Higher seed plays lower seed in a 1-vs-4 and 2-vs-3 matchup. Higher seed hosts Games 1 and 3.' },
            { round: 'Walter Cup Final', teams: '2 → 1', format: 'Best-of-5', note: 'The two semifinal winners play a 2-2-1 format for the Walter Cup.' },
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
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>RECENT WALTER CUP CHAMPIONS</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>The Walter Cup has been awarded each season since the PWHL&apos;s inaugural year:</p>
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          {[
            { year: '2025', winner: 'Minnesota Frost', note: '2nd Walter Cup' },
            { year: '2024', winner: 'Minnesota Frost', note: 'Inaugural Walter Cup' },
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
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>WHY THE PWHL MATTERS</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>Before the PWHL launched in 2023, women&apos;s professional hockey in North America had been split between two competing leagues — the Premier Hockey Federation (PHF) and the Professional Women&apos;s Hockey Players Association (PWHPA). The PWHPA had been formed by players who boycotted the PHF in 2019 over pay and playing conditions.</p>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>The PWHL unified the sport by:</p>
        <ul style={{ color: '#aaa', lineHeight: 1.7, fontSize: '0.9375rem', paddingLeft: '1.25rem' }}>
          <li style={{ marginBottom: '0.5rem' }}>Standardizing pay and benefits across all teams</li>
          <li style={{ marginBottom: '0.5rem' }}>Providing a single top-tier competitive destination for the world&apos;s best women&apos;s players</li>
          <li style={{ marginBottom: '0.5rem' }}>Establishing a sustainable ownership and broadcast structure</li>
          <li style={{ marginBottom: '0.5rem' }}>Drawing on established NHL markets with arena partnerships</li>
        </ul>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginTop: '1rem', fontSize: '0.9375rem' }}>The league&apos;s first season set attendance records for women&apos;s professional hockey in North America and established a foundation for long-term growth.</p>
      </section>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>FOLLOW THE PWHL</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>Browse the directory to find PWHL teams, scores, and standings.</p>
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          <Link href="/directory/teams?league=pwhl" style={{ display: 'block', padding: '0.75rem 1rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '4px', color: '#C8102E', textDecoration: 'none', fontSize: '0.9375rem' }}>→ All 8 PWHL teams</Link>
          <Link href="/standings/pwhl" style={{ display: 'block', padding: '0.75rem 1rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '4px', color: '#C8102E', textDecoration: 'none', fontSize: '0.9375rem' }}>→ PWHL standings and playoff bracket</Link>
          <Link href="/guides/iihf-world-championship" style={{ display: 'block', padding: '0.75rem 1rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '4px', color: '#C8102E', textDecoration: 'none', fontSize: '0.9375rem' }}>→ IIHF World Championship Guide</Link>
          <Link href="/guides/stanley-cup" style={{ display: 'block', padding: '0.75rem 1rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '4px', color: '#C8102E', textDecoration: 'none', fontSize: '0.9375rem' }}>→ Stanley Cup Guide</Link>
        </div>
      </section>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>RELATED GUIDES</h2>
        <ul style={{ color: '#aaa', lineHeight: 1.7, fontSize: '0.9375rem', paddingLeft: '1.25rem' }}>
          <li style={{ marginBottom: '0.4rem' }}><Link href="/guides/iihf-world-championship" style={{ color: '#C8102E' }}>IIHF World Championship Guide</Link> — national-team competition including women&apos;s tournament</li>
          <li style={{ marginBottom: '0.4rem' }}><Link href="/guides/stanley-cup" style={{ color: '#C8102E' }}>Stanley Cup Guide</Link></li>
          <li style={{ marginBottom: '0.4rem' }}><Link href="/guides/ncaa-hockey" style={{ color: '#C8102E' }}>NCAA Hockey Guide</Link> — the primary development pipeline for PWHL players</li>
          <li style={{ marginBottom: '0.4rem' }}><Link href="/guides/hockey-positions" style={{ color: '#C8102E' }}>Hockey Positions Explained</Link></li>
        </ul>
      </section>
    </div>
  );
}
