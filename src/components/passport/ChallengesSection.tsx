import { supabaseAdmin } from '@/lib/supabase';
import { stampService } from '@/lib/passport/13-stamp-service';
import {
  resolveScope,
  type ChallengeScope,
  type ChallengePrefsRow,
  type UserProfileSummary,
  CAREER_MILESTONES_BY_TIER,
  tierShowsRinkCircuits,
  tierShowsGeographicChallenges,
  isCountryInScope,
  countryNameToIso,
  leagueNameToSlug,
} from '@/lib/passport/17-challenge-tailoring';

/**
 * Local helper: check if a league slug is in scope. Uses the imported
 * leagueNameToSlug to normalize, then checks activeLeagues.
 */
function isLeagueSlugInScope(slug: string | null, scope: ChallengeScope): boolean {
  if (!slug) return false;
  return scope.activeLeagues.includes(slug);
}

/**
 * Passport ChallengesSection — read-only public badge grid.
 *
 * Renders progress on three classes of challenges for a Hockey Passport
 * holder, computed live from `stamps` (public attendance) + the rinks /
 * leagues tables:
 *
 *   1. League Circuit — visit every rink in a named league (e.g. NHL, SHL)
 *   2. Geographic     — visit every rink in a country / state / province
 *   3. Career         — milestone counts tier-aware (youth 5/10/25/50/100,
 *                       pro 50/100/250/500/1000, coach 10/25/50/100 seasons, etc.)
 *
 * Public surface only. Counts from `getPublicAttendance()` which already
 * filters to visibility='public' confirmed stamps. No PII exposed.
 *
 * Per Arnel directive 2026-09-30 (memory/2026-09-30-passport-monetization.md):
 *   - Challenges are TAILORED to the user by account_type + location.
 *   - Default-on scope = home country + same-region peers + tier-default leagues.
 *   - Opt-in additions = passport_challenge_prefs row.
 *   - A PH player does NOT see "NHL Circuit" unless opted in.
 *   - A USA coach does NOT see "Philippines rinks" unless opted in.
 *
 * Used on /passport/[passportId] when the Passport is active + has
 * verification level 'id_verified' or higher (Hockey Passport holders).
 */

interface ChallengeDef {
  id: string;
  category: 'league' | 'geographic' | 'career';
  title: string;
  description: string;
  emoji: string;
  progress: number;
  goal: number;
  complete: boolean;
  /** Optional sub-text shown beneath the progress bar (e.g. "3 rinks left") */
  detail?: string;
  /** Optional accent color override */
  accent?: string;
}

interface ChallengesSectionProps {
  holderUserId: string;
  /** Theme variant: 'dark' for the premium public passport page (default), 'light' for embedded surfaces. */
  theme?: 'dark' | 'light';
}

/**
 * Map a `leagues.level` value to our challenge tier buckets.
 * leagues.level is 'professional' | 'junior' | 'amateur' | NULL per
 * the existing schema (see PublicTeamProfile.tsx).
 */
function derivePlayerLeagueLevel(
  claimedPlayer: any
): UserProfileSummary['playerLeagueLevel'] {
  const level: string | null | undefined = claimedPlayer?.teams?.leagues?.level;
  if (!level) return null;
  if (level === 'professional') return 'pro';
  if (level === 'junior') return 'youth';
  if (level === 'amateur') return 'adult_rec';
  return null;
}

/**
 * Resolve the user's challenge scope for tailoring.
 *
 * Fetches (in parallel):
 *   - profiles row (account_type, country, location)
 *   - profile_account_types rows (multi-account detection, parent derives team/organization via managed_profiles)
 *   - passport_challenge_prefs row (opt-in leagues + countries)
 *
 * Returns a ChallengeScope ready for filtering.
 */
