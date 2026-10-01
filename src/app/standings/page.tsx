import type { Metadata } from 'next';
import Link from 'next/link';
import { getLatestSeason, getStandingsForSeason } from '@/lib/nhl-data';
import { ALL_CONFERENCES, NHL_TEAMS_CANONICAL, teamsByConference } from '@/lib/nhl-teams-canonical';
import NhlStandingsTable from '@/components/NhlStandingsTable';
import GenericStandingsTable from '@/components/GenericStandingsTable';
import StandingsFilterBar from '@/components/StandingsFilterBar';
import { fetchStandings, fetchStandingsFacets, groupByLeagueName, levelLabel, getLeagueLevel } from '@/lib/standings';
import { createClient } from '@supabase/supabase-js';

// Module-level singleton — created once per cold start, reused across requests.
let _sb: ReturnType<typeof createClient> | null = null;
function getSb() {
  if (!_sb) _sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  return _sb;
}

export const revalidate = 900; // 15 min (freshness badge updates on re-render)

async function getNhlDataFreshness(): Promise<{ lastSynced: string | null; source: string }> {
  try {
    const { data } = await getSb()
      .from('highlightly_standings')
      .select('last_synced, league_name')
      .order('last_synced', { ascending: false })
      .limit(20) as { data: { last_synced: string | null; league_name: string }[] | null };
    if (!data || data.length === 0) return { lastSynced: null, source: 'No data' };
    // Pick the most recent row, and report which source(s) it's from
    const last = data[0].last_synced ?? null;
    const sources = new Set<string>();
    sources.add('NHL.com Stats API'); // NHL always uses NHL.com
    for (const r of data) {
      if (r.league_name === 'NHL') continue;
      sources.add('Wikipedia');
    }
    return { lastSynced: last, source: Array.from(sources).join(' + ') };
  } catch {
    return { lastSynced: null, source: 'Highlightly API' };
  }
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 2) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export const metadata: Metadata = {
  title: 'Standings',
  description: 'Current standings for NHL, AHL, PWHL, and other hockey leagues worldwide. Conference and division breakdowns for every league.',
};

interface LeagueCard {
  slug: string;
  name: string;
  fullName: string;
  count: number;
  href: string;
  available: boolean;
  accent: string;
  desc: string;
}

const LEAGUE_CARDS: LeagueCard[] = [
  {
    slug: 'nhl',
    name: 'NHL',
    fullName: 'National Hockey League',
    count: 32,
    href: '/standings/nhl',
    available: true,
    accent: '#C8102E',
    desc: '32 teams across 4 divisions and 2 conferences',
  },
  {
    slug: 'ahl',
    name: 'AHL',
    fullName: 'American Hockey League',
    count: 32,
    href: '/standings/ahl',
    available: false,
    accent: '#041E42',
    desc: 'NHL\'s primary development league',
  },
  {
    slug: 'pwhl',
    name: 'PWHL',
    fullName: 'Professional Women\'s Hockey League',
    count: 6,
    href: '/standings/pwhl',
    available: false,
    accent: '#7C3AED',
    desc: 'Six teams across North America',
  },
  {
    slug: 'khl',
    name: 'KHL',
    fullName: 'Kontinental Hockey League',
    count: 22,
    href: '/standings/khl',
    available: false,
    accent: '#D97706',
    desc: 'Russia-based international league',
  },
  {
    slug: 'shl',
    name: 'SHL',
    fullName: 'Swedish Hockey League',
    count: 14,
    href: '/standings/shl',
    available: false,
    accent: '#FFB81C',
    desc: 'Top-tier Swedish league',
  },
  {
    slug: 'liiga',
    name: 'Liiga',
    fullName: 'Liiga (Finland)',
    count: 16,
    href: '/standings/liiga',
    available: false,
    accent: '#2563EB',
    desc: 'Top-tier Finnish league',
  },
  {
    slug: 'del',
    name: 'DEL',
    fullName: 'Deutsche Eishockey Liga',
    count: 14,
    href: '/standings/del',
    available: false,
    accent: '#059669',
    desc: 'Top-tier German league',
  },
  {
    slug: 'ncaa',
    name: 'NCAA',
    fullName: 'NCAA Hockey',
    count: 60,
    href: '/standings/ncaa',
    available: false,
    accent: '#7C3AED',
    desc: 'US college hockey (Div. I Men)',
  },
];

interface PageProps {
  searchParams: Promise<{
    league?: string;
    season?: string;
    level?: string;
  }>;
}

