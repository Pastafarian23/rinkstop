import type { Metadata } from 'next';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';

// 2026-10-09: New special league page. Source: Wikipedia (Czech Extraliga).
// Founded 1993 after Czechoslovakia dissolution. 14 teams. Tipsport Extraliga
// (sponsored). 1995-96 expansion to 14 teams. Kometa Brno 14 overall titles,
// VHK Vsetín + Třinec 6 each in ELH era. Pardubice defending 2025-26.

const CZ_LEAGUE_ID = '472f3ee6-8cd2-446d-9e68-7d67ef629dd3';

async function getCzTeamCount(): Promise<number> {
  try {
    const { count } = await supabaseAdmin
      .from('team_workspaces')
      .select('id', { count: 'exact', head: true })
      .eq('league_id', CZ_LEAGUE_ID)
      .eq('is_active', true);
    return count ?? 0;
  } catch {
    return 0;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const teamCount = await getCzTeamCount();
  return {
    title: teamCount > 0
      ? `Czech Extraliga 2026-27 — ${teamCount} Teams, Standings & Schedule | RinkStop`
      : 'Czech Extraliga 2026-27 — Standings, Schedule & Teams',
    description: teamCount > 0
      ? `Czech Extraliga (Tipsport Extraliga) 2026-27: ${teamCount} teams across the Czech Republic. Top professional hockey league, founded 1993. Pardubice defending 2025-26 champion. Kometa Brno 14 overall titles.`
      : 'Czech Extraliga (Tipsport Extraliga) 2026-27: 14 teams across the Czech Republic. Top professional hockey league, founded 1993. Pardubice defending 2025-26 champion.',
  };
}

export default async function ExtraligaCzPage() {
  const teamCount = await getCzTeamCount();
  const teamLabel = teamCount > 0 ? `${teamCount} TEAMS` : '14 TEAMS';

  return (
    <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@graph': [{
            '@type': 'SportsOrganization',
            '@id': 'https://rinkstop.com/directory/extraliga-cz',
            name: 'Czech Extraliga',
            alternateName: 'Tipsport Extraliga ledního hokeje (ELH)',
            url: 'https://rinkstop.com/directory/extraliga-cz',
            sport: 'Ice hockey',
            description: 'Czech Extraliga (ELH) — the top professional ice hockey league in the Czech Republic, founded 1993 following the dissolution of Czechoslovakia. 14 teams. Pardubice defending 2025-26 champion. Kometa Brno most successful with 14 overall titles.',
            foundingDate: '1993',
            location: { '@type': 'Place', name: 'Czech Republic' },
            sameAs: ['https://en.wikipedia.org/wiki/Czech_Extraliga'],
          }, {
            '@type': 'FAQPage',
            mainEntity: [
              {
                '@type': 'Question',
                name: 'How many teams play in the Czech Extraliga?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'The Czech Extraliga fields 14 teams across the Czech Republic. The league has maintained 14 teams since the 1995-96 expansion. The 14 teams include HC Kometa Brno, HC Oceláři Třinec, HC Dynamo Pardubice, Mountfield HK, HC Energie Karlovy Vary, HC Verva Litvínov, HC Škoda Plzeň, Bílí Tygři Liberec, HC Olomouc, PSG Berani Zlín, HC Kometa Brno, Rytíři Kladno, HC Stadion Litoměřice, and HC Motor České Budějovice.',
                },
              },
              {
                '@type': 'Question',
                name: 'When was the Czech Extraliga founded?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'The Czech Extraliga was founded in 1993 following the peaceful dissolution of Czechoslovakia on January 1, 1993. The Czechoslovak Extraliga&apos;s 1992-93 season was completed by all Czech and Slovak teams, and the two successor leagues (Czech Extraliga and Slovak Extraliga) began play the following season. HC Olomouc won the inaugural 1993-94 Czech Extraliga championship.',
                },
              },
              {
                '@type': 'Question',
                name: 'Who has won the most Czech Extraliga championships?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'HC Kometa Brno has won the most Czech Extraliga championships with 14 overall titles (combining Czechoslovak and Czech era). In the modern Czech Extraliga era (1993-present), VHK Vsetín and HC Oceláři Třinec are tied with 6 titles each, with HC Oceláři Třinec most recently winning in 2024. Pardubice is the defending 2025-26 champion, their 4th title.',
                },
              },
              {
                '@type': 'Question',
                name: 'What is the format of the Czech Extraliga?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'The Czech Extraliga regular season runs from September to April, with each of the 14 teams playing 52 games. The top 6 teams qualify for the playoffs directly, teams 7-10 play a play-in series, and teams 11-14 enter a play-out group. The playoffs use best-of-7 series through the quarterfinals, semifinals, and finals. The 14th-place team after the play-out group plays a best-of-7 series against the winner of the Czech 1. liga (second tier) for promotion/relegation.',
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
        <span style={{ color: 'rgba(255,255,255,0.6)' }}>Czech Extraliga</span>
      </nav>

      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: '#fff', letterSpacing: '0.02em', lineHeight: 1, fontFamily: '"Bebas Neue", sans-serif' }}>
          Czech Extraliga (Tipsport Extraliga)
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.95rem', marginTop: '0.5rem', maxWidth: '780px' }}>
          {teamLabel} across the Czech Republic. Founded 1993. The top professional ice hockey league in the Czech Republic. Pardubice defending 2025-26 champion. Kometa Brno 14 overall titles. Tipsport is the league&apos;s long-time title sponsor.
        </p>
      </div>

      <section style={{ marginBottom: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '0.75rem' }}>
          {teamLabel} • CZECH EXTRALIGA 2026-27
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1rem' }}>
          The 14 Czech Extraliga clubs represent all major Czech hockey markets. <strong>HC Kometa Brno</strong> (Brno) holds the record 14 overall titles, including Czechoslovak-era championships. <strong>HC Oceláři Třinec</strong> (Třinec) is a modern-era force with 6 ELH titles. <strong>HC Dynamo Pardubice</strong> is the defending 2025-26 champion (their 4th title). Other notable clubs include Mountfield HK (Hradec Králové), HC Škoda Plzeň (Plzeň), HC Energie Karlovy Vary, and HC Verva Litvínov.
        </p>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', lineHeight: 1.6 }}>
          Marquee Czech arenas: CEZ Arena (Pardubice, capacity 10,194), Tipsport Arena (Litvínov, 7,000), Werk Arena (Třinec, 5,400), and the newly renovated Winning Group Arena (Brno). The Czech Extraliga is the highest-attended hockey league in Europe per capita, with average attendance around 6,000+ per game. The 2026-27 season follows a playoff structure where the top 6 teams advance to the best-of-7 quarterfinals, with teams 7-10 playing best-of-5 play-in series for the remaining two spots.
        </p>
      </section>

      <section style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>CZECH EXTRALIGA HISTORY</h2>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9375rem', lineHeight: 1.75 }}>
          <p style={{ marginBottom: '1rem' }}>
            The Czech Extraliga was founded in 1993 following the peaceful dissolution of Czechoslovakia on January 1, 1993. The 1992-93 Czechoslovak Extraliga season — the final season of the unified league — was completed by all Czech and Slovak teams, with the Czechoslovak championship being decided in that final season. The two successor leagues (Czech Extraliga and Slovak Extraliga) launched the following 1993-94 season. HC Olomouc won the inaugural Czech Extraliga championship, defeating HC Pardubice 3 games to 1 in the final.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            The league expanded from 12 to 14 teams in 1995-96 and has remained at 14 teams ever since — the only expansion in the league&apos;s history. The Extraliga has been sponsored by Tipsport (a Czech betting company) under the name Tipsport Extraliga ledního hokeje (ELH) since 2003. The Tipsport brand has been a long-term partner of the league and is one of the most visible sponsors in Czech professional sports.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            The modern Extraliga era has been dominated by three clubs: HC Kometa Brno, VHK Vsetín (now defunct), and HC Oceláři Třinec. Kometa Brno has 14 overall titles (combining Czechoslovak and Czech era) and is the most successful club. VHK Vsetín won 6 Czech Extraliga titles in 7 seasons (1997-2003) before being dissolved in 2004. Třinec has won 6 modern-era titles, with their most recent in 2024. Other recent champions include HC Dynamo Pardubice (4 titles, defending 2025-26), HC Bílí Tygři Liberec (2 titles, 2016 and 2021), and HC Škoda Plzeň (1 title, 2013).
          </p>
          <p>
            The Czech Extraliga has long been one of the most successful European leagues in developing NHL talent. Famous Czech Extraliga alumni include Jaromír Jágr, Dominik Hašek, Robert Reichel, Patrik Eliáš, Martin Brodeur (briefly played in the Czech league as part of the 1998 lockout), David Pastrňák (Boston Bruins), and current NHL stars like Martin Nečas (Colorado Avalanche) and Filip Forsberg (Nashville Predators). The IIHF has ranked the Extraliga among the top European leagues for decades, and the Czech national team has won gold at the 1998 Nagano Olympics and multiple IIHF World Championships (1996, 1999, 2000, 2001, 2005, 2010).
          </p>
        </div>
      </section>

      <section style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>HOW THE CZECH EXTRALIGA WORKS</h2>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9375rem', lineHeight: 1.75 }}>
          <p style={{ marginBottom: '1rem' }}>
            The Czech Extraliga regular season runs from September to April, with each of the 14 teams playing 52 games. The schedule is weighted to reduce travel — most games are played in two-game series over a single weekend (Friday-Saturday or Saturday-Sunday) at one team&apos;s home arena. The Extraliga is the most-attended hockey league in Europe per capita, with average attendance around 6,000+ per game and playoff games regularly selling out the larger arenas.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            The top 6 teams in the regular-season standings advance directly to the best-of-7 quarterfinals. Teams finishing 7th through 10th play a best-of-5 play-in series for the remaining 2 spots in the quarterfinals. Teams 11th through 14th enter a play-out group, where they play an additional 12 games to determine the final standings. The 14th-place team after the play-out group plays a best-of-7 series against the winner of the Czech 1. liga (second tier) for promotion/relegation.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            Extraliga rosters are typically 25-28 players per team. The league has a soft salary cap and a luxury-tax system that requires teams exceeding a certain payroll threshold to pay into a league-wide distribution fund. The cap structure is designed to maintain competitive balance — the Extraliga has had 6 different champions in the last 8 seasons. Czech Extraliga players are a major source of NHL talent — in the 2025 NHL Entry Draft, 7 Czech Extraliga players were selected in the first 3 rounds, including multiple first-round picks.
          </p>
          <p>
            Czech Extraliga games are broadcast on Česká televize (Czech public television) and on O2 TV, with select games on Fanseat and HockeyTV. The Tipsport Extraliga is the most-watched professional hockey league in the Czech Republic, drawing 1+ million regular-season viewers on Česká televize. The league&apos;s competitiveness — combined with the Czech national team&apos;s success at the World Championships and Olympics — has made the Extraliga the cultural centerpiece of Czech professional sports.
          </p>
        </div>
      </section>

      <section style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.85rem', lineHeight: 1.6, margin: 0 }}>
          <strong style={{ color: 'rgba(255,255,255,0.7)' }}>Editorial standards.</strong> By Arnel Larracas, Founder &amp; Editor-in-Chief, RinkStop. Last reviewed 2026-10-09.<br />
          <strong style={{ color: 'rgba(255,255,255,0.7)' }}>Data sources.</strong> Team count from RinkStop team_workspaces table. Founded 1993, Kometa Brno 14 titles, Pardubice defending 2025-26, 1995-96 expansion: Wikipedia (Czech Extraliga), International Hockey Wiki, hokej.cz.<br />
          <span style={{ color: 'rgba(255,255,255,0.45)' }}><Link href="/editorial-policy" style={{ color: '#FFB81C' }}>Editorial policy</Link> · <Link href="/data-methodology" style={{ color: '#FFB81C' }}>Data methodology</Link> · <Link href="/corrections" style={{ color: '#FFB81C' }}>Report a correction</Link></span>
        </p>
      </section>
    </main>
  );
}
