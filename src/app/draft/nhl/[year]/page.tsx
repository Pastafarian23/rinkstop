// src/app/draft/[year]/page.tsx  --  NHL Draft picks archive per year
//
// Server-component archive page for one NHL Entry Draft year. Renders all
// picks grouped by round, with client-side search/filter/sort via the
// embedded PicksBrowser client component. SEO-friendly static page.
//
// URL pattern: /draft/nhl/[year], e.g. /draft/nhl/2026
//   - /draft/nhl/2026 (supported, see PICKS_YEARS)
//   - /draft/nhl/2025, /draft/nhl/2024, etc. → renders a "coming soon" placeholder
//     with the SEO-friendly hero + cross-links to existing content
//
// Data shape is currently hard-coded from xlsx uploaded via Telegram. To
// support prior years, append const Pick[] arrays in `picks-<year>.ts` and
// register them in PICKS_YEARS below.

import type { Metadata } from 'next';
import Link from 'next/link';
import { PICKS_2026, DRAFT_2026_STATS, type Pick } from '../../picks-2026';
import { PICKS_2025, DRAFT_2025_STATS } from '../../picks-2025';
import type { PickStats } from '../../types';
import PicksBrowser from './PicksBrowser';
import YearDropdown from './YearDropdown';
import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase';
import { withDefaultOg } from '@/lib/metadata-defaults';

interface YearArchive {
  year: number;
  eventLabel: string;     // e.g., "KeyBank Center, Buffalo, NY · June 26–27, 2026"
  picks: Pick[];
  stats: PickStats;
  status: 'live' | 'coming-soon';
  rankingsUrl?: string;   // linked sister article, if any
}

const PICKS_YEARS: Record<number, YearArchive> = {
  2026: {
    year: 2026,
    eventLabel: 'KeyBank Center, Buffalo, NY · June 26–27, 2026',
    picks: PICKS_2026,
    stats: DRAFT_2026_STATS,
    status: 'live',
    rankingsUrl: '/news/2026-nhl-draft-complete-results',
  },
  2025: {
    year: 2025,
    eventLabel: 'Peacock Theater, Los Angeles, CA · June 27–28, 2025',
    picks: PICKS_2025,
    stats: DRAFT_2025_STATS,
    status: 'live',
  },
};

// Single live NHL year — the "go back to live" link points here.
const LIVE_NHL_YEAR = 2026;

// URL base for the NHL namespace. Articles and the index page link here.
// Other leagues (OHL/WHL/QMJHL/USHL) will get sibling routes under
// /draft/<league>/[year] and a parallel base URL.
const DRAFT_NHL_BASE = '/draft/nhl';

// All years that have a "coming soon" placeholder page (no full pick data yet).
// 2025 is now "live" so it's not in this list (it's in PICKS_YEARS above).
const PRIOR_YEARS = [2024, 2023, 2022, 2021, 2020, 2019];

// Years the user can jump to: every "live" year (full data) + every "coming soon"
// year. Newest first.
const ALL_YEARS = [
  ...Object.keys(PICKS_YEARS).map(Number).filter((y) => y !== LIVE_NHL_YEAR),
  LIVE_NHL_YEAR,
  ...PRIOR_YEARS,
].sort((a, b) => b - a);

export async function generateStaticParams() {
  return [...Object.keys(PICKS_YEARS).map((y) => ({ year: y })), ...PRIOR_YEARS.map((y) => ({ year: String(y) }))];
}

// Resolve POST_ROUTE_BASE for analytics naming
const POST_ROUTE_BASE = '/draft';

