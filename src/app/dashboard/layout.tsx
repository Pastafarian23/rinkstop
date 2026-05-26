import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  if (!userId) redirect('/login');

  const user = await currentUser();
  const firstName = user?.firstName || '';
  const lastName = user?.lastName || '';
  const email = user?.emailAddresses?.[0]?.emailAddress || '';

  return (
    <div style={{ minHeight: '80vh', background: '#f8fafc' }}>
      {/* Dashboard Header */}
      <div style={{ background: '#041E42', borderBottom: '3px solid #C8102E', padding: '0' }}>
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 0' }}>
            <div>
              <h1 style={{
                fontFamily: 'Bebas Neue, sans-serif',
                fontSize: '1.5rem',
                color: 'white',
                letterSpacing: '0.05em',
                margin: 0,
              }}>
                My RinkStop Dashboard
              </h1>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', margin: '0.25rem 0 0' }}>
                {email}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <Link
                href="/"
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  color: 'white',
                  padding: '0.5rem 1rem',
                  borderRadius: 6,
                  fontSize: '0.875rem',
                  textDecoration: 'none',
                }}
              >
                ← Back to RinkStop
              </Link>
            </div>
          </div>

          {/* Nav tabs */}
          <div style={{ display: 'flex', gap: '0', overflowX: 'auto' }}>
            {[
              ['/dashboard', 'Overview'],
              ['/dashboard/profile', 'Profile'],
              ['/dashboard/favorites', 'Favorites'],
              ['/dashboard/claims', 'Claims'],
              ['/dashboard/support', 'Support'],
            ].map(([href, label]) => (
              <Link
                key={href}
                href={href}
                style={{
                  padding: '0.75rem 1.25rem',
                  color: 'rgba(255,255,255,0.6)',
                  fontSize: '0.875rem',
                  textDecoration: 'none',
                  borderBottom: '2px solid transparent',
                  whiteSpace: 'nowrap',
                }}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Page content */}
      <div className="container" style={{ paddingTop: '2rem', paddingBottom: '3rem' }}>
        {children}
      </div>
    </div>
  );
}
