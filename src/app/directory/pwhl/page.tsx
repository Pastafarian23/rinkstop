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
