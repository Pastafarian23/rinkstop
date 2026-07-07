import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';
import { OWNER_EMAILS } from '@/lib/admin-auth';
import DashboardNav from '@/components/DashboardNav';
import UserMenu from '@/components/UserMenu';
import NotificationBell from '@/components/NotificationBell';
import TeamSwitcher from '@/components/TeamSwitcher';
import MobileMenu from '@/components/MobileMenu';
import { getUserTier, tierAtLeast } from '@/lib/connections';
import {
  WORKSPACES,
  getWorkspaceAccess,
  type WorkspaceAccess,
} from '@/lib/dashboard/workspaces';
import { getActiveWorkspaceFromCookies, type WorkspaceId } from '@/lib/dashboard/switchWorkspace';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  if (!userId) redirect('/login');

  // Hard safety net: any error inside the dashboard chrome render must NOT 500
  // the user. Instead, render a minimal shell with the children (the page's own
  // safety net will catch errors inside the page) and a sign-out link so they
  // can recover. The real error is logged server-side (Vercel) for diagnosis.
  try {
    return await renderDashboardLayout(userId, children);
  } catch (err) {
    console.error('[dashboard layout] render failed:', err);
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
        <header style={{ background: '#041E42', borderBottom: '3px solid #C8102E' }}>
          <div style={{ maxWidth: 1280, margin: '0 auto', padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h1 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '1.25rem', color: 'white', letterSpacing: '0.05em', margin: 0 }}>
              MY RINKSTOP
            </h1>
            <Link href="/" style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', padding: '0.5rem 0.85rem', borderRadius: 6, fontSize: '0.8rem', textDecoration: 'none', border: '1px solid rgba(255,255,255,0.1)' }}>
              Back to Site
            </Link>
          </div>
        </header>
        <div style={{ maxWidth: 720, margin: '4rem auto', padding: '0 1.5rem' }}>
          <h2 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '1.5rem', color: '#fff', margin: '0 0 0.75rem' }}>
            Dashboard chrome hit a snag
          </h2>
          <p style={{ color: '#aaa', fontSize: '0.95rem', margin: '0 0 1rem', lineHeight: 1.5 }}>
            The page below should still load. If you see a second error card, the issue is in the page itself — try signing out and back in, or come back in a few minutes.
          </p>
          <main>{children}</main>
        </div>
      </div>
    );
  }
}

