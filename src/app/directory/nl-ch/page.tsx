import type { Metadata } from 'next';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';

// 2026-10-09: New special league page. Source: Wikipedia (National League
// ice hockey). 14 teams. Founded 1938 (NDA), renamed NL 2017. HC Davos
// 31 titles (most). SC Bern highest attendance in Europe (16,290 avg).
// Fribourg-Gottéron defending 2025-26 champion.

const NL_LEAGUE_ID = '3465d1c5-c7af-4510-bed6-d43d294876a7';

async function getNlTeamCount(): Promise<number> {
  try {
    const { count } = await supabaseAdmin
      .from('team_workspaces')
      .select('id', { count: 'exact', head: true })
      .eq('league_id', NL_LEAGUE_ID)
      .eq('is_active', true);
    return count ?? 0;
  } catch {
    return 0;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const teamCount = await getNlTeamCount();
  return {
    title: teamCount > 0
      ? `Swiss National League 2026-27 — ${teamCount} Teams, Standings | RinkStop`
      : 'Swiss National League 2026-27 — Standings, Schedule & Teams',
    description: teamCount > 0
      ? `Swiss National League (NL) 2026-27: ${teamCount} teams across Switzerland. Top professional hockey league, founded 1938. Highest average attendance in Europe. Davos 31 titles, SC Bern top attendance. Fribourg-Gottéron defending 2025-26.`
      : 'Swiss National League (NL) 2026-27: 14 teams across Switzerland. Top professional hockey league, founded 1938. Highest average attendance in Europe. Fribourg-Gottéron defending 2025-26.',
  };
}

export default async function NlChPage() {
  const teamCount = await getNlTeamCount();
  const teamLabel = teamCount > 0 ? `${teamCount} TEAMS` : '14 TEAMS';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'SportsOrganization',
        '@id': 'https://rinkstop.com/directory/nl-ch',
        name: 'Swiss National League',
        alternateName: 'National League (formerly National League A, 2007-17)',
        url: 'https://rinkstop.com/directory/nl-ch',
        sport: 'Ice hockey',
        description: 'Swiss National League (NL) — the top professional ice hockey league in Switzerland, founded 1938. 14 teams. Highest average attendance in European hockey (9,931 per game in 2022-23). Davos 31 titles, SC Bern top attendance. Fribourg-Gottéron defending 2025-26 champion.',
        foundingDate: '1938',
        location: { '@type': 'Place', name: 'Switzerland' },
        sameAs: ['https://en.wikipedia.org/wiki/National_League_(ice_hockey)'],
      },
      {
        '@type': 'FAQPage',
        mainEntity: [
          {
            '@type': 'Question',
            name: 'How many teams play in the Swiss National League?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'The Swiss National League fields 14 teams across Switzerland. The 14 teams include SC Bern, ZSC Lions, HC Davos, HC Lugano, Genève-Servette HC, Fribourg-Gottéron, Lausanne HC, EHC Biel, HC Ambrì-Piotta, HC Ajoie, EHC Kloten, SCL Tigers, SC Rapperswil-Jona Lakers, and EV Zug.',
            },
          },
          {
            '@type': 'Question',
            name: 'When was the Swiss National League founded?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'The league was founded in 1938 as the National League A (NDA) by the Swiss Ice Hockey Association. It was renamed the National League A (NLA) in 1999, then National League (NL) in 2017 as part of a rebranding. The league traces its history to the Swiss National Championship Serie A, first held in 1909.',
            },
          },
          {
            '@type': 'Question',
            name: 'Who has won the most Swiss National League championships?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'HC Davos holds the record with 31 Swiss championship titles, the most in the league&apos;s history. ZSC Lions have 11, EHC Arosa 9, HC Lugano 7, EHC Kloten 5, EV Zug 3, EHC Biel 3, and SC Bern 3. Fribourg-Gottéron is the defending 2025-26 champion, their first title.',
            },
          },
          {
            '@type': 'Question',
            name: 'What is the format of the Swiss National League?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'The NL regular season runs from September to March, with each of the 14 teams playing 52 games (4 against each opponent, 2 home, 2 away). The top 8 teams qualify for the playoffs (best-of-7 quarterfinals, semifinals, finals). The bottom 4 teams enter the Play-out round, where they play an additional 6 games. The 2 lowest-ranked teams then play a best-of-7 relegation series, with the loser facing the Swiss League champion for an NL spot.',
            },
          },
        ],
      },
    ],
  };

  return (
    <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '1rem' }}>
        <Link href="/" style={{ color: 'rgba(255,255,255,0.4)' }}>Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/directory" style={{ color: 'rgba(255,255,255,0.4)' }}>Directory</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: 'rgba(255,255,255,0.6)' }}>Swiss NL</span>
      </nav>

      <div style={{ marginBottom: '1.5rem' }}>
        <h1 className="font-sport" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: '#fff', letterSpacing: '0.02em', lineHeight: 1, margin: 0 }}>
          Swiss National League (NL)
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.95rem', marginTop: '0.5rem', maxWidth: '780px' }}>
          {teamLabel} across Switzerland. Founded 1938. The top professional ice hockey league in Switzerland. Highest average attendance in European hockey (9,931 per game in 2022-23, ahead of the KHL and DEL). Fribourg-Gottéron defending 2025-26 champion. SC Bern has been #1 in European attendance for 18 consecutive seasons.
        </p>
      </div>

      <section style={{ marginBottom: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <h2 className="font-sport" style={{ fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '0.75rem' }}>
          {teamLabel} • NATIONAL LEAGUE 2026-27
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1rem' }}>
          The 14 National League clubs span all regions of Switzerland, from alpine resort towns (Davos) to major cities (Zürich, Bern, Geneva, Basel-adjacent). Marquee clubs include SC Bern (the league&apos;s most iconic franchise, playing in the 17,031-seat PostFinance Arena, the largest hockey venue in Switzerland), ZSC Lions (Zürich, 2024-25 Swiss champion, Swiss Life Arena), HC Davos (31 titles, legendary Spengler Cup hosts), and HC Lugano (Ticino&apos;s premier club, Cornèr Arena). Fribourg-Gottéron won the 2025-26 championship for their first-ever NL title, defeating Genève-Servette in the final.
        </p>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', lineHeight: 1.6 }}>
          Marquee NL arenas: PostFinance Arena (Bern, 17,031 capacity — the largest in Switzerland and among the top 10 in Europe), Swiss Life Arena (Zürich, 12,000 — home of ZSC Lions, opened 2022), Vaudoise Aréna (Lausanne, 9,600), BCF Arena (Fribourg, 9,262), Patinoire des Vernets (Geneva, 7,135), and Cornèr Arena (Lugano, 7,800). The NL has the highest average attendance in European hockey — 9,931 per game in 2022-23, ahead of the KHL (9,396) and DEL (7,781).
        </p>
      </section>

      <section style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <h2 className="font-sport" style={{ fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>SWISS NATIONAL LEAGUE HISTORY</h2>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9375rem', lineHeight: 1.75 }}>
          <p style={{ marginBottom: '1rem' }}>
            The National League traces its history to the Swiss National Championship Serie A, first held in 1909. The first Swiss ice hockey title was won by HC Bellerive Vevey in 1909, and the league was the dominant form of organized ice hockey in Switzerland for most of the 20th century. The current league structure was formalized in 1938 as the National League A (NDA), administered by the Swiss Ice Hockey Federation. The NDA operated as the top tier of Swiss hockey continuously through World War II and the post-war era.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            HC Davos dominated the early decades of the league, winning 31 Swiss championship titles — the most of any club in any major European hockey league. Davos won 13 titles from 1926 to 1948 and continued to be a force through the 1980s, winning 4 more in the 1984-2015 era. The Davos-led Spengler Cup tournament (held annually in Davos since 1923) is the oldest invitational ice hockey tournament in the world and remains a prestigious December event attracting NHL, KHL, and national team participation.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            The modern NL has been dominated by ZSC Lions (11 titles including 2024 and 2025), SC Bern (the highest-attended team in Europe for 18 consecutive seasons), and HC Davos. Other successful modern clubs include HC Lugano (7 titles, dominant in the late 1980s), EHC Kloten (5 titles, dominant in the mid-1990s), and EV Zug (3 titles in recent years, including 2021 and 2022). Fribourg-Gottéron won their first-ever NL title in 2025-26, defeating Genève-Servette in the final.
          </p>
          <p>
            The NL was renamed from National League A to simply National League (NL) in 2017 as part of a broader rebranding of Swiss ice hockey. The change was designed to modernize the league&apos;s brand and align it with international naming conventions (most European leagues use the simpler National League or country-name designation). The NL has been the highest-attended professional hockey league in Europe since the early 2010s — the 2022-23 season averaged 9,931 fans per game, ahead of the KHL and DEL. The NL is also a member of the Champions Hockey League (CHL), the pan-European competition that includes top clubs from the SHL, Liiga, DEL, Czech Extraliga, and other top leagues.
          </p>
        </div>
      </section>

      <section style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <h2 className="font-sport" style={{ fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>HOW THE SWISS NATIONAL LEAGUE WORKS</h2>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9375rem', lineHeight: 1.75 }}>
          <p style={{ marginBottom: '1rem' }}>
            The Swiss NL regular season runs from late September to early March, with each of the 14 teams playing 52 games. The schedule is structured as 4 games against each opponent — 2 home and 2 away — providing a balance of home/away games. The 2022-23 season had the highest average attendance in European hockey, at 9,931 fans per game. SC Bern led with 16,290 average attendance, the highest in European hockey.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            The top 8 teams in the regular-season standings advance to the playoffs, which are best-of-7 series through the quarterfinals, semifinals, and finals. The bottom 4 teams enter the Play-out round, where they play an additional 6 games (carrying over regular-season points). The 2 lowest-ranked teams after the Play-out play a best-of-7 relegation series, with the loser facing the Swiss League (second tier) champion for an NL spot.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            NL rosters are typically 25-28 players per team. The league has a soft salary cap of CHF 13 million per team (approximately $14.5 million USD), with luxury tax requirements for teams exceeding the cap. NL teams may carry a maximum of 6 import (non-Swiss) players. Top Swiss players include Roman Josi (Nashville Predators captain, SC Bern youth product), Nino Niederreiter (former Carolina Hurricanes, SC Bern youth), and Timo Meier (former San Jose Sharks/New Jersey Devils, HC St. Moritz youth). The NL has been a steady source of NHL talent, with 30+ Swiss NHL players active in 2025-26.
          </p>
          <p>
            Swiss NL games are broadcast on MySports (the primary broadcast partner) and SRG SSR (Swiss public television, French/German/Italian). Streaming is available through the NL&apos;s official platform and partner services. The 2025-26 championship between Fribourg-Gottéron and Genève-Servette was the first time in NL history that neither of the two most successful clubs (Davos or ZSC Lions) reached the final. The NL&apos;s combination of high attendance, attractive competition, and a strong national team (Switzerland won the 2025 IIHF World Championship for the first time) has positioned the league as one of the most successful professional hockey circuits in the world.
          </p>
        </div>
      </section>

      <section style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.85rem', lineHeight: 1.6, margin: 0 }}>
          <strong style={{ color: 'rgba(255,255,255,0.7)' }}>Editorial standards.</strong> By Arnel Larracas, Founder &amp; Editor-in-Chief, RinkStop. Last reviewed 2026-10-09.<br />
          <strong style={{ color: 'rgba(255,255,255,0.7)' }}>Data sources.</strong> Team count from RinkStop team_workspaces table. Founded 1938, HC Davos 31 titles, 9,931 avg attendance European high, 2025 Swiss World Championship: Wikipedia (National League ice hockey), sihf.ch.<br />
          <span style={{ color: 'rgba(255,255,255,0.45)' }}><Link href="/editorial-policy" style={{ color: '#FFB81C' }}>Editorial policy</Link> · <Link href="/data-methodology" style={{ color: '#FFB81C' }}>Data methodology</Link> · <Link href="/corrections" style={{ color: '#FFB81C' }}>Report a correction</Link></span>
        </p>
      </section>
    </main>
  );
}