async function getCrossLinkArticles() {
  try {
    const db = supabaseAdmin ?? null;
    if (!db) return [] as { slug: string; title: string; published_at?: string | null }[];
    const { data } = await db
      .from('posts')
      .select('slug, title, published_at')
      .eq('status', 'published')
      .like('slug', '%draft%')
      .order('published_at', { ascending: false })
      .limit(4);
    return (data || []) as { slug: string; title: string; published_at?: string | null }[];
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: { params: Promise<{ year: string }> }): Promise<Metadata> {
  const { year: yearStr } = await params;
  const year = parseInt(yearStr, 10);
  if (!Number.isFinite(year) || year < 1900 || year > 2100) {
    return { title: 'Draft Picks' };
  }
  const archive = PICKS_YEARS[year];
  if (archive && archive.status === 'live') {
    const { totalPicks, realPicks, forfeits, rounds } = archive.stats;
    const title = `${year} NHL Draft Picks — Every Selection, Every Round`;
    const description =
      `Every pick from the ${year} NHL Entry Draft — ${realPicks} selections across ${rounds} rounds` +
      (forfeits > 0 ? `, plus ${forfeits} forfeit${forfeits === 1 ? '' : 's'}.` : '.') +
      ` Filter by team, round, league, or nationality.`;
    return {
      title,
      description,
      alternates: { canonical: `https://rinkstop.com${DRAFT_NHL_BASE}/${year}` },
      robots: { index: true, follow: true },
      openGraph: withDefaultOg({
        title,
        description,
        url: `https://rinkstop.com${DRAFT_NHL_BASE}/${year}`,
        siteName: 'RinkStop',
        type: 'article',
      }),
      twitter: {
        card: 'summary_large_image',
        title,
        description,
      },
    };
  }
  return {
    title: `${year} NHL Draft Picks Archive — Coming Soon`,
    description: `We're building out the archive for the ${year} NHL Draft. Subscribe to RinkStop for updates.`,
    alternates: { canonical: `https://rinkstop.com${DRAFT_NHL_BASE}/${year}` },
    robots: { index: true, follow: true },
  };
}

export default async function DraftArchivePage({ params }: { params: Promise<{ year: string }> }) {
  const { year: yearStr } = await params;
  const year = parseInt(yearStr, 10);
  if (!Number.isFinite(year) || year < 1900 || year > 2100) notFound();
  const archive = PICKS_YEARS[year];
  const crossArticles = await getCrossLinkArticles();

  if (!archive) {
    // Prior year placeholder — full SEO-friendly stub with nav-back to live data.
    return <PriorYearStub year={year} crossArticles={crossArticles} />;
  }
  if (archive.status === 'coming-soon') {
    return <PriorYearStub year={year} crossArticles={crossArticles} />;
  }

  // Live archive — full PicksBrowser
  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1rem 4rem' }}>
      {/* Breadcrumb */}
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1rem' }}>
        <Link href="/" style={{ color: '#555' }}>Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href={`${DRAFT_NHL_BASE}/2026`} style={{ color: '#555' }}>Draft</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>{year}</span>
      </nav>

      {/* Header */}
      <header style={{ marginBottom: '2rem' }}>
        <div className="label" style={{ color: 'rgba(255,255,255,0.5)' }}>NHL Entry Draft Archive</div>
        <h1 className="font-sport" style={{ fontSize: 'clamp(2.25rem, 6vw, 3.5rem)', color: '#fff', letterSpacing: '0.02em', lineHeight: 1, marginTop: '0.5rem' }}>
          {year} NHL DRAFT PICKS
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.7)', marginTop: '0.75rem', fontSize: '1.05rem' }}>
          {archive.eventLabel}
        </p>
        <div style={{
          display: 'flex', gap: '1.5rem', flexWrap: 'wrap',
          marginTop: '1.25rem', padding: '1rem 1.25rem',
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '8px',
        }}>
          <Stat label="Total picks" value={archive.stats.totalPicks} />
          <Stat label="Real picks" value={archive.stats.realPicks} />
          <Stat label="Rounds" value={archive.stats.rounds} />
          <Stat label="Teams" value={archive.stats.uniqueTeams} />
          <Stat label="Nationalities" value={archive.stats.nationalities} />
          <Stat label="Leagues" value={archive.stats.leagues} />
          <Stat label="Forfeits" value={archive.stats.forfeits} accent />
        </div>
      </header>

      {/* Year switcher */}
      <YearDropdown
        basePath={DRAFT_NHL_BASE}
        currentYear={year}
        liveYears={Object.keys(PICKS_YEARS).map(Number)}
        years={ALL_YEARS}
      />

      {/* Picks browser with filter/sort/search */}
      <PicksBrowser picks={archive.picks} year={year} />

      {/* Cross-link to analysis article */}
      {archive.rankingsUrl && (
        <section style={{
          marginTop: '2.5rem', padding: '1.5rem',
          background: 'rgba(200,16,46,0.08)', border: '1px solid rgba(200,16,46,0.25)',
          borderRadius: '12px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem',
        }}>
          <div>
            <div style={{ color: '#C8102E', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.35rem' }}>
              Read the analysis
            </div>
            <div style={{ color: '#fff', fontSize: '1.05rem', fontWeight: 600 }}>
              2026 NHL Draft: Round 1 Storylines, Top Picks, and Where They'll Play Next
            </div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
              Round 1 storylines, biggest trades, and the prospects to watch next season.
            </div>
          </div>
          <Link href={archive.rankingsUrl} style={{
            padding: '0.65rem 1.5rem',
            background: '#C8102E', color: '#fff',
            borderRadius: '6px', textDecoration: 'none', fontWeight: 700,
            whiteSpace: 'nowrap',
          }}>
            Read article →
          </Link>
        </section>
      )}

      {/* RinkStop integration CTA */}
      <section style={{
        marginTop: '2.5rem', padding: '1.5rem',
        background: 'rgba(255,184,28,0.05)', border: '1px solid rgba(255,184,28,0.25)',
        borderRadius: '12px',
        fontSize: '0.95rem', color: 'rgba(255,255,255,0.85)', lineHeight: 1.6,
      }}>
        <div style={{ color: '#FFB81C', fontWeight: 700, marginBottom: '0.5rem', fontSize: '1rem' }}>
          Find the rink where these prospects trained
        </div>
        Every player on this list developed at an arena. OHL rinks in Brantford, Windsor,
        London, and Saginaw. WHL rinks in Prince Albert, Medicine Hat, and Kamloops. USHL
        rinks in Youngstown, Cedar Rapids, and beyond. NCAA arenas at Penn State, Boston
        University, North Dakota, Miami, and Michigan. RinkStop tracks them all —
        <Link href="/directory/rinks" style={{ color: '#FFB81C', fontWeight: 600 }}> search the directory</Link>{' '}
        to find where your team's new prospect plays next season.
      </section>
    </div>
  );
}

// === Sub-components ===

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
      minWidth: '90px',
    }}>
      <div style={{
        fontFamily: '"Bebas Neue", "Arial Narrow", sans-serif',
        fontSize: '1.75rem', lineHeight: 1,
        color: accent ? '#C8102E' : '#FFB81C',
      }}>
        {value}
      </div>
      <div style={{
        fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)',
        textTransform: 'uppercase', letterSpacing: '1px', marginTop: '4px',
      }}>
        {label}
      </div>
    </div>
  );
}