async function renderDashboardLayout(userId: string, children: React.ReactNode) {
  const user = await currentUser();
  const firstName = user?.firstName || '';
  const lastName = user?.lastName || '';
  const email = user?.emailAddresses?.[0]?.emailAddress || '';
  const avatarUrl = user?.imageUrl || '';

  // Step 6: read the active workspace from the cookie mirror written by
  // switchWorkspace() on the client. Falls back to 'personal' so the nav
  // is never empty. The client UserMenu / MobileMenu can correct this on
  // hydration if the cookie is stale.
  const cookieStore = await cookies();
  const activeWorkspace: WorkspaceId = getActiveWorkspaceFromCookies(cookieStore) || 'personal';

  // Determine admin / super_admin status. Clerk publicMetadata is the source
  // of truth; fall back to profiles.role for defense in depth.
  const clerkRole = (user?.publicMetadata as any)?.role;
  let profileRole: string | null = null;
  try {
    const { data: prof } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();
    profileRole = prof?.role || null;
  } catch {
    // best-effort
  }
  const isSuperAdminBase = clerkRole === 'super_admin' || profileRole === 'super_admin';
  // OWNER_EMAILS bypass — same God-mode fallback used by requireAdmin() in
  // src/lib/admin-auth.ts. If the signed-in email is the owner's, treat as
  // super_admin regardless of what Clerk publicMetadata or profiles says.
  // Ensures the admin button (and the /admin route guard) only surface to
  // the project owner, even if Clerk account-linking issues produce a fresh
  // duplicate user with no role assigned.
  const ownerEmail = user?.emailAddresses?.[0]?.emailAddress || '';
  const isOwner = OWNER_EMAILS.has(ownerEmail);
  const isSuperAdmin = isSuperAdminBase || isOwner;
  const isAdmin = isSuperAdmin || clerkRole === 'admin' || profileRole === 'admin';

  // Fetch pending connection requests + unread message counts for nav badges.
  let pendingConnectionCount = 0;
  let unreadMessageCount = 0;
  try {
    const { count: pc } = await supabaseAdmin
      .from('connections')
      .select('id', { count: 'exact', head: true })
      .or(`user_low.eq.${userId},user_high.eq.${userId}`)
      .eq('status', 'pending')
      .neq('initiated_by', userId);
    pendingConnectionCount = pc || 0;

    const { data: myConns } = await supabaseAdmin
      .from('connections')
      .select('id')
      .or(`user_low.eq.${userId},user_high.eq.${userId}`)
      .eq('status', 'accepted');
    if (myConns && myConns.length > 0) {
      const connIds = myConns.map((c: any) => c.id);
      const { data: myThreads } = await supabaseAdmin
        .from('threads')
        .select('id')
        .in('connection_id', connIds);
      if (myThreads && myThreads.length > 0) {
        const threadIds = myThreads.map((t: any) => t.id);
        const { count: um } = await supabaseAdmin
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .in('thread_id', threadIds)
          .is('read_at', null)
          .neq('sender_id', userId);
        unreadMessageCount = um || 0;
      }
    }

    // Phase 1c-1: add unread DM count (direct_messages table).
    // Combines with the existing connections-messages count for the unified
    // /dashboard/messages badge.
    const { count: dmUnread } = await supabaseAdmin
      .from('direct_messages')
      .select('id', { count: 'exact', head: true })
      .is('read_at', null)
      .neq('sender_id', userId)
      .in('thread_id', (
        await supabaseAdmin
          .from('direct_message_threads')
          .select('id')
          .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)
      ).data?.map((t: any) => t.id) || []);
    if (dmUnread) unreadMessageCount += dmUnread;
  } catch {
    // Silently degrade — nav still works, just no badges.
  }

  // Admin link intentionally NOT in the user-dashboard nav. Per Arnel
  // (2026-06-16): the gold shield in the header is enough. Including 'Admin'
  // in the user-dashboard nav made it look pre-highlighted as if it were
  // the current section, which is confusing. The header shield is the
  // single, dedicated entry point to /admin.
  //
  // Step 6: navLinks are now built from the WORKSPACES registry's subpages[]
  // for the active workspace (read from cookie). The registry is the single
  // source of truth. Tabs still get badges (connections/messages) by href-match.
  const navLinks: Array<[string, string, number?]> = [];

  // Fetch account types for workspace access check.
  let accountTypes: Array<{ account_type: string; is_primary: boolean }> = [];
  let activeRole: string | null = null;
  try {
    const { data: typesData } = await supabaseAdmin
      .from('profile_account_types')
      .select('account_type, is_primary')
      .eq('user_id', userId);
    accountTypes = (typesData || []) as Array<{ account_type: string; is_primary: boolean }>;
    const primary = accountTypes.find(t => t.is_primary)?.account_type;
    activeRole = primary || accountTypes[0]?.account_type || null;
  } catch { /* table missing — keep nav as-is */ }

  // Step 6: get current tier for workspace tier-gating.
  let currentTier = 'free';
  try {
    currentTier = await getUserTier(userId);
    if (OWNER_EMAILS.has(ownerEmail)) {
      const { data: byEmail } = await supabaseAdmin
        .from('profiles')
        .select('user_id')
        .ilike('email', ownerEmail)
        .neq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (byEmail) {
        currentTier = await getUserTier(byEmail.user_id);
      }
    }
  } catch { /* best-effort */ }

  // Build nav from active workspace's subpages, filtered by tier gate.
  // The active workspace cookie is the source; we still show all 3 workspaces
  // in the switcher (Step 5) so user can correct course.
  const accountTypeNames = accountTypes.map(t => t.account_type);
  const wsAccess: WorkspaceAccess[] = getWorkspaceAccess(
    accountTypeNames,
    currentTier,
    tierAtLeast,
  );
  const activeWsAccess = wsAccess.find(a => a.workspace.id === activeWorkspace);
  // If user hasn't unlocked the active workspace (cookie stale, or they
  // removed an account type), fall back to 'personal' which is always unlocked.
  const effectiveWs: WorkspaceAccess =
    activeWsAccess && activeWsAccess.unlocked
      ? activeWsAccess
      : wsAccess.find(a => a.workspace.id === 'personal')!;

  // Build a map of subpage href -> badge for the badges we track.
  const BADGE_BY_HREF: Record<string, number | undefined> = {
    '/dashboard/connections': pendingConnectionCount,
    '/dashboard/messages': unreadMessageCount,
  };

  navLinks.push(['/dashboard', 'Overview']);
  for (const sub of effectiveWs.workspace.subpages) {
    // Skip the subpage if the user's tier is below the gate. The workspace
    // registry has the source of truth for minTier.
    if (sub.minTier && !tierAtLeast(currentTier, sub.minTier)) {
      continue;
    }
    // Some subpages match the dashboard root for badge purposes (e.g. /dashboard
    // for "Overview" already added). Skip if we've already added this href.
    if (navLinks.some(([h]) => h === sub.href)) continue;
    navLinks.push([sub.href, sub.label, BADGE_BY_HREF[sub.href]]);
  }

  // Icon mapping for the mobile menu (and any future iconified nav).
  // Keep keys aligned with navLinks hrefs above.
  const NAV_ICONS: Record<string, string> = {
    '/dashboard': '🏠',
    '/dashboard/connections': '🤝',
    '/dashboard/messages': '💬',
    '/dashboard/profile': '👤',
    '/dashboard/favorites': '⭐',
    '/dashboard/reviews': '✍️',
    '/dashboard/family': '👨‍👩‍👧‍👦',
    '/dashboard/claims': '🏷️',
    '/dashboard/listings': '📋',
    '/dashboard/identity': '✅',
    '/dashboard/leads': '🎯',
    '/dashboard/subscription': '💳',
    '/dashboard/support': '🛟',
  };
  const mobileNavLinks = navLinks.map(([href, label, badge]) => ({
    href,
    label,
    badge,
    icon: NAV_ICONS[href] || '•',
  }));

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <header style={{ background: '#041E42', borderBottom: '3px solid #C8102E' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 0', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: 0 }}>
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Profile"
                  className="dashboard-header-avatar"
                  style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', border: '2px solid #C8102E', flexShrink: 0 }}
                />
              ) : (
                <div
                  className="dashboard-header-avatar"
                  style={{
                    width: 40, height: 40, borderRadius: '50%',
                    background: '#C8102E', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.1rem',
                    border: '2px solid #C8102E', flexShrink: 0,
                  }}
                >
                  {firstName?.[0]?.toUpperCase() || '?'}
                </div>
              )}
              <div className="dashboard-header-title" style={{ minWidth: 0 }}>
                <h1 style={{
                  fontFamily: "'Bebas Neue', Impact, sans-serif",
                  fontSize: '1.25rem',
                  color: 'white',
                  letterSpacing: '0.05em',
                  margin: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  MY RINKSTOP
                </h1>
                <p className="dashboard-header-email" style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {email}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
              <NotificationBell />
              {isAdmin ? (
                <Link
                  href="/admin"
                  data-testid="header-admin-link"
                  className="dashboard-header-admin"
                  title="Open admin dashboard"
                  aria-label="Open admin dashboard"
                  style={{
                    background: 'linear-gradient(135deg, #FFB81C 0%, #e6a318 100%)',
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    textDecoration: 'none',
                    border: '2px solid #FFB81C',
                    boxShadow: '0 2px 8px rgba(255,184,28,0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    justifyItems: 'center',
                    lineHeight: 1,
                    overflow: 'hidden',
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      fontSize: '1.25rem',
                      lineHeight: 1,
                      display: 'block',
                      fontFamily: '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", "Segoe UI Symbol", sans-serif',
                    }}
                  >
                    🛡️
                  </span>
                </Link>
              ) : null}
              <Link
                href="/"
                className="dashboard-header-back"
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.7)',
                  padding: '0.5rem 0.85rem',
                  borderRadius: 6,
                  fontSize: '0.8rem',
                  textDecoration: 'none',
                  border: '1px solid rgba(255,255,255,0.1)',
                  whiteSpace: 'nowrap',
                }}
              >
                <span style={{ marginRight: 4 }}>←</span>
                <span>Back to Site</span>
              </Link>
              {/* Desktop-only: full TeamSwitcher + UserMenu in the header.
                  The MobileMenu (≤1023px) renders all of these inline. */}
              <span className="dashboard-header-desktop-only" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                <TeamSwitcher />
                <UserMenu
                  initials={firstName?.[0] || '?'}
                  displayName={`${firstName || 'RinkStop'}${lastName ? ' ' + lastName : ''}`}
                  email={email}
                  avatarUrl={avatarUrl}
                  size={40}
                  accountTypes={accountTypes}
                  activeRole={activeRole}
                  userTier={currentTier}
                />
              </span>
              {/* Mobile/tablet hamburger (≤1023px). On desktop, the CSS below
                  sets display: none. */}
              <span className="dashboard-header-mobile-only" style={{ display: 'none' }}>
                <MobileMenu
                  user={{
                    initials: firstName?.[0]?.toUpperCase() || '?',
                    displayName: `${firstName || 'RinkStop'}${lastName ? ' ' + lastName : ''}`,
                    email,
                    avatarUrl,
                  }}
                  isAdmin={isAdmin}
                  navLinks={mobileNavLinks}
                  accountTypes={accountTypes}
                  activeRole={activeRole}
                  currentTier={currentTier}
                />
              </span>
            </div>
          </div>

          {/* Nav tabs — extracted to a Client Component so we can attach onMouseEnter/onMouseLeave (Server Components can't pass event handlers to Client Components) */}
          <DashboardNav
            links={navLinks.map(([href, label, badge]) => ({
              href,
              label,
              badge,
            }))}
          />
        </div>
      </header>

      <style>{`
        /* Day 7: responsive header.
           ≤1023px (tablet + mobile): hamburger only, hide team switcher +
           UserMenu + email + "Back to Site" text, drop the avatar+title
           block to save space. Notification bell and admin shield stay.
           1024px+ (desktop): full header with all icons visible. */
        @media (max-width: 1023px) {
          .dashboard-header-desktop-only { display: none !important; }
          .dashboard-header-mobile-only { display: inline-flex !important; }
          .dashboard-header-email { display: none !important; }
          .dashboard-header-back span:last-child { display: none !important; }
          .dashboard-header-back { padding: 0.5rem 0.6rem !important; }

          /* Day 7 hotfix: re-anchor header dropdown panels to the viewport
             on mobile/tablet. Inline styles use \`right: 0\` which makes the
             panel's left edge land at \`bellRight - panelWidth\` — when the
             bell is somewhere mid-header, the panel bleeds past the left edge
             of the screen on narrow viewports. Switching to \`position:
             fixed\` with \`left/right: 1rem\` pins it to the viewport so it
             never overflows. */
          .dashboard-dropdown-panel {
            position: fixed !important;
            /* Override the inline 'top: calc(100% + 0.5rem)' on the bell
               and team-switcher panels. With position: fixed, that 100% now
               refers to viewport height and pushes the panel off-screen.
               Pin top to the header height (avatar is 36-40px, padding 1rem
               each side, so ~72-80px). Adding a small gap for the
               separator. */
            top: 72px !important;
            left: 1rem !important;
            right: 1rem !important;
            width: auto !important;
            max-width: calc(100vw - 2rem) !important;
            min-width: 0 !important;
          }
        }
        @media (max-width: 640px) {
          .dashboard-header-title h1 { font-size: 1rem !important; }
          .dashboard-header-avatar { width: 36px !important; height: 36px !important; }
        }
        @media (max-width: 380px) {
          .dashboard-header-back { display: none !important; }
        }
      `}</style>

      {/* Page content */}
      <main style={{ maxWidth: 1280, margin: '0 auto', padding: '2rem 1.5rem 3rem' }}>
        {children}
      </main>
    </div>
  );
}