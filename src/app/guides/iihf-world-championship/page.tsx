import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'IIHF World Championship Guide — Format, History, and How the Tournament Works',
  description: 'How the IIHF World Championship works: 16-team format, group stages, knockout rounds, the gold medal game, and how national teams qualify for the world\'s largest annual hockey tournament.',
  openGraph: {
    title: 'IIHF World Championship Guide',
    description: 'IIHF World Championship format, history, qualifying, and the gold medal game.',
    type: 'article',
  },
  alternates: { canonical: 'https://rinkstop.com/guides/iihf-world-championship' },
};

export default function IIHFWorldChampionshipGuide() {
  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '0.75rem 1rem 4rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1rem' }}>
        <Link href="/">Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/guides" style={{ color: '#555' }}>Guides</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>IIHF World Championship</span>
      </nav>
      <span style={{ display: 'inline-block', fontSize: '0.5625rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '0.2rem 0.6rem', borderRadius: '4px', background: 'rgba(200,16,46,0.12)', color: '#C8102E', marginBottom: '0.75rem' }}>Guide</span>
      <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(2rem, 5vw, 2.75rem)', color: '#fff', letterSpacing: '0.04em', lineHeight: 1, margin: '0 0 0.75rem' }}>IIHF WORLD CHAMPIONSHIP GUIDE</h1>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9375rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>Format, history, qualifying, and the gold medal game — the world's largest annual hockey tournament.</p>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'Article', headline: 'IIHF World Championship Guide', description: 'IIHF World Championship format, history, qualifying, and the gold medal game.', author: { '@type': 'Organization', name: 'RinkStop' }, publisher: { '@type': 'Organization', name: 'RinkStop', url: 'https://rinkstop.com' }, datePublished: '2026-08-11' }) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [
        { '@type': 'Question', name: 'When is the IIHF World Championship held?', acceptedAnswer: { '@type': 'Answer', text: 'The IIHF World Championship is held annually, usually in May, in the spring following the NHL playoffs. The tournament runs roughly two weeks, with games hosted in two cities — typically a major host city and a secondary city. The host nation rotates; the 2024 tournament was held in Czechia (Prague and Ostrava), 2025 in Sweden and Denmark, and 2026 in Switzerland (Zürich and Fribourg).' } },
        { '@type': 'Question', name: 'How does the IIHF World Championship format work?', acceptedAnswer: { '@type': 'Answer', text: 'Sixteen national teams compete in two groups of 8 during the preliminary round (7 games each). The top 4 teams in each group advance to the knockout rounds (quarterfinals, semifinals, gold medal game, bronze medal game). The bottom teams in each group play a relegation round to determine which team is relegated to Division I Group A. The host nation is automatically seeded; the other 15 teams qualify through IIHF world ranking, last-tournament performance, and regional qualifiers.' } },
        { '@type': 'Question', name: 'How do teams qualify for the IIHF World Championship?', acceptedAnswer: { '@type': 'Answer', text: 'There are two paths: (1) automatic qualification via IIHF world ranking — the top 16 teams (excluding the host) get direct entry; (2) qualification tournaments. The IIHF world ranking is updated annually based on the previous 4 years of World Championship, Olympic, and World Cup performance. Lower-ranked teams can qualify through a playoff series — e.g., the winner of a "best-of-3" series between the 16th-ranked team and a higher-ranked challenger. The host nation is automatically seeded regardless of ranking.' } },
        { '@type': 'Question', name: 'Why do NHL players participate in the IIHF World Championship?', acceptedAnswer: { '@type': 'Answer', text: 'NHL players from the 8 national federations whose teams qualify (Canada, USA, Sweden, Finland, Russia, Czechia, Switzerland, Slovakia, Germany, Denmark, etc.) typically join their national teams for the World Championship after the NHL playoffs end. The IIHF and NHL have an agreement that releases NHL players for the tournament. NHL participation is voluntary per player. About 60-70% of NHL players from the participating federations join. The tournament is the main international hockey event of the calendar year — bigger than the Olympics (which uses under-23 rosters with limited NHL participation).' } },
        { '@type': 'Question', name: 'Who has won the most IIHF World Championships?', acceptedAnswer: { '@type': 'Answer', text: 'Canada and Russia (including the Soviet Union) are tied with the most IIHF World Championship titles — 27 each. Canada has won 27 (most recently in 2024 and 2023), while Russia/USSR has 27 (including 8 Soviet-era titles). Sweden is third with 11, Finland has 4, Czechia has 6 (including 2 Czechoslovakia titles), and the USA has 2. The tournament has been held annually since 1920 (with cancellations during WWII), making it the longest-running international hockey tournament.' } },
      ]}) }} />

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>THE TOURNAMENT FORMAT</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>16 teams, 2 weeks, 65 games. The IIHF World Championship is the largest annual hockey tournament in the world and the main international event on the hockey calendar.</p>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {[
            { round: 'Preliminary Round', teams: '16', format: '2 groups of 8', note: 'Each team plays 7 games over 5 days. Top 4 in each group advance to quarterfinals; bottom 4 play relegation round.' },
            { round: 'Quarterfinals', teams: '8', format: 'Single elimination', note: '4 games, 1 day. Cross-bracket seeding (1A vs 4B, 1B vs 4A, 2A vs 3B, 2B vs 3A).' },
            { round: 'Semifinals', teams: '4', format: 'Single elimination', note: '2 games on the same day. The gold medal game is the next day.' },
            { round: 'Gold Medal Game', teams: '2', format: 'Single game', note: 'Championship final. Bronze medal game is played earlier the same day.' },
            { round: 'Relegation Round', teams: '2', format: 'Best-of-3', note: 'Bottom team in each group plays a best-of-3 series against the challenger team. Loser is relegated to Division I Group A.' },
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
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>HISTORY OF THE TOURNAMENT</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>The IIHF World Championship is the oldest international hockey tournament. It has been held annually since 1920 (with cancellations during WWII), making it the longest-running hockey event in the world.</p>
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          {[
            { year: '1920', event: 'First tournament held in Antwerp, Belgium, as part of the Summer Olympics' },
            { year: '1930', event: 'First standalone championship held in Chamonix, Berlin, Vienna' },
            { year: '1954', event: 'Soviet Union begins its dynasty — wins 8 of the next 10 tournaments' },
            { year: '1972', event: 'Summit Series: Canada vs USSR — birth of modern hockey rivalry' },
            { year: '1991', event: 'Soviet Union breakup; Russia joins as successor state' },
            { year: '1998', event: 'NHL players join the tournament for the first time after lockout' },
            { year: '2006', event: 'Sweden wins in Riga, Latvia — first tournament with all 16 teams' },
            { year: '2018', event: 'Russia banned from IIHF events; tournament continues without them' },
            { year: '2024', event: 'Czechia hosts; Canada wins gold in Prague' },
          ].map((row, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '1rem', padding: '0.625rem 0.875rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '4px' }}>
              <span style={{ color: '#C8102E', fontSize: '0.875rem', fontWeight: 800 }}>{row.year}</span>
              <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.875rem', lineHeight: 1.55 }}>{row.event}</span>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>THE 16 TEAMS</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>The 16 teams are split into two groups of 8. The host nation is automatically seeded; the other 15 teams qualify through IIHF world ranking and qualifier playoffs.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
          {[
            { code: 'CAN', name: 'Canada', titles: 27 },
            { code: 'RUS', name: 'Russia', titles: 27 },
            { code: 'SWE', name: 'Sweden', titles: 11 },
            { code: 'FIN', name: 'Finland', titles: 4 },
            { code: 'CZE', name: 'Czechia', titles: 6 },
            { code: 'USA', name: 'United States', titles: 2 },
            { code: 'CAN', name: 'Canada', titles: 27 },
            { code: 'SUI', name: 'Switzerland', titles: 0 },
            { code: 'SVK', name: 'Slovakia', titles: 1 },
            { code: 'GER', name: 'Germany', titles: 1 },
            { code: 'DEN', name: 'Denmark', titles: 0 },
            { code: 'NOR', name: 'Norway', titles: 0 },
            { code: 'LAT', name: 'Latvia', titles: 0 },
            { code: 'AUT', name: 'Austria', titles: 0 },
            { code: 'FRA', name: 'France', titles: 0 },
            { code: 'KAZ', name: 'Kazakhstan', titles: 0 },
          ].map((row, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '50px 1fr 60px', gap: '0.5rem', padding: '0.5rem 0.75rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '4px', alignItems: 'center' }}>
              <span style={{ color: '#C8102E', fontSize: '0.8125rem', fontWeight: 800 }}>{row.code}</span>
              <span style={{ color: '#fff', fontSize: '0.875rem', fontWeight: 600 }}>{row.name}</span>
              <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.75rem', textAlign: 'right' }}>{row.titles} titles</span>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>NHL PARTICIPATION</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>The tournament is the only major international hockey event where the best NHL players regularly compete. The IIHF and NHL have an agreement that releases players for the tournament after NHL playoffs end.</p>
        <ul style={{ color: '#aaa', lineHeight: 1.7, fontSize: '0.9375rem', paddingLeft: '1.25rem' }}>
          <li style={{ marginBottom: '0.5rem' }}><strong style={{ color: '#fff' }}>Eligibility:</strong> NHL players from any IIHF member federation are eligible. About 60-70% of NHL players from participating teams join.</li>
          <li style={{ marginBottom: '0.5rem' }}><strong style={{ color: '#fff' }}>Schedule:</strong> tournament runs roughly 2 weeks starting in early May, after NHL playoffs eliminate most NHL teams. Players whose teams missed the playoffs join earlier; players whose teams played deep into the playoffs join later.</li>
          <li style={{ marginBottom: '0.5rem' }}><strong style={{ color: '#fff' }}>Impact:</strong> NHL participation makes the World Championship the most competitive international hockey event. Best-of-the-best in the playoff window.</li>
          <li style={{ marginBottom: '0.5rem' }}><strong style={{ color: '#fff' }}>Olympic hockey:</strong> by contrast, the Olympics use under-23 rosters with limited NHL participation (the NHL has historically paused its season for the Olympics, but the 2026 Milan-Cortina Olympics has restrictive NHL participation rules).</li>
        </ul>
      </section>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>FOLLOW THE TOURNAMENT</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>Browse the directory to find national teams and follow the 2026 tournament in Switzerland.</p>
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          <Link href="/directory/teams?level=international" style={{ display: 'block', padding: '0.75rem 1rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '4px', color: '#C8102E', textDecoration: 'none', fontSize: '0.9375rem' }}>→ National team programs</Link>
          <Link href="/news/international" style={{ display: 'block', padding: '0.75rem 1rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '4px', color: '#C8102E', textDecoration: 'none', fontSize: '0.9375rem' }}>→ International hockey news</Link>
          <Link href="/guides/stanley-cup" style={{ display: 'block', padding: '0.75rem 1rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '4px', color: '#C8102E', textDecoration: 'none', fontSize: '0.9375rem' }}>→ Stanley Cup Guide</Link>
        </div>
      </section>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>RELATED GUIDES</h2>
        <ul style={{ color: '#aaa', lineHeight: 1.7, fontSize: '0.9375rem', paddingLeft: '1.25rem' }}>
          <li style={{ marginBottom: '0.4rem' }}><Link href="/guides/stanley-cup" style={{ color: '#C8102E' }}>Stanley Cup Guide</Link> — NHL playoffs and the Cup</li>
          <li style={{ marginBottom: '0.4rem' }}><Link href="/guides/nhl-draft" style={{ color: '#C8102E' }}>NHL Draft Guide</Link> — eligibility and the path to the pros</li>
          <li style={{ marginBottom: '0.4rem' }}><Link href="/guides/hockey-development-explained" style={{ color: '#C8102E' }}>Hockey Development Explained</Link> — pathways from youth to pro</li>
        </ul>
      </section>
    </div>
  );
}
