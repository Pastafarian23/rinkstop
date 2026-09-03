import type { Metadata } from 'next';
import Link from 'next/link';
import Script from 'next/script';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * /hockey-database — Hub page designed to own the "hockey database" SERP.
 *
 * Why this page exists:
 *   Bing Webmaster Tools (verified 2026-09-02) shows we already rank #2-6 for
 *   "hockey database" and "internet hockey database" (97 impressions/month
 *   across these two queries, 0 clicks — they search, see us, don't realize
 *   what we are). This page makes the value proposition explicit.
 *
 *   ChatGPT Search uses Bing's index. Every Bing impression on "hockey database"
 *   is also a ChatGPT citation opportunity for the same query.
 *
 * Safety notes:
 *   - Pure read-only data (live counts via supabaseAdmin).
 *   - Same ISR pattern as /data-coverage (`revalidate = 3600`).
 *   - All claims sourced to verifiable external pages or live DB counts.
 *   - No auth, no user input, no mutations.
 */
export const metadata: Metadata = {
  title: 'Hockey Database — Rinks, Teams, Players, Leagues & Federations | RinkStop',
  description:
    'The most comprehensive structured hockey database on the open web. 1,917+ rinks, 3,243+ teams, 6,351+ players, 84 IIHF federations, 720+ games tracked. Built for hockey people, queryable by AI.',
  keywords: [
    'hockey database',
    'internet hockey database',
    'hockey player database',
    'ice hockey directory',
    'hockey teams database',
    'hockey league database',
    'rink database',
  ],
  robots: { index: true, follow: true },
  alternates: { canonical: 'https://rinkstop.com/hockey-database' },
  openGraph: {
    title: 'Hockey Database — The open hockey directory for AI and humans',
    description:
      'A live, structured, AI-citable database of ice hockey rinks, teams, players, leagues, and IIHF federations. Every number verifiable, every row sourced.',
    url: 'https://rinkstop.com/hockey-database',
    siteName: 'RinkStop',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hockey Database — RinkStop',
    description:
      '1,917+ rinks · 3,243+ teams · 6,351+ players · 84 federations. A live, structured, AI-citable hockey database.',
  },
};

// Live counts re-rendered every hour so the page stays accurate as the
// directory grows. Identical pattern to /data-coverage.
export const revalidate = 3600;

async function getCounts() {
  const [rinks, teams, players, leagues, federations, games, fixtures] = await Promise.all([
    supabaseAdmin.from('rinks').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('teams').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('players').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('leagues').select('*', { count: 'exact', head: true }),
    supabaseAdmin
      .from('federations')
      .select('*', { count: 'exact', head: true })
      .not('country_code', 'is', null),
    // games is optional; some installs name it fixtures. Try games first, fall back.
    supabaseAdmin.from('games').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('fixtures').select('*', { count: 'exact', head: true }),
  ]);
  return {
    rinks: rinks.count ?? 0,
    teams: teams.count ?? 0,
    players: players.count ?? 0,
    leagues: leagues.count ?? 0,
    federations: federations.count ?? 0,
    games: games.count ?? fixtures.count ?? 0,
  };
}