export default async function StandingsIndexPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const filterLeague = sp.league ?? null;
  const filterSeason = sp.season ?? null;
  const filterLevel = sp.level ?? null;

  const latestSeason = await getLatestSeason();
  const latestStandings = latestSeason ? await getStandingsForSeason(latestSeason) : [];
  const freshness = await getNhlDataFreshness();

  // 2026-10-01 (Arnel feedback): filter bar at the TOP, not the bottom.
  // Filter from URL params and render matching rows inline below.
  const facets = await fetchStandingsFacets();
  const filteredRows = await fetchStandings({
    league: filterLeague,
    season: filterSeason,
    level: filterLevel,
  });
  const grouped = groupByLeagueName(filteredRows);

  // Leagues that are listed in LEAGUE_CARDS but have no standings data
  // yet. Show as "Coming soon" cards so they know what's planned.
  const comingSoon = LEAGUE_CARDS.filter(l => l.available === false && !facets.leagues.includes(l.fullName));

  // NHL-specific path: when the user picked league=NHL (with no season
  // override), still use the rich NHL data with conference/division
  // grouping. The rest of the leagues just get a single ranked table.
  const enrichedWithDivision = latestStandings.map((s) => {
    const c = NHL_TEAMS_CANONICAL.find(t => t.name.toLowerCase() === s.team_name.toLowerCase());
    return { ...s, _division: c?.division ?? null, _conference: c?.conference ?? null };
  });
  const easternAtlantic = enrichedWithDivision.filter(t => t._division === 'Atlantic').sort((a, b) => a.rank - b.rank);
  const easternMetro = enrichedWithDivision.filter(t => t._division === 'Metropolitan').sort((a, b) => a.rank - b.rank);
  const westernCentral = enrichedWithDivision.filter(t => t._division === 'Central').sort((a, b) => a.rank - b.rank);
  const westernPacific = enrichedWithDivision.filter(t => t._division === 'Pacific').sort((a, b) => a.rank - b.rank);
  const hasNhlData = latestStandings.length > 0;

  // Show NHL conference/division tables ONLY when the user picked NHL
  // specifically (and didn't override the season). For all other
  // queries, fall through to the generic group-by-league renderer.
  const showNhlConference = !filterLeague || filterLeague === 'NHL';
  const showGeneric = !!filterLeague && filterLeague !== 'NHL' || !!filterSeason || !!filterLevel;

  return (
    <main>
      {/* Hero */}
      <section style={{
        background: 'linear-gradient(140deg, #041E42 0%, #0A2E5C 55%, #0D1117 100%)',
        padding: 'clamp(2rem, 5vw, 3.5rem) 0',
        position: 'relative',
        overflow: 'hidden',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div className="container">
          <div className="label">League Standings</div>
          <h1 className="font-sport" style={{
            fontSize: 'clamp(2.25rem, 9vw, 5rem)',
            color: '#fff',
            lineHeight: 0.95,
            margin: '0.5rem 0 0.75rem',
          }}>
            STANDINGS
          </h1>
          <p style={{
            color: 'rgba(255,255,255,0.7)',
            fontSize: 'clamp(0.95rem, 2.5vw, 1.05rem)',
            lineHeight: 1.5,
            maxWidth: 640,
            margin: 0,
          }}>
            Current standings for hockey leagues worldwide. Conference, division, and overall rankings — points, goals, streaks, and playoff position.
          </p>
        </div>
      </section>

      {/* 2026-10-01 (Arnel feedback): FILTER BAR MOVED TO TOP.
          Filter bar sits at the top of the standings content so visitors
          can change league/season/level without scrolling. NHL-specific
          conference/division tables render when no filter or league=NHL.
          Otherwise fall through to the generic per-league renderer. */}
      <section className="section-py" style={{ background: '#0D1117', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="container">
          <StandingsFilterBar
            leagues={facets.leagues}
            seasons={facets.seasons}
            defaultLeague={filterLeague}
            defaultSeason={filterSeason}
            defaultLevel={filterLevel}
          />

          {/* Active filter summary */}
          {(filterLeague || filterSeason || filterLevel) && (
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem', marginTop: '-0.75rem', marginBottom: '1rem' }}>
              Showing {filteredRows.length} row{filteredRows.length === 1 ? '' : 's'}
              {filterLeague && <> from <strong style={{ color: '#FFB81C' }}>{filterLeague}</strong></>}
              {filterSeason && <> in season <strong style={{ color: '#FFB81C' }}>{formatSeason(filterSeason)}</strong></>}
              {filterLevel && <> in <strong style={{ color: '#FFB81C' }}>{levelLabel(filterLevel)}</strong></>}
              .
            </p>
          )}

          {/* NHL conference/division tables (default landing) */}
          {hasNhlData && showNhlConference && !showGeneric && (
            <>
              <div className="sec-head" style={{ marginTop: '0.5rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <span className="label">Live Now · {latestSeason && formatSeason(latestSeason)} season</span>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.2rem 0.6rem',
                  background: 'rgba(200,16,46,0.12)',
                  border: '1px solid rgba(200,16,46,0.3)',
                  borderRadius: '999px',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  color: '#FFB81C',
                  letterSpacing: '0.04em',
                  whiteSpace: 'nowrap',
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block', flexShrink: 0 }} />
                  {freshness.source}
                  {freshness.lastSynced && <> · {timeAgo(freshness.lastSynced)}</>}
                </span>
              </div>
                  <h2 className="font-sport" style={{ fontSize: 'clamp(1.625rem, 4vw, 2.25rem)', color: '#fff' }}>NHL STANDINGS</h2>
                </div>
                <Link href={`/standings/nhl/${latestSeason}`} className="sec-link">Full NHL page →</Link>
              </div>

              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', letterSpacing: '0.05em', marginTop: '1.5rem', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                EASTERN CONFERENCE
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 480px), 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                <div>
                  <NhlStandingsTable rows={easternAtlantic} caption="Atlantic Division" markTopThree />
                </div>
                <div>
                  <NhlStandingsTable rows={easternMetro} caption="Metropolitan Division" markTopThree />
                </div>
              </div>

              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', letterSpacing: '0.05em', marginTop: '2rem', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                WESTERN CONFERENCE
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 480px), 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <NhlStandingsTable rows={westernCentral} caption="Central Division" markTopThree />
                </div>
                <div>
                  <NhlStandingsTable rows={westernPacific} caption="Pacific Division" markTopThree />
                </div>
              </div>
            </>
          )}

          {/* Generic per-league renderer (when filter is active) */}
          {showGeneric && (
            <>
              {grouped.length === 0 ? (
                <div style={{
                  padding: '2.5rem 1.5rem',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '8px',
                  textAlign: 'center',
                  color: 'rgba(255,255,255,0.5)',
                }}>
                  <p style={{ margin: 0, fontSize: '1rem' }}>
                    No standings match your filter.
                  </p>
                  <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: 'rgba(255,255,255,0.35)' }}>
                    Try a different season or league.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {grouped.map((g) => (
                    <div key={g.league_name}>
                      <div className="sec-head" style={{ marginBottom: '0.625rem' }}>
                        <div>
                          <div className="label">{levelLabel(g.level)} League</div>
                          <h2 className="font-sport" style={{ fontSize: 'clamp(1.375rem, 3.5vw, 1.875rem)', color: '#fff' }}>
                            {g.league_name} STANDINGS
                          </h2>
                        </div>
                        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                          {g.rows.length} team{g.rows.length === 1 ? '' : 's'} · season {g.rows[0]?.season}
                        </span>
                      </div>
                      <GenericStandingsTable rows={g.rows} leagueName={g.league_name} />
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Coming soon — only show leagues we don't have standings data for,
          so the visitor knows what's still empty. Filtered out automatically
          if the user already filtered by a different league. */}
      {comingSoon.length > 0 && !showGeneric && (
        <section className="section-py" style={{ background: '#0D1117' }}>
          <div className="container">
            <div className="sec-head">
              <div>
                <div className="label">On the Way</div>
                <h2 className="font-sport" style={{ fontSize: 'clamp(1.625rem, 4vw, 2.25rem)', color: '#fff' }}>COMING SOON</h2>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.625rem' }}>
              {comingSoon.map((l) => (
                <div
                  key={l.slug}
                  style={{
                    padding: '0.875rem 1rem',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '6px',
                    opacity: 0.65,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.25rem' }}>
                    <span style={{ color: '#fff', fontWeight: 700, fontSize: '0.9rem', fontFamily: "'Bebas Neue', Impact, sans-serif", letterSpacing: '0.05em' }}>
                      {l.name}
                    </span>
                    <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', borderLeft: `2px solid ${l.accent}`, paddingLeft: '0.5rem' }}>
                      Soon
                    </span>
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.7rem', lineHeight: 1.4 }}>
                    {l.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}

function formatSeason(s: string): string {
  // '2025' -> '2025-26'
  const yr = parseInt(s);
  if (isNaN(yr)) return s;
  return `${yr}-${String((yr + 1) % 100).padStart(2, '0')}`;
}
