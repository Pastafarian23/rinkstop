import type { Metadata } from 'next';
import PWHLClient from './PWHLClient';
import { LeagueTeams } from '@/components/LeagueTeams';
import { withDefaultOg } from '@/lib/metadata-defaults';
import { normalizePwhlTeams } from '@/lib/pwhl-franchises';

// Official PWHL franchise count for 2026-27 (thepwhl.com team list: 12 teams).
// Do not derive copy from database row counts: the team table holds duplicate and
// legacy rows until the approved PWHL data correction is applied.
const PWHL_FRANCHISE_COUNT = 12;

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
  const n = PWHL_FRANCHISE_COUNT;
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
  const { league, teams: rawTeams } = await fetchInitialData();
  // Exactly the 12 official franchises, each linked by its canonical slug, whatever
  // duplicate or placeholder rows the team table currently holds.
  const teams = normalizePwhlTeams(rawTeams as any[]) as any[];
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
            description: `Professional Women's Hockey League — premier women's pro league in North America, ${PWHL_FRANCHISE_COUNT} teams across USA and Canada.`,
            foundingDate: '2023',
            sameAs: ['https://en.wikipedia.org/wiki/Professional_Women%27s_Hockey_League'],
          }, {
            '@type': 'FAQPage',
            mainEntity: [{
              '@type': 'Question',
              name: 'How many teams are in the PWHL?',
              acceptedAnswer: { '@type': 'Answer', text: `The Professional Women's Hockey League (PWHL) fields ${PWHL_FRANCHISE_COUNT} teams across the United States and Canada in the 2026-27 season.` },
            }, {
              '@type': 'Question',
              name: 'When was the PWHL founded?',
              acceptedAnswer: { '@type': 'Answer', text: 'The PWHL was announced in 2023 by the Mark Walter Group and began play in January 2024 with six teams. It has 12 teams in the 2026-27 season.' },
            }, {
              '@type': 'Question',
              name: 'What is the PWHL championship trophy?',
              acceptedAnswer: { '@type': 'Answer', text: 'The Walter Cup is awarded to the PWHL playoff champion. The Minnesota Frost won it in 2024 and 2025, and the Montr\u00e9al Victoire won it in 2026.' },
            }, {
              '@type': 'Question',
              name: 'Where can I find PWHL rosters, schedules, and standings?',
              acceptedAnswer: { '@type': 'Answer', text: `Browse all ${PWHL_FRANCHISE_COUNT} PWHL team profiles on RinkStop, each with roster, schedule, arena info, and verified profiles.` },
            }],
          }],
        }) }}
      />
      <section style={{ background: 'rgba(13,17,23,0.6)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px', marginBottom: '24px', maxWidth: '1280px', margin: '1.5rem auto 3rem' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontWeight: 600, color: '#fff', fontSize: '18px', marginBottom: '12px' }}>About the PWHL</h2>
          <p style={{ color: 'rgba(255,255,255,0.72)', fontSize: '0.9375rem', lineHeight: 1.7, marginTop: '0.5rem', maxWidth: '1280px' }}>
            The Professional Women's Hockey League (PWHL) is a professional women's ice hockey league in North America. It was announced in 2023 by the Mark Walter Group, began play in January 2024 with six charter teams, and in 2026-27 is made up of {PWHL_FRANCHISE_COUNT} teams: seven in the United States and five in Canada. The 2026-27 regular season runs from December 5, 2026 to April 18, 2027.
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
            The PWHL grew out of the collapse of the Canadian Women&apos;s Hockey League in 2019 and the advocacy of the Professional Women&apos;s Hockey Players Association (PWHPA), which called for a single, viable professional league in North America. The Mark Walter Group announced the PWHL in August 2023 together with its six charter markets: Boston, Minneapolis&ndash;St. Paul, Montr&eacute;al, New York, Ottawa and Toronto.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            The first game was played on January 1, 2024, when Toronto hosted New York. The league began with six teams: the Boston Fleet, Minnesota Frost, Montr&eacute;al Victoire, New York Sirens, Ottawa Charge and Toronto Sceptres. Vancouver (Vancouver Goldeneyes) and Seattle (Seattle Torrent) were added for 2025-26. In May 2026 the league announced four more teams for 2026-27: Detroit (Detroit Clutch), Hamilton (Hamilton Havoc), Las Vegas (Vegas Vanguards) and San Jose (San Jose Sea Lions), bringing the league to 12 teams.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            The Minnesota Frost won the first Walter Cup in 2024, defeating the Boston Fleet in a five-game final, and successfully defended the title in 2025. In 2026 the Montr&eacute;al Victoire became the first Canadian team to win the Walter Cup. The Walter Cup is awarded to the PWHL playoff champion.
          </p>
          <p>
            League history is cross-checked against published league and press reports. Where a fact could not be confirmed from an official PWHL source it is not stated here.
          </p>
        </div>
      </section>

      <section style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>HOW THE PWHL WORKS</h2>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9375rem', lineHeight: 1.75 }}>
          <p style={{ marginBottom: '1rem' }}>
            The 2026-27 regular season has 180 games from December 5, 2026 to April 18, 2027. Each of the {PWHL_FRANCHISE_COUNT} teams plays 30 games: 18 within its conference and 12 against the other conference. For the first time the league is split into two six-team conferences. Eastern: Boston Fleet, Hamilton Havoc, Montr&eacute;al Victoire, New York Sirens, Ottawa Charge, Toronto Sceptres. Western: Detroit Clutch, Minnesota Frost, San Jose Sea Lions, Seattle Torrent, Vancouver Goldeneyes, Vegas Vanguards.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            The Walter Cup Playoffs expand to eight teams in 2026-27: the top four in each conference. The first round is four best-of-three series, followed by best-of-five conference finals and a best-of-five Walter Cup Finals. The first-place team in each conference chooses its first-round opponent from the third- and fourth-place teams in its conference.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            Each PWHL team has 24 active roster spots. Teams hold training camps ahead of the season, and official preseason scrimmages were played in late November 2026.
          </p>
          <p>
            All 180 regular-season games are available to a global audience on the PWHL&apos;s YouTube channel and at thepwhl.com. In Canada, games are also carried by national media partners when scheduled.
          </p>
        </div>
      </section>

      {/* Trust footer — required by AdSense-Compliant Content Rules. */}
      <footer style={{ marginTop: '3rem', padding: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', lineHeight: 1.6 }}>
        <p style={{ marginBottom: '0.5rem' }}>
          <strong style={{ color: 'rgba(255,255,255,0.6)' }}>Editorial standards.</strong>{' '}
          By Arnel Larracas, Founder, RinkStop. Facts last checked against official PWHL sources on 2026-11-28.
        </p>
        <p style={{ marginBottom: '0.5rem' }}>
          <strong style={{ color: 'rgba(255,255,255,0.6)' }}>Data sources.</strong>{' '}
          2026-27 structure (12 teams, 180 games, conferences, playoff format, roster size): thepwhl.com 2026-27 schedule announcement (October 2, 2026) and league FAQ. League history and champions: published league and press reports. Team list below: RinkStop team records.
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
