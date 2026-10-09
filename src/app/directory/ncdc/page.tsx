import type { Metadata } from 'next';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';

// 2026-10-09: New special league page. Source: Wikipedia (USPHL),
// Islanders USPHL press release (Dec 2016). Founded 2017 under USPHL
// umbrella. 22 teams. Tuition-free Tier-2 (unaffiliated with USA Hockey
// since 2017). Premier development path for NCAA D-I hockey, especially
// in the Northeast.

const NCDC_LEAGUE_ID = 'a1b968b4-8cdd-4fef-aa09-001815319e86';

async function getNcdcTeamCount(): Promise<number> {
  try {
    const { count } = await supabaseAdmin
      .from('team_workspaces')
      .select('id', { count: 'exact', head: true })
      .eq('league_id', NCDC_LEAGUE_ID)
      .eq('is_active', true);
    return count ?? 0;
  } catch {
    return 0;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const teamCount = await getNcdcTeamCount();
  return {
    title: teamCount > 0
      ? `NCDC 2026-27 — ${teamCount} Teams, Standings & Schedule | RinkStop`
      : 'NCDC 2026-27 — Standings, Schedule & Teams',
    description: teamCount > 0
      ? `National Collegiate Development Conference (NCDC) 2026-27: ${teamCount} teams across the US Northeast and beyond. Tier-2 tuition-free junior hockey. Part of the USPHL family. Premier NCAA D-I development path.`
      : 'National Collegiate Development Conference (NCDC) 2026-27: ~22 teams across the US. Tier-2 tuition-free junior hockey. Premier NCAA D-I development path.',
  };
}

export default async function NcdcPage() {
  const teamCount = await getNcdcTeamCount();
  const teamLabel = teamCount > 0 ? `${teamCount} TEAMS` : '22 TEAMS';

  return (
    <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@graph': [{
            '@type': 'SportsOrganization',
            '@id': 'https://rinkstop.com/directory/ncdc',
            name: 'National Collegiate Development Conference',
            url: 'https://rinkstop.com/directory/ncdc',
            sport: 'Ice hockey',
            description: 'National Collegiate Development Conference (NCDC) — Tier-2 tuition-free junior ice hockey league founded 2017 under the USPHL umbrella. Premier development path for NCAA D-I hockey. ~22 teams, primarily in the US Northeast.',
            foundingDate: '2017',
            location: { '@type': 'Place', name: 'United States' },
            sameAs: ['https://en.wikipedia.org/wiki/National_Collegiate_Development_Conference'],
          }, {
            '@type': 'FAQPage',
            mainEntity: [
              {
                '@type': 'Question',
                name: 'How many teams play in the NCDC?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'The NCDC fields approximately 22 teams for the 2026-27 season, primarily in the US Northeast. The league is part of the USPHL (United States Premier Hockey League) family of leagues, with the NCDC serving as the highest tier of the USPHL junior hockey system. The 2025-26 NCDC champion was South Shore Kings.',
                },
              },
              {
                '@type': 'Question',
                name: 'When was the NCDC founded?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'The NCDC was launched in December 2016 by the United States Premier Hockey League (USPHL) and debuted with the 2017-18 season. The NCDC was created to fill a Tier-2 tuition-free junior hockey gap in the US, positioned between the Tier-1 USHL and the lower Tier-3 USPHL Premier Division. USA Hockey denied the USPHL&apos;s request for Tier-2 sanctioning, so the league operates unsanctioned and is not part of the NCAA eligibility framework as a sanctioned Tier-2 league.',
                },
              },
              {
                '@type': 'Question',
                name: 'Is the NCDC tuition-free?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Yes. The NCDC is tuition-free, meaning families do not pay to have their son play. Players receive room and board with billet families, equipment, and a small stipend for personal expenses. The NCDC is one of three tuition-free junior hockey options in the US, alongside the Tier-1 USHL and the Tier-2 NAHL.',
                },
              },
              {
                '@type': 'Question',
                name: 'What is the NCDC format?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'The NCDC regular season runs from September to April, with each team playing 50-60 games. The NCDC playoffs culminate in the NCDC Championship, with the NCDC champion advancing to the NAHL Top Prospects Tournament and other showcase events. The NCDC operates 8 "Tenders" per team — mutual agreements with players that secure their rights for a multi-year period — as part of its player development model.',
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
        <span style={{ color: 'rgba(255,255,255,0.6)' }}>NCDC</span>
      </nav>

      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: '#fff', letterSpacing: '0.02em', lineHeight: 1, fontFamily: '"Bebas Neue", sans-serif' }}>
          NCDC — National Collegiate Development Conference
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.95rem', marginTop: '0.5rem', maxWidth: '780px' }}>
          {teamLabel} across the US Northeast. Founded 2017. Tier-2 tuition-free junior hockey. Part of the USPHL family. Premier NCAA D-I development path. South Shore Kings are the 2025-26 NCDC champions.
        </p>
      </div>

      <section style={{ marginBottom: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '0.75rem' }}>
          {teamLabel} • NCDC 2026-27
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1rem' }}>
          The NCDC is concentrated in the US Northeast, with most teams based in Massachusetts, New York, New Jersey, Connecticut, New Hampshire, and Pennsylvania. Notable NCDC teams include the South Shore Kings (Foxboro, MA — multiple NCDC champions), Boston Junior Bruins (Boston, MA), Northern Cyclones (Hudson, NH), Islanders Hockey Club (North Andover, MA), PAL Junior Islanders (Hauppauge, NY), New Jersey Rockets (Bridgewater, NJ), Rockets Hockey Club, Connecticut Jr. Rangers, Wilkes-Barre/Scranton Knights, and Jersey Hitmen.
        </p>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', lineHeight: 1.6 }}>
          The NCDC was created to fill a gap in the US junior hockey development system. The Tier-1 USHL is the highest level but is geographically limited to the Midwest and Plains, while the Tier-2 NAHL has its strongest presence in the Midwest, Mountain, and South regions. The NCDC was designed as a tuition-free option for players in the Northeast, the most hockey-dense region of the United States, with proximity to dozens of NCAA D-I programs in the Northeast and the ability to play in front of college scouts without traveling to the Midwest.
        </p>
      </section>

      <section style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>NCDC HISTORY</h2>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9375rem', lineHeight: 1.75 }}>
          <p style={{ marginBottom: '1rem' }}>
            The NCDC was launched in December 2016 by the United States Premier Hockey League (USPHL) and debuted with the 2017-18 season. The USPHL was founded in 2012 by several organizations within the Eastern Junior Hockey League (EJHL) that wanted to form their own league, and grew rapidly through the 2010s. The 11 founding NCDC teams were the Boston Bandits, Junior Bruins, Connecticut Jr. Rangers, Islanders Hockey Club, Jersey Hitmen, New Jersey Rockets, Northern Cyclones, PAL Junior Islanders, Rochester Monarchs, South Shore Kings, and Syracuse Stars.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            The USPHL had applied to USA Hockey for approval to start a Tier-2 junior league for the 2017-18 season, but USA Hockey denied the application in December 2016, citing concerns about the proliferation of Tier-2 leagues and the protection of the existing Tier-2 NAHL. In response, the USPHL dropped USA Hockey sanctioning from all of their junior level leagues (NCDC, Premier, Elite) beginning with the 2017-18 season. The 18U, 16U, and 15U USPHL divisions remain USA Hockey Tier-1 youth sanctioned.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            The NCDC has expanded steadily since 2017, growing from 11 founding teams to approximately 22 in the 2026-27 season. The 2022-23 season saw several new teams join, including the Mercer Chiefs (NCDC) and others. The 2024-25 season saw the Idaho Falls Spud Kings and Vernal Oilers join the NCDC, expanding the league&apos;s geographic reach into the Mountain West. The South Shore Kings have been the most successful NCDC franchise with multiple NCDC Championship titles, including the 2025-26 championship.
          </p>
          <p>
            The NCDC has produced numerous NCAA D-I players, with the league&apos;s proximity to Northeastern college programs making it a popular development path for players targeting schools like Boston College, Boston University, Northeastern, UConn, and others. The NCDC&apos;s Tenders system — 8 multi-year player agreements per team — was designed to give teams more stability in player development than the USPHL Premier or Elite divisions. The 2017 Rochester Monarchs franchise was revoked by the USPHL for poor performance after the 2019-20 season, illustrating the league&apos;s accountability standards. The NCDC has been a successful Tier-2 alternative to the NAHL for players in the Northeast, and the two leagues now operate as parallel Tier-2 options with distinct geographic focuses.
          </p>
        </div>
      </section>

      <section style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>HOW THE NCDC WORKS</h2>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9375rem', lineHeight: 1.75 }}>
          <p style={{ marginBottom: '1rem' }}>
            The NCDC regular season runs from September to April, with each team playing 50-60 games depending on the season. Game days are typically Friday-Saturday-Sunday to minimize conflicts with school. The NCDC&apos;s geographic concentration in the Northeast means teams can drive to road games (vs. the NAHL&apos;s fly-and-bus travel), making the schedule more cost-efficient for teams and players.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            The NCDC Tenders system is a key structural feature. Each NCDC team has 8 multi-year Tenders — mutual agreements signed by the player (or parents if under 18) and the team — that secure a player&apos;s rights for up to 2 years. The Tenders are a form of player-development contract that gives teams more stability than the standard draft-and-trade system used by the CHL. Tendered players are not bound to their original team but receive priority in player development resources.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            NCDC rosters are capped at 23 players per team, with the age limit mirroring USA Hockey Tier-2 standards (16-20). Players retain NCAA eligibility and are the primary development pipeline for NCAA D-I programs in the Northeast. The NCDC has worked to position itself as a legitimate alternative to the NAHL, with the leagues now operating in parallel as the two tuition-free Tier-2 options in the US junior hockey system.
          </p>
          <p>
            NCDC games are broadcast on the USPHL&apos;s HockeyTV partnership and on the league&apos;s official social media channels. The NCDC&apos;s annual showcase events — held in the Boston and New York markets — attract large numbers of NCAA scouts and NHL talent evaluators. The NCDC Championship, held in late March or early April, crowns the league&apos;s playoff champion. Notable NCDC alumni include players who have advanced to NCAA D-I programs (Boston College, Boston University, Northeastern, UConn, Providence, Quinnipiac) and from there to NHL draft picks and professional careers.
          </p>
        </div>
      </section>

      <section style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.85rem', lineHeight: 1.6, margin: 0 }}>
          <strong style={{ color: 'rgba(255,255,255,0.7)' }}>Editorial standards.</strong> By Arnel Larracas, Founder &amp; Editor-in-Chief, RinkStop. Last reviewed 2026-10-09.<br />
          <strong style={{ color: 'rgba(255,255,255,0.7)' }}>Data sources.</strong> Team count from RinkStop team_workspaces table. Founded 2017, 11 founding teams, 2017 USA Hockey denial, 8 Tenders per team, South Shore Kings 2025-26: Wikipedia (NCDC + USPHL), Islanders USPHL press release (December 14, 2016).<br />
          <span style={{ color: 'rgba(255,255,255,0.45)' }}><Link href="/editorial-policy" style={{ color: '#FFB81C' }}>Editorial policy</Link> · <Link href="/data-methodology" style={{ color: '#FFB81C' }}>Data methodology</Link> · <Link href="/corrections" style={{ color: '#FFB81C' }}>Report a correction</Link></span>
        </p>
      </section>
    </main>
  );
}
