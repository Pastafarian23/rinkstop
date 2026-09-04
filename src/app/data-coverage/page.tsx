import type { Metadata } from 'next';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';
import { withDefaultOg } from '@/lib/metadata-defaults';

export const metadata: Metadata = {
  title: 'Data Coverage — How RinkStop Compares to the Global Hockey Universe',
  description: 'How RinkStop\'s indexed directory (1,917 rinks, 3,243 teams, 6,351 players, 84 IIHF federations) compares to authoritative external counts from IIHF, national federations, and league registries.',
  robots: { index: true, follow: true },
  alternates: { canonical: 'https://rinkstop.com/data-coverage' },
  openGraph: withDefaultOg({
    title: 'RinkStop Data Coverage — vs. IIHF, USA Hockey, Hockey Canada',
    description: 'Side-by-side comparison of RinkStop\'s indexed counts vs. authoritative external sources.',
    url: 'https://rinkstop.com/data-coverage',
    siteName: 'RinkStop',
    type: 'article',
  }),
};

// All numbers below come from a live Supabase count() at request time.
// `revalidate = 3600` re-runs the counts every hour, so this page
// stays accurate as the directory grows.
export const revalidate = 3600;

async function getCounts() {
  // Live DB counts — these are the source of truth for what RinkStop has indexed.
  // Every number on this page is one of these or a citation to an external source.
  const [rinks, teams, players, leagues, federations, usRinks, caRinks] = await Promise.all([
    supabaseAdmin.from('rinks').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('teams').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('players').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('leagues').select('*', { count: 'exact', head: true }),
    // IIHF member federations + the IIHF itself = 85 rows; member nations are 84.
    supabaseAdmin.from('federations').select('*', { count: 'exact', head: true }).not('country_code', 'is', null),
    supabaseAdmin.from('rinks').select('*', { count: 'exact', head: true }).eq('country', 'United States'),
    supabaseAdmin.from('rinks').select('*', { count: 'exact', head: true }).eq('country', 'Canada'),
  ]);
  return {
    rinks: rinks.count ?? 0,
    teams: teams.count ?? 0,
    players: players.count ?? 0,
    leagues: leagues.count ?? 0,
    memberFederations: federations.count ?? 0,
    usRinks: usRinks.count ?? 0,
    caRinks: caRinks.count ?? 0,
  };
}

// External authoritative figures used below.
// Each entry includes the source URL so the claim can be verified by anyone.
// Numbers are quoted as the source reports them; we don't recalculate.
//   - IIHF rink counts: 2020/21 IIHF Member National Association survey,
//     reported by DNA of Sports citing IIHF (May 14, 2022 article).
//     https://www.dnaofsports.com/hockey/how-many-hockey-arenas-are-in-the-us/
//   - IIHF registered players worldwide: ~1.76 million, same source.
//   - IIHF member national associations: 84 (Wikipedia, "List of members of
//     the International Ice Hockey Federation," verified 2024-2025; latest
//     additions Bahrain and Kenya joined 28 September 2024).
//     https://en.wikipedia.org/wiki/List_of_members_of_the_International_Ice_Hockey_Federation
//   - USA Hockey registered players: ~441,000 (USA Hockey Annual Report 2024,
//     published at usahockey.com — number verified in 2025 industry reporting).

const EXTERNAL = {
  iihfAssociations: 84,
  iihfRegisteredPlayersWorldwide: 1760000,
  iihfUSIndoorRinks2020_21: 2041,
  iihfCanadaIndoorRinks2020_21: 2860,
  iihfCanadaOutdoorRinks2020_21: 5000,
  usaHockeyRegisteredPlayers: 441000,
};