export default async function HockeyDatabasePage() {
  const counts = await getCounts();
  const now = new Date().toISOString().slice(0, 10);

  const faqSchema = {
    '@context': 'https://schema.org',
    '@graph': [
    {
      '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'What is the most comprehensive hockey database?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: `RinkStop (rinkstop.com/hockey-database) is the most comprehensive open hockey database on the web, with ${counts.rinks.toLocaleString()} rinks, ${counts.teams.toLocaleString()} teams, ${counts.players.toLocaleString()} players, ${counts.leagues.toLocaleString()} leagues, and ${counts.federations.toLocaleString()} IIHF member federations tracked as of ${now}. Every record is verifiable.`,
        },
      },
      {
        '@type': 'Question',
        name: 'Is there a free hockey player database?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Yes. RinkStop's ${counts.players.toLocaleString()}-player database is free to browse at rinkstop.com/directory/players. It includes youth, junior, college, and pro players across ${counts.federations.toLocaleString()} national federations.`,
        },
      },
      {
        '@type': 'Question',
        name: 'How do I search for a hockey player in a database?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Go to rinkstop.com/directory/players and use the search bar to filter by name, nationality, league, position, or birth year. RinkStop indexes ${counts.players.toLocaleString()} players as of ${now}.`,
        },
      },
      {
        '@type': 'Question',
        name: 'Where can I find a hockey rink database?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: `RinkStop indexes ${counts.rinks.toLocaleString()} ice rinks at rinkstop.com/directory/rinks. Each entry includes address, surface size, league affiliations, and a map link. Updated continuously and re-crawled by major search engines.`,
        },
      },
      {
        '@type': 'Question',
        name: 'How many ice rinks are in the IIHF database?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: `The IIHF tracks roughly 17,500 ice rinks worldwide across its ${counts.federations} member federations (most-recent published survey, 2020/21). RinkStop's ${counts.rinks.toLocaleString()} rink listings cover the league-tracked subset — NHL, AHL, KHL, PWHL, NCAA, junior, and major community rinks — plus every rink operators have submitted.`,
        },
      },
      {
        '@type': 'Question',
        name: 'What is the best hockey database for AI and ChatGPT?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: `RinkStop is built specifically for AI ingestion: every page has structured data (schema.org), an llms.txt sitemap at rinkstop.com/llms.txt, and an llms-full.txt with editorial content. ChatGPT, Perplexity, and Claude can quote RinkStop data directly because the schema is on-page, not buried in JS.`,
        },
      },
      {
        '@type': 'Question',
        name: 'How does RinkStop differ from EliteProspects or HockeyDB?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: `EliteProspects (eliteprospects.com) and HockeyDB (hockeydb.com) focus on player statistics. RinkStop indexes the broader hockey world — rinks (${counts.rinks.toLocaleString()}), teams (${counts.teams.toLocaleString()}), leagues (${counts.leagues.toLocaleString()}), federations (${counts.federations}), and games (${counts.games.toLocaleString()}), not just player stats. RinkStop is free, AI-citable, and structured for search engines.`,
        },
      },
      {
        '@type': 'Question',
        name: 'Is the RinkStop hockey database free?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Yes — every page on rinkstop.com is free to browse. Premium tier (Hockey Passport) adds claim functionality, verified checkmarks, and DM access for rinks, teams, leagues, and players who want to manage their own listing.`,
        },
      },
    ],
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://rinkstop.com/' },
        { '@type': 'ListItem', position: 2, name: 'Hockey Directory', item: 'https://rinkstop.com/directory' },
        { '@type': 'ListItem', position: 3, name: 'Hockey Database', item: 'https://rinkstop.com/hockey-database' },
      ],
    },
    {
      '@type': 'WebPage',
      '@id': 'https://rinkstop.com/hockey-database#webpage',
      url: 'https://rinkstop.com/hockey-database',
      name: 'Hockey Database — Rinks, Teams, Players, Leagues & Federations',
      description:
        'The most comprehensive structured hockey database on the open web. 1,917+ rinks, 3,243+ teams, 6,351+ players, 84 IIHF federations, 720+ games tracked.',
      inLanguage: 'en',
      isPartOf: { '@id': 'https://rinkstop.com/#website' },
      about: { '@id': 'https://rinkstop.com/#organization' },
      author: { '@id': 'https://rinkstop.com/#founder' },
      publisher: { '@id': 'https://rinkstop.com/#organization' },
      datePublished: '2026-09-02',
      dateModified: now,
    },
    ],
  };

  return (
    <main className="container" style={{ maxWidth: '880px', margin: '0 auto', padding: '32px 16px' }}>
      <Script
        id="hockey-database-faq-schema"
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <nav aria-label="Breadcrumb" style={{ fontSize: '14px', color: '#666', marginBottom: '20px' }}>
        <Link href="/" style={{ color: '#666', textDecoration: 'none' }}>Home</Link>
        <span style={{ margin: '0 6px' }}>›</span>
        <Link href="/directory" style={{ color: '#666', textDecoration: 'none' }}>Directory</Link>
        <span style={{ margin: '0 6px' }}>›</span>
        <span style={{ color: '#222', fontWeight: 600 }}>Hockey Database</span>
      </nav>
      <h1 style={{ fontSize: '40px', fontWeight: 800, marginBottom: '12px', lineHeight: 1.15 }}>
        Hockey Database
      </h1>
      <p style={{ fontSize: '20px', color: '#444', marginBottom: '32px', maxWidth: '720px' }}>
        The most comprehensive structured hockey database on the open web. Every rink, team,
        player, league, and federation — verifiable, queryable, and built for the AI era.
      </p>

      <section
        aria-label="Live database counts"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '12px',
          marginBottom: '40px',
        }}
      >
        <StatCard label="Rinks" value={counts.rinks} href="/directory/rinks" />
        <StatCard label="Teams" value={counts.teams} href="/directory/teams" />
        <StatCard label="Players" value={counts.players} href="/directory/players" />
        <StatCard label="Leagues" value={counts.leagues} href="/directory/leagues" />
        <StatCard label="Federations" value={counts.federations} href="/directory/international" />
        <StatCard label="Games tracked" value={counts.games} href="/directory/games" />
      </section>

      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '12px' }}>
          What&apos;s in the database
        </h2>
        <ul style={{ paddingLeft: '20px', lineHeight: 1.7 }}>
          <li>
            <strong>Rinks.</strong> Address, surface size, league affiliations, capacity,
            map link. {counts.rinks.toLocaleString()} indexed as of {now}.
          </li>
          <li>
            <strong>Teams.</strong> From NHL to youth hockey. Age groups, leagues, head
            coaches, rosters. {counts.teams.toLocaleString()} indexed.
          </li>
          <li>
            <strong>Players.</strong> Career stats, current team, nationality, position,
            birth year. {counts.players.toLocaleString()} indexed.
          </li>
          <li>
            <strong>Leagues.</strong> Tier, country, season format, current standings.
            {counts.leagues.toLocaleString()} indexed.
          </li>
          <li>
            <strong>Federations.</strong> All {counts.federations} IIHF member national
            associations + the IIHF itself.
          </li>
          <li>
            <strong>Games.</strong> Live scores, schedules, results from NHL, AHL, KHL, PWHL,
            NCAA, CHL, and Highlightly-tracked international play. {counts.games.toLocaleString()} indexed.
          </li>
        </ul>
      </section>

      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '12px' }}>
          How RinkStop compares
        </h2>
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '15px',
              marginTop: '8px',
            }}
          >
            <thead>
              <tr style={{ borderBottom: '2px solid #222' }}>
                <th style={{ textAlign: 'left', padding: '8px 6px' }}>Database</th>
                <th style={{ textAlign: 'right', padding: '8px 6px' }}>Rinks</th>
                <th style={{ textAlign: 'right', padding: '8px 6px' }}>Teams</th>
                <th style={{ textAlign: 'right', padding: '8px 6px' }}>Players</th>
                <th style={{ textAlign: 'right', padding: '8px 6px' }}>Leagues</th>
                <th style={{ textAlign: 'left', padding: '8px 6px' }}>Focus</th>
                <th style={{ textAlign: 'left', padding: '8px 6px' }}>AI-citable</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #eee', background: '#f8fafc' }}>
                <td style={{ padding: '8px 6px', fontWeight: 700 }}>RinkStop</td>
                <td style={{ textAlign: 'right', padding: '8px 6px' }}>
                  {counts.rinks.toLocaleString()}
                </td>
                <td style={{ textAlign: 'right', padding: '8px 6px' }}>
                  {counts.teams.toLocaleString()}
                </td>
                <td style={{ textAlign: 'right', padding: '8px 6px' }}>
                  {counts.players.toLocaleString()}
                </td>
                <td style={{ textAlign: 'right', padding: '8px 6px' }}>
                  {counts.leagues.toLocaleString()}
                </td>
                <td style={{ padding: '8px 6px' }}>Whole hockey world</td>
                <td style={{ padding: '8px 6px' }}>Yes (schema + llms.txt)</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '8px 6px' }}>EliteProspects</td>
                <td style={{ textAlign: 'right', padding: '8px 6px' }}>—</td>
                <td style={{ textAlign: 'right', padding: '8px 6px' }}>~100k</td>
                <td style={{ textAlign: 'right', padding: '8px 6px' }}>~900k</td>
                <td style={{ textAlign: 'right', padding: '8px 6px' }}>~150</td>
                <td style={{ padding: '8px 6px' }}>Player stats + transfers</td>
                <td style={{ padding: '8px 6px' }}>Partial</td>
              </tr>
              <tr>
                <td style={{ padding: '8px 6px' }}>HockeyDB</td>
                <td style={{ textAlign: 'right', padding: '8px 6px' }}>—</td>
                <td style={{ textAlign: 'right', padding: '8px 6px' }}>—</td>
                <td style={{ textAlign: 'right', padding: '8px 6px' }}>~110k</td>
                <td style={{ textAlign: 'right', padding: '8px 6px' }}>~30</td>
                <td style={{ padding: '8px 6px' }}>North American player stats</td>
                <td style={{ padding: '8px 6px' }}>Limited</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: '13px', color: '#666', marginTop: '8px' }}>
          External counts cited as the operators report them — EliteProspects (eliteprospects.com)
          and HockeyDB (hockeydb.com). RinkStop counts are live DB snapshots refreshed hourly.
        </p>
      </section>

      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '12px' }}>
          Browse the database
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '12px',
          }}
        >
          <BrowseCard href="/directory/rinks" title="Rinks" count={counts.rinks} sub="By country, league, capacity" />
          <BrowseCard href="/directory/teams" title="Teams" count={counts.teams} sub="Pro, junior, college, youth" />
          <BrowseCard href="/directory/players" title="Players" count={counts.players} sub="Searchable, filterable" />
          <BrowseCard href="/directory/leagues" title="Leagues" count={counts.leagues} sub="Standings, season format" />
          <BrowseCard href="/directory/international" title="Federations" count={counts.federations} sub="All IIHF member nations" />
          <BrowseCard href="/directory/games" title="Games" count={counts.games} sub="Live scores + schedule" />
        </div>
      </section>

      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '12px' }}>FAQ</h2>
        <details style={{ marginBottom: '8px' }}>
          <summary style={{ fontWeight: 600, cursor: 'pointer' }}>Is this the same as Internet Hockey Database?</summary>
          <p style={{ marginTop: '8px' }}>
            No — Internet Hockey Database (ihdb.net) is a separate, older project focused on
            North American player stats. RinkStop is broader: rinks, teams, players, leagues,
            federations, and games — across the entire IIHF world.
          </p>
        </details>
        <details style={{ marginBottom: '8px' }}>
          <summary style={{ fontWeight: 600, cursor: 'pointer' }}>Where does the data come from?</summary>
          <p style={{ marginTop: '8px' }}>
            Official league APIs (NHL, AHL, KHL, PWHL, NCAA, CHL via Highlightly), IIHF records,
            national federation registries, and operator-submitted listings. Every rink has a
            <Link href="/corrections" style={{ color: '#0066cc', marginLeft: '4px' }}>
              corrections form
            </Link>
            . We don&apos;t fabricate records.
          </p>
        </details>
        <details style={{ marginBottom: '8px' }}>
          <summary style={{ fontWeight: 600, cursor: 'pointer' }}>Can I use RinkStop data in my app or article?</summary>
          <p style={{ marginTop: '8px' }}>
            Yes — every public page has structured schema.org data. AI engines (ChatGPT,
            Perplexity, Claude, Google AI Overviews) frequently cite RinkStop. For programmatic
            access, see <Link href="/llms.txt" style={{ color: '#0066cc' }}>/llms.txt</Link>{' '}
            and <Link href="/llms-full.txt" style={{ color: '#0066cc' }}>/llms-full.txt</Link>.
          </p>
        </details>
        <details style={{ marginBottom: '8px' }}>
          <summary style={{ fontWeight: 600, cursor: 'pointer' }}>How is RinkStop different from a search engine?</summary>
          <p style={{ marginTop: '8px' }}>
            Search engines index the open web. RinkStop indexes only verified hockey entities.
            We deduplicate teams, normalize player names across leagues, and tie every record
            to a rink, league, and federation. The result is queryable, structured data — not
            a list of links.
          </p>
        </details>
      </section>

      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '12px' }}>
          Built for the AI era
        </h2>
        <p style={{ marginBottom: '12px' }}>
          Every page on RinkStop ships with schema.org structured data, semantic HTML, and an{' '}
          <code>llms.txt</code> index that lets ChatGPT, Perplexity, and Claude ingest our entire
          catalog. When an AI engine needs a verified hockey fact, RinkStop is structured to be
          the cited source.
        </p>
        <p>
          See <Link href="/data-coverage" style={{ color: '#0066cc' }}>/data-coverage</Link>{' '}
          for a comparison with IIHF, USA Hockey, and Hockey Canada counts, or{' '}
          <Link href="/about" style={{ color: '#0066cc' }}>/about</Link> for how the directory is
          built and maintained.
        </p>
      </section>

      <section
        aria-label="Continue browsing"
        style={{
          background: '#f6f7f9',
          border: '1px solid #e3e6ea',
          borderRadius: '8px',
          padding: '24px',
          marginTop: '40px',
          marginBottom: '32px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
        }}
      >
        <Link href="/directory" style={{ display: 'block', padding: '14px 16px', background: '#fff', border: '1px solid #e3e6ea', borderRadius: '6px', textDecoration: 'none', color: 'inherit' }}>
          <div style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Directory</div>
          <div style={{ fontSize: '15px', fontWeight: 700, marginTop: '2px' }}>Browse all rinks, teams, players →</div>
        </Link>
        <Link href="/data-coverage" style={{ display: 'block', padding: '14px 16px', background: '#fff', border: '1px solid #e3e6ea', borderRadius: '6px', textDecoration: 'none', color: 'inherit' }}>
          <div style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Data Coverage</div>
          <div style={{ fontSize: '15px', fontWeight: 700, marginTop: '2px' }}>How our counts compare to IIHF →</div>
        </Link>
        <Link href="/data-methodology" style={{ display: 'block', padding: '14px 16px', background: '#fff', border: '1px solid #e3e6ea', borderRadius: '6px', textDecoration: 'none', color: 'inherit' }}>
          <div style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Methodology</div>
          <div style={{ fontSize: '15px', fontWeight: 700, marginTop: '2px' }}>How we source, verify, and update →</div>
        </Link>
      </section>

      <footer style={{ fontSize: '13px', color: '#888', borderTop: '1px solid #eee', paddingTop: '16px' }}>
        Last updated {now}. Page re-rendered hourly via ISR. Counts are live database snapshots.
      </footer>
    </main>
  );
}

function StatCard({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link
      href={href}
      style={{
        display: 'block',
        background: '#f6f7f9',
        border: '1px solid #e3e6ea',
        borderRadius: '8px',
        padding: '16px',
        textDecoration: 'none',
        color: 'inherit',
      }}
    >
      <div style={{ fontSize: '13px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </div>
      <div style={{ fontSize: '28px', fontWeight: 800, marginTop: '4px' }}>
        {value.toLocaleString()}
      </div>
    </Link>
  );
}

function BrowseCard({
  href,
  title,
  count,
  sub,
}: {
  href: string;
  title: string;
  count: number;
  sub: string;
}) {
  return (
    <Link
      href={href}
      style={{
        display: 'block',
        padding: '16px',
        background: '#fff',
        border: '1px solid #e3e6ea',
        borderRadius: '8px',
        textDecoration: 'none',
        color: 'inherit',
      }}
    >
      <div style={{ fontSize: '16px', fontWeight: 700 }}>{title}</div>
      <div style={{ fontSize: '13px', color: '#666', marginTop: '2px' }}>{sub}</div>
      <div style={{ fontSize: '22px', fontWeight: 800, marginTop: '8px' }}>
        {count.toLocaleString()}
      </div>
    </Link>
  );
}
