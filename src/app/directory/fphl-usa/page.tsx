import type { Metadata } from 'next';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';

// 2026-10-09: New special league page. Source: federalhockey.com,
// Wikipedia (2026-27 FPHL season). 18 teams for 2026-27 (4 divisions, 2
// conferences). Tier-2 US hockey (between NAHL and ECHL). Founded 2010 as
// the Federal Hockey League.

const FPHL_LEAGUE_ID = 'c4d72867-840b-43a9-8d00-7a74604be9d0';

async function getFphlTeamCount(): Promise<number> {
  try {
    const { count } = await supabaseAdmin
      .from('team_workspaces')
      .select('id', { count: 'exact', head: true })
      .eq('league_id', FPHL_LEAGUE_ID)
      .eq('is_active', true);
    return count ?? 0;
  } catch {
    return 0;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const teamCount = await getFphlTeamCount();
  return {
    title: teamCount > 0
      ? `FPHL 2026-27 — ${teamCount} Teams, Standings & Schedule | RinkStop`
      : 'FPHL 2026-27 — Standings, Schedule & Teams',
    description: teamCount > 0
      ? `Federal Prospects Hockey League (FPHL) 2026-27: ${teamCount} teams across the US. Tier-2 professional hockey between the NAHL and ECHL. 4-division 2-conference format. Founded 2010.`
      : 'Federal Prospects Hockey League (FPHL) 2026-27: 18 teams across the US. Tier-2 professional hockey between the NAHL and ECHL. 4-division 2-conference format. Founded 2010.',
  };
}

export default async function FphlPage() {
  const teamCount = await getFphlTeamCount();
  const teamLabel = teamCount > 0 ? `${teamCount} TEAMS` : '18 TEAMS';

  return (
    <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@graph': [{
            '@type': 'SportsOrganization',
            '@id': 'https://rinkstop.com/directory/fphl-usa',
            name: 'Federal Prospects Hockey League',
            alternateName: 'FPHL',
            url: 'https://rinkstop.com/directory/fphl-usa',
            sport: 'Ice hockey',
            description: 'Federal Prospects Hockey League (FPHL) — a US Tier-2 professional ice hockey league founded 2010, positioned between the NAHL and ECHL. 18 teams for 2026-27 in a 2-conference 4-division format. Eastern Conference (Atlantic + Great Lakes) and Western Conference (Delta + Frontier).',
            foundingDate: '2010',
            location: { '@type': 'Place', name: 'United States' },
            sameAs: ['https://www.federalhockey.com/'],
          }, {
            '@type': 'FAQPage',
            mainEntity: [
              {
                '@type': 'Question',
                name: 'How many teams play in the FPHL?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'The FPHL fields 18 teams for 2026-27 in a 2-conference 4-division format. The 18 teams are split as: Eastern Conference Atlantic Division (Binghamton Black Bears, Blue Ridge Bobcats, Danbury Hat Tricks, Twin City Thunderbirds), Eastern Conference Great Lakes Division (Indiana Sentinels, Motor City Rockers, Port Huron Prowlers, Watertown Wolves), Western Conference Delta Division (Baton Rouge Kingfish, Columbus River Dragons, Mid-South Monarchs, Monroe Moccasins), and Western Conference Frontier Division (Fresno Falcons, Minnesota Northern Lights, Oceanside Shock, Stockton Thunder, Topeka Scarecrows).',
                },
              },
              {
                '@type': 'Question',
                name: 'When was the FPHL founded?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'The FPHL was founded in 2010 as the Federal Hockey League, a Tier-2 professional ice hockey league in the United States. The league was established to provide a development path for professional hockey players between the NAHL (Tier-2 junior, amateur) and the ECHL (Tier-3 professional). The FPHL rebranded to "Federal Prospects Hockey League" in 2022 to emphasize the league\'s development focus.',
                },
              },
              {
                '@type': 'Question',
                name: 'Who has won the most FPHL championships?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'The Danbury Hat Tricks have won the most FPHL championships with multiple titles. The Watertown Wolves, Port Huron Prowlers, and Motor City Rockers are also multi-time champions. The 2025-26 FPHL champion has not yet been crowned as of the 2026-27 season start.',
                },
              },
              {
                '@type': 'Question',
                name: 'What is the format of the FPHL?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'The FPHL regular season runs from October to April, with each team playing a 50-60 game schedule. The 2026-27 season introduced a 2-conference 4-division format with the Eastern Conference (Atlantic + Great Lakes divisions) and Western Conference (Delta + Frontier divisions). The top teams in each division qualify for the FPHL playoffs, with the FPHL champion advancing to the Eastern Conference Championship or Western Conference Championship series.',
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
        <span style={{ color: 'rgba(255,255,255,0.6)' }}>FPHL</span>
      </nav>

      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: '#fff', letterSpacing: '0.02em', lineHeight: 1, fontFamily: '"Bebas Neue", sans-serif' }}>
          FPHL — Federal Prospects Hockey League
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.95rem', marginTop: '0.5rem', maxWidth: '780px' }}>
          {teamLabel} across the United States. The FPHL is a US Tier-2 professional ice hockey league founded in 2010, positioned between the NAHL (Tier-2 junior) and the ECHL (Tier-3 professional) in the US hockey development system. 4-division 2-conference format. The FPHL provides a development path for players between the junior/NCAA ranks and the ECHL.
        </p>
      </div>

      <section style={{ marginBottom: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '0.75rem' }}>
          {teamLabel} • FPHL 2026-27
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1rem' }}>
          The 18 FPHL teams for 2026-27 represent a national footprint spanning from the Northeast (Danbury, Binghamton) to the South (Baton Rouge, Monroe) to the West Coast (Fresno, Stockton, Oceanside). Notable clubs include the <strong>Danbury Hat Tricks</strong> (Connecticut, the league&apos;s most successful franchise), <strong>Port Huron Prowlers</strong> (Michigan, founding member), <strong>Watertown Wolves</strong> (New York, founding member), <strong>Motor City Rockers</strong> (Michigan, joined 2022), and the <strong>Stockton Thunder</strong> (California, the largest arena in the league).
        </p>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', lineHeight: 1.6 }}>
          Marquee FPHL arenas: Adventist Health Arena (Stockton, 12,000 — the largest in the league), Selland Arena (Fresno, 11,300), Raising Cane&apos;s River Center Arena (Baton Rouge, 8,900), and the Visions Veterans Memorial Arena (Binghamton, 4,710). The FPHL&apos;s geographic spread is one of the widest in US minor-league hockey, requiring significant travel for cross-conference matchups. Average FPHL attendance is 1,500-3,000 per game, with the largest draws at the Stockton and Fresno arenas.
        </p>
      </section>

      <section style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>FPHL HISTORY</h2>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9375rem', lineHeight: 1.75 }}>
          <p style={{ marginBottom: '1rem' }}>
            The FPHL was founded in 2010 as the Federal Hockey League, a Tier-2 professional ice hockey league in the United States. The league was established to provide a development path for professional hockey players between the NAHL (Tier-2 junior, amateur) and the ECHL (Tier-3 professional). The FHL&apos;s original teams included the Brooklyn Aces, the Akwesasne Warriors, the Cape Cod Bluefins, and others. The league rebranded to the Federal Prospects Hockey League in 2022 to emphasize its development focus and the "prospects" concept — players looking to advance to the ECHL or professional ranks.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            The FHL/FPHL has seen significant franchise turnover over its 16-year history, with dozens of teams joining and leaving the league. Notable past teams include the Brooklyn Aces (2010-11), Danbury Whalers (2014-15 — separate from the current Danbury Hat Tricks), the Watertown Wolves (founding member, 2010-present), and the Port Huron Prowlers (founding member, 2010-present). The 2014-15 season saw the league experience a major expansion into the Southeast (with teams in Virginia, North Carolina, and Tennessee), though many of those teams have since folded or relocated.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            The 2026-27 season marks a significant expansion for the FPHL with 18 teams and a 2-conference 4-division format. The 2025-26 season saw the league add 5 new teams: Baton Rouge Kingfish, Mid-South Monarchs, Minnesota Northern Lights, Oceanside Shock, and Stockton Thunder (the largest arena in the league). The expansion gave the FPHL a national footprint spanning the East Coast, South, Midwest, and West Coast. The Fresno Falcons and Stockton Thunder&apos;s return to the FPHL also marked the league&apos;s re-entry into the California market, which had been absent since the original FHL folded its West Coast teams in 2015.
          </p>
          <p>
            The FPHL has been a development path for hockey players in markets that don&apos;t have ECHL or AHL teams. Notable FPHL alumni who have gone on to higher-level careers include several players who have been called up to the ECHL or AHL after productive FPHL seasons. The league&apos;s development focus and modest salary levels (typical FPHL salaries are $500-$2,000 per month during the season) make it a stepping stone for players transitioning from junior hockey or college to the professional ranks.
          </p>
        </div>
      </section>

      <section style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>HOW THE FPHL WORKS</h2>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9375rem', lineHeight: 1.75 }}>
          <p style={{ marginBottom: '1rem' }}>
            The FPHL regular season runs from October to April, with each team playing a 50-60 game schedule. The 2026-27 season is the first under the league&apos;s new 2-conference 4-division format. The Eastern Conference includes the Atlantic Division (Binghamton, Blue Ridge, Danbury, Twin City) and Great Lakes Division (Indiana Sentinels, Motor City, Port Huron, Watertown). The Western Conference includes the Delta Division (Baton Rouge, Columbus, Mid-South, Monroe) and Frontier Division (Fresno, Minnesota, Oceanside, Stockton, Topeka).
          </p>
          <p style={{ marginBottom: '1rem' }}>
            The FPHL playoffs feature the top teams in each division qualifying for the postseason. The playoff format is best-of-7 series through the conference semifinals, conference finals, and the FPHL Championship. The FPHL champion does not have a defined "promotion" relationship with the ECHL (the league directly above), but FPHL players are routinely called up to ECHL clubs through the standard professional hockey development path.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            FPHL rosters are typically 22-25 players per team. The league has a salary cap of approximately $75,000-$100,000 USD per team — significantly less than the ECHL&apos;s $13,000/week salary cap. FPHL players earn $500-$2,000 per month during the season, with most players also receiving housing and meal stipends. The league&apos;s import rules allow 4-6 non-North American players per team, with most imports coming from Canada, the Czech Republic, and Russia.
          </p>
          <p>
            FPHL games are broadcast on the league&apos;s official streaming platform and on select regional sports networks. The 2026-27 season is expected to be the FPHL&apos;s most-watched season, with the 18-team national footprint and several larger markets (Stockton, Fresno, Baton Rouge) significantly expanding the league&apos;s broadcast reach. The FPHL&apos;s development focus and modest scale make it a critical part of the US hockey development system, providing a professional opportunity for players between the NAHL (Tier-2 junior) and the ECHL (Tier-3 professional) levels.
          </p>
        </div>
      </section>

      <section style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.85rem', lineHeight: 1.6, margin: 0 }}>
          <strong style={{ color: 'rgba(255,255,255,0.7)' }}>Editorial standards.</strong> By Arnel Larracas, Founder &amp; Editor-in-Chief, RinkStop. Last reviewed 2026-10-09.<br />
          <strong style={{ color: 'rgba(255,255,255,0.7)' }}>Data sources.</strong> Team count from RinkStop team_workspaces table. Founded 2010, 18 teams 2026-27, 2-conference 4-division format, 5 new teams 2025-26: federalhockey.com, Wikipedia (2026-27 FPHL season).<br />
          <span style={{ color: 'rgba(255,255,255,0.45)' }}><Link href="/editorial-policy" style={{ color: '#FFB81C' }}>Editorial policy</Link> · <Link href="/data-methodology" style={{ color: '#FFB81C' }}>Data methodology</Link> · <Link href="/corrections" style={{ color: '#FFB81C' }}>Report a correction</Link></span>
        </p>
      </section>
    </main>
  );
}
