import type { Metadata } from 'next';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';

// 2026-10-09: New special league page. Source: Wikipedia (List of
// HockeyAllsvenskan seasons), hockeyallsvenskan.se. 12 teams. Founded
// 1999-2000 (modern format). Sweden's second tier. Björklöven defending
// 2025-26 champion. Promotes 1 team to SHL annually.

const HA_LEAGUE_ID = 'c0acef53-de91-458b-af73-601e07e92edf';

async function getHaTeamCount(): Promise<number> {
  try {
    const { count } = await supabaseAdmin
      .from('team_workspaces')
      .select('id', { count: 'exact', head: true })
      .eq('league_id', HA_LEAGUE_ID)
      .eq('is_active', true);
    return count ?? 0;
  } catch {
    return 0;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const teamCount = await getHaTeamCount();
  return {
    title: teamCount > 0
      ? `HockeyAllsvenskan 2026-27 — ${teamCount} Teams, Standings & Schedule | RinkStop`
      : 'HockeyAllsvenskan 2026-27 — Standings, Schedule & Teams',
    description: teamCount > 0
      ? `HockeyAllsvenskan 2026-27: ${teamCount} teams across Sweden. Sweden\'s second-tier professional hockey league, modern format since 2005-06. Björklöven defending 2025-26 champion. Promotes 1 team to SHL annually.`
      : 'HockeyAllsvenskan 2026-27: 12 teams across Sweden. Sweden\'s second-tier professional hockey league, modern format since 2005-06. Björklöven defending 2025-26 champion.',
  };
}

export default async function HaPage() {
  const teamCount = await getHaTeamCount();
  const teamLabel = teamCount > 0 ? `${teamCount} TEAMS` : '12 TEAMS';

  return (
    <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@graph': [{
            '@type': 'SportsOrganization',
            '@id': 'https://rinkstop.com/directory/hockey-allsvenskan-sweden',
            name: 'HockeyAllsvenskan',
            url: 'https://rinkstop.com/directory/hockey-allsvenskan-sweden',
            sport: 'Ice hockey',
            description: 'HockeyAllsvenskan — the second-tier professional ice hockey league in Sweden, modern format since 2005-06. 12 teams for 2026-27. IF Björklöven defending 2025-26 champion. Promotes 1 team to SHL annually.',
            foundingDate: '2005',
            location: { '@type': 'Place', name: 'Sweden' },
            sameAs: ['https://en.wikipedia.org/wiki/HockeyAllsvenskan'],
          }, {
            '@type': 'FAQPage',
            mainEntity: [
              {
                '@type': 'Question',
                name: 'How many teams play in HockeyAllsvenskan?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'HockeyAllsvenskan fields 12 teams for 2026-27. The 12 teams are spread across Sweden&apos;s second-tier hockey markets, including IF Björklöven (Umeå), Djurgårdens IF (Stockholm), AIK (Stockholm), IF Malmö Redhawks, Västerås IK, MODO Hockey (Örnsköldsvik), Södertälje FK, Mora IK, HC Oskarshamn, BIK Karlskoga, and Tingsryds AIF. Djurgårdens IF returned to the SHL in 2024-25 after three seasons in the Allsvenskan.',
                },
              },
              {
                '@type': 'Question',
                name: 'When was HockeyAllsvenskan founded?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'The Allsvenskan name was first used officially in 1983 for a spring tournament for top Division I teams. The league became a stand-alone second tier for the 1999-2000 season, divided into northern and southern groups with a SuperAllsvenskan playoff. The modern HockeyAllsvenskan format (single 14-team league, now 12 teams) was adopted for the 2005-06 season, replacing the two-group structure.',
                },
              },
              {
                '@type': 'Question',
                name: 'Who has won the most HockeyAllsvenskan championships?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'IF Björklöven is the most successful modern-era HockeyAllsvenskan team with 3 titles (2017-18, 2021-22, 2025-26). Leksand IF has 5 titles (2007-08, 2008-09, 2009-10, 2012-13, 2015-16). Other recent champions include Djurgårdens IF, Brynäs IF, Modo, and Timrå IK. The Allsvenskan champion is promoted to the SHL after a final series against the SHL&apos;s last-place team.',
                },
              },
              {
                '@type': 'Question',
                name: 'What is the format of HockeyAllsvenskan?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'The Allsvenskan regular season runs from September to March, with each of the 12 teams playing 52 games (4 meetings with each opponent, 2 home and 2 away). The top teams qualify for the Allsvenskan playoffs, with the champion playing the SHL&apos;s last-place team in a promotion/relegation series. Since 2014, the Allsvenskan has used a playoff system (best-of-7 finals) rather than the previous direct promotion format.',
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
        <span style={{ color: 'rgba(255,255,255,0.6)' }}>HockeyAllsvenskan</span>
      </nav>

      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: '#fff', letterSpacing: '0.02em', lineHeight: 1, fontFamily: '"Bebas Neue", sans-serif' }}>
          HockeyAllsvenskan
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.95rem', marginTop: '0.5rem', maxWidth: '780px' }}>
          {teamLabel} across Sweden. The second-tier professional ice hockey league in Sweden. Modern format since 2005-06. IF Björklöven defending 2025-26 champion. Promotes 1 team to SHL annually. Primary development path for Swedish hockey talent below the SHL.
        </p>
      </div>

      <section style={{ marginBottom: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '0.75rem' }}>
          {teamLabel} • HOCKEYALLSVENSKAN 2026-27
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1rem' }}>
          The 12 HockeyAllsvenskan clubs represent Sweden&apos;s second-tier hockey markets. <strong>IF Björklöven</strong> (Umeå) is the defending 2025-26 champion and most successful modern-era team. <strong>Leksand IF</strong> holds the record with 5 modern-era titles. Other notable clubs include Djurgårdens IF (Stockholm, SHL returnee 2024-25), AIK (Stockholm, 1-time champion 2009-10), MODO Hockey (Örnsköldsvik, 2022-23 champion), Södertälje FK, Mora IK, and BIK Karlskoga.
        </p>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', lineHeight: 1.6 }}>
          Marquee Allsvenskan arenas: Fjällräven Center (Örnsköldsvik, MODO home, capacity 7,600), A3 Arena (Mora, capacity 4,500), and the various Stockholm arenas. The Allsvenskan has historically been a development path for SHL-bound Swedish talent, with most SHL rosters featuring 3-5 former Allsvenskan players. The 2014-15 season was a watershed for the Allsvenskan — three teams (Karlskrona, Rögle, Malmö) were promoted to the SHL, the most ever in a single year, and the league&apos;s playoff format was introduced.
        </p>
      </section>

      <section style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>HOCKEYALLSVENSKAN HISTORY</h2>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9375rem', lineHeight: 1.75 }}>
          <p style={{ marginBottom: '1rem' }}>
            The Allsvenskan name was first used unofficially in early Swedish hockey history, but was officially adopted in 1983 for a spring tournament for the best-ranked teams from Division I (the second tier at the time). The tournament allowed Division I teams to compete in a playoff-like format, with the winner often earning the right to challenge the Elitserien&apos;s last-place team for promotion. The 1982-83 season was the first official Allsvenskan, and the tournament was held annually through 1999.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            The Allsvenskan became a stand-alone second-tier league for the 1999-2000 season, divided into northern and southern groups of 12 teams each. The top 4 teams from each group advanced to the SuperAllsvenskan playoff. The split-group format was unpopular with teams and fans — the northern and southern champions rarely met in the final, and the geographic separation made cross-group rivalries difficult to develop. The two groups merged into a single 16-team HockeyAllsvenskan for the 2005-06 season, which was renamed simply "HockeyAllsvenskan" to reflect the unified format.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            The Allsvenskan&apos;s most successful modern-era club is Leksand IF, which won 5 titles in 9 seasons (2007-08 through 2015-16) before being promoted to the SHL. IF Björklöven has won 3 modern-era titles (2017-18, 2021-22, 2025-26) and is the most successful current Allsvenskan club. Other recent champions include Södertälje (2006-07), Växjö (2010-11), Rögle (2007-08 and 2011-12), Leksand (2012-13 and 2015-16), Mora (2016-17), Timrå (2017-18 and 2020-21), HV71 (2021-22), Modo (2022-23), Brynäs (2023-24), Djurgården (2024-25), and Björklöven (2025-26).
          </p>
          <p>
            The 2014-15 season was a watershed for the Allsvenskan — three teams (Karlskrona, Rögle, Malmö) were promoted to the SHL in the same year, the most ever, and the Allsvenskan&apos;s playoff format was formalized. Karlskrona defeated Västerås 3-1 in the Allsvenskan final to earn direct promotion; Rögle then defeated Västerås in a direct qualification match, and Malmö won a 7-game series against Leksand. The 2014-15 promotion wave expanded the SHL to 14 teams (where it has remained) and demonstrated the Allsvenskan&apos;s role as a serious second tier. The league continues to develop Swedish hockey talent — most SHL rosters feature 3-5 former Allsvenskan players, and the Allsvenskan&apos;s salary cap is approximately 1/4 of the SHL&apos;s.
          </p>
        </div>
      </section>

      <section style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>HOW HOCKEYALLSVENSKAN WORKS</h2>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9375rem', lineHeight: 1.75 }}>
          <p style={{ marginBottom: '1rem' }}>
            The HockeyAllsvenskan regular season runs from September to early March, with each of the 12 teams playing 52 games (4 meetings with each opponent, 2 home and 2 away). The schedule is balanced geographically — the Allsvenskan&apos;s teams span from MODO in northern Örnsköldsvik to Malmö in southern Sweden, requiring long bus trips but reducing cross-country travel compared to the SHL. The 2024-25 season regular season featured 312 games total.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            The top 6 teams in the regular-season standings qualify for the Allsvenskan playoffs, with the top 2 receiving byes to the semifinals. The quarterfinals, semifinals, and finals are best-of-7 series. The Allsvenskan playoff champion then plays the SHL&apos;s last-place team in a best-of-7 promotion series, with the winner earning the SHL spot for the following season. Since 2014, the Allsvenskan has used a playoff system rather than the previous direct promotion format — a change that has made the Allsvenskan playoff more competitive and more attractive to fans.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            Allsvenskan rosters are typically 22-25 players per team. The league has a soft salary cap of approximately 6-8 million SEK (roughly $600,000-$800,000 USD) per team — significantly less than the SHL&apos;s cap but sufficient to attract quality Swedish players. The Allsvenskan&apos;s import rules allow 2-4 import players, with most imports coming from North America, the Czech Republic, and other European countries. The Allsvenskan&apos;s modest budget makes it a key development league for young Swedish players (typically 18-22) who are working their way toward SHL or NHL careers.
          </p>
          <p>
            HockeyAllsvenskan games are broadcast on various Swedish regional sports networks and on the SHL&apos;s streaming platform (which includes Allsvenskan games as part of the broader Swedish hockey package). The 2025-26 Allsvenskan season featured 312 regular season games plus playoffs, with the championship between IF Björklöven and a yet-to-be-decided opponent (as of the 2026-27 season start). The Allsvenskan&apos;s role as the development path for Swedish hockey below the SHL makes it a critical part of Sweden&apos;s hockey ecosystem, and the league&apos;s promotion series with the SHL is one of the most-watched annual events in Swedish sports.
          </p>
        </div>
      </section>

      <section style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.85rem', lineHeight: 1.6, margin: 0 }}>
          <strong style={{ color: 'rgba(255,255,255,0.7)' }}>Editorial standards.</strong> By Arnel Larracas, Founder &amp; Editor-in-Chief, RinkStop. Last reviewed 2026-10-09.<br />
          <strong style={{ color: 'rgba(255,255,255,0.7)' }}>Data sources.</strong> Team count from RinkStop team_workspaces table. Founded 2005-06 (modern format), 1983 (original Allsvenskan), 2014-15 3-team promotion: Wikipedia (List of HockeyAllsvenskan seasons), hockeyallsvenskan.se.<br />
          <span style={{ color: 'rgba(255,255,255,0.45)' }}><Link href="/editorial-policy" style={{ color: '#FFB81C' }}>Editorial policy</Link> · <Link href="/data-methodology" style={{ color: '#FFB81C' }}>Data methodology</Link> · <Link href="/corrections" style={{ color: '#FFB81C' }}>Report a correction</Link></span>
        </p>
      </section>
    </main>
  );
}
