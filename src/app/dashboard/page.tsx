import { auth, currentUser } from '@clerk/nextjs/server';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';
import { OWNER_EMAILS } from '@/lib/admin-auth';
import { isIdentityVerified } from '@/lib/identity-verified';
import { TierBadge } from '@/components/TierBadge';
import { FounderBadge } from '@/components/FounderBadge';
import UsernameBanner from '@/components/UsernameBanner';
import AccountTypeBadges from '@/components/AccountTypeBadges';
import TypeSectionCard from '@/components/dashboard/TypeSectionCard';
import InboxCard from '@/components/dashboard/InboxCard';
import AttentionCard from '@/components/dashboard/AttentionCard';
import { OnboardingChecklist } from '@/components/OnboardingChecklist';
import { loadDashboardTypeData, personalStatus, organizationStatus, businessStatus, type WorkspaceStatus } from '@/components/dashboard/dashboardTypeData';
import { loadInboxSummary } from '@/components/dashboard/dashboardInboxData';
import { loadAttentionSummary } from '@/lib/dashboard/attentionData';
import { isAccountType } from '@/components/dashboard/dashboardTypes';
import type { AccountType } from '@/components/dashboard/dashboardTypes';
import { tierAtLeast } from '@/lib/connections';
import { tierAtLeastSameTrack } from '@/lib/tier-gate';
import { getWorkspaceAccess, tierDisplayName } from '@/lib/dashboard/workspaces';
import { getDismissedWorkspaceIds } from '@/lib/dashboard/dismissedWorkspaces';
import DismissWorkspaceButton from '@/components/dashboard/DismissWorkspaceButton';
import HiddenWorkspacesFooter from '@/components/dashboard/HiddenWorkspacesFooter';
import FamilySetupWizard from '@/components/family/FamilySetupWizard';
import { accountTypeToPersona, type WizardPersona } from '@/lib/wizardState';
import ConsumerCards, { loadConsumerCardData } from '@/components/dashboard/ConsumerCards';
import PlayerPracticePulse, { loadPracticePulseData, type PracticePulseData } from '@/components/dashboard/PlayerPracticePulse';
import FreeAgentToggle, { loadFreeAgentProfile } from '@/components/dashboard/FreeAgentToggle';

/**
 * OWNER_EMAILS is defined in src/lib/admin-auth.ts - single source of truth.
 * The Founder badge + super_admin-level views fire for any Clerk session whose
 * primary email is in that set, regardless of which `profiles.user_id` row
 * maps to that Clerk account. This protects against Clerk OAuth flows
 * creating a separate duplicate user (e.g. when account-linking is off) -
 * the rendered dashboard still reflects ownership.
 */



