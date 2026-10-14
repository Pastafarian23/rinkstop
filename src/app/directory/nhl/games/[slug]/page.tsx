import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { getNhlGameById, getNhlGamesByDate, slugify, NhlMatch } from '@/lib/nhl-data';
import { findCanonicalTeam } from '@/lib/nhl-teams-canonical';
import ShareButton from '@/components/ShareButton';
import { buildGameShare } from '@/lib/share';
import { withDefaultOg } from '@/lib/metadata-defaults';

const BASE_URL = 'https://rinkstop.com';

// 2026-10-14 (Phase 1d): service-role client for the canonical
// lookup so the request doesn't read cookies and force the page
// dynamic.  No /api/* proxy needed — the query is small, read-only,
// and on the public fixtures table.
function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// fixtures.league_id is a UUID, not the slug "nhl".  Resolve once
// per process and cache.  If the league row isn't found we return
// null and the canonical lookup falls back to self-canonical.
let _nhlLeagueIdCache: string | null = null;
let _nhlLeagueIdResolved = false;
async function getNhlLeagueId(sb: ReturnType<typeof getSupabaseAdmin>): Promise<string | null> {
  if (_nhlLeagueIdResolved) return _nhlLeagueIdCache;
  _nhlLeagueIdResolved = true;
  try {
    const { data } = await sb.from('leagues').select('id').eq('slug', 'nhl').maybeSingle();
    _nhlLeagueIdCache = data?.id ?? null;
  } catch {
    _nhlLeagueIdCache = null;
  }
  return _nhlLeagueIdCache;
}

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  // slug format: YYYY-MM-DD-home-slug-vs-away-slug
  const parsed = parseGameSlug(slug);
  if (!parsed) return { title: 'Game Not Found' };
  // 2026-10-14 (Phase 6): title per the user's spec.
  //   Completed: "[Winner] [score], [Loser] [score] – [Date] | [League] Final Score"
  //   Upcoming:  "[Away] vs [Home] – [Date] | [League]"
  // We try to load the actual game so we can put the score in the
  // title. If we can't, fall back to a slug-based title.
  let title: string;
  let description: string;
  // 2026-10-14 (Phase 1d): if a Supabase fixtures row exists for
  // this game, point canonical to /directory/games/[id] (universal,
  // UUID-based) instead of the NHL-specific slug URL.  Set robots
  // to noindex,follow because the [id] page is the one we want
  // Google to index.  Falls back to self-canonical + indexable when
  // no fixture is found.
  let canonicalUrl = `${BASE_URL}/directory/nhl/games/${slug}`;
  let noindex = false;
  try {
    const games = await getNhlGamesByDate(parsed.date);
    const m = games.find(g => slugify(g.home_team_name) === parsed.homeSlug && slugify(g.away_team_name) === parsed.awaySlug);
    if (m && m.status.startsWith('Finished') && m.home_score !== null && m.away_score !== null) {
      const homeWin = m.home_score > m.away_score;
      const winner = homeWin ? m.home_team_name : m.away_team_name;
      const loser = homeWin ? m.away_team_name : m.home_team_name;
      const winScore = homeWin ? m.home_score : m.away_score;
      const loseScore = homeWin ? m.away_score : m.home_score;
      title = `${winner} ${winScore}, ${loser} ${loseScore} – ${parsed.date} | NHL Final Score`;
      description = `Final score: ${m.away_team_name} ${m.away_score}–${m.home_score} ${m.home_team_name}. ${winner} won.`;
    } else if (m) {
      title = `${m.away_team_name} vs ${m.home_team_name} – ${parsed.date} | NHL`;
      description = `${m.away_team_name} at ${m.home_team_name} on ${parsed.date}. NHL game preview, scheduled start time, and broadcast info on RinkStop.`;
    } else {
      title = `${parsed.awayName} vs ${parsed.homeName} – ${parsed.date} | NHL`;
      description = `${parsed.awayName} at ${parsed.homeName} on ${parsed.date}.`;
    }

    // 2026-10-14 (Phase 1d): try to find the matching Supabase
    // fixture so the [id] page can be the canonical target.  Match
    // by league + date + team names (best-effort string match —
    // "Detroit Red Wings" in NHL.com may be stored as "Detroit Red
    // Wings" in fixtures.home_team.name).  We filter on the
    // home_team join (ilike on name) rather than scraping a
    // name-to-id map at module load.
    if (m) {
      try {
        const sb = getSupabaseAdmin();
        // fixtures.league_id is a UUID (FK to leagues.id), not the
        // slug "nhl".  Look it up once and cache via module-level
        // memo to avoid a per-request league query.
        const leagueId = await getNhlLeagueId(sb);
        if (leagueId) {
          // PostgREST needs the !inner hint on the join to apply
          // the ilike filter to the joined table.  Without it,
          // ilike('home_team.name', ...) silently fanned out to
          // ALL fixtures in the league, returning 11 placeholder
          // rows for a single real game.  The first-word match is
          // good enough for the lookup — we then verify the
          // full names against the returned home/away team names
          // before declaring a match.
          const { data: candidates } = await sb
            .from('fixtures')
            .select('id, status, scheduled_at, home_team:teams!fixtures_home_team_id_fkey!inner(name), away_team:teams!fixtures_away_team_id_fkey!inner(name)')
            .eq('league_id', leagueId)
            .gte('scheduled_at', `${parsed.date}T00:00:00Z`)
            .lt('scheduled_at', `${parsed.date}T23:59:59Z`)
            .ilike('home_team.name', `%${parsed.homeName.split(' ')[0]}%`)
            .ilike('away_team.name', `%${parsed.awayName.split(' ')[0]}%`)
            .order('scheduled_at', { ascending: false })
            .limit(5);
          const fixture = (candidates || []).find((c: any) =>
            c.home_team?.name === parsed.homeName && c.away_team?.name === parsed.awayName
          ) || null;
          if (fixture && fixture.id) {
            canonicalUrl = `${BASE_URL}/directory/games/${fixture.id}`;
            // The [id] page is the one Google should index — the
            // NHL slug page is an alternate URL for direct traffic
            // and NHL-specific SEO targeting.  Tell crawlers to
            // follow the link but not index this duplicate.
            noindex = true;
          }
        }
      } catch {
        // Supabase query failed — leave canonical self-referential
        // and keep the page indexable as a standalone page.
      }
    }
  } catch {
    title = `${parsed.awayName} vs ${parsed.homeName} – ${parsed.date} | NHL`;
    description = `${parsed.awayName} at ${parsed.homeName} on ${parsed.date}.`;
  }
  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    robots: noindex
      ? { index: false, follow: true }
      : { index: true, follow: true },
    openGraph: withDefaultOg({
      title,
      description,
      type: 'website',
      url: canonicalUrl,
    }),
  };
}

