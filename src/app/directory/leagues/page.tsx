import type { Metadata } from 'next';
import Link from 'next/link';
import LeaguesIndexClient from './LeaguesIndexClient';

interface League {
  id: string;
  name: string;
  country?: string;
  level?: string;
  website_url?: string;
  claimed_by_tier?: string | null;
  claimed_by_user_id?: string | null;
  slug?: string;
}

export const metadata: Metadata = {
  title: '240 Hockey Leagues Worldwide — NHL, NCAA, IIHF, Junior, PWHL & More',
  description:
    'Browse 240+ hockey leagues across 57 countries — NHL, AHL, KHL, NCAA, CHL, IIHF, PWHL, OHL, WHL, QMJHL, USHL, ECHL, SHL, Liiga, DEL, NLA, Extraliga, and amateur tiers. Tier, country, level, and contact info for every league in one place.',
  alternates: { canonical: 'https://rinkstop.com/directory/leagues' },
  openGraph: {
    title: '240 Hockey Leagues Worldwide — NHL, NCAA, IIHF, Junior & More',
    description:
      'Browse 240+ hockey leagues across 57 countries — NHL, AHL, KHL, NCAA, CHL, IIHF, PWHL, and amateur tiers. Tier, country, level, and contact info for every league.',
    url: 'https://rinkstop.com/directory/leagues',
    siteName: 'RinkStop',
    type: 'website',
  },
};

// ISR-cached for 1 hour (2026-07-22 perf pass).
export const revalidate = 3600;
export const dynamicParams = true;

async function fetchInitialLeagues(): Promise<League[]> {
  try {
    const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://rinkstop.com';
    const res = await fetch(`${base}/api/leagues?sort=tier`, {
      cache: 'no-store',
    });
    const json = await res.json();
    return Array.isArray(json) ? json : (json?.data || []);
  } catch (err) {
    console.error('Leagues initial fetch failed:', err);
    return [];
  }
}

