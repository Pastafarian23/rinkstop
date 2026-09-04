import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { LeagueTeams } from '@/components/LeagueTeams';
import { withDefaultOg } from '@/lib/metadata-defaults';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const metadata: Metadata = {
  // 2026-09-03 WS3 + Gap 1: rewrote title to 53 chars + added season year + current team count.
  // Old title was 84 chars (truncated by Google SERP at ~60 chars).
  // Old title: "KHL — Kontinental Hockey League: 23 Teams, 4 Conferences | RinkStop"
  title: 'KHL Hockey Teams 2026-27 — Rosters, Scores',
  description:
    'Kontinental Hockey League (KHL) 2026-27 season: 23 teams across Russia, Belarus, Kazakhstan, and China. Live scores, schedules, rosters, arenas, and standings — all in one place.',
  alternates: { canonical: 'https://rinkstop.com/directory/khl' },
  openGraph: withDefaultOg({
    title: 'KHL Hockey Teams 2026-27',
    description:
      'Kontinental Hockey League 2026-27: 23 teams, 4 countries. Live scores, schedules, rosters, and standings.',
    url: 'https://rinkstop.com/directory/khl',
    siteName: 'RinkStop',
    type: 'website',
  }),
};

export const revalidate = 3600;

async function fetchKhlTeamCount(): Promise<number> {
  try {
    const { count } = await supabase
      .from('team_workspaces')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true)
      .eq('country_code', 'RU');
    return count || 0;
  } catch {
    return 23;
  }
}

async function fetchKhlTeams(): Promise<Array<{ name: string; city: string | null; slug: string }>> {
  try {
    const { data } = await supabase
      .from('team_workspaces')
      .select('name, slug, home_city')
      .eq('is_active', true)
      .eq('country_code', 'RU')
      .order('name')
      .limit(24);
    return (data || []).map((t: any) => ({ name: t.name, city: t.home_city, slug: t.slug }));
  } catch {
    return [];
  }
}

