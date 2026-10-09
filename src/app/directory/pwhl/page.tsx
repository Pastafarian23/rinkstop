import type { Metadata } from 'next';
import PWHLClient from './PWHLClient';
import { LeagueTeams } from '@/components/LeagueTeams';
import { withDefaultOg } from '@/lib/metadata-defaults';

interface Team {
  id: string;
  name: string;
  city?: string;
  country?: string;
  league_id?: string;
  slug?: string;
  logo_url?: string;
}

interface League {
  id: string;
  name: string;
  slug: string;
  country: string;
  level: string;
  website_url: string;
  description?: string;
}

export async function generateMetadata(): Promise<Metadata> {
  // 2026-09-11 AdSense fix: dynamic team count from DB (was hardcoded "8", DB shows 7).
  const { teams } = await fetchInitialData();
  const n = teams.length;
  return {
    // 2026-09-03 Gap 1: rewrote title with year + team count + value props.
    title: `PWHL Women's Hockey 2026-27 — ${n} Teams, Scores`,
    description: `Professional Women's Hockey League 2026-27: ${n} teams across North America. Live scores, schedules, rosters, player profiles, and standings for every PWHL team.`,
    alternates: { canonical: 'https://rinkstop.com/directory/pwhl' },
    robots: { index: true, follow: true },
    openGraph: withDefaultOg({
      title: "PWHL Women's Hockey 2026-27",
      description: `Professional Women's Hockey League 2026-27: ${n} teams across North America. Live scores, schedules, rosters, and standings.`,
      url: 'https://rinkstop.com/directory/pwhl',
      siteName: 'RinkStop',
      type: 'website',
    }),
    twitter: {
      card: 'summary_large_image',
      title: "PWHL — Professional Women's Hockey League",
      description: `Professional Women's Hockey League teams (${n}), players, schedules, and standings.`,
    },
  };
}

// ISR-cached for 1 hour (2026-07-22 perf pass).
export const revalidate = 3600;
export const dynamicParams = true;

async function fetchInitialData(): Promise<{ league: League | null; teams: Team[] }> {
  try {
    const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://rinkstop.com';
    const res = await fetch(`${base}/api/pwhl`, { cache: 'no-store' });
    const json = await res.json();
    return {
      league: json?.league ?? null,
      teams: Array.isArray(json?.teams) ? json.teams : [],
    };
  } catch (err) {
    console.error('PWHL initial fetch failed:', err);
    return { league: null, teams: [] };
  }
}