export default async function DashboardPage() {
  const session = await auth();
  const cu = await currentUser();
  const userEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
  const userId = await resolveCanonicalUserId(session.userId, userEmail);
  if (!session.userId) redirect('/login');

  // Look up role BEFORE rendering so the catch block knows whether to surface
  // debug details. Cheap query, isolated from renderDashboard's broader scope.
  // Fail-closed: if the role lookup itself throws, treat as non-admin.
  // We also OR-in owner-email match because Clerk OAuth may have created a
  // separate "free" user for the same person - we still want Founder context.
  let isSuperAdmin = false;
  let ownerEmail = '';
  try {
    const { data: roleRow } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();
    isSuperAdmin = roleRow?.role === 'super_admin';
    // Resolve current email from Clerk session (used for OWNER_EMAILS fallback).
    const cu = await currentUser();
    ownerEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
    if (!isSuperAdmin && OWNER_EMAILS.has(ownerEmail)) isSuperAdmin = true;
  } catch {
    isSuperAdmin = false;
  }

  // Debug-mode override (e.g. staging envs): DEBUG_DASHBOARD_ERRORS=true
  // exposes the details block to ALL users. Never enable in production.
  const forceDebugAll =
    typeof process !== 'undefined' &&
    process.env?.DEBUG_DASHBOARD_ERRORS === 'true';

  // Hard safety net: any error inside the dashboard render must NOT 500 the user.
  // Instead, show a minimal fallback that tells them the dashboard hit a snag and
  // lets them back out. The real error is logged server-side (Vercel) for diagnosis.
  // This protects against e.g. a new migration dropping a column the page reads,
  // a transient Supabase hiccup, or a malformed Clerk session payload.
  try {
    return await renderDashboard(userId);
  } catch (err: any) {
    // Always log structured JSON for grep-ability in Vercel Logs UI (search
    // "dashboard-error"). userId + name + message + first 3 stack frames +
    // timestamp. This fires for every user, every time - diagnostics only.
    console.error('[dashboard-error]', JSON.stringify({
      userId,
      name: err?.name,
      message: err?.message,
      digest: (err as any)?.digest,
      stack: typeof err?.stack === 'string' ? err.stack.split('\n').slice(0, 3).join('\n') : undefined,
      timestamp: new Date().toISOString(),
    }));

    // NEVER show raw error info to non-admin users - exposes table/column names,
    // provider APIs, and internal stack info. Only super_admin accounts get the
    // collapsible debug details. Everyone else gets the generic message + retry.
    const showDebug = forceDebugAll || isSuperAdmin;

    // Show a sanitized hint in the UI (collapsed by default). We expose only the
    // error name + message + digest - no stack, no userId, no internals. If the user
    // reports "Dashboard hit a snag", we ask them to expand this block and paste.
    const errorName = typeof err?.name === 'string' ? err.name : 'Error';
    const errorMessage = typeof err?.message === 'string' ? err.message : 'Unknown error';
    const errorDigest = (err as any)?.digest ? `\nRef: ${(err as any).digest}` : '';

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div
          style={{
            background: '#0f0f0f',
            border: '1px solid #1e1e1e',
            borderRadius: 12,
            padding: '1.75rem',
          }}
        >
          <h2
            style={{
              fontFamily: "'Bebas Neue', Impact, sans-serif",
              fontSize: '1.5rem',
              color: '#fff',
              letterSpacing: '0.04em',
              margin: '0 0 0.5rem',
            }}
          >
            Dashboard hit a snag
          </h2>
          <p style={{ color: '#aaa', fontSize: '0.9rem', margin: '0 0 1rem' }}>
            We couldn&rsquo;t load your dashboard just now. Your account and data
            are safe - try refreshing in a minute, or head back to the home page
            in the meantime.
          </p>
          {showDebug ? (
            <details style={{ margin: '0 0 1rem' }}>
              <summary style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', cursor: 'pointer', userSelect: 'none' }}>
                Error details (tap to expand)
              </summary>
              <pre style={{
                color: 'rgba(255,255,255,0.55)',
                fontSize: '0.7rem',
                margin: '0.5rem 0 0',
                padding: '0.5rem 0.75rem',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 4,
                overflow: 'auto',
                maxHeight: 160,
                fontFamily: 'monospace',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}>{errorName}: {errorMessage}{errorDigest}</pre>
            </details>
          ) : null}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Link
              href="/dashboard"
              style={{
                padding: '0.5rem 1rem',
                background: '#C8102E',
                color: '#fff',
                borderRadius: 6,
                textDecoration: 'none',
                fontSize: '0.85rem',
                fontWeight: 700,
              }}
            >
              Retry
            </Link>
            <Link
              href="/"
              style={{
                padding: '0.5rem 1rem',
                background: 'rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.8)',
                borderRadius: 6,
                textDecoration: 'none',
                fontSize: '0.85rem',
                fontWeight: 600,
              }}
            >
              Back to home
            </Link>
          </div>
        </div>
      </div>
    );
  }
}

