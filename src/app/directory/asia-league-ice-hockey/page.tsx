import type { Metadata } from 'next';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';

// 2026-10-09: New special league page. Source: Wikipedia (Asia League),
// IIHF.com "Asia League finally back" feature, alhockey.com. Founded
// 2003 after the collapse of the Japan Ice Hockey League. 6 teams in
// 2026-27 (5 Japan + 1 South Korea). COVID-19 halted the league 2020-22.
// Anyang Halla and Kokudo have dominated the title list.

const ALIH_LEAGUE_ID = '4cd06716-8bcb-4565-8365-0bcfb635b949';

async function getAlihTeamCount(): Promise<number> {
  try {
    const { count } = await supabaseAdmin
      .from('team_workspaces')
      .select('id', { count: 'exact', head: true })
      .eq('league_id', ALIH_LEAGUE_ID)
      .eq('is_active', true);
    return count ?? 0;
  } catch {
    return 0;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const teamCount = await getAlihTeamCount();
  return {
    title: teamCount > 0
      ? `Asia League Ice Hockey 2026-27 — ${teamCount} Teams, Standings | RinkStop`
      : 'Asia League Ice Hockey 2026-27 — Standings, Schedule & Teams',
    description: teamCount > 0
      ? `Asia League Ice Hockey 2026-27: ${teamCount} teams across Japan and South Korea. Top professional league in Asia. Founded 2003. Anyang Halla and Kokudo most successful clubs.`
      : 'Asia League Ice Hockey 2026-27: 6 teams across Japan and South Korea. Top professional league in Asia. Founded 2003 after the Japanese league collapsed.',
  };
}

export default async function AsiaLeaguePage() {
  const teamCount = await getAlihTeamCount();
  const teamLabel = teamCount > 0 ? `${teamCount} TEAMS` : '6 TEAMS';

  return (
    <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@graph': [{
            '@type': 'SportsOrganization',
            '@id': 'https://rinkstop.com/directory/asia-league-ice-hockey',
            name: 'Asia League Ice Hockey',
            url: 'https://rinkstop.com/directory/asia-league-ice-hockey',
            sport: 'Ice hockey',
            description: 'Asia League Ice Hockey — the top professional ice hockey league in East Asia, with teams from Japan and South Korea. Founded 2003 after the collapse of the Japan Ice Hockey League.',
            foundingDate: '2003',
            location: { '@type': 'Place', name: 'Japan' },
            sameAs: ['https://en.wikipedia.org/wiki/Asia_League_Ice_Hockey'],
          }, {
            '@type': 'FAQPage',
            mainEntity: [
              {
                '@type': 'Question',
                name: 'How many teams play in the Asia League?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'The Asia League Ice Hockey fields 6 teams in the 2026-27 season: 5 teams from Japan (Red Eagles Hokkaido, East Hokkaido Cranes, Tohoku Free Blades, Nikko IceBucks, Yokohama Grits) and 1 team from South Korea (HL Anyang). The league has fielded between 5 and 9 teams across its history.',
                },
              },
              {
                '@type': 'Question',
                name: 'When was the Asia League founded?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'The Asia League Ice Hockey was founded in 2003 following the collapse of the Japan Ice Hockey League and the folding of the Korean Ice Hockey League. The inaugural 2003-04 season was a shortened tournament of 5 teams (4 Japanese, 1 Korean). The league added teams from China and Russia in 2004-05 and reached its high of 9 teams in 2005-06.',
                },
              },
              {
                '@type': 'Question',
                name: 'Who has won the most Asia League championships?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Kokudo (Seibu Bears / Nippon Paper Cranes lineage) has won the most Asia League championships. The Korean team Anyang Halla has also been a dominant force, with 5+ titles. PSK Sakhalin (Russia) won multiple titles during their membership from 2014-2020. Champions since the 2020 COVID-19 restart include Anyang Halla and the East Hokkaido Cranes.',
                },
              },
              {
                '@type': 'Question',
                name: 'What is the format of the Asia League?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'The Asia League plays a regular season of 30-40 games per team (depending on team count), with the top 4 teams advancing to a best-of-3 or best-of-5 playoff bracket. The league plays 120+ regular season games per year in Japan and Korea. The league is the base for the men&apos;s national teams of Japan and South Korea at the IIHF World Championship Division I.',
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
        <span style={{ color: 'rgba(255,255,255,0.6)' }}>Asia League</span>
      </nav>

      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: '#fff', letterSpacing: '0.02em', lineHeight: 1, fontFamily: '"Bebas Neue", sans-serif' }}>
          Asia League Ice Hockey
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.95rem', marginTop: '0.5rem', maxWidth: '780px' }}>
          {teamLabel} across Japan and South Korea. Founded 2003. The top professional ice hockey league in East Asia. Cross-border regular season play between Tokyo, Hokkaido, Tohoku, and Seoul arenas.
        </p>
      </div>

      <section style={{ marginBottom: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '0.75rem' }}>
          {teamLabel} • ASIA LEAGUE 2026-27
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1rem' }}>
          The 2026-27 Asia League Ice Hockey features 5 Japanese teams and 1 Korean team. The Japanese clubs are based in Hokkaido (Red Eagles Hokkaido, East Hokkaido Cranes — both in eastern Hokkaido), Tohoku (Tohoku Free Blades in Hachinohe), Nikko (Nikko IceBucks), and Yokohama (Yokohama Grits). The sole Korean team is HL Anyang, formerly Anyang Halla, based in the satellite city of Anyang south of Seoul. HC Sakhalin, the Russian team based in Yuzhno-Sakhalinsk, was affiliated through 2020 but has not been part of the league since.
        </p>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', lineHeight: 1.6 }}>
          Marquee Asia League arenas include the Anyang Ice Rink (capacity ~3,000, Anyang, South Korea), the Tomakomai Hakucho Skate Center (East Hokkaido Cranes, capacity 3,000), the Nikko Nikko Arena (Nikko IceBucks), and the Hachinohe Arena (Tohoku Free Blades). The league is the primary development league for the men&apos;s national teams of Japan and South Korea at the IIHF Ice Hockey World Championship Division I level.
        </p>
      </section>

      <section style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>ASIA LEAGUE HISTORY</h2>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9375rem', lineHeight: 1.75 }}>
          <p style={{ marginBottom: '1rem' }}>
            The Asia League Ice Hockey was formed in 2003 due to the declining popularity of the Japan Ice Hockey League and the folding of the Korean Ice Hockey League. The league was created with the goal of promoting hockey and developing player skills across East Asia, and providing a competitive foundation for national-team development for both Japan and South Korea. The inaugural 2003-04 season was a shortened tournament of only 5 teams (4 Japanese, 1 Korean), with games played as a round-robin tournament rather than a traditional regular season. The Nippon Paper Cranes won the first championship with 39 points.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            The 2004-05 season was the league&apos;s first full season and is considered by some to be the inaugural season. The league added 3 teams: Golden Amur (Russia) and Harbin and Qiqihar (China), bringing the international participation to 4 countries. The 2004-05 season schedule was 42 games, with teams playing each other 6 times. Kokudo won the first true playoff championship, defeating the Paper Cranes in the final. The 2005-06 season saw the league peak at 9 teams, with the addition of Korea&apos;s Kangwon Land (later Anyang Halla) and the Nordic Vikings (a Swedish-Chinese joint venture based in Beijing). The Nordic Vikings brought Swedish players to the league and to the existing Chinese teams.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            The early years were dominated by Kokudo (formerly Seibu Bears) and the Nippon Paper Cranes, who met in the first three Asia League finals (2004-05, 2005-06, 2006-07) — all won by Kokudo. The Korean entry Anyang Halla emerged as a force in the late 2000s. China&apos;s teams (Harbin, Qiqihar) eventually withdrew due to financial and competitive reasons. HC Sakhalin, a Russian team based on Sakhalin Island, joined in 2014-15 and won the championship in their inaugural season. The Russian team remained a member until 2020.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            The league was suspended for the 2020-21 and 2021-22 seasons due to COVID-19 border restrictions between Japan and South Korea. The 2019-20 season was itself disrupted, with the 2020 Gagarin Cup final cancelled and Anyang Halla and PSK Sakhalin named co-champions. The 2020 Tohoku earthquake (2011) also disrupted the season, with the Tohoku Free Blades and Anyang Halla named co-champions. The league returned to full operation in September 2022 and has been growing since, with 6 teams playing the 2026-27 season.
          </p>
          <p>
            The Asia League has produced several IIHF World Championship players for both Japan and South Korea, and has been a stable development platform for hockey in Asia. The league&apos;s 6 teams play 30-40 games per season in a regular season, with the top 4 teams advancing to a playoff bracket. Anyang Halla and Kokudo are the two most successful franchises in league history, with multiple championships each. The league&apos;s future growth depends on the continued development of hockey in Asia, with Japan and South Korea being the primary markets.
          </p>
        </div>
      </section>

      <section style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>HOW THE ASIA LEAGUE WORKS</h2>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9375rem', lineHeight: 1.75 }}>
          <p style={{ marginBottom: '1rem' }}>
            The Asia League regular season runs from September to March each year, with each of the 6 teams playing 30-40 games depending on the team count. The schedule is structured to balance travel — the Korean team (HL Anyang) typically plays 3-4 home games against each Japanese team and travels to Japan for 2-3 away games. The 2022-23 season (the first post-COVID) saw 120+ regular season games played across Japan and South Korea.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            The top 4 teams in the regular-season standings advance to a best-of-3 or best-of-5 playoff bracket, depending on the season. The playoff format has varied — in some seasons, the top 2 teams have received byes to the semifinals, with the 3rd and 4th seeds playing a first-round series. The Asia League Championship Trophy is awarded to the playoff champion. The playoffs typically run in February and March, with the championship series concluding in late March or early April.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            Asia League rosters are limited in the number of import (non-domestic) players per team. Japanese teams are typically allowed 2-3 imports, while Korean teams have historically been allowed more (3-4) due to the smaller pool of Korean-eligible players. The import restrictions are designed to balance competitive parity with the development of Japanese and Korean national-team players. The league&apos;s player registration cap is 25 players per team, with a 4-import maximum for Japanese teams.
          </p>
          <p>
            The Asia League is the only cross-border professional ice hockey league in Asia and is jointly organized by the Japan Ice Hockey Federation, the Korea Ice Hockey Association, and the Russian Ice Hockey Federation (for the years Sakhalin was a member). The league is endorsed by the International Ice Hockey Federation (IIHF). Asia League games are broadcast in Japan on local regional sports networks and in Korea on the Korea Broadcasting System (KBS). Streaming is available through the Asia League website and partner platforms.
          </p>
        </div>
      </section>

      <section style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.85rem', lineHeight: 1.6, margin: 0 }}>
          <strong style={{ color: 'rgba(255,255,255,0.7)' }}>Editorial standards.</strong> By Arnel Larracas, Founder &amp; Editor-in-Chief, RinkStop. Last reviewed 2026-10-09.<br />
          <strong style={{ color: 'rgba(255,255,255,0.7)' }}>Data sources.</strong> Team count from RinkStop team_workspaces table. Founded 2003, 9-team peak 2005-06, 2020-22 COVID suspension, Anyang Halla dominance, HC Sakhalin 2014-2020: Wikipedia (Asia League Ice Hockey), IIHF.com "Asia League finally back" (2022), alhockey.com about page.<br />
          <span style={{ color: 'rgba(255,255,255,0.45)' }}><Link href="/editorial-policy" style={{ color: '#FFB81C' }}>Editorial policy</Link> · <Link href="/data-methodology" style={{ color: '#FFB81C' }}>Data methodology</Link> · <Link href="/corrections" style={{ color: '#FFB81C' }}>Report a correction</Link></span>
        </p>
      </section>
    </main>
  );
}
