import type { Metadata } from 'next';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';

// 2026-10-09: New special league page. Source: theaihl.com history,
// Wikipedia (AIHL). 10 teams in 2026-27. Founded 2000 after collapse of
// previous national league. Newcastle Northstars 7 titles (most).
// Goodall Cup — world\'s third-oldest hockey trophy (since 1909).

const AIHL_LEAGUE_ID = 'fb31aef5-ded6-4e77-b2c5-b855e75a7db0';

async function getAihlTeamCount(): Promise<number> {
  try {
    const { count } = await supabaseAdmin
      .from('team_workspaces')
      .select('id', { count: 'exact', head: true })
      .eq('league_id', AIHL_LEAGUE_ID)
      .eq('is_active', true);
    return count ?? 0;
  } catch {
    return 0;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const teamCount = await getAihlTeamCount();
  return {
    title: teamCount > 0
      ? `AIHL 2026-27 — ${teamCount} Teams, Standings & Schedule | RinkStop`
      : 'AIHL 2026-27 — Standings, Schedule & Teams',
    description: teamCount > 0
      ? `Australian Ice Hockey League (AIHL) 2026-27: ${teamCount} teams across Australia. Top-tier semi-professional hockey league, founded 2000. Newcastle Northstars 7 titles. Goodall Cup (since 1909) awarded to playoff champion.`
      : 'Australian Ice Hockey League (AIHL) 2026-27: 10 teams across Australia. Top-tier semi-professional hockey league, founded 2000. Goodall Cup (since 1909) awarded to playoff champion.',
  };
}

export default async function AihlPage() {
  const teamCount = await getAihlTeamCount();
  const teamLabel = teamCount > 0 ? `${teamCount} TEAMS` : '10 TEAMS';

  return (
    <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@graph': [{
            '@type': 'SportsOrganization',
            '@id': 'https://rinkstop.com/directory/aihl-australia',
            name: 'Australian Ice Hockey League',
            alternateName: 'AIHL',
            url: 'https://rinkstop.com/directory/aihl-australia',
            sport: 'Ice hockey',
            description: 'Australian Ice Hockey League (AIHL) — Australia\'s top-tier men\'s ice hockey league, founded 2000. 10 teams across 6 states. Newcastle Northstars 7 titles, the most in AIHL history. The Goodall Cup, the world\'s third-oldest ice hockey trophy (since 1909), is awarded to the AIHL playoff champion.',
            foundingDate: '2000',
            location: { '@type': 'Place', name: 'Australia' },
            sameAs: ['https://en.wikipedia.org/wiki/Australian_Ice_Hockey_League'],
          }, {
            '@type': 'FAQPage',
            mainEntity: [
              {
                '@type': 'Question',
                name: 'How many teams play in the AIHL?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'The AIHL fields 10 teams across 6 Australian states and territories for 2026-27. The 10 teams include Melbourne Ice, Melbourne Mustangs, Newcastle Northstars, Perth Thunder, Sydney Bears, Sydney Ice Dogs, CBR Brave (Canberra), Adelaide Adrenaline, Melbourne Mustangs, and the Brisbane Lightning.',
                },
              },
              {
                '@type': 'Question',
                name: 'When was the AIHL founded?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'The AIHL was formed in 2000 by the Sydney Bears, Canberra Knights, and Adelaide Avalanche following the collapse of the former Australian national league. The first AIHL season (2000) had 3 teams, with the Adelaide Avalanche winning the first title. The AIHL has since expanded to 8-10 teams and operates as a semi-professional league sanctioned by Ice Hockey Australia (a member of the IIHF).',
                },
              },
              {
                '@type': 'Question',
                name: 'Who has won the most AIHL championships?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Newcastle Northstars (formerly Newcastle North Stars) have won the most Goodall Cups with 7 titles, the most in AIHL history. Sydney Bears have 3, Melbourne Ice have 3, Adelaide Avalanche 2, and West Sydney Ice Dogs 1. The Goodall Cup is the world\'s third-oldest ice hockey trophy, first awarded in 1909.',
                },
              },
              {
                '@type': 'Question',
                name: 'What is the format of the AIHL?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'The AIHL regular season runs from April to September (Australian winter), with each team playing a 28-game schedule concentrated in weekend series. The top 4 teams qualify for the Goodall Cup playoffs, a finals weekend with sudden-death semifinals and final. The AIHL is sanctioned by Ice Hockey Australia and is a member of the IIHF.',
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
        <span style={{ color: 'rgba(255,255,255,0.6)' }}>AIHL</span>
      </nav>

      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: '#fff', letterSpacing: '0.02em', lineHeight: 1, fontFamily: '"Bebas Neue", sans-serif' }}>
          AIHL — Australian Ice Hockey League
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.95rem', marginTop: '0.5rem', maxWidth: '780px' }}>
          {teamLabel} across 6 Australian states. Founded 2000. Australia&apos;s top-tier semi-professional ice hockey league. Newcastle Northstars 7 titles, the most in league history. The Goodall Cup (the world&apos;s third-oldest ice hockey trophy, first awarded in 1909) is awarded to the AIHL playoff champion.
        </p>
      </div>

      <section style={{ marginBottom: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '0.75rem' }}>
          {teamLabel} • AIHL 2026-27
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1rem' }}>
          The 10 AIHL clubs are split into two conferences (Bauer and Easton) spanning 6 Australian states and territories. The <strong>Newcastle Northstars</strong> (NSW) are the most successful club with 7 Goodall Cup titles. <strong>Sydney Bears</strong> (NSW) and <strong>Melbourne Ice</strong> (Victoria) have 3 each. The 2026 AIHL champion is Newcastle Northstars (their 7th title). Other notable clubs include the Sydney Ice Dogs, Melbourne Mustangs, Perth Thunder (the westernmost professional hockey team in the world), CBR Brave (Canberra), Adelaide Adrenaline, and Brisbane Lightning.
        </p>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', lineHeight: 1.6 }}>
          Marquee AIHL arenas: Hunter Ice Skating Stadium (Newcastle, 1,000 capacity — the home of the most successful AIHL club), O&apos;Brien Icehouse (Melbourne, 1,600 — shared by Melbourne Ice and Mustangs), Macquarie Ice Rink (Sydney, 1,400 — shared by Sydney Bears and Ice Dogs), Perth Ice Arena (Perth, 600 — the smallest in the league but the home of the most remote team), and the Canberra ice rink (CBR Brave). Average AIHL attendance is 800-1,200 per game, with the Newcastle-Sydney rivalry regularly selling out.
        </p>
      </section>

      <section style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>AIHL HISTORY</h2>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9375rem', lineHeight: 1.75 }}>
          <p style={{ marginBottom: '1rem' }}>
            Australian ice hockey traces its history to 1909, when the first Glaciarium opened in Hindley Street, Adelaide. The Glaciarium hosted the first organized bandy and ice hockey games in Australia, with the Victorian Ice Hockey Association formed in 1908 by Andy Reid. The first Australian ice hockey championship was contested in 1909, with HC Bellerive Vevey winning the first title. The Goodall Cup — the trophy awarded to the AIHL champion — has been in continuous existence since 1909, making it the world&apos;s third-oldest ice hockey trophy (behind the Stanley Cup, 1893, and the Allan Cup, 1909).
          </p>
          <p style={{ marginBottom: '1rem' }}>
            The AIHL was formed for the 2000 season by the Sydney Bears, Canberra Knights, and Adelaide Avalanche following the collapse of the former Australian national league. The inaugural 2000 season had 3 teams playing a round-robin weekend format, with the Adelaide Avalanche winning the first title. The AIHL expanded to 6 teams in 2002 (adding Melbourne Ice, Newcastle North Stars, and West Sydney Ice Dogs), to 8 teams in 2005 (adding Central Coast Rhinos and Brisbane Blue Tongues), and has fluctuated between 7-10 teams since.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            Newcastle Northstars have been the most successful AIHL franchise with 7 Goodall Cup titles. The Northstars have been the model franchise for the AIHL, with consistent on-ice success and a stable organization. Sydney Bears have 3 titles, Melbourne Ice have 3, and West Sydney Ice Dogs have 1.
          </p>
          <p>
            The AIHL is sanctioned by Ice Hockey Australia, a member of the IIHF. The league&apos;s Australia national team competes in the IIHF World Championship Division II Group B, with a goal of returning to Division I Group A. Notable AIHL alumni who have gone on to NHL careers are rare (Australia has produced only a handful of NHL players historically), but the league has been a development path for Australian hockey players and for international players (particularly from Canada, the US, and Europe) who play in the AIHL during the Australian winter. The AIHL has continued to grow in attendance and media coverage, with select games broadcast on Fox Sports Australia.
          </p>
        </div>
      </section>

      <section style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>HOW THE AIHL WORKS</h2>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9375rem', lineHeight: 1.75 }}>
          <p style={{ marginBottom: '1rem' }}>
            The AIHL regular season runs from April to September (the Australian winter, which is the hockey season in the Southern Hemisphere), with each team playing a 28-game schedule concentrated in weekend series. Most teams play 2-3 games over a single weekend, with the schedule structured to reduce travel — Australia&apos;s vast distances mean that some road trips (e.g., Perth to Sydney) can exceed 4,000 km and require significant travel time.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            The top 4 teams in the regular-season standings qualify for the Goodall Cup playoffs, a finals weekend with sudden-death semifinals and final. The playoff format is single-game elimination, with all games at one venue over a single weekend. The Goodall Cup has been awarded to the AIHL champion since 2002 (when the league expanded to 6 teams and the playoffs became a meaningful championship format).
          </p>
          <p style={{ marginBottom: '1rem' }}>
            AIHL rosters are typically 22-25 players per team. The league is semi-professional, with most players earning modest stipends and balancing hockey with other work. The AIHL&apos;s salary cap is approximately $300,000-$500,000 AUD per team, with most players earning between $5,000-$30,000 AUD per season. The league&apos;s import rules allow 8-12 non-Australian players per team, with most imports coming from Canada, the US, the Czech Republic, and other European countries.
          </p>
          <p>
            AIHL games are broadcast on Fox Sports Australia and on the AIHL&apos;s official YouTube channel. The league has continued to develop its digital presence, with the AIHL&apos;s YouTube channel streaming most regular season games live. The 2025-26 Goodall Cup playoff between the Newcastle Northstars and the Melbourne Ice was broadcast nationally on Fox Sports, drawing record AIHL viewership. The league&apos;s continued growth — combined with the success of the IIHF&apos;s push to grow hockey in non-traditional markets — has positioned the AIHL as a key component of the global hockey development system, particularly in the Asia-Pacific region.
          </p>
        </div>
      </section>

      <section style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.85rem', lineHeight: 1.6, margin: 0 }}>
          <strong style={{ color: 'rgba(255,255,255,0.7)' }}>Editorial standards.</strong> By Arnel Larracas, Founder &amp; Editor-in-Chief, RinkStop. Last reviewed 2026-10-09.<br />
          <strong style={{ color: 'rgba(255,255,255,0.7)' }}>Data sources.</strong> Team count from RinkStop team_workspaces table. Founded 2000, Newcastle Northstars 7 titles, Goodall Cup since 1909 (world&apos;s 3rd-oldest hockey trophy), 2025-26 Newcastle: theaihl.com history page, Wikipedia (AIHL).<br />
          <span style={{ color: 'rgba(255,255,255,0.45)' }}><Link href="/editorial-policy" style={{ color: '#FFB81C' }}>Editorial policy</Link> · <Link href="/data-methodology" style={{ color: '#FFB81C' }}>Data methodology</Link> · <Link href="/corrections" style={{ color: '#FFB81C' }}>Report a correction</Link></span>
        </p>
      </section>
    </main>
  );
}
