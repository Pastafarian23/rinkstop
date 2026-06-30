import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';
import { OWNER_EMAILS } from '@/lib/admin-auth';
import { isIdentityVerified } from '@/lib/identity-verified';
import { TierBadge } from '@/components/TierBadge';
import { FounderBadge } from '@/components/FounderBadge';
import UsernameBanner from '@/components/UsernameBanner';
import AccountTypeBadges from '@/components/AccountTypeBadges';
import AccountTypePicker from '@/components/AccountTypePicker';
import TypeSectionCard from '@/components/dashboard/TypeSectionCard';
import InboxCard from '@/components/dashboard/InboxCard';
import { loadDashboardTypeData } from '@/components/dashboard/dashboardTypeData';
import { loadInboxSummary } from '@/components/dashboard/dashboardInboxData';
import { isAccountType } from '@/components/dashboard/dashboardTypes';
import type { AccountType } from '@/components/dashboard/dashboardTypes';

/**
 * OWNER_EMAILS is defined in src/lib/admin-auth.ts — single source of truth.
 * The Founder badge + super_admin-level views fire for any Clerk session whose
 * primary email is in that set, regardless of which `profiles.user_id` row
 * maps to that Clerk account. This protects against Clerk OAuth flows
 * creating a separate duplicate user (e.g. when account-linking is off) —
 * the rendered dashboard still reflects ownership.
 */

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect('/login');

  // Look up role BEFORE rendering so the catch block knows whether to surface
  // debug details. Cheap query, isolated from renderDashboard's broader scope.
  // Fail-closed: if the role lookup itself throws, treat as non-admin.
  // We also OR-in owner-email match because Clerk OAuth may have created a
  // separate "free" user for the same person — we still want Founder context.
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
    // timestamp. This fires for every user, every time — diagnostics only.
    console.error('[dashboard-error]', JSON.stringify({
      userId,
      name: err?.name,
      message: err?.message,
      stack: typeof err?.stack === 'string' ? err.stack.split('\n').slice(0, 3).join('\n') : undefined,
      timestamp: new Date().toISOString(),
    }));

    // NEVER show raw error info to non-admin users — exposes table/column names,
    // provider APIs, and internal stack info. Only super_admin accounts get the
    // collapsible debug details. Everyone else gets the generic message + retry.
    const showDebug = forceDebugAll || isSuperAdmin;

    // Show a sanitized hint in the UI (collapsed by default). We expose only the
    // error name + message — no stack, no userId, no internals. If the user
    // reports "Dashboard hit a snag", we ask them to expand this block and paste.
    const errorName = typeof err?.name === 'string' ? err.name : 'Error';
    const errorMessage = typeof err?.message === 'string' ? err.message : 'Unknown error';

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
            are safe — try refreshing in a minute, or head back to the home page
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
              }}>{errorName}: {errorMessage}</pre>
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
      .select('bio, location, tier, is_founding_member, created_at, role, display_name, username')
      .eq('user_id', profileUserId)
      .maybeSingle();
    profile = data;
  } catch (e) {
    console.error('[dashboard] profiles query failed:', e);
  }

  const isSuperAdmin = profile?.role === 'super_admin';
  // Founder = role-based OR email-canonical. The email fallback is the
  // fix for Clerk OAuth creating a duplicate user_id — even if the new
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

  // Account types (Phase 0.1 — multi-type).
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

  // Per-type dashboard data. The query is wrapped so a missing table doesn't 500.
  const typeData = await loadDashboardTypeData(userId);

  // Inbox data for the overview's InboxCard. Same shape as /api/threads
  // returns, but trimmed to top-3 + counts. Server-rendered so it's
  // visible on first paint (no client-side fetch on dashboard load).
  const inbox = await loadInboxSummary(userId);

  // Private team workspaces the user is a member of (Day 3 team hub).
  // v2: also fetches age_label, age_min, age_max, parent_org for grouping.
  // Wrapped in try/catch so a missing table doesn't 500 the whole dashboard.
  let myTeams: Array<{
    id: string; slug: string; name: string; short_name: string | null;
    country_code: string | null; age_label: string | null;
    age_min: number | null; age_max: number | null; parent_org: string | null;
    role: string;
  }> = [];
  try {
    const { data } = await supabaseAdmin
      .from('team_members')
      .select('role, team_workspaces:team_id ( id, slug, name, short_name, country_code, age_label, age_min, age_max, parent_org, is_active )')
      .eq('user_id', userId)
      .is('left_at', null)
      .order('joined_at', { ascending: false })
      .limit(10);
    // BUG #15 FIX: Filter out teams with is_active=false (deactivated teams
    // should not show in the user's dashboard). Matches the filter applied
    // in /dashboard/team/[slug]/page.tsx.
    myTeams = (data || [])
      .map((row: any) => ({
        ...(row.team_workspaces || {}),
        role: row.role,
      }))
      .filter((t: any) => t.id && t.slug && t.is_active);
  } catch (e) {
    console.error('[dashboard] team_members query failed:', e);
  }

  // Piece E (2026-06-24): check if user is identity-verified, using the
  // hardened helper from Piece C (requires real approved didit_sessions
  // row, not just the bare profiles.identity_verified_at flag). Drives
  // the verify-identity banner at the top of the dashboard. Fails
  // closed — if any of the 3 conditions fail, banner shows.
  const isIdentityVerifiedForUser = await isIdentityVerified(userId);

  const completeness: { field: string; done: boolean; href: string; hint: string }[] = [
    { field: 'Display name', done: !!(profile?.display_name || firstName), href: '/dashboard/profile', hint: 'Add your first and last name' },
    { field: 'Avatar', done: !!avatarUrl, href: '/dashboard/profile', hint: 'Upload a profile photo' },
    { field: 'Bio', done: !!profile?.bio, href: '/dashboard/profile', hint: 'Tell people who you are' },
    { field: 'Location', done: !!profile?.location, href: '/dashboard/profile', hint: 'Add your city so people nearby can find you' },
    { field: 'Account type', done: types.length > 0, href: '/dashboard/profile#account-types', hint: 'Tell us what you do in hockey' },
  ];
  const completenessPct = Math.round((completeness.filter(c => c.done).length / completeness.length) * 100);
  const firstMissing = completeness.find(c => !c.done);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {profile?.username ? null : (
        <UsernameBanner
          displayName={profile?.display_name || firstName || 'RinkStop Member'}
        />
      )}

      {/* Welcome card */}
      <div style={{
        background: '#0f0f0f',
        border: '1px solid #1e1e1e',
        borderRadius: 12,
        padding: '1.75rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Profile"
              style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '3px solid #C8102E' }}
            />
          ) : (
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: 'linear-gradient(135deg, #C8102E 0%, #8b0a1e 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '2rem',
              border: '3px solid #C8102E',
            }}>
              {firstName?.[0]?.toUpperCase() || '?'}
            </div>
          )}
          <div>
            <h2 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '1.75rem', color: '#fff', letterSpacing: '0.04em', margin: '0 0 0.25rem' }}>
              Welcome back, {firstName || 'RinkStop Member'}
            </h2>
            <p style={{ color: '#888', fontSize: '0.9rem', margin: 0 }}>{email}</p>
            <p style={{ color: '#555', fontSize: '0.8rem', margin: '0.5rem 0 0' }}>
              {memberSinceDate ? `Founder since ${memberSinceDate}` : 'Welcome to RinkStop'}
            </p>
            <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              {isFounder ? (
                <FounderBadge size="xs" foundingDate="February 7, 2019" />
              ) : (
                <>
                  <TierBadge tier={profile?.tier || 'free'} size="xs" />
                  {profile?.is_founding_member && (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '0.1rem 0.5rem', fontSize: 10, fontWeight: 700, letterSpacing: '0.05em',
                      textTransform: 'uppercase', borderRadius: 999,
                      background: 'rgba(255,184,28,0.12)', color: '#FFB81C',
                      border: '1px solid rgba(255,184,28,0.4)',
                    }}>⭐ Founding</span>
                  )}
                  {profile?.tier === 'free' ? (
                    <Link href="/pricing" style={{ fontSize: 11, color: '#FFB81C', textDecoration: 'none', fontWeight: 600 }}>
                      ✨ Upgrade →
                    </Link>
                  ) : (
                    <Link href="/dashboard/subscription" style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', textDecoration: 'none', fontWeight: 600 }}>
                      Manage subscription →
                    </Link>
                  )}
                </>
              )}
            </div>
            {types.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <AccountTypeBadges types={types} primary={primary} size="sm" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Piece E (2026-06-24): verify-identity banner. Only shows for
          unverified users. Uses the hardened helper from Piece C, so the
          same gate that powers the ✓ Verified badge and team-creation
          gates also drives this banner. Smaller on mobile. */}
      {!isIdentityVerifiedForUser && (
        <div
          role="region"
          aria-label="Verify your identity"
          style={{
            background: 'linear-gradient(135deg, rgba(255,184,28,0.12) 0%, rgba(200,16,46,0.08) 100%)',
            border: '1px solid rgba(255,184,28,0.35)',
            borderRadius: 12,
            padding: '1.25rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ fontSize: '1.5rem', flexShrink: 0 }} aria-hidden="true">🛡️</div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <h2
              style={{
                fontFamily: "'Bebas Neue', Impact, sans-serif",
                fontSize: '1rem',
                color: '#fff',
                letterSpacing: '0.04em',
                margin: '0 0 0.15rem',
              }}
            >
              VERIFY YOUR IDENTITY TO UNLOCK TEAM MANAGEMENT
            </h2>
            <p
              style={{
                color: 'rgba(255,255,255,0.7)',
                fontSize: '0.8rem',
                margin: 0,
                lineHeight: 1.4,
              }}
            >
              Coaches and managers need verified identity to manage teams. Takes ~2 minutes with a government ID.
            </p>
          </div>
          <Link
            href="/dashboard/identity"
            style={{
              padding: '0.5rem 1rem',
              background: '#FFB81C',
              color: '#0a0a0a',
              borderRadius: 6,
              textDecoration: 'none',
              fontSize: '0.85rem',
              fontWeight: 700,
              whiteSpace: 'nowrap',
            }}
          >
            Verify identity →
          </Link>
        </div>
      )}

      {/* Profile completeness */}
      {completenessPct < 100 && firstMissing && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(255,184,28,0.08) 0%, rgba(20,184,166,0.04) 100%)',
          border: '1px solid rgba(255,184,28,0.2)',
          borderRadius: 12,
          padding: '1.25rem 1.5rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 240 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: '1rem', fontWeight: 700, color: '#fff' }}>Profile {completenessPct}% complete</span>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', margin: 0 }}>
                {firstMissing.hint}
              </p>
              <div style={{ marginTop: 10, height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ width: `${completenessPct}%`, height: '100%', background: 'linear-gradient(90deg, #FFB81C, #14B8A6)' }} />
              </div>
            </div>
            <Link
              href={firstMissing.href}
              style={{
                padding: '0.5rem 1rem', background: '#FFB81C', color: '#0a0a0a',
                borderRadius: 6, textDecoration: 'none', fontSize: '0.85rem', fontWeight: 700,
              }}
            >
              Complete profile →
            </Link>
          </div>
        </div>
      )}

      {/* Inbox widget — shows recent threads or empty-state discover CTAs.
          Always visible so the user has a single place to see new messages
          and start conversations. Loaded server-side via
          loadInboxSummary. */}
      <InboxCard data={inbox} />

      {/* Onboarding for users who haven't picked an account type yet */}
      {types.length === 0 && (
        <div
          id="account-types"
          style={{
            background: 'linear-gradient(135deg, rgba(20,184,166,0.06) 0%, rgba(96,165,250,0.04) 100%)',
            border: '1px solid rgba(20,184,166,0.25)',
            borderRadius: 12,
            padding: '1.75rem',
          }}
        >
          <h3
            style={{
              fontFamily: "'Bebas Neue', Impact, sans-serif",
              fontSize: '1.25rem',
              color: '#fff',
              letterSpacing: '0.05em',
              margin: '0 0 0.5rem',
            }}
          >
            WHAT DO YOU DO IN HOCKEY?
          </h3>
          <p
            style={{
              color: 'rgba(255,255,255,0.65)',
              fontSize: '0.9rem',
              margin: '0 0 1.25rem',
              maxWidth: 640,
            }}
          >
            Pick every role that fits you. We&rsquo;ll show you the right tools and shortcuts for each one.
          </p>
          <AccountTypePicker />
        </div>
      )}

      {/* Type-aware sections — primary first */}
      {types.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3
            style={{
              fontFamily: "'Bebas Neue', Impact, sans-serif",
              fontSize: '1.15rem',
              color: '#fff',
              letterSpacing: '0.05em',
              margin: '0.5rem 0 0',
            }}
          >
            YOUR HOCKEY ROLES
          </h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '1rem',
            }}
          >
            {types.map((t) => (
              <TypeSectionCard
                key={t}
                type={t}
                primary={primary}
                data={typeData}
                username={profile?.username ?? null}
                identityVerified={isIdentityVerifiedForUser}
              />
            ))}
          </div>
        </div>
      )}

      {/* Edit types shortcut — visible to everyone who has at least one type */}
      {types.length > 0 && (
        <div
          id="account-types"
          style={{
            background: '#0f0f0f',
            border: '1px solid #1e1e1e',
            borderRadius: 12,
            padding: '1.5rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: '1rem' }}>
            <h3
              style={{
                fontFamily: "'Bebas Neue', Impact, sans-serif",
                fontSize: '1.1rem',
                color: '#fff',
                letterSpacing: '0.05em',
                margin: 0,
              }}
            >
              MANAGE YOUR ROLES
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
              Multi-select is free. Add or remove roles anytime.
            </span>
          </div>
          <AccountTypePicker />
        </div>
      )}

      {/* My Teams (Day 3 — private team workspaces) */}
      <div
        id="my-teams"
        style={{
          background: '#0f0f0f',
          border: '1px solid #1e1e1e',
          borderRadius: 12,
          padding: '1.25rem 1.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: '0.875rem' }}>
          <h3
            style={{
              fontFamily: "'Bebas Neue', Impact, sans-serif",
              fontSize: '1.1rem',
              color: '#fff',
              letterSpacing: '0.05em',
              margin: 0,
            }}
          >
            🏒 MY TEAMS
          </h3>
          <Link
            href="/dashboard/team/new"
            style={{
              fontSize: '0.8rem',
              color: '#14B8A6',
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            + Create a team
          </Link>
        </div>
        {myTeams.length === 0 ? (
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem' }}>
            You&rsquo;re not on any teams yet. Start your own or ask a coach for an invite code.
          </div>
        ) : (
          <TeamList myTeams={myTeams} />
        )}
      </div>
    </div>
  );
}

function TeamList({ myTeams }: { myTeams: any[] }) {
  // Group by parent_org (NULL → "Unaffiliated")
  const groups = new Map<string, any[]>();
  for (const t of myTeams) {
    const key = t.parent_org || '__unaffiliated__';
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
                    ? `${trimmedLabel} (${t.age_min}–${t.age_max})`
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
