import type { Metadata } from 'next';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';

// 2026-10-09: New special league page. Source: Wikipedia (AlpsHL),
// alps.hockey. 13 teams in 2026-27 (7 Italy, 4 Austria, 1 Slovenia, 1 Croatia).
// Founded 2016 (merger of Serie A + Inter-National League). Gherdëina
// defending 2025-26. Asiago Olimpija Ritten 2 titles each.

const ALPS_LEAGUE_ID = 'ec294402-d6b1-46c3-b111-662f829efdc7';

async function getAlpsTeamCount(): Promise<number> {
  try {
    const { count } = await supabaseAdmin
      .from('team_workspaces')
      .select('id', { count: 'exact', head: true })
      .eq('league_id', ALPS_LEAGUE_ID)
      .eq('is_active', true);
    return count ?? 0;
  } catch {
    return 0;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const teamCount = await getAlpsTeamCount();
  return {
    title: teamCount > 0
      ? `Alps Hockey League 2026-27 — ${teamCount} Teams, Standings | RinkStop`
      : 'Alps Hockey League 2026-27 — Standings, Schedule & Teams',
    description: teamCount > 0
      ? `Alps Hockey League (AlpsHL) 2026-27: ${teamCount} teams across Austria, Italy, Slovenia, Croatia. Founded 2016 as merger of Italian Serie A and Inter-National League. Gherdëina defending 2025-26.`
      : 'Alps Hockey League (AlpsHL) 2026-27: 13 teams across Austria, Italy, Slovenia, Croatia. Founded 2016 as merger. Gherdëina defending 2025-26.',
  };
}

export default async function AlpsPage() {
  const teamCount = await getAlpsTeamCount();
  const teamLabel = teamCount > 0 ? `${teamCount} TEAMS` : '13 TEAMS';

  return (
    <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@graph': [{
            '@type': 'SportsOrganization',
            '@id': 'https://rinkstop.com/directory/alps-hockey-league-austria',
            name: 'Alps Hockey League',
            alternateName: 'AlpsHL',
            url: 'https://rinkstop.com/directory/alps-hockey-league-austria',
            sport: 'Ice hockey',
            description: 'Alps Hockey League (AlpsHL) — a professional ice hockey league in Central Europe, founded 2016 as a merger of the Italian Serie A and the Inter-National League. 13 teams across Austria, Italy, Slovenia, and Croatia. Gherdëina defending 2025-26 champion.',
            foundingDate: '2016',
            location: { '@type': 'Place', name: 'Central Europe' },
            sameAs: ['https://en.wikipedia.org/wiki/Alps_Hockey_League'],
          }, {
            '@type': 'FAQPage',
            mainEntity: [
              {
                '@type': 'Question',
                name: 'How many teams play in the Alps Hockey League?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'The AlpsHL fields 13 teams for 2026-27: 7 from Italy (Asiago, Cortina, Gherdëina, Hockey Unterland, Merano, Ritten, Wipptal Broncos), 4 from Austria (KAC Future Team, Kitzbühel, Red Bull Hockey Juniors, Zeller Eisbären), 1 from Croatia (Sisak), and 1 from Slovenia (Jesenice). Gherdëina won the 2025-26 championship, their first title.',
                },
              },
              {
                '@type': 'Question',
                name: 'When was the Alps Hockey League founded?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'The AlpsHL was founded in spring 2016 as a joint venture between the Austrian Ice Hockey Association, the Italian Ice Sports Federation, and the Ice Hockey Federation of Slovenia. The league was created through the merger of the Italian Serie A and the Inter-National League (a former cross-border Austrian-Italian league). The first AlpsHL season was 2016-17. The Croatian club Sisak joined in 2022, expanding the league to four countries.',
                },
              },
              {
                '@type': 'Question',
                name: 'Who has won the most AlpsHL championships?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Asiago and Ritten (Renon) are tied for the most AlpsHL titles with 2 each. Asiago won in 2017-18 and 2021-22; Ritten won in 2016-17 and 2023-24. Olimpija Ljubljana (Slovenia) won in 2018-19 and 2020-21. Jesenice won in 2022-23. Zeller Eisbären (Austria) won in 2024-25, becoming the first Austrian club to win the AlpsHL title. Gherdëina won the 2025-26 title.',
                },
              },
              {
                '@type': 'Question',
                name: 'What is the format of the Alps Hockey League?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'The AlpsHL regular season runs from September to February, with each of the 13 teams playing 36 games in a one-and-a-half round-robin format. The top 5 teams advance to the Master Round (with bonus points based on ranking), the remaining 8 teams enter a Qualification Round (with bonus points), and the top 3 in each group play best-of-3 series for the remaining 3 playoff spots. The playoffs are best-of-7 through the quarterfinals, semifinals, and finals.',
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
        <span style={{ color: 'rgba(255,255,255,0.6)' }}>AlpsHL</span>
      </nav>

      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: '#fff', letterSpacing: '0.02em', lineHeight: 1, fontFamily: '"Bebas Neue", sans-serif' }}>
          Alps Hockey League (AlpsHL)
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.95rem', marginTop: '0.5rem', maxWidth: '780px' }}>
          {teamLabel} across Austria, Italy, Slovenia, and Croatia. Founded 2016 as a merger of the Italian Serie A and the Inter-National League. A pan-European professional hockey league. Gherdëina defending 2025-26 champion (first title).
        </p>
      </div>

      <section style={{ marginBottom: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '0.75rem' }}>
          {teamLabel} • ALPSHL 2026-27
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1rem' }}>
          The 13 AlpsHL clubs span 4 countries. The Italian contingent (7 teams) is the largest, including historic clubs like <strong>Asiago</strong> (2-time AlpsHL champion, 2-time Serie A champion) and <strong>Cortina</strong> (the 2022 Olympic host city&apos;s club). The Austrian contingent (4 teams) includes the KAC Future Team (the development affiliate of Austrian top-tier KAC) and the Red Bull Hockey Juniors (Red Bull Salzburg&apos;s U20 team). Slovenian <strong>Jesenice</strong> is a historic club (2022-23 AlpsHL champion) and Croatian <strong>Sisak</strong> is a newer entrant (joined 2022).
        </p>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', lineHeight: 1.6 }}>
          Marquee AlpsHL arenas: Leitner Solar Arena (Ritten, 1,200), Palaonda Hockey Arena (Asiago, 3,000), and Stadio Olimpico del Ghiaccio (Cortina, 2,200 — used for the 2026 Milan-Cortina Winter Olympics). The AlpsHL has been a key development path for Austrian and Italian hockey talent, with many AlpsHL alumni advancing to the ICE Hockey League (Austrian top tier) or professional leagues in Scandinavia, Germany, and Switzerland.
        </p>
      </section>

      <section style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>ALPS HOCKEY LEAGUE HISTORY</h2>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9375rem', lineHeight: 1.75 }}>
          <p style={{ marginBottom: '1rem' }}>
            The AlpsHL was founded in spring 2016 as a joint venture between the Austrian Ice Hockey Association (ÖEHV), the Italian Ice Sports Federation (FISG), and the Ice Hockey Federation of Slovenia. The league was created through the merger of the Italian Serie A (the top Italian professional hockey league) and the Inter-National League (a former cross-border Austrian-Italian league that had operated since 2009). The merger was designed to strengthen both leagues — Serie A had been struggling with financial and competitive issues, while the Inter-National League was a smaller, more regional competition.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            The first AlpsHL season was 2016-17, won by Ritten (Renon) over Asiago 4-1 in the final. Asiago won the second AlpsHL title in 2017-18, defeating Ritten in a 4-3 final. Olimpija Ljubljana (Slovenia) won the 2018-19 title, defeating Pustertal Wölfe 4-3. The 2019-20 season was cancelled due to the COVID-19 pandemic, with no AlpsHL champion being crowned. Olimpija won again in 2020-21, and Asiago in 2021-22, establishing the parity of the early AlpsHL era.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            Jesenice (Slovenia) won the 2022-23 title, marking the third different Slovenian AlpsHL championship. Ritten won the 2023-24 title (4-0 sweep of Cortina). Zeller Eisbären (Austria) won the 2024-25 title, becoming the first Austrian AlpsHL champion. Gherdëina (Italy) won the 2025-26 title, their first, defeating Merano 4-0 in the final. The 2025-26 final was an all-Italian South Tyrol affair, reflecting the league&apos;s concentration of clubs in the Italian-speaking alpine regions of northern Italy and southern Austria.
          </p>
          <p>
            The AlpsHL has been a significant development league for Austrian, Italian, and Slovenian hockey talent. Notable AlpsHL alumni include several players who have gone on to play in the ICE Hockey League (Austria&apos;s top tier), the DEL (Germany), and the SHL (Sweden). The league&apos;s 36-point import cap (with a maximum of 16 points spent on imports) is designed to prioritize the development of young players from the participating countries — a key philosophical difference from the open-import North American leagues. The 2026-27 AlpsHL season will be the 11th, marking a decade of cross-border hockey in Central Europe. The league&apos;s success has positioned the AlpsHL as a model for other cross-border European hockey initiatives, including the planned Central European Hockey League (CEHL) expansion discussions.
          </p>
        </div>
      </section>

      <section style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>HOW THE ALPS HOCKEY LEAGUE WORKS</h2>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9375rem', lineHeight: 1.75 }}>
          <p style={{ marginBottom: '1rem' }}>
            The AlpsHL regular season runs from September to February, with each of the 13 teams playing 36 games in a one-and-a-half round-robin format. The schedule is structured to balance travel — Italian and Austrian teams face significant cross-border travel for road games, but the AlpsHL&apos;s geographic concentration in the alpine regions reduces travel compared to leagues spanning larger national territories.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            The top 5 teams in the regular-season standings advance to the Master Round, where they receive bonus points based on their ranking (4-3-2-1-0) and play each other twice to determine seeding for the playoffs. The remaining 8 teams (positions 6-13) are split into two Qualification Rounds, where they receive bonus points (3-2-1-0) based on their regular-season ranking. The top 3 teams in each group then play best-of-3 series for the remaining 3 playoff spots.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            AlpsHL rosters are typically 22-25 players per team. The league&apos;s import system uses a 36-point salary cap, with each team having 36 points to spend on its entire roster. A maximum of 16 points can be spent on foreign imports, prioritizing the development of young players from the participating countries (Austria, Italy, Slovenia, Croatia). Each AlpsHL team is required to roster a minimum of 12 under-23 players, further emphasizing the league&apos;s development focus.
          </p>
          <p>
            AlpsHL games are broadcast on regional sports networks in each of the participating countries and on the league&apos;s official YouTube channel (which has grown significantly in viewership over the past 3 seasons). The 2025-26 final between Gherdëina and Merano was the first all-South Tyrolean AlpsHL final, reflecting the league&apos;s geographic concentration in the Italian-speaking alpine regions. The AlpsHL has continued to grow in stature — the 2024-25 Zeller Eisbären championship was the first AlpsHL title for an Austrian club, and the 2025-26 Gherdëina title was the first for a South Tyrolean club, illustrating the league&apos;s continued development of cross-border hockey culture.
          </p>
        </div>
      </section>

      <section style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.85rem', lineHeight: 1.6, margin: 0 }}>
          <strong style={{ color: 'rgba(255,255,255,0.7)' }}>Editorial standards.</strong> By Arnel Larracas, Founder &amp; Editor-in-Chief, RinkStop. Last reviewed 2026-10-09.<br />
          <strong style={{ color: 'rgba(255,255,255,0.7)' }}>Data sources.</strong> Team count from RinkStop team_workspaces table. Founded 2016, 2016-17 Ritten first champion, 2024-25 Zeller Eisbären first Austrian title, 2025-26 Gherdëina: Wikipedia (Alps Hockey League), alps.hockey.<br />
          <span style={{ color: 'rgba(255,255,255,0.45)' }}><Link href="/editorial-policy" style={{ color: '#FFB81C' }}>Editorial policy</Link> · <Link href="/data-methodology" style={{ color: '#FFB81C' }}>Data methodology</Link> · <Link href="/corrections" style={{ color: '#FFB81C' }}>Report a correction</Link></span>
        </p>
      </section>
    </main>
  );
}
