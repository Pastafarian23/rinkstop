import type { Metadata } from 'next';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';

// 2026-10-09: New special league page. Source: Wikipedia (USHL), ushl.com.
// 16 teams. Founded 1947 (as AAHL), became all-junior 1979. League's
// only Tier-1 junior league in the US. Defending champion Sioux Falls
// Stampede. Phil Housley first USHL player drafted in the first round
// (1982). USHL alumni include 100+ NHL draft picks per year.

const USHL_LEAGUE_ID = '28698613-961c-4699-8a68-ce9eb720425c';

async function getUshlTeamCount(): Promise<number> {
  try {
    const { count } = await supabaseAdmin
      .from('team_workspaces')
      .select('id', { count: 'exact', head: true })
      .eq('league_id', USHL_LEAGUE_ID)
      .eq('is_active', true);
    return count ?? 0;
  } catch {
    return 0;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const teamCount = await getUshlTeamCount();
  return {
    title: teamCount > 0
      ? `USHL 2026-27 — ${teamCount} Teams, Standings & Schedule | RinkStop`
      : 'USHL 2026-27 — Standings, Schedule & Teams | RinkStop',
    description: teamCount > 0
      ? `United States Hockey League (USHL) 2026-27: ${teamCount} teams across the US Midwest. The only Tier-1 junior league sanctioned by USA Hockey. Strictly amateur (NCAA-eligible). Phil Housley, Tkachuk brothers alumni.`
      : 'United States Hockey League (USHL) 2026-27: 16 teams across the US Midwest. The only Tier-1 junior league sanctioned by USA Hockey. Strictly amateur (NCAA-eligible).',
  };
}

export default async function UshlPage() {
  const teamCount = await getUshlTeamCount();
  const teamLabel = teamCount > 0 ? `${teamCount} TEAMS` : '16 TEAMS';

  return (
    <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@graph': [{
            '@type': 'SportsOrganization',
            '@id': 'https://rinkstop.com/directory/ushl',
            name: 'United States Hockey League',
            url: 'https://rinkstop.com/directory/ushl',
            sport: 'Ice hockey',
            description: 'United States Hockey League (USHL) — the only Tier-1 junior ice hockey league sanctioned by USA Hockey. 16 teams in the US Midwest. Strictly amateur (NCAA-eligible). Founded 1947 as AAHL, became all-junior 1979. Defending champion Sioux Falls Stampede.',
            foundingDate: '1979',
            location: { '@type': 'Place', name: 'United States' },
            sameAs: ['https://en.wikipedia.org/wiki/United_States_Hockey_League'],
          }, {
            '@type': 'FAQPage',
            mainEntity: [
              {
                '@type': 'Question',
                name: 'How many teams play in the USHL?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'The USHL fields 16 teams across the US Midwest and Great Plains for 2026-27. The league&apos;s 8 Eastern Conference teams are primarily in the Upper Midwest (Minnesota, Wisconsin, Iowa, Michigan) and the 8 Western Conference teams are primarily in the Plains (Nebraska, South Dakota, North Dakota, Iowa). The USHL is the only Tier-1 junior league sanctioned by USA Hockey, distinguishing it from the NAHL (Tier-2) and other junior circuits.',
                },
              },
              {
                '@type': 'Question',
                name: 'Who has won the most USHL championships?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'The Omaha Lancers hold the record with 7 Clark Cup (USHL playoff) titles in the all-junior era. The Waterloo Black Hawks have the most overall titles in the USHL lineage (9, including pre-1979 senior era). Other successful modern clubs include the Sioux Falls Stampede (4 Clark Cups, including 2024-25), Cedar Rapids RoughRiders, Green Bay Gamblers, and Chicago Steel.',
                },
              },
              {
                '@type': 'Question',
                name: 'When was the USHL founded?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'The USHL traces its history to 1947, when it was established as the American Amateur Hockey League (AAHL) in Minnesota. The league went through several name changes: Central Hockey League (1952-53), Minnesota Hockey League (1953-55), United States Central Hockey League (1955-61), and finally the United States Hockey League (1961). For most of its history, the USHL was a senior amateur league. In 1979, the USHL converted to a fully junior league, becoming a competitor to the Canadian Hockey League. Phil Housley, who played for the St. Paul Vulcans in 1979-82, became the first USHL alumnus drafted in the first round of the NHL Entry Draft (1982, by the Buffalo Sabres).',
                },
              },
              {
                '@type': 'Question',
                name: 'What is the format of the USHL season?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'The USHL regular season runs from September to April, with each of the 16 teams playing 62 games. The top 8 teams in each conference qualify for the USHL playoffs, which are best-of-five in the first round and best-of-seven thereafter. The USHL playoff champion receives the Clark Cup. The USHL is the exclusive development path for elite US-born players (and some Canadian imports) who wish to maintain NCAA eligibility while competing at the highest level of US junior hockey.',
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
        <span style={{ color: 'rgba(255,255,255,0.6)' }}>USHL</span>
      </nav>

      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: '#fff', letterSpacing: '0.02em', lineHeight: 1, fontFamily: '"Bebas Neue", sans-serif' }}>
          USHL — United States Hockey League
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.95rem', marginTop: '0.5rem', maxWidth: '780px' }}>
          {teamLabel} across the US Midwest. The only Tier-1 junior league sanctioned by USA Hockey. Strictly amateur (NCAA-eligible). Defending champion: Sioux Falls Stampede (4th title, 2024-25).
        </p>
      </div>

      <section style={{ marginBottom: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '0.75rem' }}>
          {teamLabel} • USHL 2026-27
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1rem' }}>
          The 16 USHL teams are organized into two conferences of eight teams each. The <strong>Eastern Conference</strong> includes Cedar Rapids RoughRiders (Iowa), Chicago Steel (Illinois), Dubuque Fighting Saints (Iowa), Green Bay Gamblers (Wisconsin), Madison Capitols (Wisconsin), Muskegon Lumberjacks (Michigan), Team USA (the USA Hockey National Team Development Program, based in Plymouth, MI), and Youngstown Phantoms. The <strong>Western Conference</strong> includes Des Moines Buccaneers (Iowa), Fargo Force (North Dakota), Lincoln Stars (Nebraska), Omaha Lancers (Nebraska), Sioux City Musketeers (Iowa), Sioux Falls Stampede (South Dakota), Tri-City Storm (Nebraska), and Waterloo Black Hawks (Iowa).
        </p>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', lineHeight: 1.6 }}>
          Marquee USHL arenas: Denny Sanford Premier Center (Sioux Falls, 10,678), Scheels Arena (Fargo, 4,000+), Resch Center (Green Bay, 8,709), and the Blackhawks Ice Center (Chicago, 2,800 — shared with the Chicago Blackhawks). The USA Hockey National Team Development Program plays its home games at USA Hockey Arena in Plymouth, Michigan, where the program has trained 100+ NHL draft picks since 1996.
        </p>
      </section>

      <section style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>USHL HISTORY</h2>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9375rem', lineHeight: 1.75 }}>
          <p style={{ marginBottom: '1rem' }}>
            The United States Hockey League traces its history to 1947, when it was established as the American Amateur Hockey League (AAHL) in Minnesota. The inaugural 1947-48 season had 5 teams in and around the Twin Cities and Rochester. The league was renamed the Central Hockey League in 1952, then the Minnesota Hockey League in 1953, then the United States Central Hockey League in 1955, and finally the United States Hockey League in 1961. For most of its first 32 years, the USHL was a senior amateur league — players were adults playing for the love of the game.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            By the late 1970s, the USHL had fallen on hard times. In the summer of 1977, clubs from the recently folded Midwest Junior Hockey League contacted the USHL, and a unique merger was formed: three junior teams (Bloomington Junior Stars, Austin Mavericks, St. Paul Vulcans) and three remaining pro teams (Sioux City Musketeers, Waterloo Black Hawks, Green Bay Bobcats) gathered under the USHL banner. The 1979-80 season was the league&apos;s first as an entirely junior arrangement. The split existence (pro and junior) had lasted just two seasons.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            Phil Housley, who played for the St. Paul Vulcans in 1979-82, became the first USHL alumnus ever drafted in the first round of the NHL Entry Draft (1982, by the Buffalo Sabres) and went on to a Hall-of-Fame career with 1,232 NHL games. The 1980s and 1990s saw the USHL evolve into a national competitor to the Canadian Hockey League, distinguished by its strictly amateur status — which preserves NCAA eligibility for players who later want to play college hockey in the US.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            The USHL established the USA Hockey National Team Development Program (NTDP) as a league team in 1996, with the program based in Plymouth, Michigan. The NTDP develops the top US-born players aged 16-18 in a two-year residential program; alumni include Auston Matthews, Patrick Kane, Jack Hughes, the Tkachuk brothers (Matthew and Brady), and over 30 NHL first-round draft picks in the program&apos;s history. The USHL has produced more than 100 NHL draft picks in recent seasons, making it the largest single source of NHL-drafted American players.
          </p>
          <p>
            The USHL has seen dominant franchises over the decades. The Omaha Lancers hold the record with 7 Clark Cup (USHL playoff) titles, the most of any modern-era franchise. The Waterloo Black Hawks have the most overall titles in the USHL lineage (9, including pre-1979 senior era). The Sioux Falls Stampede won the 2024-25 Clark Cup for their 4th title, defeating the Fargo Force in the final. The 2026-27 USHL season will continue the league&apos;s evolution as the top Tier-1 junior league in the United States, with the NTDP continuing to develop future NHL stars.
          </p>
        </div>
      </section>

      <section style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>HOW THE USHL WORKS</h2>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9375rem', lineHeight: 1.75 }}>
          <p style={{ marginBottom: '1rem' }}>
            The USHL regular season runs from late September to mid-April, with each of the 16 teams playing 62 games. The schedule is weighted to minimize bus travel, with intra-conference matchups more frequent. Three points are awarded for a regulation or overtime win, two for a shootout win, one for an overtime loss, and zero for a regulation loss.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            The top 8 teams in each conference qualify for the USHL playoffs. The first round is best-of-five; subsequent rounds (conference semifinals, conference finals, and Clark Cup final) are best-of-seven. The Clark Cup is named after the long-time USHL President and is awarded to the USHL playoff champion. The Sioux Falls Stampede are the defending Clark Cup champions.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            The USHL is the exclusive development path for elite US-born players (and some Canadian imports) who wish to maintain NCAA eligibility while competing at the highest level of US junior hockey. Unlike the Canadian Hockey League (CHL), which is professional and forfeits NCAA eligibility, the USHL is strictly amateur — players receive only room and board plus a small stipend, and they retain the right to play NCAA Division I college hockey after their USHL careers.
          </p>
          <p>
            USHL rosters are capped at 23 players for the standard playing roster, with a maximum of 4 import (non-US) players per team. The USHL Entry Draft is held each May, with players as young as 16 selected for the following season. Top USHL players graduate to NCAA Division I hockey and, from there, to professional hockey. The USHL is the only Tier-1 junior league sanctioned by USA Hockey, the national governing body for the sport in the United States. The NAHL (North American Hockey League) is the corresponding Tier-2 league. The USHL&apos;s alumni include 7 Hart Trophy winners, 4 Conn Smythe Trophy winners, and 4 first-overall NHL draft picks since 2000.
          </p>
        </div>
      </section>

      <section style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.85rem', lineHeight: 1.6, margin: 0 }}>
          <strong style={{ color: 'rgba(255,255,255,0.7)' }}>Editorial standards.</strong> By Arnel Larracas, Founder &amp; Editor-in-Chief, RinkStop. Last reviewed 2026-10-09.<br />
          <strong style={{ color: 'rgba(255,255,255,0.7)' }}>Data sources.</strong> Team count from RinkStop team_workspaces table. Founded 1947 (AAHL), all-junior 1979, Phil Housley first-round 1982, NTDP established 1996, Sioux Falls Stampede 2024-25 Clark Cup: Wikipedia (United States Hockey League), ushl.com.<br />
          <span style={{ color: 'rgba(255,255,255,0.45)' }}><Link href="/editorial-policy" style={{ color: '#FFB81C' }}>Editorial policy</Link> · <Link href="/data-methodology" style={{ color: '#FFB81C' }}>Data methodology</Link> · <Link href="/corrections" style={{ color: '#FFB81C' }}>Report a correction</Link></span>
        </p>
      </section>
    </main>
  );
}