async function resolveUserScope(holderUserId: string): Promise<ChallengeScope> {
  // Default to fan/global so unparseable rows still get a scope.
  const defaultUser: UserProfileSummary = {
    accountType: 'fan',
    country: null,
    location: null,
    hasClaimedPlayer: false,
    isParent: false,
    playerLeagueLevel: null,
  };

  try {
    const [profileRes, accountTypesRes, managedRes, prefsRes, playersRes] = await Promise.all([
      supabaseAdmin
        .from('profiles')
        .select('user_id, account_type, country, location')
        .eq('user_id', holderUserId)
        .maybeSingle(),
      supabaseAdmin
        .from('profile_account_types')
        .select('account_type')
        .eq('user_id', holderUserId),
      supabaseAdmin
        .from('managed_profiles')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', holderUserId),
      supabaseAdmin
        .from('passport_challenge_prefs')
        .select('opted_in_leagues, opted_in_countries')
        .eq('user_id', holderUserId)
        .maybeSingle(),
      // Detect claimed player + derive league level via team→leagues.level.
      // Players table has no league_level column; join through team.
      supabaseAdmin
        .from('players')
        .select('id, team_id, teams:team_id (league_id, leagues:league_id (level))')
        .eq('user_id', holderUserId)
        .maybeSingle(),
    ]);

    const profile = profileRes.data;
    const accountTypes = (accountTypesRes.data ?? []) as Array<{ account_type: string }>;
    const managedCount = managedRes.count ?? 0;
    const prefs: ChallengePrefsRow | null = prefsRes.data ?? null;
    const claimedPlayer = playersRes.data;

    const user: UserProfileSummary = {
      accountType:
        profile?.account_type ??
        (accountTypes.length > 0 ? accountTypes[0].account_type : null),
      country: profile?.country ?? null,
      location: profile?.location ?? null,
      hasClaimedPlayer: !!claimedPlayer,
      isParent: managedCount > 0,
      playerLeagueLevel: derivePlayerLeagueLevel(claimedPlayer),
    };

    return resolveScope(user, prefs);
  } catch (err) {
    console.error('[ChallengesSection] resolveUserScope failed:', err);
    return resolveScope(defaultUser, null);
  }
}