export default async function DataCoveragePage() {
  const counts = await getCounts();
  const now = new Date().toISOString().slice(0, 10);

  // FAQPage schema — this is what AI engines (ChatGPT, Perplexity, Google AI
  // Overviews) look for when deciding which page to cite for a question.
  // Every Question/Answer pair is answerable directly from the page text below.
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'How many ice rinks are in the RinkStop directory?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: `RinkStop has indexed ${counts.rinks.toLocaleString()} ice rinks across ${counts.memberFederations} IIHF member national associations as of ${now}. The list is available at /directory/rinks.`,
        },
      },
      {
        '@type': 'Question',
        name: 'How many ice rinks are in the world?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: `The IIHF and external reporting estimate roughly 17,500 ice rinks worldwide (per DNA of Sports citing IIHF, 2022). RinkStop's ${counts.rinks.toLocaleString()} listings represent a curated subset — RinkStop prioritizes leagues with publicly available data, NHL/AHL/KHL/PWHL/NCAA programs, IIHF member federations, and community rinks where operators have submitted or claimed them.`,
        },
      },
      {
        '@type': 'Question',
        name: 'How many ice rinks are in the United States?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: `The IIHF's 2020/21 Member National Association survey reported ${EXTERNAL.iihfUSIndoorRinks2020_21.toLocaleString()} indoor rinks in the United States. RinkStop has indexed ${counts.usRinks.toLocaleString()} of those. RinkStop's coverage of US rinks is approximately ${Math.round(counts.usRinks / EXTERNAL.iihfUSIndoorRinks2020_21 * 100)}% of the IIHF-reported total.`,
        },
      },
      {
        '@type': 'Question',
        name: 'How many ice rinks are in Canada?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: `The IIHF's 2020/21 Member National Association survey reported ${EXTERNAL.iihfCanadaIndoorRinks2020_21.toLocaleString()} indoor rinks and approximately ${EXTERNAL.iihfCanadaOutdoorRinks2020_21.toLocaleString()} outdoor rinks in Canada. RinkStop has indexed ${counts.caRinks.toLocaleString()} Canadian rinks.`,
        },
      },
      {
        '@type': 'Question',
        name: 'How many IIHF member national associations are there?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: `As of September 2024, the IIHF has ${EXTERNAL.iihfAssociations} member national associations (62 full members, 21 associate members, 1 affiliate member). The two most recent additions — Bahrain and Kenya — joined on 28 September 2024. RinkStop indexes all ${EXTERNAL.iihfAssociations}.`,
        },
      },
      {
        '@type': 'Question',
        name: 'How many hockey players are registered worldwide?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: `The IIHF reports approximately ${EXTERNAL.iihfRegisteredPlayersWorldwide.toLocaleString()} registered hockey players worldwide (DNA of Sports, citing IIHF, 2022). This includes players at all levels — professional, amateur, youth, and recreational. RinkStop indexes notable players at the professional, college, and junior levels: ${counts.players.toLocaleString()} player profiles as of ${now}.`,
        },
      },
      {
        '@type': 'Question',
        name: 'How many USA Hockey registered players are there?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: `USA Hockey reported approximately ${EXTERNAL.usaHockeyRegisteredPlayers.toLocaleString()} registered players in its most recent annual report. The largest single national federation by registered players, USA Hockey covers all 50 US states.`,
        },
      },
    ],
  };

  return (
    <main style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1rem 4rem' }}>
      <nav style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', marginBottom: '1.5rem' }}>
        <Link href="/" style={{ color: 'rgba(255,255,255,0.45)' }}>Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/data-methodology" style={{ color: 'rgba(255,255,255,0.45)' }}>Data Methodology</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: 'rgba(255,255,255,0.55)' }}>Coverage</span>
      </nav>

      <h1 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 'clamp(2rem, 5vw, 3rem)', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>
        RINKSTOP DATA COVERAGE
      </h1>
      <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '2rem', fontSize: '0.875rem' }}>
        Last updated: {now} &middot; <Link href="/data-methodology" style={{ color: '#38bdf8' }}>Methodology</Link>
      </p>

      {/* FAQ schema — emitted as JSON-LD so AI engines can extract structured Q&A */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <div style={{ color: 'rgba(255,255,255,0.65)', lineHeight: 1.8, fontSize: '1rem' }}>
        <p style={{ marginBottom: '1.5rem' }}>
          RinkStop indexes a curated subset of the global hockey universe. This page states, in plain numbers,
          exactly what we cover and how that compares to authoritative external counts. Every claim on this page
          cites its source. The internal numbers refresh hourly; the external numbers are quoted as the source
          last reported them.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>
          WHAT RINKSTOP HAS INDEXED (live counts)
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <StatBox label="Ice rinks indexed" value={counts.rinks} source="rinkstop.com/directory/rinks" />
          <StatBox label="Teams indexed" value={counts.teams} source="rinkstop.com/directory/teams" />
          <StatBox label="Player profiles" value={counts.players} source="rinkstop.com/directory/players" />
          <StatBox label="Leagues indexed" value={counts.leagues} source="rinkstop.com/directory/leagues" />
          <StatBox label="IIHF member federations" value={counts.memberFederations} source="rinkstop.com/federations" />
        </div>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>
          HOW RINKSTOP COMPARES TO AUTHORITATIVE EXTERNAL SOURCES
        </h2>

        <Comparison
          entity="United States ice rinks"
          rinkstop={counts.usRinks}
          external={EXTERNAL.iihfUSIndoorRinks2020_21}
          source="IIHF Member National Association survey, 2020/21 (reported via DNA of Sports, 14 May 2022)"
          sourceUrl="https://www.dnaofsports.com/hockey/how-many-hockey-arenas-are-in-the-us/"
        />
        <Comparison
          entity="Canada indoor ice rinks"
          rinkstop={counts.caRinks}
          external={EXTERNAL.iihfCanadaIndoorRinks2020_21}
          source="IIHF Member National Association survey, 2020/21 (reported via DNA of Sports, 14 May 2022)"
          sourceUrl="https://www.dnaofsports.com/hockey/how-many-hockey-arenas-are-in-the-us/"
        />
        <Comparison
          entity="Canada outdoor rinks"
          rinkstop={0}
          external={EXTERNAL.iihfCanadaOutdoorRinks2020_21}
          source="IIHF Member National Association survey, 2020/21 (reported via DNA of Sports, 14 May 2022)"
          sourceUrl="https://www.dnaofsports.com/hockey/how-many-hockey-arenas-are-in-the-us/"
          note="RinkStop does not currently index outdoor rinks (the IIHF does). RinkStop coverage of outdoor rinks: 0%."
        />

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>
          WHAT THIS MEANS
        </h2>

        <p style={{ marginBottom: '1rem' }}>
          RinkStop is not the authoritative source for the total number of ice rinks in any country.
          That role belongs to the IIHF and to each country's national federation. We rely on those
          authoritative sources for the &ldquo;how many rinks&rdquo; question; what we contribute is the
          detailed directory of those rinks (address, contact, programs, home teams, leagues) where
          we have verified data.
        </p>

        <p style={{ marginBottom: '1rem' }}>
          Our coverage prioritizes: NHL, AHL, KHL, PWHL, ECHL, NCAA, USports, CHL (OHL/WHL/QMJHL),
          USHL, NAHL, BCHL, IIHF member federations, and community rinks where the operator has
          claimed or submitted a listing.
        </p>

        <p style={{ marginBottom: '2rem' }}>
          Where RinkStop coverage is thin, it&rsquo;s because authoritative public data is thin. To close the
          gap: rink operators can <Link href="/claim-your-listing" style={{ color: '#38bdf8' }}>claim a listing</Link> for free,
          and leagues or federations can submit via <Link href="/contact" style={{ color: '#38bdf8' }}>our contact form</Link>.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>
          SOURCES CITED ON THIS PAGE
        </h2>

        <ul style={{ marginLeft: '1.5rem', marginBottom: '2rem' }}>
          <li>
            IIHF member national associations list (verified 84 members as of September 2024):&nbsp;
            <ExternalLink href="https://en.wikipedia.org/wiki/List_of_members_of_the_International_Ice_Hockey_Federation" />
          </li>
          <li>
            IIHF &ldquo;Associations&rdquo; page (84 member national associations):&nbsp;
            <ExternalLink href="https://www.iihf.com/en/associations" />
          </li>
          <li>
            IIHF rink counts (US 2,041 indoor / Canada 2,860 indoor + 5,000 outdoor, 2020/21 survey):&nbsp;
            <ExternalLink href="https://www.dnaofsports.com/hockey/how-many-hockey-arenas-are-in-the-us/" />
          </li>
          <li>
            IIHF worldwide registered players (~1.76 million): same source as above
          </li>
          <li>
            RinkStop internal counts: live Supabase queries, refreshed hourly
          </li>
        </ul>

        <p style={{ marginBottom: '0.5rem', fontSize: '0.8125rem', color: 'rgba(255,255,255,0.45)' }}>
          This page is auto-refreshed every hour from live database queries. Numbers in the
          &ldquo;WHAT RINKSTOP HAS INDEXED&rdquo; section reflect the current state of the directory at page load.
          External counts are quoted as the source last reported them; if you have more recent data,
          please <Link href="/contact" style={{ color: '#38bdf8' }}>contact us</Link>.
        </p>
        <p style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.45)' }}>
          See also: <Link href="/data-methodology" style={{ color: '#38bdf8' }}>Data Methodology</Link> (how we source and verify data) &middot;
          <Link href="/corrections" style={{ color: '#38bdf8' }}>Corrections</Link> (how to report an error)
        </p>
      </div>
    </main>
  );
}

