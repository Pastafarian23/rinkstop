import type { Metadata } from 'next';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';

// 2026-10-09: New special league page. Source: echl.com/about/history,
// Wikipedia (ECHL). 30 teams in 2026-27 (24 US states + 1 Canadian
// province). Founded 1988 by Henry Brabham. Defending champion Florida
// Everblades (5th title, 2025-26). Most successful club.

const ECHL_LEAGUE_ID = '85e8e902-441c-4102-b111-5a37f0350484';

async function getEchlTeamCount(): Promise<number> {
  try {
    const { count } = await supabaseAdmin
      .from('team_workspaces')
      .select('id', { count: 'exact', head: true })
      .eq('league_id', ECHL_LEAGUE_ID)
      .eq('is_active', true);
    return count ?? 0;
  } catch {
    return 0;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const teamCount = await getEchlTeamCount();
  return {
    title: teamCount > 0
      ? `ECHL 2026-27 — ${teamCount} Teams, Standings & Schedule | RinkStop`
      : 'ECHL 2026-27 — Standings, Schedule & Teams | RinkStop',
    description: teamCount > 0
      ? `ECHL (East Coast Hockey League) 2026-27: ${teamCount} teams in 24 US states and 1 Canadian province. Tier-3 minor professional league. 72-game regular season. Kelly Cup playoffs. Defending champion Florida Everblades.`
      : 'ECHL (East Coast Hockey League) 2026-27: 30 teams in 24 US states and 1 Canadian province. Tier-3 minor professional league. 72-game regular season. Kelly Cup playoffs. Defending champion Florida Everblades.',
  };
}

export default async function EchlPage() {
  const teamCount = await getEchlTeamCount();
  const teamLabel = teamCount > 0 ? `${teamCount} TEAMS` : '30 TEAMS';

  return (
    <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@graph': [{
            '@type': 'SportsOrganization',
            '@id': 'https://rinkstop.com/directory/echl',
            name: 'ECHL',
            alternateName: 'East Coast Hockey League (1988-2003), now "ECHL"',
            url: 'https://rinkstop.com/directory/echl',
            sport: 'Ice hockey',
            description: 'ECHL — minor professional ice hockey league based in Shrewsbury, New Jersey, founded 1988. Tier below the AHL. 30 teams in 24 US states and 1 Canadian province for 2026-27. Defending champion: Florida Everblades (5 titles, the most in league history).',
            foundingDate: '1988',
            location: { '@type': 'Place', name: 'United States' },
            sameAs: ['https://en.wikipedia.org/wiki/ECHL'],
          }, {
            '@type': 'FAQPage',
            mainEntity: [
              {
                '@type': 'Question',
                name: 'How many teams play in the ECHL?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'The ECHL fields 30 teams across 24 US states and 1 Canadian province (Trois-Rivières, Quebec) for the 2026-27 season. The 2026-27 expansion includes the debut of the New Mexico Goatheads (Rio Rancho, NM) and the return of ECHL hockey to Trenton, NJ with the Trenton Ironhawks. The league is the third tier of professional hockey in North America (after the NHL and AHL).',
                },
              },
              {
                '@type': 'Question',
                name: 'Who has won the most ECHL championships?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Florida Everblades hold the record with 5 Kelly Cup (ECHL playoff) titles, the most in league history. Other successful franchises include the South Carolina Stingrays, Alaska Aces, Cincinnati Cyclones, and Toledo Walleye, each with multiple titles. Florida won the 2025-26 Kelly Cup for their 5th championship, defeating the Kansas City Mavericks.',
                },
              },
              {
                '@type': 'Question',
                name: 'When was the ECHL founded?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'The ECHL was founded in 1988 as the East Coast Hockey League by Vinton, Virginia oil man Henry Brabham, combining teams from the defunct Atlantic Coast Hockey League and All-American Hockey League. The inaugural 1988-89 season began with 5 teams: Carolina Thunderbirds, Erie Panthers, Johnstown Chiefs, Knoxville Cherokees, and Virginia Lancers. The league changed its name to "ECHL" in 2003 to reflect its nationwide presence. Patrick J. Kelly served as Commissioner from 1988 to 2019, the only Commissioner in league history until his death in 2019.',
                },
              },
              {
                '@type': 'Question',
                name: 'What is the format of the ECHL season?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'The ECHL regular season runs from October to April, with each of the 30 teams playing 72 games. The top 4 teams in each division qualify for the Kelly Cup playoffs. The ECHL playoffs run from April to June and are best-of-seven through the division semifinals, division finals, conference finals, and Kelly Cup finals. The ECHL is affiliated with 30 of the 32 NHL teams in 2025-26, providing the primary development path between junior/minor pro and the AHL.',
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
        <span style={{ color: 'rgba(255,255,255,0.6)' }}>ECHL</span>
      </nav>

      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: '#fff', letterSpacing: '0.02em', lineHeight: 1, fontFamily: '"Bebas Neue", sans-serif' }}>
          ECHL — East Coast Hockey League
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.95rem', marginTop: '0.5rem', maxWidth: '780px' }}>
          {teamLabel} in 24 US states and 1 Canadian province. Founded 1988. Tier-3 minor professional league (NHL &gt; AHL &gt; ECHL). 72-game regular season. Kelly Cup playoff championship. Defending champion: Florida Everblades (5th title, 2025-26).
        </p>
      </div>

      <section style={{ marginBottom: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '0.75rem' }}>
          {teamLabel} • ECHL 2026-27
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1rem' }}>
          The ECHL&apos;s 30 teams are organized into two conferences of two divisions each. The Eastern Conference includes the North Division (Adirondack Thunder, Greensboro Gargoyles, Maine Mariners, Norfolk Admirals, Reading Royals, Trenton Ironhawks, Trois-Rivières Lions, Worcester Railers) and the South Division (Atlanta Gladiators, Florida Everblades, Greenville Swamp Rabbits, Jacksonville Icemen, Orlando Solar Bears, Savannah Ghost Pirates, South Carolina Stingrays). The Western Conference includes the Central Division (Bloomington Bison, Cincinnati Cyclones, Fort Wayne Komets, Indy Fuel, Kalamazoo Wings, Toledo Walleye, Wheeling Nailers) and the Mountain Division (Allen Americans, Idaho Steelheads, Kansas City Mavericks, New Mexico Goatheads, Rapid City Rush, Tahoe Knight Monsters, Tulsa Oilers, Wichita Thunder).
        </p>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', lineHeight: 1.6 }}>
          ECHL attendance averages 4,000-6,000 per game, with strong markets including Orlando, Florida, Cincinnati, Toledo, Idaho, and South Carolina. The ECHL is affiliated with 30 of the 32 NHL teams — the highest concentration of affiliations of any minor professional league in North America. Each NHL team that operates an AHL affiliate typically also has an ECHL affiliate, completing the development pipeline from NCAA/CHL/European pro through ECHL to AHL to NHL.
        </p>
      </section>

      <section style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>ECHL HISTORY</h2>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9375rem', lineHeight: 1.75 }}>
          <p style={{ marginBottom: '1rem' }}>
            The ECHL was founded in 1988 as the East Coast Hockey League, the brainchild of Vinton, Virginia oil man Henry Brabham. The league was formed by combining teams from the defunct Atlantic Coast Hockey League (ACHL) and the All-American Hockey League (AAHL). The inaugural 1988-89 season began with 5 teams: Carolina Thunderbirds (now the Wheeling Nailers), Erie Panthers (folded 2011 as the Victoria Salmon Kings), Johnstown Chiefs (now the Greenville Swamp Rabbits), Knoxville Cherokees (folded 2009), and Virginia Lancers (now the Trenton Ironhawks). Patrick J. Kelly was named the first Commissioner.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            The ECHL grew rapidly through the 1990s and 2000s, adding teams across the eastern United States. The 1995-96 season brought the league to 21 teams; by 2002-03, the ECHL had 29 teams. The 2003-04 season was a watershed: the ECHL absorbed the West Coast Hockey League, adding 7 teams in western North America (Alaska Aces, Bakersfield Condors, Fresno Falcons, Idaho Steelheads, Las Vegas Wranglers, Long Beach Ice Dogs, San Diego Gulls), and the league changed its name to "ECHL" to reflect its now-national presence. At its 2003-04 peak the ECHL had 31 teams.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            The ECHL has long been the third tier of professional hockey in North America, behind the NHL and AHL, with affiliations to NHL clubs. The 2014-15 season saw the league reach its highest profile when the ECHL announced affiliations with 26 NHL teams — the most in league history. The COVID-19 pandemic disrupted the 2019-20 and 2020-21 seasons, with the Kelly Cup cancelled in 2020. The league returned to a 72-game regular season in 2021-22 and has continued to grow since.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            Patrick J. Kelly served as ECHL Commissioner from 1988 to his death in 2019, the only Commissioner in league history. Ryan Crelin succeeded him. The league has had 782 players who went on to play in the NHL after starting their careers in the ECHL, including 14 who made their NHL debuts in the 2025-26 season. The 2025-26 Kelly Cup was won by the Florida Everblades for their 5th championship, defeating the Kansas City Mavericks in the finals.
          </p>
          <p>
            The 2026-27 ECHL season opens October 16, 2026 with 7 games, including the debut of the expansion New Mexico Goatheads (Rio Rancho) and the return of ECHL hockey to Trenton, NJ. The 1,080-game regular season will conclude April 11, 2027. The league is the primary development path between junior/minor professional hockey and the AHL, with affiliations to 30 of the 32 NHL teams.
          </p>
        </div>
      </section>

      <section style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>HOW THE ECHL WORKS</h2>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9375rem', lineHeight: 1.75 }}>
          <p style={{ marginBottom: '1rem' }}>
            The ECHL regular season runs from mid-October to early April, with each of the 30 teams playing 72 games. The 2026-27 season opens October 16, 2026 and concludes April 11, 2027. Three points are awarded for a regulation or overtime win, two for a shootout win, one for an overtime loss, and zero for a regulation loss. The schedule includes intra-division games (more frequent), inter-division games, and inter-conference games.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            The top 4 teams in each division qualify for the Kelly Cup playoffs. The playoffs run from April to June and are best-of-seven through the division semifinals, division finals, conference finals, and Kelly Cup finals. The Kelly Cup has been awarded to the ECHL playoff champion since the 1988-89 inaugural season and is named in honor of Patrick J. Kelly. The 2025-26 Kelly Cup was won by the Florida Everblades.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            ECHL rosters are capped at 21 players for the standard playing roster (a salary cap of $13,000 per week), with a maximum salary cap that has been a defining constraint of the league. ECHL players typically hold dual-affiliation agreements with AHL clubs, allowing them to be promoted to the AHL during the season. The ECHL is the primary feeder to the AHL.
          </p>
          <p>
            The ECHL is affiliated with 30 of the 32 NHL teams in 2025-26, marking the 28th consecutive season that the league has affiliations with at least 20 NHL teams. Notable ECHL alumni who went on to NHL careers include: Arturs Irbe, Olaf Kolzig, Chris Drury, Dan Ellis, Chris Mason, Scott Clemmensen, Ryan Miller (briefly), Tim Thomas (briefly), and many current NHL regulars who cycled through the ECHL during their development.
          </p>
        </div>
      </section>

      <section style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.85rem', lineHeight: 1.6, margin: 0 }}>
          <strong style={{ color: 'rgba(255,255,255,0.7)' }}>Editorial standards.</strong> By Arnel Larracas, Founder &amp; Editor-in-Chief, RinkStop. Last reviewed 2026-10-09.<br />
          <strong style={{ color: 'rgba(255,255,255,0.7)' }}>Data sources.</strong> Team count from RinkStop team_workspaces table. Founded 1988, Florida Everblades 5 titles, 782 NHL alumni, 30-team 2026-27 season: echl.com/about/history, Wikipedia (ECHL), 2026-27 ECHL schedule announcement (May 2026).<br />
          <span style={{ color: 'rgba(255,255,255,0.45)' }}><Link href="/editorial-policy" style={{ color: '#FFB81C' }}>Editorial policy</Link> · <Link href="/data-methodology" style={{ color: '#FFB81C' }}>Data methodology</Link> · <Link href="/corrections" style={{ color: '#FFB81C' }}>Report a correction</Link></span>
        </p>
      </section>
    </main>
  );
}
