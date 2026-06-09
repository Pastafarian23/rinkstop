import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { UserButton } from '@clerk/nextjs';
import { supabaseAdmin } from '@/lib/supabase';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  if (!userId) redirect('/login');

  const user = await currentUser();
  const firstName = user?.firstName || '';
  const lastName = user?.lastName || '';
  const email = user?.emailAddresses?.[0]?.emailAddress || '';
  const avatarUrl = user?.imageUrl || '';

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

  const navLinks: Array<[string, string, number?]> = [
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
  ];

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
              {/* UserButton: avatar dropdown with sign-out + manage account */}
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: { width: 36, height: 36, border: '2px solid #C8102E' },
                    userButtonPopoverCard: { background: '#0f0f0f', border: '1px solid #1e1e1e' },
                    userButtonPopoverActions: { color: '#e2e8f0' },
                    userButtonPopoverActionButton: { color: '#e2e8f0' },
                    userButtonPopoverActionButtonText: { color: '#e2e8f0' },
                    userButtonPopoverFooter: { display: 'none' },
                  },
                }}
                userProfileProps={{
                  appearance: {
                    elements: {
                      rootBox: { background: '#0a0a0a' },
                      card: { background: '#0f0f0f', border: '1px solid #1e1e1e' },
                      navbar: { background: '#0a0a0a', borderRight: '1px solid #1e1e1e' },
                      pageScrollBox: { background: '#0f0f0f' },
                      profileSectionTitleText: { color: '#FFB81C' },
                      formButtonPrimary: { background: '#C8102E' },
                    },
                  },
                }}
              />
            </div>
          </div>

          {/* Nav tabs */}
          <div style={{ display: 'flex', gap: '0', overflowX: 'auto', paddingBottom: 0 }}>
            {navLinks.map(([href, label, badge]) => (
              <Link
                key={href}
                href={href}
                style={{
                  padding: '0.75rem 1.25rem',
                  color: 'rgba(255,255,255,0.5)',
                  fontSize: '0.875rem',
                  textDecoration: 'none',
                  borderBottom: '2px solid transparent',
                  whiteSpace: 'nowrap',
                  transition: 'color 0.15s, border-color 0.15s',
                  position: 'relative',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.color = '#fff';
                  e.currentTarget.style.borderBottomColor = '#C8102E';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.color = 'rgba(255,255,255,0.5)';
                  e.currentTarget.style.borderBottomColor = 'transparent';
                }}
              >
                {label}
                {badge && badge > 0 ? (
                  <span style={{
                    position: 'absolute',
                    top: 6,
                    right: 4,
                    background: '#C8102E',
                    color: '#fff',
                    borderRadius: 999,
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '0.1rem 0.4rem',
                    minWidth: 18,
                    textAlign: 'center',
                    lineHeight: 1.4,
                  }}>
                    {badge > 99 ? '99+' : badge}
                  </span>
                ) : null}
              </Link>
            ))}
          </div>
        </div>
      </header>

      {/* Page content */}
      <main style={{ maxWidth: 1280, margin: '0 auto', padding: '2rem 1.5rem 3rem' }}>
        {children}
      </main>
    </div>
  );
}