export default async function ChallengesSection({
  holderUserId,
  theme = 'dark',
}: ChallengesSectionProps): Promise<React.ReactElement | null> {
  // Uses the service-role client imported above (server-only).
  const attendance = await stampService.getPublicAttendance(holderUserId);

  // Resolve user scope (account_type + location + opt-in prefs).
  // Tailors which challenges are shown. Per 2026-09-30 directive.
  const scope = await resolveUserScope(holderUserId);

  if (attendance.rinkCount === 0 && attendance.eventCount === 0) {
    // No stamps yet — render an empty-state nudge so visitors understand the
    // section exists and is reachable, instead of a hole in the page.
    return (
      <section
        aria-label="Passport challenges"
        data-challenges-section
        data-state="empty"
        style={{
          margin: '32px auto 0',
          padding: '20px 18px',
          maxWidth: 560,
          background: theme === 'dark' ? 'rgba(15, 23, 42, 0.45)' : '#FFFFFF',
          border: theme === 'dark' ? '1px solid rgba(255, 184, 28, 0.18)' : '1px solid #E2E8F0',
          borderRadius: 12,
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.2)',
        }}
      >
        <h2
          style={{
            margin: '0 0 4px',
            fontFamily: "'Bebas Neue', Impact, sans-serif",
            fontSize: 22,
            letterSpacing: '0.06em',
            color: theme === 'dark' ? '#FFB81C' : '#1E1B4B',
          }}
        >
          Challenges
        </h2>
        <p style={{ margin: '0 0 8px', fontSize: 14, color: theme === 'dark' ? 'rgba(255,255,255,0.7)' : '#475569', lineHeight: 1.55 }}>
          This Passport has no public stamps yet. Stamp rinks as you visit them to start challenges like{' '}
          <strong>Finish the NHL Rink Circuit</strong>, <strong>All 5 rinks in Ontario</strong>, and{' '}
          <strong>50 Rinks Club</strong>.
        </p>
        <a
          href="/claim-your-listing?for=identity"
          data-challenges-cta="claim"
          style={{
            display: 'inline-block',
            marginTop: 8,
            padding: '10px 16px',
            background: '#FFB81C',
            color: '#1E1B4B',
            fontWeight: 700,
            fontSize: 13,
            borderRadius: 8,
            textDecoration: 'none',
            border: '1px solid rgba(0,0,0,0.06)',
          }}
        >
          🏒 Start My Hockey Passport
        </a>
      </section>
    );
  }

  // 1. League Circuit — count distinct leagues the holder has stamped at
  // TAILORED by user scope (Arnel 2026-09-30). Coaches/scouts/orgs don't
  // see rink circuits. Other users only see leagues in their active scope.
  const stampedRinkIds = attendance.rinks.map((r) => r.id);
  let leagueChallenges: ChallengeDef[] = [];
  if (stampedRinkIds.length > 0 && tierShowsRinkCircuits(scope.tier)) {
    // Resolve each stamped rink to its league (via the leagues<->rinks link)
    const { data: rinkLeagues } = await supabaseAdmin
      .from('rinks')
      .select('id, name, league_id, leagues:league_id (id, name)')
      .in('id', stampedRinkIds);
    const leagueBuckets = new Map<
      string,
      { name: string; stamped: Set<string>; total: number }
    >();
    // For each league the holder has touched, fetch the total rink count.
    const leagueIdsTouched = new Set<string>();
    (rinkLeagues ?? []).forEach((rk: any) => {
      const lg = rk.leagues;
      if (!lg) return;
      leagueIdsTouched.add(lg.id);
      if (!leagueBuckets.has(lg.id)) {
        leagueBuckets.set(lg.id, { name: lg.name, stamped: new Set(), total: 0 });
      }
      leagueBuckets.get(lg.id)!.stamped.add(rk.id);
    });
    // Fetch totals in parallel.
    if (leagueIdsTouched.size > 0) {
      const { data: leagueRinkCounts } = await supabaseAdmin
        .from('rinks')
        .select('league_id')
        .in('league_id', Array.from(leagueIdsTouched));
      (leagueRinkCounts ?? []).forEach((rk: any) => {
        if (rk.league_id && leagueBuckets.has(rk.league_id)) {
          leagueBuckets.get(rk.league_id)!.total += 1;
        }
      });
    }
    leagueChallenges = (Array.from(leagueBuckets.values())
      .filter((b) => {
        // TAILORING: only show leagues in user's active scope
        const slug = leagueNameToSlug(b.name);
        if (!isLeagueSlugInScope(slug, scope)) return false;
        return b.total > 0 && b.stamped.size / b.total >= 0.15; // only surface challenges where ≥15% complete
      })
      .map((b) => ({
        id: `league-${b.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        category: 'league' as const,
        title: `${b.name} Circuit`,
        description: `Stamp every rink in the ${b.name}.`,
        emoji: '🏆',
        progress: b.stamped.size,
        goal: b.total,
        complete: b.stamped.size === b.total,
        detail: `${b.total - b.stamped.size} rink${b.total - b.stamped.size === 1 ? '' : 's'} left`,
      }))
      .sort((a, b) => b.progress / b.goal - a.progress / a.goal)
      .slice(0, 4));
  }

  // 2. Geographic — count stamped rinks per country
  let geoChallenges: ChallengeDef[] = [];
  if (stampedRinkIds.length > 0 && tierShowsGeographicChallenges(scope.tier)) {
    const { data: rinkCountries } = await supabaseAdmin
      .from('rinks')
      .select('id, country')
      .in('id', stampedRinkIds);
    const countryBuckets = new Map<string, { name: string; stamped: Set<string> }>();
    (rinkCountries ?? []).forEach((rk: any) => {
      const country = rk.country || 'Unknown';
      if (!countryBuckets.has(country)) {
        countryBuckets.set(country, { name: country, stamped: new Set() });
      }
      countryBuckets.get(country)!.stamped.add(rk.id);
    });
    geoChallenges = (Array.from(countryBuckets.values())
      .filter((b) => {
        // TAILORING: only show countries in user's active scope.
        // A PH player never sees "Rinks in Canada" unless opted in.
        const iso = countryNameToIso(b.name);
        if (!isCountryInScope(iso, scope)) return false;
        return b.stamped.size >= 3; // surface only meaningful country presence
      })
      .map((b) => ({
        id: `geo-${b.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        category: 'geographic' as const,
        title: `Rinks in ${b.name}`,
        description: `Stamp every rink in ${b.name}.`,
        emoji: '🌎',
        progress: b.stamped.size,
        goal: b.stamped.size, // for geographic, "goal" is currently undefined — treat as in-progress
        complete: false,
        accent: '#0EA5E9',
      }))
      .sort((a, b) => b.progress - a.progress)
      .slice(0, 3));
  }

  // 3. Career milestones — tier-aware thresholds (Arnel 2026-09-30).
  // Youth: 5/10/25/50/100 · College: 10/25/50/100/250 · Adult rec: 3/5/10/25/50
  // Pro: 50/100/250/500/1000 · Coach: 10/25/50/100 (seasons)
  // Scout: 25/50/100/250 (prospects) · Official: 10/25/50/100/250 (games)
  // Fan: 3/5/10/25 · Org: 5/10/25/50
  const careerMilestones = CAREER_MILESTONES_BY_TIER[scope.tier] ?? [10, 25, 50, 100, 250, 500];
  const current = attendance.rinkCount;
  const careerChallenges: ChallengeDef[] = careerMilestones
    .filter((m) => current >= m * 0.4) // show milestones within reach
    .map((m) => ({
      id: `career-${m}`,
      category: 'career' as const,
      title: m === 100 ? '100 Rinks Club' : m === 500 ? '500 Rinks — Half-K' : `${m} Rinks`,
      description: `Stamp ${m} different rinks in your lifetime Hockey Passport.`,
      emoji: m === 100 ? '⭐' : m === 500 ? '💎' : '🎯',
      progress: Math.min(current, m),
      goal: m,
      complete: current >= m,
      detail: current >= m ? 'Earned' : `${m - current} to go`,
      accent: m === 100 ? '#C8102E' : m === 500 ? '#7C3AED' : '#FFB81C',
    }));

  const all = [...leagueChallenges, ...geoChallenges, ...careerChallenges];

  if (all.length === 0) {
    return null;
  }

  return (
    <section
      aria-label="Passport challenges"
      data-challenges-section
      data-state="populated"
      data-challenge-count={all.length}
      style={{
        margin: '32px auto 0',
        padding: '20px 18px',
        maxWidth: 560,
        background: theme === 'dark' ? 'rgba(15, 23, 42, 0.45)' : '#FFFFFF',
        border: theme === 'dark' ? '1px solid rgba(255, 184, 28, 0.18)' : '1px solid #E2E8F0',
        borderRadius: 12,
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.2)',
      }}
    >
      <h2
        style={{
          margin: '0 0 4px',
          fontFamily: "'Bebas Neue', Impact, sans-serif",
          fontSize: 22,
          letterSpacing: '0.06em',
          color: theme === 'dark' ? '#FFB81C' : '#1E1B4B',
        }}
      >
        Challenges
      </h2>
      <p
        style={{
          margin: '0 0 16px',
          fontSize: 13,
          color: '#64748B',
          lineHeight: 1.45,
        }}
      >
        Public progress on lifetime challenges. Earned badges show on your Hockey Passport and stay shareable at one URL.
      </p>
      <ul
        data-challenge-list
        style={{
          listStyle: 'none',
          padding: 0,
          margin: 0,
          display: 'grid',
          gap: 12,
        }}
      >
        {all.map((c) => {
          const pct = Math.min(100, Math.round((c.progress / Math.max(1, c.goal)) * 100));
          const accent = c.accent || '#FFB81C';
          return (
            <li
              key={c.id}
              data-challenge-id={c.id}
              data-challenge-category={c.category}
              data-challenge-progress={c.progress}
              data-challenge-goal={c.goal}
              data-challenge-complete={c.complete ? 'true' : 'false'}
              style={{
                border: theme === 'dark' ? '1px solid rgba(255,255,255,0.12)' : '1px solid #E2E8F0',
                borderRadius: 10,
                padding: '12px 14px',
                background: c.complete
                  ? (theme === 'dark' ? 'rgba(255, 184, 28, 0.18)' : '#FEFCE8')
                  : (theme === 'dark' ? 'rgba(255,255,255,0.04)' : '#FAFBFC'),
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                  gap: 8,
                  marginBottom: 6,
                }}
              >
                <h3
                  style={{
                    margin: 0,
                    fontSize: 15,
                    fontWeight: 700,
                    color: theme === 'dark' ? '#F8FAFC' : '#0F172A',
                    lineHeight: 1.2,
                  }}
                >
                  <span aria-hidden style={{ marginRight: 6 }}>{c.emoji}</span>
                  {c.title}
                </h3>
                <span
                  data-challenge-pct
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: c.complete ? '#15803D' : '#475569',
                    flexShrink: 0,
                  }}
                >
                  {c.complete ? '✓ Earned' : `${pct}%`}
                </span>
              </div>
              <p
                style={{
                  margin: '0 0 8px',
                  fontSize: 13,
                  color: theme === 'dark' ? 'rgba(255,255,255,0.6)' : '#475569',
                  lineHeight: 1.45,
                }}
              >
                {c.description}
              </p>
              <div
                role="progressbar"
                aria-valuenow={c.progress}
                aria-valuemin={0}
                aria-valuemax={c.goal}
                aria-label={`${c.title} progress`}
                style={{
                  height: 8,
                  borderRadius: 999,
                  background: theme === 'dark' ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${pct}%`,
                    height: '100%',
                    background: accent,
                    transition: 'width 200ms ease-out',
                  }}
                />
              </div>
              {c.detail && (
                <p
                  style={{
                    margin: '6px 0 0',
                    fontSize: 12,
                    color: theme === 'dark' ? 'rgba(255,255,255,0.5)' : '#64748B',
                  }}
                >
                  {c.detail}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}