async function renderDashboard(userId: string) {
  const user = await currentUser();
  const firstName = user?.firstName || '';
  const lastName = user?.lastName || '';
  const email = user?.emailAddresses?.[0]?.emailAddress || '';
  const avatarUrl = user?.imageUrl || '';

  // Owner-email canonical lookup (same pattern as identity page 4700eee,
  // dashboard layout 8fb9823, subscription page 1b45415). If the Clerk
  // session resolves to an orphan user_id and the email is in OWNER_EMAILS,
  // read the canonical row instead. Without this, the dashboard renders
  // null for username/display_name/etc. → the UsernamePromptModal pops up
  // and suggests 'arnel' (auto-slug from display name), which the API
  // then rejects as 'already taken' (taken by Arnel's real row).
  let profileUserId = userId;
  try {
    if (OWNER_EMAILS.has(email)) {
      const { data: byEmail } = await supabaseAdmin
        .from('profiles')
        .select('user_id')
        .ilike('email', email)
        .neq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (byEmail) profileUserId = byEmail.user_id;
    }
  } catch { /* fall through */ }

  // Profile completeness + tier
  let profile: any = null;
  try {
    const { data } = await supabaseAdmin
      .from('profiles')
      .select('bio, location, tier, is_founding_member, created_at, role, display_name, username, avatar_url, family_setup_completed_at')
      .eq('user_id', profileUserId)
      .maybeSingle();
    profile = data;
  } catch (e) {
    console.error('[dashboard] profiles query failed:', e);
  }

  const isSuperAdmin = profile?.role === 'super_admin';
  // Founder = role-based OR email-canonical. The email fallback is the
  // fix for Clerk OAuth creating a duplicate user_id - even if the new
  // Clerk account's profile row has no role, the dashboard still knows
  // the signed-in email is the owner's.
  const isFounder = isSuperAdmin || OWNER_EMAILS.has(email);
  // For the OG founder, "Member since" should reflect when they actually started the project
  // (e.g. domain registration date), not when their Clerk account was created.
  const founderSince = 'February 2019';
  const memberSinceDate = isFounder
    ? founderSince
    : profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : null;

  // Account types (Phase 0.1 - multi-type).
  let accountTypeRows: Array<{ account_type: string; is_primary: boolean }> = [];
  try {
    const { data } = await supabaseAdmin
      .from('profile_account_types')
      .select('account_type, is_primary')
      .eq('user_id', userId);
    accountTypeRows = data || [];
  } catch (e) {
    console.error('[dashboard] profile_account_types query failed:', e);
  }

  const types: AccountType[] = (accountTypeRows || [])
    .map((r: { account_type: string }) => r.account_type)
    .filter(isAccountType);
  const primaryRow = (accountTypeRows || []).find((r: { is_primary: boolean }) => r.is_primary);
  const primary = (primaryRow?.account_type && isAccountType(primaryRow.account_type) ? primaryRow.account_type : null) as AccountType | null;

  // 2026-07-31 (Arnel-flagged dashboard perf pass): the previous serial chain
  // here stacked ~30+ Supabase queries one-after-the-other. From Cebu (or any
  // far-from-Chicago region) each query is ~280ms RTT, so the page server
  // component took 8-12 seconds before any rendering. Dashboard layout was
  // already parallelized in commit 697f93f; this is the page-side pass.
  //
  // Everything below is fired in a single Promise.all so the slowest single
  // query bounds the wall time. Each sub-load (loadDashboardTypeData,
  // loadInboxSummary, loadAttentionSummary, loadPracticePulseData) has been
  // internally parallelized in this same commit - see their updated impls.
  //
  // Why loadConsumerCardData takes a placeholder `identityVerified=false`:
  // `isIdentityVerifiedForUser` is one of the parallel queries, but
  // `consumerCardData.identityVerified` is rendered into the verification card
  // ("Verified" vs "Not verified"). We override the field after the parallel
  // block with the resolved value so the consumer card stays correct.
  const EMPTY_PRACTICE: PracticePulseData = { suggestions: [], activeSession: null, weeklyCount: 0, monthlyCount: 0, loaded: false };
  const isPlayer = types.includes('player');

  const [
    typeData,
    dismissedIds,
    attention,
    inbox,
    practicePulse,
    freeAgentProfile,
    myTeamsRaw,
    isIdentityVerifiedForUser,
    wizardState,
    consumerCardDataRaw,
  ] = await Promise.all([
    loadDashboardTypeData(userId),
    getDismissedWorkspaceIds(),
    loadAttentionSummary(userId),
    loadInboxSummary(userId),
    isPlayer ? loadPracticePulseData(userId) : Promise.resolve(EMPTY_PRACTICE),
    isPlayer ? loadFreeAgentProfile(userId) : Promise.resolve(null),
    // Private team workspaces the user is a member of (Day 3 team hub).
    // v2: also fetches age_label, age_min, age_max for grouping.
    // Wrapped in Promise try/catch so a missing table doesn't 500 the whole dashboard.
    (async (): Promise<Array<{ id: string; slug: string; name: string; short_name: string | null; country_code: string | null; age_label: string | null; age_min: number | null; age_max: number | null; organization_id: string | null; organization: { id: string; name: string; slug: string | null } | null; is_active: boolean; role: string }>> => {
      try {
        const { data } = await supabaseAdmin
          .from('team_members')
          .select('role, team_workspaces:team_id ( id, slug, name, short_name, country_code, age_label, age_min, age_max, organization_id, is_active, organization:organizations(id, name, slug) )')
          .eq('user_id', userId)
          .is('left_at', null)
          .order('joined_at', { ascending: false })
          .limit(10);
        return (data || []).map((row: any) => ({
          ...(row.team_workspaces || {}),
          role: row.role,
        })) as any;
      } catch (e) {
        console.error('[dashboard] team_members query failed:', e);
        return [];
      }
    })(),
    // Piece E (2026-06-24): check if user is identity-verified, using the
    // hardened helper from Piece C (requires real approved didit_sessions
    // row, not just the bare profiles.identity_verified_at flag). Drives
    // the verify-identity banner at the top of the dashboard. Fails
    // closed - if any of the 3 conditions fail, banner shows.
    isIdentityVerified(userId),
    // Family Setup Wizard state (Phase 1a, prep doc §3.2).
    // 2026-07-21: widened from parent-only to persona-aware (Arnel-flagged
    // "setup is too parent-centric"). Now computes three additional state
    // booleans for non-parent personas: hasCoachProfile, hasOrgMembership,
    // hasOfficialRegistration. The persona itself is derived above from
    // profile_account_types.primary (falls back to types[0], then 'generic').
    //
    // Fail-closed: any query error yields 'false' for that piece of state,
    // which means the step is shown as "not done" - never as silently done.
    loadWizardState(userId),
    // Consumer dashboard cards data (Phase 1a, prep doc §3.3). Visible to
    // ALL personal-workspace users. LoadConsumerCardData returns safe defaults
    // on any error - never throws. We pass identityVerified=false here and
    // override the field after the parallel block once the real value is
    // resolved (otherwise the verification card would briefly show "Not
    // verified" before this batch completes).
    loadConsumerCardData(userId, profile?.tier ?? 'free', false),
  ]);

  // BUG #15 FIX: Filter out teams with is_active=false (deactivated teams
  // should not show in the user's dashboard). Matches the filter applied
  // in /dashboard/team/[slug]/page.tsx.
  const myTeams = (myTeamsRaw || [])
    .filter((t: any) => t.id && t.slug && t.is_active);

  // Override the placeholder identityVerified on the consumer card data
  // with the real resolved value (see Promise.all comment above).
  const consumerCardData = { ...consumerCardDataRaw, identityVerified: isIdentityVerifiedForUser };

  const {
    wizardHasChildren,
    wizardHasTeamMembership,
    wizardHasDocuments,
    wizardHasCoachProfile,
    wizardHasOrgMembership,
    wizardHasOfficialRegistration,
    wizardHasCountry,
  } = wizardState;

  // Wizard persona selection (2026-07-21). Order of preference:
  //   1. profile_account_types.primary (explicit user choice in onboarding)
  //   2. first entry in profile_account_types.account_type array
  //   3. 'generic' (multi-persona fan-only or unrecognized)
  // Maps AccountType → WizardPersona via accountTypeToPersona() in the wizard.
  let wizardPersonaRaw: string | null = primary;
  if (!wizardPersonaRaw && types.length > 0) {
    wizardPersonaRaw = types[0];
  }
  if (!wizardPersonaRaw) {
    wizardPersonaRaw = 'fan';
  }

  // Family Setup Wizard gate (Phase 1a, prep doc §1 + §3.5).
  // 2026-07-21: widened from `types.includes('parent')` to `types.length > 0`.
  // The wizard now branches copy + steps on persona (parent/coach/player/
  // official/operator/generic), so any persona with setup remaining sees a
  // version of the wizard. Tier gate unchanged.
  // 2026-07-22 (Arnel): the wizard is MANDATORY. No dismiss option. The
  // wizard renders until family_setup_completed_at is set. The wizard
  // component itself calls /api/family/setup-state (mark_complete) via
  // useEffect when every reachable step is done or comingNext.
  //   1. account_type is non-empty (any persona; branches on persona inside)
  //   2. tier is identity_plus+ OR business_listing+ (no free tier)
  //   3. family_setup_completed_at IS NULL (wizard not yet completed)
  // The column is nullable; if the migration has not been applied yet,
  // .family_setup_completed_at will be undefined which IS NULL - the
  // wizard will render even before the migration runs. This is intentional:
  // it lets the wizard be visible the moment the code ships, with the API
  // route handling the migration-not-applied 503 error on mark_complete.
  const wizardTierOk =
    tierAtLeastSameTrack(profile?.tier ?? 'free', 'identity_plus') ||
    tierAtLeastSameTrack(profile?.tier ?? 'free', 'business_listing');
  const wizardVisible =
    types.length > 0 &&
    wizardTierOk &&
    profile?.family_setup_completed_at == null;

  const completeness: { field: string; done: boolean; href: string; hint: string }[] = [
    { field: 'Display name', done: !!(profile?.display_name || firstName), href: '/dashboard/profile', hint: 'Add your first and last name' },
    { field: 'Avatar', done: !!avatarUrl, href: '/dashboard/profile', hint: 'Upload a profile photo' },
    { field: 'Bio', done: !!profile?.bio, href: '/dashboard/profile', hint: 'Tell people who you are' },
    { field: 'Location', done: !!profile?.location, href: '/dashboard/profile', hint: 'Add your city so people nearby can find you' },
    { field: 'Account type', done: types.length > 0, href: '/dashboard/profile#account-types', hint: 'Tell us what you do in hockey' },
  ];
  const completenessPct = Math.round((completeness.filter(c => c.done).length / completeness.length) * 100);
  const firstMissing = completeness.find(c => !c.done);

  // 2026-08-13: per-child diagnostic wrapper. RSC reconciliation errors
  // don't propagate to the parent try/catch in renderDashboard, so we
  // localize them here. Once the failing child is identified, revert to
  // bare rendering and fix the root cause.
  function safe(name: string, fn: () => React.ReactNode): React.ReactNode {
    try { return fn(); }
    catch (e: any) {
      console.error(`[dashboard child] ${name}:`, e?.message, e?.stack?.split('\n').slice(0, 3).join('\n'));
      return null;
    }
  }

  try {
    return (
      <div>
        <div>Group 1c: UsernameBanner + Welcome + AttentionCard (REAL data with logging)</div>
        {profile?.username ? null : (
          <UsernameBanner
            displayName={profile?.display_name || firstName || 'RinkStop Member'}
          />
        )}
        <div data-testid="welcome-card">
          <h1>{firstName ? `Welcome back, ${firstName}` : 'Welcome to RinkStop'}</h1>
          <TierBadge tier={profile?.tier ?? 'free'} size="sm" />
          {isFounder ? <FounderBadge /> : null}
        </div>
        <AttentionCard data={attention} />
      </div>
    );
  } catch (renderErr: any) {
    // 2026-08-13: Render error INLINE so we can see the actual message in the HTML.
    return (
      <div style={{ padding: '2rem', color: '#fff', background: '#0f0f0f', borderRadius: 8, margin: '2rem' }}>
        <h2 style={{ color: '#C8102E' }}>RENDER ERROR (visible in HTML for diagnosis)</h2>
        <pre style={{ background: '#1a1a1a', padding: '1rem', borderRadius: 4, overflow: 'auto', fontSize: '0.8rem' }}>
          {`message: ${renderErr?.message}\n\nstack: ${renderErr?.stack?.split('\n').slice(0, 8).join('\n')}\n\nattention data: ${JSON.stringify(attention, null, 2)}`}
        </pre>
      </div>
    );
  }

}