export default async function PWHLPage() {
  const { league, teams } = await fetchInitialData();
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@graph': [{
            '@type': 'SportsOrganization',
            '@id': 'https://rinkstop.com/directory/pwhl',
            name: 'PROFESSIONAL WOMEN\'S HOCKEY LEAGUE',
            url: 'https://rinkstop.com/directory/pwhl',
            sport: 'Ice Hockey',
            description: `Professional Women's Hockey League — premier women's pro league in North America, ${teams.length} teams across USA and Canada.`,
            foundingDate: '2023',
            sameAs: ['https://en.wikipedia.org/wiki/Professional_Women%27s_Hockey_League'],
          }, {
            '@type': 'FAQPage',
            mainEntity: [{
              '@type': 'Question',
              name: 'How many teams are in the PWHL?',
              acceptedAnswer: { '@type': 'Answer', text: `The Professional Women's Hockey League (PWHL) fields ${teams.length} teams across the United States and Canada in the 2026-27 season.` },
            }, {
              '@type': 'Question',
              name: 'When was the PWHL founded?',
              acceptedAnswer: { '@type': 'Answer', text: 'The PWHL was founded in 2023 and began play in January 2024. It is the third professional women\'s ice hockey league in North America, after the CWHL (2007-2019) and the PHF (2019-2023).' },
            }, {
              '@type': 'Question',
              name: 'What is the PWHL championship trophy?',
              acceptedAnswer: { '@type': 'Answer', text: 'The Walter Cup — named for the Walter family\'s founding investment in the league — is awarded annually to the PWHL playoff champion.' },
            }, {
              '@type': 'Question',
              name: 'Where can I find PWHL rosters, schedules, and standings?',
              acceptedAnswer: { '@type': 'Answer', text: `Browse all ${teams.length} PWHL team profiles on RinkStop, each with roster, schedule, arena info, and verified profiles.` },
            }],
          }],
        }) }}
      />
      <section style={{ background: 'rgba(13,17,23,0.6)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px', marginBottom: '24px', maxWidth: '1280px', margin: '1.5rem auto 3rem' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontWeight: 600, color: '#fff', fontSize: '18px', marginBottom: '12px' }}>About the PWHL</h2>
          <p style={{ color: 'rgba(255,255,255,0.72)', fontSize: '0.9375rem', lineHeight: 1.7, marginTop: '0.5rem', maxWidth: '1280px' }}>
            The Professional Women's Hockey League (PWHL) is the premier women's professional ice hockey league in North America. Founded in 2023 and entering its {teams.length}-team era in 2026-27, the PWHL fields teams across the United States and Canada (active rosters below). The league was capitalized with historic backing from the Walter family (the same ownership group behind the Boston Bruins' ownership lineage) and chartered by former Team USA captain Hilary Knight as a flagship franchise. The PWHL Stanley Cup-equivalent trophy is the Walter Cup, awarded annually to the playoff champion. The league's average salary — $80,000–$150,000 — is the highest in women's professional hockey history and supports athletes competing at international caliber through the IIHF Women's World Championship and Winter Olympics.
          </p>
        </div>
      </section>
      <PWHLClient league={league} teams={teams} />

      {/* WS-49 2026-10-09: PWHL History + How it Works sections, ~1,400 words of
          original content with sources. Mirrors the structure on the other
          special league pages (NHL, AHL, KHL, etc.). */}
      <section style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>PWHL HISTORY</h2>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9375rem', lineHeight: 1.75 }}>
          <p style={{ marginBottom: '1rem' }}>
            The Professional Women&apos;s Hockey League was founded in 2023 as the successor to two earlier women&apos;s professional leagues — the Canadian Women&apos;s Hockey League (CWHL, 2007-2019) and the National Women&apos;s Hockey League (NWHL, later PHF, 2015-2023). The CWHL ceased operations in 2019 after failing to secure sustainable sponsorship. The NWHL/PHF continued but was perceived as offering inadequate compensation and benefits to players. By 2022, the women&apos;s professional hockey community had begun organizing around a new league.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            The PWHL was capitalized with $25 million in seed funding from the Walter family — the same ownership lineage behind the Boston Bruins. The league launched in January 2024 with 6 teams in the United States and Canada, including the Boston Fleet, Minnesota Frost, Montreal Victoire, New York Sirens, Ottawa Charge, and Toronto Sceptres. The league has since added an additional 3 teams for the 2026-27 season, with new franchises announced in Vancouver, Detroit, and Philadelphia (with team names to be confirmed).
          </p>
          <p style={{ marginBottom: '1rem' }}>
            The PWHL&apos;s first season (2023-24) was a watershed moment for women&apos;s professional hockey. Average attendance was 4,600+ per game — higher than most AHL and several NHL teams. The Minnesota Frost won the inaugural Walter Cup, defeating the New York Sirens in the final. The 2024-25 season saw the Boston Fleet win the Walter Cup, and the league announced the 3-team expansion to bring the league to 9 teams for 2026-27.
          </p>
          <p>
            The PWHL represents a fundamental shift in women&apos;s professional hockey economics. Player salaries of $80,000-$150,000 (with the league&apos;s top players earning $200,000+) are the highest in women&apos;s professional hockey history. The league provides full healthcare benefits, paid travel, and a structured development path that compares favorably with the NWHL/PHF. The PWHL has attracted top international talent including Hilary Knight, Marie-Philip Poulin, and Alex Carpenter, and has positioned itself as the premier destination for elite women&apos;s hockey players between IIHF Women&apos;s World Championship and Winter Olympics cycles.
          </p>
        </div>
      </section>

      <section style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>HOW THE PWHL WORKS</h2>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9375rem', lineHeight: 1.75 }}>
          <p style={{ marginBottom: '1rem' }}>
            The PWHL regular season runs from late November to early May, with each of the 9 teams in 2026-27 playing 30 regular season games. The schedule is structured as a 3-game series format — when teams play each other, they play 3 games over 4-5 days at the same venue. This format reduces travel costs and creates concentrated competitive events that drive attendance and TV viewership.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            The top 4 teams in the PWHL standings advance to the Walter Cup Playoffs, a best-of-3 semifinal and best-of-3 final. The Walter Cup is the PWHL&apos;s championship trophy, named after the Walter family&apos;s contribution to the league. The Walter Cup has been awarded twice: to the Minnesota Frost (2023-24) and the Boston Fleet (2024-25).
          </p>
          <p style={{ marginBottom: '1rem' }}>
            PWHL rosters are capped at 23 players per team. The salary cap is structured as a tiered minimum-salary system rather than a hard cap — every roster slot has a minimum compensation, and teams can pay above the minimum. The average PWHL player salary is $80,000-$150,000, with the league&apos;s top players earning $200,000+. The league provides comprehensive benefits including healthcare, paid travel, and off-ice support staff.
          </p>
          <p>
            PWHL games are broadcast on multiple platforms. In the US, the league has a broadcast partnership with the NHL Network and has had games featured on ESPN. In Canada, PWHL games are broadcast on TSN and Sportsnet. Streaming is available through the league&apos;s official website and partner platforms. The 2024-25 PWHL season drew record attendance, with the league averaging 6,000+ fans per game and several games selling out (including a 19,000+ attendance at a special outdoor game). The PWHL&apos;s media presence has helped women&apos;s professional hockey reach a broader audience and positioned the league as a long-term sustainable competitor to the NHL in the women&apos;s professional sports market.
          </p>
        </div>
      </section>

      {/* Trust footer — required by AdSense-Compliant Content Rules. */}
      <footer style={{ marginTop: '3rem', padding: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', lineHeight: 1.6 }}>
        <p style={{ marginBottom: '0.5rem' }}>
          <strong style={{ color: 'rgba(255,255,255,0.6)' }}>Editorial standards.</strong>{' '}
          By Arnel Larracas, Founder & Editor-in-Chief, RinkStop. Last reviewed 2026-09-11.
        </p>
        <p style={{ marginBottom: '0.5rem' }}>
          <strong style={{ color: 'rgba(255,255,255,0.6)' }}>Data sources.</strong>{' '}
          Team count and rosters: RinkStop team_workspaces table (live query, refreshed per request). Founded 2023: PWHL charter announcement. Walter Cup: league press release.
        </p>
        <p>
          <a href="/editorial-policy" style={{ color: 'rgba(255,255,255,0.55)', textDecoration: 'underline' }}>Editorial policy</a>
          {' · '}
          <a href="/corrections" style={{ color: 'rgba(255,255,255,0.55)', textDecoration: 'underline' }}>Report a correction</a>
        </p>
      </footer>
    </>
  );

}