export default async function LeaguesPage() {
  const initialLeagues = await fetchInitialLeagues();
  const top = initialLeagues.slice(0, 20);

  // WS21 — GSC decay: 559 imp / 0.72% CTR / pos 24
  const faqs = [
    {
      q: 'How many hockey leagues are in the RinkStop directory?',
      a: 'RinkStop tracks 240+ active hockey leagues across professional, junior, college, international, and amateur tiers on six continents — including the NHL, AHL, KHL, PWHL, CHL (OHL/WHL/QMJHL), USHL, NCAA Division I and III, IIHF member federations, and regional amateur associations.',
    },
    {
      q: 'What are the top professional hockey leagues?',
      a: 'Top professional men\'s leagues: NHL (North America), KHL (Russia/Eurasia), SHL (Sweden), Liiga (Finland), DEL (Germany), NLA (Switzerland), Czech Extraliga, and the ECHL. Top professional women\'s leagues: PWHL (North America), SDHL (Sweden), and the EWHL (Europe).',
    },
    {
      q: 'What are the major junior hockey leagues?',
      a: 'Major junior: CHL (OHL — Ontario, WHL — Western Canada/US, QMJHL — Quebec), USHL (US), and the NAHL. These leagues develop NHL draft picks through the CHL Import Draft and the NHL Entry Draft.',
    },
    {
      q: 'How do I find a specific league?',
      a: 'Use the search and filters above the list. Browse by tier (Pro, Junior, College, International, Adult) or by country. Every league has a profile page with teams, tier, country, level, and contact info.',
    },
  ];

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://rinkstop.com/' },
      { '@type': 'ListItem', position: 2, name: 'Directory', item: 'https://rinkstop.com/directory' },
      { '@type': 'ListItem', position: 3, name: 'Hockey Leagues', item: 'https://rinkstop.com/directory/leagues' },
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

  const ldJson = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        name: 'Hockey Leagues Directory',
        description: 'Hockey leagues directory — RinkStop',
        url: 'https://rinkstop.com/directory/leagues',
        isPartOf: { '@type': 'WebSite', name: 'RinkStop', url: 'https://rinkstop.com' },
      },
      {
        '@type': 'ItemList',
        name: 'Hockey Leagues',
        numberOfItems: 240,
        itemListElement: top.map((l, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: l.name,
          url: `https://rinkstop.com/directory/leagues/${l.slug || l.id}`,
        })),
      },
    ],
  };

  // Featured leagues by tier (static curated list, sourced from the API)
  const featuredByTier = {
    Pro: ['NHL', 'AHL', 'KHL', 'PWHL', 'ECHL', 'SHL', 'Liiga', 'DEL', 'NLA', 'Extraliga'],
    Junior: ['OHL', 'WHL', 'QMJHL', 'USHL', 'NAHL'],
    College: ['NCAA Division I Men\'s Ice Hockey', 'NCAA Division III Men\'s Ice Hockey', 'U SPORTS'],
    International: ['IIHF', 'Olympic Hockey'],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ldJson) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>
        <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1rem' }}>
          <Link href="/" style={{ color: '#555' }}>Home</Link>
          <span style={{ margin: '0 0.4rem' }}>›</span>
          <Link href="/directory" style={{ color: '#555' }}>Directory</Link>
          <span style={{ margin: '0 0.4rem' }}>›</span>
          <span style={{ color: '#A0A0A0' }}>Leagues</span>
        </nav>

        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: '#fff', letterSpacing: '0.02em', lineHeight: 1.1, margin: 0 }}>
            Hockey Leagues Worldwide
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.9375rem', marginTop: '0.5rem', maxWidth: '720px' }}>
            240+ leagues across 57 countries — professional, junior, college, international, and amateur tiers.
          </p>
        </div>

        {/* Search-term-aligned intro (≥150 words) */}
        <section style={{ color: 'rgba(255,255,255,0.78)', fontSize: '0.9375rem', lineHeight: 1.7, maxWidth: '820px', marginBottom: '1.75rem' }}>
          <p style={{ margin: 0 }}>
            RinkStop tracks <strong>240+ active hockey leagues</strong> across six continents — the most complete directory of organized ice hockey anywhere on the web. Browse professional leagues like the NHL, AHL, KHL, SHL, Liiga, DEL, and PWHL; major junior circuits including the OHL, WHL, QMJHL, and USHL; college hockey at the NCAA Division I and III levels plus U SPORTS in Canada; IIHF-sanctioned international tournaments; and amateur, women&apos;s, and youth leagues at every level.
          </p>
          <p style={{ marginTop: '0.75rem' }}>
            Each league profile lists the current teams, tier, country, level, and the league&apos;s own website. Use the search and tier filters below to find a specific league, or browse the full directory by country, level, or season. League profiles are updated weekly during the active season and monthly in the off-season.
          </p>
        </section>

        {/* Tier cross-links */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
          {[
            { label: 'Pro', href: '/directory/pro-leagues' },
            { label: 'Junior', href: '/directory/junior' },
            { label: 'College', href: '/directory/college' },
            { label: 'International', href: '/directory/international' },
            { label: 'NHL', href: '/directory/nhl' },
            { label: 'AHL', href: '/directory/ahl' },
            { label: 'KHL', href: '/directory/khl' },
            { label: 'PWHL', href: '/directory/pwhl' },
            { label: 'NCAA', href: '/directory/ncaa' },
            { label: 'All Teams', href: '/directory/teams' },
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

        {/* Featured leagues by tier */}
        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.125rem', color: '#fff', marginBottom: '1rem', fontWeight: 700 }}>
            Featured leagues by tier
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
            {Object.entries(featuredByTier).map(([tier, leagues]) => (
              <div key={tier} style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1rem 1.25rem' }}>
                <p style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.4)', marginBottom: '0.5rem' }}>{tier}</p>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  {leagues.map((name) => (
                    <li key={name} style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.8)' }}>
                      {name}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

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

        <LeaguesIndexClient initialLeagues={initialLeagues} />
      </main>
    </>
  );
}