/**
 * WorkspaceHub - renders the 3 workspace cards (Personal / Organization / Business)
 * with lock-aware UX per Arnel's "never hide locked features" rule.
 *
 * Card visual states:
 *   - Fully available: full opacity, primary CTA "Open Workspace →"
 *   - Unlocked but tier-gated: full opacity on card, 🔒 icon on title,
 *     subpages listed but each link shows 🔒, primary CTA "Upgrade to [tier] →"
 *   - Account-type-locked: 70% opacity on card, 🔒 icon on title,
 *     subpages listed but each link shows 🔒, primary CTA "Choose [type] roles →"
 *     → /dashboard/roles
 */

// ---------------------------------------------------------------------------
// 2026-07-31 - Page-side dashboard perf pass
// ---------------------------------------------------------------------------
// The dashboard page server component previously stacked ~30+ Supabase
// queries one-after-the-other. From Cebu (or any far-from-Chicago region)
// each query is ~280ms RTT, so the page took 8-12 seconds before rendering
// any markup. The layout was already parallelized in commit 697f93f; this
// is the page-side equivalent.
//
// WS14 PR2: loadWizardState moved to src/lib/wizardState.ts (shared across
// dashboard page + wizard-nudge cron + CLI script).
import { loadWizardState } from '@/lib/wizardState';


