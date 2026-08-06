import type { Metadata } from 'next';
import PWHLClient from './PWHLClient';

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

export const metadata: Metadata = {
  title: 'PWHL — Professional Women\'s Hockey League',
  description:
    "Professional Women's Hockey League teams, players, schedules, and standings.",
  alternates: {
    canonical: 'https://rinkstop.com/directory/pwhl',
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "PWHL — Professional Women's Hockey League",
    description:
      "Professional Women's Hockey League teams, players, schedules, and standings.",
    url: 'https://rinkstop.com/directory/pwhl',
    siteName: 'RinkStop',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "PWHL — Professional Women's Hockey League",
    description:
      "Professional Women's Hockey League teams, players, schedules, and standings.",
  },
};

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
            description: "Professional Women's Hockey League — premier women's pro league in North America, 8 teams across USA and Canada.",
            foundingDate: '2023',
            sameAs: ['https://en.wikipedia.org/wiki/Professional_Women%27s_Hockey_League'],
          }],
        }) }}
      />

export default async function PWHLPage() {
  const { league, teams } = await fetchInitialData();
  return (
    <>
      <section style={{ background: 'rgba(13,17,23,0.6)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px', marginBottom: '24px', maxWidth: '1280px', margin: '1.5rem auto 3rem' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontWeight: 600, color: '#fff', fontSize: '18px', marginBottom: '12px' }}>About the PWHL</h2>
          <p style={{ color: 'rgba(255,255,255,0.72)', fontSize: '0.9375rem', lineHeight: 1.7, marginTop: '0.5rem', maxWidth: '1280px' }}>
            The Professional Women's Hockey League (PWHL) is the premier women's professional ice hockey league in North America. Founded in 2023 and entering its third season in 2025–26, the PWHL fields eight teams across the United States and Canada: Boston, Minnesota, Montréal, New York, Ottawa, Toronto, and two additional expansion markets in 2025-26. The league was capitalized with historic backing from the Walter family (the same ownership group behind the Boston Bruins' ownership lineage) and chartered by former Team USA captain Hilary Knight as a flagship franchise. The PWHL Stanley Cup-equivalent trophy is the Walter Cup, awarded annually to the playoff champion. The league's average salary — $80,000–$150,000 — is the highest in women's professional hockey history and supports athletes competing at international caliber through the IIHF Women's World Championship and Winter Olympics.
          </p>
        </div>
      </section>
      <PWHLClient league={league} teams={teams} />
    </>
  );

}