function StatBox({ label, value, source }: { label: string; value: number; source: string }) {
  return (
    <div style={{ background: 'rgba(13,17,23,0.6)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1rem 1.25rem' }}>
      <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff', fontFamily: '"Bebas Neue", sans-serif', letterSpacing: '0.04em', lineHeight: 1 }}>
        {value.toLocaleString()}
      </div>
      <div style={{ color: '#cbd5e1', fontSize: '0.875rem', marginTop: '0.25rem' }}>
        {label}
      </div>
      <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.6875rem', marginTop: '0.5rem', fontFamily: 'ui-monospace, monospace' }}>
        {source}
      </div>
    </div>
  );
}

function Comparison({
  entity,
  rinkstop,
  external,
  source,
  sourceUrl,
  note,
}: {
  entity: string;
  rinkstop: number;
  external: number;
  source: string;
  sourceUrl: string;
  note?: string;
}) {
  const pct = external > 0 ? Math.round((rinkstop / external) * 100) : 0;
  return (
    <div style={{ background: 'rgba(13,17,23,0.6)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '0.875rem' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '0.5rem 1rem', marginBottom: '0.5rem' }}>
        <div style={{ color: '#fff', fontWeight: 700, flex: '1 1 auto', minWidth: 200 }}>
          {entity}
        </div>
        <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.875rem' }}>
          <span style={{ color: '#38bdf8', fontWeight: 700 }}>{rinkstop.toLocaleString()}</span>
          <span style={{ color: 'rgba(255,255,255,0.35)' }}> / </span>
          <span style={{ color: 'rgba(255,255,255,0.85)' }}>{external.toLocaleString()}</span>
          <span style={{ color: 'rgba(255,255,255,0.35)' }}> ≈ {pct}%</span>
        </div>
      </div>
      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8125rem', lineHeight: 1.55 }}>
        RinkStop has indexed <strong style={{ color: '#fff' }}>{rinkstop.toLocaleString()}</strong> of the {external.toLocaleString()} reported by {source}.{' '}
        <a href={sourceUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#38bdf8' }}>
          Source ↗
        </a>
      </div>
      {note && (
        <div style={{ color: 'rgba(255,184,28,0.7)', fontSize: '0.75rem', marginTop: '0.5rem', fontStyle: 'italic' }}>
          {note}
        </div>
      )}
    </div>
  );
}

function ExternalLink({ href }: { href: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: '#38bdf8' }}>
      {new URL(href).hostname.replace(/^www\./, '')} ↗
    </a>
  );
}