interface ParsedSlug {
  date: string;
  homeName: string;
  awayName: string;
  homeSlug: string;
  awaySlug: string;
}

function parseGameSlug(slug: string): ParsedSlug | null {
  // Slug: 2026-06-10-carolina-hurricanes-vs-vegas-golden-knights
  const match = slug.match(/^(\d{4}-\d{2}-\d{2})-(.+)-vs-(.+)$/);
  if (!match) return null;
  const [, date, homeSlug, awaySlug] = match;
  const homeName = homeSlug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  const awayName = awaySlug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  return { date, homeName, awayName, homeSlug, awaySlug };
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function fmtDateLong(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

function statusInfo(s: string): { label: string; color: string; sub: string | null } {
  const map: Record<string, { label: string; color: string; sub: string | null }> = {
    'Finished': { label: 'FINAL', color: 'rgba(255,255,255,0.4)', sub: null },
    'Finished after over time': { label: 'FINAL/OT', color: 'rgba(255,255,255,0.4)', sub: 'Overtime' },
    'Finished after penalties': { label: 'FINAL/SO', color: 'rgba(255,255,255,0.4)', sub: 'Shootout' },
    'Scheduled': { label: 'SCHEDULED', color: 'rgba(0,212,255,0.8)', sub: null },
    'Not started': { label: 'SCHEDULED', color: 'rgba(0,212,255,0.8)', sub: null },
    'Cancelled': { label: 'CANCELLED', color: '#C8102E', sub: null },
    'Postponed': { label: 'POSTPONED', color: '#fbbf24', sub: null },
  };
  return map[s] || { label: s.toUpperCase(), color: 'rgba(255,255,255,0.4)', sub: null };
}

export default async function GamePage({ params }: Props) {
  const { slug } = await params;
  const parsed = parseGameSlug(slug);
  if (!parsed) notFound();

  // Find the actual game by date + both team names
  const games = await getNhlGamesByDate(parsed.date);
  const match = games.find(g =>
    slugify(g.home_team_name) === parsed.homeSlug &&
    slugify(g.away_team_name) === parsed.awaySlug
  );

  const homeCanonical = findCanonicalTeam(parsed.homeSlug);
  const awayCanonical = findCanonicalTeam(parsed.awaySlug);

  // If there are 2+ games for this matchup on the same day, allow it but log it
  if (games.filter(g => slugify(g.home_team_name) === parsed.homeSlug && slugify(g.away_team_name) === parsed.awaySlug).length > 1) {
    console.warn('[nhl-games] Multiple games found for slug', slug);
  }

  return (
    <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>
      {/* 2026-10-14 (Arnel feedback): BreadcrumbList schema for the
          Scores hub so Google can render the breadcrumb in search
          results. Path: Home > Scores > NHL > Game. The /directory/games
          page is the canonical Scores hub — /directory/nhl is the
          league hub. */}
      {match && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([
              {
                '@context': 'https://schema.org',
                '@type': 'BreadcrumbList',
                itemListElement: [
                  { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://rinkstop.com/' },
                  { '@type': 'ListItem', position: 2, name: 'Scores', item: 'https://rinkstop.com/directory/games' },
                  { '@type': 'ListItem', position: 3, name: 'NHL', item: 'https://rinkstop.com/directory/nhl' },
                  { '@type': 'ListItem', position: 4, name: `${match.away_team_name} at ${match.home_team_name}`, item: `https://rinkstop.com/directory/nhl/games/${slug}` },
                ],
              },
              {
                // 2026-10-14 (Phase 6): SportsEvent schema. Includes
                // name, startDate (with UTC offset per the user's
                // spec — .toISOString() emits the Z suffix), location
                // (when present), homeTeam, awayTeam, eventStatus, and
                // score for completed games.
                '@context': 'https://schema.org',
                '@type': 'SportsEvent',
                name: `${match.away_team_name} at ${match.home_team_name}`,
                startDate: match.date,
                url: `https://rinkstop.com/directory/nhl/games/${slug}`,
                eventStatus: match.status.startsWith('Finished')
                  ? 'https://schema.org/EventCompleted'
                  : (match.status === 'Scheduled' || match.status === 'Not started')
                    ? 'https://schema.org/EventScheduled'
                    : 'https://schema.org/EventPostponed',
                eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
                sport: 'Ice Hockey',
                homeTeam: { '@type': 'SportsTeam', name: match.home_team_name, url: `https://rinkstop.com/directory/nhl/teams/${parsed.homeSlug}` },
                awayTeam: { '@type': 'SportsTeam', name: match.away_team_name, url: `https://rinkstop.com/directory/nhl/teams/${parsed.awaySlug}` },
                ...(match.venue ? { location: { '@type': 'Place', name: match.venue } } : {}),
                ...(match.status.startsWith('Finished') && match.home_score !== null && match.away_score !== null ? {
                  description: `Final score: ${match.away_team_name} ${match.away_score}–${match.home_score} ${match.home_team_name}.`,
                } : {}),
              },
            ]),
          }}
        />
      )}
      <nav style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '1rem' }} aria-label="Breadcrumb">
        <Link href="/" style={{ color: 'rgba(255,255,255,0.5)' }}>Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/directory/games" style={{ color: 'rgba(255,255,255,0.5)' }}>Scores</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/directory/nhl" style={{ color: 'rgba(255,255,255,0.5)' }}>NHL</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: 'rgba(255,255,255,0.7)' }}>{parsed.awayName} at {parsed.homeName}</span>
      </nav>

      {!match ? (
        <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '10px', padding: '2rem', textAlign: 'center' }}>
          <h1 className="font-sport" style={{ fontSize: '1.5rem', color: '#fff', marginBottom: '0.5rem' }}>
            GAME NOT FOUND
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem' }}>
            No NHL game found for {parsed.awayName} at {parsed.homeName} on {fmtDateLong(parsed.date)}.
          </p>
          <Link href="/directory/nhl" style={{ color: 'rgba(0,212,255,0.8)', fontSize: '0.875rem', display: 'inline-block', marginTop: '1rem' }}>
            ← Back to NHL Hub
          </Link>
        </div>
      ) : (
        <>
          {/* Share — full popover (X, FB, LI, WhatsApp, Reddit, Email, Copy).
              Server-rendered with the parsed match data. Mobile uses native share sheet.
              2026-10-14: shrunk to a small inline button (was a centered
              hero CTA that pushed the scoreboard down). The team links
              below carry the visual weight now. */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.5rem' }}>
            <ShareButton
              payload={buildGameShare({
                homeName: match.home_team_name,
                awayName: match.away_team_name,
                date: (match as any).start_time ?? match.date,
                slug,
                league: 'NHL',
                final: match.status.startsWith('Finished') && match.home_score !== null && match.away_score !== null
                  ? `Final ${match.away_score}-${match.home_score}`
                  : null,
              })}
              variant="brand"
            />
          </div>

          {(() => {
            const si = statusInfo(match.status);
            const isFinished = match.status.startsWith('Finished');
            const isHomeWinner = isFinished && (match.home_score ?? 0) > (match.away_score ?? 0);
            const isAwayWinner = isFinished && (match.away_score ?? 0) > (match.home_score ?? 0);
            return (
              <>
                {/* Status banner */}
                <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                  <span style={{
                    display: 'inline-block',
                    padding: '0.4rem 1rem',
                    background: si.color + '22',
                    border: `1px solid ${si.color}`,
                    borderRadius: '4px',
                    color: si.color,
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                  }}>
                    {si.label}
                  </span>
                  {si.sub && (
                    <span style={{ marginLeft: '0.5rem', color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>
                      {si.sub}
                    </span>
                  )}
                </div>

                {/* Matchup */}
                <div style={{
                  background: 'var(--s2)',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  padding: '2rem 1.5rem',
                  marginBottom: '1.5rem',
                }}>
                  <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                    {fmtDateLong(match.date)} · {fmtTime(match.date)}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '0.75rem', alignItems: 'center' }}>
                    {/* Away team — 1fr column gets a min-width: 0 so the
                        name can wrap/truncate instead of pushing the
                        row off the right edge on mobile. */}
                    <Link href={`/directory/nhl/teams/${parsed.awaySlug}`} style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', minWidth: 0 }}>
                      {match.away_team_logo && (
                        <img src={match.away_team_logo} alt={match.away_team_name} style={{ width: 64, height: 64, objectFit: 'contain', marginBottom: '0.5rem' }} />
                      )}
                      <div style={{ color: isAwayWinner ? '#34d399' : '#fff', fontSize: '1rem', fontWeight: 700, overflowWrap: 'anywhere', lineHeight: 1.2 }}>{match.away_team_name}</div>
                      <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.6875rem', marginTop: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Away</div>
                    </Link>

                    {/* Score */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '4.5rem' }}>
                      {isFinished ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{
                            color: isAwayWinner ? '#34d399' : 'rgba(255,255,255,0.4)',
                            fontSize: 'clamp(2rem, 8vw, 3.25rem)',
                            fontWeight: 800,
                            lineHeight: 1,
                          }}>{match.away_score ?? 0}</div>
                          <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: '1.25rem' }}>–</div>
                          <div style={{
                            color: isHomeWinner ? '#34d399' : 'rgba(255,255,255,0.4)',
                            fontSize: 'clamp(2rem, 8vw, 3.25rem)',
                            fontWeight: 800,
                            lineHeight: 1,
                          }}>{match.home_score ?? 0}</div>
                        </div>
                      ) : (
                        <div style={{ color: 'rgba(0,212,255,0.7)', fontSize: '0.875rem', fontWeight: 600 }}>{fmtTime(match.date)} ET</div>
                      )}
                    </div>

                    {/* Home team — min-width: 0 lets "Philadelphia Flyers"
                        wrap or truncate on narrow screens instead of
                        pushing the score off-screen. */}
                    <Link href={`/directory/nhl/teams/${parsed.homeSlug}`} style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', minWidth: 0 }}>
                      {match.home_team_logo && (
                        <img src={match.home_team_logo} alt={match.home_team_name} style={{ width: 64, height: 64, objectFit: 'contain', marginBottom: '0.5rem' }} />
                      )}
                      <div style={{ color: isHomeWinner ? '#34d399' : '#fff', fontSize: '1rem', fontWeight: 700, overflowWrap: 'anywhere', lineHeight: 1.2 }}>{match.home_team_name}</div>
                      <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.6875rem', marginTop: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Home</div>
                    </Link>
                  </div>
                </div>


                {/* Game details */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
                  {[
                    { label: 'Date', value: fmtDateLong(match.date) },
                    { label: 'Time', value: fmtTime(match.date) },
                    { label: 'League', value: 'NHL' },
                    ...(match.venue ? [{ label: 'Venue', value: match.venue }] : []),
                    ...(match.period != null ? [{ label: 'Period', value: String(match.period) }] : []),
                    ...(match.clock ? [{ label: 'Clock', value: match.clock }] : []),
                  ].map(s => (
                    <div key={s.label} style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.75rem 1rem' }}>
                      <div style={{ fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)' }}>{s.label}</div>
                      <div style={{ fontSize: '0.875rem', color: '#fff', marginTop: '0.25rem' }}>{s.value}</div>
                    </div>
                  ))}
                </div>

                {/* Links to team pages — away first, then home, on a
                    single side-by-side row. League is rendered as a
                    separate row below so the team links stay clearly
                    grouped (Arnel 2026-10-14). */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <Link href={`/directory/nhl/teams/${parsed.awaySlug}`} style={{
                    textDecoration: 'none',
                    background: 'var(--s2)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '0.875rem 1rem',
                    textAlign: 'center',
                    color: 'inherit',
                  }}>
                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.625rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>Away</div>
                    <div style={{ color: '#fff', fontSize: '0.9375rem', fontWeight: 700, marginTop: '0.25rem', overflowWrap: 'anywhere' }}>{match.away_team_name} →</div>
                  </Link>
                  <Link href={`/directory/nhl/teams/${parsed.homeSlug}`} style={{
                    textDecoration: 'none',
                    background: 'var(--s2)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '0.875rem 1rem',
                    textAlign: 'center',
                    color: 'inherit',
                  }}>
                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.625rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>Home</div>
                    <div style={{ color: '#fff', fontSize: '0.9375rem', fontWeight: 700, marginTop: '0.25rem', overflowWrap: 'anywhere' }}>{match.home_team_name} →</div>
                  </Link>
                </div>

                {/* League link as its own row (Arnel 2026-10-14). */}
                <div style={{ marginTop: '0.75rem' }}>
                  <Link href="/directory/nhl" style={{
                    textDecoration: 'none',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '0.75rem 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    color: 'inherit',
                  }}>
                    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>League</span>
                    <span style={{ color: '#fff', fontSize: '0.875rem', fontWeight: 600 }}>NHL →</span>
                  </Link>
                </div>
              </>
            );
          })()}
        </>
      )}
    </main>
  );
}
