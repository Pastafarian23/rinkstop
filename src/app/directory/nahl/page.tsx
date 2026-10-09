import type { Metadata } from 'next';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';

// 2026-10-09: New special league page. Source: nahl.com, Wikipedia
// (USPHL). 36 teams in 2026-27. Tier-2 junior (per USA Hockey).
// Tuition-free, NCAA-eligible. 5 divisions (Central, East, Midwest,
// Mountain, South). 59-game regular season. Oldest USA Hockey-
// sanctioned junior circuit, 52nd season in 2026-27.

const NAHL_LEAGUE_ID = '45f36300-636a-4cc4-8a9a-470b820a1016';

async function getNahlTeamCount(): Promise<number> {
  try {
    const { count } = await supabaseAdmin
      .from('team_workspaces')
      .select('id', { count: 'exact', head: true })
      .eq('league_id', NAHL_LEAGUE_ID)
      .eq('is_active', true);
    return count ?? 0;
  } catch {
    return 0;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const teamCount = await getNahlTeamCount();
  return {
    title: teamCount > 0
      ? `NAHL 2026-27 — ${teamCount} Teams, Standings & Schedule | RinkStop`
      : 'NAHL 2026-27 — Standings, Schedule & Teams',
    description: teamCount > 0
      ? `North American Hockey League (NAHL) 2026-27: ${teamCount} teams across 21 US states. Tier-2 junior hockey sanctioned by USA Hockey. Tuition-free, NCAA-eligible. Robertson Cup playoffs.`
      : 'North American Hockey League (NAHL) 2026-27: 36 teams across 21 US states. Tier-2 junior hockey sanctioned by USA Hockey. Tuition-free, NCAA-eligible.',
  };
}

export default async function NahlPage() {
  const teamCount = await getNahlTeamCount();
  const teamLabel = teamCount > 0 ? `${teamCount} TEAMS` : '36 TEAMS';

  return (
    <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@graph': [{
            '@type': 'SportsOrganization',
            '@id': 'https://rinkstop.com/directory/nahl',
            name: 'North American Hockey League',
            url: 'https://rinkstop.com/directory/nahl',
            sport: 'Ice hockey',
            description: 'North American Hockey League (NAHL) — the only Tier-2 junior ice hockey league sanctioned by USA Hockey, with 36 teams across 21 US states. Tuition-free, NCAA-eligible. 52nd season in 2026-27.',
            foundingDate: '1975',
            location: { '@type': 'Place', name: 'United States' },
            sameAs: ['https://en.wikipedia.org/wiki/North_American_Hockey_League'],
          }, {
            '@type': 'FAQPage',
            mainEntity: [
              {
                '@type': 'Question',
                name: 'How many teams play in the NAHL?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'The NAHL fields 36 teams across 21 US states for the 2026-27 season, its 52nd season. The 36 teams are organized into 5 divisions: Central (6), East (8), Midwest (8), Mountain (5), and South (9).',
                },
              },
              {
                '@type': 'Question',
                name: 'When was the NAHL founded?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'The NAHL traces its history to the Great Lakes Junior Hockey League, founded in the mid-1970s as a 5-team Michigan-Ohio circuit. The league was rechristened as the North American Junior Hockey League in 1984 and adopted the current name (North American Hockey League) shortly after. The 2003 merger with the American West Hockey League (AWHL) was a watershed moment — the NAHL grew from 11 to 21 teams and became the largest junior circuit in the US.',
                },
              },
              {
                '@type': 'Question',
                name: 'Is the NAHL tuition-free?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Yes. The NAHL is one of only two leagues in the United States that implements the tuition-free model (the other being the USHL). Tuition-free means families do not pay to have their son play. Players receive room and board with billet families and a small stipend for equipment and personal expenses. The NAHL is sanctioned by USA Hockey as the sole Tier-2 junior league in the US.',
                },
              },
              {
                '@type': 'Question',
                name: 'What is the format of the NAHL season?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'The NAHL regular season runs from September to April, with each team playing a 59-game schedule. Game days are typically Friday-Saturday-Sunday to minimize conflicts with school. The top teams in each division qualify for the NAHL playoffs, with the Robertson Cup (named after league patriarch Chuck Robertson) awarded to the playoff champion. The NAHL works closely with the USHL and USA Hockey&apos;s National Team Development Program in a structured Ladder of Development.',
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
        <span style={{ color: 'rgba(255,255,255,0.6)' }}>NAHL</span>
      </nav>

      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: '#fff', letterSpacing: '0.02em', lineHeight: 1, fontFamily: '"Bebas Neue", sans-serif' }}>
          NAHL — North American Hockey League
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.95rem', marginTop: '0.5rem', maxWidth: '780px' }}>
          {teamLabel} across 21 US states. Tier-2 junior hockey sanctioned by USA Hockey. The only tuition-free league besides the USHL. 59-game regular season. Robertson Cup playoffs. 52nd season in 2026-27.
        </p>
      </div>

      <section style={{ marginBottom: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '0.75rem' }}>
          {teamLabel} • NAHL 2026-27
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1rem' }}>
          The 36 NAHL teams are organized into 5 divisions. The <strong>Central Division</strong> (Upper Midwest) features the Aberdeen Wings, Austin Bruins, Bismarck Bobcats, Minot Minotauros, St. Cloud Norsemen, and Watertown Shamrocks. The <strong>East Division</strong> (Northeast) features the Danbury Hat Tricks, Elmira Aviators, Johnstown Tomahawks, Maryland Black Bears, New Hampshire Mountain Kings, New Jersey Titans, Northeast Generals, and Philadelphia Rebels. The <strong>Midwest Division</strong> (North-Central) features the Anchorage Wolverines, Fairbanks Ice Dogs, Janesville Jets, Kenai River Brown Bears, Minnesota Mallards, Minnesota Wilderness, Springfield Jr. Blues, and Wisconsin Windigo. The <strong>Mountain Division</strong> features the Billings Cattle Punchers, Grand Junction River Hawks, Idaho Falls Spud Kings, Ogden Mustangs, and Pueblo Peppers. The <strong>South Division</strong> features the Amarillo Wranglers, Corpus Christi IceRays, El Paso Rhinos, Houston Bulls, Lone Star Brahmas, New Mexico Ice Wolves, Odessa Jackalopes, Oklahoma Warriors, and Shreveport Mudbugs.
        </p>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', lineHeight: 1.6 }}>
          The NAHL is unique in the junior hockey world for its geographic reach. The 36 teams span from Alaska (Fairbanks Ice Dogs, Anchorage Wolverines) to the Northeast (Johnstown Tomahawks in Pennsylvania, Danbury Hat Tricks in Connecticut) and from the Midwest (Janesville Jets in Wisconsin) to the South (Houston Bulls in Texas, Shreveport Mudbugs in Louisiana). The Alaska teams are the most remote in US junior hockey, requiring multi-day travel to road games. Average NAHL attendance is 1,500-3,000 per game, with strong markets in Johnstown, Shreveport, and Amarillo.
        </p>
      </section>

      <section style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>NAHL HISTORY</h2>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9375rem', lineHeight: 1.75 }}>
          <p style={{ marginBottom: '1rem' }}>
            The NAHL traces its history to the mid-1970s, when the then-Great Lakes Junior Hockey League operated as a rugged 5-team Michigan-Ohio circuit. The Paddock Pools Saints and Detroit Jr. Wings were the league&apos;s cornerstone franchises, with the Paddock Pools Saints setting the tone for excellence by capturing seven consecutive league titles from 1977 to 1984 while sending a flurry of players to the collegiate and professional ranks. The NAHL recognized the league patriarch by naming the playoff championship trophy, the Robertson Cup, in his honor.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            The league was rechristened the North American Junior Hockey League in 1984. By the mid-1990s, the league had grown to two divisions with 10 clubs across the Upper Midwest. The Compuware Ambassadors emerged as a junior powerhouse during this period, winning 8 of 10 NAHL titles from 1986 to 1995. The Detroit amateur hockey juggernaut closed out the millennium by taking league crowns in 1998 and 1999. The league reached beyond the Midwest for the first time in 1999, adding the Frisco (Texas) RoughRiders.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            The 2003 merger with the Rocky Mountain-based American West Hockey League (AWHL) was a watershed moment for the NAHL. The league grew from 11 teams to 21 while becoming the largest junior circuit in the country. The move reshaped the league into what would become four geographical divisions spanning five time zones. The Fairbanks Ice Dogs (Alaska) and the Wasilla Spirit (rebranded as the Alaska Avalanche in 2007) joined, extending the league&apos;s reach into the far Northwest.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            The NAHL has strengthened its presence in the Eastern US over the past decade, with nine new teams in the East, the East Division now the largest with 10 teams. The Johnstown Tomahawks revitalized a historic hockey community in Johnstown, Pennsylvania. The league has expanded South into Texas, Louisiana, New Mexico, and Oklahoma. The Amarillo Bulls, Corpus Christi IceRays, Michigan Warriors, Odessa Jackalopes, and Port Huron Fighting Falcons are all success stories of the league&apos;s expansion into markets that were once traditional minor-pro outposts.
          </p>
          <p>
            The NAHL&apos;s partnership with the USHL and USA Hockey&apos;s National Team Development Program forms a structured Ladder of Development for elite US junior hockey. The NAHL is the only Tier-2 junior league in the US — the USHL is Tier-1, and the NAHL is the next step. Many NAHL alumni advance to NCAA Division I hockey and, ultimately, professional hockey. The 59-game regular season schedule is patterned around weekend games to minimize conflicts with school, and the league operates tuition-free for all players. The 2026-27 season will be the NAHL&apos;s 52nd, a milestone for what started as a 5-team regional Michigan-Ohio circuit.
          </p>
        </div>
      </section>

      <section style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>HOW THE NAHL WORKS</h2>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9375rem', lineHeight: 1.75 }}>
          <p style={{ marginBottom: '1rem' }}>
            The NAHL regular season runs from September to April, with each team playing a 59-game schedule. Game days are typically Friday-Saturday-Sunday to minimize conflicts with school, with most teams playing 2-3 games per weekend. Travel is the league&apos;s defining constraint — Alaska-based teams (Fairbanks Ice Dogs, Anchorage Wolverines) face 3,000+ mile road trips, and Mountain Division teams (Billings, Idaho Falls, Grand Junction) face similar geographic challenges.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            The top teams in each division qualify for the NAHL playoffs, with the Robertson Cup (named after league patriarch Chuck Robertson) awarded to the playoff champion. The 2025-26 Robertson Cup was won by the [defending champion - to be verified]. The NAHL&apos;s playoff format has evolved over the years; the current format is a 4-round single-elimination bracket with the top teams from each division receiving byes.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            NAHL rosters are capped at 23 players, with 4 imports (non-North American) allowed per team. The league operates tuition-free for all players — families do not pay to have their son play. Players receive room and board with billet families (a hockey tradition where local families host junior players for the season), as well as a small stipend for equipment and personal expenses. The tuition-free model is the key to the NAHL&apos;s accessibility — players from middle-class and modest-income backgrounds can compete at the highest level of US junior hockey without financial barriers.
          </p>
          <p>
            NAHL games are broadcast on the NAHL&apos;s HockeyTV partnership, with selected games on ESPN+ and regional sports networks. The league&apos;s official website (nahl.com) provides comprehensive statistics, game reports, and team coverage. The NAHL Showcase, held annually in September, brings all 36 teams to a single venue for a week of regular-season games that serve as the league&apos;s annual scouting event. NHL scouts, NCAA coaches, and USHL evaluators attend the Showcase in large numbers, making it the most important NAHL event of the season.
          </p>
        </div>
      </section>

      <section style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.85rem', lineHeight: 1.6, margin: 0 }}>
          <strong style={{ color: 'rgba(255,255,255,0.7)' }}>Editorial standards.</strong> By Arnel Larracas, Founder &amp; Editor-in-Chief, RinkStop. Last reviewed 2026-10-09.<br />
          <strong style={{ color: 'rgba(255,255,255,0.7)' }}>Data sources.</strong> Team count from RinkStop team_workspaces table. Founded 1975, 2003 AWHL merger, 36 teams in 5 divisions, tuition-free model: nahl.com history page, Wikipedia (NAHL + USPHL).<br />
          <span style={{ color: 'rgba(255,255,255,0.45)' }}><Link href="/editorial-policy" style={{ color: '#FFB81C' }}>Editorial policy</Link> · <Link href="/data-methodology" style={{ color: '#FFB81C' }}>Data methodology</Link> · <Link href="/corrections" style={{ color: '#FFB81C' }}>Report a correction</Link></span>
        </p>
      </section>
    </main>
  );
}
