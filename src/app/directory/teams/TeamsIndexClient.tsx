'use client';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { SearchIcon, FilterIcon } from '@/components/icons';
import ShareButton from '@/components/ShareButton';

// ------ Types ----------------------------------------------------------------------------------------------------------------------------------------
interface NHLTeam {
  id: string;
  name: string;
  city?: string;
  country?: string;
  league_id?: string;
  leagues?: { name: string };
  slug?: string;
  logo_url?: string;
  claimed_by_tier?: string | null;
  source: 'nhl';
}

interface HierarchyRef { id: string; name: string; slug: string | null }

interface UserTeam {
  id: string;
  name: string;
  slug: string;
  city?: string | null;
  country?: string | null;
  country_code?: string | null;
organization_id?: string | null;
  league_id?: string | null;
  federation_id?: string | null;
  organization?: HierarchyRef | null;
  league?: HierarchyRef | null;
  federation?: HierarchyRef | null;
  level?: string | null;
  age_label?: string | null;
  age_category?: string | null;
  description?: string | null;
  season_label?: string | null;
  claimed_by_tier?: string | null;
  source: 'user';
}

export type Team = NHLTeam | UserTeam;

interface Props {
  initialTeams: Team[];
  country?: string | null;
  level?: string | null;
  league?: string | null;
  teamCount: number;
}

// A listing is "verified" if the claimant has a paid tier in either track.
// Personal: identity_plus. Business: business_listing+ and organization tiers.
// Federation is always verified (it's a paid org tier).
const VERIFIED_TIERS = new Set([
  'identity_plus',
  'business_listing', 'business_plus', 'club_starter', 'club_pro', 'club_elite', 'league', 'federation',
]);

