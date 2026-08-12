'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { FilterIcon } from '@/components/icons';
import ShareButton from '@/components/ShareButton';
import CategorySearchBar from '@/components/CategorySearchBar';
import type { Level } from '@/lib/league-levels';
import { LEAGUE_LEVELS } from '@/lib/league-levels';

// Type for the topLeagues prop (subset of getTopLeagues return).
interface LeagueCountLite {
  name: string;
  slug: string;
  teamCount: number;
}

// ------ Types ------------------------------------------------------------------------------------------------------------------------
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
  /** Top countries by team count (server-rendered for the country select). */
  topCountries: Array<{ name: string; slug: string; teamCount: number }>;
  /** Top leagues by team count (server-rendered for the league select). */
  topLeagues: Array<{ name: string; slug: string; teamCount: number }>;
  /** country → league names that have active teams in that country. Used by
   *  the client to cascade the country dropdown in real-time as the user
   *  changes filters. Server-side data so the client doesn't need to query
   *  the DB. */
  countryLeaguesMap: Array<[string, string[]]>;
  /** Total team count (for display when no filter is active). */
  totalCount: number;
  /** Active filter values from the URL (server-side). */
  country?: string | null;
  level?: string | null;
  league?: string | null;
  /** ?q=... from the URL (set when user lands via search). */
  initialQuery?: string | null;
}

// Verified tiers — same set as before. Personal: identity_plus. Business: business_listing+.
// Federation is always verified (paid org tier).
const VERIFIED_TIERS = new Set([
  'identity_plus',
  'business_listing', 'business_plus', 'club_starter', 'club_pro', 'club_elite', 'league', 'federation',
]);

// Level options for the select (single source of truth, sorted).
const LEVEL_OPTIONS: Array<{ value: Exclude<Level, ''> | ''; label: string }> = [
  { value: '', label: 'All levels' },
  { value: 'pro', label: 'Pro' },
  { value: 'junior', label: 'Junior' },
  { value: 'college', label: 'College' },
  { value: 'international', label: 'International' },
  { value: 'adult', label: 'Adult' },
];

// Normalize a string for case-insensitive comparison.
function norm(s: string | null | undefined): string {
  return (s ?? '').toLowerCase().trim();
}

// Convert a league name from the topLeagues list to a slug for filtering.
// Top leagues are already slugs; for the select, we filter by name match.
function leagueMatches(leagueName: string | null | undefined, filter: string): boolean {
  if (!filter) return true;
  if (!leagueName) return false;
  return leagueName.toLowerCase() === filter.toLowerCase();
}

