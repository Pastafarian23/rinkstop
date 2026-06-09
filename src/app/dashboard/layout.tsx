import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { UserButton } from '@clerk/nextjs';
import { supabaseAdmin } from '@/lib/supabase';
import DashboardNav from '@/components/DashboardNav';
import { userButtonAppearance, signInAppearance } from '@/lib/clerk-appearance';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  if (!userId) redirect('/login');

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

  // Admin tab appears FIRST in the nav (gold-accented) so it's never scrolled
  // off the right edge of the horizontal nav. The header also has a prominent
  // gold Admin button for desktop users.
  const navLinks: Array<[string, string, number?]> = [];
  if (isAdmin) {
    navLinks.push(['/admin', '🛡️ Admin']);
  }
  navLinks.push(
    ['/dashboard', 'Overview'],
    ['/dashboard/connections', 'Connections', pendingConnectionCount],
    ['/dashboard/messages', 'Messages', unreadMessageCount],
    ['/dashboard/profile', 'Profile'],
    ['/dashboard/favorites', 'Favorites'],
    ['/dashboard/reviews', 'Reviews'],
    ['/dashboard/claims', 'Claims'],
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {isAdmin ? (
                <Link
                  href="/admin"
                  data-testid="header-admin-link"
                  style={{
                    background: 'linear-gradient(135deg, #FFB81C 0%, #e6a318 100%)',
                    color: '#041E42',
                    padding: '0.5rem 1rem',
                    borderRadius: 6,
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    textDecoration: 'none',
                    border: '1px solid #FFB81C',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    boxShadow: '0 2px 8px rgba(255,184,28,0.25)',
                  }}
                >
                  🛡️ Admin
                </Link>
              ) : null}
              <Link
                href="/"
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.7)',
                  padding: '0.5rem 1rem',
                  borderRadius: 6,
                  fontSize: '0.8rem',
                  textDecoration: 'none',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                ← Back to Site
              </Link>
              {/* UserButton: avatar dropdown with sign-out + manage account. "Manage account" routes to our in-app profile page (no Clerk portal redirect). */}
              <UserButton
                appearance={userButtonAppearance}
                userProfileUrl="/dashboard/profile"
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

      {/* Page content */}
      <main style={{ maxWidth: 1280, margin: '0 auto', padding: '2rem 1.5rem 3rem' }}>
        {children}
      </main>
    </div>
  );
}