function PriorYearStub({
  year,
  crossArticles,
}: {
  year: number;
  crossArticles: { slug: string; title: string; published_at?: string | null }[];
}) {
  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1rem 4rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1rem' }}>
        <Link href="/" style={{ color: '#555' }}>Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href={`${DRAFT_NHL_BASE}/2026`} style={{ color: '#555' }}>Draft</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>{year}</span>
      </nav>

      <header style={{ marginBottom: '2rem' }}>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
          NHL Entry Draft Archive
        </div>
        <h1 style={{ fontSize: 'clamp(2.25rem, 6vw, 3.5rem)', color: '#fff', letterSpacing: '0.02em', lineHeight: 1, marginTop: '0.5rem', fontFamily: '"Bebas Neue", "Arial Narrow", sans-serif' }}>
          {year} NHL DRAFT PICKS
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.7)', marginTop: '0.75rem', fontSize: '1.05rem' }}>
          We're building out the archive for the {year} NHL Entry Draft. Subscribe or
          check back as we add data per round.
        </p>
      </header>

      <YearDropdown
        basePath={DRAFT_NHL_BASE}
        currentYear={year}
        liveYears={Object.keys(PICKS_YEARS).map(Number)}
        years={ALL_YEARS}
      />

      <section style={{
        marginTop: '1.5rem', padding: '2rem 1.5rem',
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '12px', textAlign: 'center',
      }}>
        <h2 style={{ color: '#FFB81C', fontFamily: '"Bebas Neue", "Arial Narrow", sans-serif', fontSize: '2rem', letterSpacing: '0.02em', margin: 0 }}>
          Archive coming soon
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.7)', marginTop: '0.5rem', maxWidth: '520px', marginLeft: 'auto', marginRight: 'auto' }}>
          We currently index one NHL draft at a time. The {year} archive is on the build list —
          in the meantime, the {year === LIVE_NHL_YEAR ? 'data is below.' : 'most recent live archive is'} {' '}
          <Link href={`${DRAFT_NHL_BASE}/2026`} style={{ color: '#FFB81C', fontWeight: 600 }}>/draft/nhl/2026</Link>.
        </p>
        {crossArticles.length > 0 && (
          <div style={{ marginTop: '1.5rem', textAlign: 'left', maxWidth: '520px', margin: '1.5rem auto 0' }}>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem' }}>
              Draft coverage on RinkStop:
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {crossArticles.map((a) => (
                <li key={a.slug} style={{ padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <Link href={`/news/${a.slug}`} style={{ color: '#fff', textDecoration: 'none', fontWeight: 600 }}>
                    {a.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}