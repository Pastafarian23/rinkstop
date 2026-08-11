import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Stanley Cup Guide — History, Playoffs, Format, and How the Trophy Works',
  description: 'Everything hockey fans need to know about the Stanley Cup: 130-year history, the playoff format, the trophy itself, Conn Smythe and Conn Smythe winners, and how a new champion is crowned each June.',
  openGraph: {
    title: 'Stanley Cup Guide',
    description: 'Stanley Cup history, playoffs, format, Conn Smythe, and how the trophy is awarded.',
    type: 'article',
  },
  alternates: { canonical: 'https://rinkstop.com/guides/stanley-cup' },
};

export default function StanleyCupGuide() {
  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '0.75rem 1rem 4rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1rem' }}>
        <Link href="/">Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/guides" style={{ color: '#555' }}>Guides</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>Stanley Cup</span>
      </nav>
      <span style={{ display: 'inline-block', fontSize: '0.5625rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '0.2rem 0.6rem', borderRadius: '4px', background: 'rgba(200,16,46,0.12)', color: '#C8102E', marginBottom: '0.75rem' }}>Guide</span>
      <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(2rem, 5vw, 2.75rem)', color: '#fff', letterSpacing: '0.04em', lineHeight: 1, margin: '0 0 0.75rem' }}>STANLEY CUP GUIDE</h1>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9375rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>History, playoff format, the trophy itself, and how a new champion is crowned every June.</p>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'Article', headline: 'Stanley Cup Guide', description: 'Stanley Cup history, playoffs, format, Conn Smythe, and how the trophy is awarded.', author: { '@type': 'Organization', name: 'RinkStop' }, publisher: { '@type': 'Organization', name: 'RinkStop', url: 'https://rinkstop.com' }, datePublished: '2026-08-11' }) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [
        { '@type': 'Question', name: 'When was the Stanley Cup first awarded?', acceptedAnswer: { '@type': 'Answer', text: 'The Stanley Cup was first awarded in 1893 to the Montreal Hockey Club of the AHAC (Amateur Hockey Association of Canada). The trophy was donated by Lord Stanley of Preston, the Governor General of Canada, who originally intended it as a challenge trophy for Canada\'s top amateur team. Professional teams were first allowed to compete in 1910, and the National Hockey League (founded 1917) took exclusive control of the Cup in 1926. The Montreal Canadiens have won the most Stanley Cups (24), followed by the Toronto Maple Leafs (13).' } },
        { '@type': 'Question', name: 'How does the Stanley Cup playoff format work?', acceptedAnswer: { '@type': 'Answer', text: '16 NHL teams qualify for the Stanley Cup Playoffs each season: the top 3 teams in each of the 4 divisions, plus the 2 remaining teams with the highest points totals as wild cards. The playoffs are best-of-7 series across 4 rounds: First Round (division winners vs wild cards), Second Round (intra-division), Conference Finals (intra-conference), and Stanley Cup Final (East vs West). All series within a round are played simultaneously; later rounds only start once prior rounds complete. The team that wins 4 series is the Stanley Cup champion. Approximately 90 playoff games are played over 2 months.' } },
        { '@type': 'Question', name: 'How is the Stanley Cup trophy itself made and presented?', acceptedAnswer: { '@type': 'Answer', text: 'The Stanley Cup is a silver alloy bowl mounted on a tiered barrel base. The original bowl (the "Dominion Hockey Challenge Cup") was crafted in 1892 by London silversmiths. Since 1958, the Cup has been re-engraved each year with the winning team\'s players, coaches, and staff. The Cup stands about 89 cm tall and weighs roughly 15.5 kg. Each player on the championship team gets to keep the Cup for 24 hours during the off-season — a tradition called "Day with the Cup." The trophy stays with the Hockey Hall of Fame in Toronto when not in use.' } },
        { '@type': 'Question', name: 'What is the Conn Smythe Trophy?', acceptedAnswer: { '@type': 'Answer', text: 'The Conn Smythe Trophy is awarded to the Most Valuable Player of the NHL playoffs. Named after Conn Smythe, the longtime owner-coach-manager of the Toronto Maple Leafs. The winner is selected by a panel of Professional Hockey Writers\' Association members at the conclusion of the Stanley Cup Final. Both the winning team\'s and losing team\'s players are eligible. Patrick Roy and Wayne Gretzky are tied with the most Conn Smythe wins (2 each); notable single-playoff winners include Sidney Crosby (2016), Justin Williams (2014, 2019), and Zdeno Chara (2011). The trophy is presented between the conclusion of the Final and the Cup presentation.' } },
        { '@type': 'Question', name: 'How can a team outside the playoffs still win the Stanley Cup?', acceptedAnswer: { '@type': 'Answer', text: 'They cannot — only NHL teams are eligible to compete for the Stanley Cup. The Cup is exclusively contested among the 16 NHL playoff teams each spring. Other leagues (AHL, ECHL, OHL, WHL, QMJHL) have their own trophies (Calder Cup, Kelly Cup, Memorial Cup, etc.). The only way a non-playoff team can win the Cup is via a "lucky loser" historical anomaly — there is no modern precedent; every Cup champion since 1926 has been the NHL playoff champion.' } },
      ]}) }} />

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>A 130-YEAR TROPHY</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>The Stanley Cup is the oldest professional sports trophy in North America. It pre-dates the NHL by 24 years. Lord Stanley of Preston — the Governor General of Canada — donated it in 1892 as a challenge trophy for the top amateur hockey club in Canada. The first winners were the Montreal Hockey Club in 1893.</p>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {[
            { year: '1893', event: 'First awarded to Montreal Hockey Club (AHAC)' },
            { year: '1910', event: 'Professional teams first allowed to compete' },
            { year: '1917', event: 'National Hockey League founded' },
            { year: '1926', event: 'NHL takes exclusive control of the Cup' },
            { year: '1942-43', event: 'Detroit Red Wings first NHL dynasty (back-to-back-to-back-to-back Cups)' },
            { year: '1958', event: 'First modern "Presentation Cup" introduced for re-engraving' },
            { year: '1967', event: 'Toronto Maple Leafs last Cup until 2022' },
            { year: '1993', event: 'Wayne Gretzky\'s final Cup with the Kings' },
            { year: '2024', event: 'Florida Panthers win the franchise\'s first Cup' },
          ].map((row, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '1rem', padding: '0.625rem 0.875rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '4px' }}>
              <span style={{ color: '#C8102E', fontSize: '0.875rem', fontWeight: 800 }}>{row.year}</span>
              <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.875rem', lineHeight: 1.55 }}>{row.event}</span>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>THE PLAYOFF FORMAT</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>16 teams qualify. 4 rounds. Best-of-7 throughout. The full playoff bracket takes ~2 months from the last regular-season game to the Cup presentation.</p>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {[
            { round: 'First Round', teams: '16 → 8', format: 'Best-of-7', note: 'Division winners vs wild cards. Generally plays out in 5-7 games per series.' },
            { round: 'Second Round', teams: '8 → 4', format: 'Best-of-7', note: 'Intra-division matchups. Often the most competitive round.' },
            { round: 'Conference Finals', teams: '4 → 2', format: 'Best-of-7', note: 'Eastern Conference Final and Western Conference Final. Best-of-7, with home-ice advantage to the higher-seeded team.' },
            { round: 'Stanley Cup Final', teams: '2 → 1', format: 'Best-of-7', note: 'East vs West. ~2 weeks. The team that wins 4 series is the Stanley Cup champion.' },
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
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>THE TROPHY ITSELF</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>The Stanley Cup has had three physical versions in its history. The current "Presentation Cup" was introduced in 1958 when the original bowl became too fragile to engrave. A second Presentation Cup was created in 1963 and is currently in use; the original Dominion Hockey Challenge Cup remains on display at the Hockey Hall of Fame in Toronto.</p>
        <ul style={{ color: '#aaa', lineHeight: 1.7, fontSize: '0.9375rem', paddingLeft: '1.25rem' }}>
          <li style={{ marginBottom: '0.5rem' }}><strong style={{ color: '#fff' }}>Dimensions:</strong> ~89 cm tall, ~15.5 kg, base diameter ~30 cm</li>
          <li style={{ marginBottom: '0.5rem' }}><strong style={{ color: '#fff' }}>Material:</strong> silver alloy (originally sterling silver; nickel alloy added over time) with a copper and zinc base</li>
          <li style={{ marginBottom: '0.5rem' }}><strong style={{ color: '#fff' }}>Engraving:</strong> each year's winning team, players, coaches, and training staff are engraved on the band. The Cup holds roughly 13 winning teams before the oldest are "retired" to the Hockey Hall of Fame.</li>
          <li style={{ marginBottom: '0.5rem' }}><strong style={{ color: '#fff' }}>Day with the Cup:</strong> tradition since 1995 — each player on the championship team gets to keep the Cup for 24 hours during the summer. Famous Cup photos include players swimming with it, taking it to school, showing it on the farm, and bringing it to hospital visits.</li>
        </ul>
      </section>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>CONN SMYTHE TROPHY</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>The Conn Smythe Trophy is awarded to the playoff MVP. Both winning and losing Final teams are eligible. Named after Conn Smythe, owner-coach-manager of the Toronto Maple Leafs from 1927 to 1961.</p>
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          {[
            { year: '2024', winner: 'Connor McDavid', team: 'Edmonton Oilers' },
            { year: '2023', winner: 'Jonathan Marchessault', team: 'Vegas Golden Knights' },
            { year: '2022', winner: 'Cale Makar', team: 'Colorado Avalanche' },
            { year: '2021', winner: 'Andrei Vasilevskiy', team: 'Tampa Bay Lightning' },
            { year: '2020', winner: 'Victor Hedman', team: 'Tampa Bay Lightning' },
            { year: '2019', winner: 'Ryan O\'Reilly', team: 'St. Louis Blues' },
          ].map((row, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '60px 1fr 1fr', gap: '1rem', padding: '0.625rem 0.875rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '4px' }}>
              <span style={{ color: '#C8102E', fontSize: '0.875rem', fontWeight: 800 }}>{row.year}</span>
              <span style={{ color: '#fff', fontSize: '0.875rem', fontWeight: 600 }}>{row.winner}</span>
              <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.875rem' }}>{row.team}</span>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>FRANCHISE LEADERS</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>The most successful franchises in Stanley Cup history.</p>
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          {[
            { rank: 1, team: 'Montreal Canadiens', cups: 24 },
            { rank: 2, team: 'Toronto Maple Leafs', cups: 13 },
            { rank: 3, team: 'Detroit Red Wings', cups: 11 },
            { rank: 4, team: 'Boston Bruins', cups: 6 },
            { rank: 5, team: 'Chicago Blackhawks', cups: 6 },
            { rank: 6, team: 'Pittsburgh Penguins', cups: 5 },
            { rank: 7, team: 'Edmonton Oilers', cups: 5 },
            { rank: 8, team: 'New York Islanders', cups: 4 },
            { rank: 9, team: 'Tampa Bay Lightning', cups: 3 },
            { rank: 10, team: 'Colorado Avalanche', cups: 3 },
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
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>FOLLOW THE PLAYOFFS</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>Browse the directory to find every NHL team and follow the playoff bracket.</p>
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          <Link href="/directory/teams?league=nhl" style={{ display: 'block', padding: '0.75rem 1rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '4px', color: '#C8102E', textDecoration: 'none', fontSize: '0.9375rem' }}>→ All 32 NHL teams</Link>
          <Link href="/standings/nhl" style={{ display: 'block', padding: '0.75rem 1rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '4px', color: '#C8102E', textDecoration: 'none', fontSize: '0.9375rem' }}>→ NHL standings and playoff bracket</Link>
          <Link href="/news/nhl/playoffs" style={{ display: 'block', padding: '0.75rem 1rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '4px', color: '#C8102E', textDecoration: 'none', fontSize: '0.9375rem' }}>→ NHL playoffs news and analysis</Link>
          <Link href="/guides/nhl-draft" style={{ display: 'block', padding: '0.75rem 1rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '4px', color: '#C8102E', textDecoration: 'none', fontSize: '0.9375rem' }}>→ NHL Draft Guide</Link>
        </div>
      </section>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>RELATED GUIDES</h2>
        <ul style={{ color: '#aaa', lineHeight: 1.7, fontSize: '0.9375rem', paddingLeft: '1.25rem' }}>
          <li style={{ marginBottom: '0.4rem' }}><Link href="/guides/nhl-draft" style={{ color: '#C8102E' }}>NHL Draft Guide</Link> — eligibility, rounds, combine</li>
          <li style={{ marginBottom: '0.4rem' }}><Link href="/guides/hockey-positions-explained" style={{ color: '#C8102E' }}>Hockey Positions Explained</Link></li>
          <li style={{ marginBottom: '0.4rem' }}><Link href="/guides/hockey-development-explained" style={{ color: '#C8102E' }}>Hockey Development Explained</Link></li>
          <li style={{ marginBottom: '0.4rem' }}><Link href="/guides/hockey-tryout-guide" style={{ color: '#C8102E' }}>Hockey Tryout Guide</Link></li>
        </ul>
      </section>
    </div>
  );
}