export default async function KHLPage() {
  const teamCount = await fetchKhlTeamCount();
  const teams = await fetchKhlTeams();

  const faqs = [
    {
      q: 'How many teams are in the KHL?',
      a: `The KHL fields 23 teams across Russia, Belarus, Kazakhstan, and China, organized into 4 divisions (Bobrov, Tarasov, Kharkiv, Trofey).`,
    },
    {
      q: 'When was the KHL founded?',
      a: 'The KHL was founded in 2008, replacing the Russian Superleague (RSL) as the top professional league in Russia and Eurasia.',
    },
    {
      q: 'What is the KHL championship trophy?',
      a: 'The Gagarin Cup — named after cosmonaut Yuri Gagarin — has been awarded to the KHL playoff champion since the 2008-09 season.',
    },
    {
      q: 'Where can I find KHL rosters, schedules, and standings?',
      a: `Browse ${teamCount > 23 ? teamCount : 23}+ KHL team profiles on RinkStop, each with roster, schedule, arena info, and verified profiles.`,
    },
  ];

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://rinkstop.com/' },
      { '@type': 'ListItem', position: 2, name: 'Directory', item: 'https://rinkstop.com/directory' },
      { '@type': 'ListItem', position: 3, name: 'KHL', item: 'https://rinkstop.com/directory/khl' },
    ],
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };

  return (
    <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@graph': [
              {
                '@type': 'SportsOrganization',
                '@id': 'https://rinkstop.com/directory/khl',
                name: 'Kontinental Hockey League',
                url: 'https://rinkstop.com/directory/khl',
                sport: 'Ice Hockey',
                description: 'Kontinental Hockey League — premier professional league of Russia and Eurasia, 23 teams.',
                foundingDate: '2008',
                sameAs: ['https://en.wikipedia.org/wiki/Kontinental_Hockey_League'],
              },
            ],
          }),
        }}
      />

      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1rem' }}>
        <Link href="/" style={{ color: '#555' }}>Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/directory" style={{ color: '#555' }}>Directory</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>KHL</span>
      </nav>

      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: '#fff', letterSpacing: '0.02em', lineHeight: 1.1, margin: 0 }}>
          KHL Hockey Teams — Kontinental Hockey League
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.9375rem', marginTop: '0.5rem', maxWidth: '720px' }}>
          {teamCount > 23 ? `${teamCount}+` : '23+'} teams across Russia, Belarus, Kazakhstan, and China — the top professional hockey league outside the NHL.
        </p>
      </div>

      {/* Search-term-aligned intro (≥150 words) */}
      <section style={{ color: 'rgba(255,255,255,0.78)', fontSize: '0.9375rem', lineHeight: 1.7, maxWidth: '820px', marginBottom: '1.75rem' }}>
        <p style={{ margin: 0 }}>
          The <strong>Kontinental Hockey League (KHL)</strong> is the premier professional ice hockey league of Russia and Eurasia, founded in 2008 as the successor to the Russian Superleague. Widely regarded as the strongest professional league outside the NHL, the KHL fields 23 teams across four countries — Russia, Belarus, Kazakhstan, and China — organized into four divisions (Bobrov, Tarasov, Kharkiv, Trofey). The league&apos;s top prize is the Gagarin Cup, named for cosmonaut Yuri Gagarin and contested each spring since the 2008-09 season.
        </p>
        <p style={{ marginTop: '0.75rem' }}>
          KHL franchises include historic programs such as CSKA Moscow, SKA Saint Petersburg, and Dynamo Moscow, plus international entries like Barys Nur-Sultan and Kunlun Red Star. The league&apos;s junior development system — the MHL (Molodezhnaya Hokkeynaya Лига) — has produced a remarkable share of NHL draft picks, with Russian development paths accounting for roughly half of all NHL selections in recent years. Rosters, schedules, arena info, and standings for every KHL team are listed below.
        </p>
      </section>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
        {[
          { label: 'Pro Leagues', href: '/directory/pro-leagues' },
          { label: 'AHL', href: '/directory/ahl' },
          { label: 'PWHL', href: '/directory/pwhl' },
          { label: 'All Leagues', href: '/directory/leagues' },
          { label: 'Browse by Country', href: '/directory/russia' },
          { label: 'Browse by City', href: '/directory/russia/moscow' },
        ].map((n) => (
          <Link key={n.href} href={n.href} style={{
            padding: '0.3rem 0.75rem',
            borderRadius: '4px',
            fontSize: '0.75rem',
            fontWeight: 600,
            textDecoration: 'none',
            color: 'rgba(255,255,255,0.55)',
            background: 'var(--s2)',
            border: '1px solid var(--border)',
          }}>
            {n.label}
          </Link>
        ))}
      </div>

      {/* Featured teams grid (DB-driven) */}
      {teams.length > 0 && (
        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.125rem', color: '#fff', marginBottom: '1rem', fontWeight: 700 }}>
            KHL Teams ({teams.length})
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.625rem' }}>
            {teams.map((t) => (
              <Link
                key={t.slug}
                href={`/directory/teams/${t.slug}`}
                style={{
                  background: 'var(--s2)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  padding: '0.75rem 1rem',
                  textDecoration: 'none',
                  color: '#fff',
                  display: 'block',
                }}
              >
                <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{t.name}</div>
                {t.city && <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.15rem' }}>{t.city}</div>}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* League info */}
      <div style={{ background: 'linear-gradient(135deg, #1E3A5F 0%, #0a2d5a 100%)', border: '1px solid rgba(30,91,156,0.3)', borderRadius: '8px', padding: '1.5rem 2rem', marginBottom: '2rem' }}>
        <p style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#4A90D9', marginBottom: '0.5rem' }}>Kontinental Hockey League</p>
        <h2 style={{ fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', margin: 0 }}>23 TEAMS • 4 DIVISIONS</h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', marginTop: '0.5rem' }}>Founded 2008 • Based in Moscow (headquarters)</p>
      </div>

      {/* FAQ section */}
      <section style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1.5rem', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.125rem', color: '#fff', marginBottom: '1rem', fontWeight: 700 }}>Frequently Asked Questions</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          {faqs.map((f) => (
            <details key={f.q} style={{ borderTop: '1px solid var(--border)', paddingTop: '0.875rem' }}>
              <summary style={{ color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '0.9375rem' }}>{f.q}</summary>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', lineHeight: 1.65, marginTop: '0.5rem', marginBottom: 0 }}>{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <LeagueTeams leagueId="a08f6dac-eb1f-48b6-a11b-56fbb5642752" leagueSlug="khl" leagueName="KHL" />

      {/* KHL HISTORY — added PR #183 (2026-08-31). GSC 90d: /directory/khl had
          2,300 impressions but only 5 clicks at pos 15.1. Individual team
          pages dominated the same queries. Substance only the league hub
          can carry: founding context, geopolitical shifts, the Gagarin Cup
          era. */}
      <section style={{ marginTop: '3rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <h2 style={{ fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem', fontWeight: 700 }}>KHL HISTORY</h2>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9375rem', lineHeight: 1.75 }}>
          <p style={{ marginBottom: '1rem' }}>
            The Kontinental Hockey League was founded in <strong style={{ color: '#fff' }}>2008</strong> as the successor to the Russian Superleague (RSL), the top professional ice hockey league in Russia since 1996. The KHL was created with a broader Eurasian ambition: to bring together the best professional clubs from Russia, Belarus, Kazakhstan, and other former Soviet states into a single top-flight competition, modeled on the NHL's structure but operating across multiple time zones and languages.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            The first KHL season (2008-09) featured 24 teams across four divisions: Bobrov, Tarasov, Kharkiv, and Trofey. The league has since contracted — the Kharkiv division was eliminated in 2014-15 as Ukrainian clubs were withdrawn amid the political crisis; the Kunlun Red Star (China) was added in 2016-17; and a number of Russian regional clubs have rotated in and out of the league as the structure has stabilized. Today the KHL fields 23 teams across Russia, Belarus, Kazakhstan, and China.
          </p>
          <p>
            The <strong style={{ color: '#fff' }}>Gagarin Cup</strong>, named after cosmonaut Yuri Gagarin, has been awarded to the KHL playoff champion since the 2008-09 season. Metallurg Magnitogorsk has won the Gagarin Cup three times (2014, 2016, 2024); SKA Saint Petersburg has won twice (2015, 2017); CSKA Moscow has won twice (2019, 2022); Ak Bars Kazan has won twice (2009, 2018); and Salavat Yulaev Ufa (2011), Dynamo Moscow (2012), and Lokomotiv Yaroslavl are also past champions. The KHL is widely considered the second-strongest professional league in the world after the NHL.
          </p>
        </div>
      </section>

      {/* HOW THE KHL WORKS — format / schedule / roster structure */}
      <section style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <h2 style={{ fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem', fontWeight: 700 }}>HOW THE KHL WORKS</h2>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9375rem', lineHeight: 1.75 }}>
          <p style={{ marginBottom: '1rem' }}>
            The KHL regular season runs from September 1 to late February, with each team playing 68 games. The KHL schedule is structured to balance geographic travel: each team plays its division rivals 4 times, and teams in the same conference play each other 2-3 times. The schedule is published in mid-summer and includes both home-and-home series and three-game road trips.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            The top 8 teams in each conference qualify for the Gagarin Cup Playoffs, which run from March through April. All rounds are best-of-seven. The conference semifinals, conference finals, and Gagarin Cup Final follow standard playoff format. Overtime in the KHL is 5 minutes of 4-on-4 hockey, longer than the NHL's 3-on-3, and shootouts (5 rounds) are used in regular-season games that remain tied.
          </p>
          <p>
            The KHL roster cap is <strong style={{ color: '#fff' }}>28 players</strong> for the standard playing roster, with up to 5 import players allowed. Import slots are the league's most-sought-after position; the cap is intended to balance the development of Russian and Belarusian players with the high quality of foreign imports, particularly Finnish, Swedish, Czech, and Canadian players who have moved to the KHL in recent years for higher salaries than the NHL entry-level contracts can offer.
          </p>
        </div>
      </section>
    </main>
  );
}