function WorkspaceHub({
  userTier,
  accountTypes,
  typeData,
  dismissedIds,
}: {
  userTier: string;
  accountTypes: string[];
  typeData: import('@/components/dashboard/dashboardTypeData').TypeSectionData;
  dismissedIds: Set<string>;
}) {
  const access = getWorkspaceAccess(accountTypes, userTier, tierAtLeast);

  // 2026-07-22 (Arnel): hide dismissed fully-available workspaces.
  // Locked workspaces (unlocked=false OR fullyAvailable=false) ignore the
  // dismiss flag - the 'never hide locked features' rule preserves the
  // product signal of what's available to unlock.
  const visibleAccess = access.filter(
    (a) => !(a.fullyAvailable && dismissedIds.has(a.workspace.id)),
  );

  // Step 7: per-workspace status one-liner. null = no data (hide line).
  // Locked workspaces (unlocked=false) skip the status - their existing
  // card already shows the lock UI.
  const STATUS_BY_WS: Record<string, () => WorkspaceStatus | null> = {
    personal: () => personalStatus(typeData),
    organization: () => organizationStatus(typeData),
    business: () => businessStatus(typeData),
  };

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
      gap: '1rem',
    }}>
      {visibleAccess.map(({ workspace: ws, unlocked, fullyAvailable, requiredTier }) => {
        // 70% opacity when account-type-locked (Arnel-approved default).
        // Tier-locked (unlocked but no tier) keeps full opacity so users see
        // the upgrade CTA clearly.
        const cardOpacity = unlocked ? 1 : 0.7;
        const locked = !fullyAvailable;

        // Determine primary CTA
        let ctaHref: string;
        let ctaLabel: string;
        let ctaStyle: React.CSSProperties;

        if (!unlocked) {
          // Account-type-locked: send user to /dashboard/roles
          ctaHref = '/dashboard/roles';
          ctaLabel = `Choose ${ws.requiredAccountTypes[0]?.replace('_', ' ') || 'role'} →`;
          ctaStyle = {
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.2)',
            color: '#fff',
          };
        } else if (requiredTier) {
          // Tier-locked: send user to /pricing with the right tier deep link
          ctaHref = `/pricing?tier=${requiredTier}`;
          ctaLabel = `Upgrade to ${tierDisplayName(requiredTier)} →`;
          ctaStyle = {
            background: '#FFB81C',
            color: '#0a0a0a',
          };
        } else {
          // Fully available
          ctaHref = ws.primaryHref;
          ctaLabel = `Open ${ws.name} Workspace →`;
          ctaStyle = {
            background: 'rgba(20,184,166,0.15)',
            border: '1px solid rgba(20,184,166,0.5)',
            color: '#14B8A6',
          };
        }

        return (
          <div
            key={ws.id}
            data-testid={`workspace-card-${ws.id}`}
            data-locked={locked ? 'true' : 'false'}
            style={{
              background: '#0f0f0f',
              border: locked ? '1px solid rgba(255,255,255,0.15)' : '1px solid #1e1e1e',
              borderRadius: 12,
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              opacity: cardOpacity,
              transition: 'opacity 0.2s, border-color 0.2s',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
              <span aria-hidden style={{ fontSize: '1.75rem' }}>{ws.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{
                  fontFamily: "'Bebas Neue', Impact, sans-serif",
                  fontSize: '1.25rem',
                  color: locked ? 'rgba(255,255,255,0.7)' : '#fff',
                  letterSpacing: '0.05em',
                  margin: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}>
                  {locked ? <span aria-label="locked" title="Locked">🔒</span> : null}
                  {ws.name.toUpperCase()} WORKSPACE
                </h3>
                {/* 2026-07-22 (Arnel): dismiss button on fully-available cards.
                    Locked cards do NOT show this - the 'never hide locked
                    features' rule means dismissing them would silently flip
                    their visibility and defeat the product signal. */}
                {fullyAvailable ? (
                  <div style={{ marginTop: '0.25rem' }}>
                    <DismissWorkspaceButton
                      workspaceId={ws.id}
                      workspaceName={ws.name}
                    />
                  </div>
                ) : null}
                <p style={{
                  color: 'rgba(255,255,255,0.55)',
                  fontSize: '0.8rem',
                  margin: '0.125rem 0 0',
                  lineHeight: 1.45,
                }}>
                  {ws.description}
                </p>
                {/* Step 7: per-workspace status one-liner (additive).
                    Only shown for unlocked workspaces that have data. */}
                {unlocked && (() => {
                  const status = STATUS_BY_WS[ws.id]?.();
                  if (!status) return null;
                  return (
                    <p
                      data-testid={`workspace-status-${ws.id}`}
                      style={{
                        color: status.empty
                          ? 'rgba(255,184,28,0.85)'
                          : 'rgba(20,184,166,0.9)',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        margin: '0.375rem 0 0',
                        lineHeight: 1.35,
                      }}
                    >
                      {status.text}
                    </p>
                  );
                })()}
              </div>
            </div>

            {/* Subpages list */}
            <ul style={{
              listStyle: 'none',
              margin: 0,
              padding: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem',
            }}>
              {ws.subpages.map((sp) => (
                <li key={sp.href}>
                  {fullyAvailable ? (
                    <Link
                      href={sp.href}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '0.4rem 0.5rem',
                        borderRadius: 6,
                        color: 'rgba(255,255,255,0.85)',
                        fontSize: '0.875rem',
                        textDecoration: 'none',
                        transition: 'background 0.15s',
                      }}
                    >
                      {sp.emoji ? <span aria-hidden>{sp.emoji}</span> : null}
                      <span style={{ flex: 1 }}>{sp.label}</span>
                      <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem' }}>→</span>
                    </Link>
                  ) : (
                    // Locked subpage: shown with 🔒, but clickable to either
                    // /dashboard/roles (account-type-locked) or /pricing?tier=...
                    // (tier-locked). User can still see what they'd unlock.
                    <Link
                      href={ctaHref}
                      title={sp.description ?? sp.label}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '0.4rem 0.5rem',
                        borderRadius: 6,
                        color: 'rgba(255,255,255,0.45)',
                        fontSize: '0.875rem',
                        textDecoration: 'none',
                      }}
                    >
                      <span aria-hidden>🔒</span>
                      {sp.emoji ? <span aria-hidden style={{ opacity: 0.6 }}>{sp.emoji}</span> : null}
                      <span style={{ flex: 1 }}>{sp.label}</span>
                    </Link>
                  )}
                </li>
              ))}
            </ul>

            {/* Primary CTA */}
            <Link
              href={ctaHref}
              data-testid={`workspace-cta-${ws.id}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                padding: '0.65rem 1rem',
                borderRadius: 6,
                fontSize: '0.875rem',
                fontWeight: 700,
                textDecoration: 'none',
                marginTop: 'auto',
                letterSpacing: '0.02em',
                ...ctaStyle,
              }}
            >
              {ctaLabel}
            </Link>
          </div>
        );
      })}
    </div>
  );
}

function TeamList({ myTeams }: { myTeams: any[] }) {
  // Group by organization.name (FK). "__unaffiliated__" when no org is set.
  const groups = new Map<string, any[]>();
  for (const t of myTeams) {
    const key = t.organization?.name || '__unaffiliated__';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(t);
  }
  // Sort: named orgs first (alphabetical), then Unaffiliated
  const sortedKeys = Array.from(groups.keys()).sort((a, b) => {
    if (a === '__unaffiliated__') return 1;
    if (b === '__unaffiliated__') return -1;
    return a.localeCompare(b);
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {sortedKeys.map((key) => {
        const teams = groups.get(key)!;
        const isUnaffiliated = key === '__unaffiliated__';
        return (
          <div key={key}>
            {!isUnaffiliated && (
              <div
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: 'rgba(255,255,255,0.45)',
                  marginBottom: '0.4rem',
                  paddingLeft: '0.25rem',
                }}
              >
                🏛️ {key} <span style={{ color: 'rgba(255,255,255,0.3)' }}>· {teams.length} team{teams.length === 1 ? '' : 's'}</span>
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {teams.map((t) => {
                const flag = t.country_code === 'PH' ? '🇵🇭' : t.country_code === 'US' ? '🇺🇸' : t.country_code === 'CA' ? '🇨🇦' : t.country_code === 'GB' ? '🇬🇧' : '🏒';
                const trimmedLabel = t.age_label?.trim() ?? '';
                const ageSub = trimmedLabel
                  ? t.age_min != null && t.age_max != null
                    ? `${trimmedLabel} (${t.age_min}-${t.age_max})`
                    : trimmedLabel
                  : null;
                return (
                  <Link
                    key={t.id}
                    href={`/dashboard/team/${t.slug}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.625rem 0.875rem',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid #1e1e1e',
                      borderRadius: 8,
                      textDecoration: 'none',
                      color: '#fff',
                    }}
                  >
                    <span style={{ fontSize: '1.25rem' }} aria-hidden>{flag}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{t.name}</div>
                      <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.45)', marginTop: 2, display: 'flex', gap: '0.5rem' }}>
                        {ageSub && <span>{ageSub}</span>}
                        {t.short_name && ageSub && <span>·</span>}
                        {t.short_name && <span>{t.short_name}</span>}
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        padding: '0.15rem 0.5rem',
                        background: 'rgba(20,184,166,0.12)',
                        color: '#14B8A6',
                        border: '1px solid rgba(20,184,166,0.3)',
                        borderRadius: 999,
                        fontWeight: 600,
                        textTransform: 'capitalize',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {t.role.replace(/_/g, ' ')}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