export default function TeamsIndexClient({
  initialTeams,
  topCountries,
  topLeagues,
  countryLeaguesMap,
  totalCount,
  country: initialCountry,
  level: initialLevel,
  league: initialLeague,
  initialQuery,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Read the active filters from the URL (single source of truth)
  const urlCountry = searchParams.get('country') ?? '';
  const urlLevel = searchParams.get('level') ?? '';
  const urlLeague = searchParams.get('league') ?? '';
  const urlQ = searchParams.get('q') ?? '';

  // Local state for verified-only (transient, not URL-synced — same as before)
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  // The current teams list (may be a refetched slice on filter change).
  const [teams, setTeams] = useState<Team[]>(initialTeams);
  const [loading, setLoading] = useState(false);

  // True if the user is currently on the "filtered" state (URL has ?country= etc.)
  // The server already pre-filtered initialTeams; we only refetch when the user
  // changes filters client-side.
  const filtersChanged =
    urlCountry !== (initialCountry ?? '') ||
    urlLevel !== (initialLevel ?? '') ||
    urlLeague !== (initialLeague ?? '');

  // Compute the leagues available in our topLeagues for a given level.
  // Used to filter the league <select> when a level is set, so the user
  // can never pick a combination that doesn't exist (e.g. Level=College
  // + League=NHL). Leagues not in our topLeagues list are also excluded
  // — the dropdown only shows leagues we actually have teams for.
  const leaguesForLevel = useCallback(
    (level: Level | ''): LeagueCountLite[] => {
      if (!level) return topLeagues;
      return topLeagues.filter((l) => LEAGUE_LEVELS[l.name] === level);
    },
    [topLeagues]
  );

  // Update a single URL filter param, preserving the others.
  // Used by the filter selects. Keeps the URL shareable / back-button safe.
  // CRITICAL: when level changes, validate that urlLeague still belongs to
  // that level (else clear it). When league changes, auto-set level to the
  // league's level so the two never contradict.
  const setFilter = useCallback(
    (key: 'country' | 'level' | 'league', value: string) => {
      const next = new URLSearchParams(searchParams.toString());
      if (value) next.set(key, value);
      else next.delete(key);
      // Drop ?q= when filters change so the search bar's prefill doesn't double-filter
      next.delete('q');

      // Enforce level ↔ league consistency. Without this, the user can
      // land on impossible combinations (Level=College + League=NHL)
      // and the page returns an empty result with no clear explanation.
      if (key === 'level' && value) {
        // When the new level is set, the league must be valid for that level
        // (or be empty). If urlLeague no longer matches, drop it.
        const currentLeague = next.get('league');
        if (currentLeague && LEAGUE_LEVELS[currentLeague] !== value) {
          next.delete('league');
        }
      } else if (key === 'league' && value) {
        // When the league is set, auto-update the level to match. This
        // keeps the two filters in lockstep — picking NHL sets level=pro,
        // picking NCAA sets level=college, etc.
        const newLevel = LEAGUE_LEVELS[value];
        if (newLevel) {
          next.set('level', newLevel);
        }
      }

      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  const clearAllFilters = useCallback(() => {
    const next = new URLSearchParams(searchParams.toString());
    next.delete('country');
    next.delete('level');
    next.delete('league');
    next.delete('q');
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [router, pathname, searchParams]);

  const clearOneFilter = useCallback(
    (key: 'country' | 'level' | 'league') => {
      setFilter(key, '');
    },
    [setFilter]
  );

  // Refetch teams when the user changes filters in the client (not on mount).
  // This fires ONLY when the URL has a filter that the server didn't pre-apply
  // (i.e. user changed a filter in the UI). The server-rendered HTML is
  // already correct for the initial URL.
  useEffect(() => {
    if (!filtersChanged) return;
    setLoading(true);
    const params = new URLSearchParams();
    if (urlCountry) params.set('country', urlCountry);
    if (urlLevel) params.set('level', urlLevel);
    if (urlLeague) params.set('league', urlLeague);

    Promise.all([
      fetch(`/api/teams?${params}`).then((r) => r.json()).catch((): { data: never[] } => ({ data: [] })),
      fetch(`/api/user-teams?${params}`).then((r) => r.json()).catch((): { data: never[] } => ({ data: [] })),
    ]).then(([nhl, user]) => {
      const nhlTeams: NHLTeam[] = nhl?.data || [];
      const userTeams: UserTeam[] = user?.data || [];
      // Dedupe by id (user-created teams may share names with NHL teams)
      const merged = [...nhlTeams, ...userTeams].filter(
        (t, i, arr) => arr.findIndex((x) => x.id === t.id) === i
      );
      setTeams(merged);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [filtersChanged, urlCountry, urlLevel, urlLeague]);

  // Auto-cleanup: if the URL has an impossible level+league combination
  // (e.g. ?level=college&league=NHL), clear the league so the dropdown
  // doesn't display a value that isn't in its option list. This handles
  // old URLs from before the cascading logic was added.
  useEffect(() => {
    if (urlLevel && urlLeague && LEAGUE_LEVELS[urlLeague] !== urlLevel) {
      setFilter('league', '');
    }
  }, [urlLevel, urlLeague, setFilter]);

  // Filter teams client-side based on the URL's ?q= (from a search bar submit)
  // and verified-only. Country/level/league are already applied server-side
  // (or via the refetch above), so we don't re-filter on them.
  const visibleTeams = useMemo(() => {
    const q = norm(urlQ);
    return teams.filter((t) => {
      // Search: match name, city, country, league name
      if (q) {
        const haystack = [
          t.name,
          t.city ?? '',
          t.country ?? '',
          'leagues' in t ? t.leagues?.name ?? '' : '',
        ].join(' ').toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (verifiedOnly) {
        if (!t.claimed_by_tier || !VERIFIED_TIERS.has(t.claimed_by_tier)) return false;
      }
      return true;
    });
  }, [teams, urlQ, verifiedOnly]);

  // Build the active-filter chips list (for the "Active filters" row).
  // Each chip has its own × button to clear just that one filter.
  const activeChips = useMemo(() => {
    const chips: Array<{ key: 'country' | 'level' | 'league'; label: string }> = [];
    if (urlCountry) chips.push({ key: 'country', label: urlCountry });
    if (urlLevel) {
      const opt = LEVEL_OPTIONS.find((l) => l.value === urlLevel);
      chips.push({ key: 'level', label: opt ? opt.label : urlLevel });
    }
    if (urlLeague) chips.push({ key: 'league', label: urlLeague });
    return chips;
  }, [urlCountry, urlLevel, urlLeague]);

  // Leagues available in the <select> given the current level. If a level
  // is set, only leagues in that level are shown — preventing the user
  // from picking combinations that don't exist (e.g. Level=College +
  // League=NHL). When no level is set, all topLeagues are shown.
  const availableLeagues = useMemo(
    () => leaguesForLevel((urlLevel as Level | '') || ''),
    [leaguesForLevel, urlLevel]
  );

  // Countries available in the <select> given the current level/league.
  // Cascading: when level or league is set, only countries with active
  // teams matching that filter are shown. E.g. League=NHL → US, Canada.
  // When both filter AND level are set, only countries with teams in
  // leagues matching BOTH are shown.
  const availableCountries = useMemo(() => {
    // Convert the array-shaped map back to a real Map for lookups.
    const map = new Map<string, Set<string>>(countryLeaguesMap.map(([k, v]) => [k, new Set(v)]));
    if (!urlLevel && !urlLeague) return topCountries;

    return topCountries.filter((c) => {
      const countryLeagues = map.get(c.name);
      if (!countryLeagues) return false;
      // The country has at least one league that matches the current filter.
      if (urlLeague) {
        // Specific league selected — country must have that exact league
        return countryLeagues.has(urlLeague);
      }
      // Only level selected — country must have at least one league in that level
      return Array.from(countryLeagues).some((lg) => LEAGUE_LEVELS[lg] === urlLevel);
    });
  }, [countryLeaguesMap, topCountries, urlLevel, urlLeague]);

  // Auto-cleanup: if the URL has a country that's no longer valid for the
  // current level/league (e.g. legacy URL with Level=Pro + Country=Thailand),
  // clear the country on the next render.
  useEffect(() => {
    if (urlCountry && urlLevel && urlLeague) {
      const map = new Map<string, Set<string>>(countryLeaguesMap.map(([k, v]) => [k, new Set(v)]));
      const countryLeagues = map.get(urlCountry);
      const hasMatch = countryLeagues
        ? countryLeagues.has(urlLeague)
        : false;
      if (!hasMatch) setFilter('country', '');
    }
  }, [urlCountry, urlLevel, urlLeague, countryLeaguesMap, setFilter]);

  const hasFilters = activeChips.length > 0 || verifiedOnly;

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
      <div style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0 }}>
          <div className="label">Directory</div>
          <h1 className="font-sport" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: '#fff', letterSpacing: '0.02em', lineHeight: 1 }}>
            All Hockey Teams
          </h1>
        </div>
        <div style={{ paddingTop: '0.25rem' }}>
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

      {/* Search bar — homepage aesthetic, scoped to teams.
          Search is for navigation (click result → entity page). It does NOT
          narrow the visible grid. To narrow the grid, use the ?q= URL param
          (e.g. landing here via the search bar's "See all" link). */}
      <div style={{ marginBottom: '1.25rem' }}>
        <CategorySearchBar category="team" page="/directory/teams" maxWidth={600} />
      </div>

      {/* Filter bar — real <select> for each, allow-deselect with empty option.
          Synced to URL. Each filter change triggers a single refetch. */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: '0.625rem', alignItems: 'center',
        marginBottom: '1rem', padding: '0.75rem 1rem',
        background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 4,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: '#555555' }}>
          <FilterIcon className="w-4 h-4" />
        </div>

        {/* Level select */}
        <select
          value={urlLevel}
          onChange={(e) => setFilter('level', e.target.value)}
          className="input-field"
          aria-label="Filter by level"
          style={{
            paddingRight: '1.75rem',
            flex: '1 1 130px',
            minWidth: 0,
            cursor: 'pointer',
            fontSize: '0.8125rem',
            fontWeight: urlLevel ? 700 : 400,
            color: urlLevel ? '#FFB81C' : 'rgba(255,255,255,0.75)',
            border: `1.5px solid ${urlLevel ? '#FFB81C' : 'rgba(255,255,255,0.15)'}`,
          }}
        >
          {LEVEL_OPTIONS.map((opt) => (
            <option key={opt.value || 'all'} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        {/* League select — top leagues filtered by current level.
            Cascading: when level is set, only leagues in that level are
            available. Pairs with setFilter's auto-level-updater so the two
            filters always stay consistent. */}
        <select
          value={urlLeague}
          onChange={(e) => setFilter('league', e.target.value)}
          className="input-field"
          aria-label="Filter by league"
          disabled={availableLeagues.length === 0}
          style={{
            paddingRight: '1.75rem',
            flex: '1 1 160px',
            minWidth: 0,
            cursor: 'pointer',
            fontSize: '0.8125rem',
            fontWeight: urlLeague ? 700 : 400,
            color: urlLeague ? '#FFB81C' : 'rgba(255,255,255,0.75)',
            border: `1.5px solid ${urlLeague ? '#FFB81C' : 'rgba(255,255,255,0.15)'}`,
            opacity: availableLeagues.length === 0 ? 0.5 : 1,
          }}
        >
          <option value="">
            {urlLevel
              ? `All ${LEVEL_OPTIONS.find((o) => o.value === urlLevel)?.label.toLowerCase() ?? urlLevel} leagues`
              : 'All leagues'}
          </option>
          {availableLeagues.map((l) => (
            <option key={l.slug} value={l.name}>{l.name}</option>
          ))}
        </select>

        {/* Country select — cascading. When level or league is set, only
            countries with active teams in that filter are shown. E.g.
            League=NHL → US, Canada. When no filter, all topCountries. */}
        <select
          value={urlCountry}
          onChange={(e) => setFilter('country', e.target.value)}
          className="input-field"
          aria-label="Filter by country"
          disabled={availableCountries.length === 0}
          style={{
            paddingRight: '1.75rem',
            flex: '1 1 150px',
            minWidth: 0,
            cursor: 'pointer',
            fontSize: '0.8125rem',
            fontWeight: urlCountry ? 700 : 400,
            color: urlCountry ? '#FFB81C' : 'rgba(255,255,255,0.75)',
            border: `1.5px solid ${urlCountry ? '#FFB81C' : 'rgba(255,255,255,0.15)'}`,
            opacity: availableCountries.length === 0 ? 0.5 : 1,
          }}
        >
          <option value="">
            {urlLeague
              ? `All countries with ${urlLeague}`
              : urlLevel
              ? `All ${LEVEL_OPTIONS.find((o) => o.value === urlLevel)?.label.toLowerCase() ?? urlLevel} countries`
              : 'All countries'}
          </option>
          {availableCountries.map((c) => (
            <option key={c.slug} value={c.name}>{c.name}</option>
          ))}
        </select>

        {/* Verified-only checkbox */}
        <button
          type="button"
          onClick={() => setVerifiedOnly((v) => !v)}
          aria-pressed={verifiedOnly}
          style={{
            background: verifiedOnly ? 'rgba(20,184,166,0.15)' : 'transparent',
            border: `1.5px solid ${verifiedOnly ? '#14B8A6' : 'rgba(255,255,255,0.2)'}`,
            color: verifiedOnly ? '#14B8A6' : 'rgba(255,255,255,0.6)',
            borderRadius: 3, padding: '0.5rem 0.875rem',
            fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
            letterSpacing: '0.07em', textTransform: 'uppercase',
            display: 'inline-flex', alignItems: 'center', gap: 6,
            flex: '0 0 auto',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Verified only
        </button>
      </div>

      {/* Active filter chips — each chip has its own × button to clear JUST that filter. */}
      {activeChips.length > 0 && (
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center',
          marginBottom: '1rem',
        }}>
          {activeChips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={() => clearOneFilter(chip.key)}
              aria-label={`Clear ${chip.key} filter (${chip.label})`}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                background: 'rgba(200,16,46,0.12)',
                border: '1px solid rgba(200,16,46,0.4)',
                color: '#fff',
                borderRadius: 999, padding: '0.3rem 0.7rem',
                fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                letterSpacing: '0.02em',
              }}
            >
              <span style={{ color: 'rgba(255,255,255,0.55)', textTransform: 'capitalize' }}>{chip.key}:</span>
              <span>{chip.label}</span>
              <span aria-hidden="true" style={{ color: 'rgba(255,255,255,0.7)', marginLeft: 2 }}>✕</span>
            </button>
          ))}
          <button
            type="button"
            onClick={clearAllFilters}
            style={{
              background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)',
              fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer',
              letterSpacing: '0.07em', textTransform: 'uppercase',
              padding: '0.3rem 0.5rem',
            }}
          >
            Clear all
          </button>
        </div>
      )}

      {/* Results count */}
      {!loading && (
        <p style={{ fontSize: '0.75rem', color: '#555555', letterSpacing: '0.04em', marginBottom: '1rem' }}>
          {visibleTeams.length === 0
            ? 'No results'
            : `${visibleTeams.length.toLocaleString()} ${visibleTeams.length === 1 ? 'team' : 'teams'}`}
          {urlQ ? ` matching “${urlQ}”` : ''}
          {!urlQ && !hasFilters ? ` in directory (${totalCount.toLocaleString()} total)` : ''}
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
                <p style={{ color: 'rgba(255,255,255,0.3)', marginBottom: '1rem' }}>
                  No teams found{urlQ ? ` for “${urlQ}”` : ''}{hasFilters ? ' with the current filters' : ''}.
                </p>
                {hasFilters && (
                  <button
                    type="button"
                    onClick={clearAllFilters}
                    style={{
                      color: 'var(--red)', background: 'none', border: 'none',
                      cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600,
                    }}
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            )
            : visibleTeams.map((team) => (
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
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-h)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = ''; (e.currentTarget as HTMLElement).style.transform = ''; }}
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
                    // eslint-disable-next-line @next/next/no-img-element
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