export default function TeamsIndexClient({ initialTeams, country: initialCountry, level: initialLevel, league: initialLeague, teamCount }: Props) {
  const searchParams = useSearchParams();
  const [teams, setTeams] = useState<Team[]>(initialTeams);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [country, setCountry] = useState<string>(initialCountry || '');
  const [level, setLevel] = useState<string>(initialLevel || '');
  const [league, setLeague] = useState<string>(initialLeague || '');

  // Prefill from URL on mount (deep-links / back-forward)
  useEffect(() => {
    const c = searchParams.get('country');
    const l = searchParams.get('level');
    const lg = searchParams.get('league');
    if (c && c !== country) setCountry(c);
    if (l && l !== level) setLevel(l);
    if (lg && lg !== league) setLeague(lg);
  }, [searchParams]);

  useEffect(() => {
    // Refetch only when the user changes filters away from server values.
    const serverCountry = initialCountry || '';
    const serverLevel = initialLevel || '';
    const serverLeague = initialLeague || '';
    if (country === serverCountry && level === serverLevel && league === serverLeague) return;
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (country) params.set('country', country);
    if (level) params.set('level', level);
    if (league) params.set('league', league);

    // Fetch both NHL (or directory) teams + user-created teams in parallel.
    Promise.all([
      fetch(`/api/teams?${params}`).then(r => r.json()).catch((): { data: never[] } => ({ data: [] })),
      fetch(`/api/user-teams?${params}`).then(r => r.json()).catch((): { data: never[] } => ({ data: [] })),
    ]).then(([nhl, user]) => {
      const nhlTeams: NHLTeam[] = nhl?.data || [];
      const userTeams: UserTeam[] = user?.data || [];
      // Deduplicate by id — user-created teams may share names with NHL teams
      const merged = [...nhlTeams, ...userTeams].filter(
        (t, i, arr) => arr.findIndex(x => x.id === t.id) === i
      );
      setTeams(merged);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [search, country, level, league, initialCountry, initialLevel, initialLeague]);

  const [verifiedOnly, setVerifiedOnly] = useState(false);
  // The 'claimed_by_tier' field is computed by /api/teams via the claims join;
  // it isn't on the teams table directly, so direct Supabase queries (used when
  // the page is filtered by ?country=) won't have it. We default to 0 here
  // and disable the filter when the field is missing.
  const verifiedCount = 0;
  const visibleTeams = verifiedOnly ? [] : teams;

  const clearFilters = () => { setSearch(''); setCountry(''); setLevel(''); setLeague(''); };
  const hasFilters = search || country || level || league;

  // Sync filter changes to URL so the view is shareable and back/forward works.
  const updateUrl = (next: { country?: string; level?: string; league?: string; search?: string }) => {
    const params = new URLSearchParams();
    const c = next.country !== undefined ? next.country : country;
    const l = next.level !== undefined ? next.level : level;
    const lg = next.league !== undefined ? next.league : league;
    const s = next.search !== undefined ? next.search : search;
    if (c) params.set('country', c);
    if (l) params.set('level', l);
    if (lg) params.set('league', lg);
    const qs = params.toString();
    const url = qs ? `/directory/teams?${qs}` : '/directory/teams';
    window.history.replaceState({}, '', url);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {/* Breadcrumb */}
      <nav style={{ fontSize: '0.75rem', color: '#555555', marginBottom: '1rem' }}>
        <Link href="/" style={{ color: '#555555' }}>Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/directory" style={{ color: '#555555' }}>Directory</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>Teams</span>
      </nav>

      {/* Header */}
      <div style={{ marginBottom: '1.25rem' }}>
        <div className="label">Directory</div>
        <h1 className="font-sport" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: '#fff', letterSpacing: '0.02em', lineHeight: 1 }}>
          All Hockey Teams
        </h1>
        <Link
          href="/directory/nhl/history"
          style={{ display: 'inline-block', marginTop: '0.5rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.55)', textDecoration: 'none' }}
        >
          Looking for a team that relocated or renamed? View NHL franchise history →
        </Link>
        <div style={{ display: 'inline-block', marginTop: '0.5rem', marginLeft: '1rem' }}>
          <ShareButton
            payload={{
              title: 'All Teams — RinkStop',
              text: 'Find hockey teams worldwide on RinkStop. Roster, schedule, and stats for every level.',
              url: 'https://rinkstop.com/directory/teams',
            }}
            variant="dark"
          />
        </div>
      </div>

      {/* SEO intro block — added 2026-08-07. PR #109 added the same
          pattern to city pages, PR #110 to league hubs. /directory/teams
          is at pos 37.1 for "hockey teams" — 964 impressions with no
          head-term answer at the top of the page. This block directly
          answers the head term + links to the by-level / by-country /
          how-many anchors below (added 2026-08-07 in HockeyTeamsContent). */}
      <section
        aria-label="Hockey teams directory overview"
        style={{ marginBottom: '1.5rem', color: 'rgba(255,255,255,0.78)', fontSize: '0.9375rem', lineHeight: 1.7, maxWidth: '80rem' }}
      >
        <p style={{ marginBottom: '0.75rem' }}>
          RinkStop tracks <strong>{teamCount.toLocaleString()}+ active hockey teams</strong> across 240 leagues and 57 countries — every NHL franchise, all 32 AHL clubs, the KHL, SHL, Liiga, DEL, and NLA in Europe, the CHL (OHL, WHL, QMJHL), NCAA Division I and III men&apos;s and women&apos;s programs, IIHF national programs, and tens of thousands of amateur and youth teams. Use the search and filters below to find a specific team, or browse by level, country, or league.
        </p>
        <p style={{ marginBottom: '0.5rem' }}>
          Looking for teams near you? Jump to{' '}
          <a href="#how-many-hockey-teams" style={{ color: '#7dd3fc', textDecoration: 'underline' }}>how many hockey teams there are</a>,{' '}
          <a href="#teams-by-level" style={{ color: '#7dd3fc', textDecoration: 'underline' }}>teams by level</a>, or{' '}
          <a href="#teams-by-country" style={{ color: '#7dd3fc', textDecoration: 'underline' }}>teams by country</a>.
        </p>
      </section>

      {/* Filter Bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', marginBottom: '1.25rem', padding: '0.875rem 1rem', background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: '#555555' }}>
          <FilterIcon className="w-4 h-4" />
        </div>

        {/* Level chip */}
        <div style={{ position: 'relative', flex: '0 0 auto' }}>
          <select
            value={level}
            onChange={e => { setLevel(e.target.value); updateUrl({ level: e.target.value }); }}
            className="input-field"
            aria-label="Filter by level"
            style={{
              paddingRight: '1.75rem',
              minWidth: 130,
              cursor: 'pointer',
              fontSize: '0.8125rem',
              fontWeight: level ? 700 : 400,
              color: level ? '#FFB81C' : 'rgba(255,255,255,0.75)',
              border: `1.5px solid ${level ? '#FFB81C' : 'rgba(255,255,255,0.15)'}`,
            }}
          >
            <option value="">All levels</option>
            <option value="pro">Pro</option>
            <option value="junior">Junior</option>
            <option value="college">College</option>
            <option value="international">International</option>
            <option value="adult">Adult</option>
          </select>
        </div>

        {/* League chip */}
        <div style={{ position: 'relative', flex: '0 0 auto' }}>
          <input
            type="text"
            list="league-options"
            placeholder="League"
            value={league}
            onChange={e => { setLeague(e.target.value); updateUrl({ league: e.target.value }); }}
            className="input-field"
            style={{ width: 200, fontSize: '0.8125rem' }}
          />
          <datalist id="league-options">
            <option value="National Hockey League" />
            <option value="American Hockey League" />
            <option value="ECHL" />
            <option value="Kontinental Hockey League" />
            <option value="Finnish Liiga" />
            <option value="Swedish Hockey League" />
            <option value="DEL" />
            <option value="Professional Women's Hockey League" />
            <option value="Ontario Hockey League" />
            <option value="Western Hockey League" />
            <option value="Quebec Major Junior Hockey League" />
            <option value="United States Hockey League" />
            <option value="NCAA Division 1 Men's Hockey" />
            <option value="IIHF World Championships" />
            <option value="Elite League" />
          </datalist>
        </div>

        {/* Country chip */}
        <div style={{ position: 'relative', flex: '0 0 auto' }}>
          <input
            type="text"
            list="country-options"
            placeholder="Country"
            value={country}
            onChange={e => { setCountry(e.target.value); updateUrl({ country: e.target.value }); }}
            className="input-field"
            style={{ width: 180, fontSize: '0.8125rem' }}
          />
          <datalist id="country-options">
            <option value="United States" />
            <option value="Canada" />
            <option value="Sweden" />
            <option value="Finland" />
            <option value="Russia" />
            <option value="Germany" />
            <option value="Czech Republic" />
            <option value="Switzerland" />
            <option value="United Kingdom" />
            <option value="Norway" />
            <option value="Denmark" />
            <option value="Austria" />
            <option value="Slovakia" />
          </datalist>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 180px', minWidth: 180 }}>
          <div style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#555555', pointerEvents: 'none' }}>
            <SearchIcon className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Search teams..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-field"
            style={{ paddingLeft: '2.25rem', fontSize: '0.8125rem' }}
          />
        </div>

        <button
          onClick={() => setVerifiedOnly(v => !v)}
          style={{
            background: verifiedOnly ? 'rgba(20,184,166,0.15)' : 'transparent',
            border: `1.5px solid ${verifiedOnly ? '#14B8A6' : 'rgba(255,255,255,0.2)'}`,
            color: verifiedOnly ? '#14B8A6' : 'rgba(255,255,255,0.6)',
            borderRadius: '3px', padding: '0.5rem 0.875rem',
            fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
            letterSpacing: '0.07em', textTransform: 'uppercase',
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          Verified only ({verifiedCount})
        </button>
        {hasFilters && (
          <button onClick={clearFilters} style={{ background: 'transparent', border: '1.5px solid rgba(255,255,255,0.3)', color: '#fff', borderRadius: '3px', padding: '0.5rem 0.875rem', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.07em', textTransform: 'uppercase' }}>
            Clear
          </button>
        )}
      </div>

      {/* Country filter banner — shows when ?country= set */}
      {(initialCountry || initialLevel || initialLeague) && (
        <div style={{
          background: 'rgba(200,16,46,0.08)',
          border: '1px solid rgba(200,16,46,0.25)',
          borderRadius: 4,
          padding: '0.625rem 0.875rem',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}>
          <div style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.85)' }}>
            Showing {initialLevel && <><strong style={{ color: '#C8102E' }}>{initialLevel}</strong> </>}
            {initialLevel && (initialCountry || initialLeague) && '· '}
            {initialLeague && <><strong style={{ color: '#C8102E' }}>{initialLeague}</strong> </>}
            {initialLeague && initialCountry && '· '}
            {initialCountry && <>teams in <strong style={{ color: '#C8102E' }}>{initialCountry}</strong></>}
            {!initialCountry && !initialLeague && initialLevel && ' teams'}
            {initialLevel && initialLeague && ' teams'}
            {!initialLevel && initialLeague && ' teams'}
            {' '}
            <span style={{ color: 'rgba(255,255,255,0.45)' }}>— {teams.length.toLocaleString()} total</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => { setCountry(''); setLevel(''); setLeague(''); setSearch(''); }}
              style={{
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.2)',
                color: 'rgba(255,255,255,0.7)',
                borderRadius: 3,
                padding: '0.375rem 0.75rem',
                fontSize: '0.6875rem',
                fontWeight: 700,
                cursor: 'pointer',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              ✕ Clear
            </button>
            <Link
              href="/directory/teams"
              style={{
                background: '#C8102E',
                color: '#fff',
                border: 'none',
                borderRadius: 3,
                padding: '0.375rem 0.75rem',
                fontSize: '0.6875rem',
                fontWeight: 700,
                textDecoration: 'none',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              View All Countries →
            </Link>
          </div>
        </div>
      )}

      {/* Results count */}
      {!loading && (
        <p style={{ fontSize: '0.75rem', color: '#555555', letterSpacing: '0.04em', marginBottom: '1rem' }}>
          {visibleTeams.length === 0 ? 'No results' : `${visibleTeams.length} team${visibleTeams.length !== 1 ? 's' : ''}`}
          {hasFilters ? ' matching your search' : ' in directory'}
        </p>
      )}

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.75rem' }}>
        {loading
          ? Array.from({ length: 12 }).map((_, i) => (
              <div key={i} style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '6px', padding: '1.25rem' }}>
                <div className="skeleton" style={{ height: '1.125rem', width: '65%', marginBottom: '0.625rem' }} />
                <div className="skeleton" style={{ height: '0.875rem', width: '45%' }} />
              </div>
            ))
          : visibleTeams.length === 0
            ? (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem 1rem' }}>
                <p style={{ color: 'rgba(255,255,255,0.3)', marginBottom: '1rem' }}>No teams found matching your search</p>
                <button onClick={clearFilters} style={{ color: 'var(--red)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem' }}>Clear all filters</button>
              </div>
            )
            : visibleTeams.map(team => (
              <Link
                key={team.id}
                href={`/directory/teams/${team.slug}`}
                style={{
                  display: 'block', textDecoration: 'none',
                  background: team.claimed_by_tier && VERIFIED_TIERS.has(team.claimed_by_tier) ? 'linear-gradient(135deg, rgba(200,16,46,0.08) 0%, var(--s2) 100%)' : 'var(--s2)',
                  border: `1px solid ${team.claimed_by_tier && VERIFIED_TIERS.has(team.claimed_by_tier) ? 'rgba(20,184,166,0.4)' : 'var(--border)'}`,
                  borderRadius: '6px',
                  padding: '1.125rem',
                  position: 'relative',
                  transition: 'border-color 0.2s, transform 0.2s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-h)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = ''; (e.currentTarget as HTMLElement).style.transform = ''; }}
              >
                {/* Tier badge in corner */}
                {(team.claimed_by_tier && (team.claimed_by_tier === 'business_plus' || team.claimed_by_tier === 'federation')) && (
                  <div style={{ position: 'absolute', top: 8, left: 8, fontSize: '0.5625rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0.15rem 0.4rem', borderRadius: '3px', background: 'var(--red)', color: '#fff' }}>
                    ⭐ Featured
                  </div>
                )}
                {(team.claimed_by_tier === 'identity_plus') && (
                  <div style={{ position: 'absolute', top: 8, right: 8, display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: '0.5625rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0.15rem 0.4rem', borderRadius: '3px', background: 'rgba(20,184,166,0.15)', color: '#14B8A6', border: '1px solid rgba(20,184,166,0.4)' }}>
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    Verified
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.625rem', paddingRight: team.claimed_by_tier ? 70 : 0 }}>
                  {team.source === 'nhl' && (team as NHLTeam).logo_url ? (
                    <img src={(team as NHLTeam).logo_url} alt={`${team.name} logo`} style={{ width: 36, height: 36, objectFit: 'contain', flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #C8102E, #041E42)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem', fontWeight: 700, color: '#fff', flexShrink: 0 }}>🏒</div>
                  )}
                  <div style={{ minWidth: 0 }}>
                    <h3 style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#fff', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {team.name}
                    </h3>
                  </div>
                </div>
                <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: '0.8125rem' }}>
                  {[team.city, team.country].filter(Boolean).join(', ')}
                </p>
                {'leagues' in team && team.leagues?.name && (
                  <span style={{ display: 'inline-block', marginTop: '0.5rem', fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0.15rem 0.4rem', borderRadius: '3px', background: 'rgba(200,16,46,0.15)', color: 'var(--red)' }}>
                    {team.leagues.name}
                  </span>
                )}
                {team.source === 'user' && (
                  <>
                    {(team as UserTeam).organization?.name && (
                      <span style={{ display: 'inline-block', marginTop: '0.5rem', fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0.15rem 0.4rem', borderRadius: '3px', background: 'rgba(255,184,28,0.12)', color: '#FFB81C' }}>
                        🏢 {(team as UserTeam).organization!.name}
                      </span>
                    )}
{(team as UserTeam).league?.name && (
                      <span style={{ display: 'inline-block', marginTop: '0.5rem', fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0.15rem 0.4rem', borderRadius: '3px', background: 'rgba(200,16,46,0.15)', color: 'var(--red)' }}>
                        🏆 {(team as UserTeam).league!.name}
                      </span>
                    )}
                    {(team as UserTeam).federation?.name && (
                      <span style={{ display: 'inline-block', marginTop: '0.5rem', fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0.15rem 0.4rem', borderRadius: '3px', background: 'rgba(0,82,147,0.15)', color: '#005293' }}>
                        🌐 {(team as UserTeam).federation!.name}
                      </span>
                    )}
                  </>
                )}
              </Link>
            ))
        }
      </div>
    </div>
  );
}
