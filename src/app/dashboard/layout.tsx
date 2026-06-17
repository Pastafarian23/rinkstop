import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';
import DashboardNav from '@/components/DashboardNav';
import UserMenu from '@/components/UserMenu';
import { getUserTier, tierAtLeast } from '@/lib/connections';

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
  const isSuperAdmin = clerkRole === 'super_admin' || profileRole === 'super_admin';
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
  } catch {
    // Silently degrade — nav still works, just no badges.
  }

  // Admin link intentionally NOT in the user-dashboard nav. Per Arnel
  // (2026-06-16): the gold shield in the header is enough. Including 'Admin'
  // in the user-dashboard nav made it look pre-highlighted as if it were
  // the current section, which is confusing. The header shield is the
  // single, dedicated entry point to /admin.
  const navLinks: Array<[string, string, number?]> = [];

  // Phase 2: Show "Listings" in the nav if the user holds the `business` account
  // type. Cheaper than a join — one indexed query on profile_account_types.
  let isBusinessUser = false;
  try {
    const { count: bc } = await supabaseAdmin
      .from('profile_account_types')
      .select('user_id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('account_type', 'business');
    isBusinessUser = (bc || 0) > 0;
  } catch { /* table missing — keep nav as-is */ }

  navLinks.push(
    ['/dashboard', 'Overview'],
    ['/dashboard/connections', 'Connections', pendingConnectionCount],
    ['/dashboard/messages', 'Messages', unreadMessageCount],
    ['/dashboard/profile', 'Profile'],
    ['/dashboard/favorites', 'Favorites'],
    ['/dashboard/reviews', 'Reviews'],
    ['/dashboard/claims', 'Claims'],
  );
  if (isBusinessUser) {
    navLinks.push(['/dashboard/listings', 'Listings']);
  }
  // Identity verification nav: gated to Starter+ (per design, 2026-06-17).
  // Free users see the /pricing upsell instead of this link.
  try {
    const currentTier = await getUserTier(userId);
    if (tierAtLeast(currentTier, 'starter')) {
      navLinks.push(['/dashboard/identity', 'Verification']);
    }
  } catch { /* best-effort — don't break the layout if Supabase is down */ }
  navLinks.push(
    ['/dashboard/leads', 'Leads'],
    ['/dashboard/subscription', 'Subscription'],
    ['/dashboard/support', 'Support'],
  );

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <header style={{ background: '#041E42', borderBottom: '3px solid #C8102E' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Profile"
                  style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', border: '2px solid #C8102E' }}
                />
              ) : (
                <div style={{
                  width: 40, height: 40, borderRadius: '50%',
                  background: '#C8102E', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white', fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.1rem',
                  border: '2px solid #C8102E',
                }}>
                  {firstName?.[0]?.toUpperCase() || '?'}
                </div>
              )}
              <div>
                <h1 style={{
                  fontFamily: "'Bebas Neue', Impact, sans-serif",
                  fontSize: '1.25rem',
                  color: 'white',
                  letterSpacing: '0.05em',
                  margin: 0,
                }}>
                  MY RINKSTOP
                </h1>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', margin: 0 }}>
                  {email}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
              {/* UserMenu: replaces the two-ambiguous-A-circles pattern. Single
                  avatar button that opens a labeled popover (Edit profile,
                  Subscription, Help, Sign out). Replaces both <UserButton>
                  (which threw during RSC) and the previous SignOutButton +
                  standalone Link to /dashboard/profile. */}
              <UserMenu
                initials={firstName?.[0] || '?'}
                displayName={`${firstName || 'RinkStop'}${lastName ? ' ' + lastName : ''}`}
                email={email}
                avatarUrl={avatarUrl}
                size={40}
              />
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
        @media (max-width: 640px) {
          .dashboard-header-back { display: none !important; }
        }
        @media (max-width: 480px) {
          .dashboard-header-admin span:last-child { display: none; }
          .dashboard-header-admin { padding: 0.5rem 0.6rem !important; }
        }
      `}</style>

      {/* Page content */}
      <main style={{ maxWidth: 1280, margin: '0 auto', padding: '2rem 1.5rem 3rem' }}>
        {children}
      </main>
    </div>
  );
}