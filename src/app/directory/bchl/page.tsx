import type { Metadata } from 'next';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';

// 2026-10-09: New special league page. Source: bchl.ca/bchl-history,
// Wikipedia (List of BCHL seasons). Founded 1961 as Okanagan-Mainline
// Junior Hockey League (OMJHL). 20 teams in 2026-27. BCHL departed
// Hockey Canada in 2023 and now operates as an independent league.
// Penticton Vees and Vernon Vipers are the most successful franchises.

const BCHL_LEAGUE_ID = '61cd325e-6f91-408d-a9ee-8cb8b04d9308';

async function getBchlTeamCount(): Promise<number> {
  try {
    const { count } = await supabaseAdmin
      .from('team_workspaces')
      .select('id', { count: 'exact', head: true })
      .eq('league_id', BCHL_LEAGUE_ID)
      .eq('is_active', true);
    return count ?? 0;
  } catch {
    return 0;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const teamCount = await getBchlTeamCount();
  return {
    title: teamCount > 0
      ? `BCHL 2026-27 — ${teamCount} Teams, Standings & Schedule | RinkStop`
      : 'BCHL 2026-27 — Standings, Schedule & Teams',
    description: teamCount > 0
      ? `BC Hockey League (BCHL) 2026-27: ${teamCount} teams across British Columbia, Canada. Junior-A league (independent of Hockey Canada since 2023). Penticton Vees and Vernon Vipers most successful franchises.`
      : 'BC Hockey League (BCHL) 2026-27: 20 teams across British Columbia. Junior-A league (independent of Hockey Canada since 2023). Penticton Vees and Vernon Vipers most successful.',
  };
}

export default async function BchlPage() {
  const teamCount = await getBchlTeamCount();
  const teamLabel = teamCount > 0 ? `${teamCount} TEAMS` : '20 TEAMS';

  return (
    <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@graph': [{
            '@type': 'SportsOrganization',
            '@id': 'https://rinkstop.com/directory/bchl',
            name: 'BC Hockey League',
            url: 'https://rinkstop.com/directory/bchl',
            sport: 'Ice hockey',
            description: 'BC Hockey League (BCHL) — British Columbia\'s top junior hockey league, founded 1961. 20 teams across BC. Independent of Hockey Canada since 2023. Major development path for NCAA D-I hockey and NHL.',
            foundingDate: '1961',
            location: { '@type': 'Place', name: 'British Columbia, Canada' },
            sameAs: ['https://en.wikipedia.org/wiki/British_Columbia_Hockey_League'],
          }, {
            '@type': 'FAQPage',
            mainEntity: [
              {
                '@type': 'Question',
                name: 'How many teams play in the BCHL?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'The BCHL fields 20 teams for 2026-27 across British Columbia. The league is divided into 2 conferences: the Interior Conference (Okanagan, Kootenay, and northern BC teams) and the Island/Mainland Conference (Vancouver Island, Greater Vancouver, and Fraser Valley teams).',
                },
              },
              {
                '@type': 'Question',
                name: 'When was the BCHL founded?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'The BCHL was founded in 1961 as the Okanagan-Mainline Junior Hockey League (OMJHL), with 4 teams: Kamloops Rockets, Kelowna Buckaroos, Penticton Junior Vees, and Vernon Junior Canadians. The league was renamed the British Columbia Junior Hockey League (BCJHL) in 1967, then the British Columbia Hockey League (BCHL) in 1995. The 2023-24 season was the BCHL&apos;s first as an independent league after departing Hockey Canada.',
                },
              },
              {
                '@type': 'Question',
                name: 'Who has won the most BCHL championships?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'The Penticton Vees are the most successful BCHL franchise with 13+ league championships, including their 2023-24 BCHL championship in the league&apos;s first season as an independent operation. The Vernon Vipers have 6+ championships, and the Nanaimo Clippers have 3+ titles. The BCHL is the only major-junior-A league in North America that operates independently of Hockey Canada.',
                },
              },
              {
                '@type': 'Question',
                name: 'What is the BCHL format?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'The BCHL regular season runs from September to March, with each team playing 54 games. The top teams in each conference qualify for the BCHL playoffs, with the Fred J. Hume Award (the league championship trophy) awarded to the playoff champion. The BCHL is a primary development path for NCAA D-I hockey and the NHL — the league has produced more than 200 NHL draft picks since 2000.',
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
        <span style={{ color: 'rgba(255,255,255,0.6)' }}>BCHL</span>
      </nav>

      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: '#fff', letterSpacing: '0.02em', lineHeight: 1, fontFamily: '"Bebas Neue", sans-serif' }}>
          BCHL — BC Hockey League
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.95rem', marginTop: '0.5rem', maxWidth: '780px' }}>
          {teamLabel} across British Columbia, Canada. Founded 1961. Independent of Hockey Canada since 2023. Major development path for NCAA D-I hockey and the NHL. Penticton Vees and Vernon Vipers most successful.
        </p>
      </div>

      <section style={{ marginBottom: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '0.75rem' }}>
          {teamLabel} • BCHL 2026-27
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1rem' }}>
          The 20 BCHL teams are organized into 2 conferences. The <strong>Interior Conference</strong> includes the Penticton Vees, Vernon Vipers, West Kelowna Warriors, Salmon Arm Silverbacks, Merritt Centennials, Trail Smoke Eaters, Cranbrook Bucks, and the Prince George Spruce Kings. The <strong>Island/Mainland Conference</strong> includes the Nanaimo Clippers, Victoria Grizzlies, Cowichan Valley Capitals, Alberni Valley Bulldogs, Chilliwack Chiefs, Langley Rivermen, Surrey Eagles, Coquitlam Express, and the Powell River Kings.
        </p>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', lineHeight: 1.6 }}>
          The BCHL operates as a junior-A league (one tier below the WHL/CHL) but has become a major NCAA D-I development pipeline. The Penticton Vees have become one of the most successful junior franchises in North America, winning the Royal Bank Cup (now Centennial Cup) in 2012 and the BCHL championship multiple times. The BCHL&apos;s geographic reach — 20 teams across BC&apos;s interior, Vancouver Island, and the Lower Mainland — makes it the largest junior hockey league in Western Canada outside the WHL.
        </p>
      </section>

      <section style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>BCHL HISTORY</h2>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9375rem', lineHeight: 1.75 }}>
          <p style={{ marginBottom: '1rem' }}>
            The BCHL was founded in 1961 as the Okanagan-Mainline Junior Hockey League (OMJHL), with 4 teams: the Kamloops Rockets, Kelowna Buckaroos, Penticton Junior Vees, and Vernon Junior Canadians. The founding meeting took place in a Vernon hotel, where Canadians owner Bill Brown persuaded his three colleagues to create BC&apos;s first Junior A hockey league. The OMJHL played its first games in the fall of 1961 and Brown served for two years as the league&apos;s first President.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            The OMJHL underwent many changes throughout the 1960s as it tried to find its footing. The Penticton Junior Vees went on hiatus after the 1962-63 season and returned a year later as the Broncos. Name changes were common in the league&apos;s early years. In 1963, the league officially changed its name to the Okanagan Junior Hockey League (OJHL). In 1967, the league expanded beyond the Okanagan with the addition of the New Westminster Royals and Victoria Cougars, and was renamed the British Columbia Junior Hockey League (BCJHL).
          </p>
          <p style={{ marginBottom: '1rem' }}>
            Three of the founding four teams are still active in the BCHL. Penticton was renamed back to the Vees in 1965 and has remained continuously active since. Vernon has had a complex history but the current Vipers franchise has been active since 1993. Kamloops moved briefly to White Rock in 1973-74, then to Merritt, where they have been known as the Centennials ever since — the longest continuously-run franchise in the BCHL. The Kelowna Buckaroos moved to Summerland in 1983 and eventually folded in 1988, replaced by the West Kelowna Warriors franchise.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            The BCHL has been a significant development pipeline for NCAA D-I hockey. Notable BCHL alumni include 200+ NHL draft picks since 2000, including recent high picks like Bowen Byram (Vancouver Giants, 2019 #4 overall), Dylan Guenther (Edmonton Oil Kings, 2021 #9 overall), and many others. The Penticton Vees won the Royal Bank Cup (now Centennial Cup) in 2012, the first BCHL team to win the national Junior A championship in 25 years. The Vees have continued to be a national Junior A force, winning the 2023 Centennial Cup as well.
          </p>
          <p>
            The 2023-24 season was the BCHL&apos;s first as an independent league after the BCHL Board of Governors voted to depart Hockey Canada in 2023. The BCHL cited philosophical differences with Hockey Canada over the junior hockey development model, including rules around player eligibility and roster construction. The BCHL&apos;s departure was a watershed moment in Canadian junior hockey — it was the first time a major junior league had left Hockey Canada&apos;s governance in decades. The BCHL continues to operate as an independent league, with the Fred J. Hume Award (the league&apos;s championship trophy) awarded annually to the BCHL playoff champion.
          </p>
        </div>
      </section>

      <section style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>HOW THE BCHL WORKS</h2>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9375rem', lineHeight: 1.75 }}>
          <p style={{ marginBottom: '1rem' }}>
            The BCHL regular season runs from September to March, with each team playing 54 games. Game days are typically Friday-Saturday, with the BCHL&apos;s geographic spread (from Powell River in the west to the Kootenay region in the east) requiring significant travel for road games. The top teams in each conference qualify for the BCHL playoffs, with the Fred J. Hume Award (the league&apos;s championship trophy) awarded to the playoff champion.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            BCHL players are typically 16-20 years old. The league&apos;s age limit is 20 (players must be under 20 by December 31 of the season). Unlike the WHL/CHL, the BCHL does not pay players — players retain amateur status and remain NCAA-eligible, making the BCHL a popular development path for US-college-bound players. Many BCHL alumni go on to play NCAA D-I hockey, with some advancing to professional hockey.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            BCHL games are broadcast on the league&apos;s HockeyTV partnership and on select regional sports networks. The league has historically been a strong attendance draw, with the Penticton Vees averaging 2,500+ per game at the South Okanagan Events Centre. The BCHL&apos;s geographic spread — Penticton is 5 hours from Vancouver, Cranbrook is 8 hours — creates significant travel costs, but the league&apos;s independence from Hockey Canada allows more flexibility in scheduling and player development.
          </p>
          <p>
            BCHL alumni are a primary source of talent for NCAA D-I hockey. The BCHL&apos;s independence from Hockey Canada has allowed the league to pursue different player development models and to position itself as the premier NCAA D-I development path in Western Canada. The league&apos;s top players are increasingly drafted by NHL teams, with the BCHL having produced 200+ NHL draft picks since 2000. Notable recent NHL alumni include Bowen Byram (Vancouver, 4th overall 2019), Dylan Guenther (Edmonton, 9th overall 2021), and Matt Benning (Surrey Eagles, 2012).
          </p>
        </div>
      </section>

      <section style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.85rem', lineHeight: 1.6, margin: 0 }}>
          <strong style={{ color: 'rgba(255,255,255,0.7)' }}>Editorial standards.</strong> By Arnel Larracas, Founder &amp; Editor-in-Chief, RinkStop. Last reviewed 2026-10-09.<br />
          <strong style={{ color: 'rgba(255,255,255,0.7)' }}>Data sources.</strong> Team count from RinkStop team_workspaces table. Founded 1961 (OMJHL), 1967 (BCJHL), 1995 (BCHL), 2023 Hockey Canada departure, 200+ NHL draft picks: bchl.ca/bchl-history, Wikipedia (List of BCHL seasons).<br />
          <span style={{ color: 'rgba(255,255,255,0.45)' }}><Link href="/editorial-policy" style={{ color: '#FFB81C' }}>Editorial policy</Link> · <Link href="/data-methodology" style={{ color: '#FFB81C' }}>Data methodology</Link> · <Link href="/corrections" style={{ color: '#FFB81C' }}>Report a correction</Link></span>
        </p>
      </section>
    </main>
  );
}
