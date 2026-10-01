import type { Metadata } from 'next';
import Link from 'next/link';
import { getLatestSeason, getStandingsForSeason } from '@/lib/nhl-data';
import { ALL_CONFERENCES, NHL_TEAMS_CANONICAL, teamsByConference } from '@/lib/nhl-teams-canonical';
import NhlStandingsTable from '@/components/NhlStandingsTable';

export const revalidate = 3600; // 1 hour

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

export default async function StandingsIndexPage() {
  const latestSeason = await getLatestSeason();
  const latestStandings = latestSeason ? await getStandingsForSeason(latestSeason) : [];

  // Build top-3 overall NHL leaders from latest season
  const overallLeaders = [...latestStandings]
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.wins !== a.wins) return b.wins - a.wins;
      return (b.goals_for - b.goals_against) - (a.goals_for - a.goals_against);
    })
    .slice(0, 3);

  const available = LEAGUE_CARDS.filter(l => l.available);
  const comingSoon = LEAGUE_CARDS.filter(l => !l.available);

  // 2026-10-01 (Arnel feedback): /standings was a league-picker with no
  // actual standings visible. Now render the NHL table INLINE so the
  // standings are visible on first click. Group by division for the
  // conference/division sub-tables; top-3 in each division get a subtle
  // green tint (matches the reference NHL.com / ESPN screenshots).
  const enrichedWithDivision = latestStandings.map((s) => {
    const c = NHL_TEAMS_CANONICAL.find(t => t.name.toLowerCase() === s.team_name.toLowerCase());
    return { ...s, _division: c?.division ?? null, _conference: c?.conference ?? null };
  });
  const easternAtlantic = enrichedWithDivision.filter(t => t._division === 'Atlantic').sort((a, b) => a.rank - b.rank);
  const easternMetro = enrichedWithDivision.filter(t => t._division === 'Metropolitan').sort((a, b) => a.rank - b.rank);
  const westernCentral = enrichedWithDivision.filter(t => t._division === 'Central').sort((a, b) => a.rank - b.rank);
  const westernPacific = enrichedWithDivision.filter(t => t._division === 'Pacific').sort((a, b) => a.rank - b.rank);
  const hasNhlData = latestStandings.length > 0;

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

      {/* Inline NHL standings tables (Arnel feedback 2026-10-01).
          Inline so the /standings landing shows real data, not just a
          league picker. Group by conference / division to match NHL.com +
          ESPN references the user shared. */}
      {hasNhlData && (
        <section className="section-py" style={{ background: '#0D1117', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="container">
            <div className="sec-head">
              <div>
                <div className="label">Live Now · {latestSeason && formatSeason(latestSeason)} season</div>
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
          </div>
        </section>
      )}

      {/* Other leagues switcher */}
      <section className="section-py" style={{ background: '#0D1117', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="container">
          <div className="sec-head">
            <div>
              <div className="label">Switch League</div>
              <h2 className="font-sport" style={{ fontSize: 'clamp(1.625rem, 4vw, 2.25rem)', color: '#fff' }}>OTHER LEAGUES</h2>
            </div>
          </div>
        </div>
      </section>

      {/* Live: NHL */}
      {available.length > 0 && (
        <section className="section-py" style={{ background: '#0D1117', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="container">
            <div className="sec-head">
              <div>
                <div className="label">Live Now</div>
                <h2 className="font-sport" style={{ fontSize: 'clamp(1.625rem, 4vw, 2.25rem)', color: '#fff' }}>AVAILABLE LEAGUES</h2>
              </div>
            </div>
            <div className="cat-grid">
              {available.map((l) => {
                const top = overallLeaders.find(t => true); // any top team reference
                return (
                  <Link
                    key={l.slug}
                    href={l.href}
                    className="card"
                    style={{ textDecoration: 'none', display: 'block' }}
                  >
                    <div style={{ padding: 'clamp(1rem, 2.5vw, 1.5rem)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.5rem' }}>
                        <span style={{ fontWeight: 800, fontSize: '1.5rem', color: '#fff', fontFamily: "'Bebas Neue', Impact, sans-serif", letterSpacing: '0.05em' }}>
                          {l.name}
                        </span>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: l.accent, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                          {l.count} teams
                        </span>
                      </div>
                      <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.8125rem', lineHeight: 1.5, margin: 0 }}>
                        {l.desc}
                      </p>
                      {latestSeason && (
                        <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
                            {formatSeason(latestSeason)} season
                          </span>
                          <span style={{ color: l.accent, fontSize: '0.85rem', fontWeight: 700 }}>
                            View →
                          </span>
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Top 3 overall NHL leaders preview */}
      {overallLeaders.length >= 3 && latestSeason && (
        <section className="section-py" style={{ background: '#0D1117', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="container">
            <div className="sec-head">
              <div>
                <div className="label">NHL Top 3</div>
                <h2 className="font-sport" style={{ fontSize: 'clamp(1.625rem, 4vw, 2.25rem)', color: '#fff' }}>OVERALL LEADERS</h2>
              </div>
              <Link href="/standings/nhl" className="sec-link">Full Standings →</Link>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
              {overallLeaders.map((team, i) => (
                <div
                  key={team.team_id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.875rem',
                    padding: '1rem 1.25rem',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '8px',
                  }}
                >
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: i === 0 ? '#FFB81C' : i === 1 ? '#C0C0C0' : '#CD7F32',
                    color: '#000',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 800, fontSize: '0.9rem',
                    flexShrink: 0,
                  }}>{i + 1}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {team.team_name}
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.75rem' }}>
                      {team.wins}–{team.losses}–{team.overtime_losses} · {team.points} PTS
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Coming soon */}
      {comingSoon.length > 0 && (
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
                    <span style={{ color: l.accent, fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
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
