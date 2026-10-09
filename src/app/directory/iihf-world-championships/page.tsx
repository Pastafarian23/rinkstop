import type { Metadata } from 'next';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';

// 2026-10-09: New special league page. Source: Wikipedia (Ice Hockey
// World Championships + IIHF World Championship). First held 1920
// (Olympic). 16 teams in the Championship division + Divisions I, II,
// III, IV. Top 8 advance to playoff medal round. Russia/Belarus
// suspended since 2022. Switzerland ranking #1 as of May 2026.

const IIHF_LEAGUE_ID = 'cb722194-22d8-4065-8258-a5d92648dd9f';

async function getIihfTeamCount(): Promise<number> {
  try {
    const { count } = await supabaseAdmin
      .from('team_workspaces')
      .select('id', { count: 'exact', head: true })
      .eq('league_id', IIHF_LEAGUE_ID)
      .eq('is_active', true);
    return count ?? 0;
  } catch {
    return 0;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const teamCount = await getIihfTeamCount();
  return {
    title: teamCount > 0
      ? `IIHF World Championship 2026 — ${teamCount} Teams, Standings | RinkStop`
      : 'IIHF World Championship 2026 — Standings, Schedule & Teams',
    description: teamCount > 0
      ? `IIHF Ice Hockey World Championship 2026: ${teamCount} national teams across 5 divisions (Championship, I, II, III, IV). Switzerland #1 ranked. 16 teams in the Championship group. Held May 15-31 in Fribourg/Zurich.`
      : 'IIHF Ice Hockey World Championship 2026: 16 national teams in the Championship group, plus 36 in Divisions I-III. Top international ice hockey tournament. Switzerland #1 ranked.',
  };
}

export default async function IihfPage() {
  const teamCount = await getIihfTeamCount();
  const teamLabel = teamCount > 0 ? `${teamCount} TEAMS` : '52 TEAMS';

  return (
    <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@graph': [{
            '@type': 'SportsOrganization',
            '@id': 'https://rinkstop.com/directory/iihf-world-championships',
            name: 'IIHF World Championship',
            url: 'https://rinkstop.com/directory/iihf-world-championships',
            sport: 'Ice hockey',
            description: 'IIHF Ice Hockey World Championship — the top annual international ice hockey tournament organized by the International Ice Hockey Federation. First held 1920. 16 teams in the Championship group, 12 in each of Divisions I, II, and III. Switzerland #1 ranked as of May 2026.',
            foundingDate: '1920',
            location: { '@type': 'Place', name: 'International' },
            sameAs: ['https://en.wikipedia.org/wiki/Ice_Hockey_World_Championships'],
          }, {
            '@type': 'FAQPage',
            mainEntity: [
              {
                '@type': 'Question',
                name: 'How many teams play in the IIHF World Championship?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'The IIHF World Championships feature a minimum of 52 teams across 5 divisions: 16 teams in the top Championship group, 12 teams each in Division I (Group A and B), 12 teams in Division II (Group A and B), 12 teams in Division III, and additional teams in Division IV if needed. Teams are promoted and relegated between divisions based on annual results.',
                },
              },
              {
                '@type': 'Question',
                name: 'When was the IIHF World Championship first held?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'The first IIHF World Championship was held at the 1920 Summer Olympics in Antwerp, Belgium, with Canada winning the gold medal. The tournament was held as part of the Olympics through 1968, then became a standalone event starting in 1930. The modern format with 16 teams in the Championship group was established in 1992.',
                },
              },
              {
                '@type': 'Question',
                name: 'Who has won the most IIHF World Championships?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Canada has won the most IIHF World Championship gold medals with 27, followed by Russia/Soviet Union (with 27, including suspended teams), Sweden 11, Finland 4, Czech Republic/Czechoslovakia 12, and the United States 3. The defending 2025 champion is Switzerland, who defeated the United States in the 2025 final. Switzerland is also the #1-ranked IIHF nation as of May 2026.',
                },
              },
              {
                '@type': 'Question',
                name: 'What is the format of the IIHF World Championship?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'The 16 teams in the Championship group play a preliminary round split into 2 groups of 8, with each team playing 7 preliminary games. The top 4 teams in each group advance to the playoff medal round (quarterfinals, semifinals, final). The tournament runs over 2 weeks in May each year at host-city venues. The 2026 IIHF World Championship will be held May 15-31 at venues in Fribourg and Zurich, Switzerland.',
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
        <span style={{ color: 'rgba(255,255,255,0.6)' }}>IIHF Worlds</span>
      </nav>

      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: '#fff', letterSpacing: '0.02em', lineHeight: 1, fontFamily: '"Bebas Neue", sans-serif' }}>
          IIHF Ice Hockey World Championship
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.95rem', marginTop: '0.5rem', maxWidth: '780px' }}>
          {teamLabel} across 5 divisions. Founded 1920 (Olympic). 16-team Championship group. Switzerland #1 ranked as of May 2026. 2026 tournament: May 15-31, Fribourg and Zurich, Switzerland.
        </p>
      </div>

      <section style={{ marginBottom: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '0.75rem' }}>
          {teamLabel} • IIHF WORLDS 2026
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1rem' }}>
          The 16 teams in the 2026 IIHF World Championship are split into 2 groups. <strong>Group A</strong> includes Czech Republic (IIHF rank 6), Denmark (10), Finland (4), Slovakia (8), Sweden (5), United States (3), Norway (11), and Slovenia (13). <strong>Group B</strong> includes Canada (2), Switzerland (1), Germany (7), Austria (12), Latvia (9), Great Britain (18, promoted for 2026), Hungary (17, promoted for 2025), and Italy (16, promoted for 2026). Russia and Belarus remain suspended from IIHF competition since 2022.
        </p>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', lineHeight: 1.6 }}>
          The 89th IIHF World Championship (2026) is hosted by Switzerland — the second time Switzerland has hosted the tournament (the first was in 2009). The 2025 IIHF Worlds were also held in Switzerland (in Zurich and Fribourg), with Switzerland defeating the United States in the final for their first-ever gold medal. Sweden is the most successful host nation in the modern era, with Sweden having hosted the World Championship in 2013, 2017, and 2025 (in Stockholm and Herning). The 2024 IIHF Worlds were held in Prague and Ostrava, Czech Republic, with the Czech Republic winning gold.
        </p>
      </section>

      <section style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>IIHF WORLDS HISTORY</h2>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9375rem', lineHeight: 1.75 }}>
          <p style={{ marginBottom: '1rem' }}>
            The IIHF Ice Hockey World Championships trace their history to the 1920 Summer Olympics in Antwerp, Belgium, where Canada won the first Olympic hockey gold medal and was recognized as the first World Champion. The Olympic hockey tournament was also considered the World Championship for each Olympic year through 1968, after which the IIHF began organizing the World Championship as a standalone event. The first standalone World Championship was held in 1930.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            The early World Championships were dominated by Canada, which won 12 of the first 19 Olympic/World titles. The Soviet Union began competing in 1954 and immediately became a force, winning 7 World Championships in their first 12 appearances. From 1963 to 1990, the Soviet Union won 18 of 22 World Championships, including a 9-year winning streak from 1963 to 1971. Canada withdrew from IIHF competition from 1970 to 1977 in protest of the IIHF&apos;s policy on amateur-only players, returning in 1977 when the IIHF opened competition to professionals.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            The 1990s saw the World Championship format evolve. The IIHF introduced a playoff medal round in 1990, replacing the previous round-robin format that often had the gold-medal winner decided before the final game. The tournament expanded as more nations joined, with the field growing from 8 teams in the 1960s to 12 teams by 1992, then to 16 teams from 1998 onward. The lower divisions were introduced progressively — Pool B (now Division I) was created in 1961, Pool C (now Division II) was created in 1987, and Pool D (now Division III) was created in 1996.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            Canada has won the most IIHF World Championship gold medals with 27, followed by Russia/Soviet Union (27, including the suspended 2022-2025 era), Sweden 11, Czech Republic/Czechoslovakia 12, Finland 4, and the United States 3. The 2025 World Championship, held in Zurich and Fribourg, Switzerland, was won by the host nation Switzerland for their first-ever gold medal, defeating the United States 4-0 in the final. The victory was a watershed moment for Swiss hockey, which had previously won only silver and bronze medals at the World Championship.
          </p>
          <p>
            The IIHF has operated the World Championship alongside the Winter Olympics since 1924. Olympic ice hockey is contested at the Winter Games but the NHL and other professional leagues have not always released players for Olympic competition. The World Championship, held annually in May (after the NHL playoffs end), is the most reliable indicator of national-team strength and is the primary competition for the IIHF&apos;s member nations. Russia and Belarus were suspended from IIHF competition in 2022 following the Russian invasion of Ukraine, with the suspensions continuing through the 2026 tournament. The IIHF World Rankings, updated annually, place Switzerland #1 as of May 2026, followed by Canada (#2), the United States (#3), Finland (#4), and Sweden (#5).
          </p>
        </div>
      </section>

      <section style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>HOW THE IIHF WORLDS WORK</h2>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9375rem', lineHeight: 1.75 }}>
          <p style={{ marginBottom: '1rem' }}>
            The IIHF World Championship runs for 2 weeks in May each year. The 16 teams in the top Championship group play a preliminary round split into 2 groups of 8, with each team playing 7 games over the first week. The top 4 teams in each group advance to the playoff medal round (quarterfinals, semifinals, bronze-medal game, gold-medal game). The tournament typically features 64 games over 17 days at 2 host-city venues.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            Below the Championship group, Division I is split into 2 groups of 6 teams each. The Group A winner is promoted to the Championship; the Group B winner moves to Group A; the Group A last-place team is relegated to Group B; the Group B last-place team is relegated to Division II. Division II follows the same structure. Division III has a single group of 6 teams, with promotion to Division II and relegation of the last-place team to a qualification round.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            Each nation&apos;s roster is selected from eligible players who are citizens of the country. Players can switch national teams if they have played in their new nation for a certain period of time and have not played for a different national team in a major IIHF event in the past 2 years. NHL players are eligible to play in the World Championship after their NHL teams are eliminated from the Stanley Cup Playoffs, which is why the World Championship often features top NHL talent in the latter rounds.
          </p>
          <p>
            The 2026 IIHF World Championship will be held May 15-31 at venues in Fribourg and Zurich, Switzerland. The 2027 IIHF Worlds are scheduled for Germany. The tournament is broadcast worldwide on the IIHF&apos;s official broadcast partners — in North America on ESPN, in Europe on various national broadcasters, and in Russia on Channel One (when Russia is not suspended). The World Championship is the most-watched annual ice hockey event in the world, with combined television viewership of 1+ billion across the 64-game tournament.
          </p>
        </div>
      </section>

      <section style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.85rem', lineHeight: 1.6, margin: 0 }}>
          <strong style={{ color: 'rgba(255,255,255,0.7)' }}>Editorial standards.</strong> By Arnel Larracas, Founder &amp; Editor-in-Chief, RinkStop. Last reviewed 2026-10-09.<br />
          <strong style={{ color: 'rgba(255,255,255,0.7)' }}>Data sources.</strong> Team count from RinkStop team_workspaces table. Founded 1920, Canada/Russia 27 titles each, Switzerland 2025 first title, 2026 Fribourg/Zurich May 15-31: Wikipedia (Ice Hockey World Championships), iihf.com.<br />
          <span style={{ color: 'rgba(255,255,255,0.45)' }}><Link href="/editorial-policy" style={{ color: '#FFB81C' }}>Editorial policy</Link> · <Link href="/data-methodology" style={{ color: '#FFB81C' }}>Data methodology</Link> · <Link href="/corrections" style={{ color: '#FFB81C' }}>Report a correction</Link></span>
        </p>
      </section>
    </main>
  );
}
