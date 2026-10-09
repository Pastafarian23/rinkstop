import type { Metadata } from 'next';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';

// 2026-10-09: New special league page. Source: Wikipedia (WHL), chl.ca
// "50 years of the WHL" feature. 23 teams. Founded 1966 as CMJHL.
// Defending champion Everett Silvertips (1st title, 2024-25). Most titles
// Kamloops Blazers & Medicine Hat Tigers (6 each).

const WHL_LEAGUE_ID = '46f49db9-e63d-407d-a99c-802f87576ab2';

async function getWhlTeamCount(): Promise<number> {
  try {
    const { count } = await supabaseAdmin
      .from('team_workspaces')
      .select('id', { count: 'exact', head: true })
      .eq('league_id', WHL_LEAGUE_ID)
      .eq('is_active', true);
    return count ?? 0;
  } catch {
    return 0;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const teamCount = await getWhlTeamCount();
  return {
    title: teamCount > 0
      ? `WHL 2026-27 — ${teamCount} Teams, Standings & Schedule`
      : 'WHL 2026-27 — Standings, Schedule & Teams',
    description: teamCount > 0
      ? `Western Hockey League (WHL) 2026-27: ${teamCount} teams across Western Canada and the U.S. Pacific Northwest. Major-junior league. Competes for the Memorial Cup. Defending champion Everett Silvertips.`
      : 'Western Hockey League (WHL) 2026-27: 23 teams across Western Canada and the U.S. Pacific Northwest. Major-junior league. Competes for the Memorial Cup. Defending champion Everett Silvertips.',
  };
}

export default async function WhlPage() {
  const teamCount = await getWhlTeamCount();
  const teamLabel = teamCount > 0 ? `${teamCount} TEAMS` : '23 TEAMS';

  return (
    <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@graph': [{
            '@type': 'SportsOrganization',
            '@id': 'https://rinkstop.com/directory/whl',
            name: 'Western Hockey League',
            url: 'https://rinkstop.com/directory/whl',
            sport: 'Ice hockey',
            description: 'Western Hockey League (WHL) — one of three major-junior leagues constituting the Canadian Hockey League, founded 1966. 23 teams (17 Canada, 6 US). Defending champion Everett Silvertips.',
            foundingDate: '1966',
            location: { '@type': 'Place', name: 'Western Canada' },
            sameAs: ['https://en.wikipedia.org/wiki/Western_Hockey_League'],
          }, {
            '@type': 'FAQPage',
            mainEntity: [
              {
                '@type': 'Question',
                name: 'How many teams play in the WHL?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'The WHL fields 23 teams across 4 Canadian provinces and 2 U.S. states for 2026-27. The league will expand to 24 teams in 2027 with the addition of a franchise in Chilliwack, British Columbia. The Eastern Conference includes 11 teams (Manitoba, Saskatchewan, Alberta); the Western Conference includes 12 teams (BC, Washington, Oregon).',
                },
              },
              {
                '@type': 'Question',
                name: 'Who has won the most WHL championships?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Kamloops Blazers and Medicine Hat Tigers are tied for the most WHL/CMJHL/WCHL titles with 6 each. Other successful franchises include the Brandon Wheat Kings, Swift Current Broncos, Seattle Thunderbirds, and Portland Winterhawks (the first U.S. team to win the Memorial Cup, in 1983). WHL teams have won 19 Memorial Cup titles since 1972.',
                },
              },
              {
                '@type': 'Question',
                name: 'When was the WHL founded?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'The WHL was founded in 1966 as the Canadian Major Junior Hockey League (CMJHL), with seven member clubs in Saskatchewan and Alberta. The league was renamed the Western Canada Junior Hockey League in 1967, the Western Canada Hockey League in 1968, and finally the Western Hockey League in 1978. The league was created by Bill Hunter (Edmonton Oil Kings owner) and Scotty Munro (Estevan Bruins owner) in response to the Edmonton Oil Kings&apos; need for a major-junior circuit. The CMJHL began as an "outlaw league" before being sanctioned by the CAHA in 1967.',
                },
              },
              {
                '@type': 'Question',
                name: 'What is the format of the WHL season?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'The WHL regular season runs from late September to mid-March, with each of the 23 teams playing 68 games. The top teams in each division qualify for the WHL playoffs, with best-of-seven series through the conference finals and the WHL Championship final. The WHL champion then advances to the Memorial Cup round-robin tournament. The WHL playoffs award the Ed Chynoweth Trophy to the league playoff champion.',
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
        <span style={{ color: 'rgba(255,255,255,0.6)' }}>WHL</span>
      </nav>

      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: '#fff', letterSpacing: '0.02em', lineHeight: 1, fontFamily: '"Bebas Neue", sans-serif' }}>
          WHL — Western Hockey League
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.95rem', marginTop: '0.5rem', maxWidth: '780px' }}>
          {teamLabel} (17 in Western Canada, 6 in the U.S. Pacific Northwest). Founded 1966. One of three major-junior leagues in the Canadian Hockey League (CHL). Defending champion: Everett Silvertips (1st title, 2024-25).
        </p>
      </div>

      <section style={{ marginBottom: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '0.75rem' }}>
          {teamLabel} • WHL 2026-27
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1rem' }}>
          The WHL&apos;s two conferences of two divisions each span a vast geographic territory. The Eastern Conference includes the East Division (Brandon Wheat Kings, Moose Jaw Warriors, Prince Albert Raiders, Regina Pats, Saskatoon Blades, Swift Current Broncos, Winnipeg ICE) and the Central Division (Calgary Hitmen, Cranbrook Bucks, Edmonton Oil Kings, Lethbridge Hurricanes, Medicine Hat Tigers, Red Deer Rebels). The Western Conference includes the B.C. Division (Kamloops Blazers, Kelowna Rockets, Penticton Vees, Prince George Cougars, Vancouver Giants, Victoria Royals) and the U.S. Division (Everett Silvertips, Portland Winterhawks, Seattle Thunderbirds, Spokane Chiefs, Tri-City Americans, Wenatchee Wild).
        </p>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', lineHeight: 1.6 }}>
          The WHL is the largest of the three CHL leagues by geography. Travel is a defining feature of WHL hockey — buses are common, with the longest bus trips exceeding 1,500 km. Average attendance is 3,500-5,000 per game, with strong markets including Calgary, Edmonton, Saskatoon, Spokane, Seattle, Portland, and Kamloops.
        </p>
      </section>

      <section style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>WHL HISTORY</h2>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9375rem', lineHeight: 1.75 }}>
          <p style={{ marginBottom: '1rem' }}>
            The Western Hockey League was founded in 1966 as the Canadian Major Junior Hockey League (CMJHL). The Canadian Amateur Hockey Association (CAHA) had informed the Edmonton Oil Kings that they would need to play full-time in a junior league to remain eligible for the Memorial Cup. Bill Hunter, the Oil Kings&apos; owner, partnered with Scotty Munro (Estevan Bruins), Jim Piggott (Saskatoon Blades), and Del Wilson (Regina Pats) to create a Western Canadian major-junior circuit. Five Saskatchewan Junior Hockey League clubs (Bruins, Moose Jaw Canucks, Regina Pats, Saskatoon Blades, Weyburn Red Wings) joined the Oil Kings and Calgary Buffaloes to form the CMJHL in 1966-67.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            The CAHA initially declared the CMJHL an "outlaw league" and suspended its teams from Memorial Cup competition. The new league launched legal action against the CAHA in March 1967. The CMJHL renamed itself the Western Canada Junior Hockey League (WCJHL) in May 1967 and added four new teams, including the Swift Current Broncos and three Manitoba-based clubs (Brandon, Flin Flon, Winnipeg). The CAHA-NHL development agreement of July 1967 ended the dispute by allowing junior players to enter the NHL draft at age 20, which CAHA saw as resolving the talent-pool issue. The WCJHL was sanctioned by CAHA, allowing the 1967-68 champion Estevan Bruins to compete for the Memorial Cup.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            The league was renamed the Western Canada Hockey League (WCHL) in 1968, then the Western Hockey League (WHL) in 1978 when the league embraced U.S.-based teams. British Columbia entered the league in 1971-72, with the transfer of the Estevan franchise to New Westminster and the addition of Vancouver and Victoria. Portland joined in 1976, becoming the first U.S. team in the league. The Portland Winterhawks won the 1983 Memorial Cup, the first U.S. team to do so. The league expanded rapidly in the 2000s to its current 22-23 team configuration.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            Bobby Clarke led the Flin Flon Bombers to back-to-back WHL titles in 1969 and 1970. The Flin Flon Bombers then lost the 1971 WHL final to the Edmonton Oil Kings. The 1970s also saw the rise of the Regina Pats, who won the WHL championship four times in the decade. The 1980s saw the Portland Winterhawks and Medicine Hat Tigers establish dynasties, with the Tigers winning 3 WHL titles in 6 years. The 1990s brought the Swift Current Broncos and Brandon Wheat Kings to prominence. The 2000s and 2010s saw the Kamloops Blazers win 3 WHL titles and the Kelowna Rockets win 2.
          </p>
          <p>
            The WHL has produced more NHL draft picks than any other CHL league, in part because of the league&apos;s deep geographic footprint and large rosters. Notable WHL alumni include Hart Trophy winners Bobby Clarke, Bryan Trottier, Joe Sakic, Jarome Iginla, Mark Messier, Brett Hull, and others. The league&apos;s 50th anniversary was celebrated in 2016-17, with the league&apos;s 60th anniversary in 2026-27. Everett Silvertips won the 2024-25 Ed Chynoweth Trophy as WHL playoff champion, then won the 2025 Memorial Cup for the first time in franchise history. The WHL will add a 24th team in Chilliwack, BC for 2027-28.
          </p>
        </div>
      </section>

      <section style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>HOW THE WHL WORKS</h2>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9375rem', lineHeight: 1.75 }}>
          <p style={{ marginBottom: '1rem' }}>
            The WHL regular season runs from late September to mid-March, with each of the 23 teams playing 68 games. The schedule is weighted by geography — bus travel between cities like Cranbrook, BC and Saint John, NB (via Swift Current) can exceed 1,500 km. Three points are awarded for a regulation or overtime win, two for a shootout win, one for an overtime loss, and zero for a regulation loss.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            The top teams in each division qualify for the WHL playoffs. The first two rounds are typically intra-division; the conference quarterfinals, conference semifinals, and WHL Championship final are all best-of-seven series. The WHL champion receives the Ed Chynoweth Trophy (named after the long-time WHL president), awarded since 1973.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            The WHL champion advances to the Memorial Cup tournament alongside the OHL and QMJHL champions and the host-city representative. The Memorial Cup tournament is held in late May and consists of a round-robin followed by a semifinal and a final. The Memorial Cup has been awarded to the Canadian junior hockey champion since 1919, making it one of the most prestigious trophies in hockey.
          </p>
          <p>
            WHL rosters are capped at 25 players for the standard playing roster, with a maximum of 4 import (non-North American) players per team. U.S.-born players on U.S.-based WHL teams are not counted as imports. The WHL Priority Selection draft is held each spring. Top WHL players graduate to NHL, AHL, NCAA, or European professional hockey. The WHL&apos;s 19 Memorial Cup titles since 1972 are the most of any CHL league.
          </p>
        </div>
      </section>

      <section style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.85rem', lineHeight: 1.6, margin: 0 }}>
          <strong style={{ color: 'rgba(255,255,255,0.7)' }}>Editorial standards.</strong> By Arnel Larracas, Founder &amp; Editor-in-Chief, RinkStop. Last reviewed 2026-10-09.<br />
          <strong style={{ color: 'rgba(255,255,255,0.7)' }}>Data sources.</strong> Team count from RinkStop team_workspaces table. Founded 1966 (CMJHL), Ed Chynoweth Trophy history, 1983 Memorial Cup Portland Winterhawks, 2025 Memorial Cup Everett Silvertips: Wikipedia (Western Hockey League), chl.ca "50 Years of the WHL" feature.<br />
          <span style={{ color: 'rgba(255,255,255,0.45)' }}><Link href="/editorial-policy" style={{ color: '#FFB81C' }}>Editorial policy</Link> · <Link href="/data-methodology" style={{ color: '#FFB81C' }}>Data methodology</Link> · <Link href="/corrections" style={{ color: '#FFB81C' }}>Report a correction</Link></span>
        </p>
      </section>
    </main>
  );
}
