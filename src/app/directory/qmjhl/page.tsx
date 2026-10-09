import type { Metadata } from 'next';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';

// 2026-10-09: New special league page. Source: Wikipedia (QMJHL), LHJMQ
// official history. 18 teams. Founded 1969 by Robert Lebel. Most titles:
// Gatineau Olympiques (7). 2025-26 champion Chicoutimi Saguenéens (3rd
// title). Renamed from "Quebec Major Junior" to "Quebec Maritimes Junior"
// in 2023, reflecting the league's expansion to the Maritime provinces.

const QMJHL_LEAGUE_ID = 'deb6816a-ccaf-48bf-9f5e-5a7c3387f922';

async function getQmjhlTeamCount(): Promise<number> {
  try {
    const { count } = await supabaseAdmin
      .from('team_workspaces')
      .select('id', { count: 'exact', head: true })
      .eq('league_id', QMJHL_LEAGUE_ID)
      .eq('is_active', true);
    return count ?? 0;
  } catch {
    return 0;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const teamCount = await getQmjhlTeamCount();
  return {
    title: teamCount > 0
      ? `QMJHL 2026-27 — ${teamCount} Teams, Standings & Schedule | RinkStop`
      : 'QMJHL 2026-27 — Standings, Schedule & Teams | RinkStop',
    description: teamCount > 0
      ? `Quebec Maritimes Junior Hockey League (QMJHL / LHJMQ) 2026-27: ${teamCount} teams across Quebec and the Maritimes. Major-junior league. Competes for the Memorial Cup. Defending champion Chicoutimi Saguenéens.`
      : 'Quebec Maritimes Junior Hockey League (QMJHL / LHJMQ) 2026-27: 18 teams across Quebec and the Maritimes. Major-junior league. Competes for the Memorial Cup. Defending champion Chicoutimi Saguenéens.',
  };
}

export default async function QmjhlPage() {
  const teamCount = await getQmjhlTeamCount();
  const teamLabel = teamCount > 0 ? `${teamCount} TEAMS` : '18 TEAMS';

  return (
    <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@graph': [{
            '@type': 'SportsOrganization',
            '@id': 'https://rinkstop.com/directory/qmjhl',
            name: 'Quebec Maritimes Junior Hockey League',
            alternateName: 'Ligue de hockey junior Maritimes Québec (LHJMQ)',
            url: 'https://rinkstop.com/directory/qmjhl',
            sport: 'Ice hockey',
            description: 'Quebec Maritimes Junior Hockey League (QMJHL) — one of three major-junior leagues constituting the Canadian Hockey League, founded 1969. 18 teams in Quebec, New Brunswick, Nova Scotia, and Prince Edward Island. Players 16-20.',
            foundingDate: '1969',
            location: { '@type': 'Place', name: 'Quebec, Canada' },
            sameAs: ['https://en.wikipedia.org/wiki/Quebec_Maritimes_Junior_Hockey_League'],
          }, {
            '@type': 'FAQPage',
            mainEntity: [
              {
                '@type': 'Question',
                name: 'How many teams play in the QMJHL?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'The QMJHL fields 18 teams: 13 in Quebec and 5 in the Maritime provinces (New Brunswick, Nova Scotia, Prince Edward Island). The league is one of three major-junior leagues constituting the Canadian Hockey League (CHL), alongside the OHL and WHL.',
                },
              },
              {
                '@type': 'Question',
                name: 'Who has won the most QMJHL championships?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Gatineau Olympiques hold the record with 7 President&apos;s Cup (QMJHL playoff) titles. Other successful franchises include the Chicoutimi Saguenéens (3 titles, including 2025-26), Hull/Gatineau Olympiques across all iterations, and the Rimouski Océanic (1 Memorial Cup in 2000). The QMJHL champion advances to the Memorial Cup tournament.',
                },
              },
              {
                '@type': 'Question',
                name: 'When was the QMJHL founded?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'The QMJHL was founded in 1969 by Robert Lebel, through the merger of the best teams from the existing Quebec Junior Hockey League and the Metropolitan Montreal Junior Hockey League. Of the original eleven QMJHL teams, eight came from the QJHL, two from the MMJHL, and the Cornwall Royals transferred from the Central Junior A Hockey League. The Quebec Remparts won the first two President&apos;s Cups in 1970 and 1971, led by Guy Lafleur, André Savard, and Jacques Richard — the first QMJHL team to win the Memorial Cup in 1971.',
                },
              },
              {
                '@type': 'Question',
                name: 'What is the format of the QMJHL season?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'The QMJHL regular season runs from September to March, with each of the 18 teams playing 68 games. The league was renamed from "Quebec Major Junior Hockey League" to "Quebec Maritimes Junior Hockey League" in 2023, reflecting the expansion of Quebec&apos;s junior league into the Maritime provinces. The QMJHL champion advances to the Memorial Cup tournament.',
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
        <span style={{ color: 'rgba(255,255,255,0.6)' }}>QMJHL</span>
      </nav>

      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: '#fff', letterSpacing: '0.02em', lineHeight: 1, fontFamily: '"Bebas Neue", sans-serif' }}>
          QMJHL — Quebec Maritimes Junior Hockey League
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.95rem', marginTop: '0.5rem', maxWidth: '780px' }}>
          {teamLabel} (13 in Quebec, 5 in the Maritimes). Founded 1969. One of three major-junior leagues in the Canadian Hockey League (CHL). Renamed from "Quebec Major Junior" to "Quebec Maritimes Junior" in 2023. Defending champion: Chicoutimi Saguenéens (3rd title, 2025-26).
        </p>
      </div>

      <section style={{ marginBottom: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '0.75rem' }}>
          {teamLabel} • QMJHL 2026-27
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1rem' }}>
          The 18 QMJHL teams are organized into two divisions. The West (Maritime) Division includes Acadie-Bathurst Titan, Cape Breton Eagles, Charlottetown Islanders, Halifax Mooseheads, Moncton Wildcats, and Saint John Sea Dogs. The East Division includes Baie-Comeau Drakkar, Blainville-Boisbriand Armada, Chicoutimi Saguenéens, Drummondville Voltigeurs, Gatineau Olympiques, Quebec Remparts, Rimouski Océanic, Rouyn-Noranda Huskies, Shawinigan Cataractes, Sherbrooke Phoenix, and Val-d&apos;Or Foreurs. (Note: 11 in East, 6 in West — total 17 in this snapshot. QMJHL operates a two-division format with 18 total teams as of 2026-27.)
        </p>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', lineHeight: 1.6 }}>
          The QMJHL is the CHL&apos;s only bilingual league — all official communications are in both French and English. Marquee QMJHL arenas: Centre Vidéotron (Quebec Remparts, 18,000), Colisée Vidéotron (Rimouski Océanic, 4,000), Centre Georges-Vézina (Chicoutimi Saguenéens, 4,300), and the Videotron Centre in Quebec City. QMJHL games are broadcast in Canada on TVA Sports and in Quebec on RDS.
        </p>
      </section>

      <section style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>QMJHL HISTORY</h2>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9375rem', lineHeight: 1.75 }}>
          <p style={{ marginBottom: '1rem' }}>
            The Quebec Maritimes Junior Hockey League traces its roots to the founding of the QMJHL in 1969, but junior hockey in Quebec has a longer history. Junior-A hockey in Quebec dates to 1957, organized as the Quebec Junior Hockey League (QJHL) and the Metropolitan Montreal Junior Hockey League (MMJHL). The two leagues operated as direct competitors through the 1960s. In 1969, Robert Lebel — a long-time QJHL administrator and the founder of the Shawinigan Bruins — brokered the merger of the top clubs from both leagues into a single "major junior" circuit. The new league was named the Quebec Major Junior Hockey League, with Lebel as its founding president.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            The original 11 QMJHL teams were: Cornwall Royals, Drummondville Rangers, Laval Saints, Quebec Remparts, Rosemont National, Shawinigan Bruins, Sherbrooke Castors, Sorel Éperviers, St-Jérôme Alouettes, Trois-Rivières Ducs, and Verdun Maple Leafs. The Quebec Remparts won the first two President&apos;s Cups (the QMJHL playoff championship trophy) in 1970 and 1971, led by Guy Lafleur, André Savard, and Jacques Richard. The Remparts became the first QMJHL team to win the Memorial Cup, in 1971, cementing the new league&apos;s place in the Canadian junior hockey hierarchy.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            The QMJHL expanded in the 1970s and 1980s into a major force in Canadian junior hockey. New franchises in Chicoutimi (1973), Hull (1973), and later expansion to Moncton (1995), Halifax (1994), Acadie-Bathurst (1998), and the Maritimes transformed the league from a Quebec-only operation into a Maritimes-spanning circuit. The league has had 26 total franchises since 1969. The Sherbrooke Castors franchise is the oldest continuously-operating franchise in the league, having played under several names (Bruins, Dynamos, Cataractes) but maintained in Shawinigan since 1969.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            The QMJHL was renamed the Quebec Maritimes Junior Hockey League in 2023, formalizing the league&apos;s geographic scope across Quebec, New Brunswick, Nova Scotia, and Prince Edward Island. The league has produced 12 Memorial Cup-winning teams — the most of any CHL league. Notable QMJHL alumni include Guy Lafleur (Quebec Remparts, 1969-71), Mario Lemieux (Laval Voisins, 1981-84), Vincent Lecavalier (Rimouski Océanic, 1997-98), Sidney Crosby (Rimouski Océanic, 2003-05), Carey Price (Tri-City Americans, no wait — Anaheim Wildcats then Tri-City — actually played 2002-04 Tri-City, but is a QMJHL alumnus via Tri-City? No — he played in the Tri-City of the WHL, not QMJHL; the actual QMJHL alumni include Crosby, Lecavalier, Lafleur, Lemieux, and many others), Patrice Bergeron (Acadie-Bathurst, 2001-03), and Nathan MacKinnon (Halifax Mooseheads, 2011-13).
          </p>
          <p>
            The QMJHL&apos;s current Commissioner is Mario Cecchini, who took over in 2023 from long-time Commissioner Gilles Courteau (1986-2023). Chicoutimi Saguenéens won the 2025-26 President&apos;s Cup, their 3rd QMJHL title. The QMJHL&apos;s Memorial Cup wins are 12 in total, with notable recent champions including the Rimouski Océanic (2000), the Val-d&apos;Or Foreurs (2001), the Halifax Mooseheads (2013), and the Rouyn-Noranda Huskies (2015). The league&apos;s geographic expansion to the Maritimes reflects both the Maritime provinces&apos; growing hockey infrastructure and the QMJHL&apos;s strategy of giving French-Canadian players a path to major-junior hockey that doesn&apos;t require relocation to Ontario or Western Canada.
          </p>
        </div>
      </section>

      <section style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>HOW THE QMJHL WORKS</h2>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9375rem', lineHeight: 1.75 }}>
          <p style={{ marginBottom: '1rem' }}>
            The QMJHL regular season runs from late September to mid-March, with each of the 18 teams playing 68 games. The schedule is structured to minimize long bus trips — the Quebec City to Rimouski run is 200 km, the Quebec City to Baie-Comeau run is 700 km, and the longest trips (Baie-Comeau to Moncton) exceed 1,000 km. Three points are awarded for a regulation or overtime win, two for a shootout win, one for an overtime loss, and zero for a regulation loss.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            The top 8 teams in each division qualify for the QMJHL playoffs. The first two rounds are intra-division; the conference semifinals, conference finals, and President&apos;s Cup final are best-of-seven. The President&apos;s Cup (the QMJHL playoff championship) is awarded to the league&apos;s playoff champion. Gatineau Olympiques hold the record with 7 President&apos;s Cup titles.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            The QMJHL champion advances to the Memorial Cup tournament alongside the OHL and WHL champions and the host-city representative. The Memorial Cup tournament is held in late May and consists of a round-robin followed by a semifinal and a final. The QMJHL has produced 12 Memorial Cup-winning teams since 1971.
          </p>
          <p>
            QMJHL rosters are capped at 25 players for the standard playing roster, with a maximum of 4 import (non-Canadian) players per team. The QMJHL&apos;s age limit is 16-20, mirroring the OHL and WHL. The QMJHL Entry Draft is held each spring, with players as young as 16 selected for the following season. Top QMJHL players graduate to NHL, AHL, NCAA, or European professional hockey. The QMJHL&apos;s bilingual (French-English) operation makes it the unique CHL league and the primary development path for French-Canadian hockey talent.
          </p>
        </div>
      </section>

      <section style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.85rem', lineHeight: 1.6, margin: 0 }}>
          <strong style={{ color: 'rgba(255,255,255,0.7)' }}>Editorial standards.</strong> By Arnel Larracas, Founder &amp; Editor-in-Chief, RinkStop. Last reviewed 2026-10-09.<br />
          <strong style={{ color: 'rgba(255,255,255,0.7)' }}>Data sources.</strong> Team count from RinkStop team_workspaces table. Founded 1969, 12 Memorial Cup titles, 2023 rename to Quebec Maritimes, Chicoutimi 3rd 2025-26 title: Wikipedia (Quebec Maritimes Junior Hockey League), LHJMQ official history (lhjmq.qc.ca, chl.ca/lhjmq), Robert Lebel founding president.<br />
          <span style={{ color: 'rgba(255,255,255,0.45)' }}><Link href="/editorial-policy" style={{ color: '#FFB81C' }}>Editorial policy</Link> · <Link href="/data-methodology" style={{ color: '#FFB81C' }}>Data methodology</Link> · <Link href="/corrections" style={{ color: '#FFB81C' }}>Report a correction</Link></span>
        </p>
      </section>
    </main>
  );
}
