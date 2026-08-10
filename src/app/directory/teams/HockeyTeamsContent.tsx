import Link from 'next/link';
import type { Level } from '@/lib/league-levels';
import { LEVEL_LABELS } from '@/lib/league-levels';

interface Props {
  totalTeams: number;
  totalLeagues?: number;
  totalCountries?: number;
  topCountries?: Array<{ name: string; slug: string; teamCount: number }>;
  topLeagues?: Array<{ name: string; slug: string; teamCount: number }>;
  topCountriesRaw?: Array<{ country: string; team_count: number }>;
}

// Content hub for /directory/teams — targets GSC zero-click query
// "hockey teams" (53 imp, 0 clk, pos 49.16, 90d ending 2026-07-16).
// Server component, static content, no JS. Targets page-1 / page-2
// ranking for the bare "hockey teams" head term and the long-tail
// cluster ("hockey teams in <country>", "<level> hockey teams").
export default function HockeyTeamsContent({
  totalTeams,
  totalLeagues = 240,
  totalCountries = 57,
  topCountriesRaw,
}: Props) {
  // Map the raw RPC shape [{country, team_count}] to the display shape
  // [{name, slug, teamCount}]. Fall back to a static curated list if the
  // RPC returned nothing (e.g. Supabase outage during render).
  const slugify = (s: string) =>
    s.toLowerCase().trim().replace(/['']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const topCountries = (topCountriesRaw && topCountriesRaw.length > 0)
    ? topCountriesRaw.slice(0, 10).map((r) => ({
        name: r.country,
        slug: slugify(r.country),
        teamCount: Number(r.team_count) || 0,
      }))
    : [
        { name: 'United States', slug: 'united-states', teamCount: 0 },
        { name: 'Canada', slug: 'canada', teamCount: 0 },
        { name: 'Russia', slug: 'russia', teamCount: 0 },
        { name: 'Sweden', slug: 'sweden', teamCount: 0 },
        { name: 'Finland', slug: 'finland', teamCount: 0 },
        { name: 'Czech Republic', slug: 'czech-republic', teamCount: 0 },
        { name: 'Germany', slug: 'germany', teamCount: 0 },
        { name: 'Switzerland', slug: 'switzerland', teamCount: 0 },
        { name: 'Slovakia', slug: 'slovakia', teamCount: 0 },
        { name: 'France', slug: 'france', teamCount: 0 },
      ];
  // Render the count next to the link when it's > 0. When the fallback
  // list is in use (teamCount === 0), suppress the number so we don't
  // show explicit "0" counts.
  const renderCount = (n: number) => (n > 0 ? n.toLocaleString() : '');

  // Six level cards. Each links to ?level=X and gives a short description
  // matching what Google wants to extract for "{level} hockey teams" queries.
  const levels: Level[] = ['pro', 'junior', 'college', 'international', 'adult'];
  const levelDescriptions: Record<Level, { summary: string; examples: string[] }> = {
    pro: {
      summary: 'Top-flight professional leagues with paid players and full-time rosters.',
      examples: ['NHL (32 teams)', 'KHL', 'SHL', 'Liiga'],
    },
    junior: {
      summary: 'Major junior leagues — draft-eligible players aged 16-20 in North American and European development systems.',
      examples: ['OHL', 'WHL', 'QMJHL', 'USHL'],
    },
    college: {
      summary: 'University-level programs in the United States and Canada, with varsity and club divisions.',
      examples: ['NCAA Division I', 'NCAA Division III', 'U SPORTS'],
    },
    international: {
      summary: 'National-team programs representing their countries in IIHF-sanctioned events.',
      examples: ['IIHF World Championship', 'Winter Olympics', 'World Juniors'],
    },
    adult: {
      summary: 'Senior amateur, recreational, and beer-league hockey for adults at every skill level.',
      examples: ['USA Hockey adult leagues', 'Hockey Canada rec', 'European amateur'],
    },
  };

  return (
    <section
      id="teams-overview"
      aria-label="Hockey teams directory overview"
      style={{
        maxWidth: '80rem',
        margin: '0 auto',
        padding: '1rem 1rem 2rem',
        color: 'rgba(255,255,255,0.75)',
        fontSize: '0.9375rem',
        lineHeight: 1.7,
      }}
    >
      {/* Head-term answer block: explicit "How many hockey teams are there"
          paragraph that Google can extract directly for the bare query.
          Anchor id added 2026-08-07 so the SEO intro block above can
          jump-link directly to the head-term answer. */}
      <div id="how-many-hockey-teams" style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.375rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>
          How many hockey teams are there in the world?
        </h2>
        <p>
          RinkStop tracks {totalTeams.toLocaleString()}+ active hockey teams across {totalLeagues}+ leagues
          and {totalCountries} countries — from the NHL's 32 franchises and 24 IIHF national programs to
          ~600 European pro and junior clubs, ~150 NCAA programs, and tens of thousands of amateur and
          youth teams. The exact count moves weekly as new leagues are added and dormant teams are
          archived; the figure above is current as of today.
        </p>
      </div>

      {/* By level: 6 cards targeting "{level} hockey teams" queries.
          Anchor id added 2026-08-07 so the SEO intro block above can
          jump-link to "teams by level" directly. */}
      <div id="teams-by-level" style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.375rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>
          Hockey teams by level
        </h2>
        <p style={{ marginBottom: '0.75rem' }}>
          Browse teams by competitive tier. Each level covers a distinct player development path.
        </p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: '0.75rem',
            marginTop: '1rem',
          }}
        >
          {levels.map((lvl) => {
            const meta = levelDescriptions[lvl];
            return (
              <Link
                key={lvl}
                href={`/directory/teams?level=${lvl}`}
                style={{
                  display: 'block',
                  padding: '1rem',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  color: 'rgba(255,255,255,0.85)',
                }}
              >
                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#fff', marginBottom: '0.4rem' }}>
                  {LEVEL_LABELS[lvl]} Hockey Teams
                </div>
                <div style={{ fontSize: '0.8125rem', marginBottom: '0.5rem' }}>{meta.summary}</div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
                  {meta.examples.join(' · ')}
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* By country: top 10 with team counts. Targets "hockey teams in
          <country>" cluster which has 35+ queries all at pos 30-80.
          Anchor id added 2026-08-07 so the SEO intro block above can
          jump-link to "teams by country" directly. */}
      <div id="teams-by-country" style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.375rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>
          Hockey teams by country
        </h2>
        <p style={{ marginBottom: '0.75rem' }}>
          The ten countries with the most tracked teams. Click through for the full list and
          per-country league breakdown.
        </p>
        <ul
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: '0.5rem',
            listStyle: 'none',
            padding: 0,
            margin: '1rem 0 0',
          }}
        >
          {topCountries.map((c) => (
            <li key={c.slug}>
              <Link
                href={`/directory/teams?country=${encodeURIComponent(c.name)}`}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '0.6rem 0.85rem',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '6px',
                  textDecoration: 'none',
                  color: 'rgba(255,255,255,0.85)',
                  fontSize: '0.875rem',
                }}
              >
                <span>Hockey teams in {c.name}</span>
                {renderCount(c.teamCount) && (
                  <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>
                    {renderCount(c.teamCount)}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {/* Head-term answer (continued): "How to start a hockey team" — adds
          E-E-A-T signal. Links to internal tools (Tryout Guide, Cost Calc). */}
      <div style={{ marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1.375rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>
          How to start a hockey team
        </h2>
        <p style={{ marginBottom: '0.75rem' }}>
          Starting a hockey team — whether a youth program, adult rec league, or competitive travel
          squad — follows a predictable six-step path:
        </p>
        <ol style={{ paddingLeft: '1.5rem', margin: '0.5rem 0 1rem' }}>
          <li style={{ marginBottom: '0.4rem' }}>
            <strong>Recruit players.</strong> 12-18 skaters plus a goalie for a full roster.
            Schools, churches, and rec centers are good starting points.
          </li>
          <li style={{ marginBottom: '0.4rem' }}>
            <strong>Find ice time.</strong> Most rinks sell practice ice in 50-minute blocks during
            off-peak hours at lower rates than prime-time game slots. See our{' '}
            <Link href="/directory/rinks" style={{ color: '#7dd3fc', textDecoration: 'underline' }}>
              rink directory
            </Link>{' '}
            for nearby facilities.
          </li>
          <li style={{ marginBottom: '0.4rem' }}>
            <strong>Register with your national federation.</strong> USA Hockey, Hockey Canada, and
            other national bodies require annual registration for insurance and league eligibility.
            Use our{' '}
            <Link href="/tools/hockey-cost-calculator" style={{ color: '#7dd3fc', textDecoration: 'underline' }}>
              hockey cost calculator
            </Link>{' '}
            to estimate dues.
          </li>
          <li style={{ marginBottom: '0.4rem' }}>
            <strong>Get insurance.</strong> Most rinks require proof of general liability before
            you can book ice. Federation registration typically includes basic coverage.
          </li>
          <li style={{ marginBottom: '0.4rem' }}>
            <strong>Set up dues.</strong> Typical adult rec teams collect $300-$800 per player per
            season to cover ice, jerseys, and refs. See{' '}
            <Link href="/tryout-guide" style={{ color: '#7dd3fc', textDecoration: 'underline' }}>
              our tryout guide
            </Link>{' '}
            for budgeting templates.
          </li>
          <li style={{ marginBottom: '0.4rem' }}>
            <strong>Schedule games.</strong> Join a local league or schedule scrimmages against
            nearby teams. Most adult leagues handle scheduling centrally once your team registers.
          </li>
        </ol>
        <p>
          Once your team is playing, claim your free listing in the RinkStop directory so players,
          parents, and fans can find your roster, schedule, and arena.
        </p>
      </div>
    </section>
  );
}
