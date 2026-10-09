import type { Metadata } from 'next';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';

// 2026-10-09: New special league page. Source: ncaa.com DI Men's Ice Hockey
// Championship History + Frozen Four records. Founded 1948 (Frozen Four).
// 6 conferences (Atlantic Hockey, Big Ten, CCHA, ECAC Hockey, Hockey East,
// NCHC). 16-team single-elimination tournament. Defending champion:
// Denver (11 total titles, most of any program).

const NCAA_LEAGUE_ID = '498c6b36-a83a-4e81-9829-a2f9ca3a03f8';

async function getNcaaTeamCount(): Promise<number> {
  try {
    const { count } = await supabaseAdmin
      .from('team_workspaces')
      .select('id', { count: 'exact', head: true })
      .eq('league_id', NCAA_LEAGUE_ID)
      .eq('is_active', true);
    return count ?? 0;
  } catch {
    return 0;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const teamCount = await getNcaaTeamCount();
  return {
    title: teamCount > 0
      ? `NCAA Division I Men's Hockey 2026-27 — ${teamCount} Teams, Frozen Four | RinkStop`
      : 'NCAA Division I Men\'s Hockey 2026-27 — Frozen Four, Teams & Schedule',
    description: teamCount > 0
      ? `NCAA Division I Men's Ice Hockey 2026-27: ${teamCount} teams across 6 conferences (Atlantic Hockey, Big Ten, CCHA, ECAC, Hockey East, NCHC). Frozen Four, 16-team bracket, schedule, scores, and rosters. Defending champion Denver.`
      : 'NCAA Division I Men\'s Ice Hockey 2026-27: 6 conferences, 16-team Frozen Four bracket. Schedule, scores, rosters, and arena info. Defending champion Denver.',
  };
}

export default async function NcaaPage() {
  const teamCount = await getNcaaTeamCount();
  const teamLabel = teamCount > 0 ? `${teamCount} TEAMS` : '60+ TEAMS';

  return (
    <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@graph': [{
            '@type': 'SportsOrganization',
            '@id': 'https://rinkstop.com/directory/ncaa-division-1-hockey',
            name: 'NCAA Division I Men\'s Ice Hockey',
            url: 'https://rinkstop.com/directory/ncaa-division-1-hockey',
            sport: 'Ice hockey',
            description: 'NCAA Division I Men\'s Ice Hockey — the top college hockey league in the United States, with 60+ teams across 6 conferences. 16-team single-elimination NCAA tournament culminating in the Frozen Four. Founded 1948.',
            foundingDate: '1948',
            location: { '@type': 'Place', name: 'United States' },
            sameAs: ['https://en.wikipedia.org/wiki/NCAA_Men%27s_Ice_Hockey_Championship'],
          }, {
            '@type': 'FAQPage',
            mainEntity: [
              {
                '@type': 'Question',
                name: 'How many teams play in NCAA Division I hockey?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'NCAA Division I men\'s ice hockey has approximately 60 teams across 6 conferences: Atlantic Hockey Association, Big Ten Conference, Central Collegiate Hockey Association (CCHA), ECAC Hockey, Hockey East Association, and the National Collegiate Hockey Conference (NCHC). 16 teams qualify for the NCAA tournament each March.',
                },
              },
              {
                '@type': 'Question',
                name: 'Who has won the most NCAA hockey championships?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Denver leads all NCAA programs with 11 men\'s ice hockey championships, the most of any school. Michigan has 9, North Dakota 8, Wisconsin 6, Boston College 5, Boston University 5, and Minnesota 5. The Frozen Four tournament has been held annually since 1948.',
                },
              },
              {
                '@type': 'Question',
                name: 'When was the NCAA hockey tournament first held?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'The first NCAA men\'s ice hockey championship was held in 1948, with Michigan defeating Dartmouth 8-4 in the first final in Colorado Springs, Colorado. The tournament was renamed the "Frozen Four" in 1999. The first 10 Frozen Fours were all held in Colorado Springs before the format moved to rotating host cities in 1958.',
                },
              },
              {
                '@type': 'Question',
                name: 'What is the format of the NCAA hockey tournament?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'The NCAA Division I men\'s ice hockey tournament uses single-elimination across 4 rounds. 16 teams qualify (6 conference champions via automatic bids + 10 at-large selections based on the NCAA Percentage Index). The first round is held at two regional sites (8 teams per region), with regional winners advancing to the Frozen Four semifinals and finals at a single host venue in April.',
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
        <span style={{ color: 'rgba(255,255,255,0.6)' }}>NCAA D-I Hockey</span>
      </nav>

      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: '#fff', letterSpacing: '0.02em', lineHeight: 1, fontFamily: '"Bebas Neue", sans-serif' }}>
          NCAA Division I Men&apos;s Ice Hockey
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.95rem', marginTop: '0.5rem', maxWidth: '780px' }}>
          {teamLabel} across 6 conferences. Frozen Four tournament every April since 1948. Defending champion: Denver (11 NCAA titles, the most in NCAA history). 2026 Frozen Four: April 9-11 at T-Mobile Arena, Las Vegas.
        </p>
      </div>

      <section style={{ marginBottom: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '0.75rem' }}>
          {teamLabel} • 6 CONFERENCES
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1rem' }}>
          NCAA Division I men&apos;s ice hockey is organized into 6 conferences, each with its own regular-season champion and automatic NCAA tournament bid. The 6 conferences are: <strong>Atlantic Hockey Association</strong> (8 teams, founded 2003), <strong>Big Ten Conference</strong> (7 teams, including Michigan, Michigan State, Minnesota, Wisconsin, Notre Dame, Penn State, Ohio State), <strong>CCHA</strong> (Central Collegiate Hockey Association, reconstituted 2021, 8 teams), <strong>ECAC Hockey</strong> (11 teams, founded 1961, includes Ivy League programs), <strong>Hockey East Association</strong> (11 teams, founded 1984, includes Boston College, Boston University, Northeastern, Maine, and others), and the <strong>National Collegiate Hockey Conference (NCHC)</strong> (8 teams, founded 2013, includes Denver, North Dakota, Colorado College, St. Cloud State, Minnesota Duluth, and others).
        </p>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', lineHeight: 1.6 }}>
          The Frozen Four&apos;s host city rotates annually. The 2026 Frozen Four was held at T-Mobile Arena in Las Vegas, with Denver defeating Wisconsin 2-1 for Denver&apos;s 11th national title. The 2027 Frozen Four will be held at a TBD venue. College hockey arenas include some of the largest in North America — the Big Ten&apos;s Munn Ice Arena (Michigan State), Yost Ice Arena (Michigan), and Mariucci Arena (Minnesota) all hold 10,000+ for hockey. The NCAA Division I men&apos;s hockey championship has been held annually since 1948 (with the 2020 tournament cancelled due to COVID-19).
        </p>
      </section>

      <section style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>NCAA D-I HOCKEY HISTORY</h2>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9375rem', lineHeight: 1.75 }}>
          <p style={{ marginBottom: '1rem' }}>
            The first NCAA men&apos;s ice hockey championship was held in March 1948, with Michigan defeating Dartmouth 8-4 in the first final in Colorado Springs, Colorado. The tournament began as a 4-team event, expanded to 8 teams by 1969, and grew to its current 16-team format in 2003. The first 10 Frozen Fours were all held in Colorado Springs before the format moved to rotating host cities beginning in 1958. Michigan&apos;s 1948 victory began one of college hockey&apos;s most successful dynasties — Michigan has 9 NCAA titles total, second only to Denver&apos;s 11.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            College hockey was dominated by the WCHA (Western Collegiate Hockey Association) and ECAC (Eastern College Athletic Conference) for the tournament&apos;s first four decades. The WCHA was the premier college hockey conference from 1951 to 2013, producing champions like Denver, North Dakota, Wisconsin, and Minnesota. The NCHC (National Collegiate Hockey Conference) was formed in 2013 when several WCHA schools split to create a new conference with more geographic concentration in the upper Midwest, and has produced 7 NCAA champions since its founding (North Dakota 2016, Denver 2017/2022/2024/2026, Massachusetts 2021, Quinnipiac 2023).
          </p>
          <p style={{ marginBottom: '1rem' }}>
            The Frozen Four has produced several Cinderella stories and dynasty years. Denver has won 4 titles under head coach David Carle (2017, 2022, 2024, 2026), establishing the program as the modern-day dominant force. Other recent champions include Western Michigan (2025, the school&apos;s first title), Quinnipiac (2023, also the school&apos;s first), Massachusetts (2021, also the school&apos;s first), and UMass Lowell&apos;s 2013 championship as a recent Cinderella. The 2020 NCAA tournament was cancelled due to the COVID-19 pandemic — the first time the men&apos;s championship was not held since 1948.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            Denver leads all schools with 11 NCAA championships. Michigan has 9, North Dakota 8, Wisconsin 6, Boston College 5, Boston University 5, Minnesota 5, Lake Superior State 3, Michigan State 3, Michigan Tech 3, Minnesota Duluth 3, Colorado College 2, Cornell 2, Maine 2, RPI 2, plus 9 programs with 1 title each (most recently Western Michigan 2025 and Quinnipiac 2023). Michigan has the most Frozen Four appearances at 29, ahead of Boston College (26), Boston University (25), Minnesota (23), and North Dakota (23).
          </p>
          <p>
            College hockey in the US has a unique relationship with the NHL. The NHL Entry Draft selects heavily from NCAA rosters, with most top college players leaving school after 1-3 seasons to sign professional contracts. Notable NHL alumni who played NCAA hockey include 8 of the top 10 all-time NHL scorers, including Wayne Gretzky (did not attend college but played exhibition games for the University of Wisconsin), Mark Messier (Denver), and many current NHL stars. The NCAA has been an effective development path for the NHL because the players retain amateur status while competing at the highest level of US hockey, in contrast to the Canadian Hockey League where players turn professional at 16-18.
          </p>
        </div>
      </section>

      <section style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>HOW NCAA D-I HOCKEY WORKS</h2>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9375rem', lineHeight: 1.75 }}>
          <p style={{ marginBottom: '1rem' }}>
            The NCAA Division I men&apos;s ice hockey regular season runs from early October to early March, with each team playing 30-40 games depending on conference schedule. Conference champions receive automatic bids to the 16-team NCAA tournament. The remaining 10 at-large bids are awarded based on the NCAA Percentage Index (NPI), a ranking system that replaced the PairWise Rankings in 2024. The top 16 NPI-ranked teams at the end of the regular season receive tournament invitations.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            The 16-team NCAA tournament is single-elimination across 4 rounds. The first round (regional round) is held at 4 predetermined regional sites (4 teams per site), with regional winners advancing to the Frozen Four semifinals and finals at a single host venue. All tournament games are 60 minutes of regulation plus overtime, with 10-minute sudden-death overtime periods until a winner is determined. There are no shootouts in NCAA tournament games.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            College rosters are capped at 18 scholarships per team (with 26 players on the active roster), with the NCAA&apos;s new Name Image Likeness (NIL) rules allowing players to earn money from endorsements, social media, and other commercial activities. The transfer portal, introduced in 2018-19 and expanded in 2021, allows players to change schools with no restriction — a change that has significantly altered the landscape of college hockey. Despite the changes, NCAA Division I hockey remains the top development path for American-born NHL players, with the 2025 NHL Entry Draft featuring more NCAA players selected than ever.
          </p>
          <p>
            College hockey games are broadcast on ESPN networks (ESPN, ESPN2, ESPNU), with the Frozen Four covered on ESPN/ESPN2 and the NCAA regionals on ESPNU. Streaming is available on ESPN+. The Frozen Four has averaged 250,000+ viewers per game on ESPN in recent years, with the 2026 Denver vs. Wisconsin championship drawing a peak audience of over 600,000 viewers. College hockey is the second-most-watched ice hockey broadcast in the US after the NHL, and the most-watched amateur hockey event in the world.
          </p>
        </div>
      </section>

      <section style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.85rem', lineHeight: 1.6, margin: 0 }}>
          <strong style={{ color: 'rgba(255,255,255,0.7)' }}>Editorial standards.</strong> By Arnel Larracas, Founder &amp; Editor-in-Chief, RinkStop. Last reviewed 2026-10-09.<br />
          <strong style={{ color: 'rgba(255,255,255,0.7)' }}>Data sources.</strong> Team count from RinkStop team_workspaces table. Founded 1948, Denver 11 titles, 2026 Frozen Four Las Vegas, NPI 2024 replacing PairWise: ncaa.com DI Men&apos;s Ice Hockey Championship History, Frozen Four History and Team Records, Wikipedia (NCAA Men&apos;s Ice Hockey Championship).<br />
          <span style={{ color: 'rgba(255,255,255,0.45)' }}><Link href="/editorial-policy" style={{ color: '#FFB81C' }}>Editorial policy</Link> · <Link href="/data-methodology" style={{ color: '#FFB81C' }}>Data methodology</Link> · <Link href="/corrections" style={{ color: '#FFB81C' }}>Report a correction</Link></span>
        </p>
      </section>
    </main>
  );
}
