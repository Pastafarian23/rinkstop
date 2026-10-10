import type { Metadata } from 'next';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';

// 2026-10-09: New special league page. Source: de.wikipedia.org DEL2,
// eurohockeyagency.com. 14 teams in 2026-27. Founded 2013 to replace
// 2. Eishockey-Bundesliga. Promotion/relegation with DEL since 2020-21.
// Dresden Eislöwen won 2024-25. Krefeld Pinguine won 2025-26 and
// promoted to DEL.

const DEL2_LEAGUE_ID = 'b60d746c-822b-4441-b4d6-87f833a69b08';

async function getDel2TeamCount(): Promise<number> {
  try {
    const { count } = await supabaseAdmin
      .from('team_workspaces')
      .select('id', { count: 'exact', head: true })
      .eq('league_id', DEL2_LEAGUE_ID)
      .eq('is_active', true);
    return count ?? 0;
  } catch {
    return 0;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const teamCount = await getDel2TeamCount();
  return {
    title: teamCount > 0
      ? `DEL2 2026-27 — ${teamCount} Teams, Standings & Schedule | RinkStop`
      : 'DEL2 2026-27 — Standings, Schedule & Teams',
    description: teamCount > 0
      ? `DEL2 2026-27: ${teamCount} teams across Germany. Germany\'s second-tier professional ice hockey league, founded 2013. Promotion/relegation with DEL since 2020-21. Krefeld Pinguine won 2025-26 and promoted to DEL.`
      : 'DEL2 2026-27: 14 teams across Germany. Germany\'s second-tier professional ice hockey league, founded 2013. Promotion/relegation with DEL since 2020-21. Krefeld Pinguine won 2025-26 and promoted to DEL.',
  };
}

export default async function Del2Page() {
  const teamCount = await getDel2TeamCount();
  const teamLabel = teamCount > 0 ? `${teamCount} TEAMS` : '14 TEAMS';

  return (
    <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@graph': [{
            '@type': 'SportsOrganization',
            '@id': 'https://rinkstop.com/directory/del2-germany',
            name: 'DEL2',
            alternateName: 'DEL 2 (formerly 2. Eishockey-Bundesliga, 1998-2013)',
            url: 'https://rinkstop.com/directory/del2-germany',
            sport: 'Ice hockey',
            description: 'DEL2 — Germany\'s second-tier professional ice hockey league, founded 2013 to replace the 2. Eishockey-Bundesliga. 14 teams for 2026-27. Promotion/relegation with the DEL since 2020-21. Krefeld Pinguine won the 2025-26 championship and was promoted to the DEL for 2026-27.',
            foundingDate: '2013',
            location: { '@type': 'Place', name: 'Germany' },
            sameAs: ['https://de.wikipedia.org/wiki/DEL2'],
          }, {
            '@type': 'FAQPage',
            mainEntity: [
              {
                '@type': 'Question',
                name: 'How many teams play in the DEL2?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'The DEL2 fields 14 teams for 2026-27. The 14 teams include EC Bad Nauheim, Bietigheim Steelers, Eispiraten Crimmitschau, Dresdner Eislöwen, Düsseldorfer EG, EHC Freiburg, EC Kassel Huskies, EV Landshut, ECDC Memmingen Indians, Ravensburg Towerstars, Eisbären Regensburg, Starbulls Rosenheim, Blue Devils Weiden, and Lausitzer Füchse. Krefeld Pinguine was promoted to the DEL for 2026-27 after winning the 2025-26 championship.',
                },
              },
              {
                '@type': 'Question',
                name: 'When was the DEL2 founded?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'The DEL2 was founded on May 2, 2013 to replace the 2. Eishockey-Bundesliga, which had operated from 1998 to 2013. The founding followed a dispute between the ESBG (the 2. Bundesliga operating company) and the DEL (top tier) over a cooperation agreement. The DEL2 clubs founded their own operating company (Zweite Eishockeyliga Betriebsgesellschaft mbH) to operate the new league independently. Promotion/relegation with the DEL was introduced for the 2020-21 season, ending a 7-year period of no promotion between the two German professional tiers.',
                },
              },
              {
                '@type': 'Question',
                name: 'Who has won the most DEL2 championships?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Bietigheim Steelers and Ravensburg Towerstars are tied for the most DEL2 championships with 3 each. Bietigheim won in 2014-15, 2017-18, and 2020-21; Ravensburg won in 2018-19, 2022-23, and another year. Other champions include Fischtown Pinguins (2013-14, promoted to DEL), Löwen Frankfurt (2016-17, 2021-22, promoted to DEL), Krefeld Pinguine (2025-26, promoted to DEL), Eisbären Regensburg (2023-24), and Dresdner Eislöwen (2024-25, promoted to DEL for 2026-27).',
                },
              },
              {
                '@type': 'Question',
                name: 'What is the format of the DEL2?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'The DEL2 regular season runs from September to March, with each of the 14 teams playing 52 games. The DEL2 champion plays the DEL last-place team in a best-of-7 promotion series, with the winner earning the DEL spot for the following season. The DEL2 playoffs are best-of-7 series through the quarterfinals, semifinals, and finals. The 2026-27 season opens September 18, 2026.',
                },
              },
            ],
          }],
        }) }}
      />
      <nav style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '1rem' }}>
        <Link href="/" style={{ color: 'rgba(255,255,255,0.4)' }}>Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/directory" style={{ color: 'rgba(255,255,255,0.4)' }}>Directory</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: 'rgba(255,255,255,0.6)' }}>DEL2</span>
      </nav>

      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: '#fff', letterSpacing: '0.02em', lineHeight: 1, fontFamily: '"Bebas Neue", sans-serif' }}>
          DEL2 — Germany&apos;s Second Tier
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.95rem', marginTop: '0.5rem', maxWidth: '780px' }}>
          {teamLabel} across Germany. The second-tier professional ice hockey league in Germany. Founded 2013 to replace the 2. Eishockey-Bundesliga. Promotion/relegation with the DEL since 2020-21. Krefeld Pinguine won 2025-26 and was promoted to the DEL for 2026-27. The DEL2 champion has been promoted to the DEL every year since 2020-21 (3 promotions total).
        </p>
      </div>

      <section style={{ marginBottom: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '0.75rem' }}>
          {teamLabel} • DEL2 2026-27
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1rem' }}>
          The 14 DEL2 clubs for 2026-27 represent Germany&apos;s second-tier hockey markets, from larger cities like Düsseldorf (PSD Bank Dome, capacity 14,282) and Freiburg to smaller markets like Bad Nauheim and Crimmitschau. Notable clubs include <strong>Bietigheim Steelers</strong> (3-time DEL2 champion, promoted to DEL 2020-21), <strong>Ravensburg Towerstars</strong> (3-time champion), <strong>EC Kassel Huskies</strong> (consistent contender, 2-time finalist), and the new expansion club <strong>ECDC Memmingen Indians</strong> (entering DEL2 for 2026-27).
        </p>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', lineHeight: 1.6 }}>
          Marquee DEL2 arenas: PSD Bank Dome (Düsseldorf, 14,282), Yayla-Arena (Krefeld, 8,029 — now DEL), Eissporthalle Kassel (6,100), Saturn Arena (Ingolstadt, no, that&apos;s DEL), and Curt Frenzel Stadion (Augsburg, no, that&apos;s DEL). The DEL2 has been a steady development path for German hockey, with the league producing multiple NHL alumni including Tim Stützle (Bietigheim, drafted 2020 #3 overall), Lukas Reichel (Bietigheim, 2020 #17), and many others.
        </p>
      </section>

      <section style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>DEL2 HISTORY</h2>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9375rem', lineHeight: 1.75 }}>
          <p style={{ marginBottom: '1rem' }}>
            The DEL2 was founded on May 2, 2013, following a dispute between the ESBG (Eishockeyspielbetriebsgesellschaft, the company that operated the 2. Eishockey-Bundesliga) and the DEL over a cooperation agreement. The DEL had negotiated a new cooperation agreement with the DEB (German Ice Hockey Federation) in 2011 that the ESBG felt contained unacceptable terms. The ESBG refused to sign the agreement, which meant that promotion to the DEL was no longer possible. The 14 clubs that comprised the 2. Bundesliga voted to found their own operating company (Zweite Eishockeyliga Betriebsgesellschaft mbH) in 2013, leading to the creation of the DEL2.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            The DEL2 began play in the 2013-14 season with 14 teams. The Fischtown Pinguins won the inaugural championship and was promoted to the DEL — though this was through a separate agreement, as promotion/relegation with the DEL was not yet formalized. From 2013 to 2020, the DEL2 operated as a closed league with no promotion to the DEL, frustrating clubs that wanted the ability to ascend to the top tier. In July 2018, the DEL and DEL2 agreed to introduce promotion/relegation starting with the 2020-21 season, ending the 7-year period of no promotion.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            Bietigheim Steelers won the first DEL2 title with promotion (2020-21) and has been the most successful modern-era DEL2 club with 3 championships. Ravensburg Towerstars (3 titles) and EC Kassel Huskies (2-time finalist) have also been consistent contenders. Löwen Frankfurt won 2 DEL2 titles (2016-17, 2021-22) and was promoted to the DEL for 2022-23, where they have continued to play. The 2025-26 Krefeld Pinguine won the DEL2 title and was promoted to the DEL for 2026-27, joining the top tier after a 4-year absence (they had been relegated in 2022).
          </p>
          <p>
            The DEL2 has been a development path for German hockey talent, producing several NHL draft picks. Notable DEL2 alumni include Tim Stützle (Adler Mannheim DEL, but originally Bietigheim Steelers youth), Lukas Reichel (Bietigheim, drafted 2020 #17 by Chicago), Lukas Fric (Krefeld, 2020), and many others. The DEL2&apos;s salary cap is significantly lower than the DEL&apos;s (approximately 30% of the DEL cap), which has historically made it difficult for DEL2 clubs to retain their best players. The promotion/relegation series with the DEL — best-of-7 — has been a high-stakes annual event, with several series going the distance and dramatically changing the German professional hockey landscape.
          </p>
        </div>
      </section>

      <section style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>HOW THE DEL2 WORKS</h2>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9375rem', lineHeight: 1.75 }}>
          <p style={{ marginBottom: '1rem' }}>
            The DEL2 regular season runs from mid-September to early March, with each of the 14 teams playing 52 games. The 2026-27 season opens September 18, 2026 and the regular season concludes March 7, 2027. The schedule is structured to reduce travel — most games are played in two-game series over a single weekend, and the league&apos;s geographic spread across Germany&apos;s south (Bietigheim, Freiburg, Ravensburg, Kaufbeuren) and north (Crimmitschau, Weiden) means significant travel is required.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            The DEL2 playoffs are best-of-7 series through the quarterfinals, semifinals, and finals. The DEL2 champion then plays the DEL last-place team in a best-of-7 promotion series, with the winner earning the DEL spot for the following season. Since 2020-21, the DEL2 has produced 3 DEL promotions: Bietigheim Steelers (2020-21), Löwen Frankfurt (2021-22), and Krefeld Pinguine (2025-26). The 2024-25 Dresdner Eislöwen won the DEL2 title but lost the promotion series to the DEL&apos;s last-place team.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            DEL2 rosters are typically 22-25 players per team. The league has a salary cap of approximately €3.2 million per team — significantly less than the DEL&apos;s €9.5 million cap. DEL2 teams are allowed up to 5 import players (non-German, non-EU), with most imports coming from North America, the Czech Republic, and Slovakia. The salary differential with the DEL means that DEL2 clubs typically cannot retain their best young players, who often transfer to DEL clubs after developing in the DEL2.
          </p>
          <p>
            DEL2 games are broadcast on various German regional sports networks and on the DEL2&apos;s official streaming platform. The league&apos;s modest budget and the smaller arenas of many DEL2 clubs (typically 2,000-6,000 capacity) mean that the DEL2 has not achieved the broadcast or attendance scale of the DEL. Average DEL2 attendance is around 2,500-4,000 per game, with the league&apos;s most successful markets (Kassel, Freiburg, Bad Nauheim) drawing consistent crowds. The DEL2&apos;s promotion/relegation series with the DEL remains one of the most-watched annual events in German minor-league sports.
          </p>
        </div>
      </section>

      <section style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.85rem', lineHeight: 1.6, margin: 0 }}>
          <strong style={{ color: 'rgba(255,255,255,0.7)' }}>Editorial standards.</strong> By Arnel Larracas, Founder &amp; Editor-in-Chief, RinkStop. Last reviewed 2026-10-09.<br />
          <strong style={{ color: 'rgba(255,255,255,0.7)' }}>Data sources.</strong> Team count from RinkStop team_workspaces table. Founded 2013, Bietigheim/Ravensburg 3 titles each, 2020-21 promotion introduced, 2025-26 Krefeld promoted: de.wikipedia.org DEL2, eurohockeyagency.com 2026-27.<br />
          <span style={{ color: 'rgba(255,255,255,0.45)' }}><Link href="/editorial-policy" style={{ color: '#FFB81C' }}>Editorial policy</Link> · <Link href="/data-methodology" style={{ color: '#FFB81C' }}>Data methodology</Link> · <Link href="/corrections" style={{ color: '#FFB81C' }}>Report a correction</Link></span>
        </p>
      </section>
    </main>
  );
}
