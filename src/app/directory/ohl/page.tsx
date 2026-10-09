import type { Metadata } from 'next';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';

// 2026-10-09: New special league page. Source: Wikipedia (OHL + OHL history),
// ontariohockeyleague.com. 20 teams (17 Ontario + 3 US). Founded 1980
// (separated from OHA; predecessors trace to 1933). Memorial Cup format.
// Most titles: Oshawa Generals (13). Defending champion: Kitchener Rangers.

const OHL_LEAGUE_ID = 'd767362d-c13b-4c7a-8c8c-27ec33990882';

async function getOhlTeamCount(): Promise<number> {
  try {
    const { count } = await supabaseAdmin
      .from('team_workspaces')
      .select('id', { count: 'exact', head: true })
      .eq('league_id', OHL_LEAGUE_ID)
      .eq('is_active', true);
    return count ?? 0;
  } catch {
    return 0;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const teamCount = await getOhlTeamCount();
  return {
    title: teamCount > 0
      ? `OHL 2026-27 — ${teamCount} Teams, Standings & Schedule`
      : 'OHL 2026-27 — Standings, Schedule & Teams',
    description: teamCount > 0
      ? `Ontario Hockey League (OHL) 2026-27: ${teamCount} teams across Ontario, Michigan, and Pennsylvania. Major-junior league for players 16-20. Competes for the Memorial Cup.`
      : 'Ontario Hockey League (OHL) 2026-27: 20 teams across Ontario, Michigan, and Pennsylvania. Major-junior league for players 16-20. Competes for the Memorial Cup.',
  };
}

export default async function OhlPage() {
  const teamCount = await getOhlTeamCount();
  const teamLabel = teamCount > 0 ? `${teamCount} TEAMS` : '20 TEAMS';

  return (
    <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@graph': [{
            '@type': 'SportsOrganization',
            '@id': 'https://rinkstop.com/directory/ohl',
            name: 'Ontario Hockey League',
            url: 'https://rinkstop.com/directory/ohl',
            sport: 'Ice hockey',
            description: 'Ontario Hockey League (OHL) — one of three major-junior leagues constituting the Canadian Hockey League, founded 1980. 20 teams (17 in Ontario, 2 in Michigan, 1 in Pennsylvania). Players 16-20.',
            foundingDate: '1980',
            location: { '@type': 'Place', name: 'Ontario, Canada' },
            sameAs: ['https://en.wikipedia.org/wiki/Ontario_Hockey_League'],
          }, {
            '@type': 'FAQPage',
            mainEntity: [
              {
                '@type': 'Question',
                name: 'How many teams play in the OHL?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'The OHL fields 20 teams: 17 in Ontario, 2 in Michigan (Flint Firebirds, Saginaw Spirit), and 1 in Pennsylvania (Erie Otters). The league is one of three major-junior leagues constituting the Canadian Hockey League (CHL), alongside the WHL and QMJHL.',
                },
              },
              {
                '@type': 'Question',
                name: 'Who has won the most OHL championships?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Oshawa Generals hold the record with 13 OHL championships (most recent 2015), the most of any CHL team. Other successful franchises include the Ottawa 67&apos;s (multiple titles), London Knights, and Kitchener Rangers (defending 2025-26 champion with their 5th title). The OHL champion advances to the Memorial Cup tournament against the WHL and QMJHL champions plus the host city representative.',
                },
              },
              {
                '@type': 'Question',
                name: 'When was the OHL founded?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'The OHL was founded in 1980 when the Ontario Major Junior Hockey League (OMJHL) separated from the Ontario Hockey Association. The OMJHL itself was the Tier I Junior A division of the OHA, renamed from "Major Junior A" in 1974. The OHL traces its hockey lineage back to 1933 with the OHA partition of Junior A and B, and the Ontario Hockey Association has governed junior hockey in Ontario since 1890. The OHL is the successor to a continuous chain of junior-hockey governance dating to the 19th century.',
                },
              },
              {
                '@type': 'Question',
                name: 'What is the format of the OHL season?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'The OHL regular season runs from the third week of September to the third week of March, with each of the 20 teams playing 68 games. The 20 teams are split into two conferences (East and West) of two divisions each. The top teams in each division qualify for the OHL playoffs, with best-of-seven series through the conference quarterfinals, conference finals, and the OHL Championship final. The OHL champion then advances to the Memorial Cup round-robin tournament.',
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
        <span style={{ color: 'rgba(255,255,255,0.6)' }}>OHL</span>
      </nav>

      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: '#fff', letterSpacing: '0.02em', lineHeight: 1, fontFamily: '"Bebas Neue", sans-serif' }}>
          OHL — Ontario Hockey League
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.95rem', marginTop: '0.5rem', maxWidth: '780px' }}>
          {teamLabel} (17 in Ontario, 2 in Michigan, 1 in Pennsylvania). Founded 1980. One of three major-junior leagues in the Canadian Hockey League (CHL). Players 16-20. Defending champion: Kitchener Rangers (5th title, 2025-26).
        </p>
      </div>

      <section style={{ marginBottom: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '0.75rem' }}>
          {teamLabel} • OHL 2026-27
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1rem' }}>
          The 20 OHL teams are organized into two conferences. The <strong>Eastern Conference</strong> includes the East Division (Brantford Bulldogs, Kingston Frontenacs, Oshawa Generals, Ottawa 67&apos;s, Peterborough Petes) and the Central Division (Barrie Colts, Brampton Steelheads, Niagara IceDogs, North Bay Battalion, Sudbury Wolves). The <strong>Western Conference</strong> includes the Midwest Division (Erie Otters, Guelph Storm, Kitchener Rangers, London Knights, Owen Sound Attack) and the West Division (Flint Firebirds, Saginaw Spirit, Sarnia Sting, Sault Ste. Marie Greyhounds, Windsor Spitfires).
        </p>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', lineHeight: 1.6 }}>
          Marquee OHL arenas: Canada Life Place (London Knights, 9,000+), WFCU Centre (Windsor Spitfires, 6,400), Tribute Communities Centre (Oshawa Generals, 5,150), Peterborough Memorial Centre (Petes, 4,300), and Sudbury Community Arena (Wolves, 4,640). OHL games are broadcast in Canada on TSN, YourTV, and Rogers TV, and in the US on FloSports.
        </p>
      </section>

      <section style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>OHL HISTORY</h2>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9375rem', lineHeight: 1.75 }}>
          <p style={{ marginBottom: '1rem' }}>
            Organized junior hockey in Ontario dates to 1890, when the Ontario Hockey Association (OHA) was formed at a meeting in Toronto&apos;s Queen&apos;s Hotel. The OHA began formal junior-hockey competition in 1892, with Kingston defeating Galt for the first junior championship. In 1896, the OHA reorganized into senior, intermediate, and junior divisions, with junior hockey limited to players under 20. The OHA has governed junior hockey in Ontario continuously since, with the Memorial Cup — Canada&apos;s national junior hockey championship — first awarded in 1919.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            The junior-A level was divided into two tiers in 1970-71. The Tier I "Major Junior A" league became the Ontario Major Junior Hockey League (OMJHL) in 1974, with administrative offices independent of the OHA. The OMJHL introduced the OHL&apos;s first formal playoff structure and brought in the Central Scouting Bureau (1975) to standardize player evaluation. In 1980, the OMJHL formally separated from the OHA to become the Ontario Hockey League, paying the OHA an annual affiliation fee and gaining complete financial and operational control.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            The OHL has been the dominant development pipeline for NHL talent in Canada. Wayne Gretzky played for the Peterborough Petes in 1977-78 before the OHL formally existed. Connor McDavid (Erie Otters, 2013-15), Steven Stamkos (Sarnia Sting, 2006-08), John Tavares (Oshawa Generals, 2005-09), Patrick Kane (London Knights, 2006-07), Tyler Seguin (Plymouth Whalers, 2008-10), and Mitch Marner (London Knights, 2014-16) are among the OHL alumni who have won the NHL&apos;s top individual awards.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            The OHL expanded in 1998 to 20 teams, adding the Brampton Battalion and Mississauga IceDogs. The league has since churned through franchise relocations: the Cornwall Royals became the Newmarket Royals (1992) and then the Sarnia Sting (1994); the North Bay Centennials became the Saginaw Spirit (2002); the Plymouth Whalers became the Flint Firebirds (2015); the Belleville Bulls became the Hamilton Bulldogs (2015) and then the Brantford Bulldogs (2023); the Mississauga Steelheads became the Brampton Steelheads (2024). 2026-27 sees the league in its 47th season of operation.
          </p>
          <p>
            David Branch served as OHL Commissioner from 1980 to 2024, a 44-year tenure that oversaw the league&apos;s transformation from OHA junior-A governance to one of the most successful major-junior leagues in the world. Bryan Crawford took over as Commissioner for 2024-25. The OHL champion advances to the Memorial Cup tournament alongside the WHL and QMJHL champions and the host-city representative. The Memorial Cup is awarded annually to the Canadian junior hockey champion. Kitchener Rangers won the 2026 OHL championship and advanced to the 2026 Memorial Cup.
          </p>
        </div>
      </section>

      <section style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>HOW THE OHL WORKS</h2>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9375rem', lineHeight: 1.75 }}>
          <p style={{ marginBottom: '1rem' }}>
            The OHL regular season runs from the third week of September to the third week of March, with each of the 20 teams playing 68 games. 90 games per team are scheduled between Thursday and Sunday, optimizing the OHL&apos;s game-day revenue model. The 20 teams are organized into two conferences of two divisions each, with intra-division and inter-division games scheduled to balance travel.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            The top 8 teams in each conference qualify for the OHL playoffs (top 4 in each division, plus the next 4 best across the conference). The first two rounds are intra-division; the conference quarterfinals and conference finals are best-of-seven, with the OHL Championship final also best-of-seven. The OHL champion advances to the Memorial Cup tournament.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            The Memorial Cup tournament is a four-team round-robin held in late May, with the OHL, WHL, and QMJHL champions joined by the host-city representative. The round-robin gives way to a semifinal and a final (both single-elimination). The Memorial Cup has been awarded to the Canadian junior hockey champion since 1919 — making it the second-oldest professional sports trophy in North America after the Stanley Cup.
          </p>
          <p>
            OHL rosters are capped at 25 players for the standard playing roster, with a maximum of 4 import (non-Canadian) players per team. The league&apos;s age limit is 16-20 (players who are at least 16 by September 15 of their draft year and at most 20 by December 31 of the same year). The OHL Priority Selection draft is held in the spring, with players as young as 16 selected for the following season. Top OHL players graduate to NHL, AHL, NCAA, or European professional hockey. The OHL&apos;s NHL alumni include 16 Hart Trophy winners, 8 Conn Smythe Trophy winners, and 4 first-overall NHL draft picks since 2000.
          </p>
        </div>
      </section>

      <section style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.85rem', lineHeight: 1.6, margin: 0 }}>
          <strong style={{ color: 'rgba(255,255,255,0.7)' }}>Editorial standards.</strong> By Arnel Larracas, Founder &amp; Editor-in-Chief, RinkStop. Last reviewed 2026-10-09.<br />
          <strong style={{ color: 'rgba(255,255,255,0.7)' }}>Data sources.</strong> Team count from RinkStop team_workspaces table. Founded 1980 (OHL), 1933 (Junior A partition), 1890 (OHA): ontariohockeyleague.com, Wikipedia (Ontario Hockey League + History of the OHL).<br />
          <span style={{ color: 'rgba(255,255,255,0.45)' }}><Link href="/editorial-policy" style={{ color: '#FFB81C' }}>Editorial policy</Link> · <Link href="/data-methodology" style={{ color: '#FFB81C' }}>Data methodology</Link> · <Link href="/corrections" style={{ color: '#FFB81C' }}>Report a correction</Link></span>
        </p>
      </section>
    </main>
  );
}
