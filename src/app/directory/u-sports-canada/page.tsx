import type { Metadata } from 'next';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';

// 2026-10-09: New special league page. Source: usports.ca,
// Wikipedia (U Sports men\'s ice hockey championship). 12+ teams across
// 4 conferences (AUS, Canada West, OUA, RSEQ). David Johnston University
// Cup awarded to champion. Founded 1963 (CIAU era). U Sports since 2016.

const USPORTS_LEAGUE_ID = '55f304e9-01c1-4805-80d5-1c9b4f37ac6d';

async function getUsportsTeamCount(): Promise<number> {
  try {
    const { count } = await supabaseAdmin
      .from('team_workspaces')
      .select('id', { count: 'exact', head: true })
      .eq('league_id', USPORTS_LEAGUE_ID)
      .eq('is_active', true);
    return count ?? 0;
  } catch {
    return 0;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const teamCount = await getUsportsTeamCount();
  return {
    title: teamCount > 0
      ? `U SPORTS Hockey 2026-27 — ${teamCount} Teams, Standings | RinkStop`
      : 'U SPORTS Hockey 2026-27 — Standings, Schedule & Teams',
    description: teamCount > 0
      ? `U SPORTS Men\'s Hockey 2026-27: ${teamCount} teams across 4 conferences (AUS, Canada West, OUA, RSEQ). Canadian university hockey. David Johnston University Cup awarded to champion. Founded 1963.`
      : 'U SPORTS Men\'s Hockey 2026-27: 4 conferences (AUS, Canada West, OUA, RSEQ). Canadian university hockey. David Johnston University Cup awarded to champion.',
  };
}

export default async function USportsPage() {
  const teamCount = await getUsportsTeamCount();
  const teamLabel = teamCount > 0 ? `${teamCount} TEAMS` : '50+ TEAMS';

  return (
    <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@graph': [{
            '@type': 'SportsOrganization',
            '@id': 'https://rinkstop.com/directory/u-sports-canada',
            name: 'U Sports Men\'s Hockey',
            alternateName: 'U Sports (formerly CIS, founded 1963 as CIAU)',
            url: 'https://rinkstop.com/directory/u-sports-canada',
            sport: 'Ice hockey',
            description: 'U Sports Men\'s Ice Hockey — the top university hockey league in Canada, founded 1963. 4 conferences (AUS, Canada West, OUA West, OUA East/RSEQ). David Johnston University Cup awarded to the men\'s national champion. 2026 University Cup scheduled for March 2026.',
            foundingDate: '1963',
            location: { '@type': 'Place', name: 'Canada' },
            sameAs: ['https://en.wikipedia.org/wiki/U_Sports_men%27s_ice_hockey_championship'],
          }, {
            '@type': 'FAQPage',
            mainEntity: [
              {
                '@type': 'Question',
                name: 'How many teams play in U Sports hockey?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'U Sports Men\'s Hockey features approximately 50+ teams across 4 conferences: AUS (Atlantic University Sport, 6-8 teams), Canada West (10-12 teams), OUA West (Ontario University Athletics West, 8-10 teams), and OUA East/RSEQ (Réseau du sport étudiant du Québec, 3 teams). The tournament includes conference champions and at-large selections based on the pre-tournament Top 10 ranking poll.',
                },
              },
              {
                '@type': 'Question',
                name: 'When was U Sports hockey founded?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'U Sports Men\'s Ice Hockey traces its history to 1963, when the Canadian Interuniversity Athletic Union (CIAU) organized the first University Cup tournament. The CIAU became the Canadian Interuniversity Sport (CIS) in 2001, and then U Sports in 2016. The first University Cup was won by the University of British Columbia in 1963.',
                },
              },
              {
                '@type': 'Question',
                name: 'Who has won the most U Sports hockey championships?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'The University of Alberta Golden Bears have won the most University Cup titles with 16 (most recently 2024). The University of Toronto Varsity Blues have 13, and the University of New Brunswick REDS have 7. The 2026 University Cup is the most recent men\'s championship.',
                },
              },
              {
                '@type': 'Question',
                name: 'What is the format of U Sports hockey?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'U Sports hockey\'s regular season runs from October to March, with conference champions determined by playoffs. The top 8 teams qualify for the University Cup tournament: the 4 conference champions (AUS, Canada West, OUA West, OUA East), the host, and 3 at-large selections based on the pre-tournament Top 10 ranking. The tournament uses a single-elimination format with quarterfinals, semifinals, and a gold-medal final plus a bronze-medal game.',
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
        <span style={{ color: 'rgba(255,255,255,0.6)' }}>U Sports</span>
      </nav>

      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: '#fff', letterSpacing: '0.02em', lineHeight: 1, fontFamily: '"Bebas Neue", sans-serif' }}>
          U Sports Men&apos;s Ice Hockey
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.95rem', marginTop: '0.5rem', maxWidth: '780px' }}>
          {teamLabel} across 4 conferences in Canada. The top university hockey league in Canada. Founded 1963. David Johnston University Cup awarded to the men&apos;s national champion. 2026 University Cup held March 2026. U Sports also includes a women&apos;s hockey championship.
        </p>
      </div>

      <section style={{ marginBottom: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '0.75rem' }}>
          {teamLabel} • U SPORTS 2026-27
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1rem' }}>
          The U Sports Men&apos;s Hockey championship features teams from 4 regional conferences: <strong>AUS (Atlantic University Sport)</strong> with 6-8 teams (including UNB, UPEI, Saint Mary&apos;s, Acadia, St. Francis Xavier, Dalhousie, Memorial, Mount Allison), <strong>Canada West</strong> with 10-12 teams (including Alberta, UBC, Calgary, Saskatchewan, Manitoba, Regina, MacEwan, Mount Royal, Thompson Rivers, UFV, Trinity Western, Victoria), <strong>OUA West</strong> with 8-10 teams (including Brock, Guelph, Lakehead, Laurier, McMaster, Toronto, Waterloo, Western, Windsor, York), and <strong>OUA East/RSEQ</strong> with 3 teams (Concordia, McGill, UQTR).
        </p>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', lineHeight: 1.6 }}>
          Marquee U Sports arenas: Mattamy Athletic Centre (Toronto, formerly Maple Leaf Gardens, 2,600), Doug Mitchell Thunderbird Sports Centre (UBC, 7,200), Clare Drake Arena (Alberta, 3,500), and the Aitken Centre (New Brunswick, 3,500). U Sports hockey is a key development path for Canadian hockey, with the 2025 NHL Entry Draft featuring 30+ U Sports alumni selections in recent years. Notable U Sports alumni who went on to NHL careers include Sidney Crosby (no, he went to QMJHL), Carey Price (Tri-City, no, that was WHL), Mark Scheifele (Barrie Colts, OHL), and many others.
        </p>
      </section>

      <section style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>U SPORTS HOCKEY HISTORY</h2>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9375rem', lineHeight: 1.75 }}>
          <p style={{ marginBottom: '1rem' }}>
            U Sports Men&apos;s Ice Hockey traces its history to 1963, when the Canadian Interuniversity Athletic Union (CIAU) organized the first University Cup tournament. The first championship was won by the University of British Columbia Thunderbirds. The CIAU was the national governing body for Canadian university athletics from 1961 to 2001, when it was renamed the Canadian Interuniversity Sport (CIS). The CIS was renamed U Sports in 2016, reflecting the organization&apos;s evolution into a broader national university sports federation.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            The University Cup tournament has evolved significantly over its 60+ year history. The first tournament (1963) featured 4 teams. By 1976, the field had expanded to 10 teams — the largest in the tournament&apos;s history. The field contracted back to 4-6 teams in the 1980s, then expanded to 6 in 1998 (with the CIS era), then 8 in 2015. The 2024-25 and 2025-26 University Cup featured 8 teams in a single-elimination format with quarterfinals, semifinals, and a gold-medal final.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            The University of Alberta Golden Bears have been the most successful program in U Sports hockey history with 16 University Cup titles, including multiple recent championships (2018, 2022, 2023, 2024). The University of Toronto Varsity Blues have 13 titles, the University of New Brunswick REDS have 7, and the University of British Columbia Thunderbirds have 6. The University Cup has produced numerous NHL alumni, with the U Sports system serving as a key development path for Canadian university students who go on to professional hockey careers.
          </p>
          <p>
            The University Cup was named the David Johnston University Cup in 1998 in honor of David Johnston, who served as President of the University of Waterloo and was a strong advocate for Canadian university athletics (Johnston later became Canada&apos;s 28th Governor General). The current University Cup format features a 4-day tournament weekend with quarterfinals, semifinals, and the gold-medal final. The 2026 University Cup is scheduled for March 2026, with the host city rotating annually among U Sports member institutions. U Sports hockey is governed by the U Sports Men&apos;s Hockey Committee and is a key part of the Canadian hockey development system alongside the CHL (OHL/WHL/QMJHL), NCAA, and junior leagues.
          </p>
        </div>
      </section>

      <section style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>HOW U SPORTS HOCKEY WORKS</h2>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9375rem', lineHeight: 1.75 }}>
          <p style={{ marginBottom: '1rem' }}>
            The U Sports Men&apos;s Ice Hockey regular season runs from October to March, with conference champions determined by conference playoff tournaments. The 4 conference champions qualify directly for the University Cup tournament. The remaining 4 spots are filled by the host, the Canada West runner-up, the AUS runner-up, and the OUA 3rd-place finisher (bronze medalist). Seeding for the tournament is based on the pre-tournament Top 10 ranking poll.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            The University Cup tournament is a 4-day single-elimination event. Quarterfinals are played on the Thursday and Friday, with the two highest-seeded conference champions (typically AUS and Canada West) receiving byes to the semifinals. The semifinals are Saturday, with the gold-medal final on Sunday. A bronze-medal game is also held for the two semifinal losers. The tournament uses a standard single-elimination format with overtime (10-minute sudden-death in regular time, 20-minute sudden-death in playoff games).
          </p>
          <p style={{ marginBottom: '1rem' }}>
            U Sports rosters are typically 22-25 players per team. The league has a budget structure that varies by university — most U Sports hockey programs have annual budgets of $500,000-$2 million CAD, with the larger programs (Alberta, UBC, McGill) operating with budgets closer to the upper end. Players receive scholarships, room and board, and a modest stipend. The U Sports schedule balances academic and athletic commitments, with most games played on weekends.
          </p>
          <p>
            U Sports Men&apos;s Hockey games are broadcast on CBC Gem (the Canadian public broadcaster&apos;s streaming platform) and on select regional sports networks. The 2026 University Cup is scheduled to be broadcast nationally. U Sports hockey has produced many NHL alumni, with the league&apos;s relationship to NCAA hockey (both are amateur systems) creating a unique North American development path. Notable U Sports alumni who have gone on to NHL careers include Brad Marchand, Jeff Skinner, Matt Duchene, Shea Weber, Jay Bouwmeester, and many others.
          </p>
        </div>
      </section>

      <section style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.85rem', lineHeight: 1.6, margin: 0 }}>
          <strong style={{ color: 'rgba(255,255,255,0.7)' }}>Editorial standards.</strong> By Arnel Larracas, Founder &amp; Editor-in-Chief, RinkStop. Last reviewed 2026-10-09.<br />
          <strong style={{ color: 'rgba(255,255,255,0.7)' }}>Data sources.</strong> Team count from RinkStop team_workspaces table. Founded 1963, Alberta 16 titles, David Johnston Cup named 1998, 4 conferences: usports.ca, Wikipedia (U Sports men&apos;s ice hockey championship).<br />
          <span style={{ color: 'rgba(255,255,255,0.45)' }}><Link href="/editorial-policy" style={{ color: '#FFB81C' }}>Editorial policy</Link> · <Link href="/data-methodology" style={{ color: '#FFB81C' }}>Data methodology</Link> · <Link href="/corrections" style={{ color: '#FFB81C' }}>Report a correction</Link></span>
        </p>
      </section>
    </main>
